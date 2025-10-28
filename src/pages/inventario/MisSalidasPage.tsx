import { Button, Form, Input, InputNumber, Select, message, Table, Input as AntInput, Space } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCrearMiSalida, useMisProductos, useMisSalidas, useStockMio } from '../../lib/api';

export default function MisSalidasPage() {
  const { data: sal } = useMisSalidas();
  const rows = sal?.data ?? [];
  const { data: prodsRes } = useMisProductos();
  const productos = prodsRes?.data ?? [];
  const { data: stockRes } = useStockMio();
  const stock = stockRes?.data ?? [];
  const { mutateAsync } = useCrearMiSalida();
  const [form] = Form.useForm();

  const onFinish = async (v: any) => {
    // Buscar la unidad del producto en el stock del usuario
    const stockItem = stock.find((s: any) => s.productoId === v.productoId);
    if (!stockItem) {
      message.error('No tienes este producto en tu inventario');
      return;
    }
    
    await mutateAsync({ 
      productoId: v.productoId, 
      cantidad: v.cantidad, 
      unidad: stockItem.unidad, 
      observacion: v.observacion 
    });
    message.success('Salida registrada');
    form.resetFields();
  };

  const productoNombre = (id: string) => productos.find((p: any) => p.id === id)?.nombre ?? id;
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
    { title: 'Fecha', dataIndex: 'fecha', render: (v: any) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : ''), sorter: (a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf() },
    { title: 'Observación', dataIndex: 'observacion', ...textFilter('observación', (rec) => rec.observacion ?? '') },
  ];

  return (
    <div className="space-y-3">
      <Form form={form} layout="inline" onFinish={onFinish}>
        <Form.Item name="productoId" rules={[{ required: true, message: 'Seleccione un producto' }]}>
          <Select 
            showSearch 
            placeholder="Buscar producto..." 
            optionFilterProp="label" 
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            style={{ minWidth: 280 }}
            options={productos.map((p: any) => {
              const stockItem = stock.find((s: any) => s.productoId === p.id);
              const disponible = stockItem?.cantidad || 0;
              return {
                value: p.id, 
                label: `${p.nombre}${p.marca ? ` - ${p.marca}` : ''} (Disponible: ${disponible})`,
                disabled: disponible <= 0
              };
            })} 
          />
        </Form.Item>
        <Form.Item name="cantidad" rules={[{ required: true, type: 'number', min: 0.000001 }]}>
          <InputNumber placeholder="Cantidad" min={1} />
        </Form.Item>
        <Form.Item name="observacion">
          <Input placeholder="Observación (opcional)" style={{ minWidth: 200 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Registrar salida</Button>
        </Form.Item>
      </Form>

  <Table rowKey="id" dataSource={rows as any} columns={columns} pagination={{ pageSize: 10 }} />
    </div>
  );
}
