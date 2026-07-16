import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the build works unmodified whether it's served
  // from a domain root or a GitHub Pages project subpath (/<repo>/).
  base: './',
  plugins: [react()],
})
