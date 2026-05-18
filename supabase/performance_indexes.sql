-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- Versión: 2025-05-16
-- Seguro de ejecutar múltiples veces (IF NOT EXISTS)
-- No borra datos. No toca auth.users ni profiles.
-- ============================================================

-- clients: columnas usadas en filtros del dashboard y listados
CREATE INDEX IF NOT EXISTS idx_clients_vendedor_asignado
  ON public.clients (vendedor_asignado);

CREATE INDEX IF NOT EXISTS idx_clients_fecha_proxima_accion
  ON public.clients (fecha_proxima_accion);

CREATE INDEX IF NOT EXISTS idx_clients_estado
  ON public.clients (estado);

CREATE INDEX IF NOT EXISTS idx_clients_prioridad
  ON public.clients (prioridad);

CREATE INDEX IF NOT EXISTS idx_clients_lista_tipo
  ON public.clients (lista_tipo);

CREATE INDEX IF NOT EXISTS idx_clients_created_at
  ON public.clients (created_at);

CREATE INDEX IF NOT EXISTS idx_clients_categoria_cliente
  ON public.clients (categoria_cliente);

-- Índice compuesto para el filtro principal del dashboard diario:
-- excluye cerrado_no_avanzar + cerrado y ordena por urgencia
CREATE INDEX IF NOT EXISTS idx_clients_dashboard
  ON public.clients (vendedor_asignado, categoria_cliente, estado, fecha_proxima_accion);

-- client_updates: columnas usadas en el dashboard admin
CREATE INDEX IF NOT EXISTS idx_client_updates_client_id
  ON public.client_updates (client_id);

CREATE INDEX IF NOT EXISTS idx_client_updates_user_id
  ON public.client_updates (user_id);

CREATE INDEX IF NOT EXISTS idx_client_updates_fecha_contacto
  ON public.client_updates (fecha_contacto);

CREATE INDEX IF NOT EXISTS idx_client_updates_created_at
  ON public.client_updates (created_at);

CREATE INDEX IF NOT EXISTS idx_client_updates_resultado
  ON public.client_updates (resultado);

CREATE INDEX IF NOT EXISTS idx_client_updates_canal
  ON public.client_updates (canal);

-- Índice compuesto para el rango de fechas del dashboard:
-- la query principal del dashboard filtra por fecha_contacto con BETWEEN
CREATE INDEX IF NOT EXISTS idx_client_updates_fecha_user
  ON public.client_updates (fecha_contacto, user_id);

-- profiles: columna usada para filtrar vendedores
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);

-- ============================================================
-- VERIFICACIÓN (ejecutar para ver índices creados):
-- SELECT indexname, tablename FROM pg_indexes
--   WHERE schemaname = 'public'
--   ORDER BY tablename, indexname;
-- ============================================================
