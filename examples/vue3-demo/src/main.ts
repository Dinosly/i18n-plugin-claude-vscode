import { createApp } from 'vue'
import App from './App.vue'
import { createVue3I18n } from '@i18n-plugin/core/vue3'

// 创建 i18n 实例
const i18n = createVue3I18n({
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {}
})

// 动态加载语言包
async function loadLocaleMessages(locale: string) {
  try {
    const messages = await import(`../public/locales/${locale}.json`)
    i18n.loadMessages(locale, messages.default)
  } catch (error) {
    console.warn(`Failed to load locale ${locale}:`, error)
  }
}

// 初始化加载默认语言
loadLocaleMessages('zh-CN').then(() => {
  const app = createApp(App)
  app.use(i18n)
  app.mount('#app')
})

// 导出切换语言的函数
export async function switchLocale(locale: string) {
  await loadLocaleMessages(locale)
  i18n.setLocale(locale)
}
