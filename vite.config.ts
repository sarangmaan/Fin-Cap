import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    // This explicitly exposes the system API_KEY to the browser as process.env.API_KEY
    // enabling the client-side SDK to function without a backend proxy.
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});