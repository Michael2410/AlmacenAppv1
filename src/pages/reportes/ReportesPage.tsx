import { useState } from 'react';
import { Card, Tabs, Button, DatePicker, Select, Row, Col, Space, Spin, Empty, Statistic } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';
import { Dayjs } from 'dayjs';
import {
  useInventarioReport,
  useIngresosReport,
  usePedidosReport,
  useStockUsuariosReport,
  useMovimientosReport,
} from '../../hooks/useReportes';
import {
  exportInventarioToExcel,
  exportInventarioToPDF,
  exportToCSV,
  exportIngresosToExcel,
  exportIngresosToPDF,
  exportPedidosToExcel,
  exportPedidosToPDF,
  exportStockUsuariosToExcel,
  exportStockUsuariosToPDF,
  exportMovimientosToExcel,
  exportMovimientosToPDF
} from '../../utils/exportHelpers';
import { useProductos } from '../../lib/api';

const { RangePicker } = DatePicker;

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState('inventario');
  
  // Filtros globales
  const [fechaInicio, setFechaInicio] = useState<string>();
  const [fechaFin, setFechaFin] = useState<string>();
  const [productoId, setProductoId] = useState<string>();
  
  // Productos para filtros
  const { data: productosData } = useProductos();
  const productos = productosData?.data || [];
  
  const handleDateChange = (dates: null | [Dayjs | null, Dayjs | null]) => {
    if (dates) {
      setFechaInicio(dates[0]?.format('YYYY-MM-DD'));
      setFechaFin(dates[1]?.format('YYYY-MM-DD'));
    } else {
      setFechaInicio(undefined);
      setFechaFin(undefined);
    }
  };
  
  const tabItems: TabsProps['items'] = [
    {
      key: 'inventario',
      label: '📦 Inventario',
      children: <InventarioTab productoId={productoId} />
    },
    {
      key: 'ingresos',
      label: '📥 Ingresos',
      children: <IngresosTab fechaInicio={fechaInicio} fechaFin={fechaFin} productoId={productoId} />
    },
    {
      key: 'pedidos',
      label: '📋 Pedidos',
      children: <PedidosTab fechaInicio={fechaInicio} fechaFin={fechaFin} productoId={productoId} />
    },
    {
      key: 'stock-usuarios',
      label: '👥 Stock Usuarios',
      children: <StockUsuariosTab />
    },
    {
      key: 'movimientos',
      label: '🔄 Movimientos',
      children: <MovimientosTab fechaInicio={fechaInicio} fechaFin={fechaFin} />
    }
  ];
  
  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">📊 Reportes y Exportación</h1>
          </div>
        }
      >
        {/* Filtros Globales */}
        <Card size="small" className="mb-4" style={{ backgroundColor: '#f5f5f5' }}>
          <Row gutter={16} align="middle">
            <Col span={10}>
              <div className="mb-2 text-sm font-semibold">Rango de Fechas</div>
              <RangePicker
                style={{ width: '100%' }}
                onChange={handleDateChange}
                format="DD/MM/YYYY"
                placeholder={['Fecha Inicio', 'Fecha Fin']}
              />
            </Col>
            <Col span={10}>
              <div className="mb-2 text-sm font-semibold">Producto</div>
              <Select
                style={{ width: '100%' }}
                placeholder="Todos los productos"
                allowClear
                showSearch
                optionFilterProp="children"
                value={productoId}
                onChange={setProductoId}
              >
                {productos.map((p: any) => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.nombre} {p.marca ? `(${p.marca})` : ''}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <div className="mb-2">&nbsp;</div>
              <Button
                block
                onClick={() => {
                  setFechaInicio(undefined);
                  setFechaFin(undefined);
                  setProductoId(undefined);
                }}
              >
                Limpiar Filtros
              </Button>
            </Col>
          </Row>
        </Card>
        
        {/* Tabs de Reportes */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </div>
  );
}

// ===== TABS INDIVIDUALES =====

