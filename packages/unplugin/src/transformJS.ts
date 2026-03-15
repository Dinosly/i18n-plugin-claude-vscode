import * as parser from '@babel/parser'
import traverseModule from '@babel/traverse'
import * as t from '@babel/types'
import generateModule from '@babel/generator'

// 处理 ESM/CJS 兼容性
const traverse = (traverseModule as any).default || traverseModule
const generate = (generateModule as any).default || generateModule

/**
 * 中文字符正则
 */
const CHINESE_REGEX = /[\u4e00-\u9fa5]/

/**
 * 转换 JS/TS/JSX/TSX 代码
 * 注入 $t 函数并替换中文字符串
 */
export function transformJS(code: string, id: string): string | null {
  console.log('[unplugin] transformJS called for:', id)
  // 快速检测是否包含中文
  if (!CHINESE_REGEX.test(code)) {
    console.log('[unplugin] no Chinese found, skipping')
    return null
  }
  console.log('[unplugin] Chinese detected in:', id)

  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy']
    })

    let hasTransform = false
    let needsImport = false

    // 生成唯一的导入变量名
    const importName = '__i18n_t__'

    traverse(ast, {
      Program: {
        exit(path) {
          // 在遍历结束后检查是否需要添加导入
          if (needsImport) {
            // 检查是否已经导入
            const hasImport = path.node.body.some(
              node =>
                t.isImportDeclaration(node) &&
                node.source.value === '@i18n-plugin/core'
            )

            if (!hasImport) {
              // 在文件顶部注入导入语句
              const importDeclaration = t.importDeclaration(
                [t.importSpecifier(t.identifier(importName), t.identifier('$t'))],
                t.stringLiteral('@i18n-plugin/core')
              )
              path.node.body.unshift(importDeclaration)
            }
          }
        }
      },

      // 字符串字面量
      StringLiteral(path) {
        const { value } = path.node

        // 跳过已经被转换的字符串（作为 callExpression 的参数）
        const parent = path.parent
        if (t.isCallExpression(parent) &&
            t.isIdentifier(parent.callee) &&
            parent.callee.name === importName) {
          return
        }

        if (CHINESE_REGEX.test(value) && !hasIgnoreComment(path.node.leadingComments)) {
          // 替换为函数调用
          path.replaceWith(
            t.callExpression(t.identifier(importName), [t.stringLiteral(value)])
          )
          hasTransform = true
          needsImport = true
        }
      },

      // 模板字符串
      TemplateLiteral(path) {
        const { quasis, expressions } = path.node
        let hasChineseText = false

        quasis.forEach(quasi => {
          const text = quasi.value.cooked || quasi.value.raw
          if (CHINESE_REGEX.test(text)) {
            hasChineseText = true
          }
        })

        if (hasChineseText && !hasIgnoreComment(path.node.leadingComments)) {
          // 将模板字符串转换为普通字符串 + 插值
          let templateText = ''
          quasis.forEach((quasi, index) => {
            templateText += quasi.value.cooked || quasi.value.raw
            if (index < expressions.length) {
              templateText += `{${index}}`
            }
          })

          // 替换为 $t('text', arg0, arg1, ...)
          path.replaceWith(
            t.callExpression(
              t.identifier(importName),
              [t.stringLiteral(templateText), ...expressions]
            )
          )
          hasTransform = true
          needsImport = true
        }
      },

      // JSX 文本节点
      JSXText(path) {
        const text = path.node.value.trim()
        if (text && CHINESE_REGEX.test(text) && !hasIgnoreComment(path.node.leadingComments)) {
          // 替换为 JSX 表达式容器
          path.replaceWith(
            t.jsxExpressionContainer(
              t.callExpression(t.identifier(importName), [t.stringLiteral(text)])
            )
          )
          hasTransform = true
          needsImport = true
        }
      },

      // JSX 属性
      JSXAttribute(path) {
        const attrName = path.node.name.name
        if (typeof attrName === 'string' && ['placeholder', 'title', 'alt', 'label'].includes(attrName)) {
          const value = path.node.value
          if (t.isStringLiteral(value) && CHINESE_REGEX.test(value.value)) {
            // 替换为 JSX 表达式
            path.node.value = t.jsxExpressionContainer(
              t.callExpression(t.identifier(importName), [t.stringLiteral(value.value)])
            )
            hasTransform = true
            needsImport = true
          }
        }
      }
    })

    if (!hasTransform) {
      console.log('[unplugin] no transform needed for:', id)
      return null
    }
    console.log('[unplugin] transformed successfully:', id)

    // 生成转换后的代码
    const output = generate(ast, {
      retainLines: true,
      compact: false
    })

    return output.code
  } catch (error) {
    console.warn(`[i18n-plugin] Failed to transform ${id}:`, error)
    return null
  }
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
