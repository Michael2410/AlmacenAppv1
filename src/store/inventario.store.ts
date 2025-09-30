import { create } from 'zustand';
import type { StockItem } from '../types/inventario';
import type { ID } from '../types/common';

interface InventarioStore {
  stockGeneral: StockItem[];
  miInventario: Record<ID, StockItem[]>; // by userId
  asignarAUsuario: (userId: ID, item: Omit<StockItem,'id'>) => void;
  retornarAlmacen: (userId: ID, productoId: ID, cantidad: number) => void;
  recalcularStocks: () => void;
}

export const useInventarioStore = create<InventarioStore>((set) => ({
  stockGeneral: [],
  miInventario: {},
  asignarAUsuario: (userId, item) => set((s) => {
    const id = `s${Date.now()}`;
    const current = s.miInventario[userId] ?? [];
    const updated = [...current, { ...item, id }];
    const sg = s.stockGeneral.map(si => si.productoId === item.productoId ? { ...si, cantidad: si.cantidad - item.cantidad } : si);
    return { miInventario: { ...s.miInventario, [userId]: updated }, stockGeneral: sg };
  }),
  retornarAlmacen: (userId, productoId, cantidad) => set((s) => {
    const prevList = s.miInventario[userId] ?? [];
    const nextList = prevList.map(it => it.productoId === productoId
      ? { ...it, cantidad: Math.max(0, it.cantidad - cantidad) }
      : it
    );
    const sg = s.stockGeneral.map(si => si.productoId === productoId ? { ...si, cantidad: si.cantidad + cantidad } : si);
    return { miInventario: { ...s.miInventario, [userId]: nextList }, stockGeneral: sg };
  }),
  recalcularStocks: () => set((s) => ({ ...s })),
}));
