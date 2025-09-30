import { create } from 'zustand';
import type { Proveedor, Producto, Area, Ubicacion } from '../types/catalogo';

interface CatalogosStore {
  proveedores: Proveedor[];
  productos: Producto[];
  areas: Area[];
  ubicaciones: Ubicacion[];
  setProveedores: (l: Proveedor[]) => void;
  setProductos: (l: Producto[]) => void;
  setAreas: (l: Area[]) => void;
  setUbicaciones: (l: Ubicacion[]) => void;
}

export const useCatalogosStore = create<CatalogosStore>((set) => ({
  proveedores: [], productos: [], areas: [], ubicaciones: [],
  setProveedores: (l) => set({ proveedores: l }),
  setProductos: (l) => set({ productos: l }),
  setAreas: (l) => set({ areas: l }),
  setUbicaciones: (l) => set({ ubicaciones: l }),
}));
