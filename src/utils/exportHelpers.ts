import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

/**
 * Utilidades para exportar reportes a diferentes formatos
 */

// ===== EXPORTAR A EXCEL =====

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Datos') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Auto-ajustar ancho de columnas
  const maxWidth = 50;
  const columns = Object.keys(data[0] || {});
  const colWidths = columns.map(col => {
    const maxLen = Math.max(
      col.length,
      ...data.map(row => String(row[col] || '').length)
    );
    return { wch: Math.min(maxLen + 2, maxWidth) };
  });
  worksheet['!cols'] = colWidths;
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// ===== EXPORTAR A CSV =====

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escapar comillas y envolver en comillas si contiene coma
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ===== EXPORTAR A PDF =====

export function exportToPDF(
  data: any[], 
  filename: string, 
  title: string,
  columns?: { header: string; dataKey: string }[]
) {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }
  
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  
  // Fecha de generación
  doc.setFontSize(10);
  doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);
  
  // Auto-generar columnas si no se proporcionan
  const tableColumns = columns || Object.keys(data[0]).map(key => ({
    header: key.charAt(0).toUpperCase() + key.slice(1),
    dataKey: key
  }));
  
  // Generar tabla
  autoTable(doc, {
    startY: 35,
    head: [tableColumns.map(col => col.header)],
    body: data.map(row => tableColumns.map(col => row[col.dataKey] ?? '')),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 35 }
  });
  
  doc.save(`${filename}.pdf`);
}

// ===== FUNCIONES ESPECÍFICAS POR TIPO DE REPORTE =====

export function exportInventarioToExcel(data: any[]) {
  const formattedData = data.map(item => ({
    'ID': item.id,
    'Producto': item.producto,
    'Marca': item.marca || 'N/A',
    'Unidad': item.unidad,
    'Área': item.area,
    'Ubicación': item.ubicacion,
    'Total Ingresado': item.totalIngresado,
    'Total Asignado': item.totalAsignado,
    'Stock Disponible': item.stockDisponible,
    'Precio Promedio': item.precioPromedio?.toFixed(2) || '0.00',
    'Valorización': item.valorizacion?.toFixed(2) || '0.00',
    'Activo': item.activo ? 'Sí' : 'No'
  }));
  
  exportToExcel(formattedData, 'inventario_general', 'Inventario');
}

export function exportInventarioToPDF(data: any[]) {
  const columns = [
    { header: 'Producto', dataKey: 'producto' },
    { header: 'Marca', dataKey: 'marca' },
    { header: 'Unidad', dataKey: 'unidad' },
    { header: 'Ingresado', dataKey: 'totalIngresado' },
    { header: 'Asignado', dataKey: 'totalAsignado' },
    { header: 'Disponible', dataKey: 'stockDisponible' },
    { header: 'Valorización', dataKey: 'valorizacion' }
  ];
  
  const formattedData = data.map(item => ({
    ...item,
    marca: item.marca || 'N/A',
    valorizacion: item.valorizacion?.toFixed(2) || '0.00'
  }));
  
  exportToPDF(formattedData, 'inventario_general', 'Reporte de Inventario General', columns);
}

export function exportIngresosToExcel(ingresos: any[], totales: any) {
  const formattedData = ingresos.map(item => ({
    'Fecha': item.fechaIngreso,
    'Producto': item.productoNombre,
    'Marca': item.marca || 'N/A',
    'Proveedor': item.proveedor,
    'Cantidad': item.cantidad,
    'Unidad': item.unidad,
    'Precio Unitario': item.precio?.toFixed(2),
    'Total': item.total?.toFixed(2),
    'Área': item.area,
    'Ubicación': item.ubicacion,
    'N° Serie': item.numeroSerie || '',
    'Serie Factura': item.serieFactura || '',
    'Fecha Factura': item.fechaFactura || '',
    'Fecha Vencimiento': item.fechaVencimiento || ''
  }));
  
  // Agregar fila de totales
  formattedData.push({
    'Fecha': 'TOTALES',
    'Producto': '',
    'Marca': '',
    'Proveedor': `${totales.totalRegistros} registros`,
    'Cantidad': totales.totalUnidades,
    'Unidad': '',
    'Precio Unitario': '',
    'Total': totales.totalValor?.toFixed(2),
    'Área': '',
    'Ubicación': '',
    'N° Serie': '',
    'Serie Factura': '',
    'Fecha Factura': '',
    'Fecha Vencimiento': ''
  });
  
  exportToExcel(formattedData, 'reporte_ingresos', 'Ingresos');
}

