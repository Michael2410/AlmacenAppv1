import { useCallback, useMemo, useState } from 'react';
import { Input } from 'antd';
import { useInventarioStore } from '../../store/inventario.store';
import { useAuthStore } from '../../store/auth.store';
import type { StockItem } from '../../types/inventario';
import { useMiInventario, useProductos } from '../../lib/api';

const EMPTY: StockItem[] = [];

export default function MiInventarioPage() {
  const userId = useAuthStore(s => s.user?.id);
  // Stable empty reference to avoid re-renders when userId is not yet available
  const api = useMiInventario(userId ?? '');
  const itemsFromStore = useInventarioStore(
    useCallback((s) => (userId ? (s.miInventario[userId] ?? EMPTY) : EMPTY), [userId])
  );
  const itemsRaw: any[] = ((api as any)?.data?.data as any[] | undefined) ?? itemsFromStore;
  const { data: prodsRes } = useProductos();
  const productos = prodsRes?.data ?? [];
  const nameOf = (id: string) => productos.find((p: any) => p.id === id)?.nombre ?? id;
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const items = useMemo(() => {
    if (!q) return itemsRaw;
    return itemsRaw.filter((it: any) => {
      const name = nameOf(it.productoId).toLowerCase();
      const id = String(it.productoId).toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [itemsRaw, q, productos]);

  return (
    <div className="space-y-3">
      <div>
        <Input allowClear placeholder="Buscar producto" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} />
      </div>
      <div className="overflow-auto rounded-md border">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Producto</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Cantidad</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Unidad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((it, idx) => (
            <tr key={(it.id ?? `${it.productoId}-${it.unidad}`) + '-' + idx}>
              <td className="px-4 py-2 text-sm">{nameOf(it.productoId)}</td>
              <td className="px-4 py-2 text-sm">{it.cantidad}</td>
              <td className="px-4 py-2 text-sm">{it.unidad}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={3}>Sin asignaciones</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
