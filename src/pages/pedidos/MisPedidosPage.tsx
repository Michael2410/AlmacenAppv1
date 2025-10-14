import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Button, Typography, Tag, message, Modal, Form, Table, List } from 'antd';
import { PlusOutlined, ShoppingCartOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ProductoFormItem } from '../../components/Stock/ProductoFormItem';

const { Title, Text } = Typography;

interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  unidad?: string;
  unidadMedida?: string;
  categoria?: string;
  marca?: string;
  areaId?: string;
  ubicacionId?: string;
  activo?: number;
}

interface Pedido {
  id: string;
  usuarioId: string;
  productoId: string;
  cantidad: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'entregado';
  fechaSolicitud: string;
  fechaRespuesta?: string;
  observaciones?: string;
  producto?: Producto;
}

const MisPedidosPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detalleModal, setDetalleModal] = useState<{ open: boolean; lote?: any }>({ open: false });
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const token = useAuthStore(s => s.token);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pedidos/mios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        message.error('Sesión expirada, por favor inicia sesión nuevamente');
        navigate('/login');
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setPedidos(data.data);
      }
    } catch (error) {
      message.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      if (!token) {
        message.error('No estás autenticado. Inicia sesión nuevamente.');
        navigate('/login');
        return;
      }
      
      const response = await fetch('/api/productos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        message.error('Sesión expirada, por favor inicia sesión nuevamente');
        navigate('/login');
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setProductos(data.data);
      } else {
        message.error(data.message || 'Error al cargar productos');
      }
    } catch (error) {
      message.error('Error de conexión al cargar productos');
    }
  };

  useEffect(() => {
    fetchPedidos();
    fetchProductos();
  }, []);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'orange';
      case 'aprobado': return 'blue';
      case 'entregado': return 'green';
      case 'rechazado': return 'red';
      default: return 'default';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <ClockCircleOutlined />;
      case 'aprobado': return <CheckCircleOutlined />;
      case 'entregado': return <CheckCircleOutlined />;
      case 'rechazado': return <CloseCircleOutlined />;
      default: return null;
    }
  };

  // Agrupar pedidos por loteId
  const lotes = useMemo(() => {
    const grupos: any = {};
    pedidos.forEach((pedido: any) => {
      const loteId = pedido.loteId || pedido.id; // fallback para pedidos viejos sin loteId
      if (!grupos[loteId]) {
        grupos[loteId] = {
          loteId,
          usuarioId: pedido.usuarioId,
          fecha: pedido.fechaSolicitud,
          estado: pedido.estado,
          items: []
        };
      }
      grupos[loteId].items.push({
        id: pedido.id,
        productoId: pedido.productoId,
        productoNombre: pedido.producto?.nombre || 'Producto',
        cantidad: pedido.cantidad,
        unidad: pedido.producto?.unidadMedida || pedido.producto?.unidad || 'UNIDAD',
        marca: pedido.producto?.marca
      });
    });
    return Object.values(grupos);
  }, [pedidos]);

  const verDetalle = (lote: any) => {
    setDetalleModal({ open: true, lote });
  };

  const estadisticas = {
    total: lotes.length,
    pendientes: lotes.filter((l: any) => l.estado === 'pendiente').length,
    aprobados: lotes.filter((l: any) => l.estado === 'aprobado').length,
    entregados: lotes.filter((l: any) => l.estado === 'entregado').length,
    rechazados: lotes.filter((l: any) => l.estado === 'rechazado').length,
  };

  const columns = [
    {
      title: 'Productos',
      key: 'productos',
      render: (_: any, r: any) => (
        <div>
          <Tag color="blue">{r.items.length} producto{r.items.length > 1 ? 's' : ''}</Tag>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => verDetalle(r)}>
            Ver detalle
          </Button>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: string) => {
        const estadoUpper = estado?.toUpperCase() || estado;
        return (
          <Tag icon={getEstadoIcon(estado)} color={getEstadoColor(estado)}>
            {estadoUpper}
          </Tag>
        );
      },
    },
    {
      title: 'Fecha Solicitud',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (fecha: string) => dayjs(fecha).format('DD/MM/YYYY HH:mm'),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                {estadisticas.total}
              </Title>
              <Text type="secondary">Total Pedidos</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={2} style={{ margin: 0, color: '#fa8c16' }}>
                {estadisticas.pendientes}
              </Title>
              <Text type="secondary">Pendientes</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={2} style={{ margin: 0, color: '#52c41a' }}>
                {estadisticas.entregados}
              </Title>
              <Text type="secondary">Entregados</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={2} style={{ margin: 0, color: '#f5222d' }}>
                {estadisticas.rechazados}
              </Title>
              <Text type="secondary">Rechazados</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Contenido principal */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={4} style={{ margin: 0 }}>
            <ShoppingCartOutlined style={{ marginRight: 8 }} />
            Mis Solicitudes de Productos
          </Title>
          
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setModalVisible(true);
            }}
            size="large"
          >
            Nueva Solicitud
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={lotes}
          rowKey="loteId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} pedidos`,
          }}
        />
      </Card>

      {/* Modal de detalle de productos */}
      <Modal
        open={detalleModal.open}
        title="Detalle del Pedido"
        onCancel={() => setDetalleModal({ open: false })}
        footer={[
          <Button key="close" onClick={() => setDetalleModal({ open: false })}>
            Cerrar
          </Button>
        ]}
        width={600}
      >
        {detalleModal.lote && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Fecha de solicitud: </Text>
              <Text>{dayjs(detalleModal.lote.fecha).format('DD/MM/YYYY HH:mm')}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Estado: </Text>
              <Tag icon={getEstadoIcon(detalleModal.lote.estado)} color={getEstadoColor(detalleModal.lote.estado)}>
                {detalleModal.lote.estado.toUpperCase()}
              </Tag>
            </div>
            <List
              header={<Text strong>Productos solicitados:</Text>}
              dataSource={detalleModal.lote.items}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${item.productoNombre}${item.marca ? ` - ${item.marca}` : ''}`}
                    description={`Cantidad: ${item.cantidad} ${item.unidad}`}
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>

      {/* Modal para nuevo pedido */}
      <Modal
        title="📝 Nueva Solicitud de Producto"
        open={modalVisible}
  onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            items: [{ productoId: '', cantidad: '' }]
          }}
          onFinish={async (values) => {
            try {
              const items = Array.isArray(values.items) ? values.items
                .filter((it: any) => it && it.productoId && it.cantidad)
                .map((it: any) => ({
                  productoId: it.productoId,
                  cantidad: Number(it.cantidad)
                })) : [];

              if (!items.length) {
                message.error('Agrega al menos un producto con cantidad válida');
                return;
              }

              const response = await fetch('/api/pedidos/batch', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ items })
              });

              const data = await response.json();
              
              if (data.success) {
                message.success('¡Pedido(s) creado(s) exitosamente!');
                setModalVisible(false);
                form.resetFields();
                fetchPedidos(); // Recargar la lista
              } else {
                message.error(data.message || 'Error al crear pedido');
              }
            } catch (error) {
              console.error('Error creando pedido:', error);
              message.error('Error de conexión al crear pedido');
            }
          }}
        >
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <ProductoFormItem
                    key={field.key}
                    field={field}
                    productos={productos}
                    onRemove={() => remove(field.name)}
                    form={form}
                    showLabel={index === 0}
                  />
                ))}
                <Button 
                  type="dashed" 
                  onClick={() => add({ productoId: '', cantidad: '' })} 
                  block
                  style={{ marginTop: 16 }}
                >
                  + Agregar producto
                </Button>
              </>
            )}
          </Form.List>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button 
              onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              style={{ marginRight: 8 }}
            >
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">🚀 Enviar Solicitud</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MisPedidosPage;
