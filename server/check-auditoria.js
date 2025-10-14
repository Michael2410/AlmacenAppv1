import Database from 'better-sqlite3';

const db = new Database('almacen.db');

console.log('\n=== VERIFICAR TABLA AUDITORIA ===\n');

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='auditoria'").all();
  
  if (tables.length > 0) {
    console.log('✅ Tabla auditoria existe');
    
    const columns = db.prepare("PRAGMA table_info('auditoria')").all();
    console.log('\nColumnas:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    const count = db.prepare("SELECT COUNT(*) as total FROM auditoria").get();
    console.log(`\nRegistros: ${count.total}`);
    
    if (count.total > 0) {
      const sample = db.prepare("SELECT * FROM auditoria ORDER BY fecha_hora DESC LIMIT 3").all();
      console.log('\nÚltimos 3 registros:');
      sample.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.accion} - ${r.modulo}`);
        console.log(`   Usuario: ${r.usuario_nombre}`);
        console.log(`   Fecha: ${r.fecha_hora}`);
        console.log(`   Descripción: ${r.descripcion || 'N/A'}`);
      });
    }
  } else {
    console.log('❌ Tabla auditoria NO existe');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

db.close();
