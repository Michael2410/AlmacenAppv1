import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '../lib/api';

export interface ProductoVencido {
  ingreso_id: string;
  producto_id: string;
  producto_nombre: string;
  marca: string;
  cantidad: number;
  cantidad_disponible: number;
  unidad: string;
  fecha_vencimiento: string;
  fecha_ingreso: string;
  precio: number;
  proveedor_id: string;
  proveedor_nombre: string;
  dias_vencido: number;
  valor_total: number;
}

export interface BajaInventario {
  ingreso_id: string;
  cantidad: number;
  motivo: 'VENCIDO' |'OTRO';
  observacion?: string;
}

export interface DevolucionProveedor {
  ingreso_id: string;
  cantidad: number;
  motivo: string;
  observacion?: string;
}

// Hook para obtener productos vencidos
export function useProductosVencidos() {
  return useQuery({
    queryKey: ['productos-vencidos'],
    queryFn: async () => {
      const res = await api.get('/stock/vencidos');
      return res.data.data as ProductoVencido[];
    },
    staleTime: 60000, // 1 minuto
  });
}

// Hook para dar de baja un producto
export function useDarDeBaja() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: BajaInventario) => {
      const res = await api.post('/stock/dar-de-baja', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos-vencidos'] });
      queryClient.invalidateQueries({ queryKey: ['reportes', 'bajas'] });
      message.success('Producto dado de baja exitosamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al dar de baja el producto');
    }
  });
}

// Hook para devolver producto a proveedor
export function useDevolverProveedor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: DevolucionProveedor) => {
      const res = await api.post('/stock/devolver-proveedor', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos-vencidos'] });
      queryClient.invalidateQueries({ queryKey: ['reportes', 'devoluciones'] });
      message.success('Devolución registrada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al registrar la devolución');
    }
  });
}

// Hooks para reportes
export interface FiltrosReporteBajas {
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface FiltrosReporteDevoluciones {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'REEMBOLSADO';
}

export function useReporteBajas(filtros: FiltrosReporteBajas = {}) {
  return useQuery({
    queryKey: ['reportes', 'bajas', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      
      const res = await api.get(`/reportes/bajas?${params.toString()}`);
      return res.data.data;
    },
    staleTime: 30000,
  });
}

export function useReporteDevoluciones(filtros: FiltrosReporteDevoluciones = {}) {
  return useQuery({
    queryKey: ['reportes', 'devoluciones', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros.estado) params.append('estado', filtros.estado);
      
      const res = await api.get(`/reportes/devoluciones?${params.toString()}`);
      return res.data.data;
    },
    staleTime: 30000,
  });
}
