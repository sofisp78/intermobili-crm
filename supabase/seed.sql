-- =============================================
-- SEED — Datos de ejemplo
-- IMPORTANTE: primero crear los usuarios en
-- Supabase Auth > Users, luego correr este SQL
-- con los UUIDs reales de cada usuario.
-- =============================================

-- Reemplazá estos UUIDs con los reales de Auth
do $$
declare
  admin_id uuid := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; -- reemplazar
  tomas_id uuid := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; -- reemplazar
  adriana_id uuid := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; -- reemplazar
begin

insert into public.profiles (id, nombre, email, role, vendedor_nombre) values
  (admin_id, 'Admin', 'admin@intermobili.com', 'admin', null),
  (tomas_id, 'Tomás', 'tomas@intermobili.com', 'vendedor', 'Tomás'),
  (adriana_id, 'Adriana', 'adriana@intermobili.com', 'vendedor', 'Adriana');

insert into public.clients (
  razon_social, nombre_fantasia, cuit, telefono, mail,
  provincia, localidad, vendedor_asignado,
  categoria_cliente, tipo_cliente, potencial, estado,
  ultimo_contacto, resumen, fecha_proxima_accion, fecha_ultima_compra
) values
(
  'Distribuidora Sur S.A.', 'DistriSur', '30-12345678-9',
  '11-4444-5555', 'compras@distrisur.com',
  'Buenos Aires', 'Quilmes', tomas_id,
  'cliente_activo', 'distribuidor', 'alto', 'en_curso',
  current_date - 5, 'Interesados en línea Oslo. Esperan catálogo actualizado.',
  current_date, '2024-11-15'
),
(
  'Arq. Fernández & Asociados', null, '20-98765432-1',
  '11-5555-6666', 'info@fassoc.com.ar',
  'Buenos Aires', 'Palermo', tomas_id,
  'lead_nuevo', 'arquitecto_desarrollador', 'alto', 'nuevo',
  current_date - 2, 'Proyectan 3 departamentos en Belgrano. Buscan mobiliario completo.',
  current_date + 1, null
),
(
  'Hotel Alvear Palace', null, '30-55544433-2',
  '11-4808-2100', 'compras@alvear.com.ar',
  'Buenos Aires', 'Recoleta', adriana_id,
  'cliente_a_reactivar', 'hotel', 'alto', 'esperando',
  current_date - 30, 'Última compra hace 8 meses. Remodelación ala norte pendiente.',
  current_date - 5, '2024-04-10'
),
(
  'Muebles Córdoba S.R.L.', 'MueCor', '30-44433322-1',
  '351-444-5678', 'info@muecor.com.ar',
  'Córdoba', 'Córdoba Capital', tomas_id,
  'cliente_a_reactivar', 'distribuidor', 'medio', 'esperando',
  current_date - 45, 'Sin actividad desde el año pasado. Valía la pena recontactar.',
  current_date - 10, '2024-02-20'
),
(
  'Constructora Patagonia', null, '30-77788899-0',
  '294-444-5555', 'obra@patagonia.com',
  'Neuquén', 'Neuquén Capital', adriana_id,
  'lead_nuevo', 'arquitecto_desarrollador', 'medio', 'nuevo',
  current_date - 1, 'Contacto inicial por Instagram. Quieren ver showroom.',
  current_date + 3, null
);

end $$;
