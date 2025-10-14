import db from '../db.js';
import { getProductosBajoStock, getStockGeneralDetallado } from './stockValidator.js';

/**
 * Calcular métricas generales del dashboard
 */
export function getDashboardMetrics() {
  // 1. Valor total del inventario
  const inventarioData = db.prepare(`
    SELECT 
      SUM(i.cantidad * i.precio) as valorTotal,
      COUNT(DISTINCT i.productoId) as totalProductos,
      SUM(i.cantidad) as totalUnidades
    FROM ingresos i
    LEFT JOIN productos p ON i.productoId = p.id
  `).get();

  // 2. Stock asignado a usuarios
  const stockAsignado = db.prepare(`
    SELECT 
      SUM(us.cantidad) as totalAsignado,
      COUNT(DISTINCT us.usuarioId) as usuariosConStock
    FROM user_stock us
  `).get();

  // 3. Productos con bajo stock
  const productosBajoStock = getProductosBajoStock();

  // 4. Pedidos pendientes de aprobar
  const pedidosPendientes = db.prepare(`
    SELECT COUNT(*) as total
    FROM pedidos
    WHERE estado = 'pendiente'
  `).get();

  // 5. Pedidos entregados hoy
  const pedidosHoy = db.prepare(`
    SELECT COUNT(*) as total
    FROM pedidos
    WHERE estado = 'entregado' 
    AND DATE(fecha) = DATE('now', 'localtime')
  `).get();

  // 6. Ingresos de productos hoy
  const ingresosHoy = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(cantidad) as cantidadTotal
    FROM ingresos
    WHERE DATE(fechaIngreso) = DATE('now', 'localtime')
  `).get();

  // 7. Top 5 productos más solicitados
  const topProductos = db.prepare(`
    SELECT 
      p.id,
      p.nombre,
      p.marca,
      COUNT(ped.id) as vecessolicitado,
      SUM(ped.cantidad) as cantidadTotal
    FROM pedidos ped
    LEFT JOIN productos p ON ped.productoId = p.id
    WHERE ped.estado = 'entregado'
    GROUP BY p.id
    ORDER BY cantidadTotal DESC
    LIMIT 5
  `).all();

  // 8. Usuarios más activos (con más pedidos)
  const topUsuarios = db.prepare(`
    SELECT 
      u.id,
      u.nombres,
      COUNT(ped.id) as totalPedidos,
      SUM(ped.cantidad) as cantidadTotal
    FROM pedidos ped
    LEFT JOIN users u ON ped.usuarioId = u.id
    WHERE ped.estado = 'entregado'
    GROUP BY u.id
    ORDER BY totalPedidos DESC
    LIMIT 5
  `).all();

  // 9. Estadísticas de proveedores
  const statsProveedores = db.prepare(`
    SELECT 
      COUNT(DISTINCT i.proveedorId) as totalProveedoresActivos,
      COUNT(i.id) as totalIngresos
    FROM ingresos i
    WHERE DATE(i.fechaIngreso) >= DATE('now', '-30 days', 'localtime')
  `).get();

  // 10. Tiempo promedio de aprobación de pedidos (en horas)
  // Nota: Como no tenemos fecha de aprobación, usamos fecha de creación vs entrega
  const tiempoAprobacion = db.prepare(`
    SELECT 
      AVG(
        CAST(
          (julianday(datetime('now', 'localtime')) - julianday(fecha)) * 24 
          AS REAL
        )
      ) as promedioHoras
    FROM pedidos
    WHERE estado = 'entregado'
    AND DATE(fecha) >= DATE('now', '-7 days', 'localtime')
  `).get();

  // 11. Stock disponible vs asignado
  const stockGeneral = db.prepare(`
    SELECT 
      (SELECT COALESCE(SUM(cantidad), 0) FROM ingresos) as totalIngresos,
      (SELECT COALESCE(SUM(cantidad), 0) FROM user_stock) as totalAsignado
  `).get();

  const disponible = (stockGeneral.totalIngresos || 0) - (stockGeneral.totalAsignado || 0);
  const porcentajeAsignado = stockGeneral.totalIngresos > 0 
    ? ((stockGeneral.totalAsignado / stockGeneral.totalIngresos) * 100).toFixed(2)
    : 0;

  // Calcular usuarios activos (total de usuarios en el sistema)
  const usuariosActivos = db.prepare(`
    SELECT COUNT(DISTINCT id) as total
    FROM users
  `).get();

  return {
    // Formato para el frontend
    pedidosPendientes: pedidosPendientes.total || 0,
    productosStockBajo: productosBajoStock.length,
    entregasHoy: pedidosHoy.total || 0,
    usuariosActivos: usuariosActivos.total || 0,
    
    // Datos adicionales
    inventario: {
      valorTotal: inventarioData.valorTotal || 0,
      totalProductos: inventarioData.totalProductos || 0,
      totalUnidades: inventarioData.totalUnidades || 0,
      stockDisponible: disponible,
      stockAsignado: stockGeneral.totalAsignado || 0,
      porcentajeAsignado: parseFloat(porcentajeAsignado)
    },
    alertas: {
      productosBajoStock: productosBajoStock.length,
      pedidosPendientes: pedidosPendientes.total || 0
    },
    actividadHoy: {
      pedidosEntregados: pedidosHoy.total || 0,
      ingresosNuevos: ingresosHoy.total || 0,
      cantidadIngresada: ingresosHoy.cantidadTotal || 0
    },
    topProductos,
    topUsuarios,
    proveedores: {
      totalActivos: statsProveedores.totalProveedoresActivos || 0,
      ingresosUltimos30Dias: statsProveedores.totalIngresos || 0
    },
    rendimiento: {
      tiempoPromedioAprobacion: tiempoAprobacion.promedioHoras 
        ? parseFloat(tiempoAprobacion.promedioHoras.toFixed(2))
        : 0,
      usuariosConStock: stockAsignado.usuariosConStock || 0
    }
  };
}

/**
 * Obtener datos para gráficos del dashboard
 */
export function getDashboardCharts() {
  // 1. Ingresos vs Salidas últimos 7 días
  const ingresosVsSalidas = db.prepare(`
    SELECT 
      DATE(fechaIngreso) as fecha,
      SUM(cantidad) as total
    FROM ingresos
    WHERE DATE(fechaIngreso) >= DATE('now', '-7 days', 'localtime')
    GROUP BY DATE(fechaIngreso)
    ORDER BY fecha
  `).all();

  const salidas = db.prepare(`
    SELECT 
      DATE(ped.fecha) as fecha,
      SUM(ped.cantidad) as total
    FROM pedidos ped
    WHERE ped.estado = 'entregado'
    AND DATE(ped.fecha) >= DATE('now', '-7 days', 'localtime')
    GROUP BY DATE(ped.fecha)
    ORDER BY fecha
  `).all();

  // 2. Distribución de stock por área (en lugar de categoría)
  const stockPorCategoria = db.prepare(`
    SELECT 
      COALESCE(a.nombre, 'Sin Área') as categoria,
      SUM(i.cantidad) as totalIngresos,
      (SELECT COALESCE(SUM(us.cantidad), 0) FROM user_stock us 
       INNER JOIN productos pr ON us.productoId = pr.id 
       WHERE pr.areaId = p.areaId) as totalAsignado
    FROM productos p
    LEFT JOIN areas a ON p.areaId = a.id
    LEFT JOIN ingresos i ON p.id = i.productoId
    GROUP BY p.areaId, a.nombre
    ORDER BY totalIngresos DESC
  `).all();

  // 3. Actividad de pedidos por mes (últimos 6 meses)
  const pedidosPorMes = db.prepare(`
    SELECT 
      strftime('%Y-%m', fecha) as mes,
      COUNT(*) as total,
      SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as entregados,
      SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes
    FROM pedidos
    WHERE DATE(fecha) >= DATE('now', '-6 months', 'localtime')
    GROUP BY mes
    ORDER BY mes
  `).all();

  // 4. Top 10 productos con mayor movimiento
  const productosMasMovidos = db.prepare(`
    SELECT 
      p.id,
      p.nombre,
      p.marca,
      (SELECT COALESCE(SUM(cantidad), 0) FROM ingresos WHERE productoId = p.id) as ingresos,
      (SELECT COALESCE(SUM(cantidad), 0) FROM user_stock WHERE productoId = p.id) as salidas
    FROM productos p
    ORDER BY (ingresos + salidas) DESC
    LIMIT 10
  `).all();

  return {
    // Formato para frontend - Pedidos últimos 7 días
    pedidosUltimos7Dias: salidas.map(s => ({
      fecha: s.fecha,
      cantidad: s.total
    })),
    
    // Distribución por estado
    distribucionPorEstado: pedidosPorMes.length > 0 ? [
      { name: 'Entregados', value: pedidosPorMes.reduce((sum, m) => sum + (m.entregados || 0), 0) },
      { name: 'Pendientes', value: pedidosPorMes.reduce((sum, m) => sum + (m.pendientes || 0), 0) }
    ] : [],
    
    // Top 10 productos más pedidos
    productosMasPedidos: productosMasMovidos.map(p => ({
      nombre: p.nombre,
      cantidad: p.salidas || 0
    })),
    
    // Datos originales para uso futuro
    ingresosVsSalidas: {
      ingresos: ingresosVsSalidas,
      salidas
    },
    stockPorCategoria,
    pedidosPorMes,
    productosMasMovidos
  };
}

/**
 * Obtener actividad reciente
 */
export function getRecentActivity(limit = 10) {
  // Intentar obtener de la tabla de auditoría primero
  try {
    const auditoria = db.prepare(`
      SELECT 
        id,
        fecha_hora,
        usuario_nombre,
        accion,
        modulo,
        descripcion
      FROM auditoria
      ORDER BY fecha_hora DESC
      LIMIT ?
    `).all(limit);
    
    if (auditoria && auditoria.length > 0) {
      return auditoria;
    }
  } catch (err) {
    console.warn('⚠️ Tabla auditoria no disponible, usando fallback');
  }
  
  // Fallback: usar pedidos e ingresos
  const actividadReciente = db.prepare(`
    SELECT 
      'pedido' as tipo,
      ped.id,
      ped.fecha as fecha,
      u.nombres as usuario,
      p.nombre as producto,
      ped.cantidad,
      ped.estado
    FROM pedidos ped
    LEFT JOIN users u ON ped.usuarioId = u.id
    LEFT JOIN productos p ON ped.productoId = p.id
    UNION ALL
    SELECT 
      'ingreso' as tipo,
      i.id,
      i.fechaIngreso as fecha,
      NULL as usuario,
      p.nombre as producto,
      i.cantidad,
      'ingresado' as estado
    FROM ingresos i
    LEFT JOIN productos p ON i.productoId = p.id
    ORDER BY fecha DESC
    LIMIT ?
  `).all(limit);

  return actividadReciente;
}
