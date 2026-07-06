import { createClient } from '@/lib/supabase/client'
import type { Client, ClientConUrgencia, Urgencia } from '@/types'
import { format, isToday, isPast, parseISO, subDays, startOfDay, endOfDay } from 'date-fns'

export type ContactoFiltro =
  | 'todos'
  | 'nunca'
  | 'mas_7'
  | 'mas_15'
  | 'mas_30'
  | 'mis_sin_contacto'
  | 'sin_asignar_sin_contacto'
  | 'mis_contactados_hoy'

export function calcularUrgencia(client: Pick<Client, 'fecha_proxima_accion'>): Urgencia {
  if (!client.fecha_proxima_accion) return 'sin_fecha'
  const fecha = parseISO(client.fecha_proxima_accion)
  if (isPast(fecha) && !isToday(fecha)) return 'vencido'
  if (isToday(fecha)) return 'hoy'
  return 'proximo'
}

// Columnas necesarias para DayCard + QuickUpdateModal
const COLS_DIA = [
  'id', 'razon_social', 'nombre_fantasia', 'telefono', 'mail',
  'provincia', 'localidad', 'vendedor_asignado',
  'categoria_cliente', 'prioridad', 'estado', 'lista_tipo',
  'ultimo_contacto', 'resumen', 'fecha_proxima_accion', 'numero_cliente',
  'profiles!vendedor_asignado(nombre, vendedor_nombre)',
].join(', ')

// Columnas necesarias para la tabla de listado
const COLS_LISTA = [
  'id', 'razon_social', 'nombre_fantasia', 'telefono',
  'localidad', 'provincia', 'vendedor_asignado',
  'categoria_cliente', 'estado', 'prioridad', 'lista_tipo',
  'fecha_proxima_accion', 'ultimo_contacto', 'numero_cliente',
  'profiles!vendedor_asignado(nombre, vendedor_nombre)',
].join(', ')

// Columnas para la ficha de cliente (detalle completo)
const COLS_DETALLE = [
  'id', 'razon_social', 'nombre_fantasia', 'cuit', 'telefono', 'mail',
  'provincia', 'localidad', 'vendedor_asignado',
  'categoria_cliente', 'tipo_cliente', 'potencial', 'estado', 'prioridad',
  'origen', 'ultimo_contacto', 'resumen', 'fecha_proxima_accion', 'lista_tipo',
  'fecha_alta_sistema', 'fecha_ultima_compra', 'numero_cliente',
  'profiles!vendedor_asignado(nombre, vendedor_nombre)',
].join(', ')

// Columnas para el dashboard admin (métricas agregadas, sin datos de contacto)
const COLS_ADMIN = [
  'id', 'vendedor_asignado',
  'categoria_cliente', 'estado', 'prioridad', 'lista_tipo',
  'fecha_proxima_accion', 'ultimo_contacto',
  'profiles!vendedor_asignado(nombre, vendedor_nombre)',
].join(', ')

function mapVendedorNombre(row: any): string | null {
  const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return p?.vendedor_nombre ?? p?.nombre ?? null
}

function sanitizeSearchTerm(value: string) {
  return value
    .trim()
    .replace(/[,%()]/g, ' ')
    .replace(/\s+/g, ' ')
}

function fechaLimiteContacto(dias: number) {
  return format(subDays(new Date(), dias), 'yyyy-MM-dd')
}

// Rango del día actual en horario local, evita comparar por string plano
// para no arrastrar corrimientos de zona horaria (ultimo_contacto es date).
function rangoHoyLocal() {
  const ahora = new Date()
  return {
    desde: format(startOfDay(ahora), "yyyy-MM-dd'T'HH:mm:ss"),
    hasta: format(endOfDay(ahora), "yyyy-MM-dd'T'HH:mm:ss"),
  }
}

export async function fetchVendedores() {
  const sb = createClient()
  const { data, error } = await sb
    .from('profiles')
    .select('id, nombre, vendedor_nombre')
    .order('nombre')

  if (error) throw error

  return (data ?? []).map(v => ({
    id: v.id,
    nombre: v.vendedor_nombre || v.nombre,
  })) as { id: string; nombre: string }[]
}

