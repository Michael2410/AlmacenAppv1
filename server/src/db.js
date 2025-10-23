import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('almacen.db');

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// ========================================
// TABLAS PRINCIPALES
// ========================================

db.exec(`
-- Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  permissions TEXT NOT NULL,
  predefined INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nombres TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  roleId TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  permissions TEXT DEFAULT '[]',
  FOREIGN KEY (roleId) REFERENCES roles(id)
);

-- Tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  ruc TEXT,
  direccion TEXT NOT NULL,
  contacto TEXT NOT NULL,
  telefono TEXT
);

-- Tabla de áreas
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

-- Tabla de ubicaciones
CREATE TABLE IF NOT EXISTS ubicaciones (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

-- Tabla de unidades de medida
CREATE TABLE IF NOT EXISTS unidades_medida (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  simbolo TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  marca TEXT,
  unidad TEXT NOT NULL,
  areaId TEXT NOT NULL,
  ubicacionId TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  dias_alerta_stock INTEGER DEFAULT 10,
  dias_vencimiento_critico INTEGER DEFAULT 7,
  dias_vencimiento_urgente INTEGER DEFAULT 15,
  dias_vencimiento_atencion INTEGER DEFAULT 30,
  FOREIGN KEY (areaId) REFERENCES areas(id),
  FOREIGN KEY (ubicacionId) REFERENCES ubicaciones(id)
);

-- Tabla de ingresos
CREATE TABLE IF NOT EXISTS ingresos (
  id TEXT PRIMARY KEY,
  productoId TEXT NOT NULL,
  proveedorId TEXT NOT NULL,
  nombre TEXT NOT NULL,
  fechaIngreso TEXT NOT NULL,
  cantidad REAL NOT NULL,
  cantidad_disponible REAL NOT NULL,
  unidad TEXT NOT NULL,
  precio REAL NOT NULL,
  areaId TEXT NOT NULL,
  ubicacionId TEXT NOT NULL,
  fechaVencimiento TEXT,
  fechaFactura TEXT,
  serieFactura TEXT,
  marca TEXT,
  FOREIGN KEY (productoId) REFERENCES productos(id),
  FOREIGN KEY (proveedorId) REFERENCES proveedores(id),
  FOREIGN KEY (areaId) REFERENCES areas(id),
  FOREIGN KEY (ubicacionId) REFERENCES ubicaciones(id)
);

-- Tabla de stock de usuarios
CREATE TABLE IF NOT EXISTS user_stock (
  id TEXT PRIMARY KEY,
  usuarioId TEXT NOT NULL,
  productoId TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  marca TEXT,
  areaId TEXT NOT NULL,
  ubicacionId TEXT NOT NULL,
  FOREIGN KEY (usuarioId) REFERENCES users(id),
  FOREIGN KEY (productoId) REFERENCES productos(id),
  FOREIGN KEY (areaId) REFERENCES areas(id),
  FOREIGN KEY (ubicacionId) REFERENCES ubicaciones(id)
);

-- Tabla de salidas de usuarios
CREATE TABLE IF NOT EXISTS user_salidas (
  id TEXT PRIMARY KEY,
  usuarioId TEXT NOT NULL,
  productoId TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  fecha TEXT NOT NULL,
  observacion TEXT,
  FOREIGN KEY (usuarioId) REFERENCES users(id),
  FOREIGN KEY (productoId) REFERENCES productos(id)
);

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  loteId TEXT,
  usuarioId TEXT NOT NULL,
  productoId TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  marca TEXT,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE',
  fechaSolicitud TEXT NOT NULL,
  fechaRespuesta TEXT,
  observaciones TEXT,
  FOREIGN KEY (usuarioId) REFERENCES users(id),
  FOREIGN KEY (productoId) REFERENCES productos(id)
);

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS auditoria (
  id TEXT PRIMARY KEY,
  fecha_hora TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  usuario_nombre TEXT,
  accion TEXT NOT NULL,
  modulo TEXT NOT NULL,
  descripcion TEXT,
  ip TEXT,
  FOREIGN KEY (usuario_id) REFERENCES users(id)
);

-- Tabla de bajas de inventario
CREATE TABLE IF NOT EXISTS bajas_inventario (
  id TEXT PRIMARY KEY,
  ingreso_id TEXT NOT NULL,
  producto_id TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  motivo TEXT NOT NULL,
  observacion TEXT,
  fecha_baja TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  valor_perdida REAL,
  FOREIGN KEY (ingreso_id) REFERENCES ingresos(id),
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (usuario_id) REFERENCES users(id)
);

-- Tabla de devoluciones a proveedores
CREATE TABLE IF NOT EXISTS devoluciones_proveedor (
  id TEXT PRIMARY KEY,
  ingreso_id TEXT NOT NULL,
  proveedor_id TEXT NOT NULL,
  producto_id TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  motivo TEXT NOT NULL,
  observacion TEXT,
  fecha_devolucion TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE',
  valor_devuelto REAL,
  FOREIGN KEY (ingreso_id) REFERENCES ingresos(id),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (usuario_id) REFERENCES users(id)
);

-- Tabla de configuración de empresa
CREATE TABLE IF NOT EXISTS configuracion_empresa (
  id INTEGER PRIMARY KEY DEFAULT 1,
  nombre_empresa TEXT,
  ruc TEXT,
  logo_path TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CHECK (id = 1)
);

-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id TEXT PRIMARY KEY,
  numero TEXT UNIQUE NOT NULL,
  proveedor_id TEXT NOT NULL,
  fecha_cotizacion TEXT NOT NULL,
  observaciones TEXT,
  usuario_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  FOREIGN KEY (usuario_id) REFERENCES users(id)
);

-- Tabla de detalle de cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones_detalle (
  id TEXT PRIMARY KEY,
  cotizacion_id TEXT NOT NULL,
  producto_id TEXT NOT NULL,
  producto_nombre TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Tabla de órdenes de compra
CREATE TABLE IF NOT EXISTS ordenes_compra (
  id TEXT PRIMARY KEY,
  numero TEXT UNIQUE NOT NULL,
  proveedor_id TEXT NOT NULL,
  fecha_orden TEXT NOT NULL,
  fecha_entrega_estimada TEXT,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE',
  subtotal REAL NOT NULL DEFAULT 0,
  impuestos REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  condiciones_pago TEXT,
  notas TEXT,
  usuario_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  FOREIGN KEY (usuario_id) REFERENCES users(id)
);

-- Tabla de detalle de órdenes de compra
CREATE TABLE IF NOT EXISTS ordenes_compra_detalle (
  id TEXT PRIMARY KEY,
  orden_id TEXT NOT NULL,
  producto_id TEXT NOT NULL,
  producto_nombre TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  precio_unitario REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Tabla de seguimiento de entregas
CREATE TABLE IF NOT EXISTS seguimiento_entregas (
  id TEXT PRIMARY KEY,
  orden_id TEXT NOT NULL,
  fecha TEXT DEFAULT CURRENT_TIMESTAMP,
  estado TEXT NOT NULL,
  observaciones TEXT,
  usuario_id TEXT NOT NULL,
  FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES users(id)
);
`);

