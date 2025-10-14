// Script de prueba para dashboardMetrics
import db from '../db.js';
import { getDashboardMetrics, getDashboardCharts, getRecentActivity } from './dashboardMetrics.js';

console.log('=== Probando getDashboardMetrics ===');
try {
  const metrics = getDashboardMetrics();
  console.log('✅ getDashboardMetrics funciona');
  console.log('Métricas:', JSON.stringify(metrics, null, 2));
} catch (error) {
  console.error('❌ Error en getDashboardMetrics:');
  console.error(error.message);
  console.error(error.stack);
}

console.log('\n=== Probando getDashboardCharts ===');
try {
  const charts = getDashboardCharts();
  console.log('✅ getDashboardCharts funciona');
  console.log('Charts:', JSON.stringify(charts, null, 2));
} catch (error) {
  console.error('❌ Error en getDashboardCharts:');
  console.error(error.message);
  console.error(error.stack);
}

console.log('\n=== Probando getRecentActivity ===');
try {
  const activity = getRecentActivity(5);
  console.log('✅ getRecentActivity funciona');
  console.log('Activity:', JSON.stringify(activity, null, 2));
} catch (error) {
  console.error('❌ Error en getRecentActivity:');
  console.error(error.message);
  console.error(error.stack);
}
