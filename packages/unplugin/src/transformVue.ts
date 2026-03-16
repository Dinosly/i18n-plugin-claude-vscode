import { parse, compileTemplate } from "@vue/compiler-sfc";
import MagicString from "magic-string";
import { transformJS } from "./transformJS";

/**
 * 中文字符正则
 */
const CHINESE_REGEX = /[\u4e00-\u9fa5]/;

/**
 * 转换 Vue SFC 文件
 * @param vueVersion 2 或 3，决定使用哪个模板编译器
 */
export function transformVue(code: string, id: string, vueVersion: 2 | 3 = 3): string | null {
  if (!CHINESE_REGEX.test(code)) {
    return null;
  }

  // 如果是 vue-loader 提取的 template block,直接转换模板内容
  if (id.includes("?vue&type=template")) {
    if (vueVersion === 2) {
      return transformVue2TemplateBlock(code, id);
    } else {
      return transformVue3TemplateBlock(code, id);
    }
  }

  try {
    const { descriptor } = parse(code, { filename: id });
    const s = new MagicString(code);
    let hasTransform = false;

    // 处理 template
    if (descriptor.template) {
      const template = descriptor.template;
      const templateContent = template.content;
      const templateStart = template.loc.start.offset;

      if (vueVersion === 2) {
        if (transformVue2Template(templateContent, templateStart, s, id)) {
          hasTransform = true;
        }
      } else {
        if (transformVue3Template(templateContent, templateStart, s, id)) {
          hasTransform = true;
        }
      }
    }

    // 处理 script
    if (descriptor.script) {
      const script = descriptor.script;
      const transformedScript = transformJS(script.content, id);
      if (transformedScript) {
        s.overwrite(script.loc.start.offset, script.loc.end.offset, transformedScript);
        hasTransform = true;
      }
    }

    // 处理 scriptSetup（Vue 3）
    if (descriptor.scriptSetup) {
      const scriptSetup = descriptor.scriptSetup;
      const transformedScript = transformJS(scriptSetup.content, id);
      if (transformedScript) {
        s.overwrite(scriptSetup.loc.start.offset, scriptSetup.loc.end.offset, transformedScript);
        hasTransform = true;
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
 * 使用 vue-template-compiler（Vue 2）解析并转换模板
 * 由于 outputSourceRange 在某些环境下不可靠，使用基于文本匹配的方式
 */
function transformVue2Template(
  content: string,
  templateStart: number,
  s: MagicString,
  id: string,
): boolean {
  let hasTransform = false;
  const transformed = new Set<number>();

  // 1. 转换纯文本节点中的中文（不在标签内）
  const textNodeRegex = />([^<>]*[\u4e00-\u9fa5][^<>]*)</g;
  let match;

  while ((match = textNodeRegex.exec(content)) !== null) {
    const fullText = match[1];
    const text = fullText.trim();

    if (!text || !CHINESE_REGEX.test(text)) continue;

    const matchStart = match.index + 1;
    const matchEnd = matchStart + fullText.length;
    const actualStart = templateStart + matchStart;
    const actualEnd = templateStart + matchEnd;

    if (transformed.has(actualStart)) continue;

    const escapedText = text.replace(/'/g, "\\'");

    try {
      s.overwrite(actualStart, actualEnd, `{{ $t('${escapedText}') }}`);
      transformed.add(actualStart);
      hasTransform = true;
    } catch (e: any) {
      console.warn(`[transformVue2Template] Failed to transform text:`, e.message);
    }
  }

  // 2. 转换属性中的中文
  const attrRegex = /\b(placeholder|title|alt|label)="([^"]*[\u4e00-\u9fa5][^"]*)"/g;

  while ((match = attrRegex.exec(content)) !== null) {
    const attrName = match[1];
    const attrValue = match[2];
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;
    const actualStart = templateStart + matchStart;
    const actualEnd = templateStart + matchEnd;

    if (transformed.has(actualStart)) continue;

    const escapedValue = attrValue.replace(/'/g, "\\'");

    try {
      s.overwrite(actualStart, actualEnd, `:${attrName}="$t('${escapedValue}')"`);
      transformed.add(actualStart);
      hasTransform = true;
    } catch (e: any) {
      console.warn(`[transformVue2Template] Failed to transform attr:`, e.message);
    }
  }

  return hasTransform;
}

/**
 * 使用 @vue/compiler-sfc（Vue 3）解析并转换模板
 * AST 节点类型：1=Element, 2=Text, 5=Interpolation, 8=CompoundExpression
 */
function transformVue3Template(
  content: string,
  templateStart: number,
  s: MagicString,
  id: string,
): boolean {
  const { ast, errors } = compileTemplate({
    source: content,
    filename: id,
    id: `data-v-${Math.random().toString(36).substring(2, 11)}`,
  });

  if (errors && errors.length > 0) {
    console.warn(`[i18n-plugin] Vue 3 template compile errors in ${id}:`, errors);
  }

  let hasTransform = false;

  traverseTemplateAST(ast, (node) => {
    if (node.type === 2) {
      // 纯文本节点
      const text = node.content.trim();
      if (text && CHINESE_REGEX.test(text) && !hasIgnoreComment(node)) {
        const escapedText = text.replace(/'/g, "\\'");
        s.overwrite(
          templateStart + node.loc.start.offset,
          templateStart + node.loc.end.offset,
          `{{ $t('${escapedText}') }}`,
        );
        hasTransform = true;
      }
    } else if (node.type === 5) {
      // 插值表达式节点 {{ expr }}
      const expr = node.content?.content || node.content?.s;
      if (expr && CHINESE_REGEX.test(expr) && !expr.includes("{{")) {
        const escapedText = expr.replace(/'/g, "\\'");
        s.overwrite(
          templateStart + node.loc.start.offset,
          templateStart + node.loc.end.offset,
          `{{ $t('${escapedText}') }}`,
        );
        hasTransform = true;
      }
    } else if (node.type === 8) {
      // 复合表达式节点（文本 + 插值混合）
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => {
          if (child.type === 2) {
            const text = child.content.trim();
            if (text && CHINESE_REGEX.test(text)) {
              const escapedText = text.replace(/'/g, "\\'");
              s.overwrite(
                templateStart + child.loc.start.offset,
                templateStart + child.loc.end.offset,
                `{{ $t('${escapedText}') }}`,
              );
              hasTransform = true;
            }
          }
        });
      }
    } else if (node.type === 1) {
      // 元素节点：处理中文属性值
      if (node.props) {
        node.props.forEach((prop: any) => {
          if (prop.type === 6) {
            const attrName = prop.name;
            const attrValue = prop.value?.content;
            if (
              attrValue &&
              CHINESE_REGEX.test(attrValue) &&
              ["placeholder", "title", "alt", "label"].includes(attrName)
            ) {
              const escapedValue = attrValue.replace(/'/g, "\\'");
              s.overwrite(
                templateStart + prop.loc.start.offset,
                templateStart + prop.loc.end.offset,
                `:${attrName}="$t('${escapedValue}')"`,
              );
              hasTransform = true;
            }
          }
        });
      }
    }
  });

  return hasTransform;
}

/**
 * 遍历 Vue 3 模板 AST
 */
function traverseTemplateAST(
  node: any,
  callback: (node: any) => void,
) {
  if (!node) return;

  if (node.loc) {
    callback(node);
  }

  if (node.children) {
    node.children.forEach((child: any) => traverseTemplateAST(child, callback));
  }
}

/**
 * 检查节点是否有忽略注释（Vue 3）
 */
function hasIgnoreComment(node: any): boolean {
  if (node.loc?.start?.comments) {
    for (const comment of node.loc.start.comments) {
      if (
        comment.content.includes("i18n-ignore") ||
        comment.content.includes("i18n-ignore-next-line")
      ) {
        return true;
      }
    }
  }
  if (node.parent) {
    return hasIgnoreComment(node.parent);
  }
  return false;
}

/**
 * 转换 vue-loader 提取的 Vue 2 template block
 * 使用 tokenizer 逐字符扫描,安全处理嵌套和插值表达式
 */
function transformVue2TemplateBlock(code: string, id: string): string | null {
  const s = new MagicString(code);
  let hasTransform = false;

  let i = 0;
  const len = code.length;

  while (i < len) {
    const char = code[i];

    // 1. 检测标签开始 <
    if (char === '<') {
      // 检查是否是注释
      if (code.substring(i, i + 4) === '<!--') {
        const commentEnd = code.indexOf('-->', i);
        if (commentEnd === -1) break;
        i = commentEnd + 3;
        continue;
      }

      // 跳过 script 标签
      if (code.substring(i, i + 8) === '<script>' || code.substring(i, i + 9) === '</script>') {
        const scriptEnd = code.indexOf('>', i);
        if (scriptEnd === -1) break;
        i = scriptEnd + 1;
        continue;
      }

      // 跳过 style 标签
      if (code.substring(i, i + 7) === '<style>' || code.substring(i, i + 8) === '</style>') {
        const styleEnd = code.indexOf('>', i);
        if (styleEnd === -1) break;
        i = styleEnd + 1;
        continue;
      }

      // 跳过 </template> 结束标签
      if (code.substring(i, i + 11) === '</template>') {
        i = i + 11;
        continue;
      }

      const tagEnd = code.indexOf('>', i);
      if (tagEnd === -1) break;

      const tagContent = code.substring(i, tagEnd + 1);

      // 检查标签内的属性 (只在开始标签中)
      if (!tagContent.startsWith('</') && !tagContent.endsWith('/>')) {
        const attrMatches = tagContent.matchAll(/\b(placeholder|title|alt|label)="([^"]*[\u4e00-\u9fa5][^"]*)"/g);

        for (const match of attrMatches) {
          const attrName = match[1];
          const attrValue = match[2];
          const attrStart = i + match.index!;
          const attrEnd = attrStart + match[0].length;

          const escapedValue = attrValue.replace(/'/g, "\\'");
          s.overwrite(attrStart, attrEnd, `:${attrName}="$t('${escapedValue}')"`);
          hasTransform = true;
        }
      }

      i = tagEnd + 1;
      continue;
    }

    // 2. 检测插值表达式 {{
    if (char === '{' && code[i + 1] === '{') {
      const exprStart = i;
      const exprEnd = code.indexOf('}}', i + 2);
      if (exprEnd === -1) {
        i++;
        continue;
      }

      const exprContent = code.substring(i + 2, exprEnd).trim();

      // 使用 transformJS 处理插值表达式中的中文
      if (CHINESE_REGEX.test(exprContent)) {
        const wrappedCode = `const _ = ${exprContent}`;
        const transformed = transformJS(wrappedCode, id);
        if (transformed) {
          const match = transformed.match(/const _ = (.+)/);
          if (match) {
            const newExpr = match[1].trim();
            s.overwrite(exprStart, exprEnd + 2, `{{ ${newExpr} }}`);
            hasTransform = true;
          }
        }
      }

      i = exprEnd + 2;
      continue;
    }

    // 3. 检测纯文本节点
    const nextTag = code.indexOf('<', i);
    let textEnd = nextTag === -1 ? len : nextTag;
    const textContent = code.substring(i, textEnd);
    const trimmedText = textContent.trim();

    if (trimmedText && CHINESE_REGEX.test(trimmedText) && !trimmedText.includes('{{')) {
      const escapedText = trimmedText.replace(/'/g, "\\'");

      // 保留原始的空白符
      const leadingWhitespace = textContent.match(/^\s*/)?.[0] || '';
      const trailingWhitespace = textContent.match(/\s*$/)?.[0] || '';

      s.overwrite(i, textEnd, `${leadingWhitespace}{{ $t('${escapedText}') }}${trailingWhitespace}`);
      hasTransform = true;
    }

    i = textEnd;
  }

  if (!hasTransform) {
    return null;
  }

  return s.toString();
}

/**
 * 转换 vue-loader 提取的 Vue 3 template block
 */
function transformVue3TemplateBlock(code: string, id: string): string | null {
  const s = new MagicString(code);
  let hasTransform = false;

  try {
    const { ast } = compileTemplate({
      source: code,
      filename: id,
      id: `data-v-${Math.random().toString(36).substring(2, 11)}`,
    });

    traverseTemplateAST(ast, (node) => {
      if (node.type === 2) {
        // 纯文本节点
        const text = node.content.trim();
        if (text && CHINESE_REGEX.test(text) && !hasIgnoreComment(node)) {
          const escapedText = text.replace(/'/g, "\\'");
          s.overwrite(
            node.loc.start.offset,
            node.loc.end.offset,
            `{{ $t('${escapedText}') }}`,
          );
          hasTransform = true;
        }
      } else if (node.type === 5) {
        // 插值表达式节点
        const expr = node.content?.content || node.content?.s;
        if (expr && CHINESE_REGEX.test(expr) && !expr.includes("{{")) {
          const escapedText = expr.replace(/'/g, "\\'");
          s.overwrite(
            node.loc.start.offset,
            node.loc.end.offset,
            `{{ $t('${escapedText}') }}`,
          );
          hasTransform = true;
        }
      } else if (node.type === 1) {
        // 元素节点：处理属性
        if (node.props) {
          node.props.forEach((prop: any) => {
            if (prop.type === 6) {
              const attrName = prop.name;
              const attrValue = prop.value?.content;
              if (
                attrValue &&
                CHINESE_REGEX.test(attrValue) &&
                ["placeholder", "title", "alt", "label"].includes(attrName)
              ) {
                const escapedValue = attrValue.replace(/'/g, "\\'");
                s.overwrite(
                  prop.loc.start.offset,
                  prop.loc.end.offset,
                  `:${attrName}="$t('${escapedValue}')"`,
                );
                hasTransform = true;
              }
            }
          });
        }
      }
    });
  } catch (error) {
    console.warn(`[transformVue3TemplateBlock] Failed to parse template:`, error);
    return null;
  }

  if (!hasTransform) {
    return null;
  }

  return s.toString();
}
