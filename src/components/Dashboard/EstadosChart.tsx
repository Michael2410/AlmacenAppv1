import { Card, Spin, Empty } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useDashboardCharts } from '../../hooks/useDashboard';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];

export default function EstadosChart() {
  const { data, isLoading } = useDashboardCharts();

  if (isLoading) {
    return (
      <Card title="Distribución por Estado" variant="outlined" className="shadow-sm">
        <div className="flex items-center justify-center h-64">
          <Spin />
        </div>
      </Card>
    );
  }

  const chartData = data?.data?.distribucionPorEstado || [];

  if (chartData.length === 0) {
    return (
      <Card title="Distribución por Estado" variant="outlined" className="shadow-sm">
        <Empty description="No hay datos disponibles" />
      </Card>
    );
  }

  return (
    <Card title="Distribución por Estado" variant="outlined" className="shadow-sm">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((_entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
