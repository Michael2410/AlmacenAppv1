import Database from 'better-sqlite3';

const db = new Database('almacen.db');

console.log('\n=== TEST: Verificar Columna cantidad_disponible ===\n');

try {
  // Verificar que la columna existe
  const cols = db.prepare("PRAGMA table_info('ingresos')").all();
  const hasCantidadDisponible = cols.some((c) => c.name === 'cantidad_disponible');
  
  if (!hasCantidadDisponible) {
    console.log('❌ ERROR: Columna cantidad_disponible NO existe');
    console.log('   Reinicia el servidor para ejecutar la migración');
    process.exit(1);
  }
  
  console.log('✅ Columna cantidad_disponible existe\n');
  
  // Ver ingresos con sus cantidades
  const ingresos = db.prepare(`
    SELECT 
      id,
      productoId,
      cantidad as cantidad_original,
      cantidad_disponible,
      fechaIngreso,
      fechaVencimiento
    FROM ingresos
    ORDER BY fechaIngreso DESC
    LIMIT 10
  `).all();
  
  console.log(`📦 Últimos 10 ingresos:\n`);
  console.table(ingresos);
  
  // Ver stock asignado a usuarios
  const asignaciones = db.prepare(`
    SELECT 
      productoId,
      SUM(cantidad) as cantidad_asignada
    FROM user_stock
    GROUP BY productoId
  `).all();
  
  console.log(`\n👥 Stock asignado a usuarios:\n`);
  console.table(asignaciones);
  
  // Ver comparativa
  const comparativa = db.prepare(`
    SELECT 
      i.productoId,
      p.nombre,
      SUM(i.cantidad) as total_ingresado,
      SUM(i.cantidad_disponible) as total_disponible,
      COALESCE(us.asignado, 0) as total_asignado
    FROM ingresos i
    INNER JOIN productos p ON i.productoId = p.id
    LEFT JOIN (
      SELECT productoId, SUM(cantidad) as asignado
      FROM user_stock
      GROUP BY productoId
    ) us ON us.productoId = i.productoId
    GROUP BY i.productoId
  `).all();
  
  console.log(`\n📊 Comparativa General:\n`);
  console.table(comparativa);
  
  // Validar que los números cuadren
  let erroresDetectados = 0;
  for (const comp of comparativa) {
    const esperado = comp.total_ingresado - comp.total_asignado;
    if (Math.abs(comp.total_disponible - esperado) > 0.01) {
      console.log(`❌ ERROR en ${comp.nombre}:`);
      console.log(`   Ingresado: ${comp.total_ingresado}`);
      console.log(`   Asignado: ${comp.total_asignado}`);
      console.log(`   Disponible (BD): ${comp.total_disponible}`);
      console.log(`   Disponible (Esperado): ${esperado}`);
      erroresDetectados++;
    }
  }
  
  if (erroresDetectados === 0) {
    console.log('\n✅ Todos los cálculos son correctos');
  } else {
    console.log(`\n⚠️  Se detectaron ${erroresDetectados} inconsistencias`);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}

db.close();
