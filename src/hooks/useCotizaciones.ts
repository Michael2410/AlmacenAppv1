import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Cotizacion, CreateCotizacionDto } from '../types/cotizaciones';
import { message } from 'antd';

export function useCotizaciones() {
  return useQuery({
    queryKey: ['cotizaciones'],
    queryFn: async () => {
      const response = await api.get<{ data: Cotizacion[] }>('/cotizaciones');
      return response.data.data;
    }
  });
}

export function useCotizacion(id: string | undefined) {
  return useQuery({
    queryKey: ['cotizaciones', id],
    queryFn: async () => {
      const response = await api.get<{ data: Cotizacion }>(`/cotizaciones/${id}`);
      return response.data.data;
    },
    enabled: !!id
  });
}

export function useCreateCotizacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCotizacionDto) => {
      const response = await api.post<{ data: { id: string; numero: string } }>('/cotizaciones', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      message.success(`Cotización ${data.numero} creada correctamente`);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al crear cotización');
    }
  });
}

export function useDownloadCotizacionPDF() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.get(`/cotizaciones/${id}/pdf`, {
        responseType: 'blob'
      });
      return response.data;
    },
    onSuccess: (blob, id) => {
      // Crear URL temporal para descargar el archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cotizacion-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('PDF descargado correctamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al generar PDF');
    }
  });
}
