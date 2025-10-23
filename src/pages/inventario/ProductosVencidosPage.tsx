import { useState } from 'react';
import { Card, Table, Button, Space, Statistic, Row, Col, Tag, Modal, Form, InputNumber, Input, Select, Alert } from 'antd';
import { ExclamationCircleOutlined, DeleteOutlined, RollbackOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { 
  useProductosVencidos, 
  useDarDeBaja, 
  useDevolverProveedor,
  type ProductoVencido,
  type BajaInventario,
  type DevolucionProveedor
} from '../../hooks/useProductosVencidos';
import { useAuthStore } from '../../store/auth.store';

const { TextArea } = Input;

export default function ProductosVencidosPage() {
  const hasPermission = useAuthStore(s => s.hasPermission);
  const { data: productos, isLoading } = useProductosVencidos();
  const [modalBaja, setModalBaja] = useState(false);
  const [modalDevolucion, setModalDevolucion] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoVencido | null>(null);
  const [formBaja] = Form.useForm();
  const [formDevolucion] = Form.useForm();

  const darDeBajaMutation = useDarDeBaja();
  const devolverMutation = useDevolverProveedor();

  // Permisos
  const canBaja = hasPermission(['vencidos.baja']);
  const canDevolucion = hasPermission(['vencidos.devolucion']);

  // Calcular estadísticas
  const totalProductos = productos?.length || 0;
  const totalValor = productos?.reduce((sum, p) => sum + p.valor_total, 0) || 0;
  const totalCantidad = productos?.reduce((sum, p) => sum + p.cantidad_disponible, 0) || 0;

  // Handlers
  const handleDarDeBaja = (producto: ProductoVencido) => {
    setProductoSeleccionado(producto);
    formBaja.setFieldsValue({
      cantidad: producto.cantidad_disponible,
      motivo: 'VENCIDO'
    });
    setModalBaja(true);
  };

  const handleDevolver = (producto: ProductoVencido) => {
    setProductoSeleccionado(producto);
    formDevolucion.setFieldsValue({
      cantidad: producto.cantidad_disponible
    });
    setModalDevolucion(true);
  };

  const onFinishBaja = async (values: any) => {
    if (!productoSeleccionado) return;

    const data: BajaInventario = {
      ingreso_id: productoSeleccionado.ingreso_id,
      cantidad: values.cantidad,
      motivo: values.motivo,
      observacion: values.observacion
    };

    await darDeBajaMutation.mutateAsync(data);
    setModalBaja(false);
    formBaja.resetFields();
  };

  const onFinishDevolucion = async (values: any) => {
    if (!productoSeleccionado) return;

    const data: DevolucionProveedor = {
      ingreso_id: productoSeleccionado.ingreso_id,
      cantidad: values.cantidad,
      motivo: values.motivo,
      observacion: values.observacion
    };

    await devolverMutation.mutateAsync(data);
    setModalDevolucion(false);
    formDevolucion.resetFields();
  };

  const columns = [
    {
      title: 'Producto',
      dataIndex: 'producto_nombre',
      key: 'producto_nombre',
      render: (text: string, record: ProductoVencido) => (
        <div>
          <div className="font-medium">{text}</div>
          {record.marca && <div className="text-xs text-gray-500">{record.marca}</div>}
        </div>
      )
    },
    {
      title: 'Proveedor',
      dataIndex: 'proveedor_nombre',
      key: 'proveedor_nombre'
    },
    {
      title: 'Cantidad Disponible',
      dataIndex: 'cantidad_disponible',
      key: 'cantidad_disponible',
      render: (cantidad: number, record: ProductoVencido) => (
        <span>{cantidad} {record.unidad}</span>
      )
    },
    {
      title: 'Fecha Vencimiento',
      dataIndex: 'fecha_vencimiento',
      key: 'fecha_vencimiento',
      render: (fecha: string) => dayjs(fecha).format('DD/MM/YYYY'),
      sorter: (a: ProductoVencido, b: ProductoVencido) => 
        dayjs(a.fecha_vencimiento).unix() - dayjs(b.fecha_vencimiento).unix()
    },
    {
      title: 'Días Vencido',
      dataIndex: 'dias_vencido',
      key: 'dias_vencido',
      render: (dias: number) => (
        <Tag color={dias > 30 ? 'red' : dias > 15 ? 'orange' : 'gold'}>
          {dias} días
        </Tag>
      ),
      sorter: (a: ProductoVencido, b: ProductoVencido) => b.dias_vencido - a.dias_vencido
    },
    {
      title: 'Valor Total',
      dataIndex: 'valor_total',
      key: 'valor_total',
      render: (valor: number) => `S/. ${valor.toFixed(2)}`,
      sorter: (a: ProductoVencido, b: ProductoVencido) => a.valor_total - b.valor_total
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_: any, record: ProductoVencido) => (
        <Space size="small">
          {canBaja && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDarDeBaja(record)}
            >
              Dar de Baja
            </Button>
          )}
          {canDevolucion && (
            <Button
              size="small"
              icon={<RollbackOutlined />}
              onClick={() => handleDevolver(record)}
            >
              Devolver
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Productos Vencidos</h1>
      </div>

      <Alert
        message="Gestión de Productos Vencidos"
        description="Esta vista muestra todos los productos que han superado su fecha de vencimiento y aún tienen stock disponible. Puede dar de baja o devolver al proveedor estos productos."
        type="warning"
        showIcon
        icon={<ExclamationCircleOutlined />}
        closable
      />

      {/* Estadísticas */}
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Productos Vencidos"
              value={totalProductos}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Cantidad Total"
              value={totalCantidad.toFixed(2)}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Valor Total en Riesgo"
              value={totalValor.toFixed(2)}
              prefix="S/."
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabla */}
      <Card>
        <Table
          dataSource={productos}
          columns={columns}
          rowKey="ingreso_id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} productos`
          }}
        />
      </Card>

      {/* Modal Dar de Baja */}
      <Modal
        title="Dar de Baja Producto"
        open={modalBaja}
        onCancel={() => {
          setModalBaja(false);
          formBaja.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={formBaja}
          layout="vertical"
          onFinish={onFinishBaja}
        >
          <Alert
            message={
              <div>
                <div><strong>Producto:</strong> {productoSeleccionado?.producto_nombre}</div>
                <div><strong>Disponible:</strong> {productoSeleccionado?.cantidad_disponible} {productoSeleccionado?.unidad}</div>
              </div>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="cantidad"
            label="Cantidad a dar de baja"
            rules={[
              { required: true, message: 'Ingrese la cantidad' },
              {
                type: 'number',
                max: productoSeleccionado?.cantidad_disponible || 0,
                message: `Máximo ${productoSeleccionado?.cantidad_disponible}`
              }
            ]}
          >
            <InputNumber
              min={0.01}
              max={productoSeleccionado?.cantidad_disponible}
              style={{ width: '100%' }}
              addonAfter={productoSeleccionado?.unidad}
            />
          </Form.Item>

          <Form.Item
            name="motivo"
            label="Motivo"
            rules={[{ required: true, message: 'Seleccione el motivo' }]}
          >
            <Select>
              <Select.Option value="VENCIDO">Vencido</Select.Option>
              <Select.Option value="DAÑADO">Dañado</Select.Option>
              <Select.Option value="OBSOLETO">Obsoleto</Select.Option>
              <Select.Option value="OTRO">Otro</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="observacion"
            label="Observaciones"
          >
            <TextArea rows={3} placeholder="Detalles adicionales (opcional)" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" danger htmlType="submit" loading={darDeBajaMutation.isPending}>
                Dar de Baja
              </Button>
              <Button onClick={() => {
                setModalBaja(false);
                formBaja.resetFields();
              }}>
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Devolución */}
      <Modal
        title="Devolver a Proveedor"
        open={modalDevolucion}
        onCancel={() => {
          setModalDevolucion(false);
          formDevolucion.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={formDevolucion}
          layout="vertical"
          onFinish={onFinishDevolucion}
        >
          <Alert
            message={
              <div>
                <div><strong>Producto:</strong> {productoSeleccionado?.producto_nombre}</div>
                <div><strong>Proveedor:</strong> {productoSeleccionado?.proveedor_nombre}</div>
                <div><strong>Disponible:</strong> {productoSeleccionado?.cantidad_disponible} {productoSeleccionado?.unidad}</div>
              </div>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="cantidad"
            label="Cantidad a devolver"
            rules={[
              { required: true, message: 'Ingrese la cantidad' },
              {
                type: 'number',
                max: productoSeleccionado?.cantidad_disponible || 0,
                message: `Máximo ${productoSeleccionado?.cantidad_disponible}`
              }
            ]}
          >
            <InputNumber
              min={0.01}
              max={productoSeleccionado?.cantidad_disponible}
              style={{ width: '100%' }}
              addonAfter={productoSeleccionado?.unidad}
            />
          </Form.Item>

          <Form.Item
            name="motivo"
            label="Motivo de devolución"
            rules={[{ required: true, message: 'Ingrese el motivo' }]}
          >
            <Input placeholder="Ej: Producto vencido, fuera de fecha" />
          </Form.Item>

          <Form.Item
            name="observacion"
            label="Observaciones"
          >
            <TextArea rows={3} placeholder="Detalles adicionales (opcional)" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={devolverMutation.isPending}>
                Registrar Devolución
              </Button>
              <Button onClick={() => {
                setModalDevolucion(false);
                formDevolucion.resetFields();
              }}>
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
