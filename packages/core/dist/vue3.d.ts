import { I as I18nConfig, a as I18nCore, L as Locale, D as Dictionary } from './types-k9YZmmjT.js';
import * as vue from 'vue';
import { Plugin } from 'vue';

/**
 * Vue 3 适配层
 * 利用 ref 包装 locale，劫持全局属性 $t
 */
declare function createVue3I18n(config: I18nConfig): Plugin & I18nCore;
/**
 * Vue 3 Composition API Hook
 */
declare function useI18n(): {
    locale: vue.Ref<string, string>;
    t: (key: string, ...args: any[]) => string;
    setLocale: (locale: Locale) => void;
    loadMessages: (locale: Locale, messages: Dictionary) => void;
};

export { createVue3I18n, useI18n };
