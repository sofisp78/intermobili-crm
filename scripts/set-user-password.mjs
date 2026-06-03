/**
 * Uso: node scripts/set-user-password.mjs <USER_UID> <NUEVA_PASSWORD>
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← Project Settings > API > service_role
 *
 * Solo ejecutar localmente. No importar en la app ni deployar.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------- leer .env.local sin dependencias extra ----------
function loadEnvLocal() {
  const envPath = resolve(__dirname, '../.env.local')
  const env = {}
  let content
  try {
    content = readFileSync(envPath, 'utf8')
  } catch {
    console.error('Error: no se pudo leer .env.local en', envPath)
    process.exit(1)
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = val
  }
  return env
}

const env = loadEnvLocal()

// ---------- validar variables de entorno ----------
const SUPABASE_URL     = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL no encontrada en .env.local')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY no encontrada en .env.local')
  console.error('')
  console.error('  Dónde encontrarla:')
  console.error('  Supabase Dashboard → tu proyecto → Project Settings → API')
  console.error('  Copiá el valor de "service_role" (secret) y agregalo a .env.local:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui')
  process.exit(1)
}

// ---------- validar argumentos ----------
const [userId, newPassword] = process.argv.slice(2)

if (!userId) {
  console.error('Error: falta el UID del usuario.')
  console.error('Uso: node scripts/set-user-password.mjs <USER_UID> <NUEVA_PASSWORD>')
  process.exit(1)
}
if (!newPassword) {
  console.error('Error: falta la nueva contraseña.')
  console.error('Uso: node scripts/set-user-password.mjs <USER_UID> <NUEVA_PASSWORD>')
  process.exit(1)
}
if (newPassword.length < 8) {
  console.error(`Error: la contraseña debe tener al menos 8 caracteres (tiene ${newPassword.length}).`)
  process.exit(1)
}

// ---------- ejecutar ----------
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log(`Cambiando contraseña para UID: ${userId} ...`)

const { data, error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword })

if (error) {
  console.error('Error al cambiar contraseña:', error.message)
  process.exit(1)
}

console.log('Contraseña cambiada correctamente.')
console.log('  Email:', data.user.email)
console.log('  UID:  ', data.user.id)
