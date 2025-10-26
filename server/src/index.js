import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import db from './db.js';
import { validarStockDisponible, getStockDisponible, getProductosBajoStock, getStockGeneralDetallado, getProductosProximosVencer, getProductosVencidos } from './utils/stockValidator.js';
import { initAuditTable, logAudit, getAuditLogs, getAuditStats, auditMiddleware } from './utils/auditLogger.js';
import { getDashboardMetrics, getDashboardCharts, getRecentActivity } from './utils/dashboardMetrics.js';
import { 
  getInventarioGeneralReport, 
  getIngresosReport, 
  getPedidosReport, 
  getStockPorUsuarioReport, 
  getMovimientosReport,
  getResumenEjecutivo 
} from './utils/reportGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(auditMiddleware); // Capturar IP y User Agent

// Log global de todas las peticiones
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path}`);
  next();
});

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));

// Inicializar tabla de auditoría
initAuditTable();

const JWT_SECRET = 'dev-secret';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  
  if (!token) {
    console.log('❌ authMiddleware: No token en', req.path);
    return res.status(401).json({ success: false, message: 'No token' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    console.log('✅ authMiddleware OK para', req.path, '- Usuario:', payload.email);
    next();
  } catch (e) {
    console.error('❌ Token verification error:', e.message);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.roleId !== 'role-admin') {
    console.log('❌ requireAdmin FALLÓ en', req.path, '- RoleId:', req.user?.roleId);
    return res.status(403).json({ success: false, message: 'Prohibido - Se requiere rol de administrador' });
  }
  console.log('✅ requireAdmin OK para', req.path);
  next();
}

// Middleware para verificar permisos específicos
function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
      console.log('❌ requirePermission: Usuario no autenticado en', req.path);
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    // Obtener usuario con su rol
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      console.log('❌ requirePermission: Usuario no encontrado en', req.path);
      return res.status(403).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Obtener permisos del rol
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(user.roleId);
    const rolePermissions = role ? JSON.parse(role.permissions || '[]') : [];
    
    // Obtener permisos individuales del usuario
    const userPermissions = user.permissions ? JSON.parse(user.permissions) : [];
    
    // Combinar permisos (rol + individuales)
    const allPermissions = [...new Set([...rolePermissions, ...userPermissions])];
    
    // Verificar si tiene alguno de los permisos requeridos
    const hasPermission = requiredPermissions.some(perm => allPermissions.includes(perm));
    
    if (!hasPermission) {
      console.log('❌ requirePermission FALLÓ en', req.path);
      console.log('   Requerido:', requiredPermissions);
      console.log('   Usuario tiene:', allPermissions);
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos suficientes para realizar esta acción' 
      });
    }
    
    console.log('✅ requirePermission OK para', req.path, '- Permisos:', requiredPermissions);
    next();
  };
}

// Helper function to check if user has admin-like permissions
function hasAdminPermissions(user) {
  if (!user) return false;
  
  // Admin role always has admin permissions
  if (user.roleId === 'role-admin') return true;
  
  // Get user's role permissions
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(user.roleId);
  if (!role) return false;
  
  const rolePermissions = JSON.parse(role.permissions || '[]');
  const userPermissions = JSON.parse(user.permissions || '[]');
  const allPermissions = [...new Set([...rolePermissions, ...userPermissions])];
  
  // Check if user has key admin permissions
  const adminPermissions = ['pedidos.approve', 'pedidos.reject', 'inventory.assign'];
  return adminPermissions.some(p => allPermissions.includes(p));
}

// Auth
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    // Log intento fallido
    logAudit({
      usuarioId: 'system',
      accion: 'LOGIN_FAILED',
      modulo: 'auth',
      entidadDescripcion: `Intento fallido para email: ${email}`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }
  
  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) {
    logAudit({
      usuarioId: user.id,
      accion: 'LOGIN_FAILED',
      modulo: 'auth',
      entidadDescripcion: `Contraseña incorrecta para: ${email}`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }
  
  // Get all roles to send with login response
  const roles = db.prepare('SELECT * FROM roles WHERE active = 1').all().map(role => ({
    ...role,
    permissions: JSON.parse(role.permissions)
  }));
  
  const token = jwt.sign({ id: user.id, email: user.email, roleId: user.roleId }, JWT_SECRET, { expiresIn: '8h' });
  const { passwordHash, ...safeUser } = user;
  const userWithPerms = {
    ...safeUser,
    permissions: user.permissions ? JSON.parse(user.permissions) : []
  };
  
  // Log login exitoso
  logAudit({
    usuarioId: user.id,
    accion: 'LOGIN',
    modulo: 'auth',
    entidadDescripcion: `Login exitoso: ${email}`,
    ip: req.auditInfo?.ip,
    userAgent: req.auditInfo?.userAgent
  });
  
  res.json({ success: true, data: { token, user: userWithPerms, roles } });
});

// Users CRUD (admin only; simple check by roleId)
app.get('/api/users', authMiddleware, requireAdmin, (req, res) => {
  const list = db.prepare('SELECT id, nombres, email, roleId FROM users').all();
  res.json({ success: true, data: list });
});
app.post('/api/users', authMiddleware, requireAdmin, (req, res) => {
  const { nombres, email, roleId, password } = req.body;
  const id = `u${Date.now()}`;
  const hash = bcrypt.hashSync(password ?? '123456', 10);
  try {
    db.prepare('INSERT INTO users (id, nombres, email, roleId, passwordHash) VALUES (?,?,?,?,?)').run(id, nombres, email, roleId, hash);
    
    // Log creación de usuario
    logAudit({
      usuarioId: req.user.id,
      accion: 'CREATE',
      modulo: 'usuarios',
      entidadId: id,
      entidadDescripcion: `Usuario creado: ${nombres} (${email})`,
      cambios: { nombres, email, roleId },
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data: { id, nombres, email, roleId } });
  } catch (e) {
    res.status(400).json({ success: false, message: 'No se pudo crear usuario' });
  }
});
app.put('/api/users/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nombres, email, roleId, password } = req.body;
  
  // Obtener valores anteriores
  const userAntes = db.prepare('SELECT nombres, email, roleId FROM users WHERE id = ?').get(id);
  
  const sets = [];
  const vals = [];
  const cambios = { antes: userAntes, despues: {} };
  
  if (nombres) { sets.push('nombres = ?'); vals.push(nombres); cambios.despues.nombres = nombres; }
  if (email) { sets.push('email = ?'); vals.push(email); cambios.despues.email = email; }
  if (roleId) { sets.push('roleId = ?'); vals.push(roleId); cambios.despues.roleId = roleId; }
  if (password) { sets.push('passwordHash = ?'); vals.push(bcrypt.hashSync(password, 10)); cambios.despues.password = '***'; }
  
  if (!sets.length) return res.json({ success: true, data: null });
  
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  const u = db.prepare('SELECT id, nombres, email, roleId FROM users WHERE id = ?').get(id);
  
  // Log actualización de usuario
  logAudit({
    usuarioId: req.user.id,
    accion: 'UPDATE',
    modulo: 'usuarios',
    entidadId: id,
    entidadDescripcion: `Usuario actualizado: ${u.nombres} (${u.email})`,
    cambios,
    ip: req.auditInfo?.ip,
    userAgent: req.auditInfo?.userAgent
  });
  
  res.json({ success: true, data: u });
});
app.delete('/api/users/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  // Obtener datos antes de eliminar
  const user = db.prepare('SELECT nombres, email FROM users WHERE id = ?').get(id);
  
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  
  // Log eliminación de usuario
  if (user) {
    logAudit({
      usuarioId: req.user.id,
      accion: 'DELETE',
      modulo: 'usuarios',
      entidadId: id,
      entidadDescripcion: `Usuario eliminado: ${user.nombres} (${user.email})`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
  }
  
  res.json({ success: true, data: true });
});

// Roles and Permissions Management (admin only)
app.get('/api/roles', authMiddleware, requireAdmin, (req, res) => {
  const roles = db.prepare('SELECT * FROM roles WHERE active = 1').all().map(role => ({
    ...role,
    permissions: JSON.parse(role.permissions),
    predefined: !!role.predefined
  }));
  res.json({ success: true, data: roles });
});

app.post('/api/roles', authMiddleware, requireAdmin, (req, res) => {
  const { name, permissions } = req.body;
  if (!name || !Array.isArray(permissions)) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }
  
  const id = `role-${Date.now()}`;
  const permissionsJson = JSON.stringify(permissions);
  
  try {
    db.prepare('INSERT INTO roles (id, name, permissions, predefined, active) VALUES (?,?,?,?,?)').run(id, name, permissionsJson, 0, 1);
    res.json({ success: true, data: { id, name, permissions, predefined: false, active: true } });
  } catch (e) {
    res.status(400).json({ success: false, message: 'No se pudo crear el rol' });
  }
});

app.put('/api/roles/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, permissions } = req.body;
  
  // Check if role is predefined
  const existingRole = db.prepare('SELECT predefined FROM roles WHERE id = ?').get(id);
  if (!existingRole) {
    return res.status(404).json({ success: false, message: 'Rol no encontrado' });
  }
  
  // Only allow updating permissions for predefined roles, not name
  if (existingRole.predefined && name) {
    return res.status(400).json({ success: false, message: 'No se puede cambiar el nombre de roles predefinidos' });
  }
  
  const sets = [];
  const vals = [];
  
  if (name && !existingRole.predefined) { 
    sets.push('name = ?'); 
    vals.push(name); 
  }
  if (permissions && Array.isArray(permissions)) { 
    sets.push('permissions = ?'); 
    vals.push(JSON.stringify(permissions)); 
  }
  
  if (!sets.length) return res.json({ success: true, data: null });
  
  db.prepare(`UPDATE roles SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  
  const updatedRole = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
  res.json({ 
    success: true, 
    data: {
      ...updatedRole,
      permissions: JSON.parse(updatedRole.permissions),
      predefined: !!updatedRole.predefined
    }
  });
});

app.delete('/api/roles/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  // Check if role is predefined
  const role = db.prepare('SELECT predefined FROM roles WHERE id = ?').get(id);
  if (!role) {
    return res.status(404).json({ success: false, message: 'Rol no encontrado' });
  }
  
  if (role.predefined) {
    return res.status(400).json({ success: false, message: 'No se pueden eliminar roles predefinidos' });
  }
  
  // Check if role is in use
  const usersWithRole = db.prepare('SELECT COUNT(*) as count FROM users WHERE roleId = ?').get(id);
  if (usersWithRole.count > 0) {
    return res.status(400).json({ success: false, message: 'No se puede eliminar un rol que está en uso' });
  }
  
  db.prepare('UPDATE roles SET active = 0 WHERE id = ?').run(id);
  res.json({ success: true, data: true });
});

// Update user permissions
app.put('/api/users/:id/permissions', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;
  
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ success: false, message: 'Permisos inválidos' });
  }
  
  const permissionsJson = JSON.stringify(permissions);
  db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(permissionsJson, id);
  
  const user = db.prepare('SELECT id, nombres, email, roleId, permissions FROM users WHERE id = ?').get(id);
  const userWithPerms = {
    ...user,
    permissions: JSON.parse(user.permissions || '[]')
  };
  
  res.json({ success: true, data: userWithPerms });
});

// Proveedores
app.get('/api/proveedores', authMiddleware, (req, res) => {
  const list = db.prepare('SELECT * FROM proveedores').all();
  res.json({ success: true, data: list });
});
app.post('/api/proveedores', authMiddleware, requireAdmin, (req, res) => {
  const { nombre, ruc, direccion, contacto, telefono } = req.body;
  const id = `p${Date.now()}`;
  db.prepare('INSERT INTO proveedores (id, nombre, ruc, direccion, contacto, telefono) VALUES (?,?,?,?,?,?)')
    .run(id, nombre, ruc ?? null, direccion, contacto, telefono ?? null);
  res.json({ success: true, data: { id, nombre, ruc, direccion, contacto, telefono } });
});
app.put('/api/proveedores/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre, ruc, direccion, contacto, telefono } = req.body;
  db.prepare('UPDATE proveedores SET nombre=?, ruc=?, direccion=?, contacto=?, telefono=? WHERE id=?')
    .run(nombre, ruc ?? null, direccion, contacto, telefono ?? null, id);
  const p = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(id);
  res.json({ success: true, data: p });
});
app.delete('/api/proveedores/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM proveedores WHERE id=?').run(id);
  res.json({ success: true, data: true });
});

