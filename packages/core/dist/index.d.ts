import { I as I18nConfig, a as I18nCore } from './types-k9YZmmjT.js';
export { D as Dictionary, L as Locale, S as Subscriber } from './types-k9YZmmjT.js';

/**
 * 纯 JS 内核 - Pub-Sub 模式
 * 管理语言状态、字典数据、订阅通知
 */
declare function createI18n(config: I18nConfig): I18nCore;
declare function getGlobalI18n(): I18nCore;
declare function setGlobalI18n(instance: I18nCore): void;

declare const $t: (key: string, ...args: any[]) => string;

export { $t, I18nConfig, I18nCore, createI18n, getGlobalI18n, setGlobalI18n };
