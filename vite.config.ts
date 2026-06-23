import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/vue/')) return 'vendor-vue';
          if (id.includes('/node_modules/three/')) return 'vendor-three';
          if (id.includes('/src/knowledge-defense/expanded-question-bank.ts')) return 'question-bank';
          if (id.includes('/src/knowledge-defense/three-scene.ts')) return 'three-scene';
        },
      },
    },
  },
  plugins: [vue()],
});
