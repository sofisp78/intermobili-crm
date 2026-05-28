'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'forgot'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [recoverysent, setRecoverySent] = useState(false)
  const router = useRouter()
  const sb = createClient()

  const login = async () => {
    setLoading(true); setError('')
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError('Email o contraseña incorrectos.'); setLoading(false) }
    else router.push('/dashboard')
  }

  const sendRecovery = async () => {
    setError('')
    if (!email.trim()) { setError('Ingresá tu email para continuar.'); return }
    setLoading(true)
    const { error: e } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (e) {
      setError(e.message || 'No se pudo enviar el mail. Intentá de nuevo.')
    } else {
      setRecoverySent(true)
    }
  }

  const switchToForgot = () => {
    setError('')
    setRecoverySent(false)
    setMode('forgot')
  }

  const switchToLogin = () => {
    setError('')
    setRecoverySent(false)
    setMode('login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50">
      <div className="bg-white rounded-2xl shadow-sm border border-warm-100 w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-medium text-gray-900">Intermobili</h1>
          <p className="text-sm text-gray-400 mt-1">CRM Comercial</p>
        </div>

        {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}

        {mode === 'login' && (
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
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={switchToForgot}
                className="text-xs text-gray-400 hover:text-gray-600 transition"
              >
                Olvidé mi contraseña
              </button>
            </div>
          </div>
        )}

        {mode === 'forgot' && !recoverysent && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center mb-1">
              Ingresá tu email y te mandamos un link para cambiar tu contraseña.
            </p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendRecovery()}
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
            />
            <button
              onClick={sendRecovery}
              disabled={loading}
              className="w-full bg-sage-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sage-800 transition disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar mail de recuperación'}
            </button>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={switchToLogin}
                className="text-xs text-gray-400 hover:text-gray-600 transition"
              >
                Volver al login
              </button>
            </div>
          </div>
        )}

        {mode === 'forgot' && recoverysent && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-700">
              Te enviamos un mail para cambiar tu contraseña.
            </p>
            <p className="text-xs text-gray-400">
              Revisá tu bandeja de entrada (y spam).
            </p>
            <button
              type="button"
              onClick={switchToLogin}
              className="w-full bg-sage-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sage-800 transition"
            >
              Volver al login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
