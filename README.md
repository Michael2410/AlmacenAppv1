# AlmacenApp

Sistema integral de gestión de inventario desarrollado con React + TypeScript y Express + SQLite.

## 📋 Características

- 🔐 **Autenticación y Autorización**: Login con JWT, roles y permisos granulares
- 📦 **Gestión de Productos**: CRUD completo con marca, categorización y control de stock
- 📊 **Dashboard**: Métricas en tiempo real, gráficos y alertas inteligentes
- 🚚 **Ingresos**: Registro detallado con fechas de vencimiento, series y facturas
- 📝 **Pedidos**: Sistema de solicitudes por lotes con estados y seguimiento
- 👥 **Usuarios**: Administración de trabajadores con asignación de stock
- 📄 **Reportes**: Exportación a Excel, PDF y CSV con 7 tipos de reportes
- ⚠️ **Alertas**: Stock crítico, productos próximos a vencer y alertas personalizadas
- ❌ **Productos Vencidos**: Gestión de bajas y devoluciones a proveedores
- � **Cotizaciones**: Sistema de cotizaciones para proveedores con generación de PDF
- 🏢 **Configuración de Empresa**: Datos corporativos y logo para documentos
- �🔒 **Control de Vencimientos**: FEFO automático y bloqueo de productos vencidos
- 📜 **Auditoría**: Registro completo de acciones del sistema
- 🎯 **Timeline**: Actividad reciente con fechas y descripciones

## 🛠 Tecnologías

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Ant Design 5 (UI components)
- TanStack Query v5 (data fetching)
- Zustand (state management)
- React Router v6
- TailwindCSS
- dayjs (dates)
- xlsx, jspdf (exports)

### Backend
- Node.js + Express
- SQLite3 (better-sqlite3)
- JWT (autenticación)
- bcryptjs (hashing)
- CORS

## 📥 Instalación

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### 1. Clonar repositorio
```bash
git clone https://github.com/Michael2410/AlmacenAppv1.git
cd AlmacenApp
```

### 2. Instalar dependencias

#### Backend
```bash
cd server
npm install
```

#### Frontend
```bash
cd ..
npm install
```

## 🚀 Ejecución

### Modo Desarrollo

#### Opción 1: Script automático (Windows)
```bash
# Ejecuta ambos servidores automáticamente
start-dev.bat
```

#### Opción 2: Manual

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
El servidor estará en: `http://localhost:3001/api`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
La aplicación estará en: `http://localhost:5173`

### Modo Producción

#### 1. Construir Frontend
```bash
npm run build
```
Esto genera la carpeta `dist/` con los archivos optimizados.

#### 2. Configurar Backend para Producción

Edita `server/src/index.js` y cambia el puerto si es necesario:
```javascript
const PORT = process.env.PORT || 3001;
```

#### 3. Servir aplicación completa

**Opción A: Backend sirve el frontend (Recomendado)**

1. Copia el contenido de `dist/` a `server/public/`:
```bash
# Windows
xcopy /E /I dist server\public

# Linux/Mac
cp -r dist/* server/public/
```

2. Configura Express para servir archivos estáticos en `server/src/index.js`:
```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));

// Ruta catch-all para React Router
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});
```

3. Inicia el servidor:
```bash
cd server
node src/index.js
```

La aplicación completa estará en: `http://localhost:3001`

**Opción B: Servidores separados**

1. Backend:
```bash
cd server
node src/index.js
```

2. Frontend con servidor estático:
```bash
npm install -g serve
serve -s dist -p 5173
```

#### 4. Variables de Entorno (Producción)

Crea un archivo `.env` en la carpeta `server/`:
```env
PORT=3001
JWT_SECRET=tu_secreto_super_seguro_aqui_cambiar_en_produccion
NODE_ENV=production
```

Y modifica `server/src/index.js`:
```javascript
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const PORT = process.env.PORT || 3001;
```

#### 5. PM2 (Producción recomendado)

Para mantener el servidor corriendo en producción:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicación
cd server
pm2 start src/index.js --name almacen-api

# Ver logs
pm2 logs almacen-api

# Reiniciar
pm2 restart almacen-api

# Detener
pm2 stop almacen-api

