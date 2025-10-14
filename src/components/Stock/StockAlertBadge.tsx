import { Badge, Spin } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useLowStock } from '../../hooks/useStockDisponible';

interface StockAlertBadgeProps {
  onClick?: () => void;
}

export default function StockAlertBadge({ onClick }: StockAlertBadgeProps) {
  const { data, isLoading, isError } = useLowStock();

  // No mostrar si hay error
  if (isError) {
    return null;
  }

  // Mostrar loading
  if (isLoading) {
    return (
      <div style={{ 
        padding: '8px 16px', 
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#fff'
      }} onClick={onClick}>
        <Spin size="small" />
        <span>Stock Bajo</span>
      </div>
    );
  }

  const count = data?.length || 0; // El hook devuelve directamente el array

  // No mostrar si no hay productos con stock bajo
  if (count === 0) {
    return null;
  }

  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px 16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#fff',
        backgroundColor: 'rgba(255, 77, 79, 0.1)',
        borderLeft: '3px solid #ff4d4f',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 77, 79, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 77, 79, 0.1)';
      }}
    >
      <Badge 
        count={count} 
        offset={[5, -2]}
        style={{
          animation: 'pulse 2s ease-in-out infinite',
        }}
      >
        <WarningOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} />
      </Badge>
      <span style={{ fontSize: '14px' }}>Stock Bajo</span>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
