-- ============================================================
-- MIGRACIÓN: Agregar campo lista_tipo a clients
-- Versión: 2025-05-16
-- Seguro de ejecutar múltiples veces (IF NOT EXISTS / DO $$)
-- ============================================================

-- 1. Agregar columna lista_tipo a clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS lista_tipo text;

-- 2. Agregar constraint para valores permitidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_lista_tipo_check'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_lista_tipo_check
      CHECK (
        lista_tipo IS NULL
        OR lista_tipo IN ('lista_1', 'lista_2')
      );
  END IF;
END $$;

-- 3. Agregar columna lista_tipo a client_updates (historial)
--    Permite saber con qué lista estaba asociado el lead al momento del contacto
ALTER TABLE public.client_updates
  ADD COLUMN IF NOT EXISTS lista_tipo text;

-- ============================================================
-- VERIFICACIÓN (ejecutar para confirmar):
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema = 'public'
--   AND table_name = 'clients'
--   AND column_name = 'lista_tipo';
-- ============================================================
