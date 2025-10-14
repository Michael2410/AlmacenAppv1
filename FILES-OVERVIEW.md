# 📦 Archivos de Producción - AlmacenApp

Esta es la lista completa de archivos de documentación y scripts creados para facilitar el despliegue en producción.

## 📚 Documentación

### README.md
**Ubicación:** Raíz del proyecto  
**Descripción:** Documentación completa del proyecto con:
- Características y tecnologías
- Instalación y ejecución (desarrollo y producción)
- Estructura del proyecto
- Funcionalidades principales
- Configuración
- Scripts disponibles
- Troubleshooting

### DEPLOYMENT.md
**Ubicación:** Raíz del proyecto  
**Descripción:** Guía detallada de despliegue con 5 opciones:
1. Servidor Local o VPS
2. Con Nginx (Reverse Proxy)
3. Con SSL/HTTPS (Certbot)
4. Docker
5. Plataformas Cloud (Render, Railway, Heroku)

Incluye:
- Comandos paso a paso
- Configuración de PM2
- Firewall y seguridad
- Backups automáticos
- Troubleshooting

### QUICKSTART.md
**Ubicación:** Raíz del proyecto  
**Descripción:** Guía rápida de inicio para desarrollo y producción
- Comandos esenciales
- Configuración básica
- Problemas comunes
- Referencias a docs completas

### CHANGELOG.md
**Ubicación:** Raíz del proyecto  
**Descripción:** Notas de la versión 2.0.0
- Nuevas funcionalidades detalladas
- Mejoras técnicas
- Bugs corregidos
- Archivos de deployment
- Guía de migración desde v1.0.0
- Estadísticas del release

### PRE-DEPLOY-CHECKLIST.md
**Ubicación:** Raíz del proyecto  
**Descripción:** Lista de verificación completa antes de desplegar:
- Preparación general
- Seguridad
- Base de datos
- Frontend y Backend
- Testing
- Monitoreo
- Plan de rollback

## 🔧 Scripts de Automatización

### build-production.bat
**Ubicación:** Raíz del proyecto  
**Plataforma:** Windows  
**Descripción:** Script automático que ejecuta:
1. Build del frontend (`npm run build`)
2. Copia archivos a `server/public/`
3. Instala dependencias de producción
4. Verifica configuración (.env)
5. Muestra instrucciones de inicio

**Uso:**
```bash
build-production.bat
```

### start-production.bat
**Ubicación:** Raíz del proyecto  
**Plataforma:** Windows  
**Descripción:** Script para iniciar la aplicación en modo producción
- Verifica que existe el build
- Verifica/copia .env.example si no existe .env
- Inicia el servidor con Node.js

**Uso:**
```bash
start-production.bat
```

### start-dev.bat (Ya existía)
**Ubicación:** Raíz del proyecto  
**Plataforma:** Windows  
**Descripción:** Script para iniciar en modo desarrollo
- Inicia backend en terminal 1
- Inicia frontend en terminal 2

## ⚙️ Archivos de Configuración

### ecosystem.config.json
**Ubicación:** Raíz del proyecto  
**Descripción:** Configuración de PM2 para producción
- Nombre de la app: `almacen-api`
- Directorio de trabajo: `./server`
- Variables de entorno
- Logs y auto-restart
- Memoria máxima: 500MB

**Uso:**
```bash
pm2 start ecosystem.config.json
```

### server/.env.example
**Ubicación:** `server/` folder  
**Descripción:** Plantilla de variables de entorno
```env
PORT=3001
JWT_SECRET=CAMBIAR_EN_PRODUCCION
NODE_ENV=production
```

**Uso:**
```bash
cp server/.env.example server/.env
nano server/.env  # Editar JWT_SECRET
```

### .gitignore (Actualizado)
**Ubicación:** Raíz del proyecto  
**Descripción:** Actualizado para excluir:
- `server/public/` (build del frontend)
- `*.db` (base de datos)
- `.env` (variables sensibles)
- Logs de PM2
- Backups

## 📦 package.json (Actualizados)

