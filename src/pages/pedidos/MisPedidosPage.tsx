import { Button, Form, InputNumber, Select, message, Table, Input, Space, Card } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePedidos, useCrearPedidosBatch, useProductos } from '../../lib/api';

export default function MisPedidosPage() {
  const { data } = usePedidos();
  const { mutateAsync } = useCrearPedidosBatch();
  const [form] = Form.useForm();
  const rows = data?.data ?? [];
  const { data: prodsRes } = useProductos();
  const productos = prodsRes?.data ?? [];
  const nameOf = (id: string) => productos.find((p: any) => p.id === id)?.nombre ?? id;
  const unidadFilters = Array.from(new Set(rows.map((r: any) => r.unidad))).filter(Boolean).map((u) => ({ text: u, value: u }));
  const estadoFilters = Array.from(new Set(rows.map((r: any) => r.estado))).filter(Boolean).map((e) => ({ text: e, value: e }));

  const textFilter = (placeholder: string, getValue: (record: any) => string): ColumnType<any> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <div className="p-2">
        <Input
          placeholder={`Filtrar ${placeholder}`}
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
    { title: 'Producto', dataIndex: 'productoId', render: (_: any, r: any) => nameOf(r.productoId), ...textFilter('producto', (rec) => nameOf(rec.productoId)) },
    { title: 'Cantidad', dataIndex: 'cantidad', sorter: (a, b) => (a.cantidad || 0) - (b.cantidad || 0) },
    { title: 'Unidad', dataIndex: 'unidad', filters: unidadFilters, onFilter: (v, r) => r.unidad === v },
    { title: 'Estado', dataIndex: 'estado', filters: estadoFilters, onFilter: (v, r) => r.estado === v },
    { title: 'Fecha', dataIndex: 'fecha', render: (v: any) => (v ? dayjs(v).format('YYYY-MM-DD') : ''), sorter: (a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf() },
  ];
  const onFinish = async (v: any) => {
    const items = (v.items || []).filter((it: any) => it?.productoId && it?.cantidad && it?.unidad);
    if (!items.length) { message.warning('Agregue al menos un producto'); return; }
    await mutateAsync(items);
    message.success('Pedidos enviados');
    form.resetFields();
  };
  return (
    <div className="space-y-3">
      <Card title="Nuevo pedido (varios productos)">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} align="baseline" wrap>
                    <Form.Item {...rest} name={[name, 'productoId']} rules={[{ required: true, message: 'Seleccione producto' }]}>
                      <Select
                        showSearch
                        placeholder="Producto"
                        optionFilterProp="label"
                        style={{ minWidth: 220 }}
                        options={productos.map((p: any) => ({ value: p.id, label: p.nombre }))}
                      />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'cantidad']} rules={[{ required: true, type: 'number', min: 0.000001 }] }>
                      <InputNumber placeholder="Cantidad" />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'unidad']} rules={[{ required: true, message: 'Seleccione unidad' }]}>
                      <Select style={{ minWidth: 120 }} options={["UNIDAD","CAJA","PAQUETE","KG","G","L","ML","M","CM"].map(u => ({ value: u, label: u }))} />
                    </Form.Item>
                    <Button danger onClick={() => remove(name)}>Eliminar</Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()}>
                  Agregar producto
                </Button>
                <div>
                  <Button type="primary" htmlType="submit">Enviar pedido</Button>
                </div>
              </div>
            )}
          </Form.List>
        </Form>
      </Card>
  <Table rowKey="id" dataSource={rows as any} columns={columns} pagination={{ pageSize: 10 }} />
    </div>
  );
}
