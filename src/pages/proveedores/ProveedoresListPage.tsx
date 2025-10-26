import { Button, Form, Input, Modal, Table, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useProveedores, useCreateProveedor, useRemoveProveedor, useUpdateProveedor } from '../../lib/api';
import { useState, useMemo } from 'react';
import { defaultPaginationConfig } from '../../hooks/useTablePagination';

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

  const uniqueFilter = (dataIndex: string) =>
    Array.from(new Set(rows.map((i: any) => i[dataIndex]).filter(Boolean)))
      .map(v => ({ text: v, value: v }));

  const columns: ColumnsType<any> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      filters: uniqueFilter('nombre'),
      onFilter: (value, record) =>
        record.nombre?.indexOf(value as string) === 0
    },
    {
      title: 'RUC',
      dataIndex: 'ruc',
      filters: uniqueFilter('ruc'),
      onFilter: (value, record) =>
        record.ruc?.indexOf(value as string) === 0
    },
    { title: 'Dirección', dataIndex: 'direccion' },
    { title: 'Contacto', dataIndex: 'contacto' },
    { title: 'Teléfono', dataIndex: 'telefono' },
    {
      title: 'Acciones',
      render: (_: any, r: any) => (
        <div className="flex gap-2">
          <Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(r); setOpen(true); form.setFieldsValue(r); }} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(r.id)} />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <Card
        title="Gestión de Proveedores"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setOpen(true); form.resetFields(); }}
          >
            Nuevo Proveedor
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={rows as any}
          columns={columns}
          pagination={defaultPaginationConfig}
        />
      </Card>

      <Modal
        title={editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        open={open}
        onOk={onSave}
        onCancel={() => { setOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ruc" label="RUC" rules={[{ required: true, len: 11 }]}>
            <Input maxLength={11} />
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
