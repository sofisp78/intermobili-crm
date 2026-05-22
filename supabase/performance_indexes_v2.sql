-- ============================================================
-- ÍNDICES DE PERFORMANCE v2 — 2026-05
-- Seguro de ejecutar múltiples veces (IF NOT EXISTS)
-- No borra datos. Complementa performance_indexes.sql.
-- ============================================================

-- REQUIERE la extensión pg_trgm para búsqueda ILIKE con comodín inicial (%texto%)
-- Supabase la tiene habilitada por defecto; si no, ejecutar primero:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Búsqueda ILIKE en número de cliente (buscador de Leads y Mi día)
CREATE INDEX IF NOT EXISTS idx_clients_numero_cliente_trgm
  ON public.clients USING gin (numero_cliente gin_trgm_ops);

-- Búsqueda ILIKE en razon_social (buscador principal de Leads)
CREATE INDEX IF NOT EXISTS idx_clients_razon_social_trgm
  ON public.clients USING gin (razon_social gin_trgm_ops);

-- Búsqueda ILIKE en nombre_fantasia (buscador de Leads y Mi día)
CREATE INDEX IF NOT EXISTS idx_clients_nombre_fantasia_trgm
  ON public.clients USING gin (nombre_fantasia gin_trgm_ops);

-- Historial de cliente: acceso por client_id + orden por created_at DESC
-- Más eficiente que los dos índices por separado para el .limit(50)
CREATE INDEX IF NOT EXISTS idx_client_updates_client_id_created_at
  ON public.client_updates (client_id, created_at DESC);

-- ORDER BY razon_social en fetchClientes (listado de Leads)
CREATE INDEX IF NOT EXISTS idx_clients_razon_social_btree
  ON public.clients (razon_social);

-- ============================================================
-- VERIFICACIÓN (ejecutar para ver todos los índices):
-- SELECT indexname, tablename, indexdef
--   FROM pg_indexes
--   WHERE schemaname = 'public'
--   ORDER BY tablename, indexname;
-- ============================================================
