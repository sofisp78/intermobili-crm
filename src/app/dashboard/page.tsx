'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { actualizarVendedor, fetchClientesDia, fetchVendedores } from '@/lib/queries/clients'
import DayCard from '@/components/dashboard/DayCard'
import QuickUpdateModal from '@/components/dashboard/QuickUpdateModal'
import type { Profile, ClientConUrgencia } from '@/types'
import { LISTA_TIPO_OPTIONS } from '@/lib/labels'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import clsx from 'clsx'

type FiltroRapido = 'pendientes' | 'todos' | 'hoy' | 'vencidos' | 'proximos' | 'sin_fecha'
type OrdenLista = 'fecha' | 'prioridad'
type VistaVendedor = 'mios' | 'sin_asignar'

interface SectionProps {
  titulo: string
  ayuda: string
  count: number
  tone: 'red' | 'amber' | 'gray' | 'green'
  children: React.ReactNode
}

function Section({ titulo, ayuda, count, tone, children }: SectionProps) {
  if (count === 0) return null

  const toneCls = {
    red: 'border-red-300 text-red-700 bg-red-50',
    amber: 'border-amber-300 text-amber-700 bg-amber-50',
    gray: 'border-gray-200 text-gray-700 bg-gray-50',
    green: 'border-sage-200 text-sage-800 bg-sage-50',
  }[tone]

  return (
    <section className="mb-7">
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
          <p className="text-sm text-gray-500">{ayuda}</p>
        </div>
        <span className={clsx('text-sm font-semibold rounded-full px-3 py-1 border', toneCls)}>
          {count}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Counter({ label, value, tone }: { label: string; value: number; tone: 'red' | 'amber' | 'gray' | 'green' }) {
  const cls = {
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    gray: 'bg-white text-gray-700 border-gray-200',
    green: 'bg-sage-50 text-sage-800 border-sage-100',
  }[tone]

  return (
    <div className={clsx('rounded-xl border px-4 py-3')}>
      <p className="text-3xl font-bold leading-none">{value}</p>
      <p className="text-sm mt-1">{label}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vendedores, setVendedores] = useState<{ id: string; nombre: string }[]>([])
  const [vendedorFiltroId, setVendedorFiltroId] = useState('')
  const [listaTipoFiltro, setListaTipoFiltro] = useState('')
  const [vistaVendedor, setVistaVendedor] = useState<VistaVendedor>('mios')
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapido>('pendientes')
  const [ordenLista, setOrdenLista] = useState<OrdenLista>('fecha')
  const [busqueda, setBusqueda] = useState('')
  const [clientes, setClientes] = useState<ClientConUrgencia[]>([])
  const [selected, setSelected] = useState<ClientConUrgencia | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const profileRef = useRef<Profile | null>(null)
  const sb = createClient()

  const cargarDatos = useCallback(async (prof: Profile, vfId: string, ltFiltro?: string) => {
    const isAdmin = prof.role === 'admin'
    const clts = await fetchClientesDia(prof.id, isAdmin, vfId || undefined, ltFiltro || undefined)
    setClientes(clts)
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return

        const { data: p, error: pe } = await sb
          .from('profiles')
          .select('id, nombre, email, role, vendedor_nombre, created_at')
          .eq('id', user.id)
          .single()
        if (pe) throw pe

        profileRef.current = p
        setProfile(p)

        if (p?.role === 'admin') {
          // Paraleliza la carga de clientes y vendedores — son queries independientes
          const [, vds] = await Promise.all([cargarDatos(p, ''), fetchVendedores()])
          setVendedores(vds)
        } else {
          await cargarDatos(p, '')
        }
      } catch (e: any) {
        setError(e?.message ?? JSON.stringify(e))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!profileRef.current) return
    cargarDatos(profileRef.current, vendedorFiltroId, listaTipoFiltro)
  }, [vendedorFiltroId, listaTipoFiltro, cargarDatos])

  const recargar = () => {
    if (profileRef.current) cargarDatos(profileRef.current, vendedorFiltroId, listaTipoFiltro)
  }

  const tomarLead = async (clientId: string) => {
    if (!profileRef.current) return
    const nextFiltro = profileRef.current.role === 'admin' ? '' : vendedorFiltroId
    await actualizarVendedor(clientId, profileRef.current.id)
    if (profileRef.current.role === 'admin') {
      setVendedorFiltroId('')
    } else {
      setVistaVendedor('mios')
    }
    setFiltroRapido('todos')
    await cargarDatos(profileRef.current, nextFiltro)
  }

  const esVendedor = profile?.role !== 'admin'
  const leadsSinAsignar = useMemo(() => clientes.filter(c => !c.vendedor_asignado), [clientes])
  const leadsMios = useMemo(() => clientes.filter(c => c.vendedor_asignado === profile?.id), [clientes, profile?.id])
  const clientesVisibles = useMemo(() => {
    if (!esVendedor) return clientes
    return vistaVendedor === 'sin_asignar' ? leadsSinAsignar : leadsMios
  }, [clientes, esVendedor, leadsMios, leadsSinAsignar, vistaVendedor])

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return clientesVisibles
    return clientesVisibles.filter(c =>
      c.razon_social.toLowerCase().includes(q) ||
      (c.nombre_fantasia?.toLowerCase().includes(q) ?? false) ||
      (c.telefono?.toLowerCase().includes(q) ?? false) ||
      (c.mail?.toLowerCase().includes(q) ?? false) ||
      (c.vendedor_nombre?.toLowerCase().includes(q) ?? false) ||
      (c.localidad?.toLowerCase().includes(q) ?? false) ||
      (c.provincia?.toLowerCase().includes(q) ?? false) ||
      (c.numero_cliente?.toLowerCase().includes(q) ?? false)
    )
  }, [clientesVisibles, busqueda])

  const vencidos = useMemo(() => clientesFiltrados.filter(c => c.urgencia === 'vencido'), [clientesFiltrados])
  const hoy = useMemo(() => clientesFiltrados.filter(c => c.urgencia === 'hoy'), [clientesFiltrados])
  const proximos = useMemo(() => clientesFiltrados.filter(c => c.urgencia === 'proximo'), [clientesFiltrados])
  const sinFecha = useMemo(() => clientesFiltrados.filter(c => c.urgencia === 'sin_fecha'), [clientesFiltrados])
  const pendientes = useMemo(() => [...vencidos, ...hoy], [vencidos, hoy])
  const totalVisibles = clientesFiltrados.length

  const ordenarClientes = useCallback((items: ClientConUrgencia[]) => {
    const prioridadOrden: Record<string, number> = { alta: 0, media: 1, baja: 2 }

    return [...items].sort((a, b) => {
      if (ordenLista === 'prioridad') {
        const prioridadDiff =
          (prioridadOrden[a.prioridad ?? 'baja'] ?? 2) -
          (prioridadOrden[b.prioridad ?? 'baja'] ?? 2)
        if (prioridadDiff !== 0) return prioridadDiff
      }

      const fechaA = a.fecha_proxima_accion ?? '9999-12-31'
      const fechaB = b.fecha_proxima_accion ?? '9999-12-31'
      const fechaDiff = fechaA.localeCompare(fechaB)
      if (fechaDiff !== 0) return fechaDiff

      return a.razon_social.localeCompare(b.razon_social)
    })
  }, [ordenLista])

  const listaPrincipal = useMemo(() => {
    let lista: ClientConUrgencia[]
    switch (filtroRapido) {
      case 'todos': lista = clientesFiltrados; break
      case 'hoy': lista = hoy; break
      case 'vencidos': lista = vencidos; break
      case 'proximos': lista = proximos; break
      case 'sin_fecha': lista = sinFecha; break
      default: lista = pendientes
    }
    return ordenarClientes(lista)
  }, [clientesFiltrados, filtroRapido, hoy, ordenarClientes, pendientes, proximos, sinFecha, vencidos])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando tu lista de trabajo...</div>
  )

  if (error) return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <p className="text-sm font-medium text-red-600 mb-2">Error al cargar el dashboard</p>
      <pre className="text-xs bg-red-50 text-red-800 rounded-xl p-4 whitespace-pre-wrap break-all">{error}</pre>
    </div>
  )

  const filtros: { key: FiltroRapido; label: string; badge: number }[] = [
    { key: 'pendientes', label: 'Para hacer', badge: pendientes.length },
    { key: 'todos', label: 'Todos', badge: totalVisibles },
    { key: 'hoy', label: 'Hoy', badge: hoy.length },
    { key: 'vencidos', label: 'Atrasados', badge: vencidos.length },
    { key: 'proximos', label: 'Próximos', badge: proximos.length },
    { key: 'sin_fecha', label: 'Sin fecha', badge: sinFecha.length },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Lista de llamadas</h1>
          <p className="text-base text-gray-500 mt-1">
            {pendientes.length === 0
              ? vistaVendedor === 'sin_asignar'
                ? 'No hay leads sin asignar pendientes.'
                : `No hay llamadas pendientes, ${profile?.nombre}. Igual podes revisar tu cartera.`
              : `${pendientes.length} contacto${pendientes.length !== 1 ? 's' : ''} para llamar o actualizar.`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            value={listaTipoFiltro}
            onChange={e => setListaTipoFiltro(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
          >
            <option value="">Todas las listas</option>
            {LISTA_TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {profile?.role === 'admin' && (
            <select
              value={vendedorFiltroId}
              onChange={e => setVendedorFiltroId(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
            >
              <option value="">Todos los responsables</option>
              <option value="sin_asignar">Sin asignar</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {esVendedor && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setVistaVendedor('mios')}
            className={clsx(
              'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition',
              vistaVendedor === 'mios'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            )}
          >
            Mis clientes y leads
            <span className={clsx(
              'rounded-full px-2 py-0.5 text-xs',
              vistaVendedor === 'mios' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            )}>
              {leadsMios.length}
            </span>
          </button>
          <button
            onClick={() => setVistaVendedor('sin_asignar')}
            className={clsx(
              'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition',
              vistaVendedor === 'sin_asignar'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300'
            )}
          >
            Sin asignar
            <span className={clsx(
              'rounded-full px-2 py-0.5 text-xs',
              vistaVendedor === 'sin_asignar' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
            )}>
              {leadsSinAsignar.length}
            </span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Counter label="Total en cartera" value={totalVisibles} tone="gray" />
        <Counter label="Para hoy" value={hoy.length} tone="amber" />
        <Counter label="Atrasados" value={vencidos.length} tone={vencidos.length > 0 ? 'red' : 'gray'} />
        <Counter label="Próximos" value={proximos.length} tone="green" />
      </div>

      {/* Buscador */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por cliente, contacto, teléfono, nro. cliente, responsable..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-white"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {vencidos.length > 0 && filtroRapido === 'pendientes' && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-red-800">
            Hay {vencidos.length} lead{vencidos.length !== 1 ? 's' : ''} atrasado{vencidos.length !== 1 ? 's' : ''}. Conviene empezar por esos.
          </p>
          <button onClick={() => setFiltroRapido('vencidos')} className="text-sm font-semibold text-red-700 hover:text-red-900">
            Ver atrasados
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {filtros.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroRapido(f.key)}
              className={clsx(
                'flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition font-semibold border',
                filtroRapido === f.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
              )}
            >
              {f.label}
              <span className={clsx(
                'text-xs rounded-full px-2 py-0.5 font-bold',
                filtroRapido === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              )}>
                {f.badge}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={ordenLista}
            onChange={e => setOrdenLista(e.target.value as OrdenLista)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
          >
            <option value="fecha">Ordenar por fecha</option>
            <option value="prioridad">Ordenar por prioridad</option>
          </select>
          <Link href="/clientes/nuevo" className="text-sm font-semibold bg-sage-600 text-white px-4 py-2 rounded-xl hover:bg-sage-800 transition">
            Nuevo lead
          </Link>
        </div>
      </div>

      {filtroRapido === 'pendientes' ? (
        <>
          <Section titulo="Atrasados" ayuda="Primero llamar o definir proxima fecha." count={vencidos.length} tone="red">
            {ordenarClientes(vencidos).map((c, index) => (
              <DayCard
                key={c.id}
                client={c}
                index={index + 1}
                onUpdate={setSelected}
                onRefresh={recargar}
                onTakeLead={tomarLead}
              />
            ))}
          </Section>

          <Section titulo="Para hoy" ayuda="Contactar y dejar registrado que paso." count={hoy.length} tone="amber">
            {ordenarClientes(hoy).map((c, index) => (
              <DayCard
                key={c.id}
                client={c}
                index={vencidos.length + index + 1}
                onUpdate={setSelected}
                onRefresh={recargar}
                onTakeLead={tomarLead}
              />
            ))}
          </Section>
        </>
      ) : (
        <Section
          titulo={
            filtroRapido === 'todos' ? (vistaVendedor === 'sin_asignar' ? 'Leads sin asignar' : 'Todos mis clientes y leads') :
            filtroRapido === 'hoy' ? 'Para hoy' :
            filtroRapido === 'vencidos' ? 'Atrasados' :
            filtroRapido === 'proximos' ? 'Próximos contactos' :
            'Sin proxima fecha'
          }
          ayuda={
            filtroRapido === 'todos' ? 'Vista completa para revisar la cartera y pensar proximas acciones.' :
            filtroRapido === 'sin_fecha' ? 'Asignar una fecha para que vuelvan a aparecer en la lista de trabajo.' :
            filtroRapido === 'proximos' ? 'Seguimientos futuros ordenados segun tu criterio.' :
            'Contactar y actualizar seguimiento.'
          }
          count={listaPrincipal.length}
          tone={filtroRapido === 'vencidos' ? 'red' : filtroRapido === 'hoy' ? 'amber' : filtroRapido === 'proximos' ? 'green' : 'gray'}
        >
          {listaPrincipal.map((c, index) => (
            <DayCard
              key={c.id}
              client={c}
              index={index + 1}
              onUpdate={setSelected}
              onRefresh={recargar}
              onTakeLead={tomarLead}
            />
          ))}
        </Section>
      )}

      {/* Estado vacío por búsqueda */}
      {busqueda.trim() && totalVisibles === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl px-6 py-12 text-center">
          <p className="text-lg font-semibold text-gray-800">No encontramos leads con esa búsqueda.</p>
          <p className="text-sm text-gray-500 mt-1">Probá con otro nombre, teléfono o responsable.</p>
          <button onClick={() => setBusqueda('')} className="mt-4 text-sm text-sage-700 font-semibold hover:underline">
            Limpiar búsqueda
          </button>
        </div>
      )}

      {/* Estado vacío por filtro (sin búsqueda activa) */}
      {!busqueda.trim() && listaPrincipal.length === 0 && pendientes.length === 0 && filtroRapido === 'pendientes' && (
        <div className="bg-white border border-gray-100 rounded-2xl px-6 py-12 text-center">
          <p className="text-lg font-semibold text-gray-800">No hay llamadas pendientes.</p>
          <p className="text-sm text-gray-500 mt-1">Podes mirar la cartera completa y decidir nuevas acciones.</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            {clientesVisibles.length > 0 && (
              <button onClick={() => setFiltroRapido('todos')} className="text-sm text-sage-700 font-semibold">
                Ver todos
              </button>
            )}
            {sinFecha.length > 0 && (
              <button onClick={() => setFiltroRapido('sin_fecha')} className="text-sm text-sage-700 font-semibold">
                Ver sin fecha
              </button>
            )}
          </div>
        </div>
      )}

      {selected && profile && (
        <QuickUpdateModal
          client={selected}
          userId={profile.id}
          userName={profile.nombre}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); recargar() }}
        />
      )}
    </div>
  )
}
