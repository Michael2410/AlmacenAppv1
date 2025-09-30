import { Button, Form, Input, InputNumber, Select, message, Table, Input as AntInput, Space } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCrearSalida, useProductos, useSalidas } from '../../lib/api';

export default function SalidasPage() {
  const { data: sal } = useSalidas();
  const rows = sal?.data ?? [];
  const { data: prodsRes } = useProductos();
  const productos = prodsRes?.data ?? [];
  const { mutateAsync } = useCrearSalida();
  const [form] = Form.useForm();

  const onFinish = async (v: any) => {
    await mutateAsync({ productoId: v.productoId, cantidad: v.cantidad, unidad: v.unidad, observacion: v.observacion });
    message.success('Salida registrada');
    form.resetFields();
  };

  const productoNombre = (id: string) => productos.find((p: any) => p.id === id)?.nombre ?? id;
  const unidadFilters = Array.from(new Set(rows.map((r: any) => r.unidad))).filter(Boolean).map((u) => ({ text: u, value: u }));
  const textFilter = (label: string, getValue: (record: any) => string): ColumnType<any> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <div className="p-2">
        <AntInput
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
    onFilter: (value: any, record: any) => getValue(record).toLowerCase().includes(String(value ?? '').toLowerCase()),
  });

  const columns: ColumnsType<any> = [
    { title: 'Producto', dataIndex: 'productoId', render: (_: any, r: any) => productoNombre(r.productoId), ...textFilter('producto', (rec) => productoNombre(rec.productoId)) },
    { title: 'Cantidad', dataIndex: 'cantidad', sorter: (a, b) => (a.cantidad || 0) - (b.cantidad || 0) },
    { title: 'Unidad', dataIndex: 'unidad', filters: unidadFilters, onFilter: (v, r) => r.unidad === v },
    { title: 'Fecha', dataIndex: 'fecha', render: (v: any) => (v ? dayjs(v).format('YYYY-MM-DD') : ''), sorter: (a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf() },
    { title: 'Observación', dataIndex: 'observacion', ...textFilter('observación', (rec) => rec.observacion ?? '') },
  ];

  return (
    <div className="space-y-3">
      <Form form={form} layout="inline" onFinish={onFinish}>
        <Form.Item name="productoId" rules={[{ required: true, message: 'Seleccione un producto' }]}>
          <Select showSearch placeholder="Producto" optionFilterProp="label" style={{ minWidth: 220 }}
            options={productos.map((p: any) => ({ value: p.id, label: p.nombre }))} />
        </Form.Item>
        <Form.Item name="cantidad" rules={[{ required: true, type: 'number', min: 0.000001 }]}>
          <InputNumber placeholder="Cantidad" />
        </Form.Item>
        <Form.Item name="unidad" rules={[{ required: true, message: 'Seleccione unidad' }]}>
          <Select style={{ minWidth: 120 }} options={["UNIDAD","CAJA","PAQUETE","KG","G","L","ML","M","CM"].map(u => ({ value: u, label: u }))} />
        </Form.Item>
        <Form.Item name="observacion">
          <Input placeholder="Observación (opcional)" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Registrar salida</Button>
        </Form.Item>
      </Form>

  <Table rowKey="id" dataSource={rows as any} columns={columns} pagination={{ pageSize: 10 }} />
    </div>
  );
}
