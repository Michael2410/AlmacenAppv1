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
  const productos = db.prepare('SELECT id, nombre, marca, unidad, dias_alerta_stock FROM productos WHERE activo = 1').all();
  const productosBajos = [];

  for (const producto of productos) {
    const disponible = getStockDisponible(producto.id, producto.marca);
    const stockMinimo = producto.dias_alerta_stock || 10; // Usar umbral personalizado o default 10
    
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

  const query = `
    SELECT 
      i.id as ingresoId,
      i.productoId,
      p.nombre as productoNombre,
      p.dias_vencimiento_critico,
      p.dias_vencimiento_urgente,
      p.dias_vencimiento_atencion,
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
    const diasRestantes = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
    
    // Obtener umbrales personalizados o usar defaults
    const diasCritico = ingreso.dias_vencimiento_critico || 7;
    const diasUrgente = ingreso.dias_vencimiento_urgente || 15;
    const diasAtencion = ingreso.dias_vencimiento_atencion || 30;
    
    // Determinar urgencia según umbrales personalizados
    let urgencia = null;
    if (diasRestantes <= diasCritico && diasRestantes > 0) {
      urgencia = 'crítica';
    } else if (diasRestantes <= diasUrgente && diasRestantes > 0) {
      urgencia = 'alta';
    } else if (diasRestantes <= diasAtencion && diasRestantes > 0) {
      urgencia = 'media';
    }
    
    // Solo incluir si tiene urgencia y no ha vencido
    if (urgencia && diasRestantes > 0) {
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
        urgencia: urgencia,
        umbrales: {
          critico: diasCritico,
          urgente: diasUrgente,
          atencion: diasAtencion
        }
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
