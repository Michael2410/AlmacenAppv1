import { Button, Form, Input, Modal, Select, Switch, Table, Space, message, Card, InputNumber, Divider, Row, Col, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useProductos, useCreateProducto, useUpdateProducto, useRemoveProducto, useReferencias } from '../../lib/api';
import { useState } from 'react';
import { defaultPaginationConfig } from '../../hooks/useTablePagination';

export default function ProductosListPage() {
  const { data } = useProductos();
  const { data: refRes } = useReferencias();
  const { mutateAsync: create } = useCreateProducto();
  const { mutateAsync: update } = useUpdateProducto();
  const { mutateAsync: remove } = useRemoveProducto();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<any>(null);

  const rows = data?.data ?? [];
  const referencias = refRes?.data;
  const areas = referencias?.areas ?? [];
  const ubicaciones = referencias?.ubicaciones ?? [];

  const getAreaName = (areaId: string) =>
    areas.find(a => a.id === areaId)?.nombre || areaId;

  const getUbicacionName = (ubicacionId: string) =>
    ubicaciones.find(u => u.id === ubicacionId)?.nombre || ubicacionId;

  const uniqueFilter = (dataIndex: string, mapper?: (val: any) => string) =>
    Array.from(new Set(rows.map((i: any) => i[dataIndex]).filter(Boolean)))
      .map(v => ({
        text: mapper ? mapper(v) : v,
        value: v,
      }));

  const columns: ColumnsType<any> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      filters: uniqueFilter('nombre'),
      onFilter: (value, record) =>
        record.nombre?.indexOf(value as string) === 0
    },
    {
      title: 'Marca',
      dataIndex: 'marca',
      filters: uniqueFilter('marca'),
      onFilter: (value, record) =>
        record.marca?.indexOf(value as string) === 0
    },
    {
      title: 'Unidad',
      dataIndex: 'unidad',
      filters: uniqueFilter('unidad'),
      onFilter: (value, record) =>
        record.unidad?.indexOf(value as string) === 0
    },
    {
      title: 'Área',
      dataIndex: 'areaId',
      filters: uniqueFilter('areaId', getAreaName),
      onFilter: (value, record) => record.areaId === value,
      render: (v: string) => getAreaName(v),
    },
    {
      title: 'Ubicación',
      dataIndex: 'ubicacionId',
      filters: uniqueFilter('ubicacionId', getUbicacionName),
      onFilter: (value, record) => record.ubicacionId === value,
      render: (v: string) => getUbicacionName(v),
    },
    {
      title: 'Stock Mínimo',
      dataIndex: 'dias_alerta_stock',
      align: 'center',
      render: (value: number) => (
        <Tag color="blue">{value || 10} unidades</Tag>
      ),
    },
    {
      title: 'Alertas Vencimiento',
      align: 'center',
      render: (_: any, record: any) => (
        <Space direction="vertical" size="small">
          <Tag color="red" style={{ margin: 0 }}>🔴 {record.dias_vencimiento_critico || 7}d</Tag>
          <Tag color="orange" style={{ margin: 0 }}>🟠 {record.dias_vencimiento_urgente || 15}d</Tag>
          <Tag color="gold" style={{ margin: 0 }}>🟡 {record.dias_vencimiento_atencion || 30}d</Tag>
        </Space>
      )
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      render: (v: any) => (v ? 'Sí' : 'No'),
      filters: [
        { text: 'Sí', value: true },
        { text: 'No', value: false }
      ],
      onFilter: (v, r) => r.activo === v
    },
    {
      title: 'Acciones',
      render: (_: any, r: any) => (
        <div className="flex gap-2">
          <Button type="text" icon={<EditOutlined />}
            onClick={() => { setEditing(r); setOpen(true); form.setFieldsValue(r); }} />
          <Button type="text" danger icon={<DeleteOutlined />}
            onClick={() => remove(r.id)} />
        </div>
      )
    },
  ];

  return (
    <div className="space-y-4">
      <Card
        title="Gestión de Productos"
        extra={
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>
            Nuevo Producto
          </Button>
        }
      >
        <Table rowKey="id" dataSource={rows} columns={columns} pagination={defaultPaginationConfig} />
      </Card>

      <Modal
        title={editing ? 'Editar Producto' : 'Nuevo Producto'}
        open={open}
        onOk={async () => {
          try {
            const v = await form.validateFields();
            if (editing) {
              await update({ id: editing.id, data: v });
              message.success('Producto actualizado');
            } else {
              await create(v);
              message.success('Producto creado');
            }
            setOpen(false);
            setEditing(null);
            form.resetFields();
          } catch (e: any) {
            const msg = e?.response?.data?.message || 'Error al guardar el producto';
            message.error(msg);
          }
        }}
        onCancel={() => { setOpen(false); setEditing(null); }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            activo: true,
            dias_alerta_stock: 10,
            dias_vencimiento_critico: 7,
            dias_vencimiento_urgente: 15,
            dias_vencimiento_atencion: 30
          }}
        >
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="marca" label="Marca">
            <Input />
          </Form.Item>

          <Form.Item name="unidad" label="Unidad" rules={[{ required: true }]}>
            <Select
              options={["UNIDAD", "CAJA", "PAQUETE", "KG", "G", "L", "ML", "M", "CM"].map(u => ({
                label: u, value: u
              }))}
            />
          </Form.Item>

          <Form.Item name="areaId" label="Área" rules={[{ required: true }]}>
            <Select
              options={areas.map(a => ({ label: a.nombre, value: a.id }))}
            />
          </Form.Item>

          <Form.Item name="ubicacionId" label="Ubicación" rules={[{ required: true }]}>
            <Select
              options={ubicaciones.map(u => ({ label: u.nombre, value: u.id }))}
            />
          </Form.Item>

          <Form.Item name="activo" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Divider orientation="left">⚠️ Configuración de Alertas</Divider>

          <Form.Item name="dias_alerta_stock" label="Stock Mínimo">
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="unidades" />
          </Form.Item>

          <Divider orientation="left">📅 Alertas de Vencimiento</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="dias_vencimiento_critico" label="🔴 Crítico">
                <InputNumber min={1} style={{ width: '100%' }} addonAfter="días" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dias_vencimiento_urgente" label="🟠 Urgente">
                <InputNumber min={1} style={{ width: '100%' }} addonAfter="días" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dias_vencimiento_atencion" label="🟡 Atención">
                <InputNumber min={1} style={{ width: '100%' }} addonAfter="días" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
