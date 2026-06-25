import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';

export default defineConfig({
  plugins: [vue()],
  base: './', // 确保 Electron 加载相对路径
  server: {
    port: 5173,
  },
});
