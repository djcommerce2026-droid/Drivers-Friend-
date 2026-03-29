
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'fix-native-modules',
      resolveId(id) {
        if (id.includes('native.js') || id === 'xxhash') {
          return `virtual:${id}`;
        }
      },
      load(id) {
        if (id.startsWith('virtual:')) {
          return 'export const xxhashBase16 = (str) => str; export default {};';
        }
      }
    }
  ],
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
    minify: false, // Desativar minificação para evitar binários nativos do esbuild
    sourcemap: false, // Desativar sourcemaps para reduzir processamento
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
