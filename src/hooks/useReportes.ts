import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface FiltrosInventario {
  productoId?: string;
  areaId?: string;
}

export interface FiltrosIngresos {
  fechaInicio?: string;
  fechaFin?: string;
  productoId?: string;
  proveedorId?: string;
}

export interface FiltrosPedidos {
  fechaInicio?: string;
  fechaFin?: string;
  usuarioId?: string;
  estado?: string;
  productoId?: string;
}

export interface FiltrosStockUsuarios {
  usuarioId?: string;
}

export interface FiltrosMovimientos {
  fechaInicio?: string;
  fechaFin?: string;
  tipo?: 'ingreso' | 'salida' | 'pedido';
}

export interface FiltrosResumen {
  fechaInicio?: string;
  fechaFin?: string;
}

// Hook para reporte de inventario
export function useInventarioReport(filtros: FiltrosInventario = {}) {
  return useQuery({
    queryKey: ['reportes', 'inventario', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.productoId) params.append('productoId', filtros.productoId);
      if (filtros.areaId) params.append('areaId', filtros.areaId);
      
      const res = await api.get(`/reportes/inventario?${params.toString()}`);
      return res.data.data;
    },
    staleTime: 30000,
  });
}

// Hook para reporte de ingresos
export function useIngresosReport(filtros: FiltrosIngresos = {}) {
  return useQuery({
    queryKey: ['reportes', 'ingresos', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.productoId) params.append('productoId', filtros.productoId);
      if (filtros.proveedorId) params.append('proveedorId', filtros.proveedorId);
      
      const res = await api.get(`/reportes/ingresos?${params.toString()}`);
      return res.data.data;
    },
    staleTime: 30000,
  });
}

// Hook para reporte de pedidos
export function usePedidosReport(filtros: FiltrosPedidos = {}) {
  return useQuery({
    queryKey: ['reportes', 'pedidos', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.usuarioId) params.append('usuarioId', filtros.usuarioId);
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.productoId) params.append('productoId', filtros.productoId);
      
      const res = await api.get(`/reportes/pedidos?${params.toString()}`);
      return res.data.data;
    },
    staleTime: 30000,
  });
}

// Hook para reporte de stock por usuario
export function useStockUsuariosReport(filtros: FiltrosStockUsuarios = {}) {
  return useQuery({
    queryKey: ['reportes', 'stock-usuarios', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.usuarioId) params.append('usuarioId', filtros.usuarioId);
      
      const res = await api.get(`/reportes/stock-usuarios?${params.toString()}`);
      return res.data.data;
    },
    staleTime: 30000,
  });
}

// Hook para reporte de movimientos
export function useMovimientosReport(filtros: FiltrosMovimientos = {}) {
  return useQuery({
    queryKey: ['reportes', 'movimientos', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      
      const res = await api.get(`/reportes/movimientos?${params.toString()}`);
      return res.data.data;
    },
    staleTime: 30000,
  });
}

// Hook para resumen ejecutivo
export function useResumenReport(filtros: FiltrosResumen = {}) {
  return useQuery({
    queryKey: ['reportes', 'resumen', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      
      const res = await api.get(`/reportes/resumen?${params.toString()}`);
      return res.data.data;
    },
    staleTime: 30000,
  });
}
