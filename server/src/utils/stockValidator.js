/**
 * Utilidad para validar stock disponible antes de asignaciones
 */
import db from '../db.js';

/**
 * Calcula el stock disponible de un producto específico (con marca opcional)
 * Ahora usa la columna cantidad_disponible directamente
 * @param {string} productoId - ID del producto
 * @param {string} [marca] - Marca del producto (opcional)
 * @returns {number} Cantidad disponible
 */
export function getStockDisponible(productoId, marca = null) {
  // Suma de cantidad_disponible de todos los ingresos del producto
  const query = marca 
    ? db.prepare('SELECT COALESCE(SUM(cantidad_disponible), 0) as total FROM ingresos WHERE productoId = ? AND marca = ?')
    : db.prepare('SELECT COALESCE(SUM(cantidad_disponible), 0) as total FROM ingresos WHERE productoId = ? AND (marca IS NULL OR marca = "")');
  
  const result = marca 
    ? query.get(productoId, marca)
    : query.get(productoId);

  return result?.total || 0;
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
      i.cantidad_disponible,
      i.unidad,
      i.fechaVencimiento,
      i.fechaIngreso,
      i.proveedorId
    FROM ingresos i
    INNER JOIN productos p ON i.productoId = p.id
    WHERE i.fechaVencimiento IS NOT NULL
      AND i.fechaVencimiento != ''
      AND i.cantidad_disponible > 0
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
        cantidad: ingreso.cantidad_disponible, // Usar cantidad_disponible
        cantidad_total: ingreso.cantidad, // Mantener referencia a la cantidad original
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
 * Ahora usa cantidad_disponible directamente
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
      COALESCE(SUM(i.cantidad_disponible), 0) as stockDisponible,
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
    porcentajeAsignado: row.totalIngresado > 0 
      ? Math.round((row.totalAsignado / row.totalIngresado) * 100) 
      : 0
  }));
}

/**
 * Obtiene productos YA vencidos (fechaVencimiento < HOY)
 * @returns {Array} Lista de productos vencidos con stock disponible
 */
export function getProductosVencidos() {
  const hoy = new Date();

  const query = `
    SELECT 
      i.id as ingreso_id,
      i.productoId as producto_id,
      p.nombre as producto_nombre,
      p.marca,
      i.cantidad,
      i.cantidad_disponible,
      i.unidad,
      i.fechaVencimiento as fecha_vencimiento,
      i.fechaIngreso as fecha_ingreso,
      i.precio,
      i.proveedorId as proveedor_id,
      pr.nombre as proveedor_nombre
    FROM ingresos i
    INNER JOIN productos p ON i.productoId = p.id
    LEFT JOIN proveedores pr ON i.proveedorId = pr.id
    WHERE i.fechaVencimiento IS NOT NULL
      AND i.fechaVencimiento != ''
      AND i.cantidad_disponible > 0
      AND p.activo = 1
      AND DATE(i.fechaVencimiento) < DATE('now')
    ORDER BY i.fechaVencimiento ASC
  `;

  const ingresos = db.prepare(query).all();
  
  return ingresos.map(ingreso => {
    const fechaVenc = new Date(ingreso.fecha_vencimiento);
    const diasVencido = Math.ceil((hoy - fechaVenc) / (1000 * 60 * 60 * 24));
    
    // Calcular valor proporcional: (cantidad_disponible / cantidad_total) * precio_total
    const precioUnitario = (ingreso.precio || 0) / (ingreso.cantidad || 1);
    const valorTotal = (ingreso.cantidad_disponible || 0) * precioUnitario;
    
    return {
      ...ingreso,
      dias_vencido: diasVencido,
      valor_total: valorTotal
    };
  });
}
