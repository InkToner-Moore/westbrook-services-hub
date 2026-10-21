// Escape cells using the same CSV format as the hours export.
export function downloadCsv(fileName: string, rows: unknown[][]): void {
  const csv = rows.map((row) => row.map((value) => {
    const cell = value == null ? '' : String(value);
    return /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
  }).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
