'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export function useRequireAdmin() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const sb = createClient()

    const load = async () => {
      try {
        const { data: { user } } = await sb.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }

        const { data, error: profileError } = await sb
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        if (data?.role !== 'admin') {
          router.replace('/dashboard')
          return
        }

        setProfile(data)
      } catch (e: any) {
        setError(e?.message ?? JSON.stringify(e))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  return {
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
    error,
  }
}
