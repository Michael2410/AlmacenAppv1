import { DatePicker, Flex, Select, Table } from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import ExportButton from '../../components/ExportButton';
import { useIngresos, useProveedores } from '../../lib/api';

export default function IngresosListPage() {
  const { data } = useIngresos();
  const { data: prov } = useProveedores();
  const rows = data?.data ?? [];
  const marcaFilters = Array.from(new Set(rows.map((r: any) => r.marca).filter(Boolean))).map((m) => ({ text: m, value: m }));

  const columns: ColumnsType<any> = [
  { title: 'Nombre', dataIndex: 'nombre' },
  { title: 'Marca', dataIndex: 'marca', filters: marcaFilters, onFilter: (v, r: any) => r.marca === v },
    { title: 'Cantidad', dataIndex: 'cantidad', sorter: (a, b) => (a.cantidad || 0) - (b.cantidad || 0) },
    { title: 'Unidad', dataIndex: 'unidad' },
    { title: 'Precio', dataIndex: 'precio', sorter: (a, b) => (a.precio || 0) - (b.precio || 0), render: (v: any) => `S/ ${v}` },
  { title: 'Fec. Vencimiento', dataIndex: 'fechaVencimiento', render: (v: any) => (v ? dayjs(v).format('YYYY-MM-DD') : ''), sorter: (a, b) => (dayjs(a.fechaVencimiento).valueOf() - dayjs(b.fechaVencimiento).valueOf()) },
  { title: 'N° Serie', dataIndex: 'serieFactura', render: (_: any, r: any) => r.serieFactura ?? r.numeroSerie ?? '' },
  { title: 'Fec. Factura', dataIndex: 'fechaFactura', render: (v: any) => (v ? dayjs(v).format('YYYY-MM-DD') : ''), sorter: (a, b) => (dayjs(a.fechaFactura).valueOf() - dayjs(b.fechaFactura).valueOf()) },
    { title: 'Fecha Ingreso', dataIndex: 'fechaIngreso', render: (v: any) => dayjs(v).format('YYYY-MM-DD'), sorter: (a, b) => dayjs(a.fechaIngreso).valueOf() - dayjs(b.fechaIngreso).valueOf() },
  ];

  return (
    <div className="space-y-3">
      <Flex gap={8} align="center" wrap>
        <DatePicker.RangePicker defaultValue={[dayjs().startOf('month'), dayjs()] as any} />
        <Select placeholder="Proveedor" allowClear style={{ minWidth: 200 }} options={prov?.data.map(p => ({ label: p.nombre, value: p.id }))} />
      </Flex>
  <Table rowKey="id" dataSource={rows as any} columns={columns} pagination={{ pageSize: 10 }} />
      <ExportButton rows={rows as any} filename="ingresos" />
    </div>
  );
}
