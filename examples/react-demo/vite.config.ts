import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import I18nPlugin from '@i18n-plugin/unplugin/vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@i18n-plugin/core': path.resolve(__dirname, '../../packages/core/src/index.ts')
    }
  },
  plugins: [
    react(),
    I18nPlugin()
  ]
})
