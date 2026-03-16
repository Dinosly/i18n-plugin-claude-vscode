const { defineConfig } = require('@vue/cli-service')
const I18nPlugin = require('@i18n-plugin/unplugin/webpack').default
const path = require('path')

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: '/',
  devServer: {
    port: 8080
  },
  configureWebpack: {
    plugins: [
      I18nPlugin({
        vueVersion: 2
      })
    ]
  }
})
