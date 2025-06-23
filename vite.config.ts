import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    external: ['pg'],
    alias: {
      pg: path.resolve(__dirname, './dummy.js'),
      'pg-native': path.resolve(__dirname, './dummy.js'),
    }
  }
})