// Productos CRUD
app.get('/api/productos', authMiddleware, (req, res) => {
  try {
    const list = db.prepare(`
      SELECT 
        p.*,
        a.nombre as area,
        u.nombre as ubicacion
      FROM productos p
      LEFT JOIN areas a ON p.areaId = a.id
      LEFT JOIN ubicaciones u ON p.ubicacionId = u.id
      ORDER BY p.nombre
    `).all();
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});
app.post('/api/productos', authMiddleware, requireAdmin, (req, res) => {
  const { 
    nombre, 
    unidad, 
    areaId, 
    ubicacionId, 
    activo = true, 
    marca,
    dias_alerta_stock,
    dias_vencimiento_critico,
    dias_vencimiento_urgente,
    dias_vencimiento_atencion
  } = req.body;
  
  const id = `pr${Date.now()}`;
  const alertaStock = dias_alerta_stock !== undefined ? parseInt(dias_alerta_stock) : 10;
  const vencCritico = dias_vencimiento_critico !== undefined ? parseInt(dias_vencimiento_critico) : 7;
  const vencUrgente = dias_vencimiento_urgente !== undefined ? parseInt(dias_vencimiento_urgente) : 15;
  const vencAtencion = dias_vencimiento_atencion !== undefined ? parseInt(dias_vencimiento_atencion) : 30;
  
  db.prepare(`
    INSERT INTO productos (
      id, nombre, unidad, areaId, ubicacionId, activo, marca,
      dias_alerta_stock, dias_vencimiento_critico, dias_vencimiento_urgente, dias_vencimiento_atencion
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, nombre, unidad, areaId, ubicacionId, activo ? 1 : 0, marca ?? null,
    alertaStock, vencCritico, vencUrgente, vencAtencion
  );
  
  res.json({ 
    success: true, 
    data: { 
      id, nombre, unidad, areaId, ubicacionId, activo: !!activo, marca: marca ?? null,
      dias_alerta_stock: alertaStock,
      dias_vencimiento_critico: vencCritico,
      dias_vencimiento_urgente: vencUrgente,
      dias_vencimiento_atencion: vencAtencion
    } 
  });
});
app.put('/api/productos/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { 
    nombre, 
    unidad, 
    areaId, 
    ubicacionId, 
    activo, 
    marca,
    dias_alerta_stock,
    dias_vencimiento_critico,
    dias_vencimiento_urgente,
    dias_vencimiento_atencion
  } = req.body;
  
  const sets = [];
  const vals = [];
  if (nombre != null) { sets.push('nombre = ?'); vals.push(nombre); }
  if (unidad != null) { sets.push('unidad = ?'); vals.push(unidad); }
  if (areaId != null) { sets.push('areaId = ?'); vals.push(areaId); }
  if (ubicacionId != null) { sets.push('ubicacionId = ?'); vals.push(ubicacionId); }
  if (activo != null) { sets.push('activo = ?'); vals.push(!!activo ? 1 : 0); }
  if (marca !== undefined) { sets.push('marca = ?'); vals.push(marca ?? null); }
  if (dias_alerta_stock !== undefined) { sets.push('dias_alerta_stock = ?'); vals.push(parseInt(dias_alerta_stock) || 10); }
  if (dias_vencimiento_critico !== undefined) { sets.push('dias_vencimiento_critico = ?'); vals.push(parseInt(dias_vencimiento_critico) || 7); }
  if (dias_vencimiento_urgente !== undefined) { sets.push('dias_vencimiento_urgente = ?'); vals.push(parseInt(dias_vencimiento_urgente) || 15); }
  if (dias_vencimiento_atencion !== undefined) { sets.push('dias_vencimiento_atencion = ?'); vals.push(parseInt(dias_vencimiento_atencion) || 30); }
  if (!sets.length) return res.json({ success: true, data: null });
  db.prepare(`UPDATE productos SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  const p = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
  res.json({ success: true, data: { ...p, activo: !!p.activo } });
});
app.delete('/api/productos/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM productos WHERE id = ?').run(id);
  res.json({ success: true, data: true });
});

// Ingresos
app.get('/api/ingresos', authMiddleware, (req, res) => {
  const list = db.prepare(`
    SELECT i.*, p.nombre as proveedor 
    FROM ingresos i 
    LEFT JOIN proveedores p ON i.proveedorId = p.id
  `).all();
  res.json({ success: true, data: list });
});
app.post('/api/ingresos', authMiddleware, requireAdmin, (req, res) => {
  const { productoId, proveedorId, nombre, fechaIngreso, cantidad, precio, fechaVencimiento = null, serieFactura = null, fechaFactura = null, marca = null } = req.body;
  if (!productoId || !proveedorId || !fechaIngreso || !cantidad || !precio) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }
  
  // Obtener información del producto para derivar nombre, área, ubicación y unidad
  const producto = db.prepare('SELECT nombre, areaId, ubicacionId, unidad FROM productos WHERE id = ?').get(productoId);
  if (!producto) {
    return res.status(400).json({ success: false, message: 'Producto no encontrado' });
  }
  
  const id = `i${Date.now()}`;
  const nombreFinal = nombre || producto.nombre;
  const areaId = producto.areaId;
  const ubicacionId = producto.ubicacionId;
  const unidad = producto.unidad;
  
  // Inicializar cantidad_disponible con el mismo valor que cantidad
  db.prepare('INSERT INTO ingresos (id, productoId, proveedorId, nombre, fechaIngreso, cantidad, cantidad_disponible, unidad, precio, areaId, ubicacionId, fechaVencimiento, serieFactura, fechaFactura, marca) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, productoId, proveedorId, nombreFinal, fechaIngreso, cantidad, cantidad, unidad, precio, areaId, ubicacionId, fechaVencimiento, serieFactura, fechaFactura, marca);
  res.json({ success: true, data: { id, productoId, proveedorId, nombre: nombreFinal, fechaIngreso, cantidad, cantidad_disponible: cantidad, unidad, precio, areaId, ubicacionId, fechaVencimiento, serieFactura, fechaFactura, marca } });
});

// Referencias
app.get('/api/referencias', authMiddleware, (req, res) => {
  const areas = db.prepare('SELECT * FROM areas').all();
  const ubicaciones = db.prepare('SELECT * FROM ubicaciones').all();
  res.json({ success: true, data: { areas, ubicaciones } });
});

// Pedidos
app.get('/api/pedidos/mios', authMiddleware, (req, res) => {
  const usuarioId = req.user.id;
  const pedidos = db.prepare(`
    SELECT p.*, pr.nombre as producto_nombre, pr.unidad as producto_unidad, pr.marca as producto_marca
    FROM pedidos p
    JOIN productos pr ON p.productoId = pr.id
    WHERE p.usuarioId = ?
    ORDER BY p.fechaSolicitud DESC
  `).all(usuarioId);
  
  const pedidosFormatted = pedidos.map(p => ({
    id: p.id,
    usuarioId: p.usuarioId,
    productoId: p.productoId,
    cantidad: p.cantidad,
    estado: p.estado,
    fechaSolicitud: p.fechaSolicitud,
    fechaRespuesta: p.fechaRespuesta,
    observaciones: p.observaciones,
    loteId: p.loteId, // Agregar loteId para agrupar pedidos
    producto: {
      id: p.productoId,
      nombre: p.producto_nombre,
      unidadMedida: p.producto_unidad,
      marca: p.producto_marca,
      categoria: 'General'
    }
  }));
  
  res.json({ success: true, data: pedidosFormatted });
});

// Nota: Ruta unificada de creación de pedidos se encuentra más abajo

app.get('/api/pedidos/admin', authMiddleware, (req, res) => {
  try {
    const pedidos = db.prepare(`
      SELECT p.*, pr.nombre as producto_nombre, pr.unidad as producto_unidad, pr.marca as producto_marca,
             u.nombres as usuario_nombres,
             p.fechaSolicitud as fecha_pedido
      FROM pedidos p
      JOIN productos pr ON p.productoId = pr.id
      JOIN users u ON p.usuarioId = u.id
      ORDER BY p.fechaSolicitud DESC
    `).all();
    
    const pedidosFormatted = pedidos.map(p => ({
      id: p.id,
      usuarioId: p.usuarioId,
      usuarioNombre: p.usuario_nombres,
      productoId: p.productoId,
      productoNombre: p.producto_nombre,
      cantidad: p.cantidad,
      unidad: p.producto_unidad,
      estado: p.estado,
      fecha: p.fecha_pedido,
      fechaSolicitud: p.fecha_pedido,
      fechaRespuesta: p.fechaRespuesta,
      observaciones: p.observaciones,
      loteId: p.loteId,
      marca: p.marca || p.producto_marca
    }));
    
    res.json({ success: true, data: pedidosFormatted });
  } catch (error) {
    console.error('❌ Error en /api/pedidos/admin:', error);
    res.status(500).json({ success: false, message: 'Error al obtener pedidos', error: error.message });
  }
});

app.put('/api/pedidos/:id/estado', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { estado, observaciones } = req.body;
  
  if (!['aprobado', 'rechazado', 'entregado'].includes(estado)) {
    return res.status(400).json({ success: false, message: 'Estado inválido' });
  }
  
  const fechaRespuesta = new Date().toISOString();
  
  try {
    db.prepare('UPDATE pedidos SET estado = ?, fechaRespuesta = ?, observaciones = ? WHERE id = ?')
      .run(estado, fechaRespuesta, observaciones || '', id);
    
    res.json({ success: true, data: { id, estado, fechaRespuesta } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar pedido' });
  }
});

// CRUD de Áreas
app.get('/api/areas', authMiddleware, requireAdmin, (req, res) => {
  const areas = db.prepare('SELECT * FROM areas').all();
  res.json({ success: true, data: areas });
});

app.post('/api/areas', authMiddleware, requireAdmin, (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ success: false, message: 'Nombre es requerido' });
  
  const id = `a${Date.now()}`;
  db.prepare('INSERT INTO areas (id, nombre) VALUES (?, ?)').run(id, nombre);
  const newArea = { id, nombre };
  res.json({ success: true, data: newArea });
});

app.put('/api/areas/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ success: false, message: 'Nombre es requerido' });
  
  db.prepare('UPDATE areas SET nombre = ? WHERE id = ?').run(nombre, id);
  const updatedArea = { id, nombre };
  res.json({ success: true, data: updatedArea });
});

app.delete('/api/areas/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  // Verificar si el área está en uso
  const ingresoCount = db.prepare('SELECT COUNT(*) as count FROM ingresos WHERE areaId = ?').get(id);
  const stockCount = db.prepare('SELECT COUNT(*) as count FROM user_stock WHERE areaId = ?').get(id);
  
  if (ingresoCount.count > 0 || stockCount.count > 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'No se puede eliminar el área porque está en uso' 
    });
  }
  
  db.prepare('DELETE FROM areas WHERE id = ?').run(id);
  res.json({ success: true, data: { id } });
});

// Ubicaciones endpoints
app.get('/api/ubicaciones', authMiddleware, requireAdmin, (req, res) => {
  const ubicaciones = db.prepare('SELECT * FROM ubicaciones').all();
  res.json({ success: true, data: ubicaciones });
});

app.post('/api/ubicaciones', authMiddleware, requireAdmin, (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ success: false, message: 'Nombre es requerido' });
  
  const id = `u${Date.now()}`;
  db.prepare('INSERT INTO ubicaciones (id, nombre) VALUES (?, ?)').run(id, nombre);
  const newUbicacion = { id, nombre };
  res.json({ success: true, data: newUbicacion });
});

app.put('/api/ubicaciones/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ success: false, message: 'Nombre es requerido' });
  
  db.prepare('UPDATE ubicaciones SET nombre = ? WHERE id = ?').run(nombre, id);
  const updatedUbicacion = { id, nombre };
  res.json({ success: true, data: updatedUbicacion });
});

app.delete('/api/ubicaciones/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  // Check if ubicacion is being used in productos
  const productosUsing = db.prepare('SELECT COUNT(*) as count FROM productos WHERE ubicacionId = ?').get(id);
  if (productosUsing.count > 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'No se puede eliminar la ubicación porque está siendo utilizada por productos' 
    });
  }
  
  db.prepare('DELETE FROM ubicaciones WHERE id = ?').run(id);
  res.json({ success: true, data: true });
});

// Unidades de medida endpoints
app.get('/api/unidades-medida', authMiddleware, requireAdmin, (req, res) => {
  const unidades = db.prepare('SELECT * FROM unidades_medida ORDER BY nombre').all();
  res.json({ success: true, data: unidades });
});

app.post('/api/unidades-medida', authMiddleware, requireAdmin, (req, res) => {
  const { nombre, simbolo } = req.body;
  if (!nombre || !simbolo) return res.status(400).json({ success: false, message: 'Nombre y símbolo son requeridos' });
  
  // Verificar que el símbolo no exista
  const existingSimbolo = db.prepare('SELECT id FROM unidades_medida WHERE simbolo = ?').get(simbolo);
  if (existingSimbolo) {
    return res.status(400).json({ success: false, message: 'El símbolo ya existe' });
  }
  
  const id = `um${Date.now()}`;
  db.prepare('INSERT INTO unidades_medida (id, nombre, simbolo, activo) VALUES (?, ?, ?, ?)').run(id, nombre, simbolo, 1);
  const newUnidad = { id, nombre, simbolo, activo: 1 };
  res.json({ success: true, data: newUnidad });
});

