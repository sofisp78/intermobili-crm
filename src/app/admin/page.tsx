'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { fetchClientesAdmin, fetchUpdatesAdmin, fetchVendedores } from '@/lib/queries/clients'
import { useRequireAdmin } from '@/lib/auth/useRequireAdmin'
import { LISTA_TIPO_OPTIONS } from '@/lib/labels'
import { subDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import clsx from 'clsx'

type ClienteAdmin = Awaited<ReturnType<typeof fetchClientesAdmin>>[number]
type UpdateAdmin  = Awaited<ReturnType<typeof fetchUpdatesAdmin>>[number]

function isoDate(d: Date) { return d.toISOString().split('T')[0] }

function BarChart({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
  if (total === 0) return <p className="text-xs text-gray-400 py-2">Sin datos</p>
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-28 shrink-0 truncate">{item.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={clsx('h-2 rounded-full transition-all', item.color)}
              style={{ width: `${Math.round((item.value / total) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-8 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub, tone = 'gray', loading = false }: {
  label: string; value: number | string; sub?: string; loading?: boolean;
  tone?: 'gray' | 'red' | 'amber' | 'green' | 'blue' | 'purple'
}) {
  const cls = {
    gray:   'bg-white border-gray-100 text-gray-900',
    red:    'bg-red-50 border-red-100 text-red-800',
    amber:  'bg-amber-50 border-amber-100 text-amber-800',
    green:  'bg-sage-50 border-sage-100 text-sage-800',
    blue:   'bg-blue-50 border-blue-100 text-blue-800',
    purple: 'bg-purple-50 border-purple-100 text-purple-800',
  }[tone]

  return (
    <div className={clsx('rounded-2xl border p-4', cls)}>
      {loading
        ? <div className="h-8 w-12 bg-current opacity-10 rounded animate-pulse mb-1" />
        : <p className="text-3xl font-bold leading-none">{value}</p>
      }
      <p className="text-sm font-medium mt-1">{label}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

const SEL = 'border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400'

export default function AdminPage() {
  const { isAdmin, loading: checkingRole, error: roleError } = useRequireAdmin()

  const [clientes, setClientes] = useState<ClienteAdmin[]>([])
  const [updates, setUpdates]   = useState<UpdateAdmin[]>([])
  const [vendedores, setVendedores] = useState<{ id: string; nombre: string }[]>([])

  const [loadingClientes, setLoadingClientes] = useState(true)
  const [loadingUpdates,  setLoadingUpdates]  = useState(true)
  const [errorClientes,   setErrorClientes]   = useState<string | null>(null)

  const hoy = isoDate(new Date())
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [filtroLista,    setFiltroLista]    = useState('')
  const [filtroDesde, setFiltroDesde] = useState(isoDate(subDays(new Date(), 30)))
  const [filtroHasta, setFiltroHasta] = useState(hoy)

  // Vendedores: carga una sola vez
  useEffect(() => {
    if (!isAdmin) return
    fetchVendedores().then(setVendedores)
  }, [isAdmin])

  // Clientes: recarga solo cuando cambia vendedor o lista
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    setLoadingClientes(true)
    setErrorClientes(null)
    fetchClientesAdmin({
      vendedor:  filtroVendedor || undefined,
      listaTipo: filtroLista    || undefined,
    }).then(cs => { if (!cancelled) { setClientes(cs); setErrorClientes(null) } })
      .catch((e: any) => { if (!cancelled) { setClientes([]); setErrorClientes(e?.message ?? 'Error al cargar la cartera') } })
      .finally(() => { if (!cancelled) setLoadingClientes(false) })
    return () => { cancelled = true }
  }, [isAdmin, filtroVendedor, filtroLista])

  // Updates: recarga solo cuando cambia el rango de fechas
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    setLoadingUpdates(true)
    fetchUpdatesAdmin({ desde: filtroDesde, hasta: filtroHasta })
      .then(us => { if (!cancelled) setUpdates(us) })
      .catch(() => { if (!cancelled) setUpdates([]) })
      .finally(() => { if (!cancelled) setLoadingUpdates(false) })
    return () => { cancelled = true }
  }, [isAdmin, filtroDesde, filtroHasta])

  // Métricas: pasada única sobre cada array
  const metricas = useMemo(() => {
    const hace7 = isoDate(subDays(new Date(), 7))

    // Acumuladores para clientes (una sola pasada)
    let totalClientes = 0, leads = 0, activos = 0, reactivar = 0, cerrados = 0
    let sinAsignar = 0, vencidos = 0, paraHoy = 0, sinContacto = 0
    let prioridadAlta = 0, prioridadMedia = 0, prioridadBaja = 0
    let estadoNuevo = 0, estadoEnCurso = 0, estadoEsperando = 0, estadoCerrado = 0
    let lista1 = 0, lista2 = 0, sinLista = 0

    type VRow = {
      id: string; nombre: string; leads: number; activos: number; reactivar: number
      vencidos: number; sinContacto: number; total: number
      contactosPeriodo: number; leadsActivadosPeriodo: number
    }
    const vendedorMap = new Map<string, VRow>()
    const getVRow = (key: string, nombre: string): VRow => {
      if (!vendedorMap.has(key)) {
        vendedorMap.set(key, {
          id: key, nombre, leads: 0, activos: 0, reactivar: 0,
          vencidos: 0, sinContacto: 0, total: 0,
          contactosPeriodo: 0, leadsActivadosPeriodo: 0,
        })
      }
      return vendedorMap.get(key)!
    }

    for (const c of clientes) {
      totalClientes++
      const v = getVRow(c.vendedor_asignado ?? 'sin_asignar', c.vendedor_asignado ? (c.vendedor_nombre ?? 'Vendedor') : 'Sin asignar')
      v.total++

      switch (c.categoria_cliente) {
        case 'lead_nuevo':          leads++;     v.leads++;    break
        case 'cliente_activo':      activos++;   v.activos++;  break
        case 'cliente_a_reactivar': reactivar++; v.reactivar++;break
        case 'cerrado_no_avanzar':  cerrados++;                break
      }

      if (!c.vendedor_asignado)           { sinAsignar++ }
      if (c.urgencia === 'vencido')       { vencidos++;  v.vencidos++ }
      if (c.urgencia === 'hoy')             paraHoy++
      if (!c.ultimo_contacto)             { sinContacto++; v.sinContacto++ }

      switch (c.prioridad) {
        case 'alta':  prioridadAlta++;  break
        case 'media': prioridadMedia++; break
        case 'baja':  prioridadBaja++;  break
      }
      switch (c.estado) {
        case 'nuevo':      estadoNuevo++;      break
        case 'en_curso':   estadoEnCurso++;    break
        case 'esperando':  estadoEsperando++;  break
        case 'cerrado':    estadoCerrado++;    break
      }
      switch (c.lista_tipo) {
        case 'lista_1': lista1++;   break
        case 'lista_2': lista2++;   break
        default:        sinLista++; break
      }
    }

    // Acumuladores para updates (una sola pasada)
    let contactosPeriodo = 0, contactos7dias = 0, leadsActivados = 0
    for (const u of updates) {
      contactosPeriodo++
      if (u.fecha_contacto >= hace7) contactos7dias++
      if (u.categoria_anterior === 'lead_nuevo' && u.categoria_nueva === 'cliente_activo') leadsActivados++

      const row = vendedorMap.get(u.user_id)
      if (row) {
        row.contactosPeriodo++
        if (u.categoria_anterior === 'lead_nuevo' && u.categoria_nueva === 'cliente_activo') {
          row.leadsActivadosPeriodo++
        }
      }
    }

    const porVendedor = Array.from(vendedorMap.values())
      .filter(v => v.total > 0 || v.contactosPeriodo > 0)
      .sort((a, b) => b.total - a.total)

    return {
      totalClientes, leads, activos, reactivar, cerrados,
      sinAsignar, vencidos, paraHoy, sinContacto,
      contactosPeriodo, contactos7dias, leadsActivados,
      porVendedor,
      porCategoria: [
        { label: 'Lead nuevo',     value: leads,     color: 'bg-blue-400' },
        { label: 'Cliente activo', value: activos,   color: 'bg-sage-500' },
        { label: 'A reactivar',    value: reactivar, color: 'bg-amber-400' },
        { label: 'Cerrado',        value: cerrados,  color: 'bg-gray-300' },
      ],
      porPrioridad: [
        { label: 'Alta',  value: prioridadAlta,  color: 'bg-red-400' },
        { label: 'Media', value: prioridadMedia, color: 'bg-amber-400' },
        { label: 'Baja',  value: prioridadBaja,  color: 'bg-gray-300' },
      ],
      porEstado: [
        { label: 'Nuevo',     value: estadoNuevo,     color: 'bg-blue-300' },
        { label: 'En curso',  value: estadoEnCurso,   color: 'bg-sage-400' },
        { label: 'Esperando', value: estadoEsperando, color: 'bg-amber-300' },
        { label: 'Cerrado',   value: estadoCerrado,   color: 'bg-gray-300' },
      ],
      porLista: [
        { label: 'Lista 1',  value: lista1,   color: 'bg-purple-400' },
        { label: 'Lista 2',  value: lista2,   color: 'bg-indigo-400' },
        { label: 'Sin lista', value: sinLista, color: 'bg-gray-200' },
      ],
    }
  }, [clientes, updates])

  if (checkingRole) return <div className="text-sm text-gray-400 text-center py-16">Verificando acceso...</div>
  if (roleError) return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <p className="text-sm font-medium text-red-600 mb-2">No se pudo validar el acceso</p>
      <pre className="text-xs bg-red-50 text-red-800 rounded-xl p-4 whitespace-pre-wrap break-all">{roleError}</pre>
    </div>
  )
  if (!isAdmin) return null

  const lc = loadingClientes
  const lu = loadingUpdates

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard comercial</h1>
        <p className="text-sm text-gray-400 mt-1">Visión completa de la actividad del equipo.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Filtros</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Desde</label>
            <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className={SEL} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Hasta</label>
            <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className={SEL} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Vendedor</label>
            <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)} className={SEL}>
              <option value="">Todos</option>
              <option value="sin_asignar">Sin asignar</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Lista</label>
            <select value={filtroLista} onChange={e => setFiltroLista(e.target.value)} className={SEL}>
              <option value="">Todas</option>
              {LISTA_TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Hoy',    desde: hoy,                              hasta: hoy },
              { label: '7 días', desde: isoDate(subDays(new Date(), 7)),  hasta: hoy },
              { label: '30 días',desde: isoDate(subDays(new Date(), 30)), hasta: hoy },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => { setFiltroDesde(p.desde); setFiltroHasta(p.hasta) }}
                className={clsx(
                  'text-xs px-3 py-2 rounded-xl border transition',
                  filtroDesde === p.desde && filtroHasta === p.hasta
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorClientes && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <span className="font-semibold">Error al cargar la cartera: </span>{errorClientes}
        </div>
      )}

      {/* Cards resumen — cartera (dependen de clientes) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <StatCard label="Total en cartera"  value={metricas.totalClientes} loading={lc} tone="gray" />
        <StatCard label="Sin asignar"       value={metricas.sinAsignar}    loading={lc} tone={metricas.sinAsignar > 0 ? 'amber' : 'gray'} />
        <StatCard label="Vencidos"          value={metricas.vencidos}      loading={lc} tone={metricas.vencidos > 0 ? 'red' : 'gray'} />
        <StatCard label="Para hoy"          value={metricas.paraHoy}       loading={lc} tone="amber" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Sin contacto"      value={metricas.sinContacto}   loading={lc} tone={metricas.sinContacto > 0 ? 'amber' : 'gray'} />
        <StatCard label="Leads nuevos"      value={metricas.leads}         loading={lc} tone="blue" />
        <StatCard label="Clientes activos"  value={metricas.activos}       loading={lc} tone="green" />
        <StatCard label="A reactivar"       value={metricas.reactivar}     loading={lc} tone="amber" />
      </div>

      {/* Cards actividad — dependen de updates */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <StatCard
          label="Contactos en el período"
          value={metricas.contactosPeriodo}
          loading={lu}
          sub={`${filtroDesde} → ${filtroHasta}`}
          tone="blue"
        />
        <StatCard
          label="Contactos últimos 7 días"
          value={metricas.contactos7dias}
          loading={lu}
          tone="green"
        />
        <StatCard
          label="Leads activados en período"
          value={metricas.leadsActivados}
          loading={lu}
          sub="lead_nuevo → cliente_activo"
          tone="purple"
        />
      </div>

      {/* Distribuciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: 'Por categoría', items: metricas.porCategoria },
          { title: 'Por prioridad', items: metricas.porPrioridad },
          { title: 'Por estado',    items: metricas.porEstado    },
          { title: 'Por lista',     items: metricas.porLista     },
        ].map(({ title, items }) => (
          <div key={title} className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</p>
            {lc
              ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-2 bg-gray-100 rounded-full animate-pulse" />)}</div>
              : <BarChart items={items} total={metricas.totalClientes} />
            }
          </div>
        ))}
      </div>

      {/* Tabla por vendedor */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-8">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comparativa por vendedor</p>
          <p className="text-xs text-gray-400">
            {filtroDesde !== filtroHasta
              ? `${format(parseISO(filtroDesde), "d MMM", { locale: es })} → ${format(parseISO(filtroHasta), "d MMM", { locale: es })}`
              : format(parseISO(filtroDesde), "d 'de' MMMM", { locale: es })}
          </p>
        </div>

        {lc && lu ? (
          <div className="py-12 text-center text-sm text-gray-400 animate-pulse">Cargando datos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-50 border-b border-gray-100">
                <tr>
                  <th className="text-left  px-4 py-3 text-xs font-semibold text-gray-500">Vendedor</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-blue-500">Leads</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-sage-600">Activos</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-amber-500">Reactivar</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-red-500">Vencidos</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Sin contacto</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-blue-500">Contactos (período)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-purple-500">Activados (período)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-sage-600">Conversión %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {metricas.porVendedor.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-xs text-gray-400">
                      No hay datos para los filtros seleccionados.
                    </td>
                  </tr>
                )}
                {metricas.porVendedor.map(v => {
                  const conversion = v.total > 0 ? Math.round((v.activos / v.total) * 100) : 0
                  return (
                    <tr key={v.id} className="hover:bg-warm-50/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {v.nombre}
                        {v.id === 'sin_asignar' && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">sin asignar</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">{v.total}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{v.leads}</td>
                      <td className="px-4 py-3 text-right text-sage-700">{v.activos}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{v.reactivar}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={v.vencidos > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>{v.vencidos}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={v.sinContacto > 0 ? 'text-amber-600' : 'text-gray-400'}>{v.sinContacto}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600 font-semibold">
                        {lu ? <span className="text-gray-300">...</span> : v.contactosPeriodo}
                      </td>
                      <td className="px-4 py-3 text-right text-purple-600 font-semibold">
                        {lu ? <span className="text-gray-300">...</span> : v.leadsActivadosPeriodo}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={clsx(
                          'text-xs font-bold px-2 py-1 rounded-full',
                          conversion >= 50 ? 'bg-sage-50 text-sage-700' :
                          conversion >= 25 ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        )}>
                          {lc ? '…' : `${conversion}%`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
