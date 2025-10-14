import { Card, Spin, Empty } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useDashboardCharts } from '../../hooks/useDashboard';

export default function ProductosChart() {
  const { data, isLoading } = useDashboardCharts();

  if (isLoading) {
    return (
      <Card title="Productos Más Pedidos" variant="outlined" className="shadow-sm">
        <div className="flex items-center justify-center h-64">
          <Spin />
        </div>
      </Card>
    );
  }

  const chartData = data?.data?.productosMasPedidos || [];

  if (chartData.length === 0) {
    return (
      <Card title="Productos Más Pedidos" variant="outlined" className="shadow-sm">
        <Empty description="No hay datos disponibles" />
      </Card>
    );
  }

  return (
    <Card title="Productos Más Pedidos (Top 10)" variant="outlined" className="shadow-sm">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="nombre" type="category" width={150} />
          <Tooltip />
          <Legend />
          <Bar dataKey="cantidad" fill="#1890ff" name="Cantidad Pedida" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
