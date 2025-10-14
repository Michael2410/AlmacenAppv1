import db from '../db.js';

/**
 * Generador de reportes para exportación
 * Todas las queries verificadas contra el esquema real de la BD
 */

/**
 * Reporte de Inventario General
 * Incluye stock total por producto con valorización
 */
export function getInventarioGeneralReport(filtros = {}) {
  const { productoId, areaId } = filtros;
  
  let query = `
    SELECT 
      p.id,
      p.nombre as producto,
      p.marca,
      p.unidad,
      a.nombre as area,
      u.nombre as ubicacion,
      -- Total ingresado
      COALESCE(SUM(i.cantidad), 0) as totalIngresado,
      -- Total asignado a usuarios
      (SELECT COALESCE(SUM(cantidad), 0) 
       FROM user_stock us 
       WHERE us.productoId = p.id) as totalAsignado,
      -- Stock disponible = ingresado - asignado
      COALESCE(SUM(i.cantidad), 0) - 
      (SELECT COALESCE(SUM(cantidad), 0) 
       FROM user_stock us 
       WHERE us.productoId = p.id) as stockDisponible,
      -- Valorización (precio promedio * stock disponible)
      AVG(i.precio) as precioPromedio,
      (COALESCE(SUM(i.cantidad), 0) - 
       (SELECT COALESCE(SUM(cantidad), 0) 
        FROM user_stock us 
        WHERE us.productoId = p.id)) * AVG(i.precio) as valorizacion,
      p.activo
    FROM productos p
    LEFT JOIN ingresos i ON p.id = i.productoId
    LEFT JOIN areas a ON p.areaId = a.id
    LEFT JOIN ubicaciones u ON p.ubicacionId = u.id
  `;
  
  const conditions = [];
  const params = [];
  
  if (productoId) {
    conditions.push('p.id = ?');
    params.push(productoId);
  }
  
  if (areaId) {
    conditions.push('p.areaId = ?');
    params.push(areaId);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' GROUP BY p.id ORDER BY p.nombre';
  
  return db.prepare(query).all(...params);
}

/**
 * Reporte de Ingresos por Período
 */
export function getIngresosReport(filtros = {}) {
  const { fechaInicio, fechaFin, productoId, proveedorId } = filtros;
  
  let query = `
    SELECT 
      i.id,
      i.fechaIngreso,
      i.nombre as productoNombre,
      p.marca,
      prov.nombre as proveedor,
      i.cantidad,
      i.unidad,
      i.precio,
      (i.cantidad * i.precio) as total,
      a.nombre as area,
      u.nombre as ubicacion,
      i.numeroSerie,
      i.serieFactura,
      i.fechaFactura,
      i.fechaVencimiento
    FROM ingresos i
    LEFT JOIN productos p ON i.productoId = p.id
    LEFT JOIN proveedores prov ON i.proveedorId = prov.id
    LEFT JOIN areas a ON i.areaId = a.id
    LEFT JOIN ubicaciones u ON i.ubicacionId = u.id
  `;
  
  const conditions = [];
  const params = [];
  
  if (fechaInicio) {
    conditions.push('DATE(i.fechaIngreso) >= DATE(?)');
    params.push(fechaInicio);
  }
  
  if (fechaFin) {
    conditions.push('DATE(i.fechaIngreso) <= DATE(?)');
    params.push(fechaFin);
  }
  
  if (productoId) {
    conditions.push('i.productoId = ?');
    params.push(productoId);
  }
  
  if (proveedorId) {
    conditions.push('i.proveedorId = ?');
    params.push(proveedorId);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY i.fechaIngreso DESC';
  
  const ingresos = db.prepare(query).all(...params);
  
  // Calcular totales
  const totales = {
    totalRegistros: ingresos.length,
    totalUnidades: ingresos.reduce((sum, i) => sum + i.cantidad, 0),
    totalValor: ingresos.reduce((sum, i) => sum + i.total, 0)
  };
  
  return { ingresos, totales };
}

/**
 * Reporte de Pedidos
 */
export function getPedidosReport(filtros = {}) {
  const { fechaInicio, fechaFin, usuarioId, estado, productoId } = filtros;
  
  let query = `
    SELECT 
      ped.id,
      ped.fecha,
      u.nombres as usuario,
      p.nombre as producto,
      p.marca,
      ped.cantidad,
      ped.unidad,
      ped.estado,
      ped.loteId,
      ped.observaciones,
      ped.fechaSolicitud,
      ped.fechaRespuesta
    FROM pedidos ped
    LEFT JOIN users u ON ped.usuarioId = u.id
    LEFT JOIN productos p ON ped.productoId = p.id
  `;
  
  const conditions = [];
  const params = [];
  
  if (fechaInicio) {
    conditions.push('DATE(ped.fecha) >= DATE(?)');
    params.push(fechaInicio);
  }
  
  if (fechaFin) {
    conditions.push('DATE(ped.fecha) <= DATE(?)');
    params.push(fechaFin);
  }
  
  if (usuarioId) {
    conditions.push('ped.usuarioId = ?');
    params.push(usuarioId);
  }
  
  if (estado) {
    conditions.push('ped.estado = ?');
    params.push(estado);
  }
  
  if (productoId) {
    conditions.push('ped.productoId = ?');
    params.push(productoId);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY ped.fecha DESC';
  
  const pedidos = db.prepare(query).all(...params);
  
  // Estadísticas
  const stats = {
    total: pedidos.length,
    pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
    aprobados: pedidos.filter(p => p.estado === 'aprobado').length,
    rechazados: pedidos.filter(p => p.estado === 'rechazado').length,
    entregados: pedidos.filter(p => p.estado === 'entregado').length,
    totalUnidades: pedidos.reduce((sum, p) => sum + p.cantidad, 0)
  };
  
  return { pedidos, stats };
}

/**
 * Reporte de Stock por Usuario
 */
export function getStockPorUsuarioReport(filtros = {}) {
  const { usuarioId } = filtros;
  
  let query = `
    SELECT 
      us.id,
      u.nombres as usuario,
      u.email,
      p.nombre as producto,
      p.marca,
      us.cantidad,
      us.unidad,
      a.nombre as area,
      ub.nombre as ubicacion
    FROM user_stock us
    LEFT JOIN users u ON us.usuarioId = u.id
    LEFT JOIN productos p ON us.productoId = p.id
    LEFT JOIN areas a ON us.areaId = a.id
    LEFT JOIN ubicaciones ub ON us.ubicacionId = ub.id
  `;
  
  if (usuarioId) {
    query += ' WHERE us.usuarioId = ?';
  }
  
  query += ' ORDER BY u.nombres, p.nombre';
  
  const params = usuarioId ? [usuarioId] : [];
  const stock = db.prepare(query).all(...params);
  
  // Agrupar por usuario
  const porUsuario = {};
  stock.forEach(item => {
    if (!porUsuario[item.usuario]) {
      porUsuario[item.usuario] = {
        usuario: item.usuario,
        email: item.email,
        productos: [],
        totalItems: 0
      };
    }
    porUsuario[item.usuario].productos.push(item);
    porUsuario[item.usuario].totalItems += item.cantidad;
  });
  
  return {
    stock,
    porUsuario: Object.values(porUsuario)
  };
}

/**
 * Reporte de Movimientos Completo
 * Combina ingresos, salidas y pedidos entregados
 */
export function getMovimientosReport(filtros = {}) {
  const { fechaInicio, fechaFin, tipo } = filtros;
  
  const movimientos = [];
  
  // INGRESOS
  if (!tipo || tipo === 'ingreso') {
    let queryIngresos = `
      SELECT 
        'INGRESO' as tipo,
        i.id,
        i.fechaIngreso as fecha,
        i.nombre as descripcion,
        p.marca,
        i.cantidad,
        i.unidad,
        i.precio,
        (i.cantidad * i.precio) as valor,
        prov.nombre as origen,
        a.nombre as area,
        u.nombre as ubicacion
      FROM ingresos i
      LEFT JOIN productos p ON i.productoId = p.id
      LEFT JOIN proveedores prov ON i.proveedorId = prov.id
      LEFT JOIN areas a ON i.areaId = a.id
      LEFT JOIN ubicaciones u ON i.ubicacionId = u.id
    `;
    
    const conditionsIng = [];
    const paramsIng = [];
    
    if (fechaInicio) {
      conditionsIng.push('DATE(i.fechaIngreso) >= DATE(?)');
      paramsIng.push(fechaInicio);
    }
    
    if (fechaFin) {
      conditionsIng.push('DATE(i.fechaIngreso) <= DATE(?)');
      paramsIng.push(fechaFin);
    }
    
    if (conditionsIng.length > 0) {
      queryIngresos += ' WHERE ' + conditionsIng.join(' AND ');
    }
    
    movimientos.push(...db.prepare(queryIngresos).all(...paramsIng));
  }
  
  // SALIDAS (user_salidas)
  if (!tipo || tipo === 'salida') {
    let querySalidas = `
      SELECT 
        'SALIDA' as tipo,
        us.id,
        us.fecha,
        p.nombre as descripcion,
        p.marca,
        us.cantidad,
        us.unidad,
        NULL as precio,
        NULL as valor,
        u.nombres as origen,
        NULL as area,
        NULL as ubicacion
      FROM user_salidas us
      LEFT JOIN users u ON us.usuarioId = u.id
      LEFT JOIN productos p ON us.productoId = p.id
    `;
    
    const conditionsSal = [];
    const paramsSal = [];
    
    if (fechaInicio) {
      conditionsSal.push('DATE(us.fecha) >= DATE(?)');
      paramsSal.push(fechaInicio);
    }
    
    if (fechaFin) {
      conditionsSal.push('DATE(us.fecha) <= DATE(?)');
      paramsSal.push(fechaFin);
    }
    
    if (conditionsSal.length > 0) {
      querySalidas += ' WHERE ' + conditionsSal.join(' AND ');
    }
    
    movimientos.push(...db.prepare(querySalidas).all(...paramsSal));
  }
  
  // PEDIDOS ENTREGADOS
  if (!tipo || tipo === 'pedido') {
    let queryPedidos = `
      SELECT 
        'PEDIDO' as tipo,
        ped.id,
        ped.fecha,
        p.nombre as descripcion,
        p.marca,
        ped.cantidad,
        ped.unidad,
        NULL as precio,
        NULL as valor,
        u.nombres as origen,
        NULL as area,
        NULL as ubicacion
      FROM pedidos ped
      LEFT JOIN users u ON ped.usuarioId = u.id
      LEFT JOIN productos p ON ped.productoId = p.id
      WHERE ped.estado = 'entregado'
    `;
    
    const conditionsPed = [];
    const paramsPed = [];
    
    if (fechaInicio) {
      conditionsPed.push('DATE(ped.fecha) >= DATE(?)');
      paramsPed.push(fechaInicio);
    }
    
    if (fechaFin) {
      conditionsPed.push('DATE(ped.fecha) <= DATE(?)');
      paramsPed.push(fechaFin);
    }
    
    if (conditionsPed.length > 0) {
      queryPedidos += ' AND ' + conditionsPed.join(' AND ');
    }
    
    movimientos.push(...db.prepare(queryPedidos).all(...paramsPed));
  }
  
  // Ordenar por fecha
  movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  return movimientos;
}

/**
 * Obtener resumen ejecutivo para reportes
 */
export function getResumenEjecutivo(filtros = {}) {
  const { fechaInicio, fechaFin } = filtros;
  
  // Base de condiciones
  const dateCondition = [];
  const params = [];
  
  if (fechaInicio) {
    dateCondition.push('DATE(?) <= DATE(?)');
    params.push(fechaInicio, fechaInicio);
  }
  
  if (fechaFin) {
    dateCondition.push('DATE(?) >= DATE(?)');
    params.push(fechaFin, fechaFin);
  }
  
  // Total de productos activos
  const totalProductos = db.prepare(`
    SELECT COUNT(*) as total 
    FROM productos 
    WHERE activo = 1
  `).get();
  
  // Total de usuarios
  const totalUsuarios = db.prepare(`
    SELECT COUNT(*) as total 
    FROM users
  `).get();
  
  // Valor total del inventario
  const valorInventario = db.prepare(`
    SELECT 
      COALESCE(SUM(cantidad * precio), 0) as valor
    FROM ingresos
  `).get();
  
  // Pedidos por estado (del período)
  let queryPedidos = 'SELECT estado, COUNT(*) as cantidad FROM pedidos';
  if (fechaInicio || fechaFin) {
    const condsPed = [];
    if (fechaInicio) condsPed.push('DATE(fecha) >= DATE(?)');
    if (fechaFin) condsPed.push('DATE(fecha) <= DATE(?)');
    queryPedidos += ' WHERE ' + condsPed.join(' AND ');
  }
  queryPedidos += ' GROUP BY estado';
  
  const pedidosPorEstado = db.prepare(queryPedidos).all(
    ...(fechaInicio && fechaFin ? [fechaInicio, fechaFin] : 
        fechaInicio ? [fechaInicio] :
        fechaFin ? [fechaFin] : [])
  );
  
  return {
    totalProductos: totalProductos.total,
    totalUsuarios: totalUsuarios.total,
    valorInventario: valorInventario.valor,
    pedidosPorEstado
  };
}
