/**
 * 核心类型定义
 */
type Locale = string;
type Dictionary = Record<string, string>;
type Subscriber = () => void;
interface I18nConfig {
    locale: Locale;
    fallbackLocale?: Locale;
    messages?: Record<Locale, Dictionary>;
}
interface I18nCore {
    locale: Locale;
    messages: Record<Locale, Dictionary>;
    t: (key: string, ...args: any[]) => string;
    setLocale: (locale: Locale) => void;
    loadMessages: (locale: Locale, messages: Dictionary) => void;
    subscribe: (callback: Subscriber) => () => void;
}

export type { Dictionary as D, I18nConfig as I, Locale as L, Subscriber as S, I18nCore as a };
