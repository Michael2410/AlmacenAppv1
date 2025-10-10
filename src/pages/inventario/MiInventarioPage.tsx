import { useCallback, useMemo, useState } from 'react';
import { Input, Card, Empty, Tag, Button } from 'antd';
import { ShoppingCartOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useInventarioStore } from '../../store/inventario.store';
import { useAuthStore } from '../../store/auth.store';
import type { StockItem } from '../../types/inventario';
import { useMiInventario, useProductos } from '../../lib/api';

const EMPTY: StockItem[] = [];

export default function MiInventarioPage() {
  const navigate = useNavigate();
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

  // Estadísticas rápidas
  const totalProductos = items.length;
  const productosConStock = items.filter((it: any) => it.cantidad > 0).length;

  return (
    <div className="space-y-4">
      {/* Header con información y acción rápida */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Mi Inventario</h2>
            <div className="flex gap-4 text-sm text-gray-600">
              <span><strong>{totalProductos}</strong> productos asignados</span>
              <span><strong>{productosConStock}</strong> con stock disponible</span>
            </div>
          </div>
          <Button 
            type="primary" 
            icon={<ShoppingCartOutlined />}
            onClick={() => navigate('/pedidos/mios')}
            size="large"
          >
            Hacer Pedido
          </Button>
        </div>
      </Card>

      {/* Búsqueda mejorada */}
      <div>
        <Input 
          allowClear 
          placeholder="Buscar en mi inventario..." 
          value={query} 
          onChange={(e) => setQuery(e.target.value)}
          prefix={<SearchOutlined />}
          style={{ maxWidth: 400 }} 
          size="large"
        />
      </div>

      {/* Tabla mejorada */}
      <div className="overflow-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((it, idx) => (
              <tr key={(it.id ?? `${it.productoId}-${it.unidad}`) + '-' + idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{nameOf(it.productoId)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{it.cantidad}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{it.unidad}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Tag color={it.cantidad > 0 ? 'green' : 'red'}>
                    {it.cantidad > 0 ? 'Disponible' : 'Sin stock'}
                  </Tag>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-6 py-8 text-center" colSpan={4}>
                  <Empty 
                    description={
                      <div>
                        <p className="text-gray-500 mb-2">
                          {q ? 'No se encontraron productos' : 'Aún no tienes productos asignados'}
                        </p>
                        {!q && (
                          <Button 
                            type="primary" 
                            icon={<ShoppingCartOutlined />}
                            onClick={() => navigate('/pedidos/mios')}
                          >
                            Solicitar productos
                          </Button>
                        )}
                      </div>
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
