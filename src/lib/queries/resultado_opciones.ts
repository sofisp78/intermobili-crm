import { createClient } from '@/lib/supabase/client'
import type { OpcionResultado } from '@/types'

export async function fetchResultadoOpciones(soloActivas = false) {
  const sb = createClient()
  let q = sb.from('opciones_resultado').select('*').order('orden').order('nombre')
  if (soloActivas) q = q.eq('activa', true)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as OpcionResultado[]
}

export async function crearOpcionResultado(nombre: string, orden: number) {
  const sb = createClient()
  const { data, error } = await sb
    .from('opciones_resultado')
    .insert({ nombre, orden })
    .select()
    .single()
  if (error) throw error
  return data as OpcionResultado
}

export async function actualizarOpcionResultado(
  id: string,
  campos: Partial<Pick<OpcionResultado, 'nombre' | 'activa' | 'orden'>>
) {
  const sb = createClient()
  const { data, error } = await sb
    .from('opciones_resultado')
    .update(campos)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('No se pudo actualizar la opción. Revisá permisos de admin o sesión.')
  return data as OpcionResultado
}
