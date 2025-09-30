import type { ID } from './common';
import type { UnidadMedida } from './catalogo';

export interface StockItem {
  id: ID;
  productoId: ID;
  cantidad: number;
  unidad: UnidadMedida;
  areaId: ID;
  ubicacionId: ID;
}

export interface Asignacion {
  id: ID;
  usuarioId: ID;
  productoId: ID;
  cantidad: number;
  unidad: UnidadMedida;
  fecha: string; // ISO
}