// vendedorFiltroId puede ser: undefined (sin filtro), un UUID, o 'sin_asignar'
export async function fetchClientesDia(
  vendedorId: string | null,
  isAdmin: boolean,
  vendedorFiltroId?: string,
  listaTipoFiltro?: string
) {
  const sb = createClient()
  let query = sb
    .from('clients')
    .select(COLS_DIA)
    .neq('categoria_cliente', 'cerrado_no_avanzar')
    .neq('estado', 'cerrado')

  if (!isAdmin && vendedorId) {
    query = query.or(`vendedor_asignado.eq.${vendedorId},vendedor_asignado.is.null`)
  } else if (isAdmin && vendedorFiltroId === 'sin_asignar') {
    query = query.is('vendedor_asignado', null)
  } else if (isAdmin && vendedorFiltroId) {
    query = query.eq('vendedor_asignado', vendedorFiltroId)
  }

  if (listaTipoFiltro) {
    query = query.eq('lista_tipo', listaTipoFiltro)
  }

  const { data, error } = await query
  if (error) throw error

  const ordenUrgencia: Record<Urgencia, number> = { vencido: 0, hoy: 1, proximo: 2, sin_fecha: 3 }
  const ordenPrioridad: Record<string, number> = { alta: 0, media: 1, baja: 2 }

  return ((data ?? []) as any[])
    .map(row => ({
      ...row,
      vendedor_nombre: mapVendedorNombre(row),
      urgencia: calcularUrgencia(row),
    }))
    .sort((a, b) => {
      const du = ordenUrgencia[a.urgencia as Urgencia] - ordenUrgencia[b.urgencia as Urgencia]
      if (du !== 0) return du
      return (ordenPrioridad[a.prioridad ?? 'baja'] ?? 2) - (ordenPrioridad[b.prioridad ?? 'baja'] ?? 2)
    }) as ClientConUrgencia[]
}

// vendedor puede ser un UUID, 'sin_asignar', o vacío/undefined
export async function fetchClientes(filtros: {
  vendedor?: string
  categoria?: string
  tipo?: string
  potencial?: string
  estado?: string
  prioridad?: string
  provincia?: string
  listaTipo?: string
  contacto?: ContactoFiltro
  usuarioActualId?: string
  search?: string
  incluirArchivados?: boolean
}) {
  const sb = createClient()
  let query = sb
    .from('clients')
    .select(COLS_LISTA)
    .order('razon_social')

  // Por defecto excluir clientes cerrados/archivados salvo que el toggle los habilite.
  if (!filtros.incluirArchivados) {
    query = query.neq('categoria_cliente', 'cerrado_no_avanzar')
    query = query.neq('estado', 'cerrado')
  }

  if (filtros.vendedor === 'sin_asignar') {
    query = query.is('vendedor_asignado', null)
  } else if (filtros.vendedor) {
    query = query.eq('vendedor_asignado', filtros.vendedor)
  }

  if (filtros.categoria)  query = query.eq('categoria_cliente', filtros.categoria)
  if (filtros.tipo)       query = query.eq('tipo_cliente', filtros.tipo)
  if (filtros.potencial)  query = query.eq('potencial', filtros.potencial)
  if (filtros.estado)     query = query.eq('estado', filtros.estado)
  if (filtros.prioridad)  query = query.eq('prioridad', filtros.prioridad)
  if (filtros.provincia)  query = query.ilike('provincia', `%${filtros.provincia}%`)
  if (filtros.listaTipo)  query = query.eq('lista_tipo', filtros.listaTipo)

  switch (filtros.contacto) {
    case 'nunca':
      query = query.is('ultimo_contacto', null)
      break
    case 'mas_7':
      query = query.lt('ultimo_contacto', fechaLimiteContacto(7))
      break
    case 'mas_15':
      query = query.lt('ultimo_contacto', fechaLimiteContacto(15))
      break
    case 'mas_30':
      query = query.lt('ultimo_contacto', fechaLimiteContacto(30))
      break
    case 'mis_sin_contacto':
      if (filtros.usuarioActualId) {
        query = query.eq('vendedor_asignado', filtros.usuarioActualId)
      }
      query = query.is('ultimo_contacto', null)
      break
    case 'sin_asignar_sin_contacto':
      query = query.is('vendedor_asignado', null).is('ultimo_contacto', null)
      break
    case 'mis_contactados_hoy': {
      if (filtros.usuarioActualId) {
        query = query.eq('vendedor_asignado', filtros.usuarioActualId)
      }
      const { desde, hasta } = rangoHoyLocal()
      query = query.gte('ultimo_contacto', desde).lte('ultimo_contacto', hasta)
      break
    }
  }

  const search = filtros.search ? sanitizeSearchTerm(filtros.search) : ''
  if (search) {
    query = query.or([
      `razon_social.ilike.%${search}%`,
      `nombre_fantasia.ilike.%${search}%`,
      `cuit.ilike.%${search}%`,
      `mail.ilike.%${search}%`,
      `telefono.ilike.%${search}%`,
      `localidad.ilike.%${search}%`,
      `provincia.ilike.%${search}%`,
      `numero_cliente.ilike.%${search}%`,
    ].join(','))
  }

  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as any[]).map(row => ({
    ...row,
    vendedor_nombre: mapVendedorNombre(row),
  })) as Client[]
}

