import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useIngresos, useProductos, usePedidos } from '../../lib/api';
import { Table, Tag, Progress } from 'antd';
import dayjs from 'dayjs';
import { useMemo } from 'react';

export default function DashboardPage() {
  const { data: ingresosRes } = useIngresos();
  const { data: productosRes } = useProductos();
  const { data: pedidosRes } = usePedidos();
  
  const ingresosMes = useMemo(() => {
    const ingresos = ingresosRes?.data ?? [];
    return ingresos.filter((i: any) => 
      dayjs(i.fechaIngreso).isAfter(dayjs().startOf('month'))
    ).length;
  }, [ingresosRes]);

  const pedidosPendientes = useMemo(() => {
    const pedidos = pedidosRes?.data ?? [];
    return pedidos.filter((p: any) => p.estado === 'PENDIENTE').length;
  }, [pedidosRes]);

  const productosActivos = productosRes?.data?.filter((p: any) => p.activo)?.length ?? 0;
  const productosTotal = productosRes?.data?.length ?? 0;
  const porcentajeActivos = productosTotal > 0 ? (productosActivos / productosTotal) * 100 : 0;

  // Productos próximos a vencer (próximos 30 días)
  const productosVencimiento = useMemo(() => {
    const ingresos = ingresosRes?.data ?? [];
    const proximos = ingresos.filter((i: any) => {
      if (!i.fechaVencimiento) return false;
      const diasRestantes = dayjs(i.fechaVencimiento).diff(dayjs(), 'days');
      return diasRestantes >= 0 && diasRestantes <= 30;
    }).sort((a: any, b: any) => dayjs(a.fechaVencimiento).valueOf() - dayjs(b.fechaVencimiento).valueOf());
    return proximos.slice(0, 5); // Solo los primeros 5
  }, [ingresosRes]);

  const columnsVencimiento = [
    { title: 'Producto', dataIndex: 'nombre', width: 200 },
    { title: 'Días restantes', render: (_: any, record: any) => {
      const dias = dayjs(record.fechaVencimiento).diff(dayjs(), 'days');
      const color = dias <= 7 ? 'red' : dias <= 15 ? 'orange' : 'blue';
      return <Tag color={color}>{dias} días</Tag>;
    }},
    { title: 'Fecha venc.', dataIndex: 'fechaVencimiento', render: (v: any) => dayjs(v).format('DD/MM/YYYY') },
  ];

  return (
    <div className="space-y-6">
      {/* Cards de resumen */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>Ingresos este mes</CardHeader>
          <CardContent className="text-2xl text-blue-600">{ingresosMes}</CardContent>
        </Card>
        <Card>
          <CardHeader>Pedidos pendientes</CardHeader>
          <CardContent className="text-2xl text-orange-600">{pedidosPendientes}</CardContent>
        </Card>
        <Card>
          <CardHeader>Productos activos</CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">{productosActivos}/{productosTotal}</div>
            <Progress percent={Math.round(porcentajeActivos)} size="small" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Por vencer (30 días)</CardHeader>
          <CardContent className="text-2xl text-red-600">{productosVencimiento.length}</CardContent>
        </Card>
      </div>

      {/* Tabla de productos próximos a vencer */}
      {productosVencimiento.length > 0 && (
        <Card>
          <CardHeader>Productos próximos a vencer</CardHeader>
          <CardContent>
            <Table 
              dataSource={productosVencimiento}
              columns={columnsVencimiento}
              pagination={false}
              size="small"
              rowKey="id"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
