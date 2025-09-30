import type { ID } from './common';
import type { UnidadMedida } from './catalogo';

export interface Ingreso {
  id: ID;
  productoId: ID;
  proveedorId: ID;
  nombre: string; // kept for compatibility, can be product description
  marca?: string;
  fechaVencimiento?: string; // ISO
  numeroSerie?: string;
  fechaIngreso: string; // ISO
  fechaFactura?: string; // ISO
  serieFactura?: string;
  cantidad: number;
  unidad: UnidadMedida;
  precio: number;
  areaId: ID;
  ubicacionId: ID;
}
