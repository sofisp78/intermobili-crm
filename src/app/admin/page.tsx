'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchMetricas } from '@/lib/queries/clients'
import { useRequireAdmin } from '@/lib/auth/useRequireAdmin'
import type { Profile } from '@/types'

export default function AdminPage() {
  const { isAdmin, loading: checkingRole, error: roleError } = useRequireAdmin()
  const [vendedores, setVendedores] = useState<Profile[]>([])
  const [metricas, setMetricas] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    if (!isAdmin) return

    const init = async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: prof } = await sb.from('profiles').select('*').eq('role', 'vendedor')
      const vs = prof as Profile[] ?? []
      setVendedores(vs)

      const mets: Record<string, any> = {}
      await Promise.all(vs.map(async v => {
        mets[v.id] = await fetchMetricas(v.id)
      }))
      setMetricas(mets)
      setLoading(false)
    }
    init()
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  if (checkingRole) return <div className="text-sm text-gray-400 text-center py-16">Cargando...</div>

  if (roleError) return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <p className="text-sm font-medium text-red-600 mb-2">No se pudo validar el acceso</p>
      <pre className="text-xs bg-red-50 text-red-800 rounded-xl p-4 whitespace-pre-wrap break-all">{roleError}</pre>
    </div>
  )

  if (!isAdmin) return null

  if (loading) return <div className="text-sm text-gray-400 text-center py-16">Cargando...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-medium mb-6">Panel admin</h1>

      <div className="space-y-4">
        {vendedores.map(v => {
          const m = metricas[v.id]
          return (
            <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-medium text-gray-900 mb-3">{v.nombre}</h2>
              {m && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-xl font-medium text-sage-700">{m.total_activos}</p>
                    <p className="text-xs text-gray-400">Activos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-medium text-blue-600">{m.total_leads}</p>
                    <p className="text-xs text-gray-400">Leads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-medium text-amber-600">{m.total_reactivar}</p>
                    <p className="text-xs text-gray-400">A reactivar</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-medium text-red-600">{m.total_vencidos}</p>
                    <p className="text-xs text-gray-400">Vencidos</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {vendedores.length === 0 && (
          <p className="text-sm text-gray-400">No hay vendedores registrados.</p>
        )}
      </div>
    </div>
  )
}
