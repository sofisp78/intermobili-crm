'use client'
import { useState, useRef } from 'react'
import { parsearCSV, chunkArray, VENDEDOR_ALIAS, type ImportResult } from '@/lib/csv/importer'
import { createClient } from '@/lib/supabase/client'
import { useRequireAdmin } from '@/lib/auth/useRequireAdmin'

interface VendedorStats {
  asignados: number
  sinAsignar: number
  detectados: string[]
  noEncontrados: string[]
}

const normNombre = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')

export default function ImportarPage() {
  const { isAdmin, loading: checkingRole, error: roleError } = useRequireAdmin()
  const [resultado, setResultado] = useState<ImportResult | null>(null)
  const [vendedorStats, setVendedorStats] = useState<VendedorStats | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const sb = createClient()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setDone(false); setResultado(null); setVendedorStats(null)
    try {
      if (!isAdmin) throw new Error('Solo administradores pueden importar clientes.')

      const r = await parsearCSV(file)

      // Resolver vendedores: buscar en profiles por role='vendedor'
      const { data: profiles } = await sb
        .from('profiles')
        .select('id, nombre, vendedor_nombre')
        .eq('role', 'vendedor')

      const profileMap = new Map<string, string>()
      for (const p of (profiles ?? [])) {
        if (p.nombre)          profileMap.set(normNombre(p.nombre), p.id)
        if (p.vendedor_nombre) profileMap.set(normNombre(p.vendedor_nombre), p.id)
      }

      let asignados = 0
      const noEncontradosSet = new Set<string>()
      for (const row of r.rows) {
        if (!row.vendedor_original) continue

        const normOrig = normNombre(row.vendedor_original)

        if (normOrig in VENDEDOR_ALIAS) {
          const alias = VENDEDOR_ALIAS[normOrig]
          if (alias === null) continue   // INTERMOBILI / ADMINISTRADOR SISTEMA — no asignar

          const nombres = Array.isArray(alias) ? alias : [alias]
          for (const nombre of nombres) {
            const id = profileMap.get(normNombre(nombre))
            if (id) { row.vendedor_asignado = id; asignados++; break }
          }
          if (!row.vendedor_asignado) noEncontradosSet.add(row.vendedor_original)
          continue
        }

        // Sin alias — búsqueda directa por nombre normalizado
        const id = profileMap.get(normOrig) ?? null
        row.vendedor_asignado = id
        if (id) asignados++
        else noEncontradosSet.add(row.vendedor_original)
      }

      setVendedorStats({
        asignados,
        sinAsignar: r.rows.length - asignados,
        detectados: r.vendedoresEnCSV,
        noEncontrados: Array.from(noEncontradosSet),
      })
      setResultado(r)
    } catch (err: any) {
      setError(err?.message ?? JSON.stringify(err))
    }
  }

  const confirmar = async () => {
    if (!resultado) return
    setImporting(true); setError(''); setProgress('')
    try {
      if (!isAdmin) throw new Error('Solo administradores pueden importar clientes.')
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('No hay sesión activa.')

      // Insertar en lotes de 200 para no superar límites de Supabase
      const chunks = chunkArray(resultado.rows, 200)
      for (let i = 0; i < chunks.length; i++) {
        setProgress(`Insertando lote ${i + 1} de ${chunks.length}...`)
        const { error: e } = await sb.from('clients').insert(chunks[i] as any)
        if (e) throw new Error(`Lote ${i + 1}: ${e.message}`)
      }

      await sb.from('imports').insert({
        file_name: fileRef.current?.files?.[0]?.name ?? null,
        imported_by: user.id,
        total_rows: resultado.total,
        total_imported: resultado.rows.length,
        total_skipped: resultado.skipped,
      })

      setDone(true)
      setResultado(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: any) {
      setError(err?.message ?? JSON.stringify(err))
    } finally {
      setImporting(false)
      setProgress('')
    }
  }

  if (checkingRole) {
    return <div className="text-sm text-gray-400 text-center py-16">Cargando...</div>
  }

  if (roleError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <p className="text-sm font-medium text-red-600 mb-2">No se pudo validar el acceso</p>
        <pre className="text-xs bg-red-50 text-red-800 rounded-xl p-4 whitespace-pre-wrap break-all">{roleError}</pre>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-xl font-medium mb-2">Importar CSV</h1>
      <p className="text-sm text-gray-400 mb-6">
        Separador <code>;</code> · Encoding Windows-1252 · Valores <code>=&quot;texto&quot;</code> soportados
      </p>

      {error && (
        <div className="mb-4">
          <p className="text-sm font-medium text-red-600 mb-1">Error</p>
          <pre className="text-xs bg-red-50 text-red-800 rounded-xl px-4 py-3 whitespace-pre-wrap break-all">{error}</pre>
        </div>
      )}
      {done && (
        <div className="bg-green-50 text-green-800 text-sm rounded-xl px-4 py-3 mb-4">
          Importación completada correctamente.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-sage-400 transition">
          <p className="text-sm text-gray-400">Arrastrá o hacé click para subir el CSV</p>
          <p className="text-xs text-gray-300 mt-1">Formato exportado del sistema actual</p>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
        </label>

        {resultado && (
          <div className="mt-6 space-y-4">

            {/* Contadores */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-warm-50 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-medium text-gray-800">{resultado.total}</p>
                <p className="text-xs text-gray-400">Total filas</p>
              </div>
              <div className="bg-sage-50 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-medium text-sage-700">{resultado.rows.length}</p>
                <p className="text-xs text-gray-400">A importar</p>
              </div>
              <div className="bg-amber-50 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-medium text-amber-700">{resultado.skipped}</p>
                <p className="text-xs text-gray-400">Omitidas</p>
              </div>
            </div>

            {/* Columnas detectadas */}
            <div className="rounded-xl border border-gray-100 px-4 py-3 text-xs space-y-1">
              <p className="text-gray-500 font-medium mb-1">Columnas mapeadas ({resultado.columnsFound.length})</p>
              <p className="text-gray-600">{resultado.columnsFound.join(' · ') || '—'}</p>
              {resultado.columnsIgnored.length > 0 && (
                <>
                  <p className="text-gray-400 font-medium mt-2">Sin mapeo ({resultado.columnsIgnored.length})</p>
                  <p className="text-gray-400">{resultado.columnsIgnored.join(' · ')}</p>
                </>
              )}
            </div>

            {/* Resumen de vendedores */}
            {vendedorStats && (
              <div className="rounded-xl border border-gray-100 px-4 py-3 text-xs space-y-1">
                <p className="text-gray-500 font-medium mb-1">Vendedores</p>
                <p className="text-gray-600">
                  Asignados: <span className="text-sage-700 font-medium">{vendedorStats.asignados}</span>
                  {' · '}
                  Sin asignar: <span className="text-amber-600 font-medium">{vendedorStats.sinAsignar}</span>
                </p>
                {vendedorStats.detectados.length > 0 && (
                  <p className="text-gray-400 mt-1">
                    Detectados en CSV: {vendedorStats.detectados.join(' · ')}
                  </p>
                )}
                {vendedorStats.noEncontrados.length > 0 && (
                  <p className="text-amber-600 mt-1">
                    No encontrados en sistema: {vendedorStats.noEncontrados.join(' · ')}
                  </p>
                )}
              </div>
            )}

            {/* Preview */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1 text-gray-400 font-normal">Razón social</th>
                    <th className="text-left py-1 text-gray-400 font-normal">CUIT</th>
                    <th className="text-left py-1 text-gray-400 font-normal">Provincia</th>
                    <th className="text-left py-1 text-gray-400 font-normal">Ult. compra</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1 text-gray-700">{r.razon_social ?? '—'}</td>
                      <td className="py-1 text-gray-500">{r.cuit ?? '—'}</td>
                      <td className="py-1 text-gray-500">{r.provincia ?? '—'}</td>
                      <td className="py-1 text-gray-500">{r.fecha_ultima_compra ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {resultado.rows.length > 5 && (
                <p className="text-xs text-gray-400 mt-1">... y {resultado.rows.length - 5} más</p>
              )}
            </div>

            {progress && (
              <p className="text-xs text-gray-400 text-center">{progress}</p>
            )}

            <button
              onClick={confirmar}
              disabled={importing || resultado.rows.length === 0}
              className="w-full bg-sage-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sage-800 transition disabled:opacity-50"
            >
              {importing ? progress || 'Importando...' : `Confirmar importación (${resultado.rows.length} clientes)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
