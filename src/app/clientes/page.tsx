'use client'
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { fetchClientes, fetchVendedores } from '@/lib/queries/clients'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIA_OPTIONS, ESTADO_OPTIONS, LISTA_TIPO_OPTIONS, PRIORIDAD_OPTIONS, TIPO_OPTIONS, listaTipoLabel } from '@/lib/labels'
import type { Client, Profile } from '@/types'
import { CategoriaBadge, EstadoBadge, PrioridadBadge } from '@/components/ui/Badge'
import Link from 'next/link'
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import clsx from 'clsx'

function fechaUrgenciaColor(fecha: string | null) {
  if (!fecha) return 'text-gray-400'
  const d = parseISO(fecha)
  if (isPast(d) && !isToday(d)) return 'text-red-600 font-semibold'
  if (isToday(d)) return 'text-amber-600 font-semibold'
  return 'text-gray-600'
}

function diasSinContactoLabel(fecha: string | null) {
  if (!fecha) return null
  const dias = differenceInDays(new Date(), parseISO(fecha))
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Hace 1 día'
  if (dias > 30) return { texto: `Hace ${dias} días`, rojo: true }
  return `Hace ${dias} días`
}

const SEL_CLS = 'border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400'

// Ancho fijo garantizado por inline style para evitar compresión por table layout
const COL_LISTA_STYLE: React.CSSProperties = { minWidth: 120, width: 120, whiteSpace: 'nowrap' }