// ========================================
// ÍNDICES PARA MEJORAR RENDIMIENTO
// ========================================

try {
  db.exec(`
    -- Índices para búsquedas frecuentes
    CREATE INDEX IF NOT EXISTS idx_usuarios_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_usuarios_roleId ON users(roleId);
    CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
    CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
    CREATE INDEX IF NOT EXISTS idx_ingresos_producto ON ingresos(productoId);
    CREATE INDEX IF NOT EXISTS idx_ingresos_proveedor ON ingresos(proveedorId);
    CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos(fechaIngreso);
    CREATE INDEX IF NOT EXISTS idx_ingresos_vencimiento ON ingresos(fechaVencimiento);
    CREATE INDEX IF NOT EXISTS idx_user_stock_usuario ON user_stock(usuarioId);
    CREATE INDEX IF NOT EXISTS idx_user_stock_producto ON user_stock(productoId);
    CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuarioId);
    CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
    CREATE INDEX IF NOT EXISTS idx_pedidos_lote ON pedidos(loteId);
    CREATE INDEX IF NOT EXISTS idx_ordenes_proveedor ON ordenes_compra(proveedor_id);
    CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_compra(estado);
    CREATE INDEX IF NOT EXISTS idx_ordenes_fecha ON ordenes_compra(fecha_orden);
    CREATE INDEX IF NOT EXISTS idx_cotizaciones_proveedor ON cotizaciones(proveedor_id);
    CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha_hora);
  `);
} catch (e) {
  console.error('⚠️ Error al crear índices:', e);
}

