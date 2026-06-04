'use client'
import { useEffect, useState } from 'react'
import type { CategoriaCliente, Client, Estado, Prioridad } from '@/types'
import { guardarActualizacion } from '@/lib/queries/updates'
import { fetchResultadoOpciones } from '@/lib/queries/resultado_opciones'
import clsx from 'clsx'
import { addDays } from 'date-fns'

// Fallback por si falla la carga desde DB
const RESULTADOS_FALLBACK = [
  'Respondió', 'No respondió', 'Pidió información', 'Pidió presupuesto',
  'Queda en seguimiento', 'No le interesa', 'Llamar más adelante', 'Reactivar', 'Hizo pedido',
]

const CANALES = ['Llamada', 'WhatsApp', 'Mail', 'Presencial', 'Instagram', 'Otro']

const PRESETS_FECHA = [
  { label: 'Mañana',   days: 1 },
  { label: '3 días',   days: 3 },
  { label: '7 días',   days: 7 },
  { label: '15 días',  days: 15 },
]

function isoDate(d: Date) { return d.toISOString().split('T')[0] }

function ChipGroup({ options, value, onChange }: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? '' : opt)}
          className={clsx(
            'text-xs px-2.5 py-1.5 rounded-lg border transition',
            value === opt
              ? 'bg-sage-600 text-white border-sage-600 font-medium'
              : 'bg-white text-gray-600 border-gray-200 hover:border-sage-300 hover:text-sage-700'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

interface Props {
  client: Client
  userId: string
  userName: string
  onClose: () => void
  onSaved: () => void
}

export default function QuickUpdateModal({ client, userId, userName, onClose, onSaved }: Props) {
  const hoy = isoDate(new Date())

  const [opcionesResultado, setOpcionesResultado] = useState<string[]>(RESULTADOS_FALLBACK)
  const [opcionesAviso, setOpcionesAviso] = useState('')
  useEffect(() => {
    fetchResultadoOpciones(true)
      .then(ops => setOpcionesResultado(ops.map(o => o.nombre)))
      .catch((e: any) => {
        console.warn('No se pudieron cargar opciones de contacto desde Supabase:', e)
        setOpcionesAviso('No se pudieron cargar las opciones administrables. Se muestran opciones predeterminadas.')
      })
  }, [])

  const [resultado, setResultado] = useState('')
  const [canal, setCanal] = useState('')
  const [resumen, setResumen] = useState('')
  const [proxAccion, setProxAccion] = useState(client.fecha_proxima_accion ?? '')
  const [estado, setEstado] = useState<Estado>(client.estado ?? 'en_curso')
  const [prioridad, setPrioridad] = useState<Prioridad>(client.prioridad ?? 'media')
  const [categoriaCliente, setCategoriaCliente] = useState<CategoriaCliente>(
    client.categoria_cliente ?? 'cliente_activo'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const aplicarPreset = (days: number) => {
    setProxAccion(isoDate(addDays(new Date(), days)))
  }

  const guardar = async () => {
    setLoading(true); setError('')
    try {
      await guardarActualizacion({
        clientId: client.id,
        userId,
        userName,
        fechaContacto: hoy,
        resumen,
        estado,
        fechaProximaAccion: proxAccion,
        prioridad,
        categoriaCliente,
        canal: canal || null,
        resultado: resultado || null,
        clienteAnterior: {
          estado: client.estado,
          prioridad: client.prioridad,
          categoria_cliente: client.categoria_cliente,
          fecha_proxima_accion: client.fecha_proxima_accion,
        },
      })
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const labelCls = 'text-xs font-semibold text-gray-600 mb-1.5 block'
  const selectCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-gray-900 truncate">{client.razon_social}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Registrar contacto</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 transition flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {opcionesAviso && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{opcionesAviso}</p>}

          {/* Resultado */}
          <div>
            <label className={labelCls}>¿Cómo resultó?</label>
            <ChipGroup options={opcionesResultado} value={resultado} onChange={setResultado} />
          </div>

          {/* Canal */}
          <div>
            <label className={labelCls}>Canal</label>
            <ChipGroup options={CANALES} value={canal} onChange={setCanal} />
          </div>

          {/* Nota */}
          <div>
            <label className={labelCls}>
              Nota{' '}
              <span className="text-gray-400 font-normal">— ¿qué pasó? (opcional)</span>
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage-400"
              rows={3}
              placeholder="Ej: Llamé, confirma reunión para el jueves..."
              value={resumen}
              onChange={e => setResumen(e.target.value)}
            />
          </div>

          {/* Próximo contacto */}
          <div>
            <label className={labelCls}>Próximo contacto</label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {PRESETS_FECHA.map(p => {
                const fecha = isoDate(addDays(new Date(), p.days))
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => aplicarPreset(p.days)}
                    className={clsx(
                      'text-xs px-3 py-1.5 rounded-lg border transition',
                      proxAccion === fecha
                        ? 'bg-sage-600 text-white border-sage-600 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-sage-300 hover:text-sage-700'
                    )}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              value={proxAccion}
              onChange={e => setProxAccion(e.target.value)}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 flex-shrink-0">Cambiar si es necesario</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Prioridad + Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prioridad</label>
              <select className={selectCls} value={prioridad} onChange={e => setPrioridad(e.target.value as Prioridad)}>
                <option value="alta">↑ Alta</option>
                <option value="media">— Media</option>
                <option value="baja">↓ Baja</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select className={selectCls} value={estado} onChange={e => setEstado(e.target.value as Estado)}>
                <option value="nuevo">Nuevo</option>
                <option value="en_curso">En curso</option>
                <option value="esperando">Esperando respuesta</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className={labelCls}>Categoría</label>
            <select className={selectCls} value={categoriaCliente} onChange={e => setCategoriaCliente(e.target.value as CategoriaCliente)}>
              <option value="lead_nuevo">Lead nuevo</option>
              <option value="cliente_activo">Cliente activo</option>
              <option value="cliente_a_reactivar">A reactivar</option>
              <option value="cerrado_no_avanzar">Cerrado — no avanzar</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition border border-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={loading}
            className="flex-1 py-2.5 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-800 transition disabled:opacity-50 font-semibold"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
