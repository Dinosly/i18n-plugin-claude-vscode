import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import I18nPlugin from "@i18n-plugin/unplugin/vite";
import path from "path";

export default defineConfig({
  plugins: [vue(), I18nPlugin()],
  resolve: {
    alias: {
      crypto: "crypto-browserify",
      '@i18n-plugin/core': path.resolve(__dirname, '../../packages/core/src'),
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
});