// ========================================
// MIGRACIONES (BACKWARD COMPATIBILITY)
// ========================================

console.log('🔄 Verificando migraciones de base de datos...');

// ========================================
// MIGRACIONES (BACKWARD COMPATIBILITY)
// ========================================

console.log('🔄 Verificando migraciones de base de datos...');

// Migración: Agregar columnas faltantes a tablas existentes
try {
  const cols = db.prepare("PRAGMA table_info('ingresos')").all();
  const colNames = cols.map(c => c.name);
  
  if (!colNames.includes('fechaVencimiento')) {
    console.log('  ➕ Agregando columna fechaVencimiento a ingresos');
    db.exec("ALTER TABLE ingresos ADD COLUMN fechaVencimiento TEXT");
  }
  if (!colNames.includes('fechaFactura')) {
    console.log('  ➕ Agregando columna fechaFactura a ingresos');
    db.exec("ALTER TABLE ingresos ADD COLUMN fechaFactura TEXT");
  }
  if (!colNames.includes('serieFactura')) {
    console.log('  ➕ Agregando columna serieFactura a ingresos');
    db.exec("ALTER TABLE ingresos ADD COLUMN serieFactura TEXT");
  }
  if (!colNames.includes('marca')) {
    console.log('  ➕ Agregando columna marca a ingresos');
    db.exec("ALTER TABLE ingresos ADD COLUMN marca TEXT");
  }
  if (!colNames.includes('cantidad_disponible')) {
    console.log('  ➕ Agregando columna cantidad_disponible a ingresos');
    db.exec("ALTER TABLE ingresos ADD COLUMN cantidad_disponible REAL");
    
    // Inicializar cantidad_disponible con el valor de cantidad
    const ingresosExistentes = db.prepare('SELECT id, cantidad FROM ingresos WHERE cantidad_disponible IS NULL').all();
    if (ingresosExistentes.length > 0) {
      console.log(`  📦 Inicializando cantidad_disponible para ${ingresosExistentes.length} ingresos existentes`);
      const updateStmt = db.prepare('UPDATE ingresos SET cantidad_disponible = ? WHERE id = ?');
      const updateMany = db.transaction((ingresos) => {
        for (const ingreso of ingresos) {
          updateStmt.run(ingreso.cantidad, ingreso.id);
        }
      });
      updateMany(ingresosExistentes);
    }
  }
} catch (e) {
  console.error('⚠️ Error en migración de ingresos:', e.message);
}

// Migración: Agregar marca a user_stock
try {
  const colsUS = db.prepare("PRAGMA table_info('user_stock')").all();
  if (!colsUS.some(c => c.name === 'marca')) {
    console.log('  ➕ Agregando columna marca a user_stock');
    db.exec("ALTER TABLE user_stock ADD COLUMN marca TEXT");
  }
} catch (e) {
  console.error('⚠️ Error en migración de user_stock:', e.message);
}

// Migración: Agregar campos de alertas personalizadas a productos
try {
  const colsProd = db.prepare("PRAGMA table_info('productos')").all();
  const prodColNames = colsProd.map(c => c.name);
  
  if (!prodColNames.includes('dias_alerta_stock')) {
    console.log('  ➕ Agregando columnas de alertas personalizadas a productos');
    db.exec("ALTER TABLE productos ADD COLUMN dias_alerta_stock INTEGER DEFAULT 10");
  }
  if (!prodColNames.includes('dias_vencimiento_critico')) {
    db.exec("ALTER TABLE productos ADD COLUMN dias_vencimiento_critico INTEGER DEFAULT 7");
  }
  if (!prodColNames.includes('dias_vencimiento_urgente')) {
    db.exec("ALTER TABLE productos ADD COLUMN dias_vencimiento_urgente INTEGER DEFAULT 15");
  }
  if (!prodColNames.includes('dias_vencimiento_atencion')) {
    db.exec("ALTER TABLE productos ADD COLUMN dias_vencimiento_atencion INTEGER DEFAULT 30");
  }
} catch (e) {
  console.error('⚠️ Error en migración de productos:', e.message);
}

