import Tabs from '../../components/ui/tabs';
import { Table } from 'antd';
import dayjs from 'dayjs';
import ExportButton from '../../components/ExportButton';
import { useIngresos } from '../../lib/api';

export default function ReportesPage() {
  const { data } = useIngresos();
  const rows = data?.data ?? [];
  const marcaFilters = Array.from(new Set(rows.map((r: any) => r.marca).filter(Boolean))).map((m) => ({ text: m, value: m }));
  return (
    <Tabs
      items={[
  { key: 'ingresos', label: 'Ingresos por periodo', content: <div className="space-y-2"><Table rowKey="id" dataSource={rows as any} columns={[
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Marca', dataIndex: 'marca', filters: marcaFilters, onFilter: (v, r: any) => r.marca === v },
    { title: 'Fecha', dataIndex: 'fechaIngreso', render: (v: any) => dayjs(v).format('YYYY-MM-DD') },
  ]} pagination={false} /><ExportButton rows={rows as any} filename="reporte-ingresos" /></div> },
        { key: 'stock-area', label: 'Stock por área', content: <div>Próximamente</div> },
        { key: 'stock-min', label: 'Stock mínimo', content: <div>Próximamente</div> },
        { key: 'mov-usuario', label: 'Mov. por usuario', content: <div>Próximamente</div> },
      ]}
    />
  );
}
