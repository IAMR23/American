// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
   allowedHosts: ['.ngrok-free.app'], 
    host: true, // 👈 esto permite el acceso desde tu red local
    port: 5173  // puedes dejarlo así o cambiarlo
  }
})
