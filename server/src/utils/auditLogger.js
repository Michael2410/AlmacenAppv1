import db from '../db.js';

/**
 * Sistema de auditoría para rastrear cambios críticos
 */

// Crear tabla de auditoría si no existe
export function initAuditTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuarioId TEXT NOT NULL,
      usuarioNombre TEXT,
      accion TEXT NOT NULL,
      modulo TEXT NOT NULL,
      entidadId TEXT,
      entidadDescripcion TEXT,
      cambios TEXT,
      ip TEXT,
      userAgent TEXT,
      fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (usuarioId) REFERENCES users(id)
    )
  `);
}

/**
 * Registrar acción en el log de auditoría
 * @param {Object} params - Parámetros del log
 * @param {string} params.usuarioId - ID del usuario que realiza la acción
 * @param {string} params.accion - Tipo de acción (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc)
 * @param {string} params.modulo - Módulo afectado (usuarios, productos, inventario, pedidos, roles, etc)
 * @param {string} params.entidadId - ID de la entidad afectada
 * @param {string} params.entidadDescripcion - Descripción legible de la entidad
 * @param {Object} params.cambios - Objeto con los cambios realizados (antes/después)
 * @param {string} params.ip - IP del cliente
 * @param {string} params.userAgent - User agent del navegador
 */
export function logAudit({
  usuarioId,
  accion,
  modulo,
  entidadId = null,
  entidadDescripcion = null,
  cambios = null,
  ip = null,
  userAgent = null
}) {
  try {
    // Obtener nombre del usuario
    const usuario = db.prepare('SELECT nombres FROM users WHERE id = ?').get(usuarioId);
    const usuarioNombre = usuario ? usuario.nombres : 'Usuario desconocido';

    // Convertir cambios a JSON si es un objeto
    const cambiosJson = cambios ? JSON.stringify(cambios) : null;

    db.prepare(`
      INSERT INTO audit_log 
      (usuarioId, usuarioNombre, accion, modulo, entidadId, entidadDescripcion, cambios, ip, userAgent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      usuarioId,
      usuarioNombre,
      accion,
      modulo,
      entidadId,
      entidadDescripcion,
      cambiosJson,
      ip,
      userAgent
    );
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
  }
}

/**
 * Obtener logs de auditoría con filtros
 * @param {Object} filters - Filtros opcionales
 * @param {string} filters.usuarioId - Filtrar por usuario
 * @param {string} filters.modulo - Filtrar por módulo
 * @param {string} filters.accion - Filtrar por acción
 * @param {string} filters.fechaDesde - Fecha desde (YYYY-MM-DD)
 * @param {string} filters.fechaHasta - Fecha hasta (YYYY-MM-DD)
 * @param {number} filters.limit - Límite de resultados (default: 100)
 * @param {number} filters.offset - Offset para paginación
 * @returns {Array} Array de logs
 */
export function getAuditLogs(filters = {}) {
  const {
    usuarioId,
    modulo,
    accion,
    fechaDesde,
    fechaHasta,
    limit = 100,
    offset = 0
  } = filters;

  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];

  if (usuarioId) {
    query += ' AND usuarioId = ?';
    params.push(usuarioId);
  }

  if (modulo) {
    query += ' AND modulo = ?';
    params.push(modulo);
  }

  if (accion) {
    query += ' AND accion = ?';
    params.push(accion);
  }

  if (fechaDesde) {
    query += ' AND fecha >= ?';
    params.push(fechaDesde);
  }

  if (fechaHasta) {
    query += ' AND fecha <= ?';
    params.push(fechaHasta + ' 23:59:59');
  }

  query += ' ORDER BY fecha DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const logs = db.prepare(query).all(...params);

  // Parsear JSON de cambios
  return logs.map(log => ({
    ...log,
    cambios: log.cambios ? JSON.parse(log.cambios) : null
  }));
}

/**
 * Obtener estadísticas de auditoría
 * @returns {Object} Estadísticas generales
 */
export function getAuditStats() {
  const totalLogs = db.prepare('SELECT COUNT(*) as count FROM audit_log').get().count;
  
  const topUsuarios = db.prepare(`
    SELECT usuarioNombre, COUNT(*) as acciones
    FROM audit_log
    GROUP BY usuarioId
    ORDER BY acciones DESC
    LIMIT 5
  `).all();

  const topModulos = db.prepare(`
    SELECT modulo, COUNT(*) as acciones
    FROM audit_log
    GROUP BY modulo
    ORDER BY acciones DESC
    LIMIT 5
  `).all();

  const accionesPorTipo = db.prepare(`
    SELECT accion, COUNT(*) as cantidad
    FROM audit_log
    GROUP BY accion
    ORDER BY cantidad DESC
  `).all();

  const ultimasAcciones = db.prepare(`
    SELECT * FROM audit_log
    ORDER BY fecha DESC
    LIMIT 10
  `).all().map(log => ({
    ...log,
    cambios: log.cambios ? JSON.parse(log.cambios) : null
  }));

  return {
    totalLogs,
    topUsuarios,
    topModulos,
    accionesPorTipo,
    ultimasAcciones
  };
}

/**
 * Middleware para capturar IP y User Agent
 */
export function auditMiddleware(req, res, next) {
  req.auditInfo = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || 'Unknown'
  };
  next();
}
