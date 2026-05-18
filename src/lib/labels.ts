import type { CategoriaCliente, Estado, ListaTipo, Potencial, Prioridad, TipoCliente } from '@/types'

export const CATEGORIA_OPTIONS: { value: CategoriaCliente; label: string }[] = [
  { value: 'lead_nuevo', label: 'Lead nuevo' },
  { value: 'cliente_activo', label: 'Cliente activo' },
  { value: 'cliente_a_reactivar', label: 'A reactivar' },
  { value: 'cerrado_no_avanzar', label: 'Cerrado - no avanzar' },
]

export const TIPO_OPTIONS: { value: TipoCliente; label: string }[] = [
  { value: 'distribuidor', label: 'Distribuidor' },
  { value: 'arquitecto_desarrollador', label: 'Arquitecto / Desarrollador' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'otro', label: 'Otro' },
]

export const POTENCIAL_OPTIONS: { value: Potencial; label: string }[] = [
  { value: 'alto', label: 'Alto' },
  { value: 'medio', label: 'Medio' },
  { value: 'bajo', label: 'Bajo' },
]

export const ESTADO_OPTIONS: { value: Estado; label: string }[] = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'esperando', label: 'Esperando respuesta' },
  { value: 'cerrado', label: 'Cerrado' },
]

export const PRIORIDAD_OPTIONS: { value: Prioridad; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

export const LISTA_TIPO_OPTIONS: { value: ListaTipo; label: string }[] = [
  { value: 'lista_1', label: 'Lista 1' },
  { value: 'lista_2', label: 'Lista 2' },
]

export const listaTipoLabel: Record<ListaTipo, string> = {
  lista_1: 'Lista 1',
  lista_2: 'Lista 2',
}

export const categoriaLabel = Object.fromEntries(
  CATEGORIA_OPTIONS.map(option => [option.value, option.label])
) as Record<CategoriaCliente, string>

export const tipoLabel = Object.fromEntries(
  TIPO_OPTIONS.map(option => [option.value, option.label])
) as Record<TipoCliente, string>

export const potencialLabel = Object.fromEntries(
  POTENCIAL_OPTIONS.map(option => [option.value, option.label])
) as Record<Potencial, string>

export const estadoLabel = Object.fromEntries(
  ESTADO_OPTIONS.map(option => [option.value, option.label])
) as Record<Estado, string>
