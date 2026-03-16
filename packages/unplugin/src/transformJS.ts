import * as parser from '@babel/parser'
import traverseModule from '@babel/traverse'
import * as t from '@babel/types'
import generateModule from '@babel/generator'

// 处理 ESM/CJS 兼容性
const traverse = (traverseModule as any).default || traverseModule
const generate = (generateModule as any).default || generateModule

const CHINESE_REGEX = /[\u4e00-\u9fa5]/

interface TransformOptions {
  isExpression?: boolean;
}

export function transformJS(
  code: string,
  id: string,
  options: TransformOptions = {},
): string | null {
  const { isExpression = false } = options;

  // 跳过 .vue 文件 (完整 SFC),这些由 transformVue 处理
  // 只处理 .vue?vue&type=script (vue-loader 提取的 script 块)
  if (id.endsWith('.vue') && !id.includes('?vue&type=')) {
    return null;
  }

  if (!CHINESE_REGEX.test(code)) return null;

  try {
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators-legacy"],
    });

    let hasTransform = false;
    let needsImport = false;

    // 检测是否处理 Vue SFC 的 script (包括 .vue?vue&type=script 和 .vue?vue&type=script&setup=true)
    // 对于插值表达式处理(isExpression=true),不视为Vue SFC
    const isVueScriptBlock = id.includes('.vue?vue&type=script');

    console.log(`[transformJS] id: ${id}, isVueScriptBlock: ${isVueScriptBlock}, isExpression: ${isExpression}`);

    // 检查节点是否已经是某个 CallExpression 的参数（防止重复转换）
    // 只跳过我们自己的翻译函数调用，如 __i18n_t__、$t、this.$t 等
    const isAlreadyTranslated = (path: any): boolean => {
      let current = path.parent;
      while (current) {
        if (t.isCallExpression(current)) {
          const callee = current.callee;
          // 检查是否是翻译函数
          if (t.isIdentifier(callee)) {
            if (callee.name === importName || callee.name === '$t') {
              return true;
            }
          }
          // 检查是否是 this.$t 这种成员表达式
          if (t.isMemberExpression(callee)) {
            if (t.isThisExpression(callee.object) && t.isIdentifier(callee.property) && callee.property.name === '$t') {
              return true;
            }
          }
        }
        if (current.parent) {
          current = current.parent;
        } else {
          break;
        }
      }
      return false;
    };

    const importName = isExpression ? "$t" : "__i18n_t__";

    // 检测是否是 Vue 3 script setup
    const isVue3ScriptSetup = id.includes('setup=true');

    // 创建函数调用表达式
    // - Vue 2 script 块: 使用 this.$t
    // - Vue 3 script setup: 使用 $t (全局函数)
    // - React/其他: 使用 __i18n_t__ 或 $t (通过导入)
    const createTCall = (args: any[]) => {
      if (isVueScriptBlock && !isExpression) {
        if (isVue3ScriptSetup) {
          // Vue 3 script setup: 使用 $t 作为全局函数
          return t.callExpression(t.identifier("$t"), args);
        } else {
          // Vue 2: 使用 this.$t
          return t.callExpression(
            t.memberExpression(t.thisExpression(), t.identifier("$t")),
            args
          );
        }
      }
      return t.callExpression(t.identifier(importName), args);
    };

    traverse(ast, {
      Program: {
        exit(path) {
          // 仅在非Vue script块且非表达式模式时添加导入
          // Vue 3 script setup 使用全局 $t，不需要导入
          if (needsImport && !isExpression && !isVueScriptBlock) {
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

        // 如果已经是某个 CallExpression 的参数（任何函数），跳过
        if (isAlreadyTranslated(path)) {
          return;
        }

        if (
          CHINESE_REGEX.test(value) &&
          !hasIgnoreComment(path.node.leadingComments)
        ) {
          path.replaceWith(
            createTCall([
              t.stringLiteral(value),
            ]),
          );
          hasTransform = true;
          needsImport = true;
        }
      },

      TemplateLiteral(path) {
        // 如果已经是某个 CallExpression 的参数，跳过
        if (isAlreadyTranslated(path)) {
          return;
        }

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

          path.replaceWith(
            createTCall([
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
              createTCall([
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
              createTCall([
                t.stringLiteral(value.value),
              ]),
            );
            hasTransform = true;
            needsImport = true;
          }
        }
      },
    });

    console.log(`[transformJS] id: ${id}, hasTransform: ${hasTransform}, needsImport: ${needsImport}`);

    if (!hasTransform) return null;

    // 表达式模式下，直接只 generate 表达式的 AST 节点
    if (isExpression) {
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
