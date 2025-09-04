import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose the dev server to your LAN so mobile/other devices can access it
  server: {
    host: true,
  port: 5173,
  // If 5173 is busy, pick the next available port automatically
  strictPort: false,
  },
})
