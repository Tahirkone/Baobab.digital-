-- BAOBAB DIGITAL — archivage réversible des clients
-- Les commandes et l'historique restent liés au client archivé.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS clients_active_created_at_idx
  ON public.clients (created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS clients_archived_at_idx
  ON public.clients (archived_at DESC)
  WHERE archived_at IS NOT NULL;
