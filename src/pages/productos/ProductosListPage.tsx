import { Button, Form, Input, Modal, Select, Switch, Table, Space, message, Card, InputNumber, Divider, Row, Col, Tag } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { SearchOutlined,PlusOutlined } from '@ant-design/icons';
import { useProductos, useCreateProducto, useUpdateProducto, useRemoveProducto, useReferencias } from '../../lib/api';
import { useState } from 'react';

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

  const getAreaName = (areaId: string) => areas.find(a => a.id === areaId)?.nombre || areaId;
  const getUbicacionName = (ubicacionId: string) => ubicaciones.find(u => u.id === ubicacionId)?.nombre || ubicacionId;
  const textFilter = (dataIndex: string, label: string): ColumnType<any> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <div className="p-2">
        <Input
          placeholder={`Filtrar ${label}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          className="w-48 mb-2 block"
        />
        <Space>
          <Button type="primary" size="small" icon={<SearchOutlined />} onClick={() => confirm()}>Buscar</Button>
          <Button size="small" onClick={() => { clearFilters?.(); confirm(); }}>Reset</Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value: any, record: any) => String(record[dataIndex] ?? '').toLowerCase().includes(String(value ?? '').toLowerCase()),
  });

  const columns: ColumnsType<any> = [
    { title: 'Nombre', dataIndex: 'nombre', ...textFilter('nombre', 'nombre') },
    { title: 'Marca', dataIndex: 'marca', ...textFilter('marca', 'marca') },
    { title: 'Unidad', dataIndex: 'unidad', ...textFilter('unidad', 'unidad') },
    {
      title: 'Área',
      dataIndex: 'areaId',
      render: (areaId: string) => getAreaName(areaId),
      ...textFilter('areaId', 'área')
    },
    {
      title: 'Ubicación',
      dataIndex: 'ubicacionId',
      render: (ubicacionId: string) => getUbicacionName(ubicacionId),
      ...textFilter('ubicacionId', 'ubicación')
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
      ),
    },
    { title: 'Activo', dataIndex: 'activo', render: (v: any) => (v ? 'Sí' : 'No'), filters: [{ text: 'Sí', value: true }, { text: 'No', value: false }], onFilter: (v, r) => r.activo === v },
    {
      title: 'Acciones', render: (_: any, r: any) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => { setEditing(r); setOpen(true); form.setFieldsValue(r); }}>Editar</Button>
          <Button size="small" danger onClick={() => remove(r.id)}>Eliminar</Button>
        </div>
      )
    },
  ];
  return (
    <div className="space-y-4">
      <Card
        title="Gestión de Productos"
        extra={
          <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>Nuevo</Button>
        }
      >
        <Table rowKey="id" dataSource={rows as any} columns={columns} pagination={{ pageSize: 10 }} />
      </Card>
      <Modal title={editing ? 'Editar Producto' : 'Nuevo Producto'} open={open} onOk={async () => {
        try {
          const v = await form.validateFields();
          if (editing) {
            await update({ id: editing.id, data: v });
            message.success('Producto actualizado');
          } else {
            await create(v);
            message.success('Producto creado');
          }
          setOpen(false); setEditing(null); form.resetFields();
        } catch (e: any) {
          const msg = e?.response?.data?.message || 'Error al guardar el producto';
          message.error(msg);
        }
      }} onCancel={() => { setOpen(false); setEditing(null); }}>
        <Form form={form} layout="vertical" initialValues={{ activo: true, dias_alerta_stock: 10, dias_vencimiento_critico: 7, dias_vencimiento_urgente: 15, dias_vencimiento_atencion: 30 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="marca" label="Marca">
            <Input placeholder="Marca del producto (opcional)" />
          </Form.Item>
          <Form.Item name="unidad" label="Unidad" rules={[{ required: true }]}>
            <Select options={["UNIDAD", "CAJA", "PAQUETE", "KG", "G", "L", "ML", "M", "CM"].map(u => ({ value: u, label: u }))} />
          </Form.Item>
          <Form.Item name="areaId" label="Área" rules={[{ required: true }]}>
            <Select options={refRes?.data.areas.map(a => ({ label: a.nombre, value: a.id }))} />
          </Form.Item>
          <Form.Item name="ubicacionId" label="Ubicación" rules={[{ required: true }]}>
            <Select options={refRes?.data.ubicaciones.map(u => ({ label: u.nombre, value: u.id }))} />
          </Form.Item>
          <Form.Item name="activo" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Divider orientation="left">⚠️ Configuración de Alertas</Divider>
          
          <Form.Item
            label="Stock Mínimo (Unidades)"
            name="dias_alerta_stock"
            tooltip="Cuando el stock disponible sea menor o igual a este valor, se mostrará una alerta"
            rules={[
              { required: true, message: 'Ingrese el stock mínimo' },
              { type: 'number', min: 0, message: 'Debe ser mayor o igual a 0' }
            ]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              placeholder="Ej: 10"
              min={0}
              addonAfter="unidades"
            />
          </Form.Item>

          <Divider orientation="left">📅 Alertas de Vencimiento (Días)</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="🔴 Crítico"
                name="dias_vencimiento_critico"
                tooltip="Días antes del vencimiento para alerta crítica (rojo)"
                rules={[
                  { required: true, message: 'Requerido' },
                  { type: 'number', min: 1, message: 'Debe ser mayor a 0' }
                ]}
              >
                <InputNumber 
                  style={{ width: '100%' }} 
                  placeholder="7"
                  min={1}
                  addonAfter="días"
                />
              </Form.Item>
            </Col>
            
            <Col span={8}>
              <Form.Item
                label="🟠 Urgente"
                name="dias_vencimiento_urgente"
                tooltip="Días antes del vencimiento para alerta urgente (naranja)"
                rules={[
                  { required: true, message: 'Requerido' },
                  { type: 'number', min: 1, message: 'Debe ser mayor a 0' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const critico = getFieldValue('dias_vencimiento_critico');
                      if (!value || value > critico) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Debe ser mayor que Crítico'));
                    },
                  }),
                ]}
              >
                <InputNumber 
                  style={{ width: '100%' }} 
                  placeholder="15"
                  min={1}
                  addonAfter="días"
                />
              </Form.Item>
            </Col>
            
            <Col span={8}>
              <Form.Item
                label="🟡 Atención"
                name="dias_vencimiento_atencion"
                tooltip="Días antes del vencimiento para alerta de atención (amarillo)"
                rules={[
                  { required: true, message: 'Requerido' },
                  { type: 'number', min: 1, message: 'Debe ser mayor a 0' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const urgente = getFieldValue('dias_vencimiento_urgente');
                      if (!value || value > urgente) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Debe ser mayor que Urgente'));
                    },
                  }),
                ]}
              >
                <InputNumber 
                  style={{ width: '100%' }} 
                  placeholder="30"
                  min={1}
                  addonAfter="días"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
