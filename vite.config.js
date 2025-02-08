import { defineConfig } from 'vite';

export default defineConfig({
  base: '/hit-victor/',
  server: {
    port: 3000,
    open: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
}); 