'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const sb = createClient()

  const login = async () => {
    setLoading(true); setError('')
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError('Email o contraseña incorrectos.'); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50">
      <div className="bg-white rounded-2xl shadow-sm border border-warm-100 w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-medium text-gray-900">Intermobili</h1>
          <p className="text-sm text-gray-400 mt-1">CRM Comercial</p>
        </div>

        {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-sage-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sage-800 transition disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <p className="text-xs text-gray-400 text-center pt-1">
            Si necesitás recuperar tu contraseña, contactá a administración.
          </p>
        </div>
      </div>
    </div>
  )
}
