import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Deux sorties :
//  - `vite build`               → dist/ (Vercel)
//  - `vite build --mode offline` → dist-offline/index.html, un seul fichier autonome
export default defineConfig(({ mode }) => {
  const offline = mode === 'offline'
  return {
    base: './',
    plugins: [react(), tailwindcss(), ...(offline ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    build: offline
      ? { outDir: 'dist-offline', assetsInlineLimit: 100_000_000, cssCodeSplit: false, chunkSizeWarningLimit: 100_000 }
      : { outDir: 'dist', chunkSizeWarningLimit: 4000 },
    server: { port: 5180, host: true },
  }
})
