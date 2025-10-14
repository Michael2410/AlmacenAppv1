import { Modal, Table, Button, Tag, Empty, Space, Typography } from 'antd';
import { ShoppingCartOutlined, WarningOutlined } from '@ant-design/icons';
import { useLowStock } from '../../hooks/useStockDisponible';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface LowStockModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LowStockModal({ open, onClose }: LowStockModalProps) {
  const { data, isLoading } = useLowStock();
  const navigate = useNavigate();

  const productos = data || []; // El hook ya devuelve data.data directamente

  const handleCreatePedido = (producto: any) => {
    // Cerrar modal y navegar a crear pedido con el producto preseleccionado
    onClose();
    navigate('/pedidos/mios?producto=' + producto.producto_id);
  };

  const columns = [
    {
      title: 'Producto',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 250,
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
      title: 'Stock Actual',
      dataIndex: 'stock_actual',
      key: 'stock_actual',
      width: 120,
      align: 'center' as const,
      render: (stock: number, record: any) => {
        const porcentaje = (stock / record.stock_minimo) * 100;
        let color = 'red';
        if (porcentaje > 50) color = 'orange';
        if (porcentaje > 80) color = 'gold';

        return (
          <Tag color={color} style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {stock} {record.unidad_medida || 'unidades'}
          </Tag>
        );
      },
    },
    {
      title: 'Stock Mínimo',
      dataIndex: 'stock_minimo',
      key: 'stock_minimo',
      width: 120,
      align: 'center' as const,
      render: (text: number, record: any) => (
        <Text>{text} {record.unidad_medida || 'unidades'}</Text>
      ),
    },
    {
      title: 'Faltante',
      key: 'faltante',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const faltante = record.stock_minimo - record.stock_actual;
        return (
          <Text type="danger" strong>
            {faltante > 0 ? faltante : 0} {record.unidad_medida || 'unidades'}
          </Text>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button
          type="primary"
          size="small"
          icon={<ShoppingCartOutlined />}
          onClick={() => handleCreatePedido(record)}
        >
          Crear Pedido
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />
          <span>Productos con Stock Bajo</span>
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
          description="No hay productos con stock bajo"
        />
      ) : (
        <>
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fff7e6', 
            borderLeft: '4px solid #faad14',
            marginBottom: '16px',
            borderRadius: '4px'
          }}>
            <Text>
              <WarningOutlined style={{ color: '#faad14', marginRight: '8px' }} />
              Se encontraron <Text strong>{productos.length}</Text> producto(s) con stock por debajo del mínimo recomendado.
            </Text>
          </div>

          <Table
            dataSource={productos}
            columns={columns}
            loading={isLoading}
            rowKey={(record) => `${record.producto_id}-${record.marca || 'sin-marca'}`}
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
