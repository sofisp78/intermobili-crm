-- =============================================
-- MIGRACIÓN: Etiquetas administrables
-- Ejecutar en Supabase > SQL Editor
-- =============================================

-- Tabla catálogo de etiquetas
create table public.etiquetas (
  id          uuid      default gen_random_uuid() primary key,
  nombre      text      not null,
  color       text      not null default '#6B7280',
  activa      boolean   not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  constraint etiquetas_nombre_unique unique (nombre)
);

-- Reutiliza la función update_updated_at() ya existente en el schema
create trigger etiquetas_updated_at
  before update on public.etiquetas
  for each row execute function public.update_updated_at();

-- Relación many-to-many cliente ↔ etiqueta
create table public.client_etiquetas (
  client_id    uuid references public.clients(id)   on delete cascade not null,
  etiqueta_id  uuid references public.etiquetas(id) not null,
  assigned_at  timestamptz default now(),
  primary key (client_id, etiqueta_id)
);

-- ─── RLS ──────────────────────────────────────────────────────────────────

alter table public.etiquetas        enable row level security;
alter table public.client_etiquetas enable row level security;

-- Todos los usuarios autenticados ven el catálogo (necesario para asignar etiquetas a clientes)
create policy "etiquetas_select" on public.etiquetas
  for select using (auth.uid() is not null);

-- Solo admin puede crear etiquetas
create policy "etiquetas_insert" on public.etiquetas
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Solo admin puede editar etiquetas (nombre, color, activa)
create policy "etiquetas_update" on public.etiquetas
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- No se define policy de DELETE: las etiquetas se desactivan, nunca se borran

-- client_etiquetas: mismos permisos de acceso que el cliente asociado
create policy "client_etiquetas_select" on public.client_etiquetas
  for select using (
    exists (
      select 1 from public.clients c
      join public.profiles p on p.id = auth.uid()
      where c.id = client_id
        and (
          p.role = 'admin'
          or c.vendedor_asignado = auth.uid()
          or c.vendedor_asignado is null
        )
    )
  );

create policy "client_etiquetas_insert" on public.client_etiquetas
  for insert with check (
    exists (
      select 1 from public.clients c
      join public.profiles p on p.id = auth.uid()
      where c.id = client_id
        and (
          p.role = 'admin'
          or c.vendedor_asignado = auth.uid()
          or c.vendedor_asignado is null
        )
    )
  );

create policy "client_etiquetas_delete" on public.client_etiquetas
  for delete using (
    exists (
      select 1 from public.clients c
      join public.profiles p on p.id = auth.uid()
      where c.id = client_id
        and (
          p.role = 'admin'
          or c.vendedor_asignado = auth.uid()
          or c.vendedor_asignado is null
        )
    )
  );
