import { Card, Statistic, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

interface MetricCardProps {
  title: string;
  value: number | string;
  loading?: boolean;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  suffix?: string;
  color?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function MetricCard({
  title,
  value,
  loading,
  icon,
  trend,
  suffix,
  color = '#1890ff',
  onClick,
  style,
}: MetricCardProps) {
  return (
    <Card 
      variant="outlined" 
      className="shadow-sm hover:shadow-md transition-shadow"
      onClick={onClick}
      style={style}
    >
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Spin />
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Statistic
              title={title}
              value={value}
              suffix={suffix}
              valueStyle={{ color, fontSize: '28px', fontWeight: 'bold' }}
            />
            {trend && (
              <div className="mt-2">
                <span
                  className={`text-sm ${
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {trend.isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {' '}{Math.abs(trend.value)}%
                  <span className="text-gray-500 ml-2">vs. semana anterior</span>
                </span>
              </div>
            )}
          </div>
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: `${color}15`,
            }}
          >
            <span style={{ fontSize: '28px', color }}>{icon}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
