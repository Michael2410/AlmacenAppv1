import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read .env variables for this mode
  const root = (globalThis as any)?.process?.cwd?.() || undefined;
  const env = loadEnv(mode, root, '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3001';
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
