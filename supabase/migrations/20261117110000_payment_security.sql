-- BAOBAB DIGITAL GESTION — sécurisation des paiements
-- À exécuter dans Supabase SQL Editor après sauvegarde de la base.

ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS confirme_par uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refuse_par uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refuse_le timestamptz,
  ADD COLUMN IF NOT EXISTS motif_refus text;

ALTER TABLE public.paiements
  DROP CONSTRAINT IF EXISTS paiements_methode_check,
  DROP CONSTRAINT IF EXISTS paiements_statut_check;

ALTER TABLE public.paiements
  ADD CONSTRAINT paiements_methode_check
    CHECK (methode IN ('especes', 'orange_money', 'moov_money', 'wave', 'virement_bancaire')),
  ADD CONSTRAINT paiements_statut_check
    CHECK (statut IN ('en_attente', 'confirme', 'echoue', 'refuse')),
  ADD CONSTRAINT paiements_motif_refus_check
    CHECK (motif_refus IS NULL OR char_length(motif_refus) <= 500);

-- Vérifie qu'aucune donnée existante ne bloque la règle d'un seul paiement actif.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.paiements
    WHERE statut IN ('en_attente', 'confirme')
    GROUP BY ordre_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration arrêtée : plusieurs paiements en attente ou confirmés existent pour une même commande. Vérifie ces paiements avant de relancer.';
  END IF;
END;
$$;

DROP INDEX IF EXISTS public.un_paiement_confirme_par_commande;
CREATE UNIQUE INDEX IF NOT EXISTS un_paiement_actif_par_commande
  ON public.paiements (ordre_id)
  WHERE statut IN ('en_attente', 'confirme');

CREATE TABLE IF NOT EXISTS public.historique_paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paiement_id uuid NOT NULL REFERENCES public.paiements(id) ON DELETE RESTRICT,
  ancien_statut text,
  nouveau_statut text NOT NULL,
  modifie_par uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  motif text,
  date_modification timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS historique_paiements_paiement_idx
  ON public.historique_paiements (paiement_id, date_modification DESC);

ALTER TABLE public.historique_paiements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage payment history" ON public.historique_paiements;
CREATE POLICY "Admins can manage payment history"
  ON public.historique_paiements
  FOR ALL
  TO authenticated
  USING (public.is_baobab_admin())
  WITH CHECK (public.is_baobab_admin());

