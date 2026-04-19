import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        strictPort: true,
        host: '0.0.0.0',
        proxy: {
          // 1. FastAPI Backend (Most specific prefix)
          '/api/v1': {
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
          },
          // 2. Spring Boot Backend (General /api prefix)
          '/api': {
            target: 'http://127.0.0.1:8090',
            changeOrigin: true,
          },
          // 3. Spring Boot Backend (Additional /v1 prefix used in lib/api.ts)
          '/v1': {
            target: 'http://127.0.0.1:8090',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
