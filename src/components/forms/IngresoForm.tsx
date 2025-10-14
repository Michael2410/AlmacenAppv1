import { Button, DatePicker, Form, Input, InputNumber, Select, Row, Col, Card, Divider, message } from 'antd';
import dayjs from 'dayjs';
import { z } from 'zod';
import type { Ingreso } from '../../types/ingreso';
import { useCreateIngreso, useProductos, useProveedores } from '../../lib/api';
import { ClearOutlined, PlusOutlined } from '@ant-design/icons';

const schema = z.object({
  fechaVencimiento: z.string().optional(),
  fechaIngreso: z.string(),
  fechaFactura: z.string().optional(),
  serieFactura: z.string().optional(),
  marca: z.string().nullable().optional().transform(val => val ?? ''),
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
    // ✅ Guarda la marca en el form aunque el campo esté oculto
    form.setFieldsValue({ marca: producto?.marca ?? null });
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
    <Card
      title="Registrar Ingreso"
      bordered={false}
      style={{
        maxWidth: 800,
        margin: "0 auto",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        borderRadius: 10,
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ fechaIngreso: dayjs() }}
      >
        {/* 👇 Campo oculto para registrar la marca */}
        <Form.Item name="marca" style={{ display: 'none' }} preserve={true}>
          <Input />
        </Form.Item>

        <Divider orientation="left" plain>📦 Datos del producto</Divider>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="productoId" label="Producto" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Buscar producto..."
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={productos.map(p => ({
                  label: `${p.nombre}${p.marca ? ` - ${p.marca}` : ''}`,
                  value: p.id,
                }))}
                onChange={onProductoChange}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="proveedorId" label="Proveedor" rules={[{ required: true }]}>
              <Select
                placeholder="Selecciona proveedor"
                options={provRes?.data.map(p => ({ label: p.nombre, value: p.id }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {selectedProduct?.marca && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded">
            <small className="text-blue-600">
              <strong>Marca detectada:</strong> {selectedProduct.marca}
            </small>
          </div>
        )}

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0.000001} />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="precio" label="Precio (S/)" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} prefix="S/ " />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" plain>🧾 Fechas y factura</Divider>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="fechaIngreso" label="Fecha de Ingreso" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="fechaVencimiento" label="Fecha de Vencimiento">
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="fechaFactura" label="Fecha de Factura">
              <DatePicker className="w-full" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="serieFactura" label="Serie de Factura">
              <Input placeholder="Ej. F001-12345" />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Form.Item style={{ textAlign: "right" }}>
          <Button
            type="default"
            onClick={() => form.resetFields()}
            icon={<ClearOutlined />}
            style={{ marginRight: 8 }}
          >
            Limpiar
          </Button>

          <Button
            type="primary"
            htmlType="submit"
            loading={isPending}
            icon={<PlusOutlined />}
          >
            Guardar Ingreso
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
