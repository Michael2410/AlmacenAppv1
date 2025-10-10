# StyledTable Component

Componente de tabla personalizado con estilo global que utiliza el mismo color azul marino del sidebar (#001529).

## Características

✨ **Encabezado azul marino** - Mismo color que el sidebar (#001529)
✨ **Iconos blancos** - Iconos de filtro y ordenamiento en blanco para mejor contraste
✨ **Hover effects** - Efectos hover en encabezados e iconos
✨ **Filas alternas** - Filas con colores alternos para mejor legibilidad
✨ **Paginación personalizada** - Paginación con colores del tema

## Uso

### Importación

\`\`\`tsx
import StyledTable from '../../components/StyledTable';
\`\`\`

### Ejemplo básico

\`\`\`tsx
import StyledTable from '../../components/StyledTable';
import type { ColumnsType } from 'antd/es/table';

interface DataType {
  id: string;
  nombre: string;
  cantidad: number;
}

export default function MyPage() {
  const data: DataType[] = [
    { id: '1', nombre: 'Producto 1', cantidad: 10 },
    { id: '2', nombre: 'Producto 2', cantidad: 20 },
  ];

  const columns: ColumnsType<DataType> = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { 
      title: 'Cantidad', 
      dataIndex: 'cantidad', 
      key: 'cantidad',
      sorter: (a, b) => a.cantidad - b.cantidad
    },
  ];

  return (
    <div>
      <h1>Mi Página</h1>
      <StyledTable
        dataSource={data}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}
\`\`\`

### Con filtros

\`\`\`tsx
const columns: ColumnsType<DataType> = [
  { 
    title: 'Categoría', 
    dataIndex: 'categoria',
    filters: [
      { text: 'Categoría A', value: 'A' },
      { text: 'Categoría B', value: 'B' },
    ],
    onFilter: (value, record) => record.categoria === value,
  },
  {
    title: 'Estado',
    dataIndex: 'estado',
    filters: [
      { text: 'Activo', value: 'activo' },
      { text: 'Inactivo', value: 'inactivo' },
    ],
    onFilter: (value, record) => record.estado === value,
  },
];

<StyledTable
  dataSource={data}
  columns={columns}
  rowKey="id"
/>
\`\`\`

### Con ordenamiento

\`\`\`tsx
const columns: ColumnsType<DataType> = [
  { 
    title: 'Nombre', 
    dataIndex: 'nombre',
    sorter: (a, b) => a.nombre.localeCompare(b.nombre),
  },
  {
    title: 'Fecha',
    dataIndex: 'fecha',
    sorter: (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  },
];

<StyledTable
  dataSource={data}
  columns={columns}
  rowKey="id"
/>
\`\`\`

### Con paginación personalizada

\`\`\`tsx
<StyledTable
  dataSource={data}
  columns={columns}
  rowKey="id"
  pagination={{
    pageSize: 20,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => \`\${range[0]}-\${range[1]} de \${total} items\`,
  }}
/>
\`\`\`

## Props

El componente `StyledTable` acepta todas las props del componente `Table` de Ant Design.

Consulta la documentación oficial: https://ant.design/components/table

## Personalización adicional

Si necesitas agregar estilos adicionales, puedes pasar una clase personalizada:

\`\`\`tsx
<StyledTable
  className="mi-clase-personalizada"
  dataSource={data}
  columns={columns}
  rowKey="id"
/>
\`\`\`

Y agregar tus estilos en un archivo CSS:

\`\`\`css
.mi-clase-personalizada .ant-table-tbody > tr > td {
  padding: 16px;
}
\`\`\`

## Colores utilizados

- **Encabezado**: #001529 (azul marino oscuro - mismo del sidebar)
- **Hover encabezado**: #002140 (azul marino más claro)
- **Texto encabezado**: #ffffff (blanco)
- **Iconos filtro**: #ffffff (blanco)
- **Iconos filtro hover**: #91d5ff (azul claro)
- **Iconos filtro activo**: #40a9ff (azul)
- **Filas alternas**: #fafafa (gris muy claro)
- **Hover fila**: #f5f5f5 (gris claro)

## Migración desde Table estándar

Para migrar una tabla existente, simplemente reemplaza:

\`\`\`tsx
// Antes
import { Table } from 'antd';
<Table ... />

// Después
import StyledTable from '../../components/StyledTable';
<StyledTable ... />
\`\`\`

¡No necesitas cambiar ninguna otra prop!
