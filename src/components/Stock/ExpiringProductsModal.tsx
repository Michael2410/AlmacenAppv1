import { Modal, Table, Button, Tag, Empty, Space, Typography } from 'antd';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useProductosProximosVencer } from '../../hooks/useStockDisponible';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ExpiringProductsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ExpiringProductsModal({ open, onClose }: ExpiringProductsModalProps) {
  const { data, isLoading } = useProductosProximosVencer(30);

  const productos = data || [];

  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia) {
      case 'crítica':
        return 'red';
      case 'alta':
        return 'orange';
      case 'media':
        return 'gold';
      default:
        return 'default';
    }
  };

  const getUrgenciaTexto = (urgencia: string) => {
    switch (urgencia) {
      case 'crítica':
        return 'CRÍTICO';
      case 'alta':
        return 'URGENTE';
      case 'media':
        return 'ATENCIÓN';
      default:
        return urgencia;
    }
  };

  const columns = [
    {
      title: 'Producto',
      dataIndex: 'producto_nombre',
      key: 'producto_nombre',
      width: 200,
      render: (text: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.marca || 'Sin marca'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 120,
      align: 'center' as const,
      render: (cantidad: number, record: any) => (
        <Text>{cantidad} {record.unidad}</Text>
      ),
    },
    {
      title: 'Fecha Vencimiento',
      dataIndex: 'fecha_vencimiento',
      key: 'fecha_vencimiento',
      width: 150,
      align: 'center' as const,
      render: (fecha: string) => (
        <Text>{dayjs(fecha).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Días Restantes',
      dataIndex: 'dias_restantes',
      key: 'dias_restantes',
      width: 130,
      align: 'center' as const,
      sorter: (a: any, b: any) => a.dias_restantes - b.dias_restantes,
      render: (dias: number, record: any) => (
        <Tag 
          color={getUrgenciaColor(record.urgencia)}
          style={{ fontSize: '13px', fontWeight: 'bold' }}
        >
          {dias} {dias === 1 ? 'día' : 'días'}
        </Tag>
      ),
    },
    {
      title: 'Urgencia',
      dataIndex: 'urgencia',
      key: 'urgencia',
      width: 120,
      align: 'center' as const,
      filters: [
        { text: 'Crítica', value: 'crítica' },
        { text: 'Alta', value: 'alta' },
        { text: 'Media', value: 'media' },
      ],
      onFilter: (value: any, record: any) => record.urgencia === value,
      render: (urgencia: string) => (
        <Tag color={getUrgenciaColor(urgencia)}>
          {getUrgenciaTexto(urgencia)}
        </Tag>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#faad14', fontSize: '20px' }} />
          <span>Productos Próximos a Vencer</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>,
      ]}
      width={900}
      styles={{ body: { maxHeight: '600px', overflowY: 'auto' } }}
    >
      {productos.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No hay productos próximos a vencer en los próximos 30 días"
        />
      ) : (
        <>
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fffbe6', 
            borderLeft: '4px solid #faad14',
            marginBottom: '16px',
            borderRadius: '4px'
          }}>
            <Text>
              <WarningOutlined style={{ color: '#faad14', marginRight: '8px' }} />
              Se encontraron <Text strong>{productos.length}</Text> producto(s) que vencerán en los próximos 30 días.
            </Text>
          </div>

          {/* Resumen por urgencia */}
          <Space style={{ marginBottom: '16px' }}>
            <Tag color="red">
              Crítico (≤7 días): {productos.filter((p: any) => p.urgencia === 'crítica').length}
            </Tag>
            <Tag color="orange">
              Urgente (≤15 días): {productos.filter((p: any) => p.urgencia === 'alta').length}
            </Tag>
            <Tag color="gold">
              Atención (≤30 días): {productos.filter((p: any) => p.urgencia === 'media').length}
            </Tag>
          </Space>

          <Table
            dataSource={productos}
            columns={columns}
            loading={isLoading}
            rowKey={(record) => record.ingreso_id}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Total: ${total} productos`,
            }}
            size="small"
          />
        </>
      )}
    </Modal>
  );
}
