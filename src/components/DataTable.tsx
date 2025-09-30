import { useMemo, useState } from 'react';

export type Column<T> = {
  title: React.ReactNode;
  dataIndex?: keyof T & string;
  render?: (value: unknown, record: T) => React.ReactNode;
  filter?: 'text';
};

interface Props<T extends object> {
  rowKey: keyof T & string;
  dataSource: T[];
  columns: Column<T>[];
  searchable?: boolean;
  className?: string;
  emptyText?: string;
}

export default function DataTable<T extends object>({ rowKey, dataSource, columns, searchable = true, className, emptyText = 'Sin datos' }: Props<T>) {
  const [query, setQuery] = useState('');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let rows = dataSource ?? [];
    // per-column filters
    for (const col of columns) {
      if (!col.dataIndex) continue;
      const f = colFilters[col.dataIndex] ?? '';
      if (f) {
        rows = rows.filter((r) => String((r as any)[col.dataIndex!] ?? '').toLowerCase().includes(f.toLowerCase()));
      }
    }
    // global search
    if (query) {
      const keys = columns.map(c => c.dataIndex).filter(Boolean) as string[];
      rows = rows.filter((r) => keys.some(k => String((r as any)[k] ?? '').toLowerCase().includes(query.toLowerCase())));
    }
    return rows;
  }, [dataSource, columns, colFilters, query]);

  return (
    <div className={className}>
      {searchable && (
        <div className="mb-2 flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="h-9 w-full max-w-xs rounded-md border border-gray-300 px-3 py-1 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}
      <div className="overflow-auto rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="px-4 py-2 text-left text-sm font-semibold text-gray-700">{c.title}</th>
              ))}
            </tr>
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="px-4 py-2 text-left text-sm">
                  {c.filter === 'text' && c.dataIndex ? (
                    <input
                      value={colFilters[c.dataIndex] ?? ''}
                      onChange={(e) => setColFilters((s) => ({ ...s, [c.dataIndex!]: e.target.value }))}
                      placeholder={`Filtrar ${String(c.title)}`}
                      className="h-8 w-full rounded-md border border-gray-300 px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.map((r) => (
              <tr key={String(r[rowKey])}>
                {columns.map((c, i) => {
                  const val = c.dataIndex ? (r as any)[c.dataIndex] : undefined;
                  return (
                    <td key={i} className="px-4 py-2 text-sm">
                      {c.render ? c.render(val, r) : String(val ?? '')}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={columns.length}>{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
