import { createClient } from '@/lib/supabase/client'
import type { Client, ClientConUrgencia, Urgencia } from '@/types'
import { isToday, isPast, parseISO } from 'date-fns'

export function calcularUrgencia(client: Client): Urgencia {
  // Sin fecha asignada = sin_fecha, nunca vencido por defecto
  if (!client.fecha_proxima_accion) return 'sin_fecha'
  const fecha = parseISO(client.fecha_proxima_accion)
  if (isPast(fecha) && !isToday(fecha)) return 'vencido'
  if (isToday(fecha)) return 'hoy'
  return 'proximo'
}

export async function fetchVendedores() {
  const sb = createClient()
  const { data, error } = await sb
    .from('profiles')
    .select('id, nombre, vendedor_nombre, role')
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
  vendedorFiltroId?: string
) {
  const sb = createClient()
  let query = sb
    .from('clients')
    .select('*, profiles!vendedor_asignado(nombre, vendedor_nombre)')
    .neq('categoria_cliente', 'cerrado_no_avanzar')
    .neq('estado', 'cerrado')

  if (!isAdmin && vendedorId) {
    // Vendedor ve sus clientes + los sin asignar
    query = query.or(`vendedor_asignado.eq.${vendedorId},vendedor_asignado.is.null`)
  } else if (isAdmin && vendedorFiltroId === 'sin_asignar') {
    query = query.is('vendedor_asignado', null)
  } else if (isAdmin && vendedorFiltroId) {
    query = query.eq('vendedor_asignado', vendedorFiltroId)
  }
  // Admin sin filtro → ve todo (sin restricción)

  const { data, error } = await query
  if (error) throw error

  const clientes = (data as any[]).map(row => ({
    ...row,
    vendedor_nombre: row.profiles?.vendedor_nombre ?? row.profiles?.nombre ?? null,
  })) as Client[]

  const conUrgencia: ClientConUrgencia[] = clientes.map(c => ({
    ...c,
    urgencia: calcularUrgencia(c),
  }))

  const ordenUrgencia: Record<Urgencia, number> = { vencido: 0, hoy: 1, proximo: 2, sin_fecha: 3 }
  const ordenPrioridad: Record<string, number> = { alta: 0, media: 1, baja: 2 }
  return conUrgencia.sort((a, b) => {
    const du = ordenUrgencia[a.urgencia] - ordenUrgencia[b.urgencia]
    if (du !== 0) return du
    return (ordenPrioridad[a.prioridad ?? 'baja'] ?? 2) - (ordenPrioridad[b.prioridad ?? 'baja'] ?? 2)
  })
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
  search?: string
}) {
  const sb = createClient()
  let query = sb
    .from('clients')
    .select('*, profiles!vendedor_asignado(nombre)')
    .order('razon_social')

  if (filtros.vendedor === 'sin_asignar') {
    query = query.is('vendedor_asignado', null)
  } else if (filtros.vendedor) {
    query = query.eq('vendedor_asignado', filtros.vendedor)
  }

  if (filtros.categoria) query = query.eq('categoria_cliente', filtros.categoria)
  if (filtros.tipo)      query = query.eq('tipo_cliente', filtros.tipo)
  if (filtros.potencial) query = query.eq('potencial', filtros.potencial)
  if (filtros.estado)    query = query.eq('estado', filtros.estado)
  if (filtros.prioridad) query = query.eq('prioridad', filtros.prioridad)
  if (filtros.provincia) query = query.ilike('provincia', `%${filtros.provincia}%`)
  const search = filtros.search?.trim().replace(/,/g, ' ')
  if (search) {
    query = query.or([
      `razon_social.ilike.%${search}%`,
      `nombre_fantasia.ilike.%${search}%`,
      `cuit.ilike.%${search}%`,
      `mail.ilike.%${search}%`,
      `telefono.ilike.%${search}%`,
      `localidad.ilike.%${search}%`,
      `provincia.ilike.%${search}%`,
    ].join(','))
  }

  const { data, error } = await query
  if (error) throw error
  return (data as any[]).map(row => ({
    ...row,
    vendedor_nombre: row.profiles?.vendedor_nombre ?? row.profiles?.nombre ?? null,
  })) as Client[]
}

export async function fetchCliente(id: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('clients')
    .select('*, profiles!vendedor_asignado(nombre, vendedor_nombre)')
    .eq('id', id)
    .single()
  if (error) throw error
  return {
    ...data,
    vendedor_nombre: (data as any).profiles?.vendedor_nombre ?? (data as any).profiles?.nombre ?? null,
  } as Client
}

export async function actualizarVendedor(clientId: string, vendedorId: string | null) {
  const sb = createClient()
  const { error } = await sb
    .from('clients')
    .update({ vendedor_asignado: vendedorId || null })
    .eq('id', clientId)
  if (error) throw error
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
