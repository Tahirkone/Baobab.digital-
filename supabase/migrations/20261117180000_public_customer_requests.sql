-- BAOBAB DIGITAL — réception sécurisée des demandes publiques
-- À examiner puis exécuter dans Supabase SQL Editor avant d'activer le formulaire.

CREATE OR REPLACE FUNCTION public.creer_demande_publique(
  p_nom_complet text,
  p_telephone text,
  p_message text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_name text := btrim(COALESCE(p_nom_complet, ''));
  v_phone text := btrim(COALESCE(p_telephone, ''));
  v_message text := NULLIF(btrim(COALESCE(p_message, '')), '');
  v_phone_digits text;
  v_client_id uuid;
  v_order_id uuid;
  v_reference text;
  v_total bigint := 0;
  v_item_count integer;
  v_item record;
  v_price integer;
BEGIN
  IF char_length(v_name) < 2 OR char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'Nom invalide.';
  END IF;
  IF char_length(v_phone) < 6 OR char_length(v_phone) > 30 THEN
    RAISE EXCEPTION 'Numéro de téléphone invalide.';
  END IF;
  IF v_message IS NOT NULL AND char_length(v_message) > 1000 THEN
    RAISE EXCEPTION 'Le message est trop long.';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Sélection de prestations invalide.';
  END IF;

  SELECT count(*) INTO v_item_count FROM jsonb_array_elements(p_items);
  IF v_item_count < 1 OR v_item_count > 8 THEN
    RAISE EXCEPTION 'Choisis entre 1 et 8 prestations.';
  END IF;

  FOR v_item IN
    SELECT x.service_id, x.quantity
    FROM jsonb_to_recordset(p_items) AS x(service_id uuid, quantity integer)
  LOOP
    IF v_item.service_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity < 1 OR v_item.quantity > 20 THEN
      RAISE EXCEPTION 'Une prestation ou une quantité est invalide.';
    END IF;
    SELECT s.indicative_price INTO v_price
    FROM public.services AS s
    WHERE s.id = v_item.service_id AND s.is_active = true;
    IF NOT FOUND OR v_price IS NULL OR v_price < 0 THEN
      RAISE EXCEPTION 'Une prestation sélectionnée n’est plus disponible.';
    END IF;
    v_total := v_total + (v_price::bigint * v_item.quantity::bigint);
  END LOOP;

  IF v_total <= 0 OR v_total > 2000000000 THEN
    RAISE EXCEPTION 'Le montant calculé est invalide.';
  END IF;

  v_phone_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
  SELECT c.id INTO v_client_id
  FROM public.clients AS c
  WHERE regexp_replace(c.telephone, '[^0-9]', '', 'g') = v_phone_digits
  ORDER BY c.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (nom_complet, telephone)
    VALUES (v_name, v_phone)
    RETURNING id INTO v_client_id;
  ELSE
    UPDATE public.clients SET nom_complet = v_name, telephone = v_phone, updated_at = now()
    WHERE id = v_client_id;
  END IF;

  v_reference := 'BD-' || to_char(clock_timestamp(), 'YYMMDDHH24MISSMS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  INSERT INTO public.ordres (
    reference, client_id, nom_client, telephone_client, montant_final,
    statut, statut_paiement, option_paiement_espece, message_client,
    created_at, updated_at
  )
  VALUES (
    v_reference, v_client_id, v_name, v_phone, v_total::integer,
    'nouveau', 'impaye', NULL, v_message, now(), now()
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.details_commandes (
    ordre_id, service_id, nom_service, prix_indicatif, quantite
  )
  SELECT v_order_id, s.id, s.name, s.indicative_price, x.quantity
  FROM jsonb_to_recordset(p_items) AS x(service_id uuid, quantity integer)
  JOIN public.services AS s ON s.id = x.service_id AND s.is_active = true;

  INSERT INTO public.historique_commandes (
    ordre_id, ancien_statut, nouveau_statut, modifie_par
  )
  VALUES (v_order_id, NULL, 'nouveau', 'Demande publique');

  RETURN jsonb_build_object('id', v_order_id, 'reference', v_reference, 'montant_indicatif', v_total);
END;
$function$;

REVOKE ALL ON FUNCTION public.creer_demande_publique(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creer_demande_publique(text, text, text, jsonb) TO service_role;
