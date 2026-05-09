import clsx from 'clsx'
import { categoriaLabel, estadoLabel } from '@/lib/labels'
import type { CategoriaCliente, Estado, Potencial, Prioridad, Urgencia } from '@/types'

const categoriaColor: Record<CategoriaCliente, string> = {
  lead_nuevo: 'bg-blue-50 text-blue-700',
  cliente_activo: 'bg-sage-50 text-sage-800',
  cliente_a_reactivar: 'bg-amber-50 text-amber-700',
  cerrado_no_avanzar: 'bg-gray-100 text-gray-500',
}

const estadoColor: Record<Estado, string> = {
  nuevo: 'bg-blue-50 text-blue-700',
  en_curso: 'bg-sage-50 text-sage-800',
  esperando: 'bg-amber-50 text-amber-700',
  cerrado: 'bg-gray-100 text-gray-500',
}

const urgenciaConfig: Record<Urgencia, { label: string; cls: string }> = {
  vencido: { label: 'Vencido', cls: 'bg-red-50 text-red-700 font-medium' },
  hoy: { label: 'Hoy', cls: 'bg-amber-50 text-amber-700 font-medium' },
  proximo: { label: 'Proximo', cls: 'bg-sage-50 text-sage-700' },
  sin_fecha: { label: 'Sin fecha', cls: 'bg-gray-100 text-gray-500' },
}

const prioridadConfig: Record<Prioridad, { label: string; cls: string }> = {
  alta: { label: 'Alta', cls: 'bg-red-50 text-red-700 font-semibold' },
  media: { label: 'Media', cls: 'bg-amber-50 text-amber-700' },
  baja: { label: 'Baja', cls: 'bg-gray-100 text-gray-500' },
}

interface BadgeProps {
  className?: string
}

export function CategoriaBadge({ categoria, className }: { categoria: CategoriaCliente } & BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs', categoriaColor[categoria], className)}>
      {categoriaLabel[categoria]}
    </span>
  )
}

export function EstadoBadge({ estado, className }: { estado: Estado } & BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs', estadoColor[estado], className)}>
      {estadoLabel[estado]}
    </span>
  )
}

export function UrgenciaBadge({ urgencia }: { urgencia: Urgencia }) {
  const { label, cls } = urgenciaConfig[urgencia]
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs', cls)}>
      {label}
    </span>
  )
}

export function PotencialDot({ potencial }: { potencial: Potencial | string | null }) {
  const color = potencial === 'alto' ? 'bg-sage-600' : potencial === 'medio' ? 'bg-amber-400' : 'bg-gray-300'
  return <span className={clsx('inline-block w-2 h-2 rounded-full', color)} title={potencial ?? ''} />
}

export function PrioridadBadge({ prioridad, className }: { prioridad: Prioridad | string | null } & BadgeProps) {
  if (!prioridad) return null
  const cfg = prioridadConfig[prioridad as Prioridad] ?? prioridadConfig.media
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs', cfg.cls, className)}>
      {cfg.label}
    </span>
  )
}
