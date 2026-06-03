'use client'
import { useEffect, useState } from 'react'
import { fetchEtiquetas, crearEtiqueta, actualizarEtiqueta } from '@/lib/queries/etiquetas'
import type { Etiqueta } from '@/types'
import clsx from 'clsx'

const COLORES_PRESET = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981',
  '#3B82F6', '#8B5CF6', '#EC4899', '#F97316',
]

const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white'

function EtiquetaChip({ nombre, color }: { nombre: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{
        backgroundColor: color + '20',
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {nombre}
    </span>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {COLORES_PRESET.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={clsx(
            'w-5 h-5 rounded-full transition border-2 flex-shrink-0',
            value === c ? 'border-gray-700 scale-110' : 'border-transparent hover:scale-105'
          )}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
        title="Color personalizado"
      />
    </div>
  )
}

export default function EtiquetasAdmin() {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([])
  const [loading, setLoading] = useState(true)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoColor, setNuevoColor] = useState(COLORES_PRESET[0])
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState<string | null>(null)

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editColor, setEditColor] = useState('')
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [errorEdit, setErrorEdit] = useState<string | null>(null)

  const cargar = async () => {
    setLoading(true)
    try { setEtiquetas(await fetchEtiquetas()) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const crear = async () => {
    const nombre = nuevoNombre.trim()
    if (!nombre) { setErrorCrear('El nombre es obligatorio.'); return }
    if (etiquetas.some(e => e.nombre.toLowerCase() === nombre.toLowerCase())) {
      setErrorCrear('Ya existe una etiqueta con ese nombre.'); return
    }
    setCreando(true)
    setErrorCrear(null)
    try {
      await crearEtiqueta(nombre, nuevoColor)
      setNuevoNombre('')
      setNuevoColor(COLORES_PRESET[0])
      await cargar()
    } catch (e: any) {
      setErrorCrear(e?.message ?? 'Error al crear.')
    } finally {
      setCreando(false)
    }
  }

  const iniciarEdicion = (et: Etiqueta) => {
    setEditandoId(et.id)
    setEditNombre(et.nombre)
    setEditColor(et.color)
    setErrorEdit(null)
  }

  const guardarEdicion = async (id: string) => {
    const nombre = editNombre.trim()
    if (!nombre) { setErrorEdit('El nombre es obligatorio.'); return }
    if (etiquetas.some(e => e.id !== id && e.nombre.toLowerCase() === nombre.toLowerCase())) {
      setErrorEdit('Ya existe una etiqueta con ese nombre.'); return
    }
    setGuardandoId(id)
    try {
      await actualizarEtiqueta(id, { nombre, color: editColor })
      setEditandoId(null)
      await cargar()
    } finally {
      setGuardandoId(null)
    }
  }

  const toggleActiva = async (et: Etiqueta) => {
    const msg = et.activa
      ? `¿Desactivar la etiqueta "${et.nombre}"?\n\nSeguirá visible en clientes que ya la tienen asignada, pero no aparecerá para nuevas asignaciones.`
      : `¿Reactivar la etiqueta "${et.nombre}"?`
    if (!confirm(msg)) return
    setGuardandoId(et.id)
    try {
      await actualizarEtiqueta(et.id, { activa: !et.activa })
      await cargar()
    } finally {
      setGuardandoId(null)
    }
  }

  const activas   = etiquetas.filter(e => e.activa)
  const inactivas = etiquetas.filter(e => !e.activa)

  return (
    <div>
      {/* ── Formulario nueva etiqueta ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Nueva etiqueta</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
            <input
              type="text"
              value={nuevoNombre}
              onChange={e => { setNuevoNombre(e.target.value); setErrorCrear(null) }}
              onKeyDown={e => e.key === 'Enter' && crear()}
              placeholder="Ej: VIP, Proyecto grande, Referido..."
              className={clsx(inputCls, 'w-full')}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Color</label>
            <ColorPicker value={nuevoColor} onChange={setNuevoColor} />
          </div>
          <div className="flex items-center gap-3">
            {nuevoNombre.trim() && (
              <EtiquetaChip nombre={nuevoNombre.trim()} color={nuevoColor} />
            )}
            <button
              onClick={crear}
              disabled={creando}
              className="text-sm bg-sage-600 text-white px-4 py-2 rounded-xl hover:bg-sage-800 transition disabled:opacity-50 font-medium"
            >
              {creando ? 'Creando...' : 'Crear etiqueta'}
            </button>
          </div>
        </div>
        {errorCrear && <p className="text-xs text-red-600 mt-2">{errorCrear}</p>}
      </div>

      {/* ── Listado ── */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400 animate-pulse">Cargando...</div>
      ) : etiquetas.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Todavía no hay etiquetas. Creá la primera arriba.
        </p>
      ) : (
        <div className="space-y-3">

          {/* Activas */}
          {activas.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Activas — {activas.length}
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {activas.map(et => (
                  <div key={et.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
                    {editandoId === et.id ? (
                      <>
                        <div className="flex-1 min-w-[140px]">
                          <input
                            type="text"
                            value={editNombre}
                            onChange={e => { setEditNombre(e.target.value); setErrorEdit(null) }}
                            onKeyDown={e => e.key === 'Enter' && guardarEdicion(et.id)}
                            autoFocus
                            className={clsx(inputCls, 'w-full')}
                          />
                          {errorEdit && <p className="text-xs text-red-600 mt-1">{errorEdit}</p>}
                        </div>
                        <ColorPicker value={editColor} onChange={setEditColor} />
                        {editNombre.trim() && (
                          <EtiquetaChip nombre={editNombre.trim()} color={editColor} />
                        )}
                        <button
                          onClick={() => guardarEdicion(et.id)}
                          disabled={guardandoId === et.id}
                          className="text-xs bg-sage-600 text-white px-3 py-1.5 rounded-lg hover:bg-sage-800 transition disabled:opacity-50 font-medium"
                        >
                          {guardandoId === et.id ? '...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => setEditandoId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <EtiquetaChip nombre={et.nombre} color={et.color} />
                        <span className="text-xs text-gray-400 font-mono">{et.color}</span>
                        <div className="ml-auto flex items-center gap-3">
                          <button
                            onClick={() => iniciarEdicion(et)}
                            disabled={!!guardandoId}
                            className="text-xs text-gray-400 hover:text-sage-600 transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleActiva(et)}
                            disabled={!!guardandoId}
                            className="text-xs text-gray-400 hover:text-red-500 transition"
                          >
                            Desactivar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactivas */}
          {inactivas.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Inactivas — {inactivas.length}
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {inactivas.map(et => (
                  <div key={et.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap opacity-60">
                    <EtiquetaChip nombre={et.nombre} color={et.color} />
                    <span className="text-xs text-gray-400 font-mono">{et.color}</span>
                    <div className="ml-auto">
                      <button
                        onClick={() => toggleActiva(et)}
                        disabled={!!guardandoId}
                        className="text-xs text-gray-400 hover:text-sage-600 transition"
                      >
                        Reactivar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
