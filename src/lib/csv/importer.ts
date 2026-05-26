import Papa from 'papaparse'
import type { Client } from '@/types'

// Quita prefijos __dupN__ de PapaParse, acentos, puntos y normaliza a snake_case
const normalizar = (s: string) =>
  s
    .replace(/^__dup\d+__/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')

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
// Nota: "codigo" NO está acá. El CSV tiene varias columnas "Código"
// y la que corresponde a numero_cliente se detecta por posición
// (ver findNumeroClienteHeader más abajo).
const COLUMN_MAP: Record<string, keyof Client> = {
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
  // vendedor_original — se guarda tal cual; la página resuelve el ID
  'vendedor':            'vendedor_original',
  'vendedor_asignado':   'vendedor_original',
}

// Alias de nombres de vendedor del CSV → nombre en profiles.
// Claves ya normalizadas (minúsculas, sin acentos, espacios simples).
// null = no asignar (e.g. entradas que no son vendedores reales).
export const VENDEDOR_ALIAS: Record<string, string | string[] | null> = {
  'camila spampinato':   'camila',
  'liliana artemisi':    'liliana',
  'sofia spampinato':    'sofia',
  'naza leguizamon':     ['naza', 'nazareno'],
  'luciana cabancic':    'luciana',
  'domm':                ['dominique', 'domm'],
  'intermobili':         null,
  'administrador sistema': null,
}

// Columnas que existen en el CSV pero no se importan (para no confundir el debug)
const COLUMNAS_IGNORADAS = new Set([
  'categoria', 'tipo',
  'codigo_localidad', 'zona', 'tipo_actividad', 'codigo_postal', 'barrio',
  'estado', 'telefono_celular', 'direccion',
])

// El CSV de Intermobili tiene varias columnas "Código". numero_cliente
// es la PRIMERA aparición (columna A). Las demás (e.g. la que está después
// de Teléfono) son código de localidad y se ignoran.
// Devuelve el header crudo (con prefijo __dupN__ si lo tiene) o null.
function findNumeroClienteHeader(rawHeaders: string[]): string | null {
  for (const h of rawHeaders) {
    if (normalizar(h) === 'codigo') return h
  }
  return null
}

export interface ImportResult {
  rows: Partial<Client>[]
  skipped: number
  total: number
  columnsFound: string[]
  columnsIgnored: string[]
  vendedoresEnCSV: string[]   // nombres únicos de vendedor encontrados en el CSV
  debug: {
    headersRaw: string[]
    headersNorm: string[]
    mappings: string[]
    firstRowKeys: string[]
    firstRowMapped: Record<string, unknown>
    firstRowSkipReason: string
  }
}

export async function parsearCSV(file: File): Promise<ImportResult> {
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

          const visibleHeaders = rawHeaders
          const headersNorm = visibleHeaders.map(normalizar)
          const numeroClienteHeader = findNumeroClienteHeader(rawHeaders)
          const mappings = visibleHeaders.map(h => {
            const norm = normalizar(h)
            if (norm === 'codigo') {
              const field = h === numeroClienteHeader
                ? 'numero_cliente'
                : '(ignorado: codigo_localidad u otro)'
              return `${h} → norm:"${norm}" → campo:${field}`
            }
            return `${h} → norm:"${norm}" → campo:${COLUMN_MAP[norm] ?? '(sin mapeo)'}`
          })

          // Clasificar cada header del CSV — normalizar quita prefijos __dupN__ automáticamente
          for (const h of rawHeaders) {
            const norm = normalizar(h)
            if (norm === 'codigo') {
              if (h === numeroClienteHeader) columnsFound.push(h)
              continue
            }
            if (COLUMN_MAP[norm]) {
              columnsFound.push(h)
            } else if (!COLUMNAS_IGNORADAS.has(norm)) {
              columnsIgnored.push(h)
            }
          }

          const allRows = results.data as Record<string, string>[]
          const firstRaw = allRows[0] ?? {}

          const rows: Partial<Client>[] = []
          const vendedoresSet = new Set<string>()
          let skipped = 0

          // Debug de primera fila
          const firstRowMapped: Record<string, unknown> = {}
          let firstRowSkipReason = ''

          for (const raw of allRows) {
            const mapped: Partial<Client> = {
              vendedor_asignado: null,   // la página resuelve el ID contra profiles
              categoria_cliente: 'cliente_activo',
              estado:            'en_curso',
            }

            let tieneRazonSocial = false

            for (const [col, val] of Object.entries(raw)) {
              const norm = normalizar(col)

              // numero_cliente se detecta por posición (segundo "Código",
              // entre Teléfono y Localidad), no por el COLUMN_MAP.
              if (norm === 'codigo') {
                if (col === numeroClienteHeader) {
                  mapped.numero_cliente = limpiarValor(val) || null
                }
                continue
              }

              const field = COLUMN_MAP[norm]
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

            if (mapped.vendedor_original) vendedoresSet.add(mapped.vendedor_original)

            if (rows.length === 0 && skipped === 0) {
              Object.assign(firstRowMapped, mapped)
              firstRowSkipReason = tieneRazonSocial
                ? '(fila válida)'
                : `razon_social ausente o vacío. Keys de la fila: [${Object.keys(raw).join(', ')}]`
            }

            if (!tieneRazonSocial) { skipped++; continue }
            rows.push(mapped)
          }

          resolve({ rows, skipped, total: allRows.length, columnsFound, columnsIgnored, vendedoresEnCSV: Array.from(vendedoresSet), debug: { headersRaw: visibleHeaders, headersNorm, mappings, firstRowKeys: Object.keys(firstRaw), firstRowMapped, firstRowSkipReason } })
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
