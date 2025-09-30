export function toCSV(rows: Record<string, unknown>[], delimiter = ','): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    if (val == null) return '';
    const s = String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(delimiter)];
  for (const row of rows) {
    lines.push(headers.map(h => escape((row as any)[h])).join(delimiter));
  }
  return lines.join('\n');
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