GRANT SELECT ON public.historique_paiements TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.historique_paiements FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.paiements FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enregistrer_paiement(
  p_ordre_id uuid,
  p_methode text,
  p_montant integer,
  p_reference_transaction text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.ordres%ROWTYPE;
  v_payment_id uuid;
  v_payment_status text;
  v_new_order_status text;
BEGIN
  IF NOT COALESCE(public.is_baobab_admin(), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Accès réservé à l’administrateur.';
  END IF;

  IF p_methode IS NULL OR p_methode NOT IN (
    'especes', 'orange_money', 'moov_money', 'wave', 'virement_bancaire'
  ) THEN
    RAISE EXCEPTION 'Méthode de paiement non autorisée.';
  END IF;

  SELECT o.*
  INTO v_order
  FROM public.ordres AS o
  WHERE o.id = p_ordre_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable.';
  END IF;

  IF v_order.statut = 'annule' THEN
    RAISE EXCEPTION 'Impossible d’enregistrer un paiement sur une commande annulée.';
  END IF;

  IF v_order.montant_final IS NULL OR v_order.montant_final <= 0 THEN
    RAISE EXCEPTION 'La commande doit avoir un montant final positif.';
  END IF;

  IF p_montant IS NULL OR p_montant <= 0 OR p_montant <> v_order.montant_final THEN
    RAISE EXCEPTION 'Le paiement doit correspondre exactement au montant final de la commande.';
  END IF;

  IF v_order.statut_paiement = 'paye' OR EXISTS (
    SELECT 1
    FROM public.paiements AS p
    WHERE p.ordre_id = v_order.id
      AND p.statut IN ('en_attente', 'confirme')
  ) THEN
    RAISE EXCEPTION 'Un paiement actif existe déjà pour cette commande.';
  END IF;

  v_payment_status := CASE WHEN p_methode = 'especes' THEN 'confirme' ELSE 'en_attente' END;

  INSERT INTO public.paiements (
    ordre_id, methode, montant, statut, reference_transaction,
    confirme_le, confirme_par
  )
  VALUES (
    v_order.id,
    p_methode,
    p_montant,
    v_payment_status,
    NULLIF(btrim(COALESCE(p_reference_transaction, '')), ''),
    CASE WHEN v_payment_status = 'confirme' THEN now() ELSE NULL END,
    CASE WHEN v_payment_status = 'confirme' THEN auth.uid() ELSE NULL END
  )
  RETURNING id INTO v_payment_id;

  INSERT INTO public.historique_paiements (
    paiement_id, ancien_statut, nouveau_statut, modifie_par, motif
  )
  VALUES (v_payment_id, NULL, v_payment_status, auth.uid(), 'Enregistrement du paiement');

  IF v_payment_status = 'confirme' THEN
    v_new_order_status := CASE
      WHEN v_order.statut = 'attente_paiement' THEN 'paye'
      ELSE v_order.statut
    END;

    UPDATE public.ordres
    SET statut_paiement = 'paye',
        statut = v_new_order_status,
        updated_at = now()
    WHERE id = v_order.id;

    IF v_new_order_status IS DISTINCT FROM v_order.statut THEN
      INSERT INTO public.historique_commandes (
        ordre_id, ancien_statut, nouveau_statut, modifie_par
      )
      VALUES (v_order.id, v_order.statut, v_new_order_status, auth.uid()::text);
    END IF;
  END IF;

  RETURN v_payment_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirmer_paiement(p_paiement_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_payment public.paiements%ROWTYPE;
  v_order public.ordres%ROWTYPE;
  v_new_order_status text;
BEGIN
  IF NOT COALESCE(public.is_baobab_admin(), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Accès réservé à l’administrateur.';
  END IF;

  SELECT p.*
  INTO v_payment
  FROM public.paiements AS p
  WHERE p.id = p_paiement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement introuvable.';
  END IF;

  IF v_payment.statut <> 'en_attente' THEN
    RAISE EXCEPTION 'Seul un paiement en attente peut être confirmé.';
  END IF;

  SELECT o.*
  INTO v_order
  FROM public.ordres AS o
  WHERE o.id = v_payment.ordre_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande associée introuvable.';
  END IF;

  IF v_order.statut = 'annule' THEN
    RAISE EXCEPTION 'Impossible de confirmer le paiement d’une commande annulée.';
  END IF;

  IF v_order.statut_paiement = 'paye' THEN
    RAISE EXCEPTION 'Cette commande est déjà marquée comme payée.';
  END IF;

  IF v_order.montant_final IS NULL OR v_payment.montant <> v_order.montant_final THEN
    RAISE EXCEPTION 'Le montant du paiement ne correspond plus au montant final de la commande. Vérification manuelle nécessaire.';
  END IF;

  UPDATE public.paiements
  SET statut = 'confirme',
      confirme_le = now(),
      confirme_par = auth.uid(),
      motif_refus = NULL,
      refuse_le = NULL,
      refuse_par = NULL
  WHERE id = v_payment.id;

  INSERT INTO public.historique_paiements (
    paiement_id, ancien_statut, nouveau_statut, modifie_par, motif
  )
  VALUES (v_payment.id, v_payment.statut, 'confirme', auth.uid(), 'Paiement vérifié et confirmé par un administrateur');

  v_new_order_status := CASE
    WHEN v_order.statut = 'attente_paiement' THEN 'paye'
    ELSE v_order.statut
  END;

  UPDATE public.ordres
  SET statut_paiement = 'paye',
      statut = v_new_order_status,
      updated_at = now()
  WHERE id = v_order.id;

  IF v_new_order_status IS DISTINCT FROM v_order.statut THEN
    INSERT INTO public.historique_commandes (
      ordre_id, ancien_statut, nouveau_statut, modifie_par
    )
    VALUES (v_order.id, v_order.statut, v_new_order_status, auth.uid()::text);
  END IF;

  RETURN v_payment.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refuser_paiement(
  p_paiement_id uuid,
  p_motif text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_payment public.paiements%ROWTYPE;
BEGIN
  IF NOT COALESCE(public.is_baobab_admin(), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Accès réservé à l’administrateur.';
  END IF;

  IF p_motif IS NULL OR char_length(btrim(p_motif)) < 5 OR char_length(btrim(p_motif)) > 500 THEN
    RAISE EXCEPTION 'Le motif du refus doit contenir entre 5 et 500 caractères.';
  END IF;

  SELECT p.*
  INTO v_payment
  FROM public.paiements AS p
  WHERE p.id = p_paiement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement introuvable.';
  END IF;

  IF v_payment.statut <> 'en_attente' THEN
    RAISE EXCEPTION 'Seul un paiement en attente peut être refusé.';
  END IF;

  UPDATE public.paiements
  SET statut = 'refuse',
      motif_refus = btrim(p_motif),
      refuse_le = now(),
      refuse_par = auth.uid()
  WHERE id = v_payment.id;

  INSERT INTO public.historique_paiements (
    paiement_id, ancien_statut, nouveau_statut, modifie_par, motif
  )
  VALUES (v_payment.id, v_payment.statut, 'refuse', auth.uid(), btrim(p_motif));

  RETURN v_payment.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.enregistrer_paiement(uuid, text, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirmer_paiement(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refuser_paiement(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.enregistrer_paiement(uuid, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmer_paiement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refuser_paiement(uuid, text) TO authenticated;
