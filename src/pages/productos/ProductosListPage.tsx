import { Button, Form, Input, Modal, Select, Switch, Table, Space } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import { useProductos, useCreateProducto, useUpdateProducto, useRemoveProducto } from '../../lib/api';
import { useState } from 'react';

export default function ProductosListPage() {
  const { data } = useProductos();
  const { mutateAsync: create } = useCreateProducto();
  const { mutateAsync: update } = useUpdateProducto();
  const { mutateAsync: remove } = useRemoveProducto();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<any>(null);
  const rows = data?.data ?? [];
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
    { title: 'Unidad', dataIndex: 'unidad', ...textFilter('unidad', 'unidad') },
    { title: 'Área', dataIndex: 'areaId', ...textFilter('areaId', 'área') },
    { title: 'Ubicación', dataIndex: 'ubicacionId', ...textFilter('ubicacionId', 'ubicación') },
    { title: 'Activo', dataIndex: 'activo', render: (v: any) => (v ? 'Sí' : 'No'), filters: [{ text: 'Sí', value: true }, { text: 'No', value: false }], onFilter: (v, r) => r.activo === v },
    { title: 'Acciones', render: (_: any, r: any) => (
      <div className="flex gap-2">
        <Button size="small" onClick={() => { setEditing(r); setOpen(true); form.setFieldsValue(r); }}>Editar</Button>
        <Button size="small" danger onClick={() => remove(r.id)}>Eliminar</Button>
      </div>
    ) },
  ];
  return (
    <div className="space-y-2">
      <Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>Nuevo</Button>
      <Table rowKey="id" dataSource={rows as any} columns={columns} pagination={{ pageSize: 10 }} />

      <Modal title={editing ? 'Editar Producto' : 'Nuevo Producto'} open={open} onOk={async () => {
        const v = await form.validateFields();
        if (editing) await update({ id: editing.id, data: v }); else await create(v);
        setOpen(false); setEditing(null); form.resetFields();
      }} onCancel={() => { setOpen(false); setEditing(null); }}>
        <Form form={form} layout="vertical" initialValues={{ activo: true }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="unidad" label="Unidad" rules={[{ required: true }]}>
            <Select options={["UNIDAD","CAJA","PAQUETE","KG","G","L","ML","M","CM"].map(u => ({ value: u, label: u }))} />
          </Form.Item>
          <Form.Item name="areaId" label="Área" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ubicacionId" label="Ubicación" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="activo" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
