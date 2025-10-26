import { useState } from 'react';
import type { TablePaginationConfig } from 'antd';

interface UseTablePaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: string[];
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
}

/**
 * Hook para manejar paginación estandarizada de tablas
 * @param options - Opciones de configuración de paginación
 * @returns Configuración de paginación para Ant Design Table
 */
export function useTablePagination(options: UseTablePaginationOptions = {}) {
  const {
    defaultPageSize = 10,
    pageSizeOptions = ['10', '20', '50', '100'],
    showSizeChanger = true,
    showQuickJumper = true,
    showTotal = true,
  } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const paginationConfig: TablePaginationConfig = {
    current: currentPage,
    pageSize: pageSize,
    showSizeChanger,
    showQuickJumper,
    pageSizeOptions,
    onChange: (page, size) => {
      setCurrentPage(page);
      if (size !== pageSize) {
        setPageSize(size);
        setCurrentPage(1); // Reset a primera página cuando cambia el tamaño
      }
    },
    onShowSizeChange: (_current, size) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    showTotal: showTotal
      ? (total, range) => `${range[0]}-${range[1]} de ${total} registros`
      : undefined,
    locale: {
      items_per_page: '/ página',
      jump_to: 'Ir a',
      jump_to_confirm: 'confirmar',
      page: 'Página',
      prev_page: 'Página anterior',
      next_page: 'Página siguiente',
      prev_5: '5 páginas previas',
      next_5: '5 páginas siguientes',
      prev_3: '3 páginas previas',
      next_3: '3 páginas siguientes',
    },
  };

  const resetPagination = () => {
    setCurrentPage(1);
    setPageSize(defaultPageSize);
  };

  return {
    paginationConfig,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    resetPagination,
  };
}

/**
 * Configuración de paginación por defecto lista para usar
 * Útil cuando no necesitas controlar el estado de la paginación
 */
export const defaultPaginationConfig: TablePaginationConfig = {
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`,
  locale: {
    items_per_page: '/ página',
    jump_to: 'Ir a',
    jump_to_confirm: 'confirmar',
    page: 'Página',
    prev_page: 'Página anterior',
    next_page: 'Página siguiente',
    prev_5: '5 páginas previas',
    next_5: '5 páginas siguientes',
    prev_3: '3 páginas previas',
    next_3: '3 páginas siguientes',
  },
};
