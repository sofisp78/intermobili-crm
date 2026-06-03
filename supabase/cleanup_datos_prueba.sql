-- ============================================================
-- ⚠️  PELIGRO: LIMPIEZA DE DATOS DE PRUEBA
-- ============================================================
-- Este script borra TODOS los datos operativos (clientes, contactos,
-- importaciones) pero NO toca usuarios ni perfiles.
--
-- ANTES DE EJECUTAR:
--   1. Hacer un backup / export desde Supabase Dashboard:
--      Table Editor → clients → Export as CSV
--      Table Editor → client_updates → Export as CSV
--   2. Confirmar que el entorno destino es el correcto (no producción con datos reales)
--   3. Este script NO se puede deshacer (no hay rollback automático)
--
-- TABLAS QUE SE LIMPIAN:
--   - public.client_updates   (historial de contactos)
--   - public.clients          (cartera de leads y clientes)
--   - public.imports          (log de importaciones CSV)
--
-- TABLAS QUE NO SE TOCAN:
--   - auth.users              (usuarios de Supabase Auth)
--   - public.profiles         (perfiles y roles del equipo)
-- ============================================================

-- Ejecutar en este orden para respetar foreign keys:

TRUNCATE TABLE public.client_updates CASCADE;
TRUNCATE TABLE public.clients CASCADE;
TRUNCATE TABLE public.imports CASCADE;

-- Si existe la tabla de importación legacy, también limpiarla:
-- TRUNCATE TABLE public.clientes_import_sistema CASCADE;

-- ============================================================
-- VERIFICACIÓN POST-LIMPIEZA:
-- SELECT 'client_updates' AS tabla, COUNT(*) FROM public.client_updates
-- UNION ALL
-- SELECT 'clients', COUNT(*) FROM public.clients
-- UNION ALL
-- SELECT 'imports', COUNT(*) FROM public.imports;
-- ============================================================
