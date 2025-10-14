import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Checkbox, 
  Space, 
  message, 
  Tag, 
  Tooltip,
  Collapse,
  Typography,
  Divider
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, SafetyOutlined } from '@ant-design/icons';
import type { 
  Role, 
  Permission
} from '../../types/seguridad';
import { 
  PERMISSION_GROUPS, 
  PERMISSION_DESCRIPTIONS
} from '../../types/seguridad';
import { useAuthStore } from '../../store/auth.store';

const { Text, Title } = Typography;
const { Panel } = Collapse;

interface PermissionGroupProps {
  groupKey: string;
  groupPermissions: readonly string[];
  selectedPermissions: string[];
  onPermissionChange: (permission: string, checked: boolean) => void;
  disabled?: boolean;
}

const PermissionGroup: React.FC<PermissionGroupProps> = ({ 
  groupKey, 
  groupPermissions, 
  selectedPermissions, 
  onPermissionChange,
  disabled = false
}) => {
  const isAllChecked = groupPermissions.every(p => selectedPermissions.includes(p));
  const isIndeterminate = groupPermissions.some(p => selectedPermissions.includes(p)) && !isAllChecked;

  const handleGroupChange = (checked: boolean) => {
    // Procesar todos los permisos del grupo de manera secuencial
    // para evitar problemas de estado compartido
    for (const permission of groupPermissions) {
      onPermissionChange(permission, checked);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Checkbox
        indeterminate={isIndeterminate}
        checked={isAllChecked}
        onChange={(e) => handleGroupChange(e.target.checked)}
        disabled={disabled}
        style={{ fontWeight: 'bold', marginBottom: 8 }}
      >
        {groupKey}
      </Checkbox>
      <div style={{ marginLeft: 24 }}>
        {groupPermissions.map(permission => (
          <div key={permission} style={{ marginBottom: 4 }}>
            <Checkbox
              checked={selectedPermissions.includes(permission)}
              onChange={(e) => onPermissionChange(permission, e.target.checked)}
              disabled={disabled}
            >
              <span>
                {PERMISSION_DESCRIPTIONS[permission as Permission] || permission}
              </span>
            </Checkbox>
          </div>
        ))}
      </div>
    </div>
  );
};

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const token = useAuthStore(s => s.token);
  const login = useAuthStore(s => s.login);
  const user = useAuthStore(s => s.user);

  // Función para actualizar roles en el auth store después de cambios
  const updateAuthStoreRoles = (newRoles: Role[]) => {
    if (user && token) {
      login(user, token, newRoles);
    }
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
        updateAuthStoreRoles(data.data); // Actualizar auth store con roles frescos
      } else {
        message.error('Error al cargar roles');
      }
    } catch (error) {
      message.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRoles();
    }
  }, [token]);

  const handleSubmit = async (values: any) => {
    try {
      const method = editingRole ? 'PUT' : 'POST';
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(values)
      });

      const data = await response.json();
      if (data.success) {
        message.success(editingRole ? 'Rol actualizado' : 'Rol creado');
        setModalVisible(false);
        setEditingRole(null);
        form.resetFields();
        fetchRoles();
      } else {
        message.error(data.message || 'Error al guardar');
      }
    } catch (error) {
      message.error('Error de conexión');
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.predefined) {
      message.warning('No se pueden eliminar roles predefinidos');
      return;
    }

    Modal.confirm({
      title: '¿Eliminar rol?',
      content: `¿Está seguro de eliminar el rol "${role.name}"?`,
      onOk: async () => {
        try {
          const response = await fetch(`/api/roles/${role.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (data.success) {
            message.success('Rol eliminado');
            fetchRoles();
          } else {
            message.error(data.message || 'Error al eliminar');
          }
        } catch (error) {
          message.error('Error de conexión');
        }
      }
    });
  };

  const openModal = (role?: Role) => {
    setEditingRole(role || null);
    setModalVisible(true);
    
    if (role) {
      form.setFieldsValue({
        name: role.name,
        permissions: role.permissions
      });
    } else {
      form.resetFields();
    }
  };

  const columns = [
    {
      title: 'Rol',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Role) => (
        <Space>
          <SafetyOutlined style={{ color: record.predefined ? '#1890ff' : '#52c41a' }} />
          <span style={{ fontWeight: record.predefined ? 'bold' : 'normal' }}>
            {text}
          </span>
          {record.predefined && <Tag color="blue">Predefinido</Tag>}
        </Space>
      ),
    },
    {
      title: 'Permisos',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => (
        <Text type="secondary">
          {permissions.length} {permissions.length === 1 ? 'permiso' : 'permisos'}
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: Role) => (
        <Space>
          <Tooltip title="Editar permisos">
            <Button 
              icon={<EditOutlined />} 
              size="small" 
              onClick={() => openModal(record)}
            />
          </Tooltip>
          {!record.predefined && (
            <Tooltip title="Eliminar rol">
              <Button 
                icon={<DeleteOutlined />} 
                size="small" 
                danger 
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={4} style={{ margin: 0 }}>
            <SettingOutlined style={{ marginRight: 8 }} />
            Gestión de Roles y Permisos
          </Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => openModal()}
          >
            Nuevo Rol
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingRole ? `Editar Rol: ${editingRole.name}` : 'Nuevo Rol'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRole(null);
          form.resetFields();
        }}
        width={800}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ permissions: [] }}
        >
          {(!editingRole || !editingRole.predefined) && (
            <Form.Item
              name="name"
              label="Nombre del Rol"
              rules={[{ required: true, message: 'Ingrese el nombre del rol' }]}
            >
              <Input placeholder="Ej: Supervisor, Vendedor, etc." />
            </Form.Item>
          )}

          <Form.Item
            name="permissions"
            label="Permisos"
            rules={[{ required: true, message: 'Seleccione al menos un permiso' }]}
          >
            <Form.Item noStyle shouldUpdate>
              {() => {
                const value = form.getFieldValue('permissions') || [];
                return (
                  <Collapse ghost>
                    {Object.entries(PERMISSION_GROUPS).map(([groupKey, groupPermissions]) => (
                      <Panel 
                        header={
                          <span>
                            {groupKey}
                          </span>
                        } 
                        key={groupKey}
                      >
                        <PermissionGroup
                          groupKey={groupKey}
                          groupPermissions={groupPermissions}
                          selectedPermissions={value}
                          onPermissionChange={(permission, checked) => {
                            // Obtener valor actual directamente del form
                            const current = form.getFieldValue('permissions') || [];
                            
                            if (checked) {
                              // Agregar si no existe
                              if (!current.includes(permission)) {
                                const updated = [...current, permission];
                                form.setFieldValue('permissions', updated);
                              }
                            } else {
                              // Remover
                              const updated = current.filter((p: string) => p !== permission);
                              form.setFieldValue('permissions', updated);
                            }
                          }}
                        />
                      </Panel>
                    ))}
                  </Collapse>
                );
              }}
            </Form.Item>
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={() => {
                  setModalVisible(false);
                  setEditingRole(null);
                  form.resetFields();
                }}
              >
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRole ? 'Actualizar' : 'Crear'} Rol
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RolesPage;
