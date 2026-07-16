import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the build works unmodified whether it's served
  // from a domain root or a GitHub Pages project subpath (/<repo>/).
  base: './',
  plugins: [react()],
  build: {
    // This repo's GitHub Pages source is "deploy from the main branch's
    // root", not a GitHub Actions artifact — so the built site has to land
    // at the true repo root (one level up from this app/ source tree) for
    // Pages to find it. CI empties and repopulates it on every push; see
    // .github/workflows/deploy-pages.yml.
    outDir: '../',
    emptyOutDir: false,
  },
})
