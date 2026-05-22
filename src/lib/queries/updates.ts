import { createClient } from '@/lib/supabase/client'
import type { CategoriaCliente, Client, ClientUpdate, Estado, Prioridad } from '@/types'

export async function actualizarCampoRapido(
  clientId: string,
  prioridad: string | null,
  fechaProximaAccion: string | null
) {
  const sb = createClient()
  const { error } = await sb.from('clients').update({
    prioridad: prioridad || null,
    fecha_proxima_accion: fechaProximaAccion || null,
    ultima_actualizacion_at: new Date().toISOString(),
  }).eq('id', clientId)
  if (error) throw error
}

// Solo columnas renderizadas en el historial; excluye campos de auditoría interna
const COLS_HISTORIAL = [
  'id', 'client_id', 'user_id', 'fecha_contacto',
  'resumen', 'estado', 'prioridad', 'categoria_cliente',
  'fecha_proxima_accion', 'cambios', 'canal', 'resultado',
  'profiles!client_updates_user_id_fkey(nombre)',
].join(', ')

export async function fetchHistorial(clientId: string): Promise<ClientUpdate[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('client_updates')
    .select(COLS_HISTORIAL)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data as any[]).map(r => ({ ...r, user: { nombre: r.profiles?.nombre } }))
}

const ESTADO_LABEL: Record<string, string> = {
  nuevo: 'Nuevo', en_curso: 'En curso', esperando: 'Esperando', cerrado: 'Cerrado',
}
const CATEGORIA_LABEL: Record<string, string> = {
  lead_nuevo: 'Lead nuevo', cliente_activo: 'Activo',
  cliente_a_reactivar: 'A reactivar', cerrado_no_avanzar: 'Cerrado',
}
const PRIORIDAD_LABEL: Record<string, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' }

export async function guardarActualizacion(params: {
  clientId: string
  userId: string
  userName: string
  fechaContacto: string
  resumen: string
  estado: Estado
  fechaProximaAccion: string
  prioridad: Prioridad | null
  categoriaCliente: CategoriaCliente | null
  canal: string | null
  resultado: string | null
  clienteAnterior: Pick<Client, 'estado' | 'prioridad' | 'categoria_cliente' | 'fecha_proxima_accion'>
}) {
  const sb = createClient()
  const ant = params.clienteAnterior

  const partes: string[] = []
  if (params.prioridad && params.prioridad !== ant.prioridad)
    partes.push(`Prioridad: ${PRIORIDAD_LABEL[ant.prioridad ?? ''] ?? '—'} → ${PRIORIDAD_LABEL[params.prioridad]}`)
  if (params.estado !== ant.estado)
    partes.push(`Estado: ${ESTADO_LABEL[ant.estado ?? ''] ?? '—'} → ${ESTADO_LABEL[params.estado]}`)
  if (params.categoriaCliente && params.categoriaCliente !== ant.categoria_cliente)
    partes.push(`Categoría: ${CATEGORIA_LABEL[ant.categoria_cliente ?? ''] ?? '—'} → ${CATEGORIA_LABEL[params.categoriaCliente]}`)
  if (params.fechaProximaAccion && params.fechaProximaAccion !== ant.fecha_proxima_accion)
    partes.push(`Próxima acción: ${ant.fecha_proxima_accion ?? '—'} → ${params.fechaProximaAccion}`)

  const { error: e1 } = await sb.from('client_updates').insert({
    client_id:    params.clientId,
    user_id:      params.userId,
    fecha_contacto: params.fechaContacto,
    resumen:      params.resumen || null,
    estado:       params.estado,
    fecha_proxima_accion: params.fechaProximaAccion || null,
    prioridad:    params.prioridad,
    categoria_cliente: params.categoriaCliente,
    cambios:      partes.length > 0 ? partes.join(' · ') : null,
    canal:        params.canal,
    resultado:    params.resultado,
    // Columnas de auditoría detallada
    estado_anterior:              ant.estado,
    estado_nuevo:                 params.estado,
    categoria_anterior:           ant.categoria_cliente,
    categoria_nueva:              params.categoriaCliente,
    prioridad_anterior:           ant.prioridad,
    prioridad_nueva:              params.prioridad,
    fecha_proxima_accion_anterior: ant.fecha_proxima_accion,
    fecha_proxima_accion_nueva:   params.fechaProximaAccion || null,
  })
  if (e1) throw e1

  const updateData: Record<string, any> = {
    ultimo_contacto:          params.fechaContacto,
    estado:                   params.estado,
    fecha_proxima_accion:     params.fechaProximaAccion || null,
    ultima_actualizacion_por: params.userId,
    ultima_actualizacion_at:  new Date().toISOString(),
  }
  if (params.resumen)          updateData.resumen = params.resumen
  if (params.prioridad)        updateData.prioridad = params.prioridad
  if (params.categoriaCliente) updateData.categoria_cliente = params.categoriaCliente
  if (params.canal)            updateData.ultimo_canal = params.canal
  if (params.resultado)        updateData.ultimo_resultado = params.resultado

  const { error: e2 } = await sb.from('clients').update(updateData).eq('id', params.clientId)
  if (e2) throw e2
}
