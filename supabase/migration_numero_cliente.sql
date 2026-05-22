-- Agrega número de cliente del sistema (texto para preservar ceros adelante, ej: 0000005)
alter table public.clients
  add column if not exists numero_cliente text;
