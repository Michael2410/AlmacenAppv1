import { Row, Col, Typography, Divider } from 'antd';
import {
  ShoppingCartOutlined,
  WarningOutlined,
  TruckOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import MetricCard from '../../components/Dashboard/MetricCard';
import PedidosChart from '../../components/Dashboard/PedidosChart';
import EstadosChart from '../../components/Dashboard/EstadosChart';
import ProductosChart from '../../components/Dashboard/ProductosChart';
import ActivityTimeline from '../../components/Dashboard/ActivityTimeline';
import LowStockModal from '../../components/Stock/LowStockModal';
import ExpiringProductsModal from '../../components/Stock/ExpiringProductsModal';
import { useDashboardMetrics } from '../../hooks/useDashboard';
import { useProductosProximosVencer } from '../../hooks/useStockDisponible';

const { Title } = Typography;

export default function DashboardPage() {
  const { data, isLoading } = useDashboardMetrics();
  const { data: productosVencer } = useProductosProximosVencer(30);
  const [lowStockModalOpen, setLowStockModalOpen] = useState(false);
  const [expiringModalOpen, setExpiringModalOpen] = useState(false);

  const metrics = data?.data || {};
  const productosProximosVencer = productosVencer?.length || 0;

  return (
    <div>
      <Title level={2}>Dashboard</Title>
      <Divider />

      {/* KPIs Grid */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <MetricCard
            title="Pedidos Pendientes"
            value={metrics.pedidosPendientes || 0}
            loading={isLoading}
            icon={<ShoppingCartOutlined />}
            color="#1890ff"
            trend={
              metrics.pedidosPendientesTrend
                ? {
                    value: metrics.pedidosPendientesTrend,
                    isPositive: metrics.pedidosPendientesTrend > 0,
                  }
                : undefined
            }
          />
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <MetricCard
            title="Stock Crítico"
            value={metrics.productosStockBajo || 0}
            loading={isLoading}
            icon={<WarningOutlined />}
            color="#ff4d4f"
            suffix="productos"
            onClick={() => setLowStockModalOpen(true)}
            style={{ cursor: 'pointer' }}
          />
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <MetricCard
            title="Próximos a Vencer"
            value={productosProximosVencer}
            loading={isLoading}
            icon={<ClockCircleOutlined />}
            color="#faad14"
            suffix="productos"
            onClick={() => setExpiringModalOpen(true)}
            style={{ cursor: 'pointer' }}
          />
        </Col>

        <Col xs={24} sm={12} lg={12}>
          <MetricCard
            title="Entregas Hoy"
            value={metrics.entregasHoy || 0}
            loading={isLoading}
            icon={<TruckOutlined />}
            color="#52c41a"
            trend={
              metrics.entregasHoyTrend
                ? {
                    value: metrics.entregasHoyTrend,
                    isPositive: metrics.entregasHoyTrend > 0,
                  }
                : undefined
            }
          />
        </Col>

        <Col xs={24} sm={12} lg={12}>
          <MetricCard
            title="Usuarios Activos"
            value={metrics.usuariosActivos || 0}
            loading={isLoading}
            icon={<UserOutlined />}
            color="#722ed1"
          />
        </Col>
      </Row>

      {/* Gráficos y Actividad */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        {/* Gráfico de Pedidos (Línea) */}
        <Col xs={24} lg={12}>
          <PedidosChart />
        </Col>

        {/* Gráfico de Estados (Dona) */}
        <Col xs={24} lg={12}>
          <EstadosChart />
        </Col>

        {/* Gráfico de Productos (Barras) */}
        <Col xs={24} lg={16}>
          <ProductosChart />
        </Col>

        {/* Timeline de Actividad */}
        <Col xs={24} lg={8}>
          <ActivityTimeline />
        </Col>
      </Row>

      {/* Modal de Stock Bajo */}
      <LowStockModal 
        open={lowStockModalOpen} 
        onClose={() => setLowStockModalOpen(false)} 
      />

      {/* Modal de Productos Próximos a Vencer */}
      <ExpiringProductsModal 
        open={expiringModalOpen} 
        onClose={() => setExpiringModalOpen(false)} 
      />
    </div>
  );
}
