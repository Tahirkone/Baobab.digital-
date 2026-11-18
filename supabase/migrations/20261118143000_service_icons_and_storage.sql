-- BAOBAB DIGITAL: image icons for services and secure brand/service asset uploads.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS icon_url text;

DROP POLICY IF EXISTS "BAOBAB assets admin insert" ON storage.objects;
DROP POLICY IF EXISTS "BAOBAB assets admin select" ON storage.objects;
DROP POLICY IF EXISTS "BAOBAB assets admin update" ON storage.objects;
DROP POLICY IF EXISTS "BAOBAB assets admin delete" ON storage.objects;

CREATE POLICY "BAOBAB assets admin insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'baobab-assets'
  AND (SELECT public.is_baobab_admin())
);

CREATE POLICY "BAOBAB assets admin select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'baobab-assets'
  AND (SELECT public.is_baobab_admin())
);

CREATE POLICY "BAOBAB assets admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'baobab-assets'
  AND (SELECT public.is_baobab_admin())
)
WITH CHECK (
  bucket_id = 'baobab-assets'
  AND (SELECT public.is_baobab_admin())
);

CREATE POLICY "BAOBAB assets admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'baobab-assets'
  AND (SELECT public.is_baobab_admin())
);
