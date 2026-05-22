'use client'
import { useState } from 'react'
import type { ClientConUrgencia, Prioridad } from '@/types'
import { PrioridadBadge } from '@/components/ui/Badge'
import { listaTipoLabel } from '@/lib/labels'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import clsx from 'clsx'
import { actualizarCampoRapido } from '@/lib/queries/updates'

interface Props {
  client: ClientConUrgencia
  index: number
  onUpdate: (c: ClientConUrgencia) => void
  onRefresh: () => void
  onTakeLead: (clientId: string) => Promise<void>
}

function waLink(tel: string | null): string | null {
  if (!tel) return null
  const digits = tel.replace(/\D/g, '')
  if (!digits) return null
  const numero = digits.startsWith('54')
    ? digits
    : '54' + (digits.startsWith('0') ? digits.slice(1) : digits)
  return `https://wa.me/${numero}`
}

function telLink(tel: string | null): string | null {
  if (!tel) return null
  const digits = tel.replace(/[^\d+]/g, '')
  return digits ? `tel:${digits}` : null
}

const cardTone: Record<string, string> = {
  vencido: 'border-red-200 bg-red-50/60',
  hoy: 'border-amber-200 bg-amber-50/70',
  proximo: 'border-gray-200 bg-white',
  sin_fecha: 'border-gray-200 bg-white',
}

function tipoContacto(categoria: ClientConUrgencia['categoria_cliente']) {
  if (categoria === 'cliente_activo' || categoria === 'cliente_a_reactivar') return 'Cliente'
  if (categoria === 'lead_nuevo') return 'Lead'
  return 'Contacto'
}