# Auto-inicio en boot
pm2 startup
pm2 save
```

#### 6. Nginx (Opcional - Reverse Proxy)

Configuración de ejemplo para Nginx:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend
    location / {
        root /ruta/a/AlmacenApp/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 👤 Usuarios por Defecto

Al iniciar por primera vez, se crean automáticamente:

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@demo.com | admin123 | Administrador |

**⚠️ IMPORTANTE**: Cambia la contraseña del admin en producción.

## 📂 Estructura del Proyecto

```
AlmacenApp/
├── src/                          # Frontend React + TypeScript
│   ├── components/               # Componentes reutilizables
│   │   ├── Dashboard/           # Gráficos, métricas, timeline
│   │   ├── forms/               # Formularios (Ingreso, Producto, etc)
│   │   └── Stock/               # Alertas de stock y vencimiento
│   ├── pages/                   # Páginas principales
│   │   ├── dashboard/           # Dashboard con KPIs
│   │   ├── productos/           # CRUD productos
│   │   ├── ingresos/            # Registro de ingresos
│   │   ├── pedidos/             # Gestión de pedidos
│   │   ├── reportes/            # Sistema de reportes
│   │   └── usuarios/            # Administración usuarios
│   ├── hooks/                   # React hooks personalizados
│   ├── lib/                     # Servicios y API client
│   ├── types/                   # Tipos TypeScript
│   ├── store/                   # Estado global (Zustand)
│   └── utils/                   # Utilidades (exports, helpers)
├── server/                      # Backend Express + SQLite
│   └── src/
│       ├── index.js            # Servidor principal (157 endpoints)
│       ├── db.js               # Esquema de base de datos
│       └── utils/
│           ├── auditLogger.js     # Sistema de auditoría
│           ├── dashboardMetrics.js # Métricas y gráficos
│           ├── reportGenerator.js  # Generación de reportes
│           └── stockValidator.js   # Validación de stock
├── public/                      # Archivos estáticos
├── dist/                        # Build de producción (generado)
└── almacen.db                   # Base de datos SQLite (generada)
```

## 🎯 Funcionalidades Principales

### Dashboard
- **KPIs en tiempo real**: Pedidos pendientes, stock crítico, próximos a vencer, entregas hoy
- **Gráficos**: Pedidos por día, distribución de estados, productos más solicitados
- **Timeline de actividad**: Últimas acciones del sistema con fechas y usuarios
- **Alertas clickeables**: Modales con detalles de productos con stock bajo o próximos a vencer

### Sistema de Reportes
7 tipos de reportes con exportación a Excel, PDF y CSV:

1. **Inventario General**: Stock valorizado con filtros por producto y área
2. **Ingresos**: Histórico con totales y fechas de vencimiento
3. **Pedidos**: Por estado con estadísticas detalladas
4. **Stock por Usuario**: Asignaciones individuales
5. **Movimientos**: Consolidado de ingresos, salidas y entregas
6. **Bajas de Inventario**: Productos dados de baja con valor de pérdida
7. **Devoluciones**: Histórico de devoluciones a proveedores

### Sistema de Cotizaciones
- **Cotizaciones para proveedores**: Creación de solicitudes de cotización con productos y cantidades
- **Numeración automática**: Sistema secuencial COT-0000001, COT-0000002, etc.
- **Generación de PDF profesional**: Documentos con logo optimizado (30x30) y datos completos
  - Logo de empresa en esquina superior derecha (sin distorsión)
  - Información completa de la empresa (nombre, RUC, dirección, teléfono, email)
  - Datos del proveedor incluyen RUC (11 dígitos validados)
  - Tabla de productos con cantidades y unidades
- **Historial completo**: Registro de todas las cotizaciones enviadas con descarga de PDF
- **Configuración de empresa**: Logo, nombre, RUC y datos de contacto personalizables
- **Gestión de proveedores**: Campo RUC obligatorio (11 dígitos) en formulario y tabla
- **Personalización**: Observaciones y notas adicionales por cotización

### Sistema de Órdenes de Compra
- **Creación manual de órdenes**: Selección de proveedor y productos con precios
- **Numeración automática**: Sistema secuencial ORD-0000001, ORD-0000002, etc.
- **Gestión de estados**: PENDIENTE → CONFIRMADA → EN_TRÁNSITO → ENTREGADA (o CANCELADA)
- **Generación de PDF profesional**: Documentos formales con todos los detalles
  - Logo de empresa y datos completos
  - Información del proveedor con RUC
  - Tabla de productos con precios unitarios
  - Cálculo automático: Subtotal + IGV (18%) = Total
  - Condiciones de pago y notas adicionales
- **Seguimiento en tiempo real**: Timeline visual de eventos y cambios de estado
- **Control de entregas**: Fecha estimada y seguimiento de cumplimiento
- **Historial completo**: Registro de todas las órdenes con filtros por estado/proveedor
- **Descarga de PDFs**: Generación instantánea de documentos para imprimir/enviar
- **Integración con Ingresos**: Botón "Ingresar" para órdenes ENTREGADAS
  - Pre-carga automática de productos desde la orden
  - Precio = subtotal (cantidad × precio_unitario de la orden)
  - Ubicación y área tomadas del producto automáticamente
  - Solo editar: fechas de vencimiento, factura y serie
  - Creación instantánea de múltiples ingresos en un click
  - Trazabilidad completa: orden → ingresos

### Gestión de Pedidos
- **Pedidos por lotes**: Múltiples productos en una sola solicitud
- **Estados**: Pendiente → Aprobado → Entregado (o Rechazado)
- **Tracking completo**: Usuario, fecha solicitud, fecha respuesta, observaciones
- **Vista agrupada**: Lotes con múltiples ítems

### Control de Stock
- **Stock general**: Productos en almacén
- **Stock por usuario**: Asignaciones individuales
- **Validación automática**: Alertas si no hay stock disponible
- **Historial**: Movimientos de entrada y salida

### Sistema de Alertas
- **Stock crítico**: Alertas personalizadas por producto (configurable)
- **Próximos a vencer**: Umbrales personalizados por producto
  - 🔴 Crítico: Días configurables (default 7)
  - 🟠 Urgente: Días configurables (default 15)
  - 🟡 Atención: Días configurables (default 30)
- **FEFO Automático**: First Expired, First Out en asignaciones
- **Bloqueo de vencidos**: No permite asignar productos vencidos

### Gestión de Productos Vencidos
- **Vista de vencidos**: Lista de productos con fecha de vencimiento pasada
- **Dar de baja**: Registro de mermas con cálculo de valor perdido
- **Devolver a proveedor**: Gestión de devoluciones con seguimiento de estado
- **Bloqueo de ingresos**: Cuarentena de lotes con problemas
- **Reportes de pérdidas**: Análisis de bajas por motivo y período

### Auditoría
- Registro de todas las acciones críticas
- Usuario, fecha/hora, acción, módulo, descripción
- Consulta de logs con filtros
- Estadísticas de actividad

## 🔐 Permisos del Sistema

### Roles Predefinidos
- **Administrador**: Acceso total
- **Trabajador**: Permisos limitados (ver inventario, crear pedidos, salidas)

### Permisos Granulares
- **Productos**: `products.view`, `products.create`, `products.update`, `products.delete`
- **Inventario**: `inventory.viewAll`, `inventory.viewSelf`, `inventory.assign`
- **Ingresos**: `ingresos.view`, `ingresos.create`, `ingresos.update`, `ingresos.delete`
- **Pedidos**: `pedidos.view`, `pedidos.create`, `pedidos.approve`, `pedidos.reject`, `pedidos.deliver`
- **Proveedores**: `providers.view`, `providers.create`, `providers.update`, `providers.delete`
- **Productos Vencidos**: `vencidos.view`, `vencidos.baja`, `vencidos.devolucion`
- **Cotizaciones**: `cotizaciones.view`, `cotizaciones.create`
- **Órdenes de Compra**: `ordenes.view`, `ordenes.create`, `ordenes.update`, `ordenes.delete`, `ordenes.approve`, `ordenes.seguimiento`
- **Configuración**: `empresa.config`
- **Reportes**: `reports.view`, `reports.export`, `reports.advanced`
- **Usuarios**: `users.manage`
- **Roles**: `roles.manage`
- **Catálogos**: `areas.manage`, `ubicaciones.manage`, `unidades.manage`

## 🗄️ Base de Datos

### Tablas principales
- `users`: Usuarios del sistema
- `roles`: Roles con permisos JSON
- `productos`: Catálogo de productos con alertas personalizadas
- `proveedores`: Catálogo de proveedores (incluye RUC de 11 dígitos)
- `ingresos`: Registro de entradas con fechas de vencimiento y control de disponibilidad
- `pedidos`: Solicitudes de trabajadores
- `user_stock`: Stock asignado por usuario
- `user_salidas`: Registro de salidas
- `bajas_inventario`: Registro de productos dados de baja
- `devoluciones_proveedor`: Registro de devoluciones a proveedores
- `cotizaciones`: Cotizaciones para proveedores
- `cotizaciones_detalle`: Productos incluidos en cada cotización
- `ordenes_compra`: Órdenes de compra formales con precios y estados
- `ordenes_compra_detalle`: Productos con precios en cada orden
- `seguimiento_entregas`: Timeline de eventos y cambios de estado de órdenes
- `configuracion_empresa`: Configuración de datos corporativos
- `auditoria`: Logs del sistema
- `areas`, `ubicaciones`, `unidades_medida`: Catálogos

## 🔧 Configuración

### API Base URL

Por defecto, el frontend busca la API en `http://localhost:3001/api`.

