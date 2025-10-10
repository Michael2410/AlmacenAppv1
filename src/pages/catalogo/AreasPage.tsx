import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAreas, useCreateArea, useUpdateArea, useDeleteArea } from '../../lib/api';

export default function AreasPage() {
  const { data } = useAreas();
  const { mutateAsync: createArea } = useCreateArea();
  const { mutateAsync: updateArea } = useUpdateArea();
  const { mutateAsync: deleteArea } = useDeleteArea();
  const [form] = Form.useForm();
  const [editingArea, setEditingArea] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const areas = data?.data ?? [];

  const handleSubmit = async (values: any) => {
    try {
      if (editingArea) {
        await updateArea({ id: editingArea.id, data: values });
        message.success('Área actualizada');
      } else {
        await createArea(values);
        message.success('Área creada');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingArea(null);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al guardar el área');
    }
  };

  const handleEdit = (area: any) => {
    setEditingArea(area);
    form.setFieldsValue(area);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '¿Está seguro de eliminar esta área?',
      content: 'Esta acción no se puede deshacer',
      onOk: async () => {
        try {
          await deleteArea(id);
          message.success('Área eliminada');
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Error al eliminar el área');
        }
      },
    });
  };

  const handleCancel = () => {
    setModalOpen(false);
    form.resetFields();
    setEditingArea(null);
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      sorter: (a: any, b: any) => a.nombre.localeCompare(b.nombre),
    },
    {
      title: 'Acciones',
      width: 120,
      render: (_, record) => (
        <Space>
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
        title="Gestión de Áreas"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Nueva Área
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={areas}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingArea ? 'Editar Área' : 'Nueva Área'}
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
            label="Nombre del Área"
            name="nombre"
            rules={[
              { required: true, message: 'El nombre es requerido' },
              { min: 2, message: 'El nombre debe tener al menos 2 caracteres' },
            ]}
          >
            <Input placeholder="Ej: Almacén Principal, Bodega 2, etc." />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                {editingArea ? 'Actualizar' : 'Crear'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
