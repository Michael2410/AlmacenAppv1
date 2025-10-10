import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'dev-secret';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  console.log('Auth header:', auth);
  console.log('Token extracted:', token ? token.substring(0, 20) + '...' : 'No token');
  
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log('Token payload:', payload);
    req.user = payload;
    next();
  } catch (e) {
    console.error('Token verification error:', e.message);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.roleId !== 'role-admin') {
    return res.status(403).json({ success: false, message: 'Prohibido - Se requiere rol de administrador' });
  }
  next();
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
  if (!user) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  
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
    res.json({ success: true, data: { id, nombres, email, roleId } });
  } catch (e) {
    res.status(400).json({ success: false, message: 'No se pudo crear usuario' });
  }
});
app.put('/api/users/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nombres, email, roleId, password } = req.body;
  const sets = [];
  const vals = [];
  if (nombres) { sets.push('nombres = ?'); vals.push(nombres); }
  if (email) { sets.push('email = ?'); vals.push(email); }
  if (roleId) { sets.push('roleId = ?'); vals.push(roleId); }
  if (password) { sets.push('passwordHash = ?'); vals.push(bcrypt.hashSync(password, 10)); }
  if (!sets.length) return res.json({ success: true, data: null });
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  const u = db.prepare('SELECT id, nombres, email, roleId FROM users WHERE id = ?').get(id);
  res.json({ success: true, data: u });
});
app.delete('/api/users/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
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
  const { nombre, direccion, contacto, telefono } = req.body;
  const id = `p${Date.now()}`;
  db.prepare('INSERT INTO proveedores (id, nombre, direccion, contacto, telefono) VALUES (?,?,?,?,?)')
    .run(id, nombre, direccion, contacto, telefono ?? null);
  res.json({ success: true, data: { id, nombre, direccion, contacto, telefono } });
});
app.put('/api/proveedores/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre, direccion, contacto, telefono } = req.body;
  db.prepare('UPDATE proveedores SET nombre=?, direccion=?, contacto=?, telefono=? WHERE id=?')
    .run(nombre, direccion, contacto, telefono ?? null, id);
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
    const list = db.prepare('SELECT * FROM productos').all();
    console.log('Productos en BD:', list.length, list);
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});
app.post('/api/productos', authMiddleware, requireAdmin, (req, res) => {
  const { nombre, unidad, areaId, ubicacionId, activo = true, marca } = req.body;
  const id = `pr${Date.now()}`;
  db.prepare('INSERT INTO productos (id, nombre, unidad, areaId, ubicacionId, activo, marca) VALUES (?,?,?,?,?,?,?)')
    .run(id, nombre, unidad, areaId, ubicacionId, activo ? 1 : 0, marca ?? null);
  res.json({ success: true, data: { id, nombre, unidad, areaId, ubicacionId, activo: !!activo, marca: marca ?? null } });
});
app.put('/api/productos/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre, unidad, areaId, ubicacionId, activo, marca } = req.body;
  const sets = [];
  const vals = [];
  if (nombre != null) { sets.push('nombre = ?'); vals.push(nombre); }
  if (unidad != null) { sets.push('unidad = ?'); vals.push(unidad); }
  if (areaId != null) { sets.push('areaId = ?'); vals.push(areaId); }
  if (ubicacionId != null) { sets.push('ubicacionId = ?'); vals.push(ubicacionId); }
  if (activo != null) { sets.push('activo = ?'); vals.push(!!activo ? 1 : 0); }
  if (marca !== undefined) { sets.push('marca = ?'); vals.push(marca ?? null); }
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
  const { productoId, proveedorId, nombre, fechaIngreso, cantidad, precio, fechaVencimiento = null, numeroSerie = null, serieFactura = null, fechaFactura = null, marca = null } = req.body;
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
  
  db.prepare('INSERT INTO ingresos (id, productoId, proveedorId, nombre, fechaIngreso, cantidad, unidad, precio, areaId, ubicacionId, fechaVencimiento, numeroSerie, serieFactura, fechaFactura, marca) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, productoId, proveedorId, nombreFinal, fechaIngreso, cantidad, unidad, precio, areaId, ubicacionId, fechaVencimiento, numeroSerie, serieFactura, fechaFactura, marca);
  res.json({ success: true, data: { id, productoId, proveedorId, nombre: nombreFinal, fechaIngreso, cantidad, unidad, precio, areaId, ubicacionId, fechaVencimiento, numeroSerie, serieFactura, fechaFactura, marca } });
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
    fechaSolicitud: p.fechaSolicitud || p.fecha,
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
    console.log('📋 Consultando pedidos para admin...');
    const pedidos = db.prepare(`
      SELECT p.*, pr.nombre as producto_nombre, pr.unidad as producto_unidad, pr.marca as producto_marca,
             u.nombres as usuario_nombres,
             COALESCE(p.fechaSolicitud, p.fecha) as fecha_pedido
      FROM pedidos p
      JOIN productos pr ON p.productoId = pr.id
      JOIN users u ON p.usuarioId = u.id
      ORDER BY fecha_pedido DESC
    `).all();
    
    console.log('📋 Pedidos encontrados:', pedidos.length);
    
    const pedidosFormatted = pedidos.map(p => ({
      id: p.id,
      usuarioId: p.usuarioId,
      usuarioNombre: p.usuario_nombres,
      productoId: p.productoId,
      productoNombre: p.producto_nombre,
      cantidad: p.cantidad,
      unidad: p.producto_unidad,
      estado: p.estado,
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
app.get('/api/salidas', authMiddleware, (req, res) => {
  const list = db.prepare('SELECT * FROM user_salidas WHERE usuarioId = ? ORDER BY fecha DESC').all(req.user.id);
  res.json({ success: true, data: list });
});
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
app.get('/api/stock/general', authMiddleware, requireAdmin, (req, res) => {
  const productos = db.prepare('SELECT * FROM productos').all();
  const rows = db.prepare(`
    SELECT i.productoId, i.marca, i.unidad,
           COALESCE(SUM(i.cantidad),0) - COALESCE((
             SELECT SUM(us.cantidad) FROM user_stock us WHERE us.productoId = i.productoId AND (
               (us.marca IS NULL AND i.marca IS NULL) OR (us.marca = i.marca)
             )
           ),0) AS disponible
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
  const totIng = db.prepare('SELECT COALESCE(SUM(cantidad),0) as s FROM ingresos WHERE productoId = ? AND (marca IS ? OR marca = ?)').get(productoId, marca, marca).s;
  const totAsg = db.prepare('SELECT COALESCE(SUM(cantidad),0) as s FROM user_stock WHERE productoId = ? AND (marca IS ? OR marca = ?)').get(productoId, marca, marca).s;
  const disponible = (totIng || 0) - (totAsg || 0);
  if (cantidad > disponible) {
    return res.status(400).json({ success: false, message: 'Stock insuficiente' });
  }
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
    ? db.prepare('SELECT * FROM pedidos ORDER BY fecha DESC').all()
    : db.prepare('SELECT * FROM pedidos WHERE usuarioId = ? ORDER BY fecha DESC').all(req.user.id);
  
  // Agrupar por loteId
  const grupos = {};
  allPedidos.forEach(pedido => {
    const loteId = pedido.loteId || pedido.id; // fallback para pedidos viejos sin loteId
    if (!grupos[loteId]) {
      grupos[loteId] = {
        loteId,
        usuarioId: pedido.usuarioId,
        fecha: pedido.fecha,
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
    console.log('🛍️ Creando pedido - Body completo:', req.body);
    console.log('🛍️ Usuario:', req.user);

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

    console.log('🛍️ Datos normalizados:', { productoId, cantidad, unidad, marca, observaciones });

    if (!productoId || !cantidad || Number.isNaN(cantidad) || cantidad <= 0 || !unidad) {
      console.log('❌ Datos inválidos:', { productoId, cantidad, unidad });
      return res.status(400).json({ success: false, message: 'Datos inválidos para crear el pedido' });
    }

    const id = `req${Date.now()}`;
    const fecha = new Date().toISOString();
    const loteId = `lote${Date.now()}`;

    console.log('🛍️ Insertando en BD:', { id, usuarioId: req.user.id, productoId, cantidad, unidad, marca, observaciones });

  db.prepare('INSERT INTO pedidos (id, usuarioId, productoId, cantidad, unidad, estado, fecha, loteId, marca) VALUES (?,?,?,?,?,?,?,?,?)')
  .run(id, req.user.id, productoId, cantidad, unidad, 'pendiente', fecha, loteId, marca);

  const result = { id, usuarioId: req.user.id, productoId, cantidad, unidad, estado: 'pendiente', fecha, loteId, marca, observaciones };
    console.log('✅ Pedido creado exitosamente:', result);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error al crear pedido:', error);
    res.status(500).json({ success: false, message: 'Error al crear pedido', error: error.message });
  }
});
// Crear múltiples pedidos en una sola solicitud
app.post('/api/pedidos/batch', authMiddleware, (req, res) => {
  try {
    console.log('🛍️ Batch pedidos - Body:', req.body);
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      console.log('❌ items no es array o está vacío');
      return res.status(400).json({ success: false, message: 'No hay items que procesar' });
    }
    const stmt = db.prepare('INSERT INTO pedidos (id, usuarioId, productoId, cantidad, unidad, estado, fecha, loteId, marca) VALUES (?,?,?,?,?,?,?,?,?)');
    const fecha = new Date().toISOString();
    const loteId = `lote${Date.now()}`;
    const created = [];
    for (const it of items) {
      let { productoId, cantidad, unidad, marca = null } = it || {};
      cantidad = Number(cantidad);
      
      console.log('🛍️ Procesando item:', { productoId, cantidad, unidad, marca });
      
      if (!productoId || !cantidad || Number.isNaN(cantidad) || cantidad <= 0) {
        console.log('❌ Item inválido (falta productoId o cantidad)');
        continue;
      }
      
      // Completar unidad y marca desde productos si faltan
      if (!unidad || !marca) {
        const prod = db.prepare('SELECT * FROM productos WHERE id = ?').get(productoId);
        if (prod) {
          unidad = unidad || prod.unidad || 'UNIDAD';
          marca = marca || prod.marca || null;
          console.log('✅ Completado desde producto:', { unidad, marca });
        }
      }
      
      if (!unidad) {
        console.log('❌ No se pudo determinar unidad');
        continue;
      }
      
      const id = `req${Date.now()}${Math.floor(Math.random()*1000)}`;
      stmt.run(id, req.user.id, productoId, cantidad, unidad, 'pendiente', fecha, loteId, marca);
      created.push({ id, usuarioId: req.user.id, productoId, cantidad, unidad, estado: 'pendiente', fecha, loteId, marca });
      console.log('✅ Item creado:', id);
    }
    if (!created.length) {
      console.log('❌ No se creó ningún item válido');
      return res.status(400).json({ success: false, message: 'Items inválidos' });
    }
    console.log('✅ Batch exitoso:', created.length, 'items');
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

  // Validar disponibilidad para cada pedido del lote
  for (const pedido of pedidos) {
    // Validar disponibilidad considerando la marca específica del pedido
    const marca = pedido.marca || null;
    const totIng = db.prepare('SELECT COALESCE(SUM(cantidad),0) as s FROM ingresos WHERE productoId = ? AND (marca IS ? OR marca = ?)').get(pedido.productoId, marca, marca).s;
    const totAsg = db.prepare('SELECT COALESCE(SUM(cantidad),0) as s FROM user_stock WHERE productoId = ? AND (marca IS ? OR marca = ?)').get(pedido.productoId, marca, marca).s;
    const disponible = (totIng || 0) - (totAsg || 0);
    
    if (pedido.cantidad > disponible) {
      return res.status(400).json({ 
        success: false, 
        message: `Stock insuficiente para ${pedido.productoId}${marca ? ` (marca: ${marca})` : ''}. Disponible: ${disponible}, Solicitado: ${pedido.cantidad}` 
      });
    }
  }

  // Si todos tienen stock disponible, proceder con la entrega
  for (const pedido of pedidos) {
    const sid = `s${Date.now()}${Math.floor(Math.random()*1000)}`;
    const marca = pedido.marca || null;
    db.prepare('INSERT INTO user_stock (id, usuarioId, productoId, cantidad, unidad, areaId, ubicacionId, marca) VALUES (?,?,?,?,?,?,?,?)')
      .run(sid, pedido.usuarioId, pedido.productoId, pedido.cantidad, pedido.unidad, 'a1', 'u1', marca);
  }

  // Actualizar estado del lote completo
  db.prepare('UPDATE pedidos SET estado=? WHERE loteId=?').run('entregado', loteId);
  
  res.json({ success: true, data: { message: 'Lote entregado exitosamente' } });
});
app.post('/api/pedidos/:id/asignar', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { marca = null } = req.body;
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
  if (!pedido) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
  // validar disponibilidad por marca
  const totIng = db.prepare('SELECT COALESCE(SUM(cantidad),0) as s FROM ingresos WHERE productoId = ? AND (marca IS ? OR marca = ?)').get(pedido.productoId, marca, marca).s;
  const totAsg = db.prepare('SELECT COALESCE(SUM(cantidad),0) as s FROM user_stock WHERE productoId = ? AND (marca IS ? OR marca = ?)').get(pedido.productoId, marca, marca).s;
  const disponible = (totIng || 0) - (totAsg || 0);
  if (pedido.cantidad > disponible) return res.status(400).json({ success: false, message: 'Stock insuficiente' });
  // Registrar en user_stock (asignación)
  const sid = `s${Date.now()}`;
  db.prepare('INSERT INTO user_stock (id, usuarioId, productoId, cantidad, unidad, areaId, ubicacionId, marca) VALUES (?,?,?,?,?,?,?,?)')
    .run(sid, pedido.usuarioId, pedido.productoId, pedido.cantidad, pedido.unidad, 'a1', 'u1', marca);
  db.prepare('UPDATE pedidos SET estado=? WHERE id=?').run('entregado', id);
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
    
    console.log('🔧 Auto-login user2 exitoso, token generado:', token.substring(0, 20) + '...');
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

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}/api`));
