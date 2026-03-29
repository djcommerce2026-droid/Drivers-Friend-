
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || '')
  },
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild', // Usa o nativo do Vite para evitar erro de "terser not found"
    rollupOptions: {
      input: 'index.html',
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      },
    },
  }
});
