import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Space, message, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useUnidadesMedida, useCreateUnidadMedida, useUpdateUnidadMedida, useDeleteUnidadMedida } from '../../lib/api';

interface UnidadMedidaCompleta {
  id: string;
  nombre: string;
  simbolo: string;
  activo: boolean;
}

export default function UnidadesMedidaPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState<UnidadMedidaCompleta | null>(null);
  const [form] = Form.useForm();

  const { data: unidadesResult = { data: [] }, isLoading } = useUnidadesMedida();
  const unidades = unidadesResult.data || [];
  const { mutateAsync: createUnidad } = useCreateUnidadMedida();
  const { mutateAsync: updateUnidad } = useUpdateUnidadMedida();
  const { mutateAsync: deleteUnidad } = useDeleteUnidadMedida();

  const handleSubmit = async (values: { nombre: string; simbolo: string; activo?: boolean }) => {
    try {
      const data = {
        nombre: values.nombre,
        simbolo: values.simbolo.toUpperCase(),
        activo: values.activo !== false
      };

      if (editingUnidad) {
        await updateUnidad({ id: editingUnidad.id, data });
        message.success('Unidad de medida actualizada');
      } else {
        await createUnidad(data);
        message.success('Unidad de medida creada');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingUnidad(null);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al guardar la unidad de medida');
    }
  };

  const handleEdit = (unidad: UnidadMedidaCompleta) => {
    setEditingUnidad(unidad);
    form.setFieldsValue({
      nombre: unidad.nombre,
      simbolo: unidad.simbolo,
      activo: unidad.activo
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '¿Está seguro de eliminar esta unidad de medida?',
      content: 'Esta acción no se puede deshacer y no será posible si está en uso por productos',
      onOk: async () => {
        try {
          await deleteUnidad(id);
          message.success('Unidad de medida eliminada');
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Error al eliminar la unidad de medida');
        }
      },
    });
  };

  const handleCancel = () => {
    setModalOpen(false);
    form.resetFields();
    setEditingUnidad(null);
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      sorter: (a: UnidadMedidaCompleta, b: UnidadMedidaCompleta) => a.nombre.localeCompare(b.nombre),
    },
    {
      title: 'Símbolo',
      dataIndex: 'simbolo',
      key: 'simbolo',
      width: 120,
      sorter: (a: UnidadMedidaCompleta, b: UnidadMedidaCompleta) => a.simbolo.localeCompare(b.simbolo),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 100,
      render: (activo: boolean) => (
        <span className={activo ? 'text-green-600' : 'text-red-600'}>
          {activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
      filters: [
        { text: 'Activo', value: true },
        { text: 'Inactivo', value: false },
      ],
      onFilter: (value: any, record: UnidadMedidaCompleta) => record.activo === value,
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_: any, record: UnidadMedidaCompleta) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card
        title="Gestión de Unidades de Medida"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Nueva Unidad
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={unidades}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={isLoading}
        />
      </Card>

      <Modal
        title={editingUnidad ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}
        open={modalOpen}
        onCancel={handleCancel}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ activo: true }}
        >
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[
              { required: true, message: 'El nombre es requerido' },
              { min: 2, message: 'El nombre debe tener al menos 2 caracteres' },
            ]}
          >
            <Input placeholder="Ej: Kilogramo, Litro, Metro, etc." />
          </Form.Item>

          <Form.Item
            label="Símbolo"
            name="simbolo"
            rules={[
              { required: true, message: 'El símbolo es requerido' },
              { min: 1, message: 'El símbolo debe tener al menos 1 carácter' },
              { max: 10, message: 'El símbolo no debe exceder 10 caracteres' },
              { pattern: /^[A-Z0-9_]+$/, message: 'Solo letras mayúsculas, números y guiones bajos' },
            ]}
          >
            <Input 
              placeholder="Ej: KG, L, M, UNIDAD" 
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                form.setFieldsValue({ simbolo: value });
              }}
            />
          </Form.Item>

          <Form.Item
            label="Estado"
            name="activo"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Activo" 
              unCheckedChildren="Inactivo" 
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUnidad ? 'Actualizar' : 'Crear'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
