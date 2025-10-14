/**
 * Utilidad para validar stock disponible antes de asignaciones
 */
import db from '../db.js';

/**
 * Calcula el stock disponible de un producto específico (con marca opcional)
 * @param {string} productoId - ID del producto
 * @param {string} [marca] - Marca del producto (opcional)
 * @returns {number} Cantidad disponible
 */
export function getStockDisponible(productoId, marca = null) {
  // Stock total ingresado
  const ingresosQuery = marca 
    ? db.prepare('SELECT COALESCE(SUM(cantidad), 0) as total FROM ingresos WHERE productoId = ? AND marca = ?')
    : db.prepare('SELECT COALESCE(SUM(cantidad), 0) as total FROM ingresos WHERE productoId = ? AND (marca IS NULL OR marca = "")');
  
  const ingresos = marca 
    ? ingresosQuery.get(productoId, marca)
    : ingresosQuery.get(productoId);

  // Stock asignado a usuarios
  const asignadosQuery = marca
    ? db.prepare('SELECT COALESCE(SUM(cantidad), 0) as total FROM user_stock WHERE productoId = ? AND marca = ?')
    : db.prepare('SELECT COALESCE(SUM(cantidad), 0) as total FROM user_stock WHERE productoId = ? AND (marca IS NULL OR marca = "")');
  
  const asignados = marca
    ? asignadosQuery.get(productoId, marca)
    : asignadosQuery.get(productoId);

  const disponible = (ingresos?.total || 0) - (asignados?.total || 0);
  return disponible;
}

/**
 * Valida si hay suficiente stock antes de una asignación
 * @param {string} productoId - ID del producto
 * @param {number} cantidadSolicitada - Cantidad que se quiere asignar
 * @param {string} [marca] - Marca del producto (opcional)
 * @throws {Error} Si no hay stock suficiente
 */
export function validarStockDisponible(productoId, cantidadSolicitada, marca = null) {
  const disponible = getStockDisponible(productoId, marca);
  
  if (cantidadSolicitada > disponible) {
    const producto = db.prepare('SELECT nombre FROM productos WHERE id = ?').get(productoId);
    const nombreProducto = producto?.nombre || productoId;
    const marcaInfo = marca ? ` (${marca})` : '';
    
    throw new Error(
      `Stock insuficiente para ${nombreProducto}${marcaInfo}. ` +
      `Disponible: ${disponible}, Solicitado: ${cantidadSolicitada}`
    );
  }
  
  return true;
}

/**
 * Obtiene productos con stock bajo (menos de 10 unidades disponibles)
 * @returns {Array} Lista de productos con stock bajo
 */
export function getProductosBajoStock() {
  const productos = db.prepare('SELECT id, nombre, marca, unidad FROM productos WHERE activo = 1').all();
  const productosBajos = [];
  const stockMinimo = 10; // Umbral de stock bajo

  for (const producto of productos) {
    const disponible = getStockDisponible(producto.id, producto.marca);
    if (disponible < stockMinimo && disponible >= 0) {
      productosBajos.push({
        producto_id: producto.id,        // Frontend espera producto_id
        productoId: producto.id,          // Compatibilidad
        nombre: producto.nombre,
        marca: producto.marca,
        unidad_medida: producto.unidad,
        stock_actual: disponible,
        stock_minimo: stockMinimo,
        stockDisponible: disponible       // Compatibilidad
      });
    }
  }

  return productosBajos;
}

/**
 * Obtiene productos próximos a vencer (dentro de los próximos 30 días)
 * @returns {Array} Lista de productos próximos a vencer
 */
export function getProductosProximosVencer(diasUmbral = 30) {
  const hoy = new Date();
  const fechaLimite = new Date();
  fechaLimite.setDate(hoy.getDate() + diasUmbral);

  const query = `
    SELECT 
      i.id as ingresoId,
      i.productoId,
      p.nombre as productoNombre,
      i.marca,
      i.cantidad,
      i.unidad,
      i.fechaVencimiento,
      i.fechaIngreso,
      i.proveedorId
    FROM ingresos i
    INNER JOIN productos p ON i.productoId = p.id
    WHERE i.fechaVencimiento IS NOT NULL
      AND i.fechaVencimiento != ''
      AND i.cantidad > 0
      AND p.activo = 1
    ORDER BY i.fechaVencimiento ASC
  `;

  const ingresos = db.prepare(query).all();
  const productosVencer = [];

  for (const ingreso of ingresos) {
    const fechaVenc = new Date(ingreso.fechaVencimiento);
    
    // Solo incluir si está entre hoy y la fecha límite
    if (fechaVenc >= hoy && fechaVenc <= fechaLimite) {
      const diasRestantes = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
      
      productosVencer.push({
        ingreso_id: ingreso.ingresoId,
        producto_id: ingreso.productoId,
        producto_nombre: ingreso.productoNombre,
        marca: ingreso.marca,
        cantidad: ingreso.cantidad,
        unidad: ingreso.unidad,
        fecha_vencimiento: ingreso.fechaVencimiento,
        fecha_ingreso: ingreso.fechaIngreso,
        dias_restantes: diasRestantes,
        urgencia: diasRestantes <= 7 ? 'crítica' : diasRestantes <= 15 ? 'alta' : 'media'
      });
    }
  }

  return productosVencer;
}

/**
 * Obtiene el stock total disponible agrupado por producto y marca
 * @returns {Array} Lista con stock disponible
 */
export function getStockGeneralDetallado() {
  const query = `
    SELECT 
      p.id as productoId,
      p.nombre,
      p.marca,
      p.unidad,
      COALESCE(SUM(i.cantidad), 0) as totalIngresado,
      COALESCE(
        (SELECT SUM(us.cantidad) 
         FROM user_stock us 
         WHERE us.productoId = p.id 
         AND (us.marca = p.marca OR (us.marca IS NULL AND p.marca IS NULL))
        ), 0
      ) as totalAsignado
    FROM productos p
    LEFT JOIN ingresos i ON i.productoId = p.id 
      AND (i.marca = p.marca OR (i.marca IS NULL AND p.marca IS NULL))
    WHERE p.activo = 1
    GROUP BY p.id, p.marca
  `;

  const rows = db.prepare(query).all();
  
  return rows.map(row => ({
    ...row,
    stockDisponible: row.totalIngresado - row.totalAsignado,
    porcentajeAsignado: row.totalIngresado > 0 
      ? Math.round((row.totalAsignado / row.totalIngresado) * 100) 
      : 0
  }));
}