app.put('/api/unidades-medida/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre, simbolo, activo } = req.body;
  if (!nombre || !simbolo) return res.status(400).json({ success: false, message: 'Nombre y símbolo son requeridos' });
  
  // Verificar que el símbolo no exista en otra unidad
  const existingSimbolo = db.prepare('SELECT id FROM unidades_medida WHERE simbolo = ? AND id != ?').get(simbolo, id);
  if (existingSimbolo) {
    return res.status(400).json({ success: false, message: 'El símbolo ya existe' });
  }
  
  db.prepare('UPDATE unidades_medida SET nombre = ?, simbolo = ?, activo = ? WHERE id = ?').run(nombre, simbolo, activo || 1, id);
  const updatedUnidad = { id, nombre, simbolo, activo: activo || 1 };
  res.json({ success: true, data: updatedUnidad });
});

app.delete('/api/unidades-medida/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  // Check if unidad is being used in productos
  const productosUsing = db.prepare('SELECT COUNT(*) as count FROM productos WHERE unidad = (SELECT simbolo FROM unidades_medida WHERE id = ?)').get(id);
  if (productosUsing.count > 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'No se puede eliminar la unidad porque está siendo utilizada por productos' 
    });
  }
  
  db.prepare('DELETE FROM unidades_medida WHERE id = ?').run(id);
  res.json({ success: true, data: true });
});

// Stock: general y del usuario
app.get('/api/stock/mio', authMiddleware, (req, res) => {
  const list = db.prepare(
    `SELECT us.productoId, us.unidad,
            COALESCE(SUM(us.cantidad),0) - COALESCE((
              SELECT SUM(sal.cantidad) FROM user_salidas sal WHERE sal.usuarioId = us.usuarioId AND sal.productoId = us.productoId AND sal.unidad = us.unidad
            ),0) AS cantidad
       FROM user_stock us
      WHERE us.usuarioId = ?
   GROUP BY us.productoId, us.unidad`
  ).all(req.user.id);
  res.json({ success: true, data: list });
});

// Salidas de usuario: registro y listado propio
// RUTA COMENTADA - Conflicto con nueva funcionalidad de salidas por daño/pérdida
// Esta ruta era para salidas de workers (user_salidas)
// Si se necesita en el futuro, cambiar las rutas a /api/user-salidas
/*
app.get('/api/salidas', authMiddleware, (req, res) => {
  const list = db.prepare('SELECT * FROM user_salidas WHERE usuarioId = ? ORDER BY fecha DESC').all(req.user.id);
  res.json({ success: true, data: list });
});
/*
app.post('/api/salidas', authMiddleware, (req, res) => {
  const { productoId, cantidad, unidad, observacion } = req.body;
  if (!productoId || !cantidad || !unidad) return res.status(400).json({ success: false, message: 'Datos incompletos' });
  // validar stock disponible del usuario
  const row = db.prepare(
    `SELECT COALESCE(SUM(us.cantidad),0) - COALESCE((SELECT SUM(sal.cantidad) FROM user_salidas sal WHERE sal.usuarioId = us.usuarioId AND sal.productoId = us.productoId AND sal.unidad = us.unidad),0) AS disponible
       FROM user_stock us
      WHERE us.usuarioId = ? AND us.productoId = ? AND us.unidad = ?`
  ).get(req.user.id, productoId, unidad);
  const disponible = row?.disponible || 0;
  if (cantidad > disponible) return res.status(400).json({ success: false, message: 'Stock insuficiente' });
  const id = `out${Date.now()}`;
  const fecha = new Date().toISOString();
  db.prepare('INSERT INTO user_salidas (id, usuarioId, productoId, cantidad, unidad, fecha, observacion) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user.id, productoId, cantidad, unidad, fecha, observacion ?? null);
  res.json({ success: true, data: { id, usuarioId: req.user.id, productoId, cantidad, unidad, fecha, observacion: observacion ?? null } });
});
*/
app.get('/api/stock/general', authMiddleware, requireAdmin, (req, res) => {
  const productos = db.prepare('SELECT * FROM productos').all();
  const rows = db.prepare(`
    SELECT i.productoId, i.marca, i.unidad,
           COALESCE(SUM(i.cantidad_disponible), 0) AS disponible
      FROM ingresos i
  GROUP BY i.productoId, i.marca, i.unidad
  `).all();
  const data = rows.map((r) => {
    const p = productos.find((x) => x.id === r.productoId) || {};
    return { 
      ...p, 
      productoId: r.productoId, 
      nombre: p.nombre, 
      unidad: r.unidad, 
      marca: r.marca || null, 
      cantidadDisponible: r.disponible,
      areaId: p.areaId || null,
      ubicacionId: p.ubicacionId || null
    };
  });
  res.json({ success: true, data });
});

// Asignaciones directas (admin): descuenta del general (derivado) y agrega a inventario del usuario
app.post('/api/asignaciones', authMiddleware, requireAdmin, (req, res) => {
  const { usuarioId, productoId, cantidad, unidad, marca = null, areaId = 'a1', ubicacionId = 'u1' } = req.body;
  if (!usuarioId || !productoId || !cantidad || !unidad) return res.status(400).json({ success: false, message: 'Datos incompletos' });
  
  // Calcular stock disponible usando cantidad_disponible
  const totDisponible = db.prepare(`
    SELECT COALESCE(SUM(cantidad_disponible), 0) as s 
    FROM ingresos 
    WHERE productoId = ? 
    AND (marca IS ? OR marca = ?)
    AND cantidad_disponible > 0
  `).get(productoId, marca, marca).s;
  
  if (cantidad > totDisponible) {
    return res.status(400).json({ success: false, message: `Stock insuficiente. Disponible: ${totDisponible}` });
  }
  
  // Descontar de ingresos usando FEFO (First Expired, First Out)
  // Validar que no esté vencido ni bloqueado
  let cantidadRestante = cantidad;
  const ingresosDisponibles = db.prepare(`
    SELECT id, cantidad_disponible, fechaVencimiento, bloqueado, motivo_bloqueo
    FROM ingresos 
    WHERE productoId = ? 
    AND (marca IS ? OR marca = ?)
    AND cantidad_disponible > 0
    AND bloqueado = 0
    ORDER BY 
      CASE WHEN fechaVencimiento IS NULL THEN 1 ELSE 0 END,
      fechaVencimiento ASC
  `).all(productoId, marca, marca);
  
  const hoy = new Date();
  
  for (const ingreso of ingresosDisponibles) {
    if (cantidadRestante <= 0) break;
    
    // Validar que no esté vencido
    if (ingreso.fechaVencimiento) {
      const fechaVenc = new Date(ingreso.fechaVencimiento);
      if (fechaVenc < hoy) {
        console.warn(`⚠️  Saltando ingreso ${ingreso.id} - Producto vencido`);
        continue; // Saltar este ingreso
      }
    }
    
    const aDescontar = Math.min(cantidadRestante, ingreso.cantidad_disponible);
    
    // Descontar de cantidad_disponible
    db.prepare('UPDATE ingresos SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?')
      .run(aDescontar, ingreso.id);
    
    cantidadRestante -= aDescontar;
  }
  
  // Validar que se haya podido asignar todo
  if (cantidadRestante > 0) {
    return res.status(400).json({ 
      success: false, 
      message: `No se pudo asignar toda la cantidad. Faltaron ${cantidadRestante} unidades (posiblemente por productos vencidos o bloqueados)` 
    });
  }
  
  // Agregar a user_stock
  const id = `s${Date.now()}`;
  db.prepare('INSERT INTO user_stock (id, usuarioId, productoId, cantidad, unidad, areaId, ubicacionId, marca) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, usuarioId, productoId, cantidad, unidad, areaId, ubicacionId, marca);
  
  res.json({ success: true, data: { id, usuarioId, productoId, cantidad, unidad, areaId, ubicacionId, marca } });
});

// Pedidos
app.get('/api/pedidos', authMiddleware, (req, res) => {
  // Users with admin permissions see all, others see only their own
  const isAdmin = hasAdminPermissions(req.user);
  const list = isAdmin
    ? db.prepare('SELECT * FROM pedidos').all()
    : db.prepare('SELECT * FROM pedidos WHERE usuarioId = ?').all(req.user.id);
  res.json({ success: true, data: list });
});

// Endpoint para pedidos agrupados por lote
app.get('/api/pedidos/agrupados', authMiddleware, (req, res) => {
  const isAdmin = hasAdminPermissions(req.user);
  const allPedidos = isAdmin
    ? db.prepare('SELECT * FROM pedidos ORDER BY fechaSolicitud DESC').all()
    : db.prepare('SELECT * FROM pedidos WHERE usuarioId = ? ORDER BY fechaSolicitud DESC').all(req.user.id);
  
  // Agrupar por loteId
  const grupos = {};
  allPedidos.forEach(pedido => {
    const loteId = pedido.loteId || pedido.id; // fallback para pedidos viejos sin loteId
    if (!grupos[loteId]) {
      grupos[loteId] = {
        loteId,
        usuarioId: pedido.usuarioId,
        fecha: pedido.fechaSolicitud,
        estado: pedido.estado, // tomamos el estado del primer pedido del grupo
        items: []
      };
    }
    grupos[loteId].items.push({
      id: pedido.id,
      productoId: pedido.productoId,
      cantidad: pedido.cantidad,
      unidad: pedido.unidad
    });
  });
  
  const resultado = Object.values(grupos);
  res.json({ success: true, data: resultado });
});
app.post('/api/pedidos', authMiddleware, (req, res) => {
  try {
    let { productoId, cantidad, unidad, marca = null, observaciones } = req.body || {};
    cantidad = Number(cantidad);

    // Completar datos faltantes desde el producto
    if (!unidad || !marca) {
      const prod = db.prepare('SELECT * FROM productos WHERE id = ?').get(productoId);
      if (prod) {
        unidad = unidad || prod.unidad || 'UNIDAD';
        marca = marca || prod.marca || null;
      }
    }

    if (!productoId || !cantidad || Number.isNaN(cantidad) || cantidad <= 0 || !unidad) {
      return res.status(400).json({ success: false, message: 'Datos inválidos para crear el pedido' });
    }

    const id = `req${Date.now()}`;
    const fechaSolicitud = new Date().toISOString();
    const loteId = `lote${Date.now()}`;

  db.prepare('INSERT INTO pedidos (id, usuarioId, productoId, cantidad, unidad, estado, fechaSolicitud, loteId, marca) VALUES (?,?,?,?,?,?,?,?,?)')
  .run(id, req.user.id, productoId, cantidad, unidad, 'pendiente', fechaSolicitud, loteId, marca);

  const result = { id, usuarioId: req.user.id, productoId, cantidad, unidad, estado: 'pendiente', fechaSolicitud, loteId, marca, observaciones };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error al crear pedido:', error);
    res.status(500).json({ success: false, message: 'Error al crear pedido', error: error.message });
  }
});
// Crear múltiples pedidos en una sola solicitud
app.post('/api/pedidos/batch', authMiddleware, (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay items que procesar' });
    }
    const stmt = db.prepare('INSERT INTO pedidos (id, usuarioId, productoId, cantidad, unidad, estado, fechaSolicitud, loteId, marca) VALUES (?,?,?,?,?,?,?,?,?)');
    const fechaSolicitud = new Date().toISOString();
    const loteId = `lote${Date.now()}`;
    const created = [];
    for (const it of items) {
      let { productoId, cantidad, unidad, marca = null } = it || {};
      cantidad = Number(cantidad);
      
      if (!productoId || !cantidad || Number.isNaN(cantidad) || cantidad <= 0) {
        continue;
      }
      
      // Completar unidad y marca desde productos si faltan
      if (!unidad || !marca) {
        const prod = db.prepare('SELECT * FROM productos WHERE id = ?').get(productoId);
        if (prod) {
          unidad = unidad || prod.unidad || 'UNIDAD';
          marca = marca || prod.marca || null;
        }
      }
      
      if (!unidad) {
        continue;
      }
      
      const id = `req${Date.now()}${Math.floor(Math.random()*1000)}`;
      stmt.run(id, req.user.id, productoId, cantidad, unidad, 'pendiente', fechaSolicitud, loteId, marca);
      created.push({ id, usuarioId: req.user.id, productoId, cantidad, unidad, estado: 'pendiente', fechaSolicitud, loteId, marca });
    }
    if (!created.length) {
      return res.status(400).json({ success: false, message: 'Items inválidos' });
    }
    res.json({ success: true, data: created, loteId });
  } catch (error) {
    console.error('❌ Error en batch:', error);
    res.status(500).json({ success: false, message: 'Error al crear pedidos', error: error.message });
  }
});
app.put('/api/pedidos/:id/estado', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params; const { estado } = req.body;
  db.prepare('UPDATE pedidos SET estado=? WHERE id=?').run(estado, id);
  const p = db.prepare('SELECT * FROM pedidos WHERE id=?').get(id);
  res.json({ success: true, data: p });
});

