import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

// Hook para métricas del dashboard
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const response = await api.get('/dashboard/metrics');
      return response.data;
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: 30000, // Actualizar cada 30 segundos
    retry: 2,
  });
}

// Hook para gráficos del dashboard
export function useDashboardCharts() {
  return useQuery({
    queryKey: ['dashboardCharts'],
    queryFn: async () => {
      const response = await api.get('/dashboard/charts');
      return response.data;
    },
    staleTime: 60000, // 1 minuto
    refetchInterval: 60000, // Actualizar cada minuto
    retry: 2,
  });
}

// Hook para actividad reciente
export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: ['recentActivity', limit],
    queryFn: async () => {
      const response = await api.get(`/dashboard/activity?limit=${limit}`);
      return response.data;
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: 30000, // Actualizar cada 30 segundos
    retry: 2,
  });
}
