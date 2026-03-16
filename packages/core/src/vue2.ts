import { createI18n, setGlobalI18n } from './core'
import type { I18nConfig, I18nCore } from './types'

/**
 * Vue 2 适配层
 * 利用 Vue.observable() 包装状态，通过全局 Mixin 注入 $t
 */
export function createVue2I18n(
  config: I18nConfig,
  Vue?: any
): I18nCore & { install: (vue: any) => void } {
  const i18nCore = createI18n(config);
  setGlobalI18n(i18nCore);

  // 使用传入的 Vue 实例或尝试动态导入
  let vueInstance: any = Vue;
  if (!vueInstance) {
    try {
      vueInstance = require("vue");
    } catch {
      throw new Error("Vue 2 is required but not installed");
    }
  }

  // 使用 Vue.observable 创建响应式对象
  const state = vueInstance.observable({
    locale: i18nCore.locale,
  });

  // 将 i18nCore.locale 覆写为响应式 getter，指向 state.locale
  // 这样 computed property 中的 this.$i18n.locale 才能被 Vue 2 追踪依赖
  Object.defineProperty(i18nCore, 'locale', {
    get() { return state.locale; },
    configurable: true,
    enumerable: true,
  });

  // 代理 setLocale
  const originalSetLocale = i18nCore.setLocale;
  i18nCore.setLocale = (locale: string) => {
    originalSetLocale(locale);
    state.locale = locale;
  };

  // 包装 t 函数
  const t = (key: string, ...args: any[]) => {
    console.log('[vue2] $t called, key:', key, 'locale:', state.locale);
    const result = i18nCore.t(key, ...args);
    console.log('[vue2] $t result:', result);
    return result;
  };

  // Vue 2 插件安装函数
  const install = (vue: any) => {
    // 通过 mixin 注入 $t 和 $i18n，同时注入响应式 locale
    vue.mixin({
      beforeCreate() {
        console.log('[vue2] beforeCreate hook, this:', this.$options.name);
        // 订阅语言变更，强制组件更新
        const unsubscribe = i18nCore.subscribe(() => {
          console.log('[vue2] subscribe callback fired for:', this.$options.name, 'forcing update');
          // 强制 Vue 重新渲染组件
          this.$forceUpdate();
          console.log('[vue2] $forceUpdate called');
        });
        // 在组件销毁时取消订阅
        this.$once('hook:beforeDestroy', unsubscribe);
      },
    });

    // 通过 prototype 直接注入
    vue.prototype.$t = t;
    vue.prototype.$i18n = i18nCore;
  };

  return {
    ...i18nCore,
    t,
    install,
  };
}
