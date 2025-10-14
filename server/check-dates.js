import Database from 'better-sqlite3';

const db = new Database('almacen.db');

console.log('\n=== PEDIDOS - ÚLTIMOS 7 REGISTROS ===\n');
const pedidos = db.prepare(`
  SELECT 
    id, 
    fecha, 
    fechaSolicitud, 
    fechaRespuesta,
    estado
  FROM pedidos 
  ORDER BY id DESC 
  LIMIT 7
`).all();

pedidos.forEach(p => {
  console.log(`ID: ${p.id}`);
  console.log(`  fecha:           ${p.fecha}`);
  console.log(`  fechaSolicitud:  ${p.fechaSolicitud}`);
  console.log(`  fechaRespuesta:  ${p.fechaRespuesta}`);
  console.log(`  estado:          ${p.estado}`);
  console.log('');
});

db.close();
