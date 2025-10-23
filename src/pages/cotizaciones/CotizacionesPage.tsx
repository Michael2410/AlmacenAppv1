import { useState } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, Form, Select, InputNumber, Input } from 'antd';
import { PlusOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useCotizaciones, useCreateCotizacion, useDownloadCotizacionPDF } from '../../hooks/useCotizaciones';
import { useProveedores, useProductos } from '../../lib/api';
import type { Cotizacion, CreateCotizacionDto } from '../../types/cotizaciones';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CotizacionesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: cotizaciones, isLoading } = useCotizaciones();
  const { data: proveedores } = useProveedores();
  const { data: productos } = useProductos();
  const createCotizacion = useCreateCotizacion();
  const downloadPDF = useDownloadCotizacionPDF();

  const handleCreate = async (values: any) => {
    const productosData = productos?.data || [];

    const data: CreateCotizacionDto = {
      proveedor_id: values.proveedor_id,
      productos: values.productos.map((p: any) => ({
        producto_id: p.producto_id,
        producto_nombre: productosData.find((prod: any) => prod.id === p.producto_id)?.nombre || '',
        cantidad: p.cantidad,
        unidad: productosData.find((prod: any) => prod.id === p.producto_id)?.unidad || 'UNIDAD'
      })),
      observaciones: values.observaciones
    };

    await createCotizacion.mutateAsync(data);
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleDownloadPDF = async (id: string) => {
    await downloadPDF.mutateAsync(id);
  };

  const columns: ColumnsType<Cotizacion> = [
    {
      title: 'Número',
      dataIndex: 'numero',
      key: 'numero',
      width: 150,
      render: (numero) => <Tag color="blue">{numero}</Tag>
    },
    {
      title: 'Proveedor',
      dataIndex: 'proveedor_nombre',
      key: 'proveedor_nombre'
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha_cotizacion',
      key: 'fecha_cotizacion',
      width: 120,
      render: (fecha) => dayjs(fecha).format('DD/MM/YYYY')
    },
    {
      title: 'Productos',
      dataIndex: 'total_productos',
      key: 'total_productos',
      width: 100,
      align: 'center',
      render: (total) => <Tag>{total || 0}</Tag>
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario_nombre',
      key: 'usuario_nombre',
      width: 150
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            size="small"
            onClick={() => handleDownloadPDF(record.id)}
            loading={downloadPDF.isPending}
          >
            PDF
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <Card
        title="Gestión de Cotizaciones"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setIsModalOpen(true); form.resetFields(); }}>Nueva Cotización</Button>
        }
      >
        <Table
          columns={columns}
          dataSource={cotizaciones}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} cotizaciones`
          }}
        />
      </Card>

      {/* Modal para crear cotización */}
      <Modal
        title="Nueva Cotización"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            label="Proveedor"
            name="proveedor_id"
            rules={[{ required: true, message: 'Seleccione un proveedor' }]}
          >
            <Select
              showSearch
              placeholder="Seleccione un proveedor"
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={proveedores?.data?.map((p: any) => ({
                value: p.id,
                label: p.nombre
              }))}
              size="large"
            />
          </Form.Item>

          <Form.List name="productos">
            {(fields, { add, remove }) => (
              <>
                <div className="flex justify-between items-center mb-3">
                  <Text strong>Productos a Cotizar</Text>
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                    Agregar Producto
                  </Button>
                </div>

                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" className="mb-3">
                    <div className="grid grid-cols-12 gap-3">
                      <Form.Item
                        {...restField}
                        name={[name, 'producto_id']}
                        rules={[{ required: true, message: 'Seleccione producto' }]}
                        className="col-span-7 mb-0"
                      >
                        <Select
                          showSearch
                          placeholder="Producto"
                          optionFilterProp="children"
                          filterOption={(input, option) =>
                            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          options={productos?.data?.map((p: any) => ({
                            value: p.id,
                            label: `${p.nombre} (${p.marca || 'Sin marca'})`
                          }))}
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'cantidad']}
                        rules={[{ required: true, message: 'Cantidad requerida' }]}
                        className="col-span-3 mb-0"
                      >
                        <InputNumber
                          placeholder="Cantidad"
                          min={1}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>

                      <div className="col-span-2 flex items-center justify-end mb-0">
                        <Button type="link" danger onClick={() => remove(name)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {fields.length === 0 && (
                  <Card className="mb-3 bg-gray-50">
                    <Text type="secondary" className="text-center block">
                      No hay productos agregados. Haga clic en "Agregar Producto" para comenzar.
                    </Text>
                  </Card>
                )}
              </>
            )}
          </Form.List>

          <Form.Item
            label="Observaciones"
            name="observaciones"
          >
            <TextArea
              placeholder="Observaciones o notas adicionales (opcional)"
              rows={3}
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setIsModalOpen(false);
                form.resetFields();
              }}>
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createCotizacion.isPending}
              >
                Crear Cotización
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
