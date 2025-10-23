import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '../lib/api';
import type {
  OrdenCompra,
  CreateOrdenCompraDto,
  UpdateOrdenCompraDto,
  CambiarEstadoOrdenDto,
  AgregarSeguimientoDto
} from '../types/ordenesCompra';

// Listar órdenes de compra con filtros opcionales
export function useOrdenesCompra(params?: {
  estado?: string;
  proveedor_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}) {
  return useQuery({
    queryKey: ['ordenes-compra', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.estado) queryParams.append('estado', params.estado);
      if (params?.proveedor_id) queryParams.append('proveedor_id', params.proveedor_id);
      if (params?.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
      if (params?.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);

      const url = `/ordenes-compra${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await api.get<{ success: boolean; data: OrdenCompra[] }>(url);
      return res.data;
    }
  });
}

// Obtener detalle de una orden específica
export function useOrdenCompra(id: string) {
  return useQuery({
    queryKey: ['ordenes-compra', id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: OrdenCompra }>(`/ordenes-compra/${id}`);
      return res.data;
    },
    enabled: !!id
  });
}

// Crear nueva orden de compra
export function useCreateOrdenCompra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrdenCompraDto) => {
      const res = await api.post<{ success: boolean; data: { id: string; numero: string } }>(
        '/ordenes-compra',
        data
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      message.success('Orden de compra creada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al crear orden de compra');
    }
  });
}

// Actualizar orden de compra
export function useUpdateOrdenCompra(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateOrdenCompraDto) => {
      const res = await api.put<{ success: boolean; data: OrdenCompra }>(
        `/ordenes-compra/${id}`,
        data
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra', id] });
      message.success('Orden actualizada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al actualizar orden');
    }
  });
}

// Cancelar orden de compra
export function useCancelarOrdenCompra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ success: boolean; data: boolean }>(`/ordenes-compra/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      message.success('Orden cancelada exitosamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al cancelar orden');
    }
  });
}

// Cambiar estado de orden
export function useCambiarEstadoOrden(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CambiarEstadoOrdenDto) => {
      const res = await api.put<{ success: boolean; data: OrdenCompra }>(
        `/ordenes-compra/${id}/estado`,
        data
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra', id] });
      message.success('Estado actualizado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al cambiar estado');
    }
  });
}

// Agregar evento de seguimiento
export function useAgregarSeguimiento(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AgregarSeguimientoDto) => {
      const res = await api.post<{ success: boolean; data: { id: string } }>(
        `/ordenes-compra/${id}/seguimiento`,
        data
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra', id] });
      message.success('Seguimiento agregado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al agregar seguimiento');
    }
  });
}

// Descargar PDF de orden de compra
export function useDownloadOrdenPDF() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.get(`/ordenes-compra/${id}/pdf`, {
        responseType: 'blob'
      });

      // Extraer nombre de archivo del header Content-Disposition
      const contentDisposition = res.headers['content-disposition'];
      let filename = `orden-${id}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      // Crear blob y descargar
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return res.data;
    },
    onSuccess: () => {
      message.success('PDF descargado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al descargar PDF');
    }
  });
}

// Crear ingreso desde orden de compra
export function useCrearIngresoDesdeOrden() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      ordenId: string;
      detalles: Array<{
        producto_id: string;
        cantidad: number;
        precio: number;
        fechaVencimiento?: string;
        fechaFactura?: string;
        serieFactura?: string;
      }>;
    }) => {
      const res = await api.post<{
        success: boolean;
        data: {
          ingresosCreados: Array<{ id: string; producto: string; cantidad: number }>;
          mensaje: string;
        };
      }>(`/ordenes-compra/${params.ordenId}/crear-ingreso`, {
        detalles: params.detalles
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] });
      queryClient.invalidateQueries({ queryKey: ['ingresos'] });
      message.success(data.data.mensaje || 'Ingreso creado exitosamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al crear ingreso');
    }
  });
}
