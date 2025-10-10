import { Button, DatePicker, Form, Input, InputNumber, Select, message } from 'antd';
import dayjs from 'dayjs';
import { z } from 'zod';
import type { Ingreso } from '../../types/ingreso';
import { useCreateIngreso, useProductos, useProveedores } from '../../lib/api';

const schema = z.object({
  fechaVencimiento: z.string().optional(),
  fechaIngreso: z.string(),
  fechaFactura: z.string().optional(),
  serieFactura: z.string().optional(),
  marca: z.string().optional(),
  cantidad: z.number().positive(),
  precio: z.number().min(0),
  proveedorId: z.string(),
  productoId: z.string(),
});

export default function IngresoForm({ onSuccess }: { onSuccess?: (ing: Ingreso) => void }) {
  const [form] = Form.useForm();
  const { data: prodRes } = useProductos();
  const { data: provRes } = useProveedores();
  const { mutateAsync, isPending } = useCreateIngreso();

  const productos = prodRes?.data ?? [];
  const selectedProductId = Form.useWatch('productoId', form);
  const selectedProduct = productos.find(p => p.id === selectedProductId);

  const onProductoChange = (productoId: string) => {
    const producto = productos.find(p => p.id === productoId);
    if (producto?.marca) {
      form.setFieldsValue({ marca: producto.marca });
    } else {
      form.setFieldsValue({ marca: null });
    }
  };

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
      <Form.Item name="marca" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="productoId" label="Producto" rules={[{ required: true }]}>
        <Select 
          showSearch
          placeholder="Buscar producto por nombre o marca..."
          optionFilterProp="children"
          filterOption={(input, option) => {
            const searchText = input.toLowerCase();
            const label = (option?.label ?? '').toLowerCase();
            return label.includes(searchText);
          }}
          options={productos.map(p => ({ 
            label: `${p.nombre}${p.marca ? ` - ${p.marca}` : ''}`, 
            value: p.id,
            searchText: `${p.nombre} ${p.marca || ''}`.toLowerCase()
          }))} 
          onChange={onProductoChange}
          style={{ width: '100%' }}
        />
      </Form.Item>
      {selectedProduct?.marca && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded">
          <small className="text-blue-600">
            <strong>Marca:</strong> {selectedProduct.marca} (detectada automáticamente)
          </small>
        </div>
      )}
      <Form.Item name="proveedorId" label="Proveedor" rules={[{ required: true }]}>
        <Select options={provRes?.data.map(p => ({ label: p.nombre, value: p.id }))} />
      </Form.Item>
      <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true, type: 'number', min: 0.000001 }]}>
        <InputNumber className="w-full" />
      </Form.Item>
      <Form.Item name="precio" label="Precio" rules={[{ required: true, type: 'number', min: 0 }]}>
        <InputNumber className="w-full" prefix="S/ " />
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
