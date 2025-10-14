import { Card, Spin, Empty } from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useDashboardCharts } from '../../hooks/useDashboard';

export default function PedidosChart() {
  const { data, isLoading } = useDashboardCharts();

  if (isLoading) {
    return (
      <Card title="Pedidos Últimos 7 Días" variant="outlined" className="shadow-sm">
        <div className="flex items-center justify-center h-64">
          <Spin />
        </div>
      </Card>
    );
  }

  const chartData = data?.data?.pedidosUltimos7Dias || [];

  if (chartData.length === 0) {
    return (
      <Card title="Pedidos Últimos 7 Días" variant="outlined" className="shadow-sm">
        <Empty description="No hay datos disponibles" />
      </Card>
    );
  }

  return (
    <Card title="Pedidos Últimos 7 Días" variant="outlined" className="shadow-sm">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fecha" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="cantidad"
            stroke="#1890ff"
            strokeWidth={2}
            activeDot={{ r: 8 }}
            name="Pedidos"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
