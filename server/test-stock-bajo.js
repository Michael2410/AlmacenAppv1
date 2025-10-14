import { getProductosBajoStock } from './src/utils/stockValidator.js';

console.log('\n=== TEST: Productos con Stock Bajo ===\n');

try {
  const productos = getProductosBajoStock();
  
  console.log(`Total productos con stock bajo: ${productos.length}`);
  
  if (productos.length > 0) {
    console.log('\nPrimeros 3 productos:');
    productos.slice(0, 3).forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.nombre}`);
      console.log(`   ID: ${p.producto_id} / ${p.productoId}`);
      console.log(`   Marca: ${p.marca || 'Sin marca'}`);
      console.log(`   Unidad: ${p.unidad_medida}`);
      console.log(`   Stock actual: ${p.stock_actual}`);
      console.log(`   Stock mínimo: ${p.stock_minimo}`);
      console.log(`   Faltante: ${p.stock_minimo - p.stock_actual}`);
    });
  } else {
    console.log('\n✅ No hay productos con stock bajo (todos tienen 10+ unidades)');
  }
  
  console.log('\n=== Estructura de datos ===');
  if (productos.length > 0) {
    console.log(JSON.stringify(productos[0], null, 2));
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