export default function DayCard({ client: c, index, onUpdate, onRefresh, onTakeLead }: Props) {
  const [editMode, setEditMode] = useState(false)
  const [prioridadEdit, setPrioridadEdit] = useState<Prioridad>(c.prioridad ?? 'media')
  const [fechaEdit, setFechaEdit] = useState(c.fecha_proxima_accion ?? '')
  const [saving, setSaving] = useState(false)
  const [takingLead, setTakingLead] = useState(false)
  const [takeError, setTakeError] = useState<string | null>(null)

  const wa = waLink(c.telefono)
  const tel = telLink(c.telefono)
  const ubicacion = [c.localidad, c.provincia].filter(Boolean).join(', ')

  const proxFecha = c.fecha_proxima_accion
    ? format(parseISO(c.fecha_proxima_accion), "d 'de' MMMM", { locale: es })
    : null

  const diasSinContacto = c.ultimo_contacto
    ? differenceInDays(new Date(), parseISO(c.ultimo_contacto))
    : null

  const ultimoContacto =
    diasSinContacto === null ? 'Sin contacto registrado' :
    diasSinContacto === 0 ? 'Contactado hoy' :
    diasSinContacto === 1 ? 'Ultimo contacto: hace 1 dia' :
    `Ultimo contacto: hace ${diasSinContacto} dias`

  const accion =
    c.urgencia === 'vencido' ? 'Atrasado: llamar y actualizar' :
    c.urgencia === 'hoy' ? 'Llamar hoy' :
    c.urgencia === 'sin_fecha' ? 'Definir proxima fecha' :
    'En seguimiento'

  const quickSave = async () => {
    setSaving(true)
    try {
      await actualizarCampoRapido(c.id, prioridadEdit, fechaEdit)
      setEditMode(false)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleTakeLead = async () => {
    setTakingLead(true)
    setTakeError(null)
    try {
      await onTakeLead(c.id)
    } catch (e: any) {
      setTakeError(e?.message ?? 'No se pudo tomar el lead. Probá de nuevo.')
    } finally {
      setTakingLead(false)
    }
  }

  return (
    <div className={clsx('rounded-2xl border px-5 py-4 shadow-sm', cardTone[c.urgencia] ?? cardTone.sin_fecha)}>
      <div className="grid grid-cols-[44px_1fr_auto] gap-4 items-start">
        <div className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-base font-bold text-gray-700">
          {index}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-gray-950 leading-tight">{c.razon_social}</h3>
            <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
              {tipoContacto(c.categoria_cliente)}
            </span>
            {c.prioridad && <PrioridadBadge prioridad={c.prioridad} />}
            <span className={clsx(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              c.lista_tipo === 'lista_1' ? 'bg-purple-50 text-purple-700' :
              c.lista_tipo === 'lista_2' ? 'bg-indigo-50 text-indigo-700' :
              'bg-gray-100 text-gray-400'
            )}>
              {c.lista_tipo ? listaTipoLabel[c.lista_tipo] : 'Sin lista asignada'}
            </span>
            {!c.vendedor_asignado && <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Sin responsable</span>}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
            {c.nombre_fantasia && <span>Contacto: <span className="font-medium text-gray-700">{c.nombre_fantasia}</span></span>}
            {ubicacion && <span>{ubicacion}</span>}
            {c.vendedor_nombre && <span>Responsable: {c.vendedor_nombre}</span>}
            {c.numero_cliente && (
              <span className="font-mono text-xs text-gray-400">N° cliente: {c.numero_cliente}</span>
            )}
          </div>

          <div className="mt-3 rounded-xl bg-white/80 border border-black/5 px-3 py-2">
            <p className="text-sm font-semibold text-gray-800">{accion}</p>
            <p className="text-sm text-gray-600 mt-0.5">
              {proxFecha ? `Proximo contacto: ${proxFecha}` : 'No tiene proxima fecha asignada.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">{ultimoContacto}</p>
          </div>

          {c.resumen && (
            <p className="text-sm text-gray-700 mt-3 leading-relaxed">
              <span className="font-semibold">Nota:</span> {c.resumen}
            </p>
          )}

          {editMode && (
            <div className="mt-4 flex items-end gap-2 flex-wrap">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Prioridad</label>
                <select
                  value={prioridadEdit}
                  onChange={e => setPrioridadEdit(e.target.value as Prioridad)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-sage-400"
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>

              <div className="flex-1 min-w-[160px]">
                <label className="text-xs text-gray-500 mb-1 block">Proximo contacto</label>
                <input
                  type="date"
                  value={fechaEdit}
                  onChange={e => setFechaEdit(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-sage-400"
                />
              </div>

              <button
                onClick={quickSave}
                disabled={saving}
                className="text-sm bg-sage-600 text-white px-4 py-2 rounded-lg hover:bg-sage-800 transition font-semibold disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setEditMode(false)} className="text-sm text-gray-500 px-3 py-2 hover:text-gray-700">
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-[150px]">
          {!c.vendedor_asignado && (
            <>
              <button
                onClick={handleTakeLead}
                disabled={takingLead}
                className="text-sm px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition font-bold disabled:opacity-50"
              >
                {takingLead ? 'Tomando...' : 'Tomar lead'}
              </button>
              {takeError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {takeError}
                </p>
              )}
            </>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-sm px-4 py-2 border border-green-200 text-green-700 bg-green-50 rounded-xl hover:bg-green-100 transition font-bold"
            >
              WhatsApp
            </a>
          )}
          {tel && (
            <a
              href={tel}
              className="text-center text-sm px-4 py-2 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold"
            >
              Llamar
            </a>
          )}
          <button
            onClick={() => onUpdate(c)}
            className="text-sm px-4 py-2 bg-sage-700 text-white rounded-xl hover:bg-sage-900 transition font-bold"
          >
            Registrar contacto
          </button>
          <button
            onClick={() => setEditMode(true)}
            className="text-sm px-4 py-2 border border-gray-200 bg-white text-gray-600 rounded-xl hover:bg-gray-50 transition"
          >
            Cambiar fecha
          </button>
          <Link href={`/clientes/${c.id}`} className="text-center text-xs text-gray-400 hover:text-sage-700 mt-1">
            Ver ficha
          </Link>
        </div>
      </div>
    </div>
  )
}
