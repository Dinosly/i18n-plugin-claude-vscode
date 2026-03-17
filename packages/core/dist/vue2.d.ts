import { I as I18nConfig, a as I18nCore } from './types-k9YZmmjT.js';

/**
 * Vue 2 适配层
 * 利用 Vue.observable() 包装状态，通过全局 Mixin 注入 $t
 */
declare function createVue2I18n(config: I18nConfig, Vue?: any): I18nCore & {
    install: (vue: any) => void;
};

export { createVue2I18n };
