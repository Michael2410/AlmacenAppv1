# 🎯 Guía Visual de Deployment - AlmacenApp

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│           AlmacenApp v2.0.0 - Deployment Flow              │
│                                                             │
└─────────────────────────────────────────────────────────────┘


╔══════════════════════════════════════════════════════════════╗
║                    OPCIÓN 1: DESARROLLO                      ║
╚══════════════════════════════════════════════════════════════╝

    ┌───────────────┐
    │ start-dev.bat │
    └───────┬───────┘
            │
    ┌───────▼────────┐         ┌──────────────┐
    │   Terminal 1   │         │  Terminal 2  │
    │                │         │              │
    │  Backend API   │◄───────►│  Frontend    │
    │  localhost:3001│         │  localhost:  │
    │                │         │  5173        │
    └────────────────┘         └──────────────┘

    URLs:
    • Frontend: http://localhost:5173
    • Backend:  http://localhost:3001/api


╔══════════════════════════════════════════════════════════════╗
║              OPCIÓN 2: PRODUCCIÓN LOCAL (Windows)            ║
╚══════════════════════════════════════════════════════════════╝

Step 1: BUILD
    ┌────────────────────┐
    │build-production.bat│
    └──────────┬─────────┘
               │
    ┌──────────▼───────────┐
    │ 1. npm run build     │
    │ 2. Copy dist/ →      │
    │    server/public/    │
    │ 3. npm install       │
    └──────────────────────┘

Step 2: CONFIGURE
    ┌─────────────────────┐
    │  server/.env        │
    ├─────────────────────┤
    │ PORT=3001           │
    │ JWT_SECRET=xxxxx    │
    │ NODE_ENV=production │
    └─────────────────────┘

Step 3: START
    ┌────────────────────┐
    │start-production.bat│
    └──────────┬─────────┘
               │
    ┌──────────▼──────────┐
    │   node src/index.js │
    │                     │
    │  ┌───────────────┐  │
    │  │   Express     │  │
    │  │  (Backend)    │  │
    │  │               │  │
    │  │   Sirve:      │  │
    │  │  • Frontend   │  │
    │  │  • API        │  │
    │  └───────────────┘  │
    └─────────────────────┘

    URL: http://localhost:3001


╔══════════════════════════════════════════════════════════════╗
║         OPCIÓN 3: PRODUCCIÓN EN SERVIDOR (Linux/VPS)         ║
╚══════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────┐
│ FASE 1: PREPARACIÓN                                          │
└──────────────────────────────────────────────────────────────┘

    1. Instalar Node.js 18+
       └─→ curl -fsSL https://deb.nodesource.com/.../setup_18.x

    2. Instalar PM2
       └─→ npm install -g pm2

    3. Clonar repositorio
       └─→ git clone https://github.com/...

    4. Instalar dependencias
       └─→ npm install (frontend y backend)


┌──────────────────────────────────────────────────────────────┐
│ FASE 2: BUILD                                                 │
└──────────────────────────────────────────────────────────────┘

    npm run build
         │
         ▼
    ┌─────────┐      cp -r       ┌────────────────┐
    │  dist/  │  ────────────►    │server/public/  │
    └─────────┘                   └────────────────┘


┌──────────────────────────────────────────────────────────────┐
│ FASE 3: CONFIGURACIÓN                                         │
└──────────────────────────────────────────────────────────────┘

    server/.env
    ┌────────────────────┐
    │ PORT=3001          │
    │ JWT_SECRET=xxxxx   │
    │ NODE_ENV=production│
    └────────────────────┘

    server/src/index.js (agregar)
    ┌──────────────────────────────────────┐
    │ app.use(express.static(...public))   │
    │ app.get('*', ...) // Catch-all       │
    └──────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────┐
│ FASE 4: DEPLOY CON PM2                                       │
└──────────────────────────────────────────────────────────────┘

    pm2 start ecosystem.config.json
         │
         ▼
    ┌────────────────────────────────┐
    │       PM2 Process Manager      │
    │                                │
    │  ┌──────────────────────────┐  │
    │  │   almacen-api            │  │
    │  │   Status: online         │  │
    │  │   Restarts: 0            │  │
    │  │   Memory: 85MB           │  │
    │  └──────────────────────────┘  │
    │                                │
    │  Auto-restart: ✓               │
    │  Logs: ./logs/                 │
    └────────────────────────────────┘

    Comandos útiles:
    • pm2 logs almacen-api
    • pm2 restart almacen-api
    • pm2 stop almacen-api

    URL: http://tu-ip:3001


