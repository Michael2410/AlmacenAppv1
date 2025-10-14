import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('almacen.db');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nombres TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  roleId TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  permissions TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  permissions TEXT NOT NULL,
  predefined INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS proveedores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  contacto TEXT NOT NULL,
  telefono TEXT
);
CREATE TABLE IF NOT EXISTS productos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  unidad TEXT NOT NULL,
  areaId TEXT NOT NULL,
  ubicacionId TEXT NOT NULL,
  activo INTEGER NOT NULL,
  marca TEXT
);
CREATE TABLE IF NOT EXISTS ingresos (
  id TEXT PRIMARY KEY,
  productoId TEXT NOT NULL,
  proveedorId TEXT NOT NULL,
  nombre TEXT NOT NULL,
  fechaIngreso TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  precio REAL NOT NULL,
  areaId TEXT NOT NULL,
  ubicacionId TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ubicaciones (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS unidades_medida (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  simbolo TEXT NOT NULL,
  activo INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS user_stock (
  id TEXT PRIMARY KEY,
  usuarioId TEXT NOT NULL,
  productoId TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  areaId TEXT NOT NULL,
  ubicacionId TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_salidas (
  id TEXT PRIMARY KEY,
  usuarioId TEXT NOT NULL,
  productoId TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  fecha TEXT NOT NULL,
  observacion TEXT
);
CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  usuarioId TEXT NOT NULL,
  productoId TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  estado TEXT NOT NULL, -- PENDIENTE | APROBADO | RECHAZADO | ENTREGADO
  fecha TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auditoria (
  id TEXT PRIMARY KEY,
  fecha_hora TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  usuario_nombre TEXT,
  accion TEXT NOT NULL,
  modulo TEXT NOT NULL,
  descripcion TEXT,
  ip TEXT
);
`);

// Simple migrations: add missing columns to ingresos
try {
  const cols = db.prepare("PRAGMA table_info('ingresos')").all();
  const hasFV = cols.some((c) => c.name === 'fechaVencimiento');
  const hasNS = cols.some((c) => c.name === 'numeroSerie');
  const hasSF = cols.some((c) => c.name === 'serieFactura');
  const hasFF = cols.some((c) => c.name === 'fechaFactura');
  const hasMarcaIng = cols.some((c) => c.name === 'marca');
  if (!hasFV) db.exec("ALTER TABLE ingresos ADD COLUMN fechaVencimiento TEXT");
  if (!hasNS) db.exec("ALTER TABLE ingresos ADD COLUMN numeroSerie TEXT");
  if (!hasSF) db.exec("ALTER TABLE ingresos ADD COLUMN serieFactura TEXT");
  if (!hasFF) db.exec("ALTER TABLE ingresos ADD COLUMN fechaFactura TEXT");
  if (!hasMarcaIng) db.exec("ALTER TABLE ingresos ADD COLUMN marca TEXT");
} catch (e) {
  // noop: best-effort
}

// user_stock: add marca column if missing
try {
  const colsUS = db.prepare("PRAGMA table_info('user_stock')").all();
  const hasMarcaUS = colsUS.some((c) => c.name === 'marca');
  if (!hasMarcaUS) db.exec("ALTER TABLE user_stock ADD COLUMN marca TEXT");
} catch { /* noop */ }

// productos: add marca column if missing
try {
  const colsProd = db.prepare("PRAGMA table_info('productos')").all();
  const hasMarcaProd = colsProd.some((c) => c.name === 'marca');
  if (!hasMarcaProd) db.exec("ALTER TABLE productos ADD COLUMN marca TEXT");
} catch { /* noop */ }

// users: add permissions column if missing
try {
  const colsUsers = db.prepare("PRAGMA table_info('users')").all();
  const hasPermissions = colsUsers.some((c) => c.name === 'permissions');
  if (!hasPermissions) db.exec("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]'");
} catch { /* noop */ }

// roles: check if table exists and create if not
try {
  const rolesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='roles'").get();
  if (!rolesTable) {
    db.exec(`
      CREATE TABLE roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        permissions TEXT NOT NULL,
        predefined INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1
      );
    `);
  }
} catch { /* noop */ }

// pedidos: add missing columns if needed
try {
  const colsPedidos = db.prepare("PRAGMA table_info('pedidos')").all();
  const hasObservaciones = colsPedidos.some((c) => c.name === 'observaciones');
  const hasFechaSolicitud = colsPedidos.some((c) => c.name === 'fechaSolicitud');
  const hasFechaRespuesta = colsPedidos.some((c) => c.name === 'fechaRespuesta');
  
  if (!hasObservaciones) db.exec("ALTER TABLE pedidos ADD COLUMN observaciones TEXT");
  if (!hasFechaSolicitud) {
    // Rename fecha to fechaSolicitud if needed
    db.exec("ALTER TABLE pedidos ADD COLUMN fechaSolicitud TEXT");
    db.exec("UPDATE pedidos SET fechaSolicitud = fecha WHERE fechaSolicitud IS NULL");
  }
  if (!hasFechaRespuesta) db.exec("ALTER TABLE pedidos ADD COLUMN fechaRespuesta TEXT");
} catch { /* noop */ }

// pedidos: add loteId column if missing
try {
  const colsPed = db.prepare("PRAGMA table_info('pedidos')").all();
  const hasLoteId = colsPed.some((c) => c.name === 'loteId');
  const hasMarcaPed = colsPed.some((c) => c.name === 'marca');
  if (!hasLoteId) db.exec("ALTER TABLE pedidos ADD COLUMN loteId TEXT");
  if (!hasMarcaPed) db.exec("ALTER TABLE pedidos ADD COLUMN marca TEXT");
} catch { /* noop */ }

// users: add permissions column if missing
try {
  const colsUsers = db.prepare("PRAGMA table_info('users')").all();
  const hasPermissionsCol = colsUsers.some((c) => c.name === 'permissions');
  if (!hasPermissionsCol) db.exec("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]'");
} catch { /* noop */ }

// Seed predefined roles
// Ensure predefined roles are up-to-date
const rolesCount = db.prepare('SELECT COUNT(*) as count FROM roles').get();
if (rolesCount.count === 0) {
  // First time setup - create only admin role
  const predefinedRoles = [
    {
      id: 'role-admin',
      name: 'Administrador',
      permissions: JSON.stringify([
        'users.manage', 'roles.manage', 'system.config',
        'providers.view', 'providers.create', 'providers.update', 'providers.delete',
        'products.view', 'products.create', 'products.update', 'products.delete',
        'ingresos.view', 'ingresos.create', 'ingresos.update', 'ingresos.delete',
        'inventory.viewSelf', 'inventory.viewAll', 'inventory.assign',
        'reports.view', 'reports.export', 'reports.advanced',
        'pedidos.view', 'pedidos.approve', 'pedidos.reject', 'pedidos.deliver',
        'areas.manage', 'ubicaciones.manage', 'unidades.manage'
      ]),
      predefined: 1
    }
  ];
  
  const insertRole = db.prepare('INSERT INTO roles (id, name, permissions, predefined, active) VALUES (?,?,?,?,?)');
  predefinedRoles.forEach(role => {
    insertRole.run(role.id, role.name, role.permissions, role.predefined, 1);
  });
} else {
  // Update existing predefined roles (only admin)
  const existingRoles = db.prepare('SELECT * FROM roles WHERE predefined = 1').all();
  const predefinedRoles = [
    {
      id: 'role-admin',
      name: 'Administrador',
      permissions: JSON.stringify([
        'users.manage', 'roles.manage', 'system.config',
        'providers.view', 'providers.create', 'providers.update', 'providers.delete',
        'products.view', 'products.create', 'products.update', 'products.delete',
        'ingresos.view', 'ingresos.create', 'ingresos.update', 'ingresos.delete',
        'inventory.viewSelf', 'inventory.viewAll', 'inventory.assign',
        'reports.view', 'reports.export', 'reports.advanced',
        'pedidos.view', 'pedidos.approve', 'pedidos.reject', 'pedidos.deliver',
        'areas.manage', 'ubicaciones.manage', 'unidades.manage'
      ]),
      predefined: 1
    }
  ];

  const updateRole = db.prepare('UPDATE roles SET permissions = ? WHERE id = ? AND predefined = 1');
  predefinedRoles.forEach(role => {
    const existing = existingRoles.find(r => r.id === role.id);
    if (existing) {
      updateRole.run(role.permissions, role.id);
    }
  });
}

// seed admin if not exists
const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@demo.com');
if (!admin) {
  const id = 'u1';
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, nombres, email, roleId, passwordHash, permissions) VALUES (?,?,?,?,?,?)')
    .run(id, 'Administrador', 'admin@demo.com', 'role-admin', hash, '[]');
}

// seed unidades de medida if not exists
const unidadesCount = db.prepare('SELECT COUNT(*) as count FROM unidades_medida').get();
if (unidadesCount.count === 0) {
  const unidadesBasicas = [
    { id: 'um1', nombre: 'Unidad', simbolo: 'UNIDAD' },
    { id: 'um2', nombre: 'Caja', simbolo: 'CAJA' },
    { id: 'um3', nombre: 'Paquete', simbolo: 'PAQUETE' },
    { id: 'um4', nombre: 'Kilogramo', simbolo: 'KG' },
    { id: 'um5', nombre: 'Gramo', simbolo: 'G' },
    { id: 'um6', nombre: 'Litro', simbolo: 'L' },
    { id: 'um7', nombre: 'Mililitro', simbolo: 'ML' },
    { id: 'um8', nombre: 'Metro', simbolo: 'M' },
    { id: 'um9', nombre: 'Centímetro', simbolo: 'CM' },
  ];
  
  const insertUnidad = db.prepare('INSERT INTO unidades_medida (id, nombre, simbolo, activo) VALUES (?,?,?,?)');
  unidadesBasicas.forEach(u => {
    insertUnidad.run(u.id, u.nombre, u.simbolo, 1);
  });
}

// seed basic refs
const areaCount = db.prepare('SELECT COUNT(*) as c FROM areas').get().c;
if (!areaCount) {
  db.prepare('INSERT INTO areas (id, nombre) VALUES (?,?)').run('a1','Principal');
  db.prepare('INSERT INTO areas (id, nombre) VALUES (?,?)').run('a2','Secundario');
}
const ubCount = db.prepare('SELECT COUNT(*) as c FROM ubicaciones').get().c;
if (!ubCount) {
  db.prepare('INSERT INTO ubicaciones (id, nombre) VALUES (?,?)').run('u1','Estante A');
  db.prepare('INSERT INTO ubicaciones (id, nombre) VALUES (?,?)').run('u2','Estante B');
}

// seed some productos with marca
const prodCount = db.prepare('SELECT COUNT(*) as c FROM productos').get().c;
if (!prodCount) {
  // Check if marca column exists
  const prodCols = db.prepare("PRAGMA table_info('productos')").all();
  const hasMarca = prodCols.some((c) => c.name === 'marca');
  
  if (hasMarca) {
    db.prepare('INSERT INTO productos (id, nombre, marca, unidad, areaId, ubicacionId, activo) VALUES (?,?,?,?,?,?,?)')
      .run('pr1', 'Tornillo Hexagonal', 'Stanley', 'UNIDAD', 'a1', 'u1', 1);
    db.prepare('INSERT INTO productos (id, nombre, marca, unidad, areaId, ubicacionId, activo) VALUES (?,?,?,?,?,?,?)')
      .run('pr2', 'Cable Eléctrico', 'Indeco', 'M', 'a2', 'u2', 1);
    db.prepare('INSERT INTO productos (id, nombre, marca, unidad, areaId, ubicacionId, activo) VALUES (?,?,?,?,?,?,?)')
      .run('pr3', 'Destornillador', 'Bahco', 'UNIDAD', 'a1', 'u1', 1);
  } else {
    db.prepare('INSERT INTO productos (id, nombre, unidad, areaId, ubicacionId, activo) VALUES (?,?,?,?,?,?)')
      .run('pr1', 'Tornillo Hexagonal', 'UNIDAD', 'a1', 'u1', 1);
    db.prepare('INSERT INTO productos (id, nombre, unidad, areaId, ubicacionId, activo) VALUES (?,?,?,?,?,?)')
      .run('pr2', 'Cable Eléctrico', 'M', 'a2', 'u2', 1);
    db.prepare('INSERT INTO productos (id, nombre, unidad, areaId, ubicacionId, activo) VALUES (?,?,?,?,?,?)')
      .run('pr3', 'Destornillador', 'UNIDAD', 'a1', 'u1', 1);
  }
}

export default db;
