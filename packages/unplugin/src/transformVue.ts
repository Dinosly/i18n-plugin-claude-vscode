import { parse, compileTemplate } from "@vue/compiler-sfc";
import MagicString from "magic-string";
import { transformJS } from "./transformJS";

/**
 * 中文字符正则
 */
const CHINESE_REGEX = /[\u4e00-\u9fa5]/;

/**
 * 转换 Vue SFC 文件
 * 在 template 中将中文文本节点转换为插值表达式
 * 使用基于 Vue compiler AST 的方案，安全地转换模板
 */
export function transformVue(code: string, id: string): string | null {
  if (!CHINESE_REGEX.test(code)) {
    return null;
  }

  try {
    const { descriptor } = parse(code, { filename: id });
    const s = new MagicString(code);
    let hasTransform = false;

    // 在 transformVue 函数中添加
    console.log("=== Debugging Vue transformation ===");
    console.log("File:", id);

    // 打印模板内容
    if (descriptor.template) {
      console.log("Template content:", descriptor.template.content);
    }

    // 处理 template
    if (descriptor.template) {
      const template = descriptor.template;
      const templateContent = template.content;
      const templateStart = template.loc.start.offset;

      // 使用 Vue compiler 解析模板
      const { ast, errors } = compileTemplate({
        source: templateContent,
        filename: id,
        id: `data-v-${Math.random().toString(36).substr(2, 9)}`,
      });

      if (errors && errors.length > 0) {
        console.warn(
          `[i18n-plugin] Template compilation errors in ${id}:`,
          errors,
        );
      }

      // 遍历 AST 转换文本节点
      traverseTemplateAST(ast, (node) => {
        if (node.type === 2) {
          // 文本节点 (纯文本)
          const text = node.content.trim();
          if (text && CHINESE_REGEX.test(text) && !hasIgnoreComment(node)) {
            const escapedText = text.replace(/'/g, "\\'");
            const actualStart = templateStart + node.loc.start.offset;
            const actualEnd = templateStart + node.loc.end.offset;

            s.overwrite(actualStart, actualEnd, `{{ $t('${escapedText}') }}`);
            hasTransform = true;
          }
        } else if (node.type === 5) {
          // 插值表达式节点，如 {{ message }}
          const expr = node.content?.content || node.content?.s;
          if (expr && CHINESE_REGEX.test(expr)) {
            // 检查是否是纯中文文本（不需要处理变量）
            const isPureText = !expr.includes('{{') && !expr.includes('}}');
            if (isPureText) {
              const escapedText = expr.replace(/'/g, "\\'");
              const actualStart = templateStart + node.loc.start.offset;
              const actualEnd = templateStart + node.loc.end.offset;
              s.overwrite(actualStart, actualEnd, `{{ $t('${escapedText}') }}`);
              hasTransform = true;
            }
          }
        } else if (node.type === 8) {
          // 复合表达式节点 (文本 + 插值混合)
          // 例如: "当前语言: {{ currentLocale }}"
          console.log(node);
          if (node.children && Array.isArray(node.children)) {
            node.children.forEach((child: any) => {
              if (child.type === 2) {
                // 复合表达式中的文本节点
                const text = child.content.trim();
                if (text && CHINESE_REGEX.test(text)) {
                  const escapedText = text.replace(/'/g, "\\'");
                  const actualStart = templateStart + child.loc.start.offset;
                  const actualEnd = templateStart + child.loc.end.offset;

                  s.overwrite(
                    actualStart,
                    actualEnd,
                    `{{ $t('${escapedText}') }}`,
                  );
                  hasTransform = true;
                }
              }
            });
          }
        } else if (node.type === 1) {
          // 元素节点
          console.log('[transformVue] Processing element node:', node.tag);
          // 处理元素的子节点（插值表达式）
          if (node.children) {
            node.children.forEach((child: any) => {
              console.log('[transformVue]   child type:', child.type, 'content:', child.content);
              // 处理插值表达式节点 (type 5)
              if (child.type === 5) {
                const expr = child.content?.content || child.content?.s;
                console.log('[transformVue]   Interpolation expr:', expr);
              }
            });
          }
          // 处理元素的属性
          if (node.props) {
            node.props.forEach((prop: any) => {
              // 处理静态属性
              if (prop.type === 6) {
                const attrName = prop.name;
                const attrValue = prop.value?.content;
                if (
                  attrValue &&
                  typeof attrValue === "string" &&
                  CHINESE_REGEX.test(attrValue) &&
                  ["placeholder", "title", "alt", "label"].includes(attrName)
                ) {
                  // 找到属性在模板中的位置
                  const propStart = templateStart + prop.loc.start.offset;
                  const propEnd = templateStart + prop.loc.end.offset;
                  const escapedValue = attrValue.replace(/'/g, "\\'");
                  s.overwrite(
                    propStart,
                    propEnd,
                    `:${attrName}="$t('${escapedValue}')"`,
                  );
                  hasTransform = true;
                }
              }
            });
          }
        }

        // 打印转换结果
        if (hasTransform) {
          const transformedCode = s.toString();
          console.log("Transformed code:", transformedCode);
        }

        console.log("=== End of debugging ===");
      });
    }

    // 处理 script
    if (descriptor.script) {
      console.log('[transformVue] Processing script section');
      const script = descriptor.script;
      const scriptContent = script.content;
      const scriptStart = script.loc.start.offset;
      const scriptEnd = script.loc.end.offset;

      const transformedScript = transformJS(scriptContent, id);
      if (transformedScript) {
        console.log('[transformVue] script transformed successfully');
        s.overwrite(scriptStart, scriptEnd, transformedScript);
        hasTransform = true;
      } else {
        console.log('[transformVue] script not transformed');
      }
    }

    // 处理 scriptSetup
    if (descriptor.scriptSetup) {
      console.log('[transformVue] Processing scriptSetup section');
      const scriptSetup = descriptor.scriptSetup;
      const scriptSetupContent = scriptSetup.content;
      const scriptSetupStart = scriptSetup.loc.start.offset;
      const scriptSetupEnd = scriptSetup.loc.end.offset;

      const transformedScript = transformJS(scriptSetupContent, id);
      if (transformedScript) {
        console.log('[transformVue] scriptSetup transformed successfully');
        s.overwrite(scriptSetupStart, scriptSetupEnd, transformedScript);
        hasTransform = true;
      } else {
        console.log('[transformVue] scriptSetup not transformed');
      }
    }

    if (!hasTransform) {
      return null;
    }

    return s.toString();
  } catch (error) {
    console.warn(`[i18n-plugin] Failed to transform Vue file ${id}:`, error);
    return null;
  }
}

/**
 * 遍历模板 AST
 */
function traverseTemplateAST(
  node: any,
  callback: (node: any, start: number, end: number) => void,
) {
  if (!node) return;

  // 调用回调
  if (node.loc) {
    callback(node, node.loc.start.offset, node.loc.end.offset);
  }

  // 遍历子节点
  if (node.children) {
    node.children.forEach((child: any) => {
      traverseTemplateAST(child, callback);
    });
  }

  // 遍历元素的子节点
  if (node.type === 1 && node.children) {
    node.children.forEach((child: any) => {
      traverseTemplateAST(child, callback);
    });
  }
}

/**
 * 检查节点是否有忽略注释
 */
function hasIgnoreComment(node: any): boolean {
  // 检查节点的前导注释
  if (node.loc && node.loc.start && node.loc.start.comments) {
    for (const comment of node.loc.start.comments) {
      if (
        comment.content.includes("i18n-ignore") ||
        comment.content.includes("i18n-ignore-next-line")
      ) {
        return true;
      }
    }
  }

  // 检查父节点的注释
  if (node.parent) {
    return hasIgnoreComment(node.parent);
  }

  return false;
}