// Cambiar estado de un lote completo
app.put('/api/pedidos/lote/:loteId/estado', authMiddleware, requireAdmin, (req, res) => {
  const { loteId } = req.params; 
  const { estado } = req.body;
  db.prepare('UPDATE pedidos SET estado=? WHERE loteId=?').run(estado, loteId);
  const pedidos = db.prepare('SELECT * FROM pedidos WHERE loteId=?').all(loteId);
  res.json({ success: true, data: pedidos });
});

// Entregar un lote completo
app.post('/api/pedidos/lote/:loteId/entregar', authMiddleware, requireAdmin, (req, res) => {
  const { loteId } = req.params;
  const pedidos = db.prepare('SELECT * FROM pedidos WHERE loteId=?').all(loteId);
  
  if (!pedidos.length) {
    return res.status(404).json({ success: false, message: 'Lote no encontrado' });
  }

  // Validar stock disponible para todos los pedidos del lote usando cantidad_disponible
  for (const pedido of pedidos) {
    const marca = pedido.marca || null;
    const disponible = db.prepare(`
      SELECT COALESCE(SUM(cantidad_disponible), 0) as s 
      FROM ingresos 
      WHERE productoId = ? 
      AND (marca IS ? OR marca = ?)
      AND cantidad_disponible > 0
    `).get(pedido.productoId, marca, marca).s;
    
    if (pedido.cantidad > disponible) {
      return res.status(400).json({ 
        success: false, 
        message: `Stock insuficiente para ${pedido.productoId}. Disponible: ${disponible}, Requerido: ${pedido.cantidad}` 
      });
    }
  }

  // Si todos tienen stock disponible, proceder con la entrega
  for (const pedido of pedidos) {
    const marca = pedido.marca || null;
    
    // Descontar de ingresos usando FEFO
    let cantidadRestante = pedido.cantidad;
    const ingresosDisponibles = db.prepare(`
      SELECT id, cantidad_disponible, fechaVencimiento
      FROM ingresos 
      WHERE productoId = ? 
      AND (marca IS ? OR marca = ?)
      AND cantidad_disponible > 0
      ORDER BY 
        CASE WHEN fechaVencimiento IS NULL THEN 1 ELSE 0 END,
        fechaVencimiento ASC
    `).all(pedido.productoId, marca, marca);
    
    for (const ingreso of ingresosDisponibles) {
      if (cantidadRestante <= 0) break;
      
      const aDescontar = Math.min(cantidadRestante, ingreso.cantidad_disponible);
      
      db.prepare('UPDATE ingresos SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?')
        .run(aDescontar, ingreso.id);
      
      cantidadRestante -= aDescontar;
    }
    
    // Agregar a user_stock
    const sid = `s${Date.now()}${Math.floor(Math.random()*1000)}`;
    db.prepare('INSERT INTO user_stock (id, usuarioId, productoId, cantidad, unidad, areaId, ubicacionId, marca) VALUES (?,?,?,?,?,?,?,?)')
      .run(sid, pedido.usuarioId, pedido.productoId, pedido.cantidad, pedido.unidad, 'a1', 'u1', marca);
    
    // Log asignación individual
    const producto = db.prepare('SELECT nombre FROM productos WHERE id = ?').get(pedido.productoId);
    const usuario = db.prepare('SELECT nombres FROM users WHERE id = ?').get(pedido.usuarioId);
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'ASIGNACION',
      modulo: 'inventario',
      entidadId: sid,
      entidadDescripcion: `Asignado ${pedido.cantidad} ${pedido.unidad} de ${producto?.nombre || pedido.productoId} a ${usuario?.nombres || pedido.usuarioId}`,
      cambios: { pedidoId: pedido.id, productoId: pedido.productoId, cantidad: pedido.cantidad, marca, usuarioId: pedido.usuarioId },
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
  }

  // Actualizar estado del lote completo
  db.prepare('UPDATE pedidos SET estado=? WHERE loteId=?').run('entregado', loteId);
  
  // Log entrega de lote
  logAudit({
    usuarioId: req.user.id,
    accion: 'LOTE_ENTREGADO',
    modulo: 'pedidos',
    entidadId: loteId,
    entidadDescripcion: `Lote ${loteId} entregado con ${pedidos.length} pedidos`,
    cambios: { totalPedidos: pedidos.length },
    ip: req.auditInfo?.ip,
    userAgent: req.auditInfo?.userAgent
  });
  
  res.json({ success: true, data: { message: 'Lote entregado exitosamente' } });
});
app.post('/api/pedidos/:id/asignar', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { marca = null } = req.body;
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
  if (!pedido) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
  
  // Usar validador centralizado
  try {
    validarStockDisponible(pedido.productoId, pedido.cantidad, marca);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  
  // Registrar en user_stock (asignación)
  const sid = `s${Date.now()}`;
  db.prepare('INSERT INTO user_stock (id, usuarioId, productoId, cantidad, unidad, areaId, ubicacionId, marca) VALUES (?,?,?,?,?,?,?,?)')
    .run(sid, pedido.usuarioId, pedido.productoId, pedido.cantidad, pedido.unidad, 'a1', 'u1', marca);
  db.prepare('UPDATE pedidos SET estado=? WHERE id=?').run('entregado', id);
  
  // Log asignación individual
  const producto = db.prepare('SELECT nombre FROM productos WHERE id = ?').get(pedido.productoId);
  const usuario = db.prepare('SELECT nombres FROM users WHERE id = ?').get(pedido.usuarioId);
  
  logAudit({
    usuarioId: req.user.id,
    accion: 'ASIGNACION',
    modulo: 'inventario',
    entidadId: sid,
    entidadDescripcion: `Asignado ${pedido.cantidad} ${pedido.unidad} de ${producto?.nombre || pedido.productoId} a ${usuario?.nombres || pedido.usuarioId}`,
    cambios: { pedidoId: id, productoId: pedido.productoId, cantidad: pedido.cantidad, marca, usuarioId: pedido.usuarioId },
    ip: req.auditInfo?.ip,
    userAgent: req.auditInfo?.userAgent
  });
  
  res.json({ success: true, data: { ok: true } });
});

