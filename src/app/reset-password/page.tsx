'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [ready, setReady]         = useState(false)
  const router = useRouter()
  const sb = createClient()

  useEffect(() => {
    // PASSWORD_RECOVERY se dispara cuando el usuario llega desde el link de Supabase
    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Si hay sesión activa (ej: recarga de página tras haber llegado por el link)
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async () => {
    setError('')
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    const { error: e } = await sb.auth.updateUser({ password })
    setLoading(false)
    if (e) {
      const msg = e.message.toLowerCase()
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('flow'))
        setError('El link de recuperación expiró o es inválido. Pedí uno nuevo.')
      else if (msg.includes('weak') || msg.includes('password'))
        setError('La contraseña es demasiado débil. Usá al menos 8 caracteres.')
      else if (msg.includes('not authenticated') || msg.includes('session'))
        setError('No hay sesión activa. El link puede haber expirado.')
      else
        setError(e.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="bg-white rounded-2xl shadow-sm border border-warm-100 w-full max-w-sm p-8 text-center">
          <h1 className="text-xl font-medium text-gray-900 mb-2">Contraseña actualizada</h1>
          <p className="text-sm text-gray-400 mb-6">Tu contraseña fue cambiada correctamente.</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-sage-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sage-800 transition"
          >
            Ir al login
          </button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <p className="text-sm text-gray-400">Verificando link de recuperación...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50">
      <div className="bg-white rounded-2xl shadow-sm border border-warm-100 w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-medium text-gray-900">Cambiar contraseña</h1>
          <p className="text-sm text-gray-400 mt-1">Intermobili CRM</p>
        </div>
        {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
          <input
            type="password"
            placeholder="Repetir contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && guardar()}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
          <button
            onClick={guardar}
            disabled={loading}
            className="w-full bg-sage-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sage-800 transition disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </div>
      </div>
    </div>
  )
}
