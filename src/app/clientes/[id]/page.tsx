'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchCliente, fetchVendedores, actualizarVendedor } from '@/lib/queries/clients'
import { LISTA_TIPO_OPTIONS, listaTipoLabel } from '@/lib/labels'
import { fetchHistorial } from '@/lib/queries/updates'
import { createClient } from '@/lib/supabase/client'
import type { Client, ClientUpdate, Profile } from '@/types'
import { CategoriaBadge, EstadoBadge, PotencialDot, PrioridadBadge } from '@/components/ui/Badge'
import QuickUpdateModal from '@/components/dashboard/QuickUpdateModal'
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import clsx from 'clsx'

function calcularUrgencia(fecha: string | null) {
  if (!fecha) return null
  const d = parseISO(fecha)
  if (isPast(d) && !isToday(d)) return 'vencido'
  if (isToday(d)) return 'hoy'
  return 'proximo'
}

function waLink(tel: string | null): string | null {
  if (!tel) return null
  const digits = tel.replace(/\D/g, '')
  if (!digits) return null
  const numero = digits.startsWith('54') ? digits : '54' + (digits.startsWith('0') ? digits.slice(1) : digits)
  return `https://wa.me/${numero}`
}

const urgProxima: Record<string, { bg: string; text: string; badge: string; label: string }> = {
  vencido: { bg: 'bg-red-50 border-red-100',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    label: 'Vencido' },
  hoy:     { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700', label: 'Para hoy' },
  proximo: { bg: 'bg-sage-50 border-sage-100',   text: 'text-sage-700',   badge: 'bg-sage-100 text-sage-700',   label: 'Próximo' },
}

export default function ClientePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [historial, setHistorial] = useState<ClientUpdate[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vendedores, setVendedores] = useState<{ id: string; nombre: string }[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editResponsable, setEditResponsable] = useState(false)
  const [nuevoResponsable, setNuevoResponsable] = useState<string>('')
  const [guardandoResp, setGuardandoResp] = useState(false)
  const [editLista, setEditLista] = useState(false)
  const [nuevoLista, setNuevoLista] = useState<string>('')
  const [guardandoLista, setGuardandoLista] = useState(false)
  const sb = createClient()

  const cargar = async () => {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const [c, h, { data: p }, vds] = await Promise.all([
      fetchCliente(id),
      fetchHistorial(id),
      sb.from('profiles').select('*').eq('id', user.id).single(),
      fetchVendedores(),
    ])
    setClient(c)
    setHistorial(h)
    setProfile(p)
    setVendedores(vds)
    setNuevoResponsable(c.vendedor_asignado ?? '')
    setNuevoLista(c.lista_tipo ?? '')
  }

  useEffect(() => { cargar() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!client) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>
  )

  const urgencia = calcularUrgencia(client.fecha_proxima_accion)
  const urgCfg = urgencia ? urgProxima[urgencia] : null
  const diasSinContacto = client.ultimo_contacto
    ? differenceInDays(new Date(), parseISO(client.ultimo_contacto))
    : null
  const wa = waLink(client.telefono)

  const guardarResponsable = async () => {
    setGuardandoResp(true)
    try {
      await actualizarVendedor(client.id, nuevoResponsable || null)
      setEditResponsable(false)
      cargar()
    } finally {
      setGuardandoResp(false)
    }
  }

  const guardarLista = async () => {
    setGuardandoLista(true)
    try {
      const { createClient: createSb } = await import('@/lib/supabase/client')
      const sb2 = createSb()
      await sb2.from('clients').update({ lista_tipo: nuevoLista || null }).eq('id', client.id)
      setEditLista(false)
      cargar()
    } finally {
      setGuardandoLista(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <button onClick={() => router.back()} className="hover:text-gray-600 transition">← Volver</button>
        <span>/</span>
        <span className="text-gray-600 truncate">{client.razon_social}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{client.razon_social}</h1>
          {client.nombre_fantasia && <p className="text-sm text-gray-400 mt-0.5">{client.nombre_fantasia}</p>}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {client.prioridad && <PrioridadBadge prioridad={client.prioridad} />}
            {client.categoria_cliente && <CategoriaBadge categoria={client.categoria_cliente} />}
            {client.estado && <EstadoBadge estado={client.estado} />}
            {client.potencial && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <PotencialDot potencial={client.potencial} /> Potencial {client.potencial}
              </span>
            )}
            {editLista ? (
              <div className="flex items-center gap-2">
                <select
                  value={nuevoLista}
                  onChange={e => setNuevoLista(e.target.value)}
                  autoFocus
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
                >
                  <option value="">Sin definir</option>
                  {LISTA_TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button
                  onClick={guardarLista}
                  disabled={guardandoLista}
                  className="text-xs bg-sage-600 text-white px-3 py-1 rounded-lg hover:bg-sage-800 transition disabled:opacity-50"
                >
                  {guardandoLista ? '...' : 'Guardar'}
                </button>
                <button onClick={() => setEditLista(false)} className="text-xs text-gray-400 hover:text-gray-600">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditLista(true)}
                className={clsx(
                  'flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border transition hover:opacity-80',
                  client.lista_tipo === 'lista_1' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  client.lista_tipo === 'lista_2' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  'bg-gray-50 text-gray-400 border-gray-200'
                )}
              >
                Lista: {client.lista_tipo ? listaTipoLabel[client.lista_tipo] : 'Sin definir'}
                <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
                </svg>
              </button>
            )}
            {diasSinContacto !== null && (
              <span className={clsx(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                diasSinContacto > 30 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
              )}>
                {diasSinContacto === 0 ? 'Contactado hoy'
                  : diasSinContacto === 1 ? 'Hace 1 día'
                  : `Hace ${diasSinContacto} días`}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex-shrink-0 text-sm bg-sage-600 text-white px-4 py-2 rounded-xl hover:bg-sage-800 transition font-medium"
        >
          Actualizar
        </button>
      </div>

      {/* Próxima acción callout */}
      {client.fecha_proxima_accion && urgCfg && (
        <div className={clsx('rounded-xl border px-4 py-3.5 mb-5 flex items-center justify-between', urgCfg.bg)}>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Próxima acción</p>
            <p className={clsx('text-base font-bold', urgCfg.text)}>
              {format(parseISO(client.fecha_proxima_accion), "EEEE d 'de' MMMM", { locale: es })}
            </p>
          </div>
          <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', urgCfg.badge)}>
            {urgCfg.label}
          </span>
        </div>
      )}

      {/* Contacto rápido */}
      {(wa || client.mail || client.telefono) && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm px-4 py-2 border border-green-200 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
          )}
          {client.mail && (
            <a href={`mailto:${client.mail}`}
              className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200 bg-white text-gray-600 rounded-xl hover:bg-gray-50 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {client.mail}
            </a>
          )}
        </div>
      )}

      {/* Historial de contactos */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800">
            Historial de contactos
            {historial.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">{historial.length} registros</span>
            )}
          </h2>
          <button onClick={() => setShowModal(true)} className="text-xs text-sage-600 hover:text-sage-800 font-medium transition">
            + Registrar contacto
          </button>
        </div>

        {historial.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-5 py-8 text-center">
            <p className="text-sm text-gray-400 mb-2">Aún no hay contactos registrados</p>
            <button onClick={() => setShowModal(true)} className="text-sm text-sage-600 hover:underline font-medium">
              Registrar primer contacto →
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 overflow-hidden">
            {historial.map((u, i) => (
              <div key={u.id} className={clsx('px-5 py-4', i === 0 && 'bg-warm-50/40')}>

                {/* Cabecera */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-6 h-6 rounded-full bg-warm-100 flex items-center justify-center text-xs font-bold text-warm-700 flex-shrink-0">
                      {(u.user?.nombre ?? 'U').slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{u.user?.nombre ?? 'Usuario'}</span>
                    {i === 0 && (
                      <span className="text-xs bg-sage-50 text-sage-700 px-2 py-0.5 rounded-full font-medium">Último</span>
                    )}
                    {/* Canal y resultado como chips */}
                    {u.canal && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{u.canal}</span>
                    )}
                    {u.resultado && (
                      <span className="text-xs bg-sage-50 text-sage-700 px-2 py-0.5 rounded-full font-medium">{u.resultado}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {format(parseISO(u.fecha_contacto), "d 'de' MMM yyyy", { locale: es })}
                  </span>
                </div>

                {/* Cambios */}
                {u.cambios && (
                  <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-2 font-mono">
                    {u.cambios}
                  </div>
                )}

                {/* Nota */}
                {u.resumen && (
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">&quot;{u.resumen}&quot;</p>
                )}

                {/* Estado / prioridad / próxima */}
                <div className="flex items-center gap-2 flex-wrap">
                  {u.estado && <EstadoBadge estado={u.estado} />}
                  {u.prioridad && <PrioridadBadge prioridad={u.prioridad} />}
                  {u.categoria_cliente && <CategoriaBadge categoria={u.categoria_cliente as any} />}
                  {u.fecha_proxima_accion && (
                    <span className="text-xs text-gray-400 ml-auto">
                      → Próximo: {format(parseISO(u.fecha_proxima_accion), "d 'de' MMM", { locale: es })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen actual */}
      {client.resumen && (
        <div className="bg-warm-50 border border-warm-100 rounded-xl px-4 py-3.5 mb-5">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">Resumen actual</p>
          <p className="text-sm text-gray-800 leading-relaxed">{client.resumen}</p>
        </div>
      )}

      {/* Datos del cliente */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos del cliente</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-4">
          {/* Responsable — editable */}
          <div className="col-span-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Responsable</p>
            {editResponsable ? (
              <div className="flex items-center gap-2">
                <select
                  value={nuevoResponsable}
                  onChange={e => setNuevoResponsable(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
                >
                  <option value="">Sin asignar</option>
                  {vendedores.map(v => (
                    <option key={v.id} value={v.id}>{v.nombre}</option>
                  ))}
                </select>
                <button
                  onClick={guardarResponsable}
                  disabled={guardandoResp}
                  className="text-xs bg-sage-600 text-white px-3 py-1.5 rounded-lg hover:bg-sage-800 transition disabled:opacity-50"
                >
                  {guardandoResp ? '...' : 'Guardar'}
                </button>
                <button onClick={() => setEditResponsable(false)} className="text-xs text-gray-400 hover:text-gray-600">
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800">
                  {client.vendedor_nombre ?? <span className="text-amber-600 font-medium">Sin asignar</span>}
                </span>
                <button
                  onClick={() => setEditResponsable(true)}
                  className="text-xs text-gray-400 hover:text-sage-600 transition"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>


          {[
            ['CUIT', client.cuit],
            ['Localidad', [client.localidad, client.provincia].filter(Boolean).join(', ')],
            ['Teléfono', client.telefono],
            ['Tipo de cliente', client.tipo_cliente?.replace(/_/g, ' ')],
            ['Mail', client.mail],
            ['Origen', client.origen],
            ['Última compra', client.fecha_ultima_compra
              ? format(parseISO(client.fecha_ultima_compra), "d 'de' MMM yyyy", { locale: es }) : null],
            ['Alta en sistema', client.fecha_alta_sistema
              ? format(parseISO(client.fecha_alta_sistema), "d 'de' MMM yyyy", { locale: es }) : null],
          ].map(([label, val]) => (
            <div key={label as string}>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm text-gray-800">{val || <span className="text-gray-300">—</span>}</p>
            </div>
          ))}
        </div>
      </div>

      {showModal && profile && (
        <QuickUpdateModal
          client={client}
          userId={profile.id}
          userName={profile.nombre}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); cargar() }}
        />
      )}
    </div>
  )
}
