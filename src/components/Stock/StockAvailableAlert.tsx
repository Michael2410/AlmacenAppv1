import { Alert, Space, Spin } from 'antd';
import { CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useStockDisponible } from '../../hooks/useStockDisponible';

interface StockAvailableAlertProps {
  productoId?: string;
  marca?: string;
  cantidadSolicitada: number;
  className?: string;
}

export function StockAvailableAlert({ 
  productoId, 
  marca, 
  cantidadSolicitada,
  className 
}: StockAvailableAlertProps) {
  const { data: stockDisponible, isLoading, isError } = useStockDisponible(productoId, marca);

  // No mostrar nada si no hay producto seleccionado
  if (!productoId) {
    return null;
  }

  // Mostrar loading mientras consulta
  if (isLoading) {
    return (
      <Alert
        message={
          <Space>
            <Spin size="small" />
            <span>Consultando stock disponible...</span>
          </Space>
        }
        type="info"
        showIcon={false}
        className={className}
      />
    );
  }

  // Mostrar error si falla la consulta
  if (isError) {
    return (
      <Alert
        message="No se pudo consultar el stock disponible"
        description="Por favor, intenta de nuevo más tarde"
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        className={className}
      />
    );
  }

  const stock = stockDisponible ?? 0;
  const haySuficiente = stock >= cantidadSolicitada;
  const faltante = cantidadSolicitada - stock;

  // Stock suficiente
  if (haySuficiente) {
    return (
      <Alert
        message="Stock disponible"
        description={
          <div>
            <div style={{ marginBottom: 4 }}>
              <strong>Disponible:</strong> {stock} unidades
            </div>
            <div style={{ color: '#52c41a' }}>
              ✓ Suficiente para tu pedido ({cantidadSolicitada} unidades)
            </div>
          </div>
        }
        type="success"
        showIcon
        icon={<CheckCircleOutlined />}
        className={className}
      />
    );
  }

  // Stock insuficiente
  return (
    <Alert
      message="⚠️ Stock insuficiente"
      description={
        <div>
          <div style={{ marginBottom: 4 }}>
            <strong>Disponible:</strong> {stock} unidades
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>Solicitado:</strong> {cantidadSolicitada} unidades
          </div>
          <div style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
            ✗ Faltan {faltante} unidades
          </div>
          <div style={{ marginTop: 8, fontSize: '12px', color: '#8c8c8c' }}>
            Reduce la cantidad o espera reabastecimiento
          </div>
        </div>
      }
      type="error"
      showIcon
      icon={<CloseCircleOutlined />}
      className={className}
    />
  );
}
