import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';

/**
 * Hook para consultar el stock disponible de un producto
 * @param productoId - ID del producto
 * @param marca - Marca del producto (opcional)
 * @returns Query con el stock disponible
 */
export function useStockDisponible(productoId?: string, marca?: string) {
  const token = useAuthStore(s => s.token);

  return useQuery({
    queryKey: ['stock', 'disponible', productoId, marca],
    queryFn: async () => {
      if (!productoId) return null;
      
      const params = marca ? `?marca=${encodeURIComponent(marca)}` : '';
      const response = await fetch(`/api/stock/disponible/${productoId}${params}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al consultar stock disponible');
      }

      const data = await response.json();
      return data.success ? data.data.disponible : 0;
    },
    enabled: !!productoId && !!token, // Solo ejecuta si hay productoId y token
    staleTime: 10000, // Considera los datos frescos por 10 segundos
    gcTime: 60000, // Mantiene en caché por 1 minuto
    retry: 2
  });
}

/**
 * Hook para consultar productos con bajo stock
 * @returns Query con la lista de productos con stock bajo
 */
export function useLowStock() {
  const token = useAuthStore(s => s.token);

  return useQuery({
    queryKey: ['stock', 'bajo'],
    queryFn: async () => {
      const response = await fetch('/api/stock/bajo', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al consultar productos con bajo stock');
      }

      const data = await response.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
    refetchInterval: 120000, // Refresca cada 2 minutos
    staleTime: 60000
  });
}

/**
 * Hook para consultar productos próximos a vencer
 * @param dias Días de umbral (por defecto 30)
 * @returns Query con la lista de productos próximos a vencer
 */
export function useProductosProximosVencer(dias = 30) {
  const token = useAuthStore(s => s.token);

  return useQuery({
    queryKey: ['stock', 'proximos-vencer', dias],
    queryFn: async () => {
      const response = await fetch(`/api/stock/proximos-vencer?dias=${dias}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al consultar productos próximos a vencer');
      }

      const data = await response.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
    refetchInterval: 300000, // Refresca cada 5 minutos
    staleTime: 120000
  });
}

/**
 * Hook para consultar el reporte detallado de stock
 * @returns Query con el reporte detallado
 */
export function useStockDetallado() {
  const token = useAuthStore(s => s.token);

  return useQuery({
    queryKey: ['stock', 'detallado'],
    queryFn: async () => {
      const response = await fetch('/api/stock/detallado', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al consultar stock detallado');
      }

      const data = await response.json();
      return data.success ? data.data : null;
    },
    enabled: !!token,
    staleTime: 30000
  });
}
