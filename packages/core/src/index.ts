export * from './types'
export * from './core'

// 导出全局翻译函数（供 unplugin 注入使用）
import { getGlobalI18n } from './core'

// 便捷导出
export const $t = (key: string, ...args: any[]): string => {
  try {
    return getGlobalI18n().t(key, ...args)
  } catch {
    // 如果全局实例未初始化，返回 key 本身
    return key
  }
}
