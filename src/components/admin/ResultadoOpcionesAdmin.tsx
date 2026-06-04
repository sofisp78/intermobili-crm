'use client'
import { useEffect, useState } from 'react'
import { fetchResultadoOpciones, crearOpcionResultado, actualizarOpcionResultado } from '@/lib/queries/resultado_opciones'
import type { OpcionResultado } from '@/types'
import clsx from 'clsx'

const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white'

export default function ResultadoOpcionesAdmin() {
  const [opciones, setOpciones] = useState<OpcionResultado[]>([])
  const [loading, setLoading] = useState(true)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState<string | null>(null)

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  const [errorEdit, setErrorEdit] = useState<string | null>(null)

  const cargar = async () => {
    setLoading(true)
    try { setOpciones(await fetchResultadoOpciones()) }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const crear = async () => {
    const nombre = nuevoNombre.trim()
    if (!nombre) { setErrorCrear('El nombre es obligatorio.'); return }
    if (opciones.some(o => o.nombre.toLowerCase() === nombre.toLowerCase())) {
      setErrorCrear('Ya existe una opción con ese nombre.'); return
    }
    setCreando(true)
    setErrorCrear(null)
    try {
      const maxOrden = opciones.length > 0 ? Math.max(...opciones.map(o => o.orden)) : 0
      await crearOpcionResultado(nombre, maxOrden + 1)
      setNuevoNombre('')
      await cargar()
    } catch (e: any) {
      setErrorCrear(e?.message ?? 'Error al crear.')
    } finally {
      setCreando(false)
    }
  }

  const iniciarEdicion = (op: OpcionResultado) => {
    setEditandoId(op.id)
    setEditNombre(op.nombre)
    setErrorEdit(null)
  }

  const guardarEdicion = async (id: string) => {
    const nombre = editNombre.trim()
    if (!nombre) { setErrorEdit('El nombre es obligatorio.'); return }
    if (opciones.some(o => o.id !== id && o.nombre.toLowerCase() === nombre.toLowerCase())) {
      setErrorEdit('Ya existe una opción con ese nombre.'); return
    }
    setGuardandoId(id)
    try {
      await actualizarOpcionResultado(id, { nombre })
      setEditandoId(null)
      await cargar()
    } catch (e: any) {
      setErrorEdit(e?.message ?? 'Error al guardar.')
    } finally {
      setGuardandoId(null)
    }
  }

  const toggleActiva = async (op: OpcionResultado) => {
    const msg = op.activa
      ? `¿Desactivar "${op.nombre}"? No aparecerá en el modal de contacto.`
      : `¿Reactivar "${op.nombre}"?`
    if (!confirm(msg)) return
    setGuardandoId(op.id)
    setErrorEdit(null)
    try {
      await actualizarOpcionResultado(op.id, { activa: !op.activa })
      await cargar()
    } catch (e: any) {
      setErrorEdit(e?.message ?? 'Error al actualizar.')
    } finally {
      setGuardandoId(null)
    }
  }

  const moverOpcion = async (id: string, dir: 'arriba' | 'abajo') => {
    const activas = opciones.filter(o => o.activa)
    const idx = activas.findIndex(o => o.id === id)
    if (idx === -1) return
    const swap = dir === 'arriba' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= activas.length) return
    setGuardandoId(id)
    setErrorEdit(null)
    try {
      const a = activas[idx]
      const b = activas[swap]
      await Promise.all([
        actualizarOpcionResultado(a.id, { orden: b.orden }),
        actualizarOpcionResultado(b.id, { orden: a.orden }),
      ])
      await cargar()
    } catch (e: any) {
      setErrorEdit(e?.message ?? 'Error al reordenar.')
    } finally {
      setGuardandoId(null)
    }
  }

  const activas   = opciones.filter(o => o.activa)
  const inactivas = opciones.filter(o => !o.activa)

  return (
    <div>
      {/* Formulario nueva opción */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Nueva opción</p>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
            <input
              type="text"
              value={nuevoNombre}
              onChange={e => { setNuevoNombre(e.target.value); setErrorCrear(null) }}
              onKeyDown={e => e.key === 'Enter' && crear()}
              placeholder="Ej: Envió muestras, Espera financiación..."
              className={clsx(inputCls, 'w-full')}
            />
          </div>
          <button
            onClick={crear}
            disabled={creando}
            className="text-sm bg-sage-600 text-white px-4 py-2 rounded-xl hover:bg-sage-800 transition disabled:opacity-50 font-medium"
          >
            {creando ? 'Agregando...' : 'Agregar opción'}
          </button>
        </div>
        {errorCrear && <p className="text-xs text-red-600 mt-2">{errorCrear}</p>}
      </div>

      {/* Listado */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400 animate-pulse">Cargando...</div>
      ) : opciones.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No hay opciones todavía.</p>
      ) : (
        <div className="space-y-3">
          {errorEdit && editandoId === null && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {errorEdit}
            </p>
          )}

          {/* Activas */}
          {activas.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Activas — se muestran en el modal · {activas.length}
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {activas.map((op, idx) => (
                  <div key={op.id} className="px-4 py-3 flex items-center gap-3">

                    {/* Flechas de orden */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moverOpcion(op.id, 'arriba')}
                        disabled={idx === 0 || !!guardandoId}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition"
                        title="Subir"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moverOpcion(op.id, 'abajo')}
                        disabled={idx === activas.length - 1 || !!guardandoId}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition"
                        title="Bajar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>

                    {editandoId === op.id ? (
                      <>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={editNombre}
                            onChange={e => { setEditNombre(e.target.value); setErrorEdit(null) }}
                            onKeyDown={e => e.key === 'Enter' && guardarEdicion(op.id)}
                            autoFocus
                            className={clsx(inputCls, 'w-full')}
                          />
                          {errorEdit && <p className="text-xs text-red-600 mt-1">{errorEdit}</p>}
                        </div>
                        <button
                          onClick={() => guardarEdicion(op.id)}
                          disabled={guardandoId === op.id}
                          className="text-xs bg-sage-600 text-white px-3 py-1.5 rounded-lg hover:bg-sage-800 transition disabled:opacity-50 font-medium flex-shrink-0"
                        >
                          {guardandoId === op.id ? '...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => setEditandoId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-800 flex-1">{op.nombre}</span>
                        <div className="flex items-center gap-3 ml-auto flex-shrink-0">
                          <button
                            onClick={() => iniciarEdicion(op)}
                            disabled={!!guardandoId}
                            className="text-xs text-gray-400 hover:text-sage-600 transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleActiva(op)}
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
                  Inactivas — no aparecen en el modal · {inactivas.length}
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {inactivas.map(op => (
                  <div key={op.id} className="px-4 py-3 flex items-center gap-3 opacity-60">
                    <span className="text-sm text-gray-600 flex-1">{op.nombre}</span>
                    <button
                      onClick={() => toggleActiva(op)}
                      disabled={!!guardandoId}
                      className="text-xs text-gray-400 hover:text-sage-600 transition ml-auto flex-shrink-0"
                    >
                      Reactivar
                    </button>
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
