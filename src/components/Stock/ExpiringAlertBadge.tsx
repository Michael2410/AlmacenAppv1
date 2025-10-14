import { Badge, Spin } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useProductosProximosVencer } from '../../hooks/useStockDisponible';

interface ExpiringAlertBadgeProps {
  onClick?: () => void;
}

export default function ExpiringAlertBadge({ onClick }: ExpiringAlertBadgeProps) {
  const { data, isLoading, isError } = useProductosProximosVencer(30);

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
        <span>Por Vencer</span>
      </div>
    );
  }

  const productos = data || [];
  const count = productos.length;
  const criticos = productos.filter((p: any) => p.urgencia === 'crítica').length;

  // No mostrar si no hay productos próximos a vencer
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
        backgroundColor: criticos > 0 ? 'rgba(255, 77, 79, 0.1)' : 'rgba(250, 173, 20, 0.1)',
        borderLeft: `3px solid ${criticos > 0 ? '#ff4d4f' : '#faad14'}`,
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = criticos > 0 ? 'rgba(255, 77, 79, 0.2)' : 'rgba(250, 173, 20, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = criticos > 0 ? 'rgba(255, 77, 79, 0.1)' : 'rgba(250, 173, 20, 0.1)';
      }}
    >
      <Badge 
        count={count} 
        offset={[5, -2]}
        style={{
          animation: criticos > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
        }}
      >
        <ClockCircleOutlined style={{ fontSize: '16px', color: criticos > 0 ? '#ff4d4f' : '#faad14' }} />
      </Badge>
      <span style={{ fontSize: '14px' }}>
        {criticos > 0 ? 'Vencen Pronto' : 'Por Vencer'}
      </span>
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
