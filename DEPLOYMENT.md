# 🚀 Guía de Despliegue - AlmacenApp

## Opción 1: Servidor Local o VPS (Recomendado)

### Paso 1: Preparar el servidor

```bash
# Actualizar sistema (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18+ (usando NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version

# Instalar PM2 globalmente
sudo npm install -g pm2
```

### Paso 2: Clonar y preparar aplicación

```bash
# Clonar repositorio
git clone https://github.com/Michael2410/AlmacenApp.git
cd AlmacenApp

# Instalar dependencias
npm install
cd server && npm install && cd ..

# Configurar variables de entorno
cp server/.env.example server/.env
nano server/.env  # Editar y configurar JWT_SECRET
```

### Paso 3: Construir frontend

```bash
# Build de producción
npm run build

# Copiar archivos al servidor
cp -r dist/* server/public/
```

### Paso 4: Modificar server/src/index.js

Agregar al final del archivo (antes de `app.listen`):

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

### Paso 5: Iniciar con PM2

```bash
# Desde la raíz del proyecto
pm2 start ecosystem.config.json

# Ver logs
pm2 logs almacen-api

# Verificar estado
pm2 status

# Auto-inicio en reinicio del servidor
pm2 startup
pm2 save
```

### Paso 6: Configurar firewall

```bash
# Permitir puerto 3001
sudo ufw allow 3001/tcp
sudo ufw enable
```

**Aplicación disponible en:** `http://tu-ip:3001`

---

## Opción 2: Con Nginx (Reverse Proxy)

### Paso 1-5: Igual que Opción 1

### Paso 6: Instalar y configurar Nginx

```bash
# Instalar Nginx
sudo apt install nginx -y

# Crear configuración
sudo nano /etc/nginx/sites-available/almacenapp
```

Contenido del archivo:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;  # Cambiar por tu dominio o IP

    # Frontend (archivos estáticos)
    location / {
        root /home/user/AlmacenApp/server/public;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/almacenapp /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Permitir puertos
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**Aplicación disponible en:** `http://tu-dominio.com`

---

## Opción 3: Con SSL (HTTPS) usando Certbot

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com

# Renovación automática (ya viene configurada)
sudo certbot renew --dry-run
```

**Aplicación disponible en:** `https://tu-dominio.com`

---

## Opción 4: Docker (Opcional)

### Dockerfile para Backend

Crear `server/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src ./src
COPY public ./public

EXPOSE 3001

CMD ["node", "src/index.js"]
```

### docker-compose.yml

Crear en la raíz:

```yaml
version: '3.8'

services:
  almacen-api:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3001
    volumes:
      - ./server/almacen.db:/app/almacen.db
    restart: unless-stopped
```

### Ejecutar con Docker

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

---

## Opción 5: Plataformas Cloud

### Render.com (Gratis)

1. Conectar repositorio GitHub
2. Configurar:
   - **Build Command:** `npm install && npm run build && cp -r dist/* server/public/`
   - **Start Command:** `cd server && node src/index.js`
   - **Environment:** `NODE_ENV=production`, `JWT_SECRET=...`

### Railway.app (Gratis con límites)

1. Conectar GitHub
2. Deploy automático
3. Configurar variables de entorno

### Heroku

```bash
# Instalar Heroku CLI
npm install -g heroku

# Login
heroku login

# Crear app
heroku create tu-app-almacen

# Configurar buildpack
heroku buildpacks:add heroku/nodejs

# Deploy
git push heroku main

# Configurar variables
heroku config:set JWT_SECRET=tu_secreto
heroku config:set NODE_ENV=production
```

---

## 🔧 Comandos PM2 Útiles

```bash
# Ver aplicaciones corriendo
pm2 list

# Ver logs en tiempo real
pm2 logs almacen-api

# Reiniciar aplicación
pm2 restart almacen-api

# Detener aplicación
pm2 stop almacen-api

# Eliminar de PM2
pm2 delete almacen-api

# Monitorear recursos
pm2 monit

# Ver información detallada
pm2 show almacen-api
```

---

## 🔒 Checklist de Seguridad

- [ ] Cambiar JWT_SECRET en producción
- [ ] Cambiar contraseña del admin
- [ ] Configurar CORS correctamente
- [ ] Habilitar HTTPS con SSL
- [ ] Configurar firewall (UFW)
- [ ] Mantener Node.js actualizado
- [ ] Hacer backups de almacen.db
- [ ] Configurar rate limiting (opcional)
- [ ] Revisar logs periódicamente

---

## 📊 Monitoreo y Backups

### Backup automático de base de datos

```bash
# Crear script de backup
nano /home/user/backup-almacen.sh
```

Contenido:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/user/backups"
DB_PATH="/home/user/AlmacenApp/server/almacen.db"

mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/almacen_$DATE.db

# Mantener solo últimos 7 días
find $BACKUP_DIR -name "almacen_*.db" -mtime +7 -delete
```

```bash
# Dar permisos
chmod +x /home/user/backup-almacen.sh

# Agregar a crontab (diario a las 2 AM)
crontab -e
# Agregar línea:
0 2 * * * /home/user/backup-almacen.sh
```

---

## 🐛 Troubleshooting Producción

### Error: Puerto en uso
```bash
# Encontrar proceso usando puerto 3001
sudo lsof -i :3001
# O
sudo netstat -tulpn | grep 3001

# Matar proceso
sudo kill -9 <PID>
```

### Error: Permisos de base de datos
```bash
# Dar permisos al directorio
chmod 755 server/
chmod 644 server/almacen.db
```

### Ver logs del sistema
```bash
# Logs de PM2
pm2 logs almacen-api --lines 100

# Logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 📝 Notas Finales

- **Performance:** La app puede manejar ~100 usuarios concurrentes en un VPS básico (1GB RAM)
- **Base de datos:** SQLite es adecuado hasta ~100k registros
- **Escalabilidad:** Para más usuarios, considerar PostgreSQL/MySQL
- **CDN:** Opcional para servir assets estáticos más rápido

---

¿Problemas? Abre un issue en: https://github.com/Michael2410/AlmacenApp/issues
