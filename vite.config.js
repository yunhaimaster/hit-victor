import { defineConfig } from 'vite';

export default defineConfig({
  base: '/hit-victor/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  resolve: {
    alias: {
      'firebase/app': 'firebase/app/dist/esm/index.esm.js',
      'firebase/firestore': 'firebase/firestore/dist/esm/index.esm.js'
    }
  }
}); 