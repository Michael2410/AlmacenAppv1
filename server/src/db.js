import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('almacen.db');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nombres TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  roleId TEXT NOT NULL,
  passwordHash TEXT NOT NULL
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
  activo INTEGER NOT NULL
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

// seed admin if not exists
const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@demo.com');
if (!admin) {
  const id = 'u1';
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, nombres, email, roleId, passwordHash) VALUES (?,?,?,?,?)')
    .run(id, 'Admin', 'admin@demo.com', 'role-encargado', hash);
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

export default db;