Para cambiar esto en producción, edita `src/lib/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
```

Y crea un archivo `.env` en la raíz:
```env
VITE_API_URL=https://tu-api.com/api
```

### CORS

El backend permite todas las origins por defecto. Para producción, edita `server/src/index.js`:

```javascript
app.use(cors({
  origin: 'https://tu-dominio.com',
  credentials: true
}));
```

## 📦 Scripts Disponibles

### Frontend
```bash
npm run dev          # Servidor desarrollo (Vite)
npm run build        # Build producción
npm run preview      # Preview del build
npm run lint         # Linter ESLint
```

### Backend
```bash
npm run dev          # Servidor con watch mode
npm start            # Servidor producción
```

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port already in use"
```bash
# Cambiar puerto en vite.config.ts o server/src/index.js
```

### Error: "Database locked"
```bash
# Cerrar todas las conexiones a almacen.db
# Reiniciar servidor
```

### Problemas con CORS
```bash
# Verificar que el backend tenga CORS habilitado
# Verificar la URL de la API en el frontend
```

## 📝 Changelog

### v2.2.1 - Integración Órdenes → Ingresos ✅ (Actual - Oct 2025)
**Integración completa: Órdenes de Compra → Ingresos de Inventario**

#### Nuevas Funcionalidades
- ✅ **Botón "Ingresar"** en órdenes con estado ENTREGADA
- ✅ **Pre-carga automática** de productos desde la orden de compra
- ✅ **Precio como subtotal**: Usa cantidad × precio_unitario (no precio unitario)
- ✅ **Ubicación automática**: Se toma del producto (no editable por usuario)
- ✅ **Área automática**: Se toma del producto (no editable por usuario)
- ✅ **Cantidad disponible**: Se inicializa automáticamente con cantidad ingresada
- ✅ **Campos editables**: Fecha vencimiento, fecha factura, serie factura
- ✅ **Modal dedicado**: ModalIngresarOrden con formulario simplificado
- ✅ **Auditoría completa**: Registra quién creó el ingreso desde qué orden

