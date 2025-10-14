import { getProductosProximosVencer } from './src/utils/stockValidator.js';

console.log('\n=== TEST: Productos Próximos a Vencer (30 días) ===\n');

try {
  const productos = getProductosProximosVencer(30);
  
  console.log(`Total productos próximos a vencer: ${productos.length}`);
  
  if (productos.length > 0) {
    const criticos = productos.filter(p => p.urgencia === 'crítica');
    const alta = productos.filter(p => p.urgencia === 'alta');
    const media = productos.filter(p => p.urgencia === 'media');
    
    console.log(`\n📊 Resumen por urgencia:`);
    console.log(`   🔴 Críticos (≤7 días): ${criticos.length}`);
    console.log(`   🟠 Alta (≤15 días): ${alta.length}`);
    console.log(`   🟡 Media (≤30 días): ${media.length}`);
    
    console.log('\nPrimeros 5 productos:');
    productos.slice(0, 5).forEach((p, i) => {
      const urgenciaIcon = p.urgencia === 'crítica' ? '🔴' : p.urgencia === 'alta' ? '🟠' : '🟡';
      console.log(`\n${i + 1}. ${urgenciaIcon} ${p.producto_nombre}`);
      console.log(`   Marca: ${p.marca || 'Sin marca'}`);
      console.log(`   Cantidad: ${p.cantidad} ${p.unidad}`);
      console.log(`   Vence: ${p.fecha_vencimiento}`);
      console.log(`   Días restantes: ${p.dias_restantes}`);
      console.log(`   Urgencia: ${p.urgencia.toUpperCase()}`);
    });
    
    console.log('\n=== Estructura de datos (primer producto) ===');
    console.log(JSON.stringify(productos[0], null, 2));
  } else {
    console.log('\n✅ No hay productos próximos a vencer en los próximos 30 días');
    console.log('\n💡 Sugerencia: Agrega fechas de vencimiento a tus ingresos para ver esta funcionalidad');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
