import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { EmpresaConfig, UpdateEmpresaConfigDto } from '../types/cotizaciones';
import { message } from 'antd';

export function useEmpresaConfig() {
  return useQuery({
    queryKey: ['empresa', 'config'],
    queryFn: async () => {
      const response = await api.get<{ data: EmpresaConfig }>('/empresa/config');
      return response.data.data;
    }
  });
}

export function useUpdateEmpresaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateEmpresaConfigDto) => {
      const response = await api.post<{ data: EmpresaConfig }>('/empresa/config', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa', 'config'] });
      message.success('Configuración actualizada correctamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al actualizar configuración');
    }
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logoBase64: string) => {
      const response = await api.post<{ data: { logo_path: string } }>('/empresa/logo', {
        logoBase64
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa', 'config'] });
      message.success('Logo actualizado correctamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al subir logo');
    }
  });
}
