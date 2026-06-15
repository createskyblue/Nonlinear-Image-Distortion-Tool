import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Nonlinear-Image-Distortion-Tool/',
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/tmp/**'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
