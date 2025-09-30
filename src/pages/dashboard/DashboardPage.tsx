import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useIngresos, useProductos } from '../../lib/api';

export default function DashboardPage() {
  const { data: ingresosRes } = useIngresos();
  const { data: productosRes } = useProductos();
  const ingresosMes = ingresosRes?.data?.length ?? 0;
  const productosActivos = productosRes?.data?.length ?? 0;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>Ingresos del mes</CardHeader>
        <CardContent className="text-2xl">{ingresosMes}</CardContent>
      </Card>
      <Card>
        <CardHeader>Productos activos</CardHeader>
        <CardContent className="text-2xl">{productosActivos}</CardContent>
      </Card>
      <Card>
        <CardHeader>Asignaciones</CardHeader>
        <CardContent className="text-2xl">12</CardContent>
      </Card>
    </div>
  );
}