// Migración: Agregar RUC a proveedores
try {
  const colsProv = db.prepare("PRAGMA table_info('proveedores')").all();
  if (!colsProv.some(c => c.name === 'ruc')) {
    console.log('  ➕ Agregando columna ruc a proveedores');
    db.exec("ALTER TABLE proveedores ADD COLUMN ruc TEXT");
  }
} catch (e) {
  console.error('⚠️ Error en migración de proveedores:', e.message);
}

// Migración: Agregar loteId y marca a pedidos
try {
  const colsPed = db.prepare("PRAGMA table_info('pedidos')").all();
  const pedColNames = colsPed.map(c => c.name);
  
  if (!pedColNames.includes('loteId')) {
    console.log('  ➕ Agregando columna loteId a pedidos');
    db.exec("ALTER TABLE pedidos ADD COLUMN loteId TEXT");
  }
  if (!pedColNames.includes('marca')) {
    console.log('  ➕ Agregando columna marca a pedidos');
    db.exec("ALTER TABLE pedidos ADD COLUMN marca TEXT");
  }
  if (!pedColNames.includes('observaciones')) {
    console.log('  ➕ Agregando columna observaciones a pedidos');
    db.exec("ALTER TABLE pedidos ADD COLUMN observaciones TEXT");
  }
  if (!pedColNames.includes('fechaSolicitud')) {
    console.log('  ➕ Agregando columna fechaSolicitud a pedidos');
    db.exec("ALTER TABLE pedidos ADD COLUMN fechaSolicitud TEXT");
    // Copiar datos de fecha a fechaSolicitud si existe
    if (pedColNames.includes('fecha')) {
      db.exec("UPDATE pedidos SET fechaSolicitud = fecha WHERE fechaSolicitud IS NULL");
    }
  }
  if (!pedColNames.includes('fechaRespuesta')) {
    console.log('  ➕ Agregando columna fechaRespuesta a pedidos');
    db.exec("ALTER TABLE pedidos ADD COLUMN fechaRespuesta TEXT");
  }
} catch (e) {
  console.error('⚠️ Error en migración de pedidos:', e.message);
}

console.log('✅ Migraciones completadas');

// ========================================
// DATOS INICIALES (SEED)
// ========================================

console.log('🌱 Verificando datos iniciales...');

// Seed: Roles predefinidos
const rolesCount = db.prepare('SELECT COUNT(*) as count FROM roles').get();
if (rolesCount.count === 0) {
  console.log('  ➕ Creando rol de Administrador');
  const adminPermissions = [
    'users.manage', 'roles.manage', 'system.config',
    'providers.view', 'providers.create', 'providers.update', 'providers.delete',
    'products.view', 'products.create', 'products.update', 'products.delete',
    'ingresos.view', 'ingresos.create', 'ingresos.update', 'ingresos.delete',
    'inventory.viewSelf', 'inventory.viewAll', 'inventory.assign',
    'reports.view', 'reports.export', 'reports.advanced',
    'pedidos.view', 'pedidos.approve', 'pedidos.reject', 'pedidos.deliver',
    'vencidos.view', 'vencidos.baja', 'vencidos.devolucion',
    'cotizaciones.view', 'cotizaciones.create',
    'ordenes.view', 'ordenes.create', 'ordenes.update', 'ordenes.delete', 'ordenes.approve', 'ordenes.seguimiento',
    'empresa.config',
    'areas.manage', 'ubicaciones.manage', 'unidades.manage'
  ];
  
  db.prepare('INSERT INTO roles (id, name, permissions, predefined, active) VALUES (?,?,?,?,?)')
    .run('role-admin', 'Administrador', JSON.stringify(adminPermissions), 1, 1);
} else {
  // Actualizar permisos del rol admin existente
  const adminRole = db.prepare('SELECT * FROM roles WHERE id = ?').get('role-admin');
  if (adminRole) {
    const adminPermissions = [
      'users.manage', 'roles.manage', 'system.config',
      'providers.view', 'providers.create', 'providers.update', 'providers.delete',
      'products.view', 'products.create', 'products.update', 'products.delete',
      'ingresos.view', 'ingresos.create', 'ingresos.update', 'ingresos.delete',
      'inventory.viewSelf', 'inventory.viewAll', 'inventory.assign',
      'reports.view', 'reports.export', 'reports.advanced',
      'pedidos.view', 'pedidos.approve', 'pedidos.reject', 'pedidos.deliver',
      'vencidos.view', 'vencidos.baja', 'vencidos.devolucion',
      'cotizaciones.view', 'cotizaciones.create',
      'ordenes.view', 'ordenes.create', 'ordenes.update', 'ordenes.delete', 'ordenes.approve', 'ordenes.seguimiento',
      'empresa.config',
      'areas.manage', 'ubicaciones.manage', 'unidades.manage'
    ];
    db.prepare('UPDATE roles SET permissions = ? WHERE id = ?')
      .run(JSON.stringify(adminPermissions), 'role-admin');
  }
}

