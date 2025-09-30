import { Button, DatePicker, Form, Input, InputNumber, Select, message } from 'antd';
import dayjs from 'dayjs';
import { z } from 'zod';
import type { Ingreso } from '../../types/ingreso';
import { useCreateIngreso, useProductos, useProveedores, useReferencias } from '../../lib/api';

const schema = z.object({
  fechaVencimiento: z.string().optional(),
  fechaIngreso: z.string(),
  fechaFactura: z.string().optional(),
  serieFactura: z.string().optional(),
  marca: z.string().optional(),
  cantidad: z.number().positive(),
  unidad: z.string(),
  precio: z.number().min(0),
  areaId: z.string(),
  ubicacionId: z.string(),
  proveedorId: z.string(),
  productoId: z.string(),
});

export default function IngresoForm({ onSuccess }: { onSuccess?: (ing: Ingreso) => void }) {
  const [form] = Form.useForm();
  const { data: prodRes } = useProductos();
  const { data: provRes } = useProveedores();
  const { data: refRes } = useReferencias();
  const { mutateAsync, isPending } = useCreateIngreso();

  const onFinish = async (values: any) => {
    const parsed = schema.safeParse({
      ...values,
      fechaIngreso: values.fechaIngreso?.toISOString?.() ?? values.fechaIngreso,
      fechaFactura: values.fechaFactura?.toISOString?.(),
      fechaVencimiento: values.fechaVencimiento?.toISOString?.(),
    });
    if (!parsed.success) {
      message.error('Revisa los datos del formulario');
      return;
    }
    try {
      const res = await mutateAsync(parsed.data as any);
      message.success('Ingreso registrado');
      onSuccess?.(res.data as any);
      form.resetFields();
      form.setFieldsValue({ fechaIngreso: dayjs() });
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'No se pudo registrar el ingreso';
      message.error(msg);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ fechaIngreso: dayjs() }}>
      <Form.Item name="marca" label="Marca">
        <Input placeholder="Marca del producto (opcional)" />
      </Form.Item>
      <Form.Item name="productoId" label="Producto" rules={[{ required: true }]}>
        <Select options={prodRes?.data.map(p => ({ label: p.nombre, value: p.id }))} />
      </Form.Item>
      <Form.Item name="proveedorId" label="Proveedor" rules={[{ required: true }]}>
        <Select options={provRes?.data.map(p => ({ label: p.nombre, value: p.id }))} />
      </Form.Item>
      <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true, type: 'number', min: 0.000001 }]}>
        <InputNumber className="w-full" />
      </Form.Item>
      <Form.Item name="unidad" label="Unidad" rules={[{ required: true }]}>
        <Select options={["UNIDAD","CAJA","PAQUETE","KG","G","L","ML","M","CM"].map(u => ({ value: u, label: u }))} />
      </Form.Item>
      <Form.Item name="precio" label="Precio" rules={[{ required: true, type: 'number', min: 0 }]}>
        <InputNumber className="w-full" prefix="S/ " />
      </Form.Item>
      <Form.Item name="areaId" label="Área" rules={[{ required: true }]}>
        <Select options={refRes?.data.areas.map(a => ({ label: a.nombre, value: a.id }))} />
      </Form.Item>
      <Form.Item name="ubicacionId" label="Ubicación" rules={[{ required: true }]}>
        <Select options={refRes?.data.ubicaciones.map(u => ({ label: u.nombre, value: u.id }))} />
      </Form.Item>
      <Form.Item name="fechaIngreso" label="Fecha Ingreso" rules={[{ required: true }]}>
        <DatePicker className="w-full" />
      </Form.Item>
      <Form.Item name="fechaVencimiento" label="Fecha Vencimiento">
        <DatePicker className="w-full" />
      </Form.Item>
      <Form.Item name="fechaFactura" label="Fecha Factura">
        <DatePicker className="w-full" />
      </Form.Item>
      <Form.Item name="serieFactura" label="Serie Factura">
        <Input />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={isPending}>Guardar</Button>
      </Form.Item>
    </Form>
  );
}
