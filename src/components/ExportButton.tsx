import { Button } from 'antd';
import { toCSV, downloadCSV } from '../lib/csv';

interface Props<T extends Record<string, unknown>> {
  rows: T[];
  filename: string;
}

export default function ExportButton<T extends Record<string, unknown>>({ rows, filename }: Props<T>) {
  const onExport = () => {
    const csv = toCSV(rows);
    downloadCSV(csv, filename);
  };
  return <Button onClick={onExport}>Exportar CSV</Button>;
}
