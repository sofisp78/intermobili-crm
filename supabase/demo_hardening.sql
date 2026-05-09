-- =============================================
-- INTERMOBILI CRM - DEMO HARDENING
-- Ejecutar en Supabase > SQL Editor sobre una base existente.
-- Es idempotente: se puede correr mas de una vez.
-- =============================================

create extension if not exists pgcrypto;

-- Columnas que el producto demo ya usa desde el frontend.
alter table public.clients
  add column if not exists vendedor_original text,
  add column if not exists prioridad text,
  add column if not exists origen text,
  add column if not exists ultimo_resultado text,
  add column if not exists ultimo_canal text,
  add column if not exists ultima_actualizacion_por uuid references public.profiles(id),
  add column if not exists ultima_actualizacion_at timestamptz;

alter table public.client_updates
  add column if not exists prioridad text,
  add column if not exists categoria_cliente text,
  add column if not exists cambios text,
  add column if not exists canal text,
  add column if not exists resultado text,
  add column if not exists estado_anterior text,
  add column if not exists estado_nuevo text,
  add column if not exists categoria_anterior text,
  add column if not exists categoria_nueva text,
  add column if not exists prioridad_anterior text,
  add column if not exists prioridad_nueva text,
  add column if not exists fecha_proxima_accion_anterior date,
  add column if not exists fecha_proxima_accion_nueva date;

-- Checks para valores controlados.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_prioridad_check') then
    alter table public.clients
      add constraint clients_prioridad_check check (prioridad in ('alta', 'media', 'baja'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'client_updates_prioridad_check') then
    alter table public.client_updates
      add constraint client_updates_prioridad_check check (prioridad in ('alta', 'media', 'baja'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'client_updates_categoria_cliente_check') then
    alter table public.client_updates
      add constraint client_updates_categoria_cliente_check check (
        categoria_cliente in ('lead_nuevo', 'cliente_activo', 'cliente_a_reactivar', 'cerrado_no_avanzar')
      );
  end if;
end $$;

-- Trigger updated_at por si la base existente no lo tenia.
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.update_updated_at();

-- RLS alineada con la demo:
-- - admin ve todo
-- - vendedor ve/actualiza sus clientes y los sin asignar
-- - importacion solo admin
-- - historial visible por cliente, no solo por autor de la nota

alter table public.profiles enable row level security;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.uid() is not null);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

alter table public.clients enable row level security;
drop policy if exists "clients_select" on public.clients;
drop policy if exists "clients_insert" on public.clients;
drop policy if exists "clients_update" on public.clients;

create policy "clients_select" on public.clients
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and (p.role = 'admin' or p.id = vendedor_asignado or vendedor_asignado is null)
    )
  );

create policy "clients_insert" on public.clients
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid())
  );

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

alter table public.client_updates enable row level security;
drop policy if exists "updates_select" on public.client_updates;
drop policy if exists "updates_insert" on public.client_updates;

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

alter table public.imports enable row level security;
drop policy if exists "imports_admin" on public.imports;

create policy "imports_admin" on public.imports
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create or replace view public.clients_with_vendedor as
  select
    c.*,
    p.nombre as vendedor_nombre,
    p.vendedor_nombre as vendedor_display
  from public.clients c
  left join public.profiles p on p.id = c.vendedor_asignado;
