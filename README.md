# AlmacenApp

Sistema de gestión de inventario desarrollado con React + TypeScript y Express + SQLite.

## Características

- 🔐 **Autenticación**: Login con JWT y roles de usuario
- 📦 **Gestión de Productos**: CRUD completo con marca incluida
- 📋 **Inventario**: Control de stock general y por usuario
- 🚚 **Ingresos**: Registro con marca automática desde producto
- 📝 **Pedidos**: Sistema de solicitudes múltiples por trabajador
- 👥 **Usuarios**: Administración de trabajadores y permisos
- 📊 **Reportes**: Exportación y análisis de datos

## Tecnologías

- **Frontend**: React 18, TypeScript, Vite, Ant Design, TanStack Query
- **Backend**: Express, SQLite (better-sqlite3), JWT, bcrypt
- **Estilo**: TailwindCSS

## Instalación y Ejecución

### Opción 1: Script automático
Ejecuta el archivo `start-dev.bat` para iniciar ambos servidores automáticamente.

### Opción 2: Manual

#### Backend
```bash
cd server
npm install
npm run dev
```

#### Frontend  
```bash
npm install
npm run dev
```

## Usuarios por defecto

- **Admin**: admin@demo.com / admin123

## Estructura del Proyecto

```
AlmacenApp/
├── src/                 # Frontend React
│   ├── components/      # Componentes reutilizables
│   ├── pages/          # Páginas principales
│   ├── lib/            # Servicios API
│   ├── types/          # Tipos TypeScript
│   └── store/          # Estado global Zustand
├── server/             # Backend Express
│   └── src/
│       ├── index.js    # Servidor principal
│       └── db.js       # Base de datos SQLite
└── public/             # Archivos estáticos
```

## Funcionalidades Principales

### Para Administradores
- Gestión completa de usuarios, productos y proveedores
- Control de ingresos y asignaciones de inventario
- Aprobación y entrega de pedidos
- Visualización de reportes

### Para Trabajadores  
- Ver inventario personal
- Realizar pedidos múltiples
- Registrar salidas de productos
- Consultar historial de movimientos

## Novedades en Productos
- **Campo Marca**: Los productos ahora incluyen marca opcional
- **Auto-completado**: Al crear un ingreso, la marca se llena automáticamente desde el producto seleccionado
- **Visualización**: La marca se muestra en la lista de productos y en el selector de ingresos

