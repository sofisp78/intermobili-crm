import Papa from 'papaparse'
import type { Client } from '@/types'

// Quita acentos, pasa a minúsculas y reemplaza espacios por _ — matching robusto
const normalizar = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')

const limpiarValor = (v: unknown): string => {
  if (v == null) return ''
  const s = String(v).trim()
  // Limpia ="valor" y ="valor" con comillas simples
  return s.replace(/^=["']?(.*?)["']?$/, '$1').trim()
}

const normalizarListaTipo = (v: string): 'lista_1' | 'lista_2' | null => {
  // Limpia y normaliza: "Lista1", "lista 1", ="Lista1", "1", etc.
  const s = limpiarValor(v).toLowerCase().replace(/\s/g, '')
  if (s === 'lista1' || s === '1') return 'lista_1'
  if (s === 'lista2' || s === '2') return 'lista_2'
  return null
}

const parsearFecha = (v: string): string | null => {
  const limpio = limpiarValor(v)
  if (!limpio) return null
  if (limpio.includes('1899') || limpio.includes('1900')) return null

  // dd/mm/yyyy
  const match = limpio.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, d, m, y] = match
    const fecha = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    if (isNaN(fecha.getTime())) return null
    return fecha.toISOString().split('T')[0]
  }
  // yyyy-mm-dd (por si acaso)
  const match2 = limpio.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match2) return limpio
  return null
}

// Claves ya normalizadas (sin acentos, minúsculas, espacios → _)
const COLUMN_MAP: Record<string, keyof Client> = {
  // numero_cliente
  'codigo':              'numero_cliente',
  // razon_social
  'razon_social':        'razon_social',
  'razonsocial':         'razon_social',
  // nombre_fantasia
  'nombre_fantasia':     'nombre_fantasia',
  'nombrefantasia':      'nombre_fantasia',
  // cuit
  'c.u.i.t.':           'cuit',
  'cuit':                'cuit',
  // telefono
  'telefono':            'telefono',
  'tel':                 'telefono',
  // mail
  'mail':                'mail',
  'email':               'mail',
  'e-mail':              'mail',
  // localidad / provincia
  'provincia':           'provincia',
  'localidad':           'localidad',
  // fecha_alta_sistema
  'fecha_alta':          'fecha_alta_sistema',
  'fechaalta':           'fecha_alta_sistema',
  'fecha_alta_sistema':  'fecha_alta_sistema',
  // fecha_ultima_compra
  'fecha_ult_compra':    'fecha_ultima_compra',
  'fecha_ult._compra':   'fecha_ultima_compra',
  'fecha_ultima_compra': 'fecha_ultima_compra',
  'fechaultcompra':      'fecha_ultima_compra',
  // lista_tipo
  'listaprecios':        'lista_tipo',
  'lista_precios':       'lista_tipo',
  'listaprecio':         'lista_tipo',
  'lista':               'lista_tipo',
}

// Columnas que existen en el CSV pero no se importan (para no confundir el debug)
const COLUMNAS_IGNORADAS = new Set([
  'vendedor', 'vendedor_asignado', 'categoria', 'tipo',
  'codigo_localidad', 'zona', 'tipo_actividad', 'codigo_postal', 'barrio',
  'estado', 'telefono_celular', 'direccion',
])

export interface ImportResult {
  rows: Partial<Client>[]
  skipped: number
  total: number
  columnsFound: string[]    // headers del CSV que se mapearon a un campo
  columnsIgnored: string[]  // headers presentes pero sin mapeo
}

export async function parsearCSV(
  file: File,
  vendedorId: string
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string

      // Renombra duplicados: segunda "Código" pasa a ser "__dup2__Código", etc.
      // Así podemos distinguir la primera (número de cliente) de la segunda (código de localidad).
      const headerCount: Record<string, number> = {}

      Papa.parse(text, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        transformHeader: (h) => {
          const key = h.trim()
          if (!headerCount[key]) {
            headerCount[key] = 1
            return key
          }
          const n = ++headerCount[key]
          return `__dup${n}__${key}`
        },
        complete: (results) => {
          const rawHeaders: string[] = results.meta.fields ?? []
          const columnsFound: string[] = []
          const columnsIgnored: string[] = []

          // Clasificar cada header del CSV (ignorar los marcadores de duplicado)
          for (const h of rawHeaders) {
            if (h.startsWith('__dup')) continue
            const norm = normalizar(h)
            if (COLUMN_MAP[norm]) {
              columnsFound.push(h)
            } else if (!COLUMNAS_IGNORADAS.has(norm)) {
              columnsIgnored.push(h)
            }
          }

          const rows: Partial<Client>[] = []
          let skipped = 0

          for (const raw of results.data as Record<string, string>[]) {
            const mapped: Partial<Client> = {
              vendedor_asignado: vendedorId,
              categoria_cliente: 'cliente_activo',
              estado:            'en_curso',
            }

            let tieneRazonSocial = false

            for (const [col, val] of Object.entries(raw)) {
              const field = COLUMN_MAP[normalizar(col)]
              if (!field) continue

              const limpio = limpiarValor(val)

              if (field === 'fecha_alta_sistema' || field === 'fecha_ultima_compra') {
                ;(mapped as any)[field] = parsearFecha(limpio)
              } else if (field === 'lista_tipo') {
                ;(mapped as any)[field] = normalizarListaTipo(val as string)
              } else {
                ;(mapped as any)[field] = limpio || null
              }

              if (field === 'razon_social' && limpio) tieneRazonSocial = true
            }

            if (!tieneRazonSocial) { skipped++; continue }
            rows.push(mapped)
          }

          resolve({ rows, skipped, total: results.data.length, columnsFound, columnsIgnored })
        },
        error: reject,
      })
    }
    reader.readAsText(file, 'windows-1252')
  })
}

// Divide un array en chunks de tamaño n
export function chunkArray<T>(arr: T[], n: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += n) chunks.push(arr.slice(i, i + n))
  return chunks
}