export async function fetchCliente(id: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('clients')
    .select(COLS_DETALLE)
    .eq('id', id)
    .single()
  if (error) throw error
  return {
    ...(data as any),
    vendedor_nombre: mapVendedorNombre(data),
  } as Client
}

export async function actualizarVendedor(clientId: string, vendedorId: string | null) {
  const sb = createClient()
  const { data, error } = await sb
    .from('clients')
    .update({ vendedor_asignado: vendedorId || null })
    .eq('id', clientId)
    .select('id, vendedor_asignado')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('No se pudo actualizar el responsable. Revisá permisos o sesión.')
  return data
}

export async function fetchMetricas(vendedorId?: string) {
  const sb = createClient()
  let q = sb.from('clients').select('categoria_cliente, fecha_proxima_accion, vendedor_asignado')

  if (vendedorId === 'sin_asignar') {
    q = q.is('vendedor_asignado', null)
  } else if (vendedorId) {
    q = q.eq('vendedor_asignado', vendedorId)
  }

  const { data } = await q
  if (!data) return null

  const hoy = new Date().toISOString().split('T')[0]
  return {
    total_activos:   data.filter(c => c.categoria_cliente === 'cliente_activo').length,
    total_leads:     data.filter(c => c.categoria_cliente === 'lead_nuevo').length,
    total_reactivar: data.filter(c => c.categoria_cliente === 'cliente_a_reactivar').length,
    total_vencidos:  data.filter(c => c.fecha_proxima_accion && c.fecha_proxima_accion < hoy).length,
  }
}

// Columnas mínimas para el dashboard admin
export async function fetchClientesAdmin(filtros: {
  vendedor?: string
  listaTipo?: string
} = {}) {
  const sb = createClient()
  let q = sb
    .from('clients')
    .select(COLS_ADMIN)

  if (filtros.vendedor === 'sin_asignar') {
    q = q.is('vendedor_asignado', null)
  } else if (filtros.vendedor) {
    q = q.eq('vendedor_asignado', filtros.vendedor)
  }

  if (filtros.listaTipo) {
    q = q.eq('lista_tipo', filtros.listaTipo)
  }

  const { data, error } = await q
  if (error) throw error

  return ((data ?? []) as any[]).map(row => ({
    ...row,
    vendedor_nombre: mapVendedorNombre(row),
    urgencia: calcularUrgencia(row),
  })) as (Pick<Client,
    | 'id' | 'vendedor_asignado' | 'vendedor_nombre'
    | 'categoria_cliente' | 'estado' | 'prioridad' | 'lista_tipo'
    | 'fecha_proxima_accion' | 'ultimo_contacto'
  > & { urgencia: Urgencia })[]
}

export async function fetchUpdatesAdmin(filtros: {
  desde?: string
  hasta?: string
} = {}) {
  const sb = createClient()
  let q = sb
    .from('client_updates')
    .select('id, user_id, fecha_contacto, categoria_anterior, categoria_nueva')

  if (filtros.desde) q = q.gte('fecha_contacto', filtros.desde)
  if (filtros.hasta) q = q.lte('fecha_contacto', filtros.hasta)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as {
    id: string
    user_id: string
    fecha_contacto: string
    categoria_anterior: string | null
    categoria_nueva: string | null
  }[]
}
