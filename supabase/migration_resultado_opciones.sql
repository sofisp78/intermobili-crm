-- =============================================
-- MIGRACIÓN: Opciones administrables de resultado de contacto
-- Ejecutar en Supabase > SQL Editor
-- =============================================

create table public.opciones_resultado (
  id         uuid      default gen_random_uuid() primary key,
  nombre     text      not null,
  activa     boolean   not null default true,
  orden      integer   not null default 0,
  created_at timestamptz default now(),
  constraint opciones_resultado_nombre_unique unique (nombre)
);

alter table public.opciones_resultado enable row level security;

-- Todos los autenticados ven las opciones (necesario para el modal de contacto)
create policy "opciones_resultado_select" on public.opciones_resultado
  for select using (auth.uid() is not null);

-- Solo admin puede crear opciones
create policy "opciones_resultado_insert" on public.opciones_resultado
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Solo admin puede editar opciones (nombre, activa, orden)
create policy "opciones_resultado_update" on public.opciones_resultado
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- No se define DELETE: las opciones se desactivan, nunca se borran

-- Datos iniciales
insert into public.opciones_resultado (nombre, orden) values
  ('Respondió',            1),
  ('No respondió',         2),
  ('Pidió información',    3),
  ('Pidió presupuesto',    4),
  ('Queda en seguimiento', 5),
  ('No le interesa',       6),
  ('Llamar más adelante',  7),
  ('Reactivar',            8),
  ('Hizo pedido',          9);
