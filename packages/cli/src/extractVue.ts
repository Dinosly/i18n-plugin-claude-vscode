import { parse } from '@vue/compiler-sfc'
import * as fs from 'fs'
import type { ExtractResult } from './extractJS'

/**
 * 中文字符正则
 */
const CHINESE_REGEX = /[\u4e00-\u9fa5]/

/**
 * 从 Vue SFC 文件中提取中文
 */
export function extractFromVue(filePath: string): ExtractResult[] {
  const code = fs.readFileSync(filePath, 'utf-8')
  const results: ExtractResult[] = []

  try {
    const { descriptor } = parse(code, { filename: filePath })

    // 提取 template 中的中文
    if (descriptor.template) {
      const templateContent = descriptor.template.content
      const lines = templateContent.split('\n')

      lines.forEach((line, index) => {
        // 简单正则匹配文本节点（实际应使用 AST）
        const textMatches = line.match(/>([^<]+)</g)
        if (textMatches) {
          textMatches.forEach(match => {
            const text = match.replace(/^>|<$/g, '').trim()
            if (text && CHINESE_REGEX.test(text)) {
              results.push({
                key: text,
                text: text,
                file: filePath,
                line: index + 1
              })
            }
          })
        }

        // 匹配属性中的中文
        const attrMatches = line.match(/(placeholder|title|alt|label)="([^"]+)"/g)
        if (attrMatches) {
          attrMatches.forEach(match => {
            const value = match.match(/"([^"]+)"/)?.[1]
            if (value && CHINESE_REGEX.test(value)) {
              results.push({
                key: value,
                text: value,
                file: filePath,
                line: index + 1
              })
            }
          })
        }
      })
    }

    // 提取 script 中的中文（复用 extractJS 逻辑）
    if (descriptor.script || descriptor.scriptSetup) {
      const scriptContent = descriptor.script?.content || descriptor.scriptSetup?.content || ''
      // 这里简化处理，实际应调用 extractFromJS
      const matches = scriptContent.match(/['"`]([\u4e00-\u9fa5][^'"`]*?)['"`]/g)
      if (matches) {
        matches.forEach(match => {
          const text = match.replace(/^['"`]|['"`]$/g, '')
          if (CHINESE_REGEX.test(text)) {
            results.push({
              key: text,
              text: text,
              file: filePath,
              line: 0
            })
          }
        })
      }
    }
  } catch (error) {
    console.warn(`[Warning] Failed to parse Vue file ${filePath}:`, error)
  }

  return results
}
