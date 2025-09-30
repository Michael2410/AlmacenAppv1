# Almacén App (React + Vite + TS)

Requisitos: Node 18+.

Variables de entorno:
- VITE_API_URL (opcional). Base URL del API (por ejemplo, https://api.tu-dominio.com/api). En dev, si usas proxy, déjalo vacío.
- VITE_USE_MOCKS=true|false. true usa servicios mock locales; false consume el backend real.
- VITE_PROXY_TARGET (dev). URL del backend para proxy (ej: http://localhost:3000).

Instalación y ejecución:

```bash
npm install
npm run dev
```

Abrir http://localhost:5173

Stack: Ant Design, Tailwind CSS, Zustand, TanStack Query, React Router, Axios, Dayjs, Zod.

Conexión al backend (dev):
1) Copia .env.example a .env y ajusta:
	- VITE_USE_MOCKS=false
	- VITE_PROXY_TARGET=http://localhost:3001
	- (Deja VITE_API_URL vacío para que el frontend use /api y el proxy lo redirija)
2) Levanta el backend local incluido en /server:
	- cd server
	- npm install
	- npm run dev (escucha en http://localhost:3001)
3) Ejecuta el frontend: npm run dev
4) En producción define VITE_API_URL y VITE_USE_MOCKS=false