#### Backend (1 endpoint nuevo)
- ✅ POST `/api/ordenes-compra/:id/crear-ingreso` - Crear ingresos desde orden ENTREGADA
  - Valida que la orden esté en estado ENTREGADA
  - Crea un ingreso por cada producto en la orden
  - Pre-carga: productoId, proveedorId, cantidad, precio (subtotal), fechas opcionales
  - Usa ubicación y área del producto automáticamente
  - Inicializa `cantidad_disponible` con el valor de `cantidad`
  - Agrega seguimiento a la orden
  - Registra auditoría completa

#### Frontend (Hook + Modal)
- ✅ Hook `useCrearIngresoDesdeOrden()` en `useOrdenesCompra.ts`
- ✅ Modal `ModalIngresarOrden` integrado en `OrdenesCompraPage`
- ✅ Botón visible solo para órdenes ENTREGADAS
- ✅ Formulario con 3 campos por producto:
  - Fecha Vencimiento (DatePicker)
  - Fecha Factura (DatePicker)
  - Serie Factura (Input)

#### Flujo de Trabajo
1. Usuario marca orden como ENTREGADA
2. Aparece botón "Ingresar" en la fila
3. Click en "Ingresar" abre modal con productos pre-cargados
4. Usuario completa campos opcionales (fechas, serie factura)
5. Sistema crea ingresos automáticamente:
   - Toma precio como subtotal (cantidad × precio_unitario)
   - Usa ubicación del producto
   - Usa área del producto
   - Inicializa cantidad_disponible = cantidad
6. Actualiza seguimiento de la orden
7. Invalida caché de ingresos y órdenes

#### Mejoras de UX/UI
- ✅ Pre-visualización de datos: Muestra proveedor, fecha orden, productos
- ✅ Cálculo visible: Precio total = cantidad × precio unitario
- ✅ Layout optimizado: 3 campos en una fila (compacto)
- ✅ Validación automática: No permite ingresar si no está ENTREGADA
- ✅ Mensajes de éxito con detalle de productos ingresados
- ✅ Icono inbox en botón "Ingresar"

#### Ventajas del Sistema
- 🚀 **Automatización**: 90% de campos pre-llenados
- 🎯 **Precisión**: Usa precios exactos de la orden de compra
- ⚡ **Rapidez**: Ingreso de múltiples productos en un click
- 🔒 **Trazabilidad**: Link directo orden → ingresos
- 📊 **Consistencia**: Datos uniformes entre órdenes e ingresos

## 👨‍💻 Desarrollo

### Agregar nueva funcionalidad

1. **Backend**: Agregar endpoint en `server/src/index.js`
2. **Frontend**: 
   - Crear hook en `src/hooks/`
   - Crear componente en `src/components/` o página en `src/pages/`
   - Agregar ruta en `src/App.tsx`

### Ejecutar migraciones

Las migraciones se ejecutan automáticamente al iniciar el servidor.
Ver `server/src/db.js` para el esquema.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/NuevaCaracteristica`)
3. Commit tus cambios (`git commit -m 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/NuevaCaracteristica`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 📧 Contacto

Michael Gomez - [@Michael2410](https://github.com/Michael2410)

---

**⭐ Si te gusta este proyecto, dale una estrella en GitHub!**

