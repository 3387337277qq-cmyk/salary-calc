import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  // GitHub Pages用 /salary-calc/，本地用 /
  base: process.env.NODE_ENV === 'production' ? '/salary-calc/' : '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
