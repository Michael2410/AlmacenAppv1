import { useStockDisponible } from './useStockDisponible';

interface ValidationItem {
  productoId: string;
  cantidad: number;
  marca?: string;
}

export function useFormValidation(items: ValidationItem[], productos: any[]) {
  const validations = items
    .filter(item => item?.productoId && item?.cantidad)
    .map(item => {
      const producto = productos.find(p => p.id === item.productoId);
      const marca = producto?.marca;
      
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { data: stock, isLoading } = useStockDisponible(item.productoId, marca);
      
      return {
        productoId: item.productoId,
        productoNombre: producto?.nombre || 'Producto',
        cantidad: item.cantidad,
        stock: stock ?? 0,
        isLoading,
        esValido: stock !== undefined && item.cantidad <= stock
      };
    });

  const todosValidos = validations.length > 0 && validations.every(v => v.esValido && !v.isLoading);
  const hayInvalidos = validations.some(v => !v.esValido && !v.isLoading);
  const estaCargando = validations.some(v => v.isLoading);

  return {
    validations,
    todosValidos,
    hayInvalidos,
    estaCargando
  };
}
