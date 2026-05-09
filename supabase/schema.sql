-- =============================================
-- INTERMOBILI CRM - DEMO SCHEMA
-- Ejecutar en Supabase > SQL Editor para una base nueva.
-- Para una base existente, ejecutar tambien supabase/demo_hardening.sql.
-- =============================================

create extension if not exists pgcrypto;

-- PROFILES (vinculado a auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  email text not null,
  role text not null check (role in ('admin', 'vendedor')),
  vendedor_nombre text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Demo interna: todos los usuarios autenticados pueden ver el equipo comercial.
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.uid() is not null);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- CLIENTS
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  razon_social text not null,
  nombre_fantasia text,
  cuit text,
  telefono text,
  mail text,
  provincia text,
  localidad text,

  -- Comercial
  vendedor_asignado uuid references public.profiles(id),
  vendedor_original text,
  categoria_cliente text check (categoria_cliente in (
    'lead_nuevo', 'cliente_activo', 'cliente_a_reactivar', 'cerrado_no_avanzar'
  )),
  tipo_cliente text check (tipo_cliente in (
    'distribuidor', 'arquitecto_desarrollador', 'hotel', 'otro'
  )),
  potencial text check (potencial in ('alto', 'medio', 'bajo')),
  estado text check (estado in ('nuevo', 'en_curso', 'esperando', 'cerrado')),
  prioridad text check (prioridad in ('alta', 'media', 'baja')),
  origen text,

  -- Seguimiento
  ultimo_contacto date,
  resumen text,
  fecha_proxima_accion date,
  ultimo_resultado text,
  ultimo_canal text,
  ultima_actualizacion_por uuid references public.profiles(id),
  ultima_actualizacion_at timestamptz,

  -- Historico
  fecha_alta_sistema date,
  fecha_ultima_compra date,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clients enable row level security;

-- Admin ve todo; vendedor ve sus clientes y los sin asignar.
create policy "clients_select" on public.clients
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and (p.role = 'admin' or p.id = vendedor_asignado or vendedor_asignado is null)
    )
  );

-- Cualquier usuario autenticado puede crear clientes desde la app.
create policy "clients_insert" on public.clients
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid())
  );

-- Admin actualiza todo; vendedor actualiza sus clientes y los sin asignar.
create policy "clients_update" on public.clients
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and (p.role = 'admin' or p.id = vendedor_asignado or vendedor_asignado is null)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and (p.role = 'admin' or p.id = vendedor_asignado or vendedor_asignado is null)
    )
  );

-- Trigger updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.update_updated_at();

-- CLIENT UPDATES (historial inmutable)
create table public.client_updates (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  fecha_contacto date not null,
  resumen text,
  estado text check (estado in ('nuevo', 'en_curso', 'esperando', 'cerrado')),
  fecha_proxima_accion date,
  prioridad text check (prioridad in ('alta', 'media', 'baja')),
  categoria_cliente text check (categoria_cliente in (
    'lead_nuevo', 'cliente_activo', 'cliente_a_reactivar', 'cerrado_no_avanzar'
  )),
  cambios text,
  canal text,
  resultado text,
  estado_anterior text,
  estado_nuevo text,
  categoria_anterior text,
  categoria_nueva text,
  prioridad_anterior text,
  prioridad_nueva text,
  fecha_proxima_accion_anterior date,
  fecha_proxima_accion_nueva date,
  created_at timestamptz default now()
);

alter table public.client_updates enable row level security;

-- El historial se puede leer si el usuario puede leer el cliente.
create policy "updates_select" on public.client_updates
  for select using (
    exists (
      select 1
      from public.clients c
      join public.profiles p on p.id = auth.uid()
      where c.id = client_id
      and (p.role = 'admin' or c.vendedor_asignado = auth.uid() or c.vendedor_asignado is null)
    )
  );

create policy "updates_insert" on public.client_updates
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.clients c
      join public.profiles p on p.id = auth.uid()
      where c.id = client_id
      and (p.role = 'admin' or c.vendedor_asignado = auth.uid() or c.vendedor_asignado is null)
    )
  );

-- IMPORTS (log de importaciones)
create table public.imports (
  id uuid default gen_random_uuid() primary key,
  file_name text,
  imported_by uuid references public.profiles(id),
  imported_at timestamptz default now(),
  total_rows int,
  total_imported int,
  total_skipped int
);

alter table public.imports enable row level security;

create policy "imports_admin" on public.imports
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- VIEW util para dashboard/reporting.
create or replace view public.clients_with_vendedor as
  select
    c.*,
    p.nombre as vendedor_nombre,
    p.vendedor_nombre as vendedor_display
  from public.clients c
  left join public.profiles p on p.id = c.vendedor_asignado;