// Seed: Usuario administrador
const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@demo.com');
if (!admin) {
  console.log('  ➕ Creando usuario administrador (email: admin@demo.com, password: admin123)');
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, nombres, email, roleId, passwordHash, permissions) VALUES (?,?,?,?,?,?)')
    .run('u1', 'Administrador', 'admin@demo.com', 'role-admin', hash, '[]');
}

// Seed: Unidades de medida
const unidadesCount = db.prepare('SELECT COUNT(*) as count FROM unidades_medida').get();
if (unidadesCount.count === 0) {
  console.log('  ➕ Creando unidades de medida básicas');
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

// Seed: Áreas básicas
const areaCount = db.prepare('SELECT COUNT(*) as c FROM areas').get().c;
if (!areaCount) {
  console.log('  ➕ Creando áreas básicas');
  db.prepare('INSERT INTO areas (id, nombre) VALUES (?,?)').run('a1', 'Principal');
  db.prepare('INSERT INTO areas (id, nombre) VALUES (?,?)').run('a2', 'Secundario');
}

// Seed: Ubicaciones básicas
const ubCount = db.prepare('SELECT COUNT(*) as c FROM ubicaciones').get().c;
if (!ubCount) {
  console.log('  ➕ Creando ubicaciones básicas');
  db.prepare('INSERT INTO ubicaciones (id, nombre) VALUES (?,?)').run('u1', 'Estante A');
  db.prepare('INSERT INTO ubicaciones (id, nombre) VALUES (?,?)').run('u2', 'Estante B');
}

// Seed: Productos de ejemplo
const prodCount = db.prepare('SELECT COUNT(*) as c FROM productos').get().c;
if (!prodCount) {
  console.log('  ➕ Creando productos de ejemplo');
  db.prepare('INSERT INTO productos (id, nombre, marca, unidad, areaId, ubicacionId, activo) VALUES (?,?,?,?,?,?,?)')
    .run('pr1', 'Tornillo Hexagonal', 'Stanley', 'UNIDAD', 'a1', 'u1', 1);
  db.prepare('INSERT INTO productos (id, nombre, marca, unidad, areaId, ubicacionId, activo) VALUES (?,?,?,?,?,?,?)')
    .run('pr2', 'Cable Eléctrico', 'Indeco', 'M', 'a2', 'u2', 1);
  db.prepare('INSERT INTO productos (id, nombre, marca, unidad, areaId, ubicacionId, activo) VALUES (?,?,?,?,?,?,?)')
    .run('pr3', 'Destornillador', 'Bahco', 'UNIDAD', 'a1', 'u1', 1);
}

// Seed: Configuración de empresa
const empresaExists = db.prepare('SELECT COUNT(*) as count FROM configuracion_empresa').get();
if (empresaExists.count === 0) {
  console.log('  ➕ Creando configuración de empresa por defecto');
  db.prepare(`
    INSERT INTO configuracion_empresa (id, nombre_empresa, ruc)
    VALUES (1, 'Mi Empresa S.A.C.', '00000000000')
  `).run();
}

console.log('✅ Datos iniciales verificados');
console.log('');
console.log('🎉 Base de datos inicializada correctamente');
console.log('📊 Usuario por defecto: admin@demo.com / admin123');
console.log('');

export default db;
