import { Button, Form, Input, Modal, Table, Space, Card } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { useProveedores, useCreateProveedor, useRemoveProveedor, useUpdateProveedor } from '../../lib/api';
import { useState } from 'react';

export default function ProveedoresListPage() {
  const { data } = useProveedores();
  const { mutateAsync: create } = useCreateProveedor();
  const { mutateAsync: update } = useUpdateProveedor();
  const { mutateAsync: remove } = useRemoveProveedor();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const onSave = async () => {
    const v = await form.validateFields();
    if (editing) await update({ id: editing.id, data: v }); else await create(v);
    setOpen(false); setEditing(null); form.resetFields();
  };

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
    { title: 'Dirección', dataIndex: 'direccion', ...textFilter('direccion', 'dirección') },
    { title: 'Contacto', dataIndex: 'contacto', ...textFilter('contacto', 'contacto') },
    { title: 'Teléfono', dataIndex: 'telefono', ...textFilter('telefono', 'teléfono') },
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
        title="Gestión de Proveedores"
        extra={
          <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => { setOpen(true); form.resetFields(); }}>Nuevo</Button>
        }
      >
        <Table rowKey="id" dataSource={rows as any} columns={columns} pagination={{ pageSize: 10 }} />
      </Card>
      <Modal title={editing ? 'Editar Proveedor' : 'Nuevo Proveedor'} open={open} onOk={onSave} onCancel={() => { setOpen(false); setEditing(null); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="direccion" label="Dirección" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contacto" label="Contacto" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
