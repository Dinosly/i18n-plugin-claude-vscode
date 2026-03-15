import { ref, App, Plugin } from 'vue'
import { createI18n, setGlobalI18n, getGlobalI18n } from './core'
import type { I18nConfig, I18nCore } from './types'

/**
 * Vue 3 适配层
 * 利用 ref 包装 locale，劫持全局属性 $t
 */
export function createVue3I18n(config: I18nConfig): Plugin & I18nCore {
  const i18nCore = createI18n(config)
  setGlobalI18n(i18nCore)

  // 使用 ref 包装 locale，利用 Vue 3 响应式系统
  const localeRef = ref(i18nCore.locale)

  // 代理 setLocale，同步更新 ref
  const originalSetLocale = i18nCore.setLocale
  i18nCore.setLocale = (locale: string) => {
    originalSetLocale(locale)
    localeRef.value = locale
  }

  // 包装 t 函数，访问 localeRef.value 触发依赖收集
  const t = (key: string, ...args: any[]) => {
    // 访问 localeRef.value 建立响应式依赖
    void localeRef.value
    return i18nCore.t(key, ...args)
  }

  // Vue 3 插件安装函数
  const install = (app: App) => {
    // 注入全局属性
    app.config.globalProperties.$t = t
    app.config.globalProperties.$i18n = i18nCore

    // 提供注入
    app.provide('i18n', i18nCore)
    app.provide('$t', t)
  }

  return {
    ...i18nCore,
    t,
    install
  }
}

/**
 * Vue 3 Composition API Hook
 */
export function useI18n() {
  const i18nCore = getGlobalI18n()
  const localeRef = ref(i18nCore.locale)

  // 订阅语言变更
  i18nCore.subscribe(() => {
    localeRef.value = i18nCore.locale
  })

  const t = (key: string, ...args: any[]) => {
    void localeRef.value
    return i18nCore.t(key, ...args)
  }

  return {
    locale: localeRef,
    t,
    setLocale: i18nCore.setLocale,
    loadMessages: i18nCore.loadMessages
  }
}
