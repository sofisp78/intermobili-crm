'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from './Sidebar'
import type { Profile } from '@/types'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (pathname === '/login') return
    const sb = createClient()
    const load = async () => {
      try {
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('profiles').select('*').eq('id', user.id).single()
        if (data) setProfile(data)
      } catch {}
    }
    load()
  }, [pathname])

  // Login nunca tiene sidebar
  if (pathname === '/login') return <>{children}</>

  // Para todas las páginas autenticadas: estructura SIEMPRE igual.
  // El sidebar aparece cuando el perfil carga, pero <main> nunca cambia
  // → children nunca se desmontan → no se resetea el estado del dashboard.
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {profile && (
        <Sidebar isAdmin={profile.role === 'admin'} nombre={profile.nombre} />
      )}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
