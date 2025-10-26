# 📋 Guía Completa de Permisos - AlmacenApp

## 🎯 Permisos Disponibles (76 permisos)

### 1. Sistema y Administración
- `users.manage` - Gestionar usuarios del sistema
- `roles.manage` - Gestionar roles y permisos
- `system.config` - Configuración del sistema

### 2. Proveedores
- `providers.view` - Ver proveedores
- `providers.create` - Crear proveedores
- `providers.update` - Editar proveedores
- `providers.delete` - Eliminar proveedores

### 3. Productos
- `products.view` - Ver productos
- `products.create` - Crear productos
- `products.update` - Editar productos
- `products.delete` - Eliminar productos

### 4. Ingresos
- `ingresos.view` - Ver ingresos
- `ingresos.create` - Registrar ingresos
- `ingresos.update` - Editar ingresos
- `ingresos.delete` - Eliminar ingresos

### 5. Inventario
- `inventory.viewSelf` - Ver mi inventario personal
- `inventory.viewAll` - Ver todo el inventario
- `inventory.assign` - Asignar productos a usuarios

### 6. Pedidos/Solicitudes
- `pedidos.create` - Crear pedidos/solicitudes ⚠️ **IMPORTANTE**
- `pedidos.view` - Ver pedidos
- `pedidos.approve` - Aprobar pedidos
- `pedidos.reject` - Rechazar pedidos
- `pedidos.deliver` - Marcar como entregado

### 7. Reportes
- `reports.view` - Ver reportes básicos
- `reports.export` - Exportar reportes
- `reports.advanced` - Reportes avanzados

### 8. Productos Vencidos
- `vencidos.view` - Ver productos vencidos
- `vencidos.baja` - Dar de baja productos vencidos
- `vencidos.devolucion` - Devolver productos a proveedor

### 9. Salidas (Bajas de Inventario)
- `salidas.view` - Ver salidas por daño, pérdida, etc.
- `salidas.create` - Registrar salidas de inventario
- `salidas.delete` - Eliminar registros de salidas

### 10. Cotizaciones
- `cotizaciones.view` - Ver cotizaciones
- `cotizaciones.create` - Crear cotizaciones

### 11. Órdenes de Compra
- `ordenes.view` - Ver órdenes de compra
- `ordenes.create` - Crear órdenes de compra
- `ordenes.update` - Editar órdenes de compra
- `ordenes.delete` - Cancelar órdenes de compra
- `ordenes.approve` - Aprobar/Confirmar órdenes
- `ordenes.seguimiento` - Gestionar seguimiento de entregas

### 12. Configuración de Empresa
- `empresa.config` - Configurar datos de empresa

### 13. Catálogos
- `areas.manage` - Gestionar áreas
- `ubicaciones.manage` - Gestionar ubicaciones
- `unidades.manage` - Gestionar unidades de medida

---

## 🔐 Configuración de Roles

### ROL: Administrador (role-admin)
**Tiene TODOS los permisos** (46 permisos)

### ROL: Trabajador (personalizable)
**Permisos mínimos recomendados:**
- ✅ `inventory.viewSelf` - Para ver su inventario personal
- ✅ `pedidos.create` - Para solicitar productos ⚠️ **CRÍTICO**

**Permisos opcionales:**
- `inventory.viewAll` - Si necesita ver todo el almacén
- `reports.view` - Si necesita ver reportes

---

## 🐛 Problemas Comunes y Soluciones

### ❌ Problema 1: "No aparece la opción de Solicitar Productos"
**Causa:** Falta el permiso `pedidos.create`
**Solución:**
1. Ir a: Sistema → Roles y Permisos
2. Editar el rol "Trabajador"
3. En el grupo "Pedidos", marcar: ✅ `pedidos.create` (Crear pedidos/solicitudes)
4. Guardar cambios
5. Usuario debe cerrar sesión y volver a entrar

### ❌ Problema 2: "Aparecen opciones que no di permiso"
**Causa:** El sistema detecta permisos de admin y muestra menú completo
**Solución:**
- Revisar que NO tenga permisos como:
  - `products.view`
  - `ingresos.view`
  - `providers.view`
  - `users.manage`
  - `inventory.viewAll`
  - `salidas.view`

### ❌ Problema 3: "No se ve Mi Inventario"
**Causa:** Falta el permiso `inventory.viewSelf`
**Solución:**
1. Ir a: Sistema → Roles y Permisos
2. Editar el rol
3. En el grupo "Inventario", marcar: ✅ `inventory.viewSelf`

### ❌ Problema 4: "Los permisos no se aplican"
**Causa:** El frontend usa JWT que se carga al iniciar sesión
**Solución:**
1. Después de cambiar permisos, el usuario DEBE:
   - Cerrar sesión
   - Volver a iniciar sesión
2. El nuevo token JWT incluirá los permisos actualizados

---

## 🗺️ Mapa de Rutas y Permisos

