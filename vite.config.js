import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import appPackage from './package.json'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appPackage.version)
  },
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true
  }
})
