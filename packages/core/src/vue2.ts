import { createI18n, setGlobalI18n } from './core'
import type { I18nConfig, I18nCore } from './types'

/**
 * Vue 2 适配层
 * 利用 Vue.observable() 包装状态，通过全局 Mixin 注入 $t
 */
export function createVue2I18n(config: I18nConfig): I18nCore & { install: (vue: any) => void } {
  const i18nCore = createI18n(config)
  setGlobalI18n(i18nCore)

  // 动态导入 Vue 2（运行时）
  let Vue: any
  try {
    Vue = require('vue')
  } catch {
    throw new Error('Vue 2 is required but not installed')
  }

  // 使用 Vue.observable 创建响应式对象
  const state = Vue.observable({
    locale: i18nCore.locale
  })

  // 代理 setLocale
  const originalSetLocale = i18nCore.setLocale
  i18nCore.setLocale = (locale: string) => {
    originalSetLocale(locale)
    state.locale = locale
  }

  // 包装 t 函数
  const t = (key: string, ...args: any[]) => {
    void state.locale // 触发依赖收集
    return i18nCore.t(key, ...args)
  }

  // Vue 2 插件安装函数
  const install = (vue: any) => {
    // 全局 Mixin 注入 $t
    vue.mixin({
      beforeCreate() {
        (this as any).$t = t
        ;(this as any).$i18n = i18nCore
      }
    })

    // 添加类型声明（运行时）
    vue.prototype.$t = t
    vue.prototype.$i18n = i18nCore
  }

  return {
    ...i18nCore,
    t,
    install
  }
}