export function exportIngresosToPDF(ingresos: any[], totales: any) {
  const columns = [
    { header: 'Fecha', dataKey: 'fechaIngreso' },
    { header: 'Producto', dataKey: 'productoNombre' },
    { header: 'Proveedor', dataKey: 'proveedor' },
    { header: 'Cantidad', dataKey: 'cantidad' },
    { header: 'Precio', dataKey: 'precio' },
    { header: 'Total', dataKey: 'total' }
  ];
  
  const formattedData = ingresos.map(item => ({
    ...item,
    precio: item.precio?.toFixed(2),
    total: item.total?.toFixed(2)
  }));
  
  // Agregar totales al final
  formattedData.push({
    fechaIngreso: 'TOTALES',
    productoNombre: '',
    proveedor: `${totales.totalRegistros} registros`,
    cantidad: totales.totalUnidades,
    precio: '',
    total: totales.totalValor?.toFixed(2)
  });
  
  exportToPDF(formattedData, 'reporte_ingresos', 'Reporte de Ingresos', columns);
}

export function exportPedidosToExcel(pedidos: any[], stats: any) {
  const formattedData = pedidos.map(item => ({
    'Fecha': item.fecha,
    'Usuario': item.usuario,
    'Producto': item.producto,
    'Marca': item.marca || 'N/A',
    'Cantidad': item.cantidad,
    'Unidad': item.unidad,
    'Estado': item.estado.toUpperCase(),
    'Lote': item.loteId || '',
    'Observaciones': item.observaciones || ''
  }));
  
  // Agregar estadísticas al final
  formattedData.push({
    'Fecha': '',
    'Usuario': '',
    'Producto': '',
    'Marca': '',
    'Cantidad': '',
    'Unidad': '',
    'Estado': '',
    'Lote': '',
    'Observaciones': ''
  });
  formattedData.push({
    'Fecha': 'ESTADÍSTICAS',
    'Usuario': '',
    'Producto': '',
    'Marca': '',
    'Cantidad': '',
    'Unidad': '',
    'Estado': '',
    'Lote': '',
    'Observaciones': ''
  });
  formattedData.push({
    'Fecha': 'Total Pedidos',
    'Usuario': stats.total,
    'Producto': 'Pendientes',
    'Marca': stats.pendientes,
    'Cantidad': 'Aprobados',
    'Unidad': stats.aprobados,
    'Estado': 'Entregados',
    'Lote': stats.entregados,
    'Observaciones': ''
  });
  
  exportToExcel(formattedData, 'reporte_pedidos', 'Pedidos');
}

export function exportPedidosToPDF(pedidos: any[]) {
  const columns = [
    { header: 'Fecha', dataKey: 'fecha' },
    { header: 'Usuario', dataKey: 'usuario' },
    { header: 'Producto', dataKey: 'producto' },
    { header: 'Cantidad', dataKey: 'cantidad' },
    { header: 'Estado', dataKey: 'estado' }
  ];
  
  const formattedData = pedidos.map(item => ({
    ...item,
    estado: item.estado.toUpperCase()
  }));
  
  exportToPDF(formattedData, 'reporte_pedidos', 'Reporte de Pedidos', columns);
}

export function exportStockUsuariosToExcel(stock: any[]) {
  const formattedData = stock.map(item => ({
    'Usuario': item.usuario,
    'Email': item.email,
    'Producto': item.producto,
    'Marca': item.marca || 'N/A',
    'Cantidad': item.cantidad,
    'Unidad': item.unidad,
    'Área': item.area,
    'Ubicación': item.ubicacion
  }));
  
  exportToExcel(formattedData, 'stock_por_usuario', 'Stock Usuarios');
}

export function exportStockUsuariosToPDF(stock: any[]) {
  const columns = [
    { header: 'Usuario', dataKey: 'usuario' },
    { header: 'Producto', dataKey: 'producto' },
    { header: 'Cantidad', dataKey: 'cantidad' },
    { header: 'Unidad', dataKey: 'unidad' },
    { header: 'Área', dataKey: 'area' }
  ];
  
  exportToPDF(stock, 'stock_por_usuario', 'Reporte de Stock por Usuario', columns);
}

export function exportMovimientosToExcel(movimientos: any[]) {
  const formattedData = movimientos.map(item => ({
    'Tipo': item.tipo,
    'Fecha': item.fecha,
    'Descripción': item.descripcion,
    'Marca': item.marca || 'N/A',
    'Cantidad': item.cantidad,
    'Unidad': item.unidad,
    'Precio': item.precio?.toFixed(2) || '',
    'Valor': item.valor?.toFixed(2) || '',
    'Origen': item.origen || '',
    'Área': item.area || '',
    'Ubicación': item.ubicacion || ''
  }));
  
  exportToExcel(formattedData, 'movimientos', 'Movimientos');
}

export function exportMovimientosToPDF(movimientos: any[]) {
  const columns = [
    { header: 'Tipo', dataKey: 'tipo' },
    { header: 'Fecha', dataKey: 'fecha' },
    { header: 'Descripción', dataKey: 'descripcion' },
    { header: 'Cantidad', dataKey: 'cantidad' },
    { header: 'Origen', dataKey: 'origen' }
  ];
  
  exportToPDF(movimientos, 'movimientos', 'Reporte de Movimientos', columns);
}
