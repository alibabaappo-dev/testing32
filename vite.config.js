import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  }
})
// vite.config.js mein
export default defineConfig({
  publicDir: 'public', 
  // ... baaki settings
})
