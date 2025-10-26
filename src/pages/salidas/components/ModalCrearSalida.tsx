import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  message,
  Table,
  Tag,
  Space,
  Card,
  Statistic,
  Row,
  Col
} from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface ModalCrearSalidaProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Ingreso {
  id: string;
  productoId: string;
  producto_nombre: string;
  proveedor_nombre: string;
  fechaIngreso: string;
  cantidad: number;
  cantidad_disponible: number;
  unidad: string;
  precio: number;
  serieFactura?: string;
  fechaFactura?: string;
  marca?: string;
  fechaVencimiento?: string;
}

const ModalCrearSalida: React.FC<ModalCrearSalidaProps> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [ingresoSeleccionado, setIngresoSeleccionado] = useState<Ingreso | null>(null);
  const [filtros, setFiltros] = useState<{ productoId?: string }>({});

  // Query para listar productos
  const { data: productosData } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const response = await api.get('/productos');
      return response.data;
    }
  });

  const productos = Array.isArray(productosData) ? productosData : (productosData?.data || []);

  // Query para listar ingresos disponibles
  const { data: ingresosData, isLoading: loadingIngresos } = useQuery({
    queryKey: ['ingresos-disponibles', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.productoId) params.append('productoId', filtros.productoId);
      
      const response = await api.get(`/salidas/ingresos-disponibles?${params.toString()}`);
      return response.data;
    },
    enabled: visible
  });

  const ingresos: Ingreso[] = Array.isArray(ingresosData) ? ingresosData : (ingresosData?.data || []);

  // Mutation para crear salida
  const crearMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!ingresoSeleccionado) {
        throw new Error('Debe seleccionar un ingreso');
      }

      const payload = {
        ingreso_id: ingresoSeleccionado.id,
        cantidad: values.cantidad,
        tipo: values.tipo,
        motivo: values.motivo,
        observacion: values.observacion
      };

      console.log('📤 Enviando salida:', payload);
      console.log('📋 Values del form:', values);
      console.log('🎯 Ingreso seleccionado:', ingresoSeleccionado);

      return api.post('/salidas', payload);
    },
    onSuccess: () => {
      message.success('Salida registrada correctamente');
      form.resetFields();
      setIngresoSeleccionado(null);
      onSuccess();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al registrar salida');
    }
  });

  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setIngresoSeleccionado(null);
      setFiltros({});
    }
  }, [visible, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      crearMutation.mutate(values);
    });
  };

  const calcularValorPerdida = () => {
    if (!ingresoSeleccionado) return 0;
    const cantidad = form.getFieldValue('cantidad') || 0;
    const precioUnitario = ingresoSeleccionado.precio / ingresoSeleccionado.cantidad;
    return cantidad * precioUnitario;
  };

  const columnasIngresos = [
    {
      title: 'Producto',
      dataIndex: 'producto_nombre',
      key: 'producto_nombre',
      ellipsis: true
    },
    {
      title: 'Factura',
      key: 'factura',
      render: (record: Ingreso) => record.serieFactura || '-'
    },
    {
      title: 'Fecha Ingreso',
      dataIndex: 'fechaIngreso',
      key: 'fechaIngreso',
      render: (fecha: string) => dayjs(fecha).format('DD/MM/YYYY')
    },
    {
      title: 'Stock',
      key: 'stock',
      render: (record: Ingreso) => `${record.cantidad_disponible} ${record.unidad}`,
      align: 'right' as const
    },
    {
      title: 'Proveedor',
      dataIndex: 'proveedor_nombre',
      key: 'proveedor_nombre',
      ellipsis: true
    },
    {
      title: 'Acción',
      key: 'accion',
      render: (record: Ingreso) => (
        <Tag 
          color={ingresoSeleccionado?.id === record.id ? 'blue' : 'default'}
          style={{ cursor: 'pointer' }}
          onClick={() => setIngresoSeleccionado(record)}
        >
          {ingresoSeleccionado?.id === record.id ? 'Seleccionado' : 'Seleccionar'}
        </Tag>
      )
    }
  ];

  return (
    <Modal
      title="Registrar Salida por Daño, Pérdida u Otros"
      open={visible}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={crearMutation.isPending}
      okButtonProps={{ 
        disabled: !ingresoSeleccionado || !filtros.productoId 
      }}
      width={1000}
      okText="Registrar Salida"
      cancelText="Cancelar"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Filtro de producto */}
        <Card size="small" title="1. Seleccione el Producto">
          <Select
            placeholder="Buscar producto"
            style={{ width: '100%' }}
            showSearch
            filterOption={(input, option: any) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
            onChange={(productoId) => setFiltros({ productoId })}
            allowClear
          >
            {productos.map((p: any) => (
              <Select.Option key={p.id} value={p.id}>
                {p.nombre} - {p.marca || 'Sin marca'}
              </Select.Option>
            ))}
          </Select>
        </Card>

        {/* Tabla de ingresos */}
        <Card size="small" title="2. Seleccione el Ingreso Específico (Factura)">
          <Table
            columns={columnasIngresos}
            dataSource={ingresos}
            loading={loadingIngresos}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ y: 200 }}
            rowClassName={(record) => 
              ingresoSeleccionado?.id === record.id ? 'ant-table-row-selected' : ''
            }
          />
        </Card>

        {/* Formulario de salida */}
        {ingresoSeleccionado && (
          <Card size="small" title="3. Complete los Datos de la Salida">
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Statistic 
                  title="Producto" 
                  value={ingresoSeleccionado.producto_nombre} 
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="Stock Disponible" 
                  value={`${ingresoSeleccionado.cantidad_disponible} ${ingresoSeleccionado.unidad}`} 
                />
              </Col>
            </Row>

            <Form form={form} layout="vertical">
              <Form.Item
                name="tipo"
                label="Tipo de Salida"
                rules={[{ required: true, message: 'Seleccione el tipo de salida' }]}
              >
                <Select placeholder="Seleccione el tipo">
                  <Select.Option value="PERDIDA">Pérdida</Select.Option>
                  <Select.Option value="DAÑADO">Dañado</Select.Option>
                  <Select.Option value="MERMA">Merma</Select.Option>
                  <Select.Option value="BAJA_VOLUNTARIA">Baja Voluntaria</Select.Option>
                  <Select.Option value="DONACION">Donación</Select.Option>
                  <Select.Option value="MUESTRA">Muestra/Prueba</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="cantidad"
                label="Cantidad"
                rules={[
                  { required: true, message: 'Ingrese la cantidad' },
                  {
                    validator: (_, value) => {
                      if (value > 0 && value <= ingresoSeleccionado.cantidad_disponible) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error(`Cantidad debe ser entre 1 y ${ingresoSeleccionado.cantidad_disponible}`)
                      );
                    }
                  }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  max={ingresoSeleccionado.cantidad_disponible}
                  placeholder="Cantidad"
                  addonAfter={ingresoSeleccionado.unidad}
                  onChange={() => form.validateFields(['cantidad'])}
                />
              </Form.Item>

              <Form.Item
                name="motivo"
                label="Motivo"
                rules={[{ required: true, message: 'Ingrese el motivo' }]}
              >
                <Input placeholder="Ej: Se extravió en bodega" />
              </Form.Item>

              <Form.Item
                name="observacion"
                label="Observaciones (opcional)"
              >
                <TextArea 
                  rows={3} 
                  placeholder="Detalles adicionales sobre la salida..." 
                />
              </Form.Item>

              <Card size="small">
                <Statistic
                  title="Valor Estimado de Pérdida"
                  value={calcularValorPerdida()}
                  precision={2}
                  prefix="S/"
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Form>
          </Card>
        )}
      </Space>
    </Modal>
  );
};

export default ModalCrearSalida;
