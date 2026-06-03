export type Role = 'admin' | 'vendedor'

export interface Etiqueta {
  id: string
  nombre: string
  color: string
  activa: boolean
  created_at: string
  updated_at: string
}

export type CategoriaCliente = 'lead_nuevo' | 'cliente_activo' | 'cliente_a_reactivar' | 'cerrado_no_avanzar'
export type TipoCliente = 'distribuidor' | 'arquitecto_desarrollador' | 'hotel' | 'otro'
export type Potencial = 'alto' | 'medio' | 'bajo'
export type Estado = 'nuevo' | 'en_curso' | 'esperando' | 'cerrado'
export type Prioridad = 'alta' | 'media' | 'baja'
export type ListaTipo = 'lista_1' | 'lista_2'

export interface Profile {
  id: string
  nombre: string
  email: string
  role: Role
  vendedor_nombre: string | null
  created_at: string
}

export interface Client {
  id: string
  razon_social: string
  nombre_fantasia: string | null
  cuit: string | null
  telefono: string | null
  mail: string | null
  provincia: string | null
  localidad: string | null
  vendedor_asignado: string | null
  vendedor_nombre?: string | null       // join desde profiles
  categoria_cliente: CategoriaCliente | null
  tipo_cliente: TipoCliente | null
  potencial: Potencial | null
  estado: Estado | null
  prioridad: Prioridad | null
  origen: string | null
  ultimo_contacto: string | null
  resumen: string | null
  fecha_proxima_accion: string | null
  fecha_alta_sistema: string | null
  fecha_ultima_compra: string | null
  ultimo_resultado: string | null
  ultimo_canal: string | null
  ultima_actualizacion_por: string | null
  ultima_actualizacion_at: string | null
  vendedor_original: string | null
  lista_tipo: ListaTipo | null
  numero_cliente: string | null
  etiquetas?: Etiqueta[]
  created_at: string
  updated_at: string
}

export interface ClientUpdate {
  id: string
  client_id: string
  user_id: string
  fecha_contacto: string
  resumen: string | null
  estado: Estado | null
  fecha_proxima_accion: string | null
  prioridad: string | null
  categoria_cliente: string | null
  cambios: string | null
  canal: string | null
  resultado: string | null
  estado_anterior: string | null
  estado_nuevo: string | null
  categoria_anterior: string | null
  categoria_nueva: string | null
  prioridad_anterior: string | null
  prioridad_nueva: string | null
  fecha_proxima_accion_anterior: string | null
  fecha_proxima_accion_nueva: string | null
  created_at: string
  user?: { nombre: string }
}

export interface Import {
  id: string
  file_name: string | null
  imported_by: string | null
  imported_at: string
  total_rows: number
  total_imported: number
  total_skipped: number
}

export type Urgencia = 'vencido' | 'hoy' | 'proximo' | 'sin_fecha'

export interface ClientConUrgencia extends Client {
  urgencia: Urgencia
}
