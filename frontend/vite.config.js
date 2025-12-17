import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

try {
  // Tentar ler a versão do package.json
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
  process.env.APP_VERSION = packageJson.version
} catch (e) {
  process.env.APP_VERSION = '0.0.0'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION),
  },
})
