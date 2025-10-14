import { DatePicker, Flex, Table, Input, Button, Card } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import ExportButton from '../../components/ExportButton';
import { useIngresos } from '../../lib/api';
import { useState, useMemo } from 'react';

export default function IngresosListPage() {
  const { data } = useIngresos();
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);

  const rows = data?.data ?? [];

  // Filtrar por búsqueda global y rango de fechas
  const filteredRows = useMemo(() => {
    let filtered = rows;

    // Filtro por texto de búsqueda
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter((r: any) =>
        r.nombre?.toLowerCase().includes(search) ||
        r.marca?.toLowerCase().includes(search) ||
        r.proveedor?.toLowerCase().includes(search) ||
        r.serieFactura?.toLowerCase().includes(search) ||
        r.numeroSerie?.toLowerCase().includes(search)
      );
    }

    // Filtro por rango de fechas
    if (dateRange && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter((r: any) => {
        const fecha = dayjs(r.fechaIngreso);
        return fecha.isAfter(dateRange[0].startOf('day')) && fecha.isBefore(dateRange[1].endOf('day'));
      });
    }

    return filtered;
  }, [rows, searchText, dateRange]);

  const marcaFilters = Array.from(new Set(filteredRows.map((r: any) => r.marca).filter(Boolean))).map((m) => ({ text: m, value: m }));
  const proveedorFilters = Array.from(new Set(filteredRows.map((r: any) => r.proveedor).filter(Boolean))).map((p) => ({ text: p, value: p }));

  const columns: ColumnsType<any> = [
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Marca', dataIndex: 'marca', filters: marcaFilters, onFilter: (v, r: any) => r.marca === v },
    { title: 'Proveedor', dataIndex: 'proveedor', filters: proveedorFilters, onFilter: (v, r: any) => r.proveedor === v },
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
      <Card title="Ingresos">
        {/* Filtros */}
        <Flex gap={8} align="center" wrap style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Buscar por nombre, marca, proveedor o serie..."
            allowClear
            style={{ maxWidth: 400 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <DatePicker.RangePicker
            value={dateRange as any}
            onChange={(dates) => setDateRange(dates as any)}
            format="DD/MM/YYYY"
          />
          <Button
            icon={<ClearOutlined />}
            onClick={() => {
              setSearchText("");
              setDateRange([dayjs().startOf("month"), dayjs()]);
            }}
          >
            Limpiar filtros
          </Button>
        </Flex>

        {/* Tabla */}
        <Table
          rowKey="id"
          dataSource={filteredRows as any}
          columns={columns}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} registros`,
          }}
          style={{ marginTop: 12 }}
        />

        {/* Botón de exportar */}
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <ExportButton rows={filteredRows as any} filename="ingresos" />
        </div>
      </Card>
    </div>

  );
}
