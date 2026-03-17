import React, { useState, useEffect } from "react";
import { createI18n, setGlobalI18n, getGlobalI18n } from "./core";
import type { I18nConfig, I18nCore } from "./types";

/**
 * React 适配层
 * 提供 useI18n Hook，监听内核 subscribe 事件触发强制渲染
 */
export function createReactI18n(config: I18nConfig): I18nCore {
  const i18nCore = createI18n(config);
  setGlobalI18n(i18nCore);
  return i18nCore;
}

/**
 * React Hook
 * 订阅语言变更，通过 useState 触发组件重渲染
 */
export function useI18n() {
  const i18nCore = getGlobalI18n();
  // 初始化时直接使用i18nCore.locale,确保同步
  const [locale, setLocale] = useState(i18nCore.locale);

  useEffect(() => {
    // 立即同步当前locale,避免首次渲染延迟
    setLocale(i18nCore.locale);

    console.log('[react] useEffect setup, subscribing...');
    // 订阅语言变更事件
    const unsubscribe = i18nCore.subscribe(() => {
      console.log('[react] subscribe callback fired, locale:', i18nCore.locale);
      setLocale(i18nCore.locale); // 更新 locale 状态
    });

    return unsubscribe;
  }, [i18nCore]);

  const t = (key: string, ...args: any[]) => {
    return i18nCore.t(key, ...args);
  };

  return {
    locale,
    t,
    setLocale: i18nCore.setLocale,
    loadMessages: i18nCore.loadMessages,
  };
}

/**
 * React HOC（可选）
 */
export function withI18n<P extends object>(
  Component: React.ComponentType<
    P & { t: (key: string, ...args: any[]) => string }
  >
): React.FC<P> {
  return (props: P) => {
    const { t } = useI18n();
    return React.createElement(Component, { ...props, t });
  };
}