### Root package.json
**Cambios:**
- Versión: `2.0.0`
- Metadata: descripción, autor, licencia, repositorio
- Nuevo script: `build:prod` y `copy:dist`

### server/package.json
**Cambios:**
- Versión: `2.0.0`
- Metadata: descripción, autor, licencia
- Script de test agregado

## 🗂️ Estructura Final

```
AlmacenApp/
├── README.md                    # ⭐ Documentación principal
├── DEPLOYMENT.md                # ⭐ Guía de despliegue
├── QUICKSTART.md                # ⭐ Inicio rápido
├── CHANGELOG.md                 # ⭐ Notas de versión
├── PRE-DEPLOY-CHECKLIST.md      # ⭐ Checklist pre-deploy
├── build-production.bat         # ⭐ Script build (Windows)
├── start-production.bat         # ⭐ Script inicio prod (Windows)
├── start-dev.bat                # Script desarrollo (Windows)
├── ecosystem.config.json        # ⭐ Configuración PM2
├── .gitignore                   # ⭐ Actualizado
├── package.json                 # ⭐ Actualizado (v2.0.0)
├── server/
│   ├── .env.example             # ⭐ Template variables
│   ├── package.json             # ⭐ Actualizado (v2.0.0)
│   └── public/                  # ⭐ Build frontend aquí
└── ...

⭐ = Archivos nuevos o actualizados para producción
```

## 🚀 Flujo de Despliegue Recomendado

### Desarrollo Local
```bash
1. start-dev.bat
2. Desarrollar y probar
3. Commit cambios
```

### Pre-Producción
```bash
1. Revisar PRE-DEPLOY-CHECKLIST.md
2. build-production.bat
3. Probar localmente con start-production.bat
```

### Producción
```bash
1. Git pull en servidor
2. npm install (frontend y backend)
3. npm run build
4. Copiar dist/ a server/public/
5. Configurar .env
6. pm2 start ecosystem.config.json
```

Ver **DEPLOYMENT.md** para detalles completos.

## 📖 Orden de Lectura Recomendado

Para nuevos desarrolladores:
1. **README.md** - Entender el proyecto
2. **QUICKSTART.md** - Iniciar rápido en desarrollo

Para deployment:
1. **PRE-DEPLOY-CHECKLIST.md** - Verificar todo antes
2. **DEPLOYMENT.md** - Seguir guía paso a paso
3. **CHANGELOG.md** - Ver qué cambió en v2.0.0

## 🆘 Ayuda Rápida

**¿Cómo inicio en desarrollo?**
→ `start-dev.bat` o ver QUICKSTART.md

**¿Cómo hago build de producción?**
→ `build-production.bat` o ver DEPLOYMENT.md sección "Construcción"

**¿Cómo despliego a un servidor?**
→ Ver DEPLOYMENT.md - Opción 1 (VPS) u Opción 5 (Cloud)

**¿Qué archivos NO debo subir a Git?**
→ Ver .gitignore (especialmente .env y *.db)

**¿Cómo configuro variables de entorno?**
→ Copiar server/.env.example a server/.env y editarlo

**¿Qué cambió en v2.0.0?**
→ Ver CHANGELOG.md

## ✅ Verificación Final

Antes de desplegar, asegúrate de tener:

- [x] README.md actualizado
- [x] DEPLOYMENT.md con 5 opciones de despliegue
- [x] QUICKSTART.md para inicio rápido
- [x] CHANGELOG.md con v2.0.0
- [x] PRE-DEPLOY-CHECKLIST.md
- [x] Scripts de build y start (.bat)
- [x] Configuración PM2 (ecosystem.config.json)
- [x] Template de .env (.env.example)
- [x] .gitignore actualizado
- [x] package.json v2.0.0

---

**📌 Nota Importante:**

Todos estos archivos están diseñados para facilitar el despliegue en producción de forma segura y profesional. Léelos antes de hacer deploy por primera vez.

**Versión de documentación:** 2.0.0  
**Última actualización:** 13 de Octubre, 2025  
**Mantenedor:** Michael Gomez ([@Michael2410](https://github.com/Michael2410))
