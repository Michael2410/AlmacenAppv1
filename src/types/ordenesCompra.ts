import type { ID } from './common';

export type EstadoOrden = 'PENDIENTE' | 'CONFIRMADA' | 'EN_TRANSITO' | 'ENTREGADA' | 'CANCELADA';

export interface OrdenCompraDetalle {
  id: string;
  orden_id: string;
  producto_id: ID;
  producto_nombre: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  subtotal: number;
}

export interface SeguimientoEntrega {
  id: string;
  orden_id: string;
  fecha: string;
  estado: EstadoOrden;
  observaciones: string | null;
  usuario_id: ID;
  usuario_nombre?: string;
}

export interface OrdenCompra {
  id: string;
  numero: string;
  proveedor_id: ID;
  proveedor_nombre?: string;
  proveedor_ruc?: string | null;
  proveedor_direccion?: string | null;
  proveedor_contacto?: string | null;
  proveedor_telefono?: string | null;
  fecha_orden: string;
  fecha_entrega_estimada: string | null;
  estado: EstadoOrden;
  subtotal: number;
  impuestos: number;
  total: number;
  condiciones_pago: string | null;
  notas: string | null;
  usuario_id: ID;
  usuario_nombre?: string;
  created_at: string;
  updated_at: string;
  total_productos?: number;
  detalles?: OrdenCompraDetalle[];
  seguimiento?: SeguimientoEntrega[];
}

export interface CreateOrdenCompraDto {
  proveedor_id: ID;
  fecha_entrega_estimada?: string;
  productos: {
    producto_id: ID;
    producto_nombre: string;
    cantidad: number;
    unidad: string;
    precio_unitario: number;
  }[];
  condiciones_pago?: string;
  notas?: string;
}

export interface UpdateOrdenCompraDto {
  fecha_entrega_estimada?: string;
  condiciones_pago?: string;
  notas?: string;
}

export interface CambiarEstadoOrdenDto {
  estado: EstadoOrden;
  observaciones?: string;
}

export interface AgregarSeguimientoDto {
  observaciones: string;
}
