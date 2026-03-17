import { I as I18nConfig, a as I18nCore, L as Locale, D as Dictionary } from './types-k9YZmmjT.js';
import React from 'react';

/**
 * React 适配层
 * 提供 useI18n Hook，监听内核 subscribe 事件触发强制渲染
 */
declare function createReactI18n(config: I18nConfig): I18nCore;
/**
 * React Hook
 * 订阅语言变更，通过 useState 触发组件重渲染
 */
declare function useI18n(): {
    locale: string;
    t: (key: string, ...args: any[]) => string;
    setLocale: (locale: Locale) => void;
    loadMessages: (locale: Locale, messages: Dictionary) => void;
};
/**
 * React HOC（可选）
 */
declare function withI18n<P extends object>(Component: React.ComponentType<P & {
    t: (key: string, ...args: any[]) => string;
}>): React.FC<P>;

export { createReactI18n, useI18n, withI18n };
