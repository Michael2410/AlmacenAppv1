import type { ID } from './common';

export type UnidadMedida =
  | 'UNIDAD'
  | 'CAJA'
  | 'PAQUETE'
  | 'KG'
  | 'G'
  | 'L'
  | 'ML'
  | 'M'
  | 'CM';

export interface Proveedor {
  id: ID;
  nombre: string;
  direccion: string;
  contacto: string;
  telefono?: string;
}

export interface Area { id: ID; nombre: string }
export interface Ubicacion { id: ID; nombre: string }

export interface Producto {
  id: ID;
  nombre: string;
  alias?: string;
  marca?: string;
  unidad: UnidadMedida;
  areaId: ID;
  ubicacionId: ID;
  activo: boolean;
}
