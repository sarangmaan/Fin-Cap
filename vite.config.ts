import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Casting process to any to avoid TS error: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
    },
    server: {
      host: true, // Listen on all addresses
      allowedHosts: true, // Allow the Render URL to access the server
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000', // Changed from localhost to 127.0.0.1 to ensure IPv4 binding
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});