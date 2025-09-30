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
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.roleId !== 'role-encargado') return res.status(403).json({ success: false, message: 'Prohibido' });
  next();
}

// Auth
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  const token = jwt.sign({ id: user.id, email: user.email, roleId: user.roleId }, JWT_SECRET, { expiresIn: '8h' });
  const { passwordHash, ...safe } = user;
  res.json({ success: true, data: { token, user: safe } });
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
  const list = db.prepare('SELECT * FROM productos').all();
  res.json({ success: true, data: list });
});
app.post('/api/productos', authMiddleware, requireAdmin, (req, res) => {
  const { nombre, unidad, areaId, ubicacionId, activo = true } = req.body;
  const id = `pr${Date.now()}`;
  db.prepare('INSERT INTO productos (id, nombre, unidad, areaId, ubicacionId, activo) VALUES (?,?,?,?,?,?)')
    .run(id, nombre, unidad, areaId, ubicacionId, activo ? 1 : 0);
  res.json({ success: true, data: { id, nombre, unidad, areaId, ubicacionId, activo: !!activo } });
});
app.put('/api/productos/:id', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre, unidad, areaId, ubicacionId, activo } = req.body;
  const sets = [];
  const vals = [];
  if (nombre != null) { sets.push('nombre = ?'); vals.push(nombre); }
  if (unidad != null) { sets.push('unidad = ?'); vals.push(unidad); }
  if (areaId != null) { sets.push('areaId = ?'); vals.push(areaId); }
  if (ubicacionId != null) { sets.push('ubicacionId = ?'); vals.push(ubicacionId); }
  if (activo != null) { sets.push('activo = ?'); vals.push(!!activo ? 1 : 0); }
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
  const list = db.prepare('SELECT * FROM ingresos').all();
  res.json({ success: true, data: list });
});
app.post('/api/ingresos', authMiddleware, requireAdmin, (req, res) => {
  const { productoId, proveedorId, nombre, fechaIngreso, cantidad, unidad, precio, areaId, ubicacionId, fechaVencimiento = null, numeroSerie = null, serieFactura = null, fechaFactura = null, marca = null } = req.body;
  if (!productoId || !proveedorId || !fechaIngreso || !cantidad || !unidad || !precio || !areaId || !ubicacionId) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }
  const id = `i${Date.now()}`;
  // Derivar nombre si no viene, usando el nombre del producto
  let nombreFinal = nombre;
  if (!nombreFinal) {
    const prod = db.prepare('SELECT nombre FROM productos WHERE id = ?').get(productoId);
    nombreFinal = prod?.nombre || '';
  }
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
    return { ...p, productoId: r.productoId, nombre: p.nombre, unidad: r.unidad, marca: r.marca || null, cantidadDisponible: r.disponible };
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
  // admin ve todos, user ve propios
  const isAdmin = req.user.roleId === 'role-encargado';
  const list = isAdmin
    ? db.prepare('SELECT * FROM pedidos').all()
    : db.prepare('SELECT * FROM pedidos WHERE usuarioId = ?').all(req.user.id);
  res.json({ success: true, data: list });
});
app.post('/api/pedidos', authMiddleware, (req, res) => {
  const { productoId, cantidad, unidad } = req.body;
  const id = `req${Date.now()}`;
  const fecha = new Date().toISOString();
  db.prepare('INSERT INTO pedidos (id, usuarioId, productoId, cantidad, unidad, estado, fecha) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user.id, productoId, cantidad, unidad, 'PENDIENTE', fecha);
  res.json({ success: true, data: { id, usuarioId: req.user.id, productoId, cantidad, unidad, estado: 'PENDIENTE', fecha } });
});
// Crear múltiples pedidos en una sola solicitud
app.post('/api/pedidos/batch', authMiddleware, (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'No hay items que procesar' });
  }
  const stmt = db.prepare('INSERT INTO pedidos (id, usuarioId, productoId, cantidad, unidad, estado, fecha) VALUES (?,?,?,?,?,?,?)');
  const fecha = new Date().toISOString();
  const created = [];
  for (const it of items) {
    const { productoId, cantidad, unidad } = it || {};
    if (!productoId || !cantidad || !unidad) continue;
    const id = `req${Date.now()}${Math.floor(Math.random()*1000)}`;
    stmt.run(id, req.user.id, productoId, cantidad, unidad, 'PENDIENTE', fecha);
    created.push({ id, usuarioId: req.user.id, productoId, cantidad, unidad, estado: 'PENDIENTE', fecha });
  }
  if (!created.length) return res.status(400).json({ success: false, message: 'Items inválidos' });
  res.json({ success: true, data: created });
});
app.put('/api/pedidos/:id/estado', authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params; const { estado } = req.body;
  db.prepare('UPDATE pedidos SET estado=? WHERE id=?').run(estado, id);
  const p = db.prepare('SELECT * FROM pedidos WHERE id=?').get(id);
  res.json({ success: true, data: p });
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
  db.prepare('UPDATE pedidos SET estado=? WHERE id=?').run('ENTREGADO', id);
  res.json({ success: true, data: { ok: true } });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}/api`));
