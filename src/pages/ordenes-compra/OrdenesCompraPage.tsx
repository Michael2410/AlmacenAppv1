import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  InputNumber,
  Popconfirm,
  message,
  Row,
  Col,
  Timeline
} from 'antd';
import {
  PlusOutlined,
  FilePdfOutlined,
  EyeOutlined,
  DeleteOutlined,
  ShoppingOutlined,
  CloseCircleOutlined,
  InboxOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useOrdenesCompra,
  useCreateOrdenCompra,
  useCancelarOrdenCompra,
  useDownloadOrdenPDF,
  useOrdenCompra,
  useCambiarEstadoOrden,
  useAgregarSeguimiento,
  useCrearIngresoDesdeOrden
} from '../../hooks/useOrdenesCompra';
import { useProveedores, useProductos } from '../../lib/api';
import type { OrdenCompra, EstadoOrden, CreateOrdenCompraDto } from '../../types/ordenesCompra';
import { defaultPaginationConfig } from '../../hooks/useTablePagination';

const { TextArea } = Input;

export default function OrdenesCompraPage() {
  const [filtros, setFiltros] = useState<{
    estado?: string;
    proveedor_id?: string;
  }>({});

  const { data: ordenesRes } = useOrdenesCompra(filtros);
  const { data: proveedores } = useProveedores();
  const { data: productos } = useProductos();

  const [modalCrear, setModalCrear] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalIngresar, setModalIngresar] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<string | null>(null);

  const createMutation = useCreateOrdenCompra();
  const cancelarMutation = useCancelarOrdenCompra();
  const downloadPdfMutation = useDownloadOrdenPDF();

  const [form] = Form.useForm();
  const [productosOrden, setProductosOrden] = useState<any[]>([]);

  const ordenes = ordenesRes?.data || [];

  // Estados con colores
  const estadoColors: Record<EstadoOrden, string> = {
    PENDIENTE: 'gold',
    CONFIRMADA: 'blue',
    EN_TRANSITO: 'orange',
    ENTREGADA: 'green',
    CANCELADA: 'red'
  };

  const handleCrearOrden = async () => {
    try {
      const values = await form.validateFields();

      if (productosOrden.length === 0) {
        message.error('Debe agregar al menos un producto');
        return;
      }

      const dto: CreateOrdenCompraDto = {
        proveedor_id: values.proveedor_id,
        fecha_entrega_estimada: values.fecha_entrega_estimada
          ? dayjs(values.fecha_entrega_estimada).format('YYYY-MM-DD')
          : undefined,
        productos: productosOrden,
        condiciones_pago: values.condiciones_pago,
        notas: values.notas
      };

      await createMutation.mutateAsync(dto);
      setModalCrear(false);
      form.resetFields();
      setProductosOrden([]);
    } catch (error) {
      console.error('Error al crear orden:', error);
    }
  };

  const handleAgregarProducto = () => {
    const producto_id = form.getFieldValue('producto_id');
    const cantidad = form.getFieldValue('cantidad');
    const precio_unitario = form.getFieldValue('precio_unitario');

    if (!producto_id || !cantidad || !precio_unitario) {
      message.error('Complete todos los campos del producto');
      return;
    }

    const producto = productos?.data.find((p: any) => p.id === producto_id);
    if (!producto) return;

    const nuevoProducto = {
      producto_id,
      producto_nombre: producto.nombre,
      cantidad,
      unidad: producto.unidad,
      precio_unitario,
      subtotal: cantidad * precio_unitario
    };

    setProductosOrden([...productosOrden, nuevoProducto]);

    // Limpiar campos de producto
    form.setFieldsValue({
      producto_id: undefined,
      cantidad: undefined,
      precio_unitario: undefined
    });
  };

  const handleEliminarProducto = (index: number) => {
    setProductosOrden(productosOrden.filter((_, i) => i !== index));
  };

  const calcularTotales = () => {
    const subtotal = productosOrden.reduce((sum, p) => sum + p.subtotal, 0);
    const impuestos = subtotal * 0.18;
    const total = subtotal - impuestos;
    return { subtotal, impuestos, total };
  };

  const totales = calcularTotales();

  const columns = [
    {
      title: 'Número',
      dataIndex: 'numero',
      key: 'numero',
      width: 150
    },
    {
      title: 'Proveedor',
      dataIndex: 'proveedor_nombre',
      key: 'proveedor_nombre'
    },
    {
      title: 'Fecha Orden',
      dataIndex: 'fecha_orden',
      key: 'fecha_orden',
      width: 120,
      render: (fecha: string) => dayjs(fecha).format('DD/MM/YYYY')
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 130,
      render: (estado: EstadoOrden) => (
        <Tag color={estadoColors[estado]}>{estado.replace('_', ' ')}</Tag>
      ),
      filters: [
        { text: 'Pendiente', value: 'PENDIENTE' },
        { text: 'Confirmada', value: 'CONFIRMADA' },
        { text: 'En Tránsito', value: 'EN_TRANSITO' },
        { text: 'Entregada', value: 'ENTREGADA' },
        { text: 'Cancelada', value: 'CANCELADA' }
      ],
      onFilter: (value: any, record: OrdenCompra) => record.estado === value
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      render: (total: number) => `S/ ${total.toFixed(2)}`
    },
    {
      title: 'Productos',
      dataIndex: 'total_productos',
      key: 'total_productos',
      width: 100,
      align: 'center' as const
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 280,
      render: (_: any, record: OrdenCompra) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setOrdenSeleccionada(record.id);
              setModalDetalle(true);
            }}
          >
            Ver
          </Button>
          <Button
            size="small"
            icon={<FilePdfOutlined />}
            onClick={() => downloadPdfMutation.mutate(record.id)}
          >
            PDF
          </Button>
          {record.estado === 'ENTREGADA' && (
            <Button
              size="small"
              type="primary"
              icon={<InboxOutlined />}
              onClick={() => {
                setOrdenSeleccionada(record.id);
                setModalIngresar(true);
              }}
            >
              Ingresar
            </Button>
          )}
          {record.estado !== 'CANCELADA' && record.estado !== 'ENTREGADA' && (
            <Popconfirm
              title="¿Cancelar esta orden?"
              onConfirm={() => cancelarMutation.mutate(record.id)}
            >
              <Button size="small" danger icon={<CloseCircleOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <Card
        title={
          <Space>
            <ShoppingOutlined />
            Órdenes de Compra
          </Space>
        }
        extra={
          <Space>
            <Select
              placeholder="Filtrar por proveedor"
              allowClear
              style={{ width: 200 }}
              onChange={(value) => setFiltros({ ...filtros, proveedor_id: value })}
              options={proveedores?.data?.map((p: any) => ({
                label: p.nombre,
                value: p.id
              }))}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setModalCrear(true);
                form.resetFields();
                setProductosOrden([]);
              }}
            >
              Nueva Orden
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          dataSource={ordenes}
          columns={columns}
          pagination={defaultPaginationConfig}
          loading={!ordenesRes}
        />
      </Card>

      {/* Modal Crear Orden */}
      <Modal
        title="Nueva Orden de Compra"
        open={modalCrear}
        onOk={handleCrearOrden}
        onCancel={() => {
          setModalCrear(false);
          form.resetFields();
          setProductosOrden([]);
        }}
        width={900}
        okText="Crear Orden"
        cancelText="Cancelar"
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="proveedor_id"
                label="Proveedor"
                rules={[{ required: true, message: 'Seleccione un proveedor' }]}
              >
                <Select
                  showSearch
                  placeholder="Seleccione un proveedor"
                  optionFilterProp="children"
                  options={proveedores?.data?.map((p: any) => ({
                    label: `${p.nombre}${p.ruc ? ` - ${p.ruc}` : ''}`,
                    value: p.id
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fecha_entrega_estimada" label="Fecha Entrega Estimada">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-3">Agregar Productos</h4>
            <Row gutter={16}>
              <Col span={10}>
                <Form.Item name="producto_id" label="Producto">
                  <Select
                    showSearch
                    placeholder="Seleccione un producto"
                    optionFilterProp="children"
                    options={productos?.data?.map((p: any) => ({
                      label: `${p.nombre} - ${p.unidad}`,
                      value: p.id
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="cantidad" label="Cantidad">
                  <InputNumber min={1} style={{ width: '100%' }} placeholder="0" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="precio_unitario" label="Precio Unit.">
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="0.00"
                    prefix="S/"
                  />
                </Form.Item>
              </Col>
              <Col span={3}>
                <Form.Item label=" ">
                  <Button type="dashed" onClick={handleAgregarProducto} block>
                    Agregar
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Lista de productos agregados */}
          {productosOrden.length > 0 && (
            <div className="border rounded p-3 mb-4">
              <h4 className="font-semibold mb-2">Productos en la Orden</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Producto</th>
                    <th className="text-center">Cantidad</th>
                    <th className="text-right">P. Unit.</th>
                    <th className="text-right">Subtotal</th>
                    <th className="text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {productosOrden.map((p, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{p.producto_nombre}</td>
                      <td className="text-center">{p.cantidad} {p.unidad}</td>
                      <td className="text-right">S/ {p.precio_unitario.toFixed(2)}</td>
                      <td className="text-right">S/ {p.subtotal.toFixed(2)}</td>
                      <td className="text-center">
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleEliminarProducto(index)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 text-right space-y-1">
                <div><strong>Subtotal:</strong> S/ {totales.subtotal.toFixed(2)}</div>
                <div><strong>IGV (18%):</strong> S/ {totales.impuestos.toFixed(2)}</div>
                <div className="text-lg"><strong>TOTAL:</strong> S/ {totales.total.toFixed(2)}</div>
              </div>
            </div>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="condiciones_pago" label="Condiciones de Pago">
                <TextArea rows={3} placeholder="Ej: 50% adelanto, 50% contra entrega" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="notas" label="Notas Adicionales">
                <TextArea rows={3} placeholder="Observaciones o instrucciones especiales" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal Detalle */}
      {ordenSeleccionada && (
        <ModalDetalleOrden
          ordenId={ordenSeleccionada}
          open={modalDetalle}
          onClose={() => {
            setModalDetalle(false);
            setOrdenSeleccionada(null);
          }}
        />
      )}

      {/* Modal Ingresar al Inventario */}
      {ordenSeleccionada && (
        <ModalIngresarOrden
          open={modalIngresar}
          onCancel={() => {
            setModalIngresar(false);
            setOrdenSeleccionada(null);
          }}
          ordenId={ordenSeleccionada}
        />
      )}
    </div>
  );
}

// Componente Modal Detalle de Orden
function ModalDetalleOrden({
  ordenId,
  open,
  onClose
}: {
  ordenId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: ordenRes } = useOrdenCompra(ordenId);
  const cambiarEstadoMutation = useCambiarEstadoOrden(ordenId);
  const agregarSeguimientoMutation = useAgregarSeguimiento(ordenId);
  const downloadPdfMutation = useDownloadOrdenPDF();

  const [formEstado] = Form.useForm();
  const [formSeguimiento] = Form.useForm();
  const [modalEstado, setModalEstado] = useState(false);
  const [modalSeguimiento, setModalSeguimiento] = useState(false);

  const orden = ordenRes?.data;

  if (!orden) return null;

  const estadoColors: Record<EstadoOrden, string> = {
    PENDIENTE: 'gold',
    CONFIRMADA: 'blue',
    EN_TRANSITO: 'orange',
    ENTREGADA: 'green',
    CANCELADA: 'red'
  };

  const handleCambiarEstado = async () => {
    const values = await formEstado.validateFields();
    await cambiarEstadoMutation.mutateAsync(values);
    setModalEstado(false);
    formEstado.resetFields();
  };

  const handleAgregarSeguimiento = async () => {
    const values = await formSeguimiento.validateFields();
    await agregarSeguimientoMutation.mutateAsync(values);
    setModalSeguimiento(false);
    formSeguimiento.resetFields();
  };

  return (
    <>
      <Modal
        title={`Orden de Compra: ${orden.numero}`}
        open={open}
        onCancel={onClose}
        width={900}
        footer={[
          <Button key="pdf" icon={<FilePdfOutlined />} onClick={() => downloadPdfMutation.mutate(ordenId)}>
            Descargar PDF
          </Button>,
          <Button key="seguimiento" onClick={() => setModalSeguimiento(true)}>
            Agregar Seguimiento
          </Button>,
          <Button key="estado" type="primary" onClick={() => setModalEstado(true)}>
            Cambiar Estado
          </Button>,
          <Button key="cerrar" onClick={onClose}>
            Cerrar
          </Button>
        ]}
      >
        <div className="space-y-4">
          {/* Info General */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Proveedor</p>
              <p className="font-semibold">{orden.proveedor_nombre}</p>
              {orden.proveedor_ruc && <p className="text-sm">RUC: {orden.proveedor_ruc}</p>}
            </div>
            <div>
              <p className="text-sm text-gray-500">Estado</p>
              <Tag color={estadoColors[orden.estado]} className="text-base">
                {orden.estado.replace('_', ' ')}
              </Tag>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha Orden</p>
              <p>{dayjs(orden.fecha_orden).format('DD/MM/YYYY')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha Entrega Estimada</p>
              <p>
                {orden.fecha_entrega_estimada
                  ? dayjs(orden.fecha_entrega_estimada).format('DD/MM/YYYY')
                  : 'No especificada'}
              </p>
            </div>
          </div>

          {/* Productos */}
          <div>
            <h4 className="font-semibold mb-2">Productos</h4>
            <table className="w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Producto</th>
                  <th className="text-center p-2">Cantidad</th>
                  <th className="text-right p-2">P. Unit.</th>
                  <th className="text-right p-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orden.detalles?.map((det) => (
                  <tr key={det.id} className="border-t">
                    <td className="p-2">{det.producto_nombre}</td>
                    <td className="text-center">{det.cantidad} {det.unidad}</td>
                    <td className="text-right">S/ {det.precio_unitario.toFixed(2)}</td>
                    <td className="text-right">S/ {det.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right mt-2 space-y-1">
              <div><strong>Subtotal:</strong> S/ {orden.subtotal.toFixed(2)}</div>
              <div><strong>IGV (18%):</strong> S/ {orden.impuestos.toFixed(2)}</div>
              <div className="text-lg"><strong>TOTAL:</strong> S/ {orden.total.toFixed(2)}</div>
            </div>
          </div>

          {/* Seguimiento */}
          <div>
            <h4 className="font-semibold mb-2">Historial de Seguimiento</h4>
            <Timeline
              items={orden.seguimiento?.map((seg) => ({
                color: estadoColors[seg.estado],
                children: (
                  <div>
                    <div className="font-semibold">{seg.estado.replace('_', ' ')}</div>
                    <div className="text-sm text-gray-600">{seg.observaciones}</div>
                    <div className="text-xs text-gray-400">
                      {dayjs(seg.fecha).format('DD/MM/YYYY HH:mm')} - {seg.usuario_nombre}
                    </div>
                  </div>
                )
              }))}
            />
          </div>

          {/* Condiciones y Notas */}
          {(orden.condiciones_pago || orden.notas) && (
            <div className="grid grid-cols-2 gap-4">
              {orden.condiciones_pago && (
                <div>
                  <p className="text-sm text-gray-500">Condiciones de Pago</p>
                  <p>{orden.condiciones_pago}</p>
                </div>
              )}
              {orden.notas && (
                <div>
                  <p className="text-sm text-gray-500">Notas</p>
                  <p>{orden.notas}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Cambiar Estado */}
      <Modal
        title="Cambiar Estado de Orden"
        open={modalEstado}
        onOk={handleCambiarEstado}
        onCancel={() => setModalEstado(false)}
        okText="Cambiar"
      >
        <Form form={formEstado} layout="vertical">
          <Form.Item
            name="estado"
            label="Nuevo Estado"
            rules={[{ required: true, message: 'Seleccione un estado' }]}
          >
            <Select
              options={[
                { label: 'Pendiente', value: 'PENDIENTE' },
                { label: 'Confirmada', value: 'CONFIRMADA' },
                { label: 'En Tránsito', value: 'EN_TRANSITO' },
                { label: 'Entregada', value: 'ENTREGADA' },
                { label: 'Cancelada', value: 'CANCELADA' }
              ]}
            />
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Agregar Seguimiento */}
      <Modal
        title="Agregar Seguimiento"
        open={modalSeguimiento}
        onOk={handleAgregarSeguimiento}
        onCancel={() => setModalSeguimiento(false)}
        okText="Agregar"
      >
        <Form form={formSeguimiento} layout="vertical">
          <Form.Item
            name="observaciones"
            label="Observaciones"
            rules={[{ required: true, message: 'Ingrese observaciones' }]}
          >
            <TextArea rows={4} placeholder="Descripción del evento o actualización" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ===== Modal Ingresar Orden =====
function ModalIngresarOrden({
  open,
  onCancel,
  ordenId
}: {
  open: boolean;
  onCancel: () => void;
  ordenId: string;
}) {
  const [form] = Form.useForm();
  const { data: ordenData } = useOrdenCompra(ordenId);
  const crearIngresoMutation = useCrearIngresoDesdeOrden();
  const [productosIngreso, setProductosIngreso] = useState<any[]>([]);

  const orden = ordenData?.data;

  // Pre-cargar productos cuando se abre el modal
  useState(() => {
    if (orden?.detalles) {
      const productos = orden.detalles.map((det) => ({
        producto_id: det.producto_id,
        producto_nombre: det.producto_nombre,
        cantidad: det.cantidad,
        unidad: det.unidad,
        precio: det.subtotal, 
        precio_unitario_referencia: det.precio_unitario,
        fechaVencimiento: undefined,
        fechaFactura: undefined,
        serieFactura: undefined
      }));
      setProductosIngreso(productos);
    }
  });

  const handleIngresar = async () => {
    try {
      await form.validateFields();

      const detalles = productosIngreso.map((prod) => ({
        producto_id: prod.producto_id,
        cantidad: prod.cantidad,
        precio: prod.precio, 
        fechaVencimiento: prod.fechaVencimiento,
        fechaFactura: prod.fechaFactura,
        serieFactura: prod.serieFactura
      }));

      await crearIngresoMutation.mutateAsync({
        ordenId,
        detalles
      });

      setProductosIngreso([]);
      form.resetFields();
      onCancel();
    } catch (error) {
      console.error('Error al crear ingreso:', error);
    }
  };

  const handleActualizarProducto = (index: number, field: string, value: any) => {
    const nuevosProductos = [...productosIngreso];
    nuevosProductos[index] = { ...nuevosProductos[index], [field]: value };
    setProductosIngreso(nuevosProductos);
  };

  return (
    <Modal
      title={`Ingresar al Inventario - ${orden?.numero || ''}`}
      open={open}
      onCancel={onCancel}
      onOk={handleIngresar}
      okText="Crear Ingreso"
      cancelText="Cancelar"
      width={900}
      confirmLoading={crearIngresoMutation.isPending}
    >
      <Form form={form} layout="vertical">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-700">
            <strong>Proveedor:</strong> {orden?.proveedor_nombre}<br />
            <strong>Fecha Orden:</strong> {orden?.fecha_orden ? dayjs(orden.fecha_orden).format('DD/MM/YYYY') : '-'}
          </p>
          <p className="text-xs text-blue-600 mt-2">
            ℹ️ Complete los campos adicionales para cada producto.
          </p>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {productosIngreso.map((prod, index) => (
            <Card key={index} size="small" className="bg-gray-50">
              <div className="mb-2 font-semibold text-blue-600">
                {prod.producto_nombre}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                Cantidad: <strong>{prod.cantidad} {prod.unidad}</strong> |
                Precio total: <strong>S/ {prod.precio.toFixed(2)}</strong>
                {prod.precio_unitario_referencia && (
                  <span className="text-xs text-gray-500">
                    {' '}(P. Unit: S/ {prod.precio_unitario_referencia.toFixed(2)})
                  </span>
                )}
              </div>

              <Row gutter={8}>
                <Col span={8}>
                  <div className="text-xs mb-1">Fecha Vencimiento</div>
                  <DatePicker
                    size="small"
                    style={{ width: '100%' }}
                    value={prod.fechaVencimiento ? dayjs(prod.fechaVencimiento) : null}
                    onChange={(date) =>
                      handleActualizarProducto(index, 'fechaVencimiento', date?.toISOString())
                    }
                  />
                </Col>
                <Col span={8}>
                  <div className="text-xs mb-1">Fecha Factura</div>
                  <DatePicker
                    size="small"
                    style={{ width: '100%' }}
                    value={prod.fechaFactura ? dayjs(prod.fechaFactura) : null}
                    onChange={(date) =>
                      handleActualizarProducto(index, 'fechaFactura', date?.toISOString())
                    }
                  />
                </Col>
                <Col span={8}>
                  <div className="text-xs mb-1">Serie Factura</div>
                  <Input
                    size="small"
                    placeholder="Ej. F001-00123"
                    value={prod.serieFactura}
                    onChange={(e) => handleActualizarProducto(index, 'serieFactura', e.target.value)}
                  />
                </Col>
              </Row>
            </Card>
          ))}
        </div>

        {productosIngreso.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No hay productos para ingresar
          </div>
        )}
      </Form>
    </Modal>
  );
}

