-- SUGUMA: réglages visuels administrables de l'application CLIENT.
CREATE TABLE IF NOT EXISTS public.suguma_client_appearance (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hero_title text NOT NULL DEFAULT 'Vos démarches,',
  hero_highlight text NOT NULL DEFAULT 'plus simples.',
  hero_description text NOT NULL DEFAULT 'Commande tes documents et prestations en quelques étapes, directement depuis ton téléphone.',
  hero_image_url text,
  hero_image_alt text NOT NULL DEFAULT 'Présentation des services SUGUMA',
  cta_label text NOT NULL DEFAULT 'Découvrir nos services',
  primary_color text NOT NULL DEFAULT '#075B3B' CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text NOT NULL DEFAULT '#F59A19' CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  page_background text NOT NULL DEFAULT '#F7F8F5' CHECK (page_background ~ '^#[0-9A-Fa-f]{6}$'),
  card_style text NOT NULL DEFAULT 'rounded' CHECK (card_style IN ('rounded','soft','square')),
  layout_variant text NOT NULL DEFAULT 'split' CHECK (layout_variant IN ('split','centered','minimal')),
  show_services boolean NOT NULL DEFAULT true,
  show_process boolean NOT NULL DEFAULT true,
  show_contact boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suguma_client_appearance ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.suguma_client_appearance TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.suguma_client_appearance TO authenticated;

DROP POLICY IF EXISTS "Public can read SUGUMA client appearance" ON public.suguma_client_appearance;
CREATE POLICY "Public can read SUGUMA client appearance"
  ON public.suguma_client_appearance FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Only SUGUMA admins can manage client appearance" ON public.suguma_client_appearance;
CREATE POLICY "Only SUGUMA admins can manage client appearance"
  ON public.suguma_client_appearance FOR ALL TO authenticated
  USING (public.is_baobab_admin())
  WITH CHECK (public.is_baobab_admin());

INSERT INTO public.suguma_client_appearance (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
