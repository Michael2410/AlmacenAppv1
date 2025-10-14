import { Button, Space, message, Table, Input, Modal, Select, Tag, List, Card } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { usePedidos, useCambiarEstadoPedido, useAsignarPedido, useUsers, useProductos, useEntregarLote } from '../../lib/api';

export default function PedidosAdminPage() {
  const { data } = usePedidos();
  const { mutateAsync: cambiar } = useCambiarEstadoPedido();
  const { mutateAsync: asignar } = useAsignarPedido();
  const { mutateAsync: entregarLote } = useEntregarLote();
  const [brandPicker, setBrandPicker] = useState<{ open: boolean; pedidoId?: string; productoId?: string }>(() => ({ open: false }));
  const [selectedBrand, setSelectedBrand] = useState<string | null | undefined>(undefined);
  const [detalleModal, setDetalleModal] = useState<{ open: boolean; lote?: any }>({ open: false });
  const rows = data?.data ?? [];
  const { data: usersRes } = useUsers();
  const { data: prodsRes } = useProductos();
  const users = usersRes?.data ?? [];
  const productos = prodsRes?.data ?? [];

  const userNameOf = (id: string) => users.find((u: any) => u.id === id)?.nombres ?? id;
  const productNameOf = (id: string) => productos.find((p: any) => p.id === id)?.nombre ?? id;

  // Agrupar pedidos por loteId
  const lotes = useMemo(() => {
    const grupos: any = {};
    rows.forEach((pedido: any) => {
      const loteId = pedido.loteId || pedido.id; // fallback para pedidos viejos
      if (!grupos[loteId]) {
        grupos[loteId] = {
          loteId,
          usuarioId: pedido.usuarioId,
          fecha: pedido.fecha,
          estado: pedido.estado,
          items: []
        };
      }
      grupos[loteId].items.push({
        id: pedido.id,
        productoId: pedido.productoId,
        cantidad: pedido.cantidad,
        unidad: pedido.unidad,
        marca: pedido.marca
      });
    });
    return Object.values(grupos);
  }, [rows]);

  const act = async (loteId: string, estado: string) => {
    try {
      // Cambiar estado de todos los pedidos del lote
      const pedidosDelLote = rows.filter((p: any) => (p.loteId || p.id) === loteId);
      for (const pedido of pedidosDelLote) {
        await cambiar({ id: pedido.id, estado });
      }
      message.success('Estado actualizado para todo el lote');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al actualizar el estado');
    }
  };

  const entregar = async (loteId: string) => {
    try {
      await entregarLote(loteId);
      message.success('Lote completo entregado');
    } catch (error: any) {
      message.error(error.message || 'Error al entregar el lote');
    }
  };

  const verDetalle = (lote: any) => {
    setDetalleModal({ open: true, lote });
  };

  const estadoFilters = useMemo(() => Array.from(new Set(lotes.map((l: any) => l.estado))).filter(Boolean).map((e) => ({ text: e, value: e })), [lotes]);

  const textFilter = (label: string, getValue: (rec: any) => string): ColumnType<any> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <div className="p-2">
        <Input
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
    { title: 'Usuario', dataIndex: 'usuarioId', render: (_: any, r: any) => userNameOf(r.usuarioId), ...textFilter('usuario', (rec) => userNameOf(rec.usuarioId)) },
    {
      title: 'Productos',
      render: (_: any, r: any) => (
        <div>
          <Tag color="blue">{r.items.length} producto{r.items.length > 1 ? 's' : ''}</Tag>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => verDetalle(r)}>
            Ver detalle
          </Button>
        </div>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      filters: estadoFilters,
      onFilter: (v, r) => r.estado === v,
      render: (estado: string) => {
        const colores = {
          'pendiente': 'orange',
          'aprobado': 'blue',
          'rechazado': 'red',
          'entregado': 'green'
        };
        const estadoUpper = estado?.toUpperCase() || estado;
        return <Tag color={colores[estado as keyof typeof colores] || 'default'}>{estadoUpper}</Tag>;
      }
    },
    { title: 'Fecha', dataIndex: 'fecha', sorter: (a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf(), render: (fecha) => dayjs(fecha).format('DD/MM/YYYY HH:mm') },
    {
      title: 'Acciones',
      render: (_: any, r: any) => {
        const esEntregado = r.estado === 'entregado';
        const esAprobado = r.estado === 'aprobado';
        const esRechazado = r.estado === 'rechazado';
        const esPendiente = r.estado === 'pendiente';

        return (
          <Space size={8}>
            <Button
              size="small"
              onClick={() => act(r.loteId, 'aprobado')}
              disabled={esEntregado || esAprobado || esRechazado}
              type={esAprobado ? 'primary' : 'default'}
            >
              {esAprobado ? 'Aprobado' : 'Aprobar'}
            </Button>
            <Button
              size="small"
              danger={esRechazado}
              onClick={() => act(r.loteId, 'rechazado')}
              disabled={esEntregado || esAprobado || esRechazado}
            >
              {esRechazado ? 'Rechazado' : 'Rechazar'}
            </Button>
            <Button
              size="small"
              type={esEntregado ? 'primary' : 'default'}
              onClick={() => entregar(r.loteId)}
              disabled={esEntregado || esRechazado || esPendiente}
            >
              {esEntregado ? 'Entregado' : 'Entregar'}
            </Button>
          </Space>
        );
      }
    },
  ];

  return (
    <>
      <Card
        title="Pedidos"

      >
        <Table rowKey="loteId" dataSource={lotes as any} columns={columns} pagination={{ pageSize: 10 }} />
      </Card>
      {/* Modal de detalle de productos */}
      <Modal
        open={detalleModal.open}
        title={`Detalle del pedido - ${userNameOf(detalleModal.lote?.usuarioId || '')}`}
        onCancel={() => setDetalleModal({ open: false })}
        footer={[
          <Button key="close" onClick={() => setDetalleModal({ open: false })}>
            Cerrar
          </Button>
        ]}
        width={600}
      >
        {detalleModal.lote && (
          <List
            dataSource={detalleModal.lote.items}
            renderItem={(item: any) => (
              <List.Item>
                <List.Item.Meta
                  title={`${productNameOf(item.productoId)}${item.marca ? ` - ${item.marca}` : ''}`}
                  description={`Cantidad: ${item.cantidad} ${item.unidad}`}
                />
              </List.Item>
            )}
          />
        )}
      </Modal>

      {/* Modal de selección de marca (se mantiene por compatibilidad) */}
      <Modal
        open={brandPicker.open}
        title="Seleccione marca"
        onCancel={() => setBrandPicker({ open: false })}
        onOk={async () => {
          const marcaVal = selectedBrand;
          if (brandPicker.pedidoId) {
            await asignar({ id: brandPicker.pedidoId, marca: marcaVal ?? null });
            message.success('Pedido entregado y asignado');
          }
          setBrandPicker({ open: false });
        }}
      >
        <Select
          allowClear
          placeholder="Marca (opcional)"
          className="w-full"
          value={selectedBrand ?? undefined}
          onChange={(v) => setSelectedBrand((v ?? null) as any)}
          options={[
            { label: 'Sin marca', value: null },
            { label: 'Stanley', value: 'Stanley' },
            { label: 'Indeco', value: 'Indeco' },
            { label: 'Bahco', value: 'Bahco' }
          ]}
        />
      </Modal>
    </>
  );
}
