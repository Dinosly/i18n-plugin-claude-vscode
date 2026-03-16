import * as parser from '@babel/parser'
import traverseModule from '@babel/traverse'
import * as t from '@babel/types'
import generateModule from '@babel/generator'

// 处理 ESM/CJS 兼容性
const traverse = (traverseModule as any).default || traverseModule
const generate = (generateModule as any).default || generateModule

const CHINESE_REGEX = /[\u4e00-\u9fa5]/

interface TransformOptions {
  /** * 是否为纯表达式模式 (为 Vue template 的 {{ }} 准备)
   * 开启后：不注入 import，强制使用 $t，去除末尾分号
   */
  isExpression?: boolean;
}

/**
 * 转换 JS/TS/JSX/TSX 代码
 */
export function transformJS(
  code: string,
  id: string,
  options: TransformOptions = {},
): string | null {
  const { isExpression = false } = options;

  if (!CHINESE_REGEX.test(code)) return null;

  try {
    // 表达式模式下，为了让 Babel 能够解析 "status === 1 ? '成功' : '失败'"
    // 依然作为普通模块解析，它会被解析为一个 ExpressionStatement
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators-legacy"],
    });

    let hasTransform = false;
    let needsImport = false;

    // 💡 动态决定函数名：表达式模式直接用 $t，模块模式用防冲突的 __i18n_t__
    const importName = isExpression ? "$t" : "__i18n_t__";

    traverse(ast, {
      Program: {
        exit(path) {
          // 💡 表达式模式下，绝对不能注入 import
          if (needsImport && !isExpression) {
            const hasImport = path.node.body.some(
              (node) =>
                t.isImportDeclaration(node) &&
                node.source.value === "@i18n-plugin/core",
            );

            if (!hasImport) {
              const importDeclaration = t.importDeclaration(
                [
                  t.importSpecifier(
                    t.identifier(importName),
                    t.identifier("$t"),
                  ),
                ],
                t.stringLiteral("@i18n-plugin/core"),
              );
              path.node.body.unshift(importDeclaration);
            }
          }
        },
      },

      StringLiteral(path) {
        const { value } = path.node;
        const parent = path.parent;
        if (
          t.isCallExpression(parent) &&
          t.isIdentifier(parent.callee) &&
          parent.callee.name === importName
        ) {
          return;
        }

        if (
          CHINESE_REGEX.test(value) &&
          !hasIgnoreComment(path.node.leadingComments)
        ) {
          path.replaceWith(
            t.callExpression(t.identifier(importName), [
              t.stringLiteral(value),
            ]),
          );
          hasTransform = true;
          needsImport = true;
        }
      },

      TemplateLiteral(path) {
        const { quasis, expressions } = path.node;
        let hasChineseText = false;

        quasis.forEach((quasi) => {
          const text = quasi.value.cooked || quasi.value.raw;
          if (CHINESE_REGEX.test(text)) hasChineseText = true;
        });

        if (hasChineseText && !hasIgnoreComment(path.node.leadingComments)) {
          let templateText = "";
          quasis.forEach((quasi, index) => {
            templateText += quasi.value.cooked || quasi.value.raw;
            if (index < expressions.length) templateText += `{${index}}`;
          });

          // @ts-ignore
          path.replaceWith(
            t.callExpression(t.identifier(importName), [
              t.stringLiteral(templateText),
              ...expressions,
            ]),
          );
          hasTransform = true;
          needsImport = true;
        }
      },

      JSXText(path) {
        const text = path.node.value.trim();
        if (
          text &&
          CHINESE_REGEX.test(text) &&
          !hasIgnoreComment(path.node.leadingComments)
        ) {
          path.replaceWith(
            t.jsxExpressionContainer(
              t.callExpression(t.identifier(importName), [
                t.stringLiteral(text),
              ]),
            ),
          );
          hasTransform = true;
          needsImport = true;
        }
      },

      JSXAttribute(path) {
        const attrName = path.node.name.name;
        if (
          typeof attrName === "string" &&
          ["placeholder", "title", "alt", "label"].includes(attrName)
        ) {
          const value = path.node.value;
          if (t.isStringLiteral(value) && CHINESE_REGEX.test(value.value)) {
            path.node.value = t.jsxExpressionContainer(
              t.callExpression(t.identifier(importName), [
                t.stringLiteral(value.value),
              ]),
            );
            hasTransform = true;
            needsImport = true;
          }
        }
      },
    });

    if (!hasTransform) return null;

    // 💡 表达式模式下，直接只 generate 表达式的 AST 节点，避免包裹和分号
    if (isExpression) {
      // 因为传入的是单个表达式，Babel 解析成 Program > ExpressionStatement
      const exprNode = (ast.program.body[0] as t.ExpressionStatement)
        .expression;
      const output = generate(exprNode, { retainLines: true, compact: false });
      return output.code;
    }

    // 正常的模块 generate
    const output = generate(ast, {
      retainLines: true,
      compact: false,
    });

    return output.code;
  } catch (error) {
    console.warn(`[i18n-plugin] Failed to transform JS in ${id}:`, error);
    return null;
  }
}

function hasIgnoreComment(comments: any[] | null | undefined): boolean {
  if (!comments) return false;
  return comments.some(
    (comment) =>
      comment.value.includes("i18n-ignore") ||
      comment.value.includes("i18n-ignore-next-line"),
  );
}