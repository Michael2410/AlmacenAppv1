import type { ID } from './common';

export interface EmpresaConfig {
  id: number;
  nombre_empresa: string | null;
  ruc: string | null;
  logo_path: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  updated_at: string | null;
}

export interface CotizacionDetalle {
  id: string;
  cotizacion_id: string;
  producto_id: ID;
  producto_nombre: string;
  cantidad: number;
  unidad: string;
}

export interface Cotizacion {
  id: string;
  numero: string;
  proveedor_id: ID;
  proveedor_nombre?: string;
  proveedor_ruc?: string | null;
  proveedor_contacto?: string | null;
  proveedor_telefono?: string | null;
  fecha_cotizacion: string;
  observaciones: string | null;
  usuario_id: ID;
  usuario_nombre?: string;
  created_at: string;
  total_productos?: number;
  detalles?: CotizacionDetalle[];
}

export interface CreateCotizacionDto {
  proveedor_id: ID;
  productos: {
    producto_id: ID;
    producto_nombre: string;
    cantidad: number;
    unidad: string;
  }[];
  observaciones?: string;
}

export interface UpdateEmpresaConfigDto {
  nombre_empresa: string;
  ruc: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}