function InventarioTab({ productoId }: { productoId?: string }) {
  const { data, isLoading } = useInventarioReport({ productoId });
  
  if (isLoading) return <div className="text-center py-8"><Spin size="large" /></div>;
  if (!data || data.length === 0) return <Empty description="Sin datos de inventario" />;
  
  const totalValor = data.reduce((sum: number, item: any) => sum + (item.valorizacion || 0), 0);
  const totalDisponible = data.reduce((sum: number, item: any) => sum + (item.stockDisponible || 0), 0);
  
  return (
    <div>
      {/* Estadísticas */}
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Card>
            <Statistic title="Total Productos" value={data.length} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Stock Disponible" value={totalDisponible} suffix="unidades" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Valorización Total" value={totalValor} precision={2} prefix="$" />
          </Card>
        </Col>
      </Row>
      
      {/* Botones de Exportación */}
      <Space className="mb-4">
        <Button
          type="primary"
          icon={<FileExcelOutlined />}
          onClick={() => exportInventarioToExcel(data)}
        >
          Exportar Excel
        </Button>
        <Button
          icon={<FilePdfOutlined />}
          onClick={() => exportInventarioToPDF(data)}
        >
          Exportar PDF
        </Button>
        <Button
          icon={<FileTextOutlined />}
          onClick={() => exportToCSV(data, 'inventario')}
        >
          Exportar CSV
        </Button>
      </Space>
      
      {/* Tabla Preview */}
      <Card title="Vista Previa" size="small">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left">Producto</th>
                <th className="px-2 py-2 text-left">Marca</th>
                <th className="px-2 py-2 text-right">Ingresado</th>
                <th className="px-2 py-2 text-right">Asignado</th>
                <th className="px-2 py-2 text-right">Disponible</th>
                <th className="px-2 py-2 text-right">Precio Prom.</th>
                <th className="px-2 py-2 text-right">Valorización</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-2">{item.producto}</td>
                  <td className="px-2 py-2">{item.marca || 'N/A'}</td>
                  <td className="px-2 py-2 text-right">{item.totalIngresado}</td>
                  <td className="px-2 py-2 text-right">{item.totalAsignado}</td>
                  <td className="px-2 py-2 text-right font-semibold">{item.stockDisponible}</td>
                  <td className="px-2 py-2 text-right">${item.precioPromedio?.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right font-semibold">${item.valorizacion?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function IngresosTab({ fechaInicio, fechaFin, productoId }: { fechaInicio?: string; fechaFin?: string; productoId?: string }) {
  const { data, isLoading } = useIngresosReport({ fechaInicio, fechaFin, productoId });
  
  if (isLoading) return <div className="text-center py-8"><Spin size="large" /></div>;
  if (!data || !data.ingresos || data.ingresos.length === 0) {
    return <Empty description="Sin datos de ingresos" />;
  }
  
  const { ingresos, totales } = data;
  
  return (
    <div>
      {/* Totales */}
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Card>
            <Statistic title="Total Registros" value={totales.totalRegistros} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Total Unidades" value={totales.totalUnidades} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Valor Total" value={totales.totalValor} precision={2} prefix="$" />
          </Card>
        </Col>
      </Row>
      
      {/* Botones */}
      <Space className="mb-4">
        <Button
          type="primary"
          icon={<FileExcelOutlined />}
          onClick={() => exportIngresosToExcel(ingresos, totales)}
        >
          Exportar Excel
        </Button>
        <Button
          icon={<FilePdfOutlined />}
          onClick={() => exportIngresosToPDF(ingresos, totales)}
        >
          Exportar PDF
        </Button>
        <Button
          icon={<FileTextOutlined />}
          onClick={() => exportToCSV(ingresos, 'ingresos')}
        >
          Exportar CSV
        </Button>
      </Space>
      
      {/* Tabla */}
      <Card title="Vista Previa" size="small">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left">Fecha</th>
                <th className="px-2 py-2 text-left">Producto</th>
                <th className="px-2 py-2 text-left">Proveedor</th>
                <th className="px-2 py-2 text-right">Cantidad</th>
                <th className="px-2 py-2 text-right">Precio</th>
                <th className="px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-2">{item.fechaIngreso}</td>
                  <td className="px-2 py-2">{item.productoNombre}</td>
                  <td className="px-2 py-2">{item.proveedor}</td>
                  <td className="px-2 py-2 text-right">{item.cantidad} {item.unidad}</td>
                  <td className="px-2 py-2 text-right">${item.precio?.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right font-semibold">${item.total?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PedidosTab({ fechaInicio, fechaFin, productoId }: { fechaInicio?: string; fechaFin?: string; productoId?: string }) {
  const [estado, setEstado] = useState<string>();
  const { data, isLoading } = usePedidosReport({ fechaInicio, fechaFin, productoId, estado });
  
  if (isLoading) return <div className="text-center py-8"><Spin size="large" /></div>;
  if (!data || !data.pedidos || data.pedidos.length === 0) {
    return <Empty description="Sin datos de pedidos" />;
  }
  
  const { pedidos, stats } = data;
  
  return (
    <div>
      {/* Filtro de Estado */}
      <div className="mb-4">
        <Select
          style={{ width: 200 }}
          placeholder="Filtrar por estado"
          allowClear
          value={estado}
          onChange={setEstado}
        >
          <Select.Option value="pendiente">Pendiente</Select.Option>
          <Select.Option value="aprobado">Aprobado</Select.Option>
          <Select.Option value="rechazado">Rechazado</Select.Option>
          <Select.Option value="entregado">Entregado</Select.Option>
        </Select>
      </div>
      
      {/* Stats */}
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card>
            <Statistic title="Total" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Pendientes" value={stats.pendientes} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Aprobados" value={stats.aprobados} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Entregados" value={stats.entregados} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>
      
      {/* Botones */}
      <Space className="mb-4">
        <Button
          type="primary"
          icon={<FileExcelOutlined />}
          onClick={() => exportPedidosToExcel(pedidos, stats)}
        >
          Exportar Excel
        </Button>
        <Button
          icon={<FilePdfOutlined />}
          onClick={() => exportPedidosToPDF(pedidos)}
        >
          Exportar PDF
        </Button>
        <Button
          icon={<FileTextOutlined />}
          onClick={() => exportToCSV(pedidos, 'pedidos')}
        >
          Exportar CSV
        </Button>
      </Space>
      
      {/* Tabla */}
      <Card title="Vista Previa" size="small">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left">Fecha</th>
                <th className="px-2 py-2 text-left">Usuario</th>
                <th className="px-2 py-2 text-left">Producto</th>
                <th className="px-2 py-2 text-right">Cantidad</th>
                <th className="px-2 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-2">{item.fecha}</td>
                  <td className="px-2 py-2">{item.usuario}</td>
                  <td className="px-2 py-2">{item.producto}</td>
                  <td className="px-2 py-2 text-right">{item.cantidad} {item.unidad}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      item.estado === 'aprobado' ? 'bg-blue-100 text-blue-800' :
                      item.estado === 'entregado' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.estado.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StockUsuariosTab() {
  const { data, isLoading } = useStockUsuariosReport({ usuarioId: undefined });
  
  if (isLoading) return <div className="text-center py-8"><Spin size="large" /></div>;
  if (!data || !data.stock || data.stock.length === 0) {
    return <Empty description="Sin datos de stock de usuarios" />;
  }
  
  const { stock } = data;
  
  return (
    <div>
      {/* Botones */}
      <Space className="mb-4">
        <Button
          type="primary"
          icon={<FileExcelOutlined />}
          onClick={() => exportStockUsuariosToExcel(stock)}
        >
          Exportar Excel
        </Button>
        <Button
          icon={<FilePdfOutlined />}
          onClick={() => exportStockUsuariosToPDF(stock)}
        >
          Exportar PDF
        </Button>
        <Button
          icon={<FileTextOutlined />}
          onClick={() => exportToCSV(stock, 'stock_usuarios')}
        >
          Exportar CSV
        </Button>
      </Space>
      
      {/* Tabla */}
      <Card title="Vista Previa" size="small">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left">Usuario</th>
                <th className="px-2 py-2 text-left">Producto</th>
                <th className="px-2 py-2 text-left">Marca</th>
                <th className="px-2 py-2 text-right">Cantidad</th>
                <th className="px-2 py-2 text-left">Área</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-2">{item.usuario}</td>
                  <td className="px-2 py-2">{item.producto}</td>
                  <td className="px-2 py-2">{item.marca || 'N/A'}</td>
                  <td className="px-2 py-2 text-right">{item.cantidad} {item.unidad}</td>
                  <td className="px-2 py-2">{item.area}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MovimientosTab({ fechaInicio, fechaFin }: { fechaInicio?: string; fechaFin?: string }) {
  const [tipo, setTipo] = useState<'ingreso' | 'salida' | 'pedido'>();
  const { data, isLoading } = useMovimientosReport({ fechaInicio, fechaFin, tipo });
  
  if (isLoading) return <div className="text-center py-8"><Spin size="large" /></div>;
  if (!data || data.length === 0) return <Empty description="Sin movimientos" />;
  
  return (
    <div>
      {/* Filtro de Tipo */}
      <div className="mb-4">
        <Select
          style={{ width: 200 }}
          placeholder="Filtrar por tipo"
          allowClear
          value={tipo}
          onChange={setTipo}
        >
          <Select.Option value="ingreso">Ingresos</Select.Option>
          <Select.Option value="salida">Salidas</Select.Option>
          <Select.Option value="pedido">Pedidos</Select.Option>
        </Select>
      </div>
      
      {/* Botones */}
      <Space className="mb-4">
        <Button
          type="primary"
          icon={<FileExcelOutlined />}
          onClick={() => exportMovimientosToExcel(data)}
        >
          Exportar Excel
        </Button>
        <Button
          icon={<FilePdfOutlined />}
          onClick={() => exportMovimientosToPDF(data)}
        >
          Exportar PDF
        </Button>
        <Button
          icon={<FileTextOutlined />}
          onClick={() => exportToCSV(data, 'movimientos')}
        >
          Exportar CSV
        </Button>
      </Space>
      
      {/* Tabla */}
      <Card title="Vista Previa" size="small">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-center">Tipo</th>
                <th className="px-2 py-2 text-left">Fecha</th>
                <th className="px-2 py-2 text-left">Descripción</th>
                <th className="px-2 py-2 text-right">Cantidad</th>
                <th className="px-2 py-2 text-left">Origen</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={`${item.tipo}-${item.id}`} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.tipo === 'INGRESO' ? 'bg-green-100 text-green-800' :
                      item.tipo === 'SALIDA' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {item.tipo}
                    </span>
                  </td>
                  <td className="px-2 py-2">{item.fecha}</td>
                  <td className="px-2 py-2">{item.descripcion}</td>
                  <td className="px-2 py-2 text-right">{item.cantidad} {item.unidad}</td>
                  <td className="px-2 py-2">{item.origen || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

