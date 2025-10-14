# 📝 Release Notes - AlmacenApp v2.0.0

## 🎉 Nuevas Funcionalidades

### 📊 Sistema de Reportes Completo
- **5 tipos de reportes** con datos en tiempo real:
  - Inventario General con valorización
  - Ingresos con totales y fechas de vencimiento
  - Pedidos por estado con estadísticas
  - Stock por Usuario (asignaciones)
  - Movimientos consolidados (ingresos + salidas + entregas)
- **Exportación múltiple**: Excel (.xlsx), PDF y CSV
- **Filtros avanzados**: Por fecha, producto, área, estado
- **Vista previa** antes de exportar
- **Audit logging** de todas las exportaciones

### 📈 Dashboard Mejorado
- **KPIs en tiempo real**:
  - Pedidos pendientes con tendencias
  - Stock crítico (productos < 10 unidades)
  - Próximos a vencer (30 días)
  - Entregas del día
  - Usuarios activos
- **Gráficos interactivos**:
  - Pedidos por día (últimos 7 días)
  - Distribución por estado (dona)
  - Top 5 productos más solicitados
- **Timeline de actividad** con fechas reales y descripciones

### ⚠️ Sistema de Alertas Inteligentes
- **Stock Bajo**:
  - Badge animado en sidebar
  - Tarjeta clickeable en dashboard
  - Modal con tabla detallada
  - Muestra: producto, marca, stock actual/mínimo, faltante
  - Botón directo para crear pedido

- **Próximos a Vencer**:
  - Productos que vencen en los próximos 30 días
  - Clasificación por urgencia:
    - 🔴 Crítico: ≤7 días (animación pulsante)
    - 🟠 Urgente: ≤15 días
    - 🟡 Atención: ≤30 días
  - Modal con resumen por urgencia
  - Tabla ordenable y filtrable

### 📜 Sistema de Auditoría
- **Registro automático** de acciones críticas
- **Tabla auditoria** en base de datos con:
  - Usuario (ID y nombre)
  - Fecha/hora exacta
  - Acción (CREATE, UPDATE, DELETE, etc.)
  - Módulo (PEDIDOS, INGRESOS, REPORTES, etc.)
  - Descripción detallada
  - IP del cliente
- **Consulta de logs** con filtros
- **Estadísticas** de actividad

### 🔄 Mejoras en Pedidos
- **Vista agrupada por lotes**: Múltiples productos en una sola solicitud
- **Estados mejorados**: Pendiente → Aprobado → Entregado (o Rechazado)
- **Fechas separadas**:
  - `fecha`: Fecha de creación
  - `fechaSolicitud`: Cuando se solicitó
  - `fechaRespuesta`: Cuando se aprobó/rechazó/entregó
- **Modal de detalle** con lista completa de productos
- **Entrega de lote completo** con un click

### 📦 Mejoras en Ingresos
- **Campos adicionales**:
  - Fecha de vencimiento
  - Número de serie
  - Serie de factura
  - Fecha de factura
  - Marca (auto-completado desde producto)
- **Validación mejorada** de fechas y datos
- **Vista detallada** con todos los campos

### 🎨 Mejoras de UI/UX
- **Diseño responsive** mejorado (móvil, tablet, desktop)
- **Tarjetas clickeables** con cursor pointer
- **Modales más informativos** con resúmenes y estadísticas
- **Badges con animación** para alertas críticas
- **Colores consistentes** en todo el sistema
- **Loading states** mejorados
- **Mensajes de error/éxito** más descriptivos

## 🛠 Mejoras Técnicas

### Backend
- **+160 líneas** nuevas en `index.js`:
  - 6 nuevos endpoints de reportes
  - 2 endpoints de alertas
  - 3 endpoints de auditoría
- **Nuevas utilidades**:
  - `reportGenerator.js` (560 líneas)
  - `auditLogger.js` (sistema completo)
  - `dashboardMetrics.js` (actualizado)
  - `stockValidator.js` (con alertas)
- **Base de datos**:
  - Nueva tabla `auditoria`
  - Nuevas columnas en `ingresos` y `pedidos`
  - Migraciones automáticas

