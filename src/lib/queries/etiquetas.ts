import { createClient } from '@/lib/supabase/client'
import type { Etiqueta } from '@/types'

export async function fetchEtiquetas(soloActivas = false) {
  const sb = createClient()
  let q = sb.from('etiquetas').select('*').order('nombre')
  if (soloActivas) q = q.eq('activa', true)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Etiqueta[]
}

export async function crearEtiqueta(nombre: string, color: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('etiquetas')
    .insert({ nombre, color })
    .select()
    .single()
  if (error) throw error
  return data as Etiqueta
}

export async function actualizarEtiqueta(
  id: string,
  campos: Partial<Pick<Etiqueta, 'nombre' | 'color' | 'activa'>>
) {
  const sb = createClient()
  const { error } = await sb
    .from('etiquetas')
    .update(campos)
    .eq('id', id)
  if (error) throw error
}

export async function asignarEtiqueta(clientId: string, etiquetaId: string) {
  const sb = createClient()
  const { error } = await sb
    .from('client_etiquetas')
    .insert({ client_id: clientId, etiqueta_id: etiquetaId })
  if (error) throw error
}

export async function quitarEtiqueta(clientId: string, etiquetaId: string) {
  const sb = createClient()
  const { error } = await sb
    .from('client_etiquetas')
    .delete()
    .eq('client_id', clientId)
    .eq('etiqueta_id', etiquetaId)
  if (error) throw error
}
