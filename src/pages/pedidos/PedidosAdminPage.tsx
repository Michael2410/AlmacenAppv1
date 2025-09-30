import { Button, Space, message, Table, Input, Modal, Select } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { usePedidos, useCambiarEstadoPedido, useAsignarPedido, useUsers, useProductos, useStockGeneral } from '../../lib/api';

export default function PedidosAdminPage() {
  const { data } = usePedidos();
  const { mutateAsync: cambiar } = useCambiarEstadoPedido();
  const { mutateAsync: asignar } = useAsignarPedido();
  const [brandPicker, setBrandPicker] = useState<{ open: boolean; pedidoId?: string; productoId?: string }>(() => ({ open: false }));
  const [brandOptions, setBrandOptions] = useState<Array<string | null>>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null | undefined>(undefined);
  const { data: stockRes } = useStockGeneral();
  const stock = (stockRes?.data ?? []) as any[];
  const rows = data?.data ?? [];
  const { data: usersRes } = useUsers();
  const { data: prodsRes } = useProductos();
  const users = usersRes?.data ?? [];
  const productos = prodsRes?.data ?? [];
  const userNameOf = (id: string) => users.find((u: any) => u.id === id)?.nombres ?? id;
  const productNameOf = (id: string) => productos.find((p: any) => p.id === id)?.nombre ?? id;
  const act = async (id: string, estado: string) => {
    await cambiar({ id, estado });
    message.success('Estado actualizado');
  };
  const entregar = async (id: string) => {
    const p = rows.find((x: any) => x.id === id);
    if (!p) return;
    // build available brands for this product with available stock > 0
    const marcas = Array.from(new Set(
      stock.filter((r: any) => (r.productoId === p.productoId) && (r.cantidadDisponible || 0) > 0)
           .map((r: any) => r.marca ?? null)
    ));
    if (marcas.length <= 1) {
      await asignar({ id, marca: marcas[0] ?? null });
      message.success('Pedido entregado y asignado');
      return;
    }
    setBrandOptions(marcas);
    setSelectedBrand(undefined);
    setBrandPicker({ open: true, pedidoId: id, productoId: p.productoId });
  };
  const unidadFilters = useMemo(() => Array.from(new Set(rows.map((r: any) => r.unidad))).filter(Boolean).map((u) => ({ text: u, value: u })), [rows]);
  const estadoFilters = useMemo(() => Array.from(new Set(rows.map((r: any) => r.estado))).filter(Boolean).map((e) => ({ text: e, value: e })), [rows]);

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
    { title: 'Producto', dataIndex: 'productoId', render: (_: any, r: any) => productNameOf(r.productoId), ...textFilter('producto', (rec) => productNameOf(rec.productoId)) },
    { title: 'Cantidad', dataIndex: 'cantidad', sorter: (a, b) => (a.cantidad || 0) - (b.cantidad || 0) },
    { title: 'Unidad', dataIndex: 'unidad', filters: unidadFilters, onFilter: (v, r) => r.unidad === v },
    { title: 'Estado', dataIndex: 'estado', filters: estadoFilters, onFilter: (v, r) => r.estado === v },
    { title: 'Fecha', dataIndex: 'fecha', sorter: (a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf() },
    {
      title: 'Acciones',
      render: (_: any, r: any) => (
        <Space size={8}>
          <Button size="small" onClick={() => act(r.id, 'APROBADO')}>Aprobar</Button>
          <Button size="small" onClick={() => act(r.id, 'RECHAZADO')}>Rechazar</Button>
          <Button size="small" type="primary" onClick={() => entregar(r.id)}>Entregar</Button>
        </Space>
      )
    },
  ];
  return (
    <>
      <Table rowKey="id" dataSource={rows as any} columns={columns} pagination={{ pageSize: 10 }} />
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
          options={brandOptions.map((m) => ({ label: m || 'Sin marca', value: m }))}
        />
      </Modal>
    </>
  );
}
