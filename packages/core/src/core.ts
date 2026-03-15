import type {
  I18nCore,
  I18nConfig,
  Locale,
  Dictionary,
  Subscriber,
} from "./types";

/**
 * 纯 JS 内核 - Pub-Sub 模式
 * 管理语言状态、字典数据、订阅通知
 */
export function createI18n(config: I18nConfig): I18nCore {
  let currentLocale: Locale = config.locale;
  const messages: Record<Locale, Dictionary> = config.messages || {};
  const fallbackLocale = config.fallbackLocale || "zh-CN";
  const subscribers = new Set<Subscriber>();

  /**
   * 核心翻译函数
   * 支持插值替换: t('已选择 {0} 项', count)
   */
  function t(key: string, ...args: any[]): string {
    const dict = messages[currentLocale] || {};
    let text = dict[key];

    // 回退到默认语言
    if (!text && currentLocale !== fallbackLocale) {
      text = (messages[fallbackLocale] || {})[key];
    }

    // 如果仍未找到，返回 key 本身（开发友好）
    if (!text) {
      return key;
    }

    // 插值替换 {0}, {1}, {2}...
    return text.replace(/\{(\d+)\}/g, (_, index) => {
      const value = args[Number(index)];
      return value !== undefined ? String(value) : `{${index}}`;
    });
  }

  /**
   * 切换语言
   */
  function setLocale(locale: Locale): void {
    console.log('[i18n] setLocale called:', locale, 'current:', currentLocale);
    if (currentLocale === locale) {
      console.log('[i18n] setLocale early return (same locale)');
      return;
    }
    currentLocale = locale;
    console.log('[i18n] setLocale notify subscribers, count:', subscribers.size);
    notify();
  }

  /**
   * 动态加载语言包
   */
  function loadMessages(locale: Locale, dict: Dictionary): void {
    console.log('[i18n] loadMessages called:', locale, 'keys:', Object.keys(dict));
    messages[locale] = { ...messages[locale], ...dict };
    // 加载完成后总是通知更新，让组件重新渲染
    console.log('[i18n] loadMessages notify subscribers');
    notify();
  }

  /**
   * 订阅语言变更
   */
  function subscribe(callback: Subscriber): () => void {
    console.log('[i18n] subscribe called, total subscribers:', subscribers.size + 1);
    subscribers.add(callback);
    return () => {
      console.log('[i18n] unsubscribe called');
      subscribers.delete(callback);
    };
  }

  /**
   * 通知所有订阅者
   */
  function notify(): void {
    console.log('[i18n] notify called, subscribers count:', subscribers.size);
    subscribers.forEach((cb) => cb());
  }

  return {
    get locale() {
      return currentLocale;
    },
    messages,
    t,
    setLocale,
    loadMessages,
    subscribe,
  };
}

/**
 * 全局单例实例（可选）
 */
let globalInstance: I18nCore | null = null;

export function getGlobalI18n(): I18nCore {
  if (!globalInstance) {
    throw new Error(
      "[i18n-plugin/core] Global instance not initialized. Call createI18n() first.",
    );
  }
  return globalInstance;
}

export function setGlobalI18n(instance: I18nCore): void {
  globalInstance = instance;
}
