-- SUGUMA: configuration dynamique de l'interface publique CLIENT.
-- Les réglages restent stockés dans la ligne unique de parametres_marque.
ALTER TABLE public.parametres_marque
  ADD COLUMN IF NOT EXISTS configuration_client jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.parametres_marque
  ADD CONSTRAINT parametres_marque_configuration_client_object
  CHECK (jsonb_typeof(configuration_client) = 'object');

UPDATE public.parametres_marque
SET configuration_client = jsonb_build_object(
  'version', 1,
  'theme', jsonb_build_object(
    'primary', '#123F32',
    'accent', '#D9A441',
    'background', '#F5F6F3',
    'surface', '#FFFFFF',
    'text', '#202923'
  ),
  'hero', jsonb_build_object(
    'visible', true,
    'title', 'Vos démarches, plus simples.',
    'subtitle', 'Le marché sans frontières.',
    'image_url', null
  ),
  'layout', jsonb_build_object(
    'preset', 'premium',
    'service_card_style', 'rounded',
    'show_search', true
  ),
  'sections', jsonb_build_object(
    'hero', true,
    'services', true,
    'benefits', true
  )
)
WHERE id = 1 AND configuration_client = '{}'::jsonb;
