import { Typography, Table, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useStockGeneral, useReferencias } from '../../lib/api';
import { defaultPaginationConfig } from '../../hooks/useTablePagination';
import { DatabaseOutlined } from '@ant-design/icons';

export default function AlmacenGeneralPage() {
  const { data } = useStockGeneral();
  const rows = data?.data ?? [];
  const { data: referenciasRes } = useReferencias();
  const referencias = referenciasRes?.data ?? { areas: [], ubicaciones: [] };
  const { Title } = Typography;
  // Helper functions to get names
  const getAreaName = (areaId: string) => {
    if (!areaId) return 'Sin área';
    const area = referencias.areas.find((a: any) => a.id === areaId);
    return area?.nombre || areaId;
  };

  const getUbicacionName = (ubicacionId: string) => {
    if (!ubicacionId) return 'Sin ubicación';
    const ubicacion = referencias.ubicaciones.find((u: any) => u.id === ubicacionId);
    return ubicacion?.nombre || ubicacionId;
  };

  return (
    <div className="space-y-2">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={4} style={{ margin: 0 }}>
            <DatabaseOutlined style={{ marginRight: 8 }} />
            Almacén General
          </Title>
        </div>

        <Table
          rowKey={(r: any) => `${r.productoId ?? r.id}::${r.marca ?? ''}`}
          dataSource={rows as any}
          columns={[
            { title: 'Producto', dataIndex: 'nombre' },
            { title: 'Marca', dataIndex: 'marca', filters: Array.from(new Set((rows as any[]).map(r => r.marca).filter(Boolean))).map((m: any) => ({ text: m, value: m })), onFilter: (v: any, r: any) => r.marca === v },
            { title: 'Unidad', dataIndex: 'unidad' },
            { title: 'Área', dataIndex: 'areaId', render: (areaId: string) => getAreaName(areaId) },
            { title: 'Ubicación', dataIndex: 'ubicacionId', render: (ubicacionId: string) => getUbicacionName(ubicacionId) },
            { title: 'Disponible', dataIndex: 'cantidadDisponible', sorter: (a: any, b: any) => (a.cantidadDisponible || 0) - (b.cantidadDisponible || 0) },
            { title: 'Activo', dataIndex: 'activo', render: (v: any) => (v ? 'Sí' : 'No') },
          ] as ColumnsType<any>}
          pagination={defaultPaginationConfig}
        />
      </Card>

    </div>
  );
}
