'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { LISTA_TIPO_OPTIONS, PRIORIDAD_OPTIONS } from '@/lib/labels'
import type { Profile } from '@/types'

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400'
const labelCls = 'text-xs text-gray-500 mb-1 block'

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function NuevoClientePage() {
  const router = useRouter()
  const sb = useMemo(() => createClient(), [])

  const [vendedores, setVendedores] = useState<Pick<Profile, 'id' | 'nombre' | 'vendedor_nombre' | 'role'>[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    razon_social: '',
    contacto: '',
    telefono: '',
    mail: '',
    provincia: '',
    localidad: '',
    vendedor_asignado: '',
    prioridad: 'media',
    lista_tipo: '',
    origen: '',
    resumen: '',
    fecha_proxima_accion: isoDate(addDays(new Date(), 1)),
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single()
      const { data: sellers } = await sb
        .from('profiles')
        .select('id, nombre, vendedor_nombre, role')
        .order('nombre')

      const vendedorList = sellers ?? []
      const shouldAddCurrentSeller =
        !!profile && !vendedorList.some(v => v.id === profile.id)

      setCurrentUser(profile)
      setVendedores(shouldAddCurrentSeller ? [...vendedorList, profile] : vendedorList)

      if (profile?.role === 'vendedor') {
        setForm(f => ({ ...f, vendedor_asignado: profile.id }))
      }
    }

    init()
  }, [sb])

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const guardar = async () => {
    const nombreLead = form.razon_social.trim()
    const mail = form.mail.trim()

    if (!nombreLead) {
      setError('El nombre del lead es obligatorio.')
      return
    }

    if (!form.telefono.trim() && !mail) {
      setError('Carga al menos un telefono o un mail para poder darle seguimiento.')
      return
    }

    if (mail && !mail.includes('@')) {
      setError('Revisa el mail: parece incompleto.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const responsable = form.vendedor_asignado || null
      const payload: Record<string, string | null> = {
        razon_social: nombreLead,
        nombre_fantasia: form.contacto.trim() || null,
        telefono: form.telefono.trim() || null,
        mail: mail || null,
        provincia: form.provincia.trim() || null,
        localidad: form.localidad.trim() || null,
        vendedor_asignado: responsable,
        categoria_cliente: 'lead_nuevo',
        estado: 'nuevo',
        prioridad: form.prioridad || 'media',
        lista_tipo: form.lista_tipo || null,
        origen: form.origen.trim() || null,
        resumen: form.resumen.trim() || null,
        fecha_proxima_accion: form.fecha_proxima_accion || null,
      }

      const { data, error: insertError } = await sb
        .from('clients')
        .insert(payload)
        .select('id, vendedor_asignado')
        .single()

      if (insertError) throw insertError
      if (responsable && data?.vendedor_asignado !== responsable) {
        throw new Error('El lead se creo, pero Supabase no guardo el responsable seleccionado.')
      }

      router.push('/clientes')
    } catch (e: any) {
      setError(e?.message ?? JSON.stringify(e))
      setSaving(false)
    }
  }

  const isSeller = currentUser?.role === 'vendedor'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700 transition mb-2">
            Volver
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Nuevo lead</h1>
          <p className="text-sm text-gray-400 mt-1">Solo los datos necesarios para iniciar seguimiento.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div>
          <label className={labelCls}>Empresa / lead *</label>
          <input
            type="text"
            value={form.razon_social}
            onChange={e => set('razon_social', e.target.value)}
            className={inputCls}
            placeholder="Ej: Hotel Costa Norte"
          />
        </div>

        <div>
          <label className={labelCls}>Persona de contacto</label>
          <input
            type="text"
            value={form.contacto}
            onChange={e => set('contacto', e.target.value)}
            className={inputCls}
            placeholder="Ej: Laura de compras"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Telefono / WhatsApp</label>
            <input
              type="text"
              value={form.telefono}
              onChange={e => set('telefono', e.target.value)}
              className={inputCls}
              placeholder="11-4444-5555"
            />
          </div>

          <div>
            <label className={labelCls}>Mail</label>
            <input
              type="email"
              value={form.mail}
              onChange={e => set('mail', e.target.value)}
              className={inputCls}
              placeholder="contacto@empresa.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Origen</label>
            <input
              type="text"
              value={form.origen}
              onChange={e => set('origen', e.target.value)}
              className={inputCls}
              placeholder="Showroom, Instagram, referido..."
            />
          </div>

          <div>
            <label className={labelCls}>Lista</label>
            <select value={form.lista_tipo} onChange={e => set('lista_tipo', e.target.value)} className={inputCls}>
              <option value="">Sin lista</option>
              {LISTA_TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Responsable</label>
            <select
              value={form.vendedor_asignado}
              onChange={e => set('vendedor_asignado', e.target.value)}
              disabled={isSeller}
              className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-500`}
            >
              <option value="">Sin asignar</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>{v.vendedor_nombre || v.nombre}</option>
              ))}
            </select>
            {isSeller && (
              <p className="text-xs text-gray-400 mt-1">Se asigna automaticamente a tu usuario.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Localidad</label>
            <input
              type="text"
              value={form.localidad}
              onChange={e => set('localidad', e.target.value)}
              className={inputCls}
              placeholder="Quilmes"
            />
          </div>

          <div>
            <label className={labelCls}>Provincia</label>
            <input
              type="text"
              value={form.provincia}
              onChange={e => set('provincia', e.target.value)}
              className={inputCls}
              placeholder="Buenos Aires"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4">
          <div>
            <label className={labelCls}>Prioridad</label>
            <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)} className={inputCls}>
              {PRIORIDAD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Proximo contacto</label>
            <input
              type="date"
              value={form.fecha_proxima_accion}
              onChange={e => set('fecha_proxima_accion', e.target.value)}
              className={inputCls}
            />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {[
                { label: 'Mañana', days: 1 },
                { label: '7 dias', days: 7 },
                { label: '15 dias', days: 15 },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => set('fecha_proxima_accion', isoDate(addDays(new Date(), p.days)))}
                  className="text-xs border border-gray-200 text-gray-500 px-2 py-1 rounded-lg hover:border-sage-300 hover:text-sage-700"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>Nota inicial</label>
          <textarea
            value={form.resumen}
            onChange={e => set('resumen', e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage-400"
            placeholder="Que necesita, que producto le intereso, objeciones, proximo paso..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-xl transition">
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving} className="px-5 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-800 transition disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