function renderListaBadge(listaTipo: string | null | undefined) {
  if (!listaTipo) return <span className="text-xs text-gray-300">—</span>
  const esLista1 = listaTipo === 'lista_1'
  return (
    <span
      style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
      className={clsx(
        'px-3 py-1 rounded-full text-xs font-medium leading-none',
        esLista1 ? 'bg-purple-50 text-purple-700' : 'bg-indigo-50 text-indigo-700'
      )}
    >
      {esLista1 ? 'Lista 1' : 'Lista 2'}
    </span>
  )
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Client[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vendedores, setVendedores] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtros, setFiltros] = useState({
    categoria: '', estado: '', prioridad: '', tipo: '', vendedor: '', listaTipo: '',
  })
  const profileRef = useRef<Profile | null>(null)
  const sb = useMemo(() => createClient(), [])

  // Debounce search: espera 300ms después del último cambio antes de disparar la query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Cargar perfil y vendedores una sola vez
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data: p, error: pe } = await sb.from('profiles').select('id, nombre, email, role, vendedor_nombre, created_at').eq('id', user.id).single()
        if (pe) throw pe
        profileRef.current = p
        setProfile(p)
        // Todos los usuarios pueden filtrar por responsable
        const vds = await fetchVendedores()
        setVendedores(vds)
      } catch (e: any) {
        setError(e?.message ?? JSON.stringify(e))
        setLoading(false)
      }
    }
    init()
  }, [sb])

  // Fetch clientes cuando cambian filtros o el texto de búsqueda (debounced)
  useEffect(() => {
    if (!profile) return
    let cancelled = false
    setLoading(true)
    fetchClientes({ search: debouncedSearch, ...filtros, listaTipo: filtros.listaTipo || undefined })
      .then(data => { if (!cancelled) setClientes(data) })
      .catch((e: any) => { if (!cancelled) setError(e?.message ?? JSON.stringify(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedSearch, filtros, profile])

  const filtrar = (key: string, val: string) => setFiltros(f => ({ ...f, [key]: val }))
  const hayFiltros = search !== '' || Object.values(filtros).some(v => v !== '')
  const limpiar = () => { setSearch(''); setFiltros({ categoria: '', estado: '', prioridad: '', tipo: '', vendedor: '', listaTipo: '' }) }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          {!loading && (
            <p className="text-xs text-gray-400 mt-0.5">
              {clientes.length} {clientes.length === 1 ? 'resultado' : 'resultados'}
              {hayFiltros && ' · con filtros activos'}
            </p>
          )}
        </div>
        <Link
          href="/clientes/nuevo"
          className="flex items-center gap-1.5 text-sm bg-sage-600 text-white px-4 py-2 rounded-xl hover:bg-sage-800 transition font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo lead
        </Link>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por cliente, fantasía, CUIT, mail, teléfono, zona o nro. cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <select className={SEL_CLS} value={filtros.categoria} onChange={e => filtrar('categoria', e.target.value)}>
          <option value="">Categoría</option>
          {CATEGORIA_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select className={SEL_CLS} value={filtros.estado} onChange={e => filtrar('estado', e.target.value)}>
          <option value="">Estado</option>
          {ESTADO_OPTIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>

        <select className={SEL_CLS} value={filtros.prioridad} onChange={e => filtrar('prioridad', e.target.value)}>
          <option value="">Prioridad</option>
          {PRIORIDAD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        <select className={SEL_CLS} value={filtros.tipo} onChange={e => filtrar('tipo', e.target.value)}>
          <option value="">Tipo</option>
          {TIPO_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <select className={SEL_CLS} value={filtros.listaTipo} onChange={e => filtrar('listaTipo', e.target.value)}>
          <option value="">Lista</option>
          {LISTA_TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {vendedores.length > 0 && (
          <select className={SEL_CLS} value={filtros.vendedor} onChange={e => filtrar('vendedor', e.target.value)}>
            <option value="">Responsable</option>
            <option value="sin_asignar">Sin asignar</option>
            {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        )}

        {hayFiltros && (
          <button
            onClick={limpiar}
            className="text-xs text-gray-400 hover:text-gray-700 transition px-2 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando clientes...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Responsable</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Categoría / Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Prioridad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Próx. acción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Último contacto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientes.map(c => (
                <tr key={c.id} className="hover:bg-warm-50/50 transition-colors group">

                  {/* Cliente */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/clientes/${c.id}`} className="font-medium text-gray-900 hover:text-sage-700 transition-colors">
                        {c.razon_social}
                      </Link>
                      {renderListaBadge(c.lista_tipo)}
                      {c.numero_cliente && (
                        <span className="text-xs text-gray-400 font-mono">#{c.numero_cliente}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {c.nombre_fantasia && <span className="text-xs text-gray-500">{c.nombre_fantasia}</span>}
                      {c.localidad && <span className="text-xs text-gray-400">{c.localidad}{c.provincia ? `, ${c.provincia}` : ''}</span>}
                      {c.telefono && <span className="text-xs text-gray-300">{c.telefono}</span>}
                    </div>
                  </td>

                  {/* Responsable */}
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-600">
                      {c.vendedor_nombre ?? <span className="text-gray-300">—</span>}
                    </span>
                  </td>

                  {/* Categoría + Estado */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      {c.categoria_cliente && <CategoriaBadge categoria={c.categoria_cliente} />}
                      {c.estado && <EstadoBadge estado={c.estado} />}
                    </div>
                  </td>

                  {/* Prioridad */}
                  <td className="px-4 py-3.5">
                    <PrioridadBadge prioridad={c.prioridad} />
                  </td>

                  {/* Próxima acción */}
                  <td className="px-4 py-3.5">
                    {c.fecha_proxima_accion ? (
                      <span className={clsx('text-xs', fechaUrgenciaColor(c.fecha_proxima_accion))}>
                        {format(parseISO(c.fecha_proxima_accion), "d 'de' MMM", { locale: es })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  {/* Último contacto */}
                  <td className="px-4 py-3.5">
                    {(() => {
                      const label = diasSinContactoLabel(c.ultimo_contacto)
                      if (!label) return <span className="text-xs text-gray-300">—</span>
                      const esObjeto = typeof label === 'object'
                      return (
                        <span className={`text-xs ${esObjeto ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {esObjeto ? (label as any).texto : label}
                        </span>
                      )
                    })()}
                  </td>

                  {/* Acción */}
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="text-xs text-sage-600 hover:text-sage-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Ver ficha →
                    </Link>
                  </td>
                </tr>
              ))}

              {clientes.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <p className="text-sm font-medium text-gray-500 mb-1">Sin resultados</p>
                    {hayFiltros && (
                      <button onClick={limpiar} className="text-xs text-sage-600 hover:underline mt-1">
                        Limpiar filtros
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
