import { Table } from 'antd';
import type { TableProps } from 'antd';
import './StyledTable.css';

interface StyledTableProps<T> extends TableProps<T> {
  // Puedes agregar props personalizadas aquí si lo necesitas
}

export default function StyledTable<T extends object = any>(props: StyledTableProps<T>) {
  return (
    <div className="styled-table-container">
      <Table<T>
        {...props}
        className={`styled-table ${props.className || ''}`}
      />
    </div>
  );
}
