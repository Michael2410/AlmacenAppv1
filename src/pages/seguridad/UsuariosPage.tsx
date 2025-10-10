import { Button, Form, Input, Modal, Select, Table, Space } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import { useUsers, useRoles, useCreateUser, useUpdateUser, useRemoveUser } from '../../lib/api';
import { useState } from 'react';

export default function UsuariosPage() {
  const { data } = useUsers();
  const { data: rolesData } = useRoles();
  const { mutateAsync: create } = useCreateUser();
  const { mutateAsync: update } = useUpdateUser();
  const { mutateAsync: remove } = useRemoveUser();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const onSave = async () => {
    const v = await form.validateFields();
    if (editing) await update({ id: editing.id, data: v }); else await create(v);
    setOpen(false); setEditing(null); form.resetFields();
  };

  const rows = data?.data ?? [];
  const roles = rolesData?.data ?? [];
  const roleOptions = roles.map((r: any) => ({ label: r.name, value: r.id }));

  // Función para obtener el nombre del rol por su ID
  const getRoleName = (roleId: string) => {
    const role = roles.find((r: any) => r.id === roleId);
    return role?.name || roleId;
  };

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
    { title: 'Nombres', dataIndex: 'nombres', ...textFilter('nombres', 'nombres') },
    { title: 'Email', dataIndex: 'email', ...textFilter('email', 'email') },
    { 
      title: 'Rol', 
      dataIndex: 'roleId', 
      render: (roleId: string) => getRoleName(roleId),
      ...textFilter('roleId', 'rol') 
    },
    { title: 'Acciones', render: (_: any, r: any) => (
      <div className="flex gap-2">
        <Button size="small" onClick={() => { setEditing(r); setOpen(true); form.setFieldsValue({ nombres: r.nombres, email: r.email, roleId: r.roleId }); }}>Editar</Button>
        <Button size="small" danger onClick={() => remove(r.id)}>Eliminar</Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-2">
      <Button type="primary" onClick={() => { setOpen(true); form.resetFields(); }}>Nuevo Usuario</Button>
  <Table rowKey="id" dataSource={rows as any} columns={columns} pagination={{ pageSize: 10 }} />

      <Modal title={editing ? 'Editar Usuario' : 'Nuevo Usuario'} open={open} onOk={onSave} onCancel={() => { setOpen(false); setEditing(null); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="nombres" label="Nombres" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="roleId" label="Rol" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          {!editing && (
            <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
