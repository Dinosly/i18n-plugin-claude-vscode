/**
 * 核心类型定义
 */
export type Locale = string

export type Dictionary = Record<string, string>

export type Subscriber = () => void

export interface I18nConfig {
  locale: Locale
  fallbackLocale?: Locale
  messages?: Record<Locale, Dictionary>
}

export interface I18nCore {
  locale: Locale
  messages: Record<Locale, Dictionary>
  t: (key: string, ...args: any[]) => string
  setLocale: (locale: Locale) => void
  loadMessages: (locale: Locale, messages: Dictionary) => void
  subscribe: (callback: Subscriber) => () => void
}