### Frontend
- **+2,100 líneas** de código nuevo:
  - `ReportesPage.tsx` (550 líneas)
  - `exportHelpers.ts` (330 líneas)
  - `ActivityTimeline.tsx` (actualizado)
  - Componentes de alertas y modales
- **Nuevos hooks**:
  - `useReportes.ts` con 6 hooks especializados
  - `useProductosProximosVencer()`
  - Mejoras en hooks existentes
- **Dependencias nuevas**:
  - xlsx@0.18.5
  - jspdf@3.0.3
  - jspdf-autotable@5.0.2
  - date-fns@4.1.0

### Performance
- **React Query** con cache inteligente:
  - Dashboard: 30s staleTime
  - Reportes: 30s staleTime
  - Alertas: 2-5 min staleTime
- **Lazy loading** de componentes grandes
- **Memoización** de cálculos pesados

### Seguridad
- **JWT con expiración**: 8 horas
- **Validación de permisos** en todos los endpoints
- **Audit logging** de acciones sensibles
- **CORS configurado**
- **Sanitización** de inputs

## 🐛 Bugs Corregidos

- ✅ **Fechas de pedidos**: Ahora muestran la fecha correcta (no "hace unos segundos")
- ✅ **Campo fecha vs fechaSolicitud**: Backend ahora envía ambos campos
- ✅ **Stock bajo vacío**: Modal ahora muestra productos correctamente
- ✅ **Columnas SQL**: Corregidos nombres (nombres vs nombre, fecha vs fechaCreacion)
- ✅ **Hook useLowStock**: Ahora devuelve data correctamente
- ✅ **Timeline de actividad**: Maneja ambos formatos (auditoría y fallback)
- ✅ **Exports en reportes**: UTF-8 BOM para Excel, auto-width columns

## 📦 Archivos de Deployment

### Nuevos archivos creados:
- **README.md** - Documentación completa (actualizado)
- **DEPLOYMENT.md** - Guía detallada de despliegue
- **QUICKSTART.md** - Guía rápida de inicio
- **build-production.bat** - Script de build automático (Windows)
- **start-production.bat** - Script de inicio producción (Windows)
- **ecosystem.config.json** - Configuración PM2
- **server/.env.example** - Ejemplo de variables de entorno
- **.gitignore** - Actualizado con archivos de producción

## 🚀 Guía de Migración desde v1.0.0

### 1. Actualizar código
```bash
git pull origin main
npm install
cd server && npm install && cd ..
```

### 2. Instalar nuevas dependencias
```bash
npm install xlsx jspdf jspdf-autotable date-fns
```

### 3. La base de datos se actualizará automáticamente
Al iniciar el servidor, las migraciones se ejecutan automáticamente:
- Nueva tabla `auditoria`
- Nuevas columnas en `ingresos` y `pedidos`

### 4. No requiere cambios en datos existentes
Todos los datos anteriores seguirán funcionando.

## 📊 Estadísticas del Release

- **Commits**: 50+
- **Archivos modificados**: 30+
- **Archivos nuevos**: 15+
- **Líneas de código agregadas**: ~2,500
- **Endpoints nuevos**: 11
- **Componentes nuevos**: 10+
- **Tiempo de desarrollo**: ~20 horas

## 🙏 Agradecimientos

Gracias a todos los que probaron la versión beta y reportaron bugs.

## 🔮 Próximas Funcionalidades (v2.1.0)

- [ ] Notificaciones push
- [ ] Exportación programada de reportes
- [ ] Gráficos de tendencias avanzados
- [ ] API REST documentada (Swagger)
- [ ] App móvil (React Native)
- [ ] Multi-empresa
- [ ] Integración con sistemas externos

## 📞 Soporte

- **Issues**: https://github.com/Michael2410/AlmacenApp/issues
- **Documentación**: Ver README.md y DEPLOYMENT.md
- **Email**: [Tu email aquí]

---

**Versión**: 2.0.0  
**Fecha de Release**: 13 de Octubre, 2025  
**Autor**: Michael Gomez ([@Michael2410](https://github.com/Michael2410))
