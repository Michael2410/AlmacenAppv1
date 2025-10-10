import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useUbicaciones, useCreateUbicacion, useUpdateUbicacion, useDeleteUbicacion } from '../../lib/api';
import type { Ubicacion } from '../../types/catalogo';

export default function UbicacionesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUbicacion, setEditingUbicacion] = useState<Ubicacion | null>(null);
  const [form] = Form.useForm();

  const { data: ubicacionesResult = { data: [] }, isLoading } = useUbicaciones();
  const ubicaciones = ubicacionesResult.data || [];
  const { mutateAsync: createUbicacion } = useCreateUbicacion();
  const { mutateAsync: updateUbicacion } = useUpdateUbicacion();
  const { mutateAsync: deleteUbicacion } = useDeleteUbicacion();

  const handleSubmit = async (values: { nombre: string }) => {
    try {
      if (editingUbicacion) {
        await updateUbicacion({ id: editingUbicacion.id, data: values });
        message.success('Ubicación actualizada');
      } else {
        await createUbicacion(values);
        message.success('Ubicación creada');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingUbicacion(null);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al guardar la ubicación');
    }
  };

  const handleEdit = (ubicacion: Ubicacion) => {
    setEditingUbicacion(ubicacion);
    form.setFieldsValue(ubicacion);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '¿Está seguro de eliminar esta ubicación?',
      content: 'Esta acción no se puede deshacer',
      onOk: async () => {
        try {
          await deleteUbicacion(id);
          message.success('Ubicación eliminada');
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Error al eliminar la ubicación');
        }
      },
    });
  };

  const handleCancel = () => {
    setModalOpen(false);
    form.resetFields();
    setEditingUbicacion(null);
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      sorter: (a: Ubicacion, b: Ubicacion) => a.nombre.localeCompare(b.nombre),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_: any, record: Ubicacion) => (
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
        title="Gestión de Ubicaciones"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Nueva Ubicación
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={ubicaciones}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={isLoading}
        />
      </Card>

      <Modal
        title={editingUbicacion ? 'Editar Ubicación' : 'Nueva Ubicación'}
        open={modalOpen}
        onCancel={handleCancel}
        footer={null}
        width={400}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Nombre de la Ubicación"
            name="nombre"
            rules={[
              { required: true, message: 'El nombre es requerido' },
              { min: 2, message: 'El nombre debe tener al menos 2 caracteres' },
            ]}
          >
            <Input placeholder="Ej: Estante A1, Nivel 2, Pasillo 3, etc." />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUbicacion ? 'Actualizar' : 'Crear'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
