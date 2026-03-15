import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 中文字符正则
 */
const CHINESE_REGEX = /[\u4e00-\u9fa5]/

/**
 * 提取结果
 */
export interface ExtractResult {
  key: string
  text: string
  file: string
  line: number
}

/**
 * 从 JS/TS/JSX/TSX 文件中提取中文
 */
export function extractFromJS(filePath: string): ExtractResult[] {
  const code = fs.readFileSync(filePath, 'utf-8')
  const results: ExtractResult[] = []

  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy']
    })

    traverse(ast, {
      // 字符串字面量
      StringLiteral(path) {
        const { value } = path.node
        if (CHINESE_REGEX.test(value)) {
          // 检查是否有忽略注释
          if (hasIgnoreComment(path.node.leadingComments)) {
            return
          }

          results.push({
            key: value,
            text: value,
            file: filePath,
            line: path.node.loc?.start.line || 0
          })
        }
      },

      // 模板字符串
      TemplateLiteral(path) {
        const { quasis, expressions } = path.node
        let hasChineseText = false
        let templateText = ''

        quasis.forEach((quasi, index) => {
          const text = quasi.value.cooked || quasi.value.raw
          if (CHINESE_REGEX.test(text)) {
            hasChineseText = true
          }
          templateText += text
          if (index < expressions.length) {
            templateText += `{${index}}`
          }
        })

        if (hasChineseText && !hasIgnoreComment(path.node.leadingComments)) {
          results.push({
            key: templateText,
            text: templateText,
            file: filePath,
            line: path.node.loc?.start.line || 0
          })
        }
      },

      // JSX 文本节点
      JSXText(path) {
        const text = path.node.value.trim()
        if (text && CHINESE_REGEX.test(text)) {
          if (!hasIgnoreComment(path.node.leadingComments)) {
            results.push({
              key: text,
              text: text,
              file: filePath,
              line: path.node.loc?.start.line || 0
            })
          }
        }
      },

      // JSX 属性（如 placeholder, title）
      JSXAttribute(path) {
        const attrName = path.node.name.name
        if (typeof attrName === 'string' && ['placeholder', 'title', 'alt', 'label'].includes(attrName)) {
          const value = path.node.value
          if (t.isStringLiteral(value) && CHINESE_REGEX.test(value.value)) {
            results.push({
              key: value.value,
              text: value.value,
              file: filePath,
              line: path.node.loc?.start.line || 0
            })
          }
        }
      }
    })
  } catch (error) {
    console.warn(`[Warning] Failed to parse ${filePath}:`, error)
  }

  return results
}

/**
 * 检查是否有忽略注释
 */
function hasIgnoreComment(comments: any[] | null | undefined): boolean {
  if (!comments) return false
  return comments.some(comment =>
    comment.value.includes('i18n-ignore') ||
    comment.value.includes('i18n-ignore-next-line')
  )
}
