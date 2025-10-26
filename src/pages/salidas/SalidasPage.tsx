import { useState } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  DatePicker, 
  Select, 
  Card, 
  Statistic, 
  Row, 
  Col,
  message,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  ExportOutlined,
  StopOutlined,
  GiftOutlined,
  ExperimentOutlined,
  MinusCircleOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import ModalCrearSalida from './components/ModalCrearSalida';
import { defaultPaginationConfig } from '../../hooks/useTablePagination';

const { RangePicker } = DatePicker;

interface Salida {
  id: string;
  ingreso_id: string;
  fecha_baja: string;
  tipo: string;
  producto_nombre: string;
  proveedor_nombre: string;
  cantidad: number;
  unidad: string;
  motivo: string;
  observacion?: string;
  valor_perdida: number;
  usuario_nombre: string;
  serieFactura?: string;
  fechaFactura?: string;
  marca?: string;
}

interface Resumen {
  total_salidas: number;
  total_perdida: number;
  por_tipo: Record<string, number>;
}

const SalidasPage = () => {
  const [modalCrearVisible, setModalCrearVisible] = useState(false);
  const [filtros, setFiltros] = useState<{
    fechaDesde?: string;
    fechaHasta?: string;
    tipo?: string;
  }>({});

  const queryClient = useQueryClient();

  // Query para listar salidas
  const { data, isLoading } = useQuery({
    queryKey: ['salidas', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      
      const response = await api.get(`/salidas?${params.toString()}`);
      return response.data;
    }
  });

  const responseData = data?.data || data || {};
  const salidas: Salida[] = responseData?.salidas || [];
  const resumen: Resumen = responseData?.resumen || { total_salidas: 0, total_perdida: 0, por_tipo: {} };

  // Mutation para eliminar salida
  const eliminarMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/salidas/${id}`),
    onSuccess: () => {
      message.success('Salida eliminada correctamente');
      queryClient.invalidateQueries({ queryKey: ['salidas'] });
      queryClient.invalidateQueries({ queryKey: ['ingresos-disponibles'] });
    },
    onError: () => {
      message.error('Error al eliminar salida');
    }
  });

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'PERDIDA': return <MinusCircleOutlined />;
      case 'DAÑADO': return <StopOutlined />;
      case 'MERMA': return <LineChartOutlined />;
      case 'BAJA_VOLUNTARIA': return <DeleteOutlined />;
      case 'DONACION': return <GiftOutlined />;
      case 'MUESTRA': return <ExperimentOutlined />;
      default: return null;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'PERDIDA': return 'red';
      case 'DAÑADO': return 'volcano';
      case 'MERMA': return 'orange';
      case 'BAJA_VOLUNTARIA': return 'default';
      case 'DONACION': return 'blue';
      case 'MUESTRA': return 'cyan';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha_baja',
      key: 'fecha_baja',
      width: 110,
      render: (fecha: string) => dayjs(fecha).format('DD/MM/YYYY'),
      sorter: (a: Salida, b: Salida) => dayjs(a.fecha_baja).unix() - dayjs(b.fecha_baja).unix()
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 140,
      render: (tipo: string) => (
        <Tag icon={getTipoIcon(tipo)} color={getTipoColor(tipo)}>
          {tipo.replace('_', ' ')}
        </Tag>
      )
    },
    {
      title: 'Producto',
      dataIndex: 'producto_nombre',
      key: 'producto_nombre',
      ellipsis: true
    },
    {
      title: 'Factura',
      key: 'factura',
      width: 100,
      render: (record: Salida) => record.serieFactura || '-'
    },
    {
      title: 'Proveedor',
      dataIndex: 'proveedor_nombre',
      key: 'proveedor_nombre',
      ellipsis: true
    },
    {
      title: 'Cantidad',
      key: 'cantidad',
      width: 120,
      render: (record: Salida) => `${record.cantidad} ${record.unidad}`,
      align: 'right' as const
    },
    {
      title: 'Valor Pérdida',
      dataIndex: 'valor_perdida',
      key: 'valor_perdida',
      width: 120,
      render: (valor: number) => `S/ ${valor.toFixed(2)}`,
      align: 'right' as const
    },
    {
      title: 'Motivo',
      dataIndex: 'motivo',
      key: 'motivo',
      ellipsis: true
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario_nombre',
      key: 'usuario_nombre',
      width: 150
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 100,
      fixed: 'right' as const,
      render: (record: Salida) => (
        <Popconfirm
          title="¿Eliminar salida?"
          description="Esta acción restaurará el stock. ¿Está seguro?"
          onConfirm={() => eliminarMutation.mutate(record.id)}
          okText="Sí"
          cancelText="No"
        >
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            size="small"
          />
        </Popconfirm>
      )
    }
  ];

  const resumenStyle = {
    marginBottom: '24px'
  };

  const filtrosStyle = {
    marginBottom: '16px'
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Salidas por Daño, Pérdida y Otros</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setModalCrearVisible(true)}
        >
          Nueva Salida
        </Button>
      </div>

      {/* Resumen */}
      <Row gutter={16} style={resumenStyle}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Total Salidas" 
              value={resumen.total_salidas}
              prefix={<MinusCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Valor Total Pérdida" 
              value={resumen.total_perdida}
              precision={2}
              prefix="S/"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Por Pérdida" 
              value={resumen.por_tipo.PERDIDA || 0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Por Daño" 
              value={resumen.por_tipo.DAÑADO || 0}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      <Card style={filtrosStyle}>
        <Space wrap>
          <RangePicker
            placeholder={['Fecha desde', 'Fecha hasta']}
            onChange={(dates) => {
              setFiltros({
                ...filtros,
                fechaDesde: dates?.[0]?.format('YYYY-MM-DD'),
                fechaHasta: dates?.[1]?.format('YYYY-MM-DD')
              });
            }}
          />
          <Select
            placeholder="Tipo de salida"
            style={{ width: 180 }}
            allowClear
            onChange={(tipo) => setFiltros({ ...filtros, tipo })}
          >
            <Select.Option value="PERDIDA">Pérdida</Select.Option>
            <Select.Option value="DAÑADO">Dañado</Select.Option>
            <Select.Option value="MERMA">Merma</Select.Option>
            <Select.Option value="BAJA_VOLUNTARIA">Baja Voluntaria</Select.Option>
            <Select.Option value="DONACION">Donación</Select.Option>
            <Select.Option value="MUESTRA">Muestra/Prueba</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* Tabla */}
      <Table
        columns={columns}
        dataSource={salidas}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={defaultPaginationConfig}
      />

      {/* Modal Crear Salida */}
      <ModalCrearSalida
        visible={modalCrearVisible}
        onClose={() => setModalCrearVisible(false)}
        onSuccess={() => {
          setModalCrearVisible(false);
          queryClient.invalidateQueries({ queryKey: ['salidas'] });
          queryClient.invalidateQueries({ queryKey: ['ingresos-disponibles'] });
        }}
      />
    </div>
  );
};

export default SalidasPage;