// Endpoint temporal para crear usuario trabajador
app.post('/api/create-worker', async (req, res) => {
  try {
    const email = 'trabajador@demo.com';
    const password = 'trabajador123';
    
    // Verificar si ya existe
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.json({ success: true, message: 'Usuario ya existe', user: existing });
    }
    
    const id = `u${Date.now()}`;
    const hash = bcrypt.hashSync(password, 10);
    
    db.prepare('INSERT INTO users (id, nombres, email, roleId, passwordHash, permissions) VALUES (?,?,?,?,?,?)')
      .run(id, 'Usuario Trabajador', email, 'role-trabajador', hash, '[]');
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ success: true, data: user, message: 'Usuario creado exitosamente' });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Endpoint temporal para listar usuarios
app.get('/api/debug/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, nombres, email, roleId FROM users').all();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Endpoint temporal para establecer password de usuario trabajador
app.get('/api/debug/setup-worker', (req, res) => {
  try {
    // Verificar si user2@demo.com existe
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get('user2@demo.com');
    
    if (!user) {
      // Crear user2@demo.com si no existe
      const id = `u${Date.now()}`;
      const hash = bcrypt.hashSync('admin123', 10);
      db.prepare('INSERT INTO users (id, nombres, email, roleId, passwordHash, permissions) VALUES (?,?,?,?,?,?)')
        .run(id, 'Usuario Trabajador', 'user2@demo.com', 'role-trabajador', hash, '[]');
      user = { id, nombres: 'Usuario Trabajador', email: 'user2@demo.com', roleId: 'role-trabajador' };
    } else {
      // Actualizar password
      const hash = bcrypt.hashSync('admin123', 10);
      db.prepare('UPDATE users SET passwordHash = ? WHERE email = ?')
        .run(hash, 'user2@demo.com');
    }
    
    // Verificar rol trabajador
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get('role-trabajador');
    
    res.json({ 
      success: true, 
      message: 'Usuario trabajador configurado', 
      user: {
        email: user.email,
        roleId: user.roleId,
        password: 'admin123'
      },
      role: {
        name: role?.name,
        permissions: role ? JSON.parse(role.permissions) : []
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
});

// Endpoint temporal para verificar permisos de usuario
app.get('/api/debug/check-permissions/:email', (req, res) => {
  try {
    const { email } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(user.roleId);
    
    res.json({ 
      success: true, 
      data: {
        user: {
          id: user.id,
          email: user.email,
          nombres: user.nombres,
          roleId: user.roleId,
          permissions: user.permissions ? JSON.parse(user.permissions) : []
        },
        role: role ? {
          id: role.id,
          name: role.name,
          permissions: JSON.parse(role.permissions)
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Endpoint temporal para hacer login automático
app.get('/api/debug/auto-login/:role', (req, res) => {
  try {
    const { role } = req.params; // admin o trabajador
    
    let email, roleId;
    if (role === 'admin') {
      email = 'admin@demo.com';
      roleId = 'role-admin';
    } else {
      email = 'user2@demo.com';
      roleId = 'role-trabajador';
    }
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    // Get all roles to send with login response
    const roles = db.prepare('SELECT * FROM roles WHERE active = 1').all().map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions)
    }));
    
    const token = jwt.sign({ id: user.id, email: user.email, roleId: user.roleId }, JWT_SECRET, { expiresIn: '8h' });
    const { passwordHash, ...safeUser } = user;
    const userWithPerms = {
      ...safeUser,
      permissions: user.permissions ? JSON.parse(user.permissions) : []
    };
    
    res.json({ success: true, data: { token, user: userWithPerms, roles }, message: 'Login automático exitoso' });
  } catch (error) {
    console.error('Error en auto-login:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Endpoint específico para auto-login de user2
app.post('/api/debug/auto-login-user2', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('user2@demo.com');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, roleId: user.roleId }, JWT_SECRET, { expiresIn: '8h' });
    const { passwordHash, ...safeUser } = user;
    const userWithPerms = {
      ...safeUser,
      permissions: user.permissions ? JSON.parse(user.permissions) : []
    };
    
    res.json({ 
      success: true, 
      token: token,
      user: userWithPerms,
      message: 'Auto-login exitoso para user2@demo.com'
    });
  } catch (error) {
    console.error('Error en auto-login user2:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// ====== ENDPOINTS DE STOCK ======

// Obtener stock disponible de un producto (opcionalmente por marca)
app.get('/api/stock/disponible/:productoId', authMiddleware, (req, res) => {
  try {
    const { productoId } = req.params;
    const { marca } = req.query;
    const disponible = getStockDisponible(productoId, marca || null);
    res.json({ success: true, data: { disponible } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener productos con bajo stock (< 10 unidades)
app.get('/api/stock/bajo', authMiddleware, (req, res) => {
  try {
    const productos = getProductosBajoStock();
    res.json({ success: true, data: productos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener productos próximos a vencer
app.get('/api/stock/proximos-vencer', authMiddleware, (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 30; // Por defecto 30 días
    const productos = getProductosProximosVencer(dias);
    res.json({ success: true, data: productos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener reporte detallado de stock general
app.get('/api/stock/detallado', authMiddleware, (req, res) => {
  try {
    const reporte = getStockGeneralDetallado();
    res.json({ success: true, data: reporte });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== ENDPOINTS DE PRODUCTOS VENCIDOS ======

// Obtener productos YA vencidos
app.get('/api/stock/vencidos', authMiddleware, requireAdmin, (req, res) => {
  try {
    const productos = getProductosVencidos();
    res.json({ success: true, data: productos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dar de baja un producto vencido
app.post('/api/stock/dar-de-baja', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { ingreso_id, cantidad, motivo, observacion } = req.body;
    
    if (!ingreso_id || !cantidad || !motivo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos: ingreso_id, cantidad y motivo son requeridos' 
      });
    }
    
    // Obtener el ingreso
    const ingreso = db.prepare('SELECT * FROM ingresos WHERE id = ?').get(ingreso_id);
    if (!ingreso) {
      return res.status(404).json({ success: false, message: 'Ingreso no encontrado' });
    }
    
    // Validar que haya suficiente stock disponible
    if (cantidad > ingreso.cantidad_disponible) {
      return res.status(400).json({ 
        success: false, 
        message: `Stock insuficiente. Disponible: ${ingreso.cantidad_disponible}` 
      });
    }
    
    // Calcular valor de pérdida proporcional: (cantidad_baja / cantidad_total) * precio_total
    const precioUnitario = (ingreso.precio || 0) / (ingreso.cantidad || 1);
    const valorPerdida = cantidad * precioUnitario;
    
    // Crear registro de baja
    const bajaId = `b${Date.now()}`;
    db.prepare(`
      INSERT INTO bajas_inventario (
        id, ingreso_id, producto_id, cantidad, unidad, 
        motivo, observacion, fecha_baja, usuario_id, valor_perdida
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bajaId, 
      ingreso_id, 
      ingreso.productoId, 
      cantidad, 
      ingreso.unidad,
      motivo, 
      observacion || null, 
      new Date().toISOString(), 
      req.user.id, 
      valorPerdida
    );
    
    // Descontar de cantidad_disponible
    db.prepare('UPDATE ingresos SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?')
      .run(cantidad, ingreso_id);
    
    // Obtener producto para el log
    const producto = db.prepare('SELECT nombre FROM productos WHERE id = ?').get(ingreso.productoId);
    
    // Registrar en auditoría
    logAudit({
      usuarioId: req.user.id,
      accion: 'BAJA_INVENTARIO',
      modulo: 'inventario',
      entidadId: bajaId,
      entidadDescripcion: `Baja de ${cantidad} ${ingreso.unidad} de ${producto?.nombre || ingreso.productoId} por ${motivo}`,
      cambios: { ingreso_id, cantidad, motivo, valorPerdida },
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    const cantidadRestante = ingreso.cantidad_disponible - cantidad;
    
    res.json({ 
      success: true, 
      data: { 
        baja_id: bajaId, 
        ingreso_id, 
        cantidad, 
        cantidad_restante: cantidadRestante,
        valor_perdida: valorPerdida
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Devolver producto al proveedor
app.post('/api/stock/devolver-proveedor', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { ingreso_id, cantidad, motivo, observacion, estado = 'PENDIENTE' } = req.body;
    
    if (!ingreso_id || !cantidad || !motivo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos: ingreso_id, cantidad y motivo son requeridos' 
      });
    }
    
    // Obtener el ingreso
    const ingreso = db.prepare('SELECT * FROM ingresos WHERE id = ?').get(ingreso_id);
    if (!ingreso) {
      return res.status(404).json({ success: false, message: 'Ingreso no encontrado' });
    }
    
    // Validar que haya suficiente stock disponible
    if (cantidad > ingreso.cantidad_disponible) {
      return res.status(400).json({ 
        success: false, 
        message: `Stock insuficiente. Disponible: ${ingreso.cantidad_disponible}` 
      });
    }
    
    // Calcular valor de devolución (precio unitario = precio total / cantidad total)
    const precioUnitario = (ingreso.precio || 0) / (ingreso.cantidad || 1);
    const valorDevuelto = cantidad * precioUnitario;
    
    // Crear registro de devolución
    const devolucionId = `d${Date.now()}`;
    db.prepare(`
      INSERT INTO devoluciones_proveedor (
        id, ingreso_id, proveedor_id, producto_id, cantidad, unidad, 
        motivo, observacion, fecha_devolucion, usuario_id, estado, valor_devuelto
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      devolucionId,
      ingreso_id,
      ingreso.proveedorId,
      ingreso.productoId,
      cantidad,
      ingreso.unidad,
      motivo,
      observacion || null,
      new Date().toISOString(),
      req.user.id,
      estado,
      valorDevuelto
    );
    
    // Descontar de cantidad_disponible
    db.prepare('UPDATE ingresos SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?')
      .run(cantidad, ingreso_id);
    
    // Obtener producto y proveedor para el log
    const producto = db.prepare('SELECT nombre FROM productos WHERE id = ?').get(ingreso.productoId);
    const proveedor = db.prepare('SELECT nombre FROM proveedores WHERE id = ?').get(ingreso.proveedorId);
    
    // Registrar en auditoría
    logAudit({
      usuarioId: req.user.id,
      accion: 'DEVOLUCION_PROVEEDOR',
      modulo: 'inventario',
      entidadId: devolucionId,
      entidadDescripcion: `Devolución de ${cantidad} ${ingreso.unidad} de ${producto?.nombre || ingreso.productoId} a ${proveedor?.nombre || 'proveedor'}`,
      cambios: { ingreso_id, cantidad, motivo, estado, valorDevuelto },
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ 
      success: true, 
      data: { 
        devolucion_id: devolucionId,
        ingreso_id,
        cantidad,
        proveedor: proveedor?.nombre,
        estado,
        valor_devuelto: valorDevuelto
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener historial de bajas
app.get('/api/reportes/bajas', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    let query = `
      SELECT 
        b.id,
        b.fecha_baja,
        p.nombre as producto_nombre,
        pr.nombre as proveedor_nombre,
        b.cantidad,
        b.unidad,
        b.motivo,
        b.observacion,
        b.valor_perdida,
        u.nombres as usuario_nombre
      FROM bajas_inventario b
      INNER JOIN productos p ON b.producto_id = p.id
      INNER JOIN ingresos i ON b.ingreso_id = i.id
      INNER JOIN proveedores pr ON i.proveedorId = pr.id
      INNER JOIN users u ON b.usuario_id = u.id
    `;
    
    const params = [];
    
    if (fechaDesde && fechaHasta) {
      query += ' WHERE DATE(b.fecha_baja) BETWEEN DATE(?) AND DATE(?)';
      params.push(fechaDesde, fechaHasta);
    } else if (fechaDesde) {
      query += ' WHERE DATE(b.fecha_baja) >= DATE(?)';
      params.push(fechaDesde);
    } else if (fechaHasta) {
      query += ' WHERE DATE(b.fecha_baja) <= DATE(?)';
      params.push(fechaHasta);
    }
    
    query += ' ORDER BY b.fecha_baja DESC';
    
    const bajas = db.prepare(query).all(...params);
    
    // Calcular resumen
    const resumen = {
      total_bajas: bajas.length,
      total_perdida: bajas.reduce((sum, b) => sum + (b.valor_perdida || 0), 0),
      por_motivo: {
        VENCIDO: bajas.filter(b => b.motivo === 'VENCIDO').length,
        OTRO: bajas.filter(b => b.motivo === 'OTRO').length
      }
    };
    
    res.json({ success: true, data: { bajas, resumen } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener historial de devoluciones
app.get('/api/reportes/devoluciones', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { fechaDesde, fechaHasta, estado } = req.query;
    
    let query = `
      SELECT 
        d.id,
        d.fecha_devolucion,
        p.nombre as producto_nombre,
        pr.nombre as proveedor_nombre,
        d.cantidad,
        d.unidad,
        d.motivo,
        d.observacion,
        d.estado,
        d.valor_devuelto,
        u.nombres as usuario_nombre
      FROM devoluciones_proveedor d
      INNER JOIN productos p ON d.producto_id = p.id
      INNER JOIN proveedores pr ON d.proveedor_id = pr.id
      INNER JOIN users u ON d.usuario_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (fechaDesde && fechaHasta) {
      query += ' AND DATE(d.fecha_devolucion) BETWEEN DATE(?) AND DATE(?)';
      params.push(fechaDesde, fechaHasta);
    }
    
    if (estado) {
      query += ' AND d.estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY d.fecha_devolucion DESC';
    
    const devoluciones = db.prepare(query).all(...params);
    
    res.json({ success: true, data: devoluciones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== ENDPOINTS DE SALIDAS (BAJAS) POR DAÑO, PÉRDIDA, ETC. ======

// Listar ingresos disponibles para salidas
app.get('/api/salidas/ingresos-disponibles', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { productoId, areaId, proveedorId } = req.query;
    
    let query = `
      SELECT 
        i.id,
        i.productoId,
        i.proveedorId,
        i.nombre as productoNombre,
        i.fechaIngreso,
        i.cantidad,
        i.cantidad_disponible,
        i.unidad,
        i.precio,
        i.fechaVencimiento,
        i.serieFactura,
        i.fechaFactura,
        i.marca,
        p.nombre as producto_nombre,
        pr.nombre as proveedor_nombre,
        a.nombre as area_nombre,
        u.nombre as ubicacion_nombre
      FROM ingresos i
      INNER JOIN productos p ON i.productoId = p.id
      INNER JOIN proveedores pr ON i.proveedorId = pr.id
      INNER JOIN areas a ON i.areaId = a.id
      INNER JOIN ubicaciones u ON i.ubicacionId = u.id
      WHERE i.cantidad_disponible > 0
    `;
    
    const params = [];
    
    if (productoId) {
      query += ' AND i.productoId = ?';
      params.push(productoId);
    }
    
    if (areaId) {
      query += ' AND i.areaId = ?';
      params.push(areaId);
    }
    
    if (proveedorId) {
      query += ' AND i.proveedorId = ?';
      params.push(proveedorId);
    }
    
    query += ' ORDER BY i.fechaIngreso DESC';
    
    const ingresos = db.prepare(query).all(...params);
    
    res.json({ success: true, data: ingresos });
  } catch (error) {
    console.error('❌ Error al listar ingresos disponibles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Crear salida (baja de inventario)
app.post('/api/salidas', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { ingreso_id, cantidad, tipo, motivo, observacion } = req.body;
    
    console.log('📥 POST /api/salidas - Body recibido:', req.body);
    
    // Validar datos requeridos
    if (!ingreso_id || !cantidad || !tipo || !motivo) {
      console.log('❌ Validación falló:', { ingreso_id, cantidad, tipo, motivo });
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos: ingreso_id, cantidad, tipo y motivo son requeridos' 
      });
    }
    
    // Validar tipo
    const tiposValidos = ['PERDIDA', 'DAÑADO', 'MERMA', 'BAJA_VOLUNTARIA', 'DONACION', 'MUESTRA', 'VENCIDO'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ 
        success: false, 
        message: `Tipo inválido. Debe ser uno de: ${tiposValidos.join(', ')}` 
      });
    }
    
    // Validar cantidad
    if (cantidad <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'La cantidad debe ser mayor a 0' 
      });
    }
    
    // Obtener el ingreso
    const ingreso = db.prepare('SELECT * FROM ingresos WHERE id = ?').get(ingreso_id);
    console.log('📦 Ingreso encontrado:', ingreso);
    
    if (!ingreso) {
      return res.status(404).json({ success: false, message: 'Ingreso no encontrado' });
    }
    
    // Validar que haya suficiente stock disponible
    if (cantidad > ingreso.cantidad_disponible) {
      return res.status(400).json({ 
        success: false, 
        message: `Stock insuficiente. Disponible: ${ingreso.cantidad_disponible} ${ingreso.unidad}` 
      });
    }
    
    // Calcular valor de pérdida (precio unitario = precio total / cantidad total)
    const precioUnitario = (ingreso.precio || 0) / (ingreso.cantidad || 1);
    const valorPerdida = cantidad * precioUnitario;
    
    console.log('💰 Valor pérdida calculado:', valorPerdida, 'precioUnitario:', precioUnitario);
    
    // Crear registro de baja
    const bajaId = `b${Date.now()}`;
    
    const insertParams = [
      bajaId, 
      ingreso_id, 
      ingreso.productoId, 
      cantidad, 
      ingreso.unidad,
      tipo,
      motivo, 
      observacion || null, 
      new Date().toISOString(), 
      req.user.id, 
      valorPerdida
    ];
    
    console.log('📝 Intentando insertar con parámetros:', insertParams);
    
    const insertResult = db.prepare(`
      INSERT INTO bajas_inventario (
        id, ingreso_id, producto_id, cantidad, unidad, tipo,
        motivo, observacion, fecha_baja, usuario_id, valor_perdida
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...insertParams);
    
    console.log('✅ INSERT exitoso. Changes:', insertResult.changes, 'LastInsertRowid:', insertResult.lastInsertRowid);
    
    // Descontar de cantidad_disponible
    const updateResult = db.prepare('UPDATE ingresos SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?')
      .run(cantidad, ingreso_id);
    
    console.log('✅ UPDATE exitoso. Changes:', updateResult.changes);
    
    // Obtener producto para el log
    const producto = db.prepare('SELECT nombre FROM productos WHERE id = ?').get(ingreso.productoId);
    
    // Registrar en auditoría
    logAudit({
      usuarioId: req.user.id,
      accion: 'CREAR_SALIDA',
      modulo: 'salidas',
      entidadId: bajaId,
      entidadDescripcion: `Salida de ${cantidad} ${ingreso.unidad} de ${producto?.nombre || ingreso.productoId} por ${tipo}: ${motivo}`,
      cambios: { ingreso_id, cantidad, tipo, motivo, valorPerdida },
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    const cantidadRestante = ingreso.cantidad_disponible - cantidad;
    
    res.json({ 
      success: true, 
      data: { 
        id: bajaId, 
        ingreso_id, 
        cantidad, 
        tipo,
        cantidad_restante: cantidadRestante,
        valor_perdida: valorPerdida
      } 
    });
  } catch (error) {
    console.error('❌ Error al crear salida:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Listar historial de salidas
app.get('/api/salidas', authMiddleware, requireAdmin, (req, res) => {
  console.log('🎯 Dentro del handler GET /api/salidas');
  try {
    const { fechaDesde, fechaHasta, tipo, productoId } = req.query;
    
    let query = `
      SELECT 
        b.id,
        b.ingreso_id,
        b.fecha_baja,
        b.tipo,
        p.nombre as producto_nombre,
        pr.nombre as proveedor_nombre,
        b.cantidad,
        b.unidad,
        b.motivo,
        b.observacion,
        b.valor_perdida,
        u.nombres as usuario_nombre,
        i.serieFactura,
        i.fechaFactura,
        i.marca
      FROM bajas_inventario b
      INNER JOIN productos p ON b.producto_id = p.id
      INNER JOIN ingresos i ON b.ingreso_id = i.id
      INNER JOIN proveedores pr ON i.proveedorId = pr.id
      INNER JOIN users u ON b.usuario_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (fechaDesde) {
      query += ' AND DATE(b.fecha_baja) >= DATE(?)';
      params.push(fechaDesde);
    }
    
    if (fechaHasta) {
      query += ' AND DATE(b.fecha_baja) <= DATE(?)';
      params.push(fechaHasta);
    }
    
    if (tipo) {
      query += ' AND b.tipo = ?';
      params.push(tipo);
    }
    
    if (productoId) {
      query += ' AND b.producto_id = ?';
      params.push(productoId);
    }
    
    query += ' ORDER BY b.fecha_baja DESC';
    
    console.log('🔍 Query completo:', query);
    console.log('🔍 Parámetros:', params);
    
    const salidas = db.prepare(query).all(...params);
    
    console.log('📊 GET /api/salidas - Encontradas:', salidas.length, 'salidas');
    if (salidas.length > 0) {
      console.log('📄 Primera salida:', salidas[0]);
    }
    
    // Verificar si hay registros en bajas_inventario
    const totalBajas = db.prepare('SELECT COUNT(*) as total FROM bajas_inventario').get();
    console.log('💾 Total registros en bajas_inventario:', totalBajas);
    
    // Calcular resumen
    const resumen = {
      total_salidas: salidas.length,
      total_perdida: salidas.reduce((sum, s) => sum + (s.valor_perdida || 0), 0),
      por_tipo: {
        PERDIDA: salidas.filter(s => s.tipo === 'PERDIDA').length,
        DAÑADO: salidas.filter(s => s.tipo === 'DAÑADO').length,
        MERMA: salidas.filter(s => s.tipo === 'MERMA').length,
        BAJA_VOLUNTARIA: salidas.filter(s => s.tipo === 'BAJA_VOLUNTARIA').length,
        DONACION: salidas.filter(s => s.tipo === 'DONACION').length,
        MUESTRA: salidas.filter(s => s.tipo === 'MUESTRA').length,
        VENCIDO: salidas.filter(s => s.tipo === 'VENCIDO').length
      }
    };
    
    console.log('📈 Resumen:', resumen);
    
    res.json({ success: true, data: { salidas, resumen } });
  } catch (error) {
    console.error('❌ Error al listar salidas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Eliminar salida (solo admin)
app.delete('/api/salidas/:id', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener la salida antes de eliminarla
    const salida = db.prepare('SELECT * FROM bajas_inventario WHERE id = ?').get(id);
    if (!salida) {
      return res.status(404).json({ success: false, message: 'Salida no encontrada' });
    }
    
    // Restaurar cantidad_disponible
    db.prepare('UPDATE ingresos SET cantidad_disponible = cantidad_disponible + ? WHERE id = ?')
      .run(salida.cantidad, salida.ingreso_id);
    
    // Eliminar el registro
    db.prepare('DELETE FROM bajas_inventario WHERE id = ?').run(id);
    
    // Registrar en auditoría
    logAudit({
      usuarioId: req.user.id,
      accion: 'ELIMINAR_SALIDA',
      modulo: 'salidas',
      entidadId: id,
      entidadDescripcion: `Eliminó salida de ${salida.cantidad} ${salida.unidad} (${salida.tipo})`,
      cambios: { salida_eliminada: salida },
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, message: 'Salida eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar salida:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== ENDPOINTS DE SALIDAS PARA TRABAJADORES ======

// Listar mis salidas (solo del usuario autenticado)
app.get('/api/salidas/mis-salidas', authMiddleware, (req, res) => {
  console.log('🎯 GET /api/salidas/mis-salidas - Usuario:', req.user.email);
  try {
    const userId = req.user.id;
    
    // Obtener salidas del usuario desde user_salidas
    const query = `
      SELECT 
        us.id,
        us.productoId,
        us.cantidad,
        us.unidad,
        us.fecha,
        us.observacion,
        p.nombre as producto_nombre
      FROM user_salidas us
      INNER JOIN productos p ON us.productoId = p.id
      WHERE us.usuarioId = ?
      ORDER BY us.fecha DESC
    `;
    
    const salidas = db.prepare(query).all(userId);
    
    console.log('📊 Encontradas', salidas.length, 'salidas del usuario');
    
    res.json({ 
      success: true, 
      data: salidas 
    });
  } catch (error) {
    console.error('❌ Error al obtener mis salidas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Crear una salida (trabajador registra uso de producto)
app.post('/api/salidas/mis-salidas', authMiddleware, (req, res) => {
  console.log('📥 POST /api/salidas/mis-salidas - Body:', req.body);
  try {
    const { productoId, cantidad, unidad, observacion } = req.body;
    const userId = req.user.id;
    
    if (!productoId || !cantidad || !unidad) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos: productoId, cantidad y unidad son requeridos' 
      });
    }
    
    // Validar stock disponible del usuario
    const stockQuery = `
      SELECT COALESCE(SUM(us.cantidad), 0) - COALESCE(
        (SELECT SUM(sal.cantidad) 
         FROM user_salidas sal 
         WHERE sal.usuarioId = us.usuarioId 
         AND sal.productoId = us.productoId 
         AND sal.unidad = us.unidad), 0
      ) AS disponible
      FROM user_stock us
      WHERE us.usuarioId = ? AND us.productoId = ? AND us.unidad = ?
    `;
    
    const stockRow = db.prepare(stockQuery).get(userId, productoId, unidad);
    const disponible = stockRow?.disponible || 0;
    
    if (cantidad > disponible) {
      return res.status(400).json({ 
        success: false, 
        message: `Stock insuficiente. Disponible: ${disponible} ${unidad}` 
      });
    }
    
    // Crear el registro de salida
    const id = `out-${Date.now()}-${userId}`;
    const fecha = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO user_salidas (id, usuarioId, productoId, cantidad, unidad, fecha, observacion) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, productoId, cantidad, unidad, fecha, observacion || null);
    
    // Registrar en auditoría
    const producto = db.prepare('SELECT nombre FROM productos WHERE id = ?').get(productoId);
    logAudit({
      usuarioId: userId,
      accion: 'CREAR_SALIDA_PERSONAL',
      modulo: 'mis-salidas',
      entidadId: id,
      entidadDescripcion: `Registró salida de ${cantidad} ${unidad} de ${producto?.nombre || productoId}`,
      cambios: { productoId, cantidad, unidad, observacion },
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    console.log('✅ Salida personal creada:', id);
    
    res.json({ 
      success: true, 
      data: { 
        id, 
        usuarioId: userId, 
        productoId, 
        cantidad, 
        unidad, 
        fecha, 
        observacion: observacion || null 
      } 
    });
  } catch (error) {
    console.error('❌ Error al crear salida personal:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== ENDPOINTS DE CONFIGURACIÓN DE EMPRESA ======

// Obtener configuración de empresa
app.get('/api/empresa/config', authMiddleware, (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM configuracion_empresa WHERE id = 1').get();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Actualizar configuración de empresa
app.post('/api/empresa/config', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { nombre_empresa, ruc, direccion, telefono, email } = req.body;
    
    db.prepare(`
      UPDATE configuracion_empresa 
      SET nombre_empresa = ?, ruc = ?, direccion = ?, telefono = ?, email = ?, updated_at = ?
      WHERE id = 1
    `).run(nombre_empresa, ruc, direccion || null, telefono || null, email || null, new Date().toISOString());
    
    const config = db.prepare('SELECT * FROM configuracion_empresa WHERE id = 1').get();
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'UPDATE',
      modulo: 'configuracion',
      entidadDescripcion: `Actualización de configuración de empresa: ${nombre_empresa}`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Subir logo de empresa
app.post('/api/empresa/logo', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { logoBase64 } = req.body;
    
    if (!logoBase64) {
      return res.status(400).json({ success: false, message: 'No se proporcionó imagen' });
    }
    
    // Guardar logo como base64 en la BD
    db.prepare('UPDATE configuracion_empresa SET logo_path = ?, updated_at = ? WHERE id = 1')
      .run(logoBase64, new Date().toISOString());
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'UPDATE',
      modulo: 'configuracion',
      entidadDescripcion: 'Actualización de logo de empresa',
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data: { logo_path: logoBase64 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== ENDPOINTS DE COTIZACIONES ======

// Obtener todas las cotizaciones
app.get('/api/cotizaciones', authMiddleware, requirePermission('cotizaciones.view'), (req, res) => {
  try {
    const cotizaciones = db.prepare(`
      SELECT 
        c.id,
        c.numero,
        c.fecha_cotizacion,
        c.observaciones,
        p.nombre as proveedor_nombre,
        u.nombres as usuario_nombre,
        COUNT(cd.id) as total_productos,
        c.created_at
      FROM cotizaciones c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      LEFT JOIN users u ON c.usuario_id = u.id
      LEFT JOIN cotizaciones_detalle cd ON c.id = cd.cotizacion_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();
    
    res.json({ success: true, data: cotizaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener detalle de una cotización
app.get('/api/cotizaciones/:id', authMiddleware, requirePermission('cotizaciones.view'), (req, res) => {
  try {
    const { id } = req.params;
    
    const cotizacion = db.prepare(`
      SELECT 
        c.*,
        p.nombre as proveedor_nombre,
        p.contacto as proveedor_contacto,
        p.telefono as proveedor_telefono,
        u.nombres as usuario_nombre
      FROM cotizaciones c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      LEFT JOIN users u ON c.usuario_id = u.id
      WHERE c.id = ?
    `).get(id);
    
    if (!cotizacion) {
      return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
    }
    
    const detalles = db.prepare(`
      SELECT * FROM cotizaciones_detalle WHERE cotizacion_id = ?
    `).all(id);
    
    res.json({ success: true, data: { ...cotizacion, detalles } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Crear nueva cotización
app.post('/api/cotizaciones', authMiddleware, requirePermission('cotizaciones.create'), (req, res) => {
  try {
    const { proveedor_id, productos, observaciones } = req.body;
    
    if (!proveedor_id || !productos || productos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Proveedor y productos son requeridos' 
      });
    }
    
    // Obtener el último número de cotización
    const ultimaCot = db.prepare(`
      SELECT numero FROM cotizaciones ORDER BY created_at DESC LIMIT 1
    `).get();
    
    let nuevoNumero = 'COT-0000001';
    if (ultimaCot) {
      const numActual = parseInt(ultimaCot.numero.split('-')[1]);
      nuevoNumero = `COT-${String(numActual + 1).padStart(7, '0')}`;
    }
    
    const cotizacionId = `cot${Date.now()}`;
    const fechaCotizacion = new Date().toISOString();
    
    // Insertar cotización
    db.prepare(`
      INSERT INTO cotizaciones (id, numero, proveedor_id, fecha_cotizacion, observaciones, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      cotizacionId,
      nuevoNumero,
      proveedor_id,
      fechaCotizacion,
      observaciones || null,
      req.user.id
    );
    
    // Insertar detalles
    const insertDetalle = db.prepare(`
      INSERT INTO cotizaciones_detalle (id, cotizacion_id, producto_id, producto_nombre, cantidad, unidad)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    productos.forEach((prod, index) => {
      insertDetalle.run(
        `${cotizacionId}-${index}`,
        cotizacionId,
        prod.producto_id,
        prod.producto_nombre,
        prod.cantidad,
        prod.unidad
      );
    });
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'CREATE',
      modulo: 'cotizaciones',
      entidadId: cotizacionId,
      entidadDescripcion: `Cotización ${nuevoNumero} creada`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ 
      success: true, 
      data: { id: cotizacionId, numero: nuevoNumero } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generar PDF de cotización
app.get('/api/cotizaciones/:id/pdf', authMiddleware, requirePermission('cotizaciones.view'), (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener cotización con detalles
    const cotizacion = db.prepare(`
      SELECT 
        c.*,
        p.nombre as proveedor_nombre,
        p.contacto as proveedor_contacto,
        p.telefono as proveedor_telefono,
        p.ruc as proveedor_ruc,
        u.nombres as usuario_nombre
      FROM cotizaciones c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      LEFT JOIN users u ON c.usuario_id = u.id
      WHERE c.id = ?
    `).get(id);
    
    if (!cotizacion) {
      return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
    }
    
    const detalles = db.prepare(`
      SELECT * FROM cotizaciones_detalle WHERE cotizacion_id = ?
    `).all(id);
    
    // Obtener configuración de empresa
    const empresa = db.prepare('SELECT * FROM configuracion_empresa WHERE id = 1').get();
    
    // Crear PDF
    const doc = new jsPDF();
    let yPos = 20;
    
    // Agregar logo si existe (esquina superior derecha)
    if (empresa?.logo_path) {
      try {
        // Posición: x=165 (esquina derecha), y=15, ancho=30, alto=30 (reducido para evitar distorsión)
        doc.addImage(empresa.logo_path, 'PNG', 165, 15, 30, 30);
      } catch (error) {
        console.warn('⚠️ Error al agregar logo al PDF:', error.message);
      }
    }
    
    // Encabezado de empresa (lado izquierdo)
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(empresa?.nombre_empresa || 'SIN CONFIGURAR', 15, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    if (empresa?.ruc) {
      doc.text(`RUC: ${empresa.ruc}`, 15, yPos);
      yPos += 5;
    }
    if (empresa?.direccion) {
      doc.text(empresa.direccion, 15, yPos);
      yPos += 5;
    }
    if (empresa?.telefono) {
      doc.text(`Tel: ${empresa.telefono}`, 15, yPos);
      yPos += 5;
    }
    if (empresa?.email) {
      doc.text(`Email: ${empresa.email}`, 15, yPos);
      yPos += 5;
    }
    
    yPos += 10;
    
    // Título del documento
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('COTIZACIÓN', 105, yPos, { align: 'center' });
    yPos += 10;
    
    // Número de cotización
    doc.setFontSize(12);
    doc.text(cotizacion.numero, 105, yPos, { align: 'center' });
    yPos += 15;
    
    // Información del proveedor
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Proveedor:', 15, yPos);
    yPos += 7;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(cotizacion.proveedor_nombre || 'N/A', 15, yPos);
    yPos += 5;
    if (cotizacion.proveedor_ruc) {
      doc.text(`RUC: ${cotizacion.proveedor_ruc}`, 15, yPos);
      yPos += 5;
    }
    if (cotizacion.proveedor_contacto) {
      doc.text(`Contacto: ${cotizacion.proveedor_contacto}`, 15, yPos);
      yPos += 5;
    }
    if (cotizacion.proveedor_telefono) {
      doc.text(`Tel: ${cotizacion.proveedor_telefono}`, 15, yPos);
      yPos += 5;
    }
    
    yPos += 5;
    
    // Fecha
    doc.setFont(undefined, 'bold');
    doc.text('Fecha:', 15, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(new Date(cotizacion.fecha_cotizacion).toLocaleDateString('es-PE'), 35, yPos);
    yPos += 10;
    
    // Tabla de productos
    const tableData = detalles.map(det => [
      det.producto_nombre,
      det.cantidad.toString(),
      det.unidad
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Producto', 'Cantidad', 'Unidad']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' }
      }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    // Observaciones
    if (cotizacion.observaciones) {
      doc.setFont(undefined, 'bold');
      doc.text('Observaciones:', 15, yPos);
      yPos += 7;
      
      doc.setFont(undefined, 'normal');
      const splitObs = doc.splitTextToSize(cotizacion.observaciones, 180);
      doc.text(splitObs, 15, yPos);
      yPos += splitObs.length * 5;
    }
    
    yPos += 10;
    
    // Generado por
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.text(`Generado por: ${cotizacion.usuario_nombre}`, 15, yPos);
    doc.text(`Fecha de generación: ${new Date().toLocaleString('es-PE')}`, 15, yPos + 4);
    
    // Generar buffer del PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    // Enviar PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cotizacion-${cotizacion.numero}.pdf`);
    res.send(pdfBuffer);
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'EXPORT',
      modulo: 'cotizaciones',
      entidadId: id,
      entidadDescripcion: `PDF generado para cotización ${cotizacion.numero}`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== ENDPOINTS DE ÓRDENES DE COMPRA ======

// Listar órdenes de compra con filtros
app.get('/api/ordenes-compra', authMiddleware, requirePermission('ordenes.view'), (req, res) => {
  try {
    const { estado, proveedor_id, fecha_desde, fecha_hasta } = req.query;
    
    let query = `
      SELECT 
        o.*,
        p.nombre as proveedor_nombre,
        p.ruc as proveedor_ruc,
        u.nombres as usuario_nombre,
        (SELECT COUNT(*) FROM ordenes_compra_detalle WHERE orden_id = o.id) as total_productos
      FROM ordenes_compra o
      LEFT JOIN proveedores p ON o.proveedor_id = p.id
      LEFT JOIN users u ON o.usuario_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (estado) {
      query += ` AND o.estado = ?`;
      params.push(estado);
    }
    
    if (proveedor_id) {
      query += ` AND o.proveedor_id = ?`;
      params.push(proveedor_id);
    }
    
    if (fecha_desde) {
      query += ` AND o.fecha_orden >= ?`;
      params.push(fecha_desde);
    }
    
    if (fecha_hasta) {
      query += ` AND o.fecha_orden <= ?`;
      params.push(fecha_hasta);
    }
    
    query += ` ORDER BY o.created_at DESC`;
    
    const ordenes = db.prepare(query).all(...params);
    
    res.json({ success: true, data: ordenes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener detalle de una orden de compra
app.get('/api/ordenes-compra/:id', authMiddleware, requirePermission('ordenes.view'), (req, res) => {
  try {
    const { id } = req.params;
    
    const orden = db.prepare(`
      SELECT 
        o.*,
        p.nombre as proveedor_nombre,
        p.ruc as proveedor_ruc,
        p.direccion as proveedor_direccion,
        p.contacto as proveedor_contacto,
        p.telefono as proveedor_telefono,
        u.nombres as usuario_nombre
      FROM ordenes_compra o
      LEFT JOIN proveedores p ON o.proveedor_id = p.id
      LEFT JOIN users u ON o.usuario_id = u.id
      WHERE o.id = ?
    `).get(id);
    
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    
    const detalles = db.prepare(`
      SELECT * FROM ordenes_compra_detalle WHERE orden_id = ?
    `).all(id);
    
    const seguimiento = db.prepare(`
      SELECT 
        s.*,
        u.nombres as usuario_nombre
      FROM seguimiento_entregas s
      LEFT JOIN users u ON s.usuario_id = u.id
      WHERE s.orden_id = ?
      ORDER BY s.fecha DESC
    `).all(id);
    
    orden.detalles = detalles;
    orden.seguimiento = seguimiento;
    
    res.json({ success: true, data: orden });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Crear orden de compra
app.post('/api/ordenes-compra', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { proveedor_id, fecha_entrega_estimada, productos, condiciones_pago, notas } = req.body;
    
    if (!proveedor_id || !productos || productos.length === 0) {
      return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }
    
    // Generar número de orden secuencial
    const lastOrden = db.prepare('SELECT numero FROM ordenes_compra ORDER BY created_at DESC LIMIT 1').get();
    let nextNumber = 1;
    if (lastOrden) {
      const match = lastOrden.numero.match(/ORD-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const numero = `ORD-${String(nextNumber).padStart(7, '0')}`;
    
    // Calcular totales
    let subtotal = 0;
    productos.forEach(p => {
      subtotal += (p.cantidad * p.precio_unitario);
    });
    
    const impuestos = subtotal * 0.18; // IGV 18%
    const total = subtotal - impuestos;
    
    const ordenId = `ord${Date.now()}`;
    const fechaOrden = new Date().toISOString().split('T')[0];
    
    // Insertar orden
    db.prepare(`
      INSERT INTO ordenes_compra (
        id, numero, proveedor_id, fecha_orden, fecha_entrega_estimada,
        estado, subtotal, impuestos, total, condiciones_pago, notas, usuario_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      ordenId, numero, proveedor_id, fechaOrden, fecha_entrega_estimada || null,
      'PENDIENTE', subtotal, impuestos, total,
      condiciones_pago || null, notas || null, req.user.id
    );
    
    // Insertar detalles
    const insertDetalle = db.prepare(`
      INSERT INTO ordenes_compra_detalle (
        id, orden_id, producto_id, producto_nombre, cantidad, unidad, precio_unitario, subtotal
      ) VALUES (?,?,?,?,?,?,?,?)
    `);
    
    productos.forEach(p => {
      const detalleId = `ord_det${Date.now()}${Math.random()}`;
      const subtotalProducto = p.cantidad * p.precio_unitario;
      insertDetalle.run(
        detalleId, ordenId, p.producto_id, p.producto_nombre,
        p.cantidad, p.unidad, p.precio_unitario, subtotalProducto
      );
    });
    
    // Registrar seguimiento inicial
    const segId = `seg${Date.now()}`;
    db.prepare(`
      INSERT INTO seguimiento_entregas (id, orden_id, estado, observaciones, usuario_id)
      VALUES (?,?,?,?,?)
    `).run(segId, ordenId, 'PENDIENTE', 'Orden de compra creada', req.user.id);
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'CREATE',
      modulo: 'ordenes_compra',
      entidadId: ordenId,
      entidadDescripcion: `Orden de compra ${numero} creada`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data: { id: ordenId, numero } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Actualizar orden de compra
app.put('/api/ordenes-compra/:id', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_entrega_estimada, condiciones_pago, notas } = req.body;
    
    db.prepare(`
      UPDATE ordenes_compra 
      SET fecha_entrega_estimada = ?, condiciones_pago = ?, notas = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(fecha_entrega_estimada || null, condiciones_pago || null, notas || null, id);
    
    const orden = db.prepare('SELECT * FROM ordenes_compra WHERE id = ?').get(id);
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'UPDATE',
      modulo: 'ordenes_compra',
      entidadId: id,
      entidadDescripcion: `Orden ${orden.numero} actualizada`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data: orden });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancelar orden de compra
app.delete('/api/ordenes-compra/:id', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    const orden = db.prepare('SELECT * FROM ordenes_compra WHERE id = ?').get(id);
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    
    // Cambiar estado a CANCELADA en lugar de eliminar
    db.prepare('UPDATE ordenes_compra SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('CANCELADA', id);
    
    // Registrar seguimiento
    const segId = `seg${Date.now()}`;
    db.prepare(`
      INSERT INTO seguimiento_entregas (id, orden_id, estado, observaciones, usuario_id)
      VALUES (?,?,?,?,?)
    `).run(segId, id, 'CANCELADA', 'Orden cancelada', req.user.id);
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'DELETE',
      modulo: 'ordenes_compra',
      entidadId: id,
      entidadDescripcion: `Orden ${orden.numero} cancelada`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cambiar estado de orden
app.put('/api/ordenes-compra/:id/estado', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones } = req.body;
    
    const estadosValidos = ['PENDIENTE', 'CONFIRMADA', 'EN_TRANSITO', 'ENTREGADA', 'CANCELADA'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }
    
    db.prepare('UPDATE ordenes_compra SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(estado, id);
    
    // Registrar seguimiento
    const segId = `seg${Date.now()}`;
    db.prepare(`
      INSERT INTO seguimiento_entregas (id, orden_id, estado, observaciones, usuario_id)
      VALUES (?,?,?,?,?)
    `).run(segId, id, estado, observaciones || `Estado cambiado a ${estado}`, req.user.id);
    
    const orden = db.prepare('SELECT * FROM ordenes_compra WHERE id = ?').get(id);
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'UPDATE',
      modulo: 'ordenes_compra',
      entidadId: id,
      entidadDescripcion: `Estado de orden ${orden.numero} cambiado a ${estado}`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data: orden });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Agregar evento de seguimiento
app.post('/api/ordenes-compra/:id/seguimiento', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;
    
    const orden = db.prepare('SELECT * FROM ordenes_compra WHERE id = ?').get(id);
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    
    const segId = `seg${Date.now()}`;
    db.prepare(`
      INSERT INTO seguimiento_entregas (id, orden_id, estado, observaciones, usuario_id)
      VALUES (?,?,?,?,?)
    `).run(segId, id, orden.estado, observaciones, req.user.id);
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'CREATE',
      modulo: 'seguimiento_entregas',
      entidadId: segId,
      entidadDescripcion: `Seguimiento agregado a orden ${orden.numero}`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data: { id: segId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generar PDF de orden de compra
app.get('/api/ordenes-compra/:id/pdf', authMiddleware, requirePermission('ordenes.view'), (req, res) => {
  try {
    const { id } = req.params;
    
    const orden = db.prepare(`
      SELECT 
        o.*,
        p.nombre as proveedor_nombre,
        p.ruc as proveedor_ruc,
        p.direccion as proveedor_direccion,
        p.contacto as proveedor_contacto,
        p.telefono as proveedor_telefono,
        u.nombres as usuario_nombre
      FROM ordenes_compra o
      LEFT JOIN proveedores p ON o.proveedor_id = p.id
      LEFT JOIN users u ON o.usuario_id = u.id
      WHERE o.id = ?
    `).get(id);
    
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    
    const detalles = db.prepare(`
      SELECT * FROM ordenes_compra_detalle WHERE orden_id = ?
    `).all(id);
    
    const empresa = db.prepare('SELECT * FROM configuracion_empresa WHERE id = 1').get();
    
    // Crear PDF
    const doc = new jsPDF();
    let yPos = 20;
    
    // Logo (esquina superior derecha)
    if (empresa?.logo_path) {
      try {
        doc.addImage(empresa.logo_path, 'PNG', 165, 15, 30, 30);
      } catch (error) {
        console.warn('⚠️ Error al agregar logo:', error.message);
      }
    }
    
    // Encabezado de empresa
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(empresa?.nombre_empresa || 'SIN CONFIGURAR', 15, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    if (empresa?.ruc) {
      doc.text(`RUC: ${empresa.ruc}`, 15, yPos);
      yPos += 5;
    }
    if (empresa?.direccion) {
      doc.text(empresa.direccion, 15, yPos);
      yPos += 5;
    }
    if (empresa?.telefono) {
      doc.text(`Tel: ${empresa.telefono}`, 15, yPos);
      yPos += 5;
    }
    if (empresa?.email) {
      doc.text(`Email: ${empresa.email}`, 15, yPos);
      yPos += 5;
    }
    
    yPos += 10;
    
    // Título
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('ORDEN DE COMPRA', 105, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(12);
    doc.text(orden.numero, 105, yPos, { align: 'center' });
    yPos += 15;
    
    // Información del proveedor
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Proveedor:', 15, yPos);
    yPos += 7;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(orden.proveedor_nombre || 'N/A', 15, yPos);
    yPos += 5;
    if (orden.proveedor_ruc) {
      doc.text(`RUC: ${orden.proveedor_ruc}`, 15, yPos);
      yPos += 5;
    }
    if (orden.proveedor_contacto) {
      doc.text(`Contacto: ${orden.proveedor_contacto}`, 15, yPos);
      yPos += 5;
    }
    if (orden.proveedor_telefono) {
      doc.text(`Tel: ${orden.proveedor_telefono}`, 15, yPos);
      yPos += 5;
    }
    
    yPos += 5;
    
    // Fechas
    doc.setFont(undefined, 'bold');
    doc.text('Fecha Orden:', 15, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(new Date(orden.fecha_orden).toLocaleDateString('es-PE'), 45, yPos);
    
    if (orden.fecha_entrega_estimada) {
      doc.setFont(undefined, 'bold');
      doc.text('Entrega Estimada:', 100, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(new Date(orden.fecha_entrega_estimada).toLocaleDateString('es-PE'), 145, yPos);
    }
    
    yPos += 10;
    
    // Tabla de productos
    const tableData = detalles.map(det => [
      det.producto_nombre,
      det.cantidad.toString(),
      det.unidad,
      `S/ ${det.precio_unitario.toFixed(2)}`,
      `S/ ${det.subtotal.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Producto', 'Cantidad', 'Unidad', 'P. Unitario', 'Subtotal']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    // Totales
    const xTotales = 140;
    doc.setFontSize(10);
    
    doc.setFont(undefined, 'bold');
    doc.text('Subtotal:', xTotales, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(`S/ ${orden.subtotal.toFixed(2)}`, 190, yPos, { align: 'right' });
    yPos += 6;
    
    doc.setFont(undefined, 'bold');
    doc.text('IGV (18%):', xTotales, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(`S/ ${orden.impuestos.toFixed(2)}`, 190, yPos, { align: 'right' });
    yPos += 6;
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', xTotales, yPos);
    doc.text(`S/ ${orden.total.toFixed(2)}`, 190, yPos, { align: 'right' });
    yPos += 15;
    
    // Condiciones de pago
    if (orden.condiciones_pago) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Condiciones de Pago:', 15, yPos);
      yPos += 5;
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(orden.condiciones_pago, 180);
      doc.text(lines, 15, yPos);
      yPos += (lines.length * 5) + 5;
    }
    
    // Notas
    if (orden.notas) {
      doc.setFont(undefined, 'bold');
      doc.text('Notas:', 15, yPos);
      yPos += 5;
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(orden.notas, 180);
      doc.text(lines, 15, yPos);
      yPos += (lines.length * 5) + 5;
    }
    
    // Footer
    yPos = 270;
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.text(`Generado por: ${orden.usuario_nombre}`, 15, yPos);
    doc.text(`Fecha: ${new Date().toLocaleString('es-PE')}`, 15, yPos + 4);
    
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=orden-${orden.numero}.pdf`);
    res.send(pdfBuffer);
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'EXPORT',
      modulo: 'ordenes_compra',
      entidadId: id,
      entidadDescripcion: `PDF generado para orden ${orden.numero}`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Crear ingreso desde orden de compra
app.post('/api/ordenes-compra/:id/crear-ingreso', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { detalles } = req.body; // Array de { producto_id, cantidad, precio, fechaVencimiento, lote, ubicacion, observaciones }
    
    // Verificar que la orden existe y está ENTREGADA
    const orden = db.prepare(`
      SELECT oc.*, p.nombre as proveedor_nombre
      FROM ordenes_compra oc
      LEFT JOIN proveedores p ON oc.proveedor_id = p.id
      WHERE oc.id = ?
    `).get(id);
    
    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    
    if (orden.estado !== 'ENTREGADA') {
      return res.status(400).json({ 
        success: false, 
        message: 'Solo se pueden crear ingresos de órdenes en estado ENTREGADA' 
      });
    }
    
    if (!detalles || detalles.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe proporcionar al menos un producto' });
    }
    
    const ingresosCreados = [];
    
    // Crear un ingreso por cada producto
    for (const detalle of detalles) {
      const {
        producto_id,
        cantidad,
        precio, // Este es el subtotal (cantidad × precio_unitario de la orden)
        fechaVencimiento,
        fechaFactura,
        serieFactura
      } = detalle;
      
      // Obtener info del producto para validación
      const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(producto_id);
      if (!producto) {
        continue; // Skip si el producto no existe
      }
      
      const ingresoId = `ing${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Usar ubicación y área del producto (ya están definidas en productos)
      let areaIdFinal = producto.areaId;
      let ubicacionIdFinal = producto.ubicacionId;
      
      if (!areaIdFinal) {
        const defaultArea = db.prepare('SELECT id FROM areas LIMIT 1').get();
        areaIdFinal = defaultArea?.id || 'area1';
      }
      
      if (!ubicacionIdFinal) {
        const defaultUbicacion = db.prepare('SELECT id FROM ubicaciones LIMIT 1').get();
        ubicacionIdFinal = defaultUbicacion?.id || 'ubi1';
      }
      
      db.prepare(`
        INSERT INTO ingresos (
          id, productoId, proveedorId, nombre, fechaIngreso,
          cantidad, unidad, precio, areaId, ubicacionId,
          fechaVencimiento, fechaFactura, serieFactura, marca, cantidad_disponible
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        ingresoId,
        producto_id,
        orden.proveedor_id,
        producto.nombre,
        new Date().toISOString(),
        cantidad,
        producto.unidad || 'unidad',
        precio, // Aquí va el subtotal
        areaIdFinal,
        ubicacionIdFinal,
        fechaVencimiento || null,
        fechaFactura || null,
        serieFactura || null,
        producto.marca || '',
        cantidad // cantidad_disponible = cantidad inicialmente
      );
      
      ingresosCreados.push({ id: ingresoId, producto: producto.nombre, cantidad });
      
      // Log de auditoría
      logAudit({
        usuarioId: req.user.id,
        accion: 'INSERT',
        modulo: 'ingresos',
        entidadId: ingresoId,
        entidadDescripcion: `Ingreso de ${cantidad} ${producto.nombre} desde orden ${orden.numero}`,
        ip: req.auditInfo?.ip,
        userAgent: req.auditInfo?.userAgent
      });
    }
    
    // Agregar seguimiento a la orden
    const segId = `seg${Date.now()}`;
    db.prepare(`
      INSERT INTO seguimiento_entregas (id, orden_id, estado, observaciones, usuario_id)
      VALUES (?,?,?,?,?)
    `).run(
      segId,
      id,
      'ENTREGADA',
      `Ingreso al inventario realizado (${ingresosCreados.length} productos)`,
      req.user.id
    );
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'INSERT',
      modulo: 'ordenes_compra',
      entidadId: id,
      entidadDescripcion: `Ingreso creado desde orden ${orden.numero}`,
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ 
      success: true, 
      data: { 
        ingresosCreados,
        mensaje: `Se crearon ${ingresosCreados.length} ingresos exitosamente`
      } 
    });
  } catch (error) {
    console.error('Error al crear ingreso desde orden:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== ENDPOINTS DE AUDITORÍA ======

// Obtener logs de auditoría con filtros
app.get('/api/audit/logs', authMiddleware, requireAdmin, (req, res) => {
  try {
    const filters = {
      usuarioId: req.query.usuarioId,
      modulo: req.query.modulo,
      accion: req.query.accion,
      fechaDesde: req.query.fechaDesde,
      fechaHasta: req.query.fechaHasta,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0
    };
    
    const logs = getAuditLogs(filters);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener estadísticas de auditoría
app.get('/api/audit/stats', authMiddleware, requireAdmin, (req, res) => {
  try {
    const stats = getAuditStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== ENDPOINTS DE DASHBOARD ======

// Obtener métricas generales del dashboard
app.get('/api/dashboard/metrics', authMiddleware, (req, res) => {
  try {
    const metrics = getDashboardMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener datos para gráficos del dashboard
app.get('/api/dashboard/charts', authMiddleware, (req, res) => {
  try {
    const charts = getDashboardCharts();
    res.json({ success: true, data: charts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Obtener actividad reciente
app.get('/api/dashboard/activity', authMiddleware, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activity = getRecentActivity(limit);
    res.json({ success: true, data: activity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== ENDPOINTS DE REPORTES ======

// Reporte de Inventario General
app.get('/api/reportes/inventario', authMiddleware, requirePermission('reports.view'), (req, res) => {
  try {
    const { productoId, areaId } = req.query;
    const data = getInventarioGeneralReport({ productoId, areaId });
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'VIEW',
      modulo: 'reportes',
      entidadDescripcion: 'Reporte de Inventario General',
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reporte de Ingresos
app.get('/api/reportes/ingresos', authMiddleware, requirePermission('reports.view'), (req, res) => {
  try {
    const { fechaInicio, fechaFin, productoId, proveedorId } = req.query;
    const data = getIngresosReport({ fechaInicio, fechaFin, productoId, proveedorId });
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'VIEW',
      modulo: 'reportes',
      entidadDescripcion: 'Reporte de Ingresos',
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reporte de Pedidos
app.get('/api/reportes/pedidos', authMiddleware, requirePermission('reports.view'), (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuarioId, estado, productoId } = req.query;
    const data = getPedidosReport({ fechaInicio, fechaFin, usuarioId, estado, productoId });
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'VIEW',
      modulo: 'reportes',
      entidadDescripcion: 'Reporte de Pedidos',
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reporte de Stock por Usuario
app.get('/api/reportes/stock-usuarios', authMiddleware, requirePermission('reports.view'), (req, res) => {
  try {
    const { usuarioId } = req.query;
    const data = getStockPorUsuarioReport({ usuarioId });
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'VIEW',
      modulo: 'reportes',
      entidadDescripcion: 'Reporte de Stock por Usuario',
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reporte de Movimientos
app.get('/api/reportes/movimientos', authMiddleware, requirePermission('reports.view'), (req, res) => {
  try {
    const { fechaInicio, fechaFin, tipo } = req.query;
    const data = getMovimientosReport({ fechaInicio, fechaFin, tipo });
    
    logAudit({
      usuarioId: req.user.id,
      accion: 'VIEW',
      modulo: 'reportes',
      entidadDescripcion: 'Reporte de Movimientos',
      ip: req.auditInfo?.ip,
      userAgent: req.auditInfo?.userAgent
    });
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Resumen Ejecutivo para Reportes
app.get('/api/reportes/resumen', authMiddleware, requirePermission('reports.view'), (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const data = getResumenEjecutivo({ fechaInicio, fechaFin });
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Servir el frontend para todas las rutas no API (debe ir al final)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, '0.0.0.0', () => {
  console.log(`API escuchando en http://localhost:${port}/api`);
});