| Ruta | Componente | Permiso Requerido | Descripción |
|------|-----------|-------------------|-------------|
| `/dashboard` | DashboardPage | Ninguno | Dashboard principal |
| `/ingresos` | IngresosListPage | `ingresos.view` | Lista de ingresos |
| `/inventario` | InventarioPage | `inventory.viewSelf` | Mi inventario personal |
| `/inventario/salidas` | **MisSalidasPage** | `inventory.viewSelf` | Mis salidas (trabajador) |
| `/salidas` | **SalidasAdminPage** | `salidas.view` | Bajas de inventario (admin) |
| `/inventario/vencidos` | ProductosVencidosPage | `vencidos.view` | Productos vencidos |
| `/pedidos/mios` | MisPedidosPage | **`pedidos.create`** | Solicitar productos |
| `/pedidos/admin` | PedidosAdminPage | `inventory.assign` | Gestión de pedidos |
| `/proveedores` | ProveedoresListPage | `providers.view` | Proveedores |
| `/productos` | ProductosListPage | `products.view` | Productos |
| `/catalogo/areas` | AreasPage | `products.view` | Áreas |
| `/catalogo/ubicaciones` | UbicacionesPage | `products.view` | Ubicaciones |
| `/catalogo/unidades-medida` | UnidadesMedidaPage | `products.view` | Unidades |
| `/reportes` | ReportesPage | `reports.view` | Reportes |
| `/cotizaciones` | CotizacionesPage | `cotizaciones.view` | Cotizaciones |
| `/ordenes-compra` | OrdenesCompraPage | `ordenes.view` | Órdenes de compra |
| `/seguridad/usuarios` | UsuariosPage | `users.manage` | Usuarios |
| `/seguridad/roles` | RolesPage | `roles.manage` | Roles y permisos |
| `/configuracion/empresa` | EmpresaPage | `empresa.config` | Config empresa |

---

## 📝 Checklist de Verificación de Permisos

### Para Trabajadores:
- [ ] Se ve "Mi Inventario" → requiere `inventory.viewSelf`
- [ ] Se ve "Mis Salidas" → requiere `inventory.viewSelf`
- [ ] Se ve "Solicitar Productos" → requiere `pedidos.create` ⚠️
- [ ] NO se ve el menú de admin (Dashboard, Ingresos, etc.)

### Para Administradores:
- [ ] Se ve "Dashboard"
- [ ] Se ve grupo "Inventario" con:
  - [ ] Ingresos → `ingresos.view`
  - [ ] Almacén → `inventory.viewAll`
  - [ ] Bajas de Inventario (en `/salidas`) → `salidas.view`
  - [ ] Productos Vencidos → `vencidos.view`
- [ ] Se ve "Pedidos" → `inventory.assign`
- [ ] Se ve grupo "Catálogos"
- [ ] Se ve grupo "Compras"
- [ ] Se ve grupo "Sistema"

---

## 🔧 Cómo Verificar Permisos en Base de Datos

### 1. Ver permisos del rol admin:
```sql
SELECT name, permissions FROM roles WHERE id = 'role-admin';
```

### 2. Ver permisos de un usuario específico:
```sql
SELECT 
  u.nombres,
  u.email,
  r.name as rol,
  r.permissions as permisos_rol,
  u.permissions as permisos_extra
FROM users u
LEFT JOIN roles r ON u.roleId = r.id
WHERE u.email = 'usuario@ejemplo.com';
```

### 3. Crear un rol trabajador básico:
```sql
INSERT INTO roles (id, name, permissions, predefined, active)
VALUES (
  'role-worker',
  'Trabajador',
  '["inventory.viewSelf","pedidos.create"]',
  0,
  1
);
```

---

## 📚 Ubicación de Archivos Clave

### Frontend:
- **Definición de permisos:** `src/types/seguridad.ts`
- **Router con permisos:** `src/app/router.tsx`
- **Menú de navegación:** `src/components/SidebarNav.tsx`
- **Store de auth:** `src/store/auth.store.ts`

### Backend:
- **Permisos en DB:** `server/src/db.js` (línea ~470)
- **Middleware de auth:** `server/src/index.js` (línea ~40)
- **Rutas protegidas:** `server/src/index.js`

---

## 🎨 Diferencia entre Páginas de Salidas

### `/inventario/salidas` (MisSalidasPage)
- **Usuario:** Trabajadores
- **Permiso:** `inventory.viewSelf`
- **Función:** Registrar salidas de productos que usan
- **Características:**
  - Formulario simple
  - Solo sus propias salidas
  - Sin estadísticas

### `/salidas` (SalidasAdminPage)
- **Usuario:** Administradores
- **Permiso:** `salidas.view`
- **Función:** Ver todas las bajas del sistema
- **Características:**
  - Vista completa con estadísticas
  - 7 tipos de salida (DAÑADO, PERDIDA, etc.)
  - Filtros avanzados
  - Métricas de valor perdido

---

## 🚀 Pasos para Configurar un Nuevo Trabajador

1. **Crear usuario:**
   - Ir a: Sistema → Usuarios → Nuevo Usuario
   - Llenar datos (nombre, email, contraseña)
   - Asignar rol "Trabajador" (o el rol que hayas creado)

2. **Verificar permisos del rol:**
   - Ir a: Sistema → Roles y Permisos
   - Editar rol "Trabajador"
   - Verificar que tenga mínimo:
     - ✅ `inventory.viewSelf`
     - ✅ `pedidos.create`

3. **Probar el acceso:**
   - Usuario inicia sesión
   - Debe ver solo:
     - "Mi Inventario"
     - "Mis Salidas"
     - "Solicitar Productos"

4. **Si no ve las opciones:**
   - Verificar permisos en BD
   - Usuario debe cerrar sesión y volver a entrar
   - Limpiar caché del navegador si es necesario

---

## ⚠️ NOTA IMPORTANTE

Después de modificar permisos en Sistema → Roles y Permisos:
1. Los cambios se guardan en la base de datos ✅
2. Los usuarios actuales con sesión activa NO verán los cambios ❌
3. **DEBEN cerrar sesión y volver a iniciar** para obtener nuevo token JWT con permisos actualizados ✅

---

**Última actualización:** 26 de octubre de 2025
