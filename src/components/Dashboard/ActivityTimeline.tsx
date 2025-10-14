import { Card, Timeline, Typography, Tag, Spin, Empty } from 'antd';
import {
  LoginOutlined,
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useRecentActivity } from '../../hooks/useDashboard';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Text } = Typography;

const getActionIcon = (action: string) => {
  switch (action) {
    case 'LOGIN':
      return <LoginOutlined style={{ color: '#1890ff' }} />;
    case 'LOGIN_FAILED':
      return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
    case 'CREATE':
      return <PlusCircleOutlined style={{ color: '#52c41a' }} />;
    case 'UPDATE':
      return <EditOutlined style={{ color: '#faad14' }} />;
    case 'DELETE':
      return <DeleteOutlined style={{ color: '#f5222d' }} />;
    case 'ASIGNACION':
    case 'LOTE_ENTREGADO':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    default:
      return <EditOutlined style={{ color: '#8c8c8c' }} />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'LOGIN':
      return 'blue';
    case 'LOGIN_FAILED':
      return 'red';
    case 'CREATE':
      return 'green';
    case 'UPDATE':
      return 'orange';
    case 'DELETE':
      return 'red';
    case 'ASIGNACION':
    case 'LOTE_ENTREGADO':
      return 'green';
    default:
      return 'default';
  }
};

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    LOGIN: 'Inicio de sesión',
    LOGIN_FAILED: 'Inicio fallido',
    CREATE: 'Creación',
    UPDATE: 'Actualización',
    DELETE: 'Eliminación',
    ASIGNACION: 'Asignación',
    LOTE_ENTREGADO: 'Entrega',
  };
  return labels[action] || action;
};

export default function ActivityTimeline() {
  const { data, isLoading } = useRecentActivity(10);

  if (isLoading) {
    return (
      <Card title="Actividad Reciente" variant="outlined" className="shadow-sm">
        <div className="flex items-center justify-center h-64">
          <Spin />
        </div>
      </Card>
    );
  }

  const activities = data?.data || [];

  if (activities.length === 0) {
    return (
      <Card title="Actividad Reciente" variant="outlined" className="shadow-sm">
        <Empty description="No hay actividad reciente" />
      </Card>
    );
  }

  const timelineItems = activities.map((activity: any) => {
    // Formato nuevo: desde tabla auditoria
    if (activity.accion && activity.modulo) {
      return {
        dot: getActionIcon(activity.accion),
        children: (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Tag color={getActionColor(activity.accion)}>
                {getActionLabel(activity.accion)}
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {dayjs(activity.fecha_hora).format('DD/MM/YYYY HH:mm')}
              </Text>
            </div>
            <div>
              <Text strong>{activity.usuario_nombre}</Text>
              {activity.modulo && (
                <Text type="secondary"> en {activity.modulo}</Text>
              )}
            </div>
            {activity.descripcion && (
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                {activity.descripcion}
              </Text>
            )}
          </div>
        ),
      };
    }
    
    // Formato antiguo: fallback desde pedidos/ingresos
    const isPedido = activity.tipo === 'pedido';
    const action = isPedido ? 'CREATE' : 'CREATE';
    const color = isPedido ? 'blue' : 'green';
    
    return {
      dot: getActionIcon(action),
      children: (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Tag color={color}>
              {isPedido ? 'Pedido' : 'Ingreso'}
            </Tag>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {dayjs(activity.fecha).format('DD/MM/YYYY HH:mm')}
            </Text>
          </div>
          <div>
            {activity.usuario && <Text strong>{activity.usuario}</Text>}
            <Text type="secondary">
              {isPedido ? ' solicitó ' : ' ingresó '}
              <Text strong>{activity.cantidad}</Text> de{' '}
              <Text strong>{activity.producto}</Text>
            </Text>
          </div>
          {isPedido && activity.estado && (
            <Tag color={activity.estado === 'entregado' ? 'green' : 'orange'} style={{ marginTop: '4px', fontSize: '11px' }}>
              {activity.estado.toUpperCase()}
            </Tag>
          )}
        </div>
      ),
    };
  });

  return (
    <Card 
      title="Actividad Reciente" 
      variant="outlined" 
      className="shadow-sm"
      style={{ height: '100%' }}
    >
      <Timeline items={timelineItems} mode="left" />
    </Card>
  );
}
