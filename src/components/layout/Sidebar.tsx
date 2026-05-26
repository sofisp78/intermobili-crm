'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

function IconCalendar() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const links = [
  { href: '/dashboard', label: 'Mi día',         icon: IconCalendar },
  { href: '/clientes',  label: 'Leads',           icon: IconUsers },
  { href: '/admin',     label: 'Estadísticas',    icon: IconChart,  adminOnly: true },
  { href: '/importar',  label: 'Importar CSV',    icon: IconUpload, adminOnly: true },
]

interface Props { isAdmin: boolean; nombre: string }

export default function Sidebar({ isAdmin, nombre }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const sb = createClient()
  const [open, setOpen] = useState(false)

  // Cerrar el drawer al cambiar de ruta
  useEffect(() => { setOpen(false) }, [pathname])

  const logout = async () => {
    await sb.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900 tracking-tight">Intermobili</p>
        <p className="text-xs text-gray-400 mt-0.5">CRM Comercial</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {links
          .filter(l => !l.adminOnly || isAdmin)
          .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all',
                isActive(href)
                  ? 'bg-sage-50 text-sage-800 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              )}
            >
              <Icon />
              {label}
            </Link>
          ))}
      </nav>

      {/* Quick action */}
      <div className="px-3 pb-3">
        <Link
          href="/clientes/nuevo"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium text-sage-700 bg-sage-50 hover:bg-sage-100 rounded-lg transition border border-sage-100"
        >
          <IconPlus />
          Nuevo lead
        </Link>
      </div>

      {/* Usuario */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-full bg-warm-100 flex items-center justify-center text-xs font-semibold text-warm-700 flex-shrink-0">
            {nombre.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{nombre}</p>
            <p className="text-xs text-gray-400">{isAdmin ? 'Administrador' : 'Vendedor'}</p>
          </div>
        </div>
        <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500 transition">
          Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Sidebar fijo — solo desktop (md+) */}
      <aside className="hidden md:flex w-56 min-w-56 bg-white border-r border-gray-100 flex-col">
        <NavContent />
      </aside>

      {/* Topbar mobile — solo < md */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 tracking-tight">Intermobili</p>
          <p className="text-xs text-gray-400">CRM Comercial</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="p-2 -mr-2 rounded-lg text-gray-600 hover:bg-gray-50 transition"
        >
          <IconMenu />
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 flex flex-col shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition"
            >
              <IconClose />
            </button>
            <NavContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
