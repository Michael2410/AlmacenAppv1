import { Button, Form, InputNumber, Select, message, Typography, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCrearAsignacion, useStockGeneral, useUsers } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { useMemo, useState } from 'react';

export default function AlmacenGeneralPage() {
  const { data } = useStockGeneral();
  const rows = data?.data ?? [];
  const isAdmin = useAuthStore(s => s.user?.roleId === 'role-encargado');
  const { mutateAsync } = useCrearAsignacion();
  const [form] = Form.useForm();
  const { data: usersRes } = useUsers();
  const users = usersRes?.data ?? [];
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const selectedDisponible = useMemo(() => {
    if (!selectedProductId) return undefined;
    const row = (rows as any[]).find(r => r.productoId === selectedProductId || r.id === selectedProductId);
    return row?.cantidadDisponible as number | undefined;
  }, [rows, selectedProductId]);

  const assign = async (v: any) => {
    if (!v.usuarioId || !v.productoId || !v.cantidad) {
      message.error('Complete los campos requeridos');
      return;
    }
  const row = (rows as any[]).find(r => r.productoId === v.productoId || r.id === v.productoId);
    const unidad = v.unidad ?? row?.unidad;
    if (!unidad) {
      message.error('Seleccione unidad');
      return;
    }
  await mutateAsync({ usuarioId: v.usuarioId, productoId: v.productoId, cantidad: Number(v.cantidad), unidad, marca: v.marca ?? row?.marca ?? null });
    message.success('Asignado al usuario');
    form.resetFields();
    setSelectedProductId(undefined);
  };
  return (
    <div className="space-y-3">
      {isAdmin && (
        <Form form={form} layout="inline" onFinish={assign}>
          <Form.Item name="usuarioId" rules={[{ required: true, message: 'Seleccione un usuario' }]}>
            <Select
              showSearch
              placeholder="Usuario"
              optionFilterProp="label"
              style={{ minWidth: 200 }}
              options={users.map(u => ({ value: u.id, label: `${u.nombres} (${u.email})` }))}
            />
          </Form.Item>
          <Form.Item name="productoId" rules={[{ required: true, message: 'Seleccione un producto' }]}>
            <Select
              showSearch
              placeholder="Producto"
              optionFilterProp="label"
              style={{ minWidth: 220 }}
              onChange={(val) => {
                setSelectedProductId(val);
                const row = (rows as any[]).find(r => r.productoId === val || r.id === val);
                if (row?.unidad) {
                  form.setFieldsValue({ unidad: row.unidad });
                }
              }}
              options={(rows as any[]).map(r => ({ value: r.productoId ?? r.id, label: `${r.nombre}${r.marca ? ' - ' + r.marca : ''}` }))}
            />
          </Form.Item>
          <Form.Item name="marca" rules={[]}> 
            <Select allowClear placeholder="Marca" style={{ minWidth: 160 }}
              options={Array.from(new Set((rows as any[]).filter(r => (r.productoId ?? r.id) === selectedProductId).map(r => r.marca).filter(Boolean))).map((m: any) => ({ label: m, value: m }))} />
          </Form.Item>
          <Form.Item
            name="cantidad"
            rules={[
              { required: true, message: 'Ingrese cantidad' },
              { type: 'number', min: 0.000001, message: 'Cantidad inválida' },
              () => ({
                validator(_, value) {
                  if (value == null || selectedDisponible == null) return Promise.resolve();
                  return value <= selectedDisponible
                    ? Promise.resolve()
                    : Promise.reject(new Error('Cantidad supera disponible'));
                },
              }),
            ]}
          >
            <InputNumber placeholder="Cantidad" />
          </Form.Item>
          <Form.Item name="unidad" rules={[{ required: true, message: 'Seleccione unidad' }]}>
            <Select style={{ minWidth: 120 }} options={["UNIDAD","CAJA","PAQUETE","KG","G","L","ML","M","CM"].map(u => ({ value: u, label: u }))} />
          </Form.Item>
          <Form.Item> <Button type="primary" htmlType="submit">Asignar</Button> </Form.Item>
          {selectedDisponible != null && (
            <Typography.Text type="secondary">Disponible: {selectedDisponible}</Typography.Text>
          )}
        </Form>
      )}
      <Table
        rowKey={(r: any) => `${r.productoId ?? r.id}::${r.marca ?? ''}`}
        dataSource={rows as any}
        columns={[
      { title: 'Producto', dataIndex: 'nombre' },
          { title: 'Marca', dataIndex: 'marca', filters: Array.from(new Set((rows as any[]).map(r => r.marca).filter(Boolean))).map((m: any) => ({ text: m, value: m })), onFilter: (v: any, r: any) => r.marca === v },
          { title: 'Unidad', dataIndex: 'unidad' },
          { title: 'Área', dataIndex: 'areaId' },
          { title: 'Ubicación', dataIndex: 'ubicacionId' },
          { title: 'Disponible', dataIndex: 'cantidadDisponible', sorter: (a: any, b: any) => (a.cantidadDisponible || 0) - (b.cantidadDisponible || 0) },
          { title: 'Activo', dataIndex: 'activo', render: (v: any) => (v ? 'Sí' : 'No') },
        ] as ColumnsType<any>}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}