╔══════════════════════════════════════════════════════════════╗
║          OPCIÓN 4: PRODUCCIÓN CON NGINX + SSL                ║
╚══════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────┐
│ ARQUITECTURA                                                  │
└──────────────────────────────────────────────────────────────┘

    Internet
       │
       │ HTTPS (443)
       ▼
    ┌─────────────────┐
    │     Nginx       │  ← Reverse Proxy
    │  (Certificado   │
    │   SSL/TLS)      │
    └────────┬────────┘
             │
             │ HTTP (3001)
             ▼
    ┌─────────────────┐
    │   Node.js +     │
    │   Express       │
    │  (AlmacenApp)   │
    └─────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ SETUP                                                         │
└──────────────────────────────────────────────────────────────┘

    1. Instalar Nginx
       └─→ sudo apt install nginx -y

    2. Configurar sitio
       └─→ /etc/nginx/sites-available/almacenapp

    3. Habilitar sitio
       └─→ ln -s sites-available/... sites-enabled/

    4. Instalar Certbot
       └─→ sudo apt install certbot python3-certbot-nginx

    5. Obtener certificado SSL
       └─→ sudo certbot --nginx -d tu-dominio.com

    URL: https://tu-dominio.com


╔══════════════════════════════════════════════════════════════╗
║            OPCIÓN 5: CLOUD PLATFORMS (Render/Railway)        ║
╚══════════════════════════════════════════════════════════════╝

    GitHub Repository
           │
           │ Push code
           ▼
    ┌──────────────────┐
    │  Cloud Platform  │
    │  (Render/Railway)│
    └────────┬─────────┘
             │
             │ Auto-deploy
             ▼
    ┌──────────────────┐
    │   Build:         │
    │   npm install && │
    │   npm run build  │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │   Start:         │
    │   node index.js  │
    └────────┬─────────┘
             │
             ▼
       Live URL 🎉


╔══════════════════════════════════════════════════════════════╗
║                    MONITOREO POST-DEPLOY                      ║
╚══════════════════════════════════════════════════════════════╝

    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │  PM2 Logs    │    │  UptimeRobot │    │   Backups    │
    │              │    │              │    │              │
    │  pm2 logs    │    │  Monitor     │    │   Cron Job   │
    │  pm2 monit   │    │  Uptime      │    │   Daily 2AM  │
    │              │    │              │    │              │
    └──────────────┘    └──────────────┘    └──────────────┘


╔══════════════════════════════════════════════════════════════╗
║                    FLUJO DE ACTUALIZACIÓN                     ║
╚══════════════════════════════════════════════════════════════╝

    Desarrollo Local
           │
           ▼
    Git Commit & Push
           │
           ▼
    Servidor Producción
           │
           ▼
    ┌──────────────────┐
    │  git pull        │
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │  npm install     │
    │  npm run build   │
    └────────┬─────────┘
             │
    ┌────────▼─────────┐
    │  pm2 restart     │
    └────────┬─────────┘
             │
             ▼
       ✓ Deployed!


╔══════════════════════════════════════════════════════════════╗
║                        DECISIÓN RÁPIDA                        ║
╚══════════════════════════════════════════════════════════════╝

    ¿Qué opción elegir?

    ┌─────────────────────────────────────────────────────────┐
    │ ¿Primera vez? ¿Solo probar?                             │
    │ → OPCIÓN 1 o 2 (Local)                                  │
    └─────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────┐
    │ ¿Tienes un VPS o servidor dedicado?                     │
    │ → OPCIÓN 3 (PM2) o OPCIÓN 4 (Nginx + SSL)              │
    └─────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────┐
    │ ¿Quieres algo simple sin mantener servidor?             │
    │ → OPCIÓN 5 (Render, Railway, Heroku)                   │
    └─────────────────────────────────────────────────────────┘


╔══════════════════════════════════════════════════════════════╗
║                      CHECKLIST RÁPIDO                         ║
╚══════════════════════════════════════════════════════════════╝

    □ Código actualizado (git pull)
    □ Dependencias instaladas
    □ Build exitoso (npm run build)
    □ JWT_SECRET cambiado en .env
    □ Contraseña admin cambiada
    □ CORS configurado
    □ Frontend copiado a server/public/
    □ Express sirve archivos estáticos
    □ Probado localmente
    □ PM2 configurado (si aplica)
    □ Nginx configurado (si aplica)
    □ SSL instalado (si aplica)
    □ Firewall configurado
    □ Backup configurado
    □ Monitoreo activo

    ✓ ¡Listo para producción!


═══════════════════════════════════════════════════════════════

📚 Documentación Completa:
   • README.md - Descripción del proyecto
   • DEPLOYMENT.md - Guía detallada paso a paso
   • QUICKSTART.md - Comandos rápidos
   • PRE-DEPLOY-CHECKLIST.md - Lista de verificación
   • CHANGELOG.md - Qué hay de nuevo en v2.0.0

🆘 Soporte:
   https://github.com/Michael2410/AlmacenApp/issues

═══════════════════════════════════════════════════════════════
