-- Allow the SUGUMA admin image editor to upload common image formats.
-- The bucket remains public-read and its object write policies remain admin-only.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/webp','image/jpeg','image/png','image/avif'],
    file_size_limit = 12582912
WHERE id = 'baobab-assets';
