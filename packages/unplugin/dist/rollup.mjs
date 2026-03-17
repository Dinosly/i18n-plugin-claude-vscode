// src/index.ts
import { createUnplugin } from "unplugin";

// src/transformJS.ts
import * as parser from "@babel/parser";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import generateModule from "@babel/generator";
var traverse = traverseModule.default || traverseModule;
var generate = generateModule.default || generateModule;
var CHINESE_REGEX = /[\u4e00-\u9fa5]/;
function transformJS(code, id, options = {}) {
  const { isExpression = false } = options;
  if (id.endsWith(".vue") && !id.includes("?vue&type=")) {
    return null;
  }
  if (!CHINESE_REGEX.test(code)) return null;
  try {
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators-legacy"]
    });
    let hasTransform = false;
    let needsImport = false;
    const isVueScriptBlock = id.includes(".vue?vue&type=script");
    console.log(`[transformJS] id: ${id}, isVueScriptBlock: ${isVueScriptBlock}, isExpression: ${isExpression}`);
    const isAlreadyTranslated = (path) => {
      let current = path.parent;
      while (current) {
        if (t.isCallExpression(current)) {
          const callee = current.callee;
          if (t.isIdentifier(callee)) {
            if (callee.name === importName || callee.name === "$t") {
              return true;
            }
          }
          if (t.isMemberExpression(callee)) {
            if (t.isThisExpression(callee.object) && t.isIdentifier(callee.property) && callee.property.name === "$t") {
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
    const isVue3ScriptSetup = id.includes("setup=true");
    const createTCall = (args) => {
      if (isVueScriptBlock && !isExpression) {
        if (isVue3ScriptSetup) {
          return t.callExpression(t.identifier("$t"), args);
        } else {
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
          if (needsImport && !isExpression && !isVueScriptBlock) {
            const hasImport = path.node.body.some(
              (node) => t.isImportDeclaration(node) && node.source.value === "@i18n-plugin/core"
            );
            if (!hasImport) {
              const importDeclaration2 = t.importDeclaration(
                [
                  t.importSpecifier(
                    t.identifier(importName),
                    t.identifier("$t")
                  )
                ],
                t.stringLiteral("@i18n-plugin/core")
              );
              path.node.body.unshift(importDeclaration2);
            }
          }
        }
      },
      StringLiteral(path) {
        const { value } = path.node;
        if (isAlreadyTranslated(path)) {
          return;
        }
        if (CHINESE_REGEX.test(value) && !hasIgnoreComment(path.node.leadingComments)) {
          path.replaceWith(
            createTCall([
              t.stringLiteral(value)
            ])
          );
          hasTransform = true;
          needsImport = true;
        }
      },
      TemplateLiteral(path) {
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
              ...expressions
            ])
          );
          hasTransform = true;
          needsImport = true;
        }
      },
      JSXText(path) {
        const text = path.node.value.trim();
        if (text && CHINESE_REGEX.test(text) && !hasIgnoreComment(path.node.leadingComments)) {
          path.replaceWith(
            t.jsxExpressionContainer(
              createTCall([
                t.stringLiteral(text)
              ])
            )
          );
          hasTransform = true;
          needsImport = true;
        }
      },
      JSXAttribute(path) {
        const attrName = path.node.name.name;
        if (typeof attrName === "string" && ["placeholder", "title", "alt", "label"].includes(attrName)) {
          const value = path.node.value;
          if (t.isStringLiteral(value) && CHINESE_REGEX.test(value.value)) {
            path.node.value = t.jsxExpressionContainer(
              createTCall([
                t.stringLiteral(value.value)
              ])
            );
            hasTransform = true;
            needsImport = true;
          }
        }
      }
    });
    console.log(`[transformJS] id: ${id}, hasTransform: ${hasTransform}, needsImport: ${needsImport}`);
    if (!hasTransform) return null;
    if (isExpression) {
      const exprNode = ast.program.body[0].expression;
      const output2 = generate(exprNode, { retainLines: true, compact: false });
      return output2.code;
    }
    const output = generate(ast, {
      retainLines: true,
      compact: false
    });
    return output.code;
  } catch (error) {
    console.warn(`[i18n-plugin] Failed to transform JS in ${id}:`, error);
    return null;
  }
}
function hasIgnoreComment(comments) {
  if (!comments) return false;
  return comments.some(
    (comment) => comment.value.includes("i18n-ignore") || comment.value.includes("i18n-ignore-next-line")
  );
}

// src/transformVue.ts
import { parse as parse2, compileTemplate } from "@vue/compiler-sfc";
import MagicString from "magic-string";
var CHINESE_REGEX2 = /[\u4e00-\u9fa5]/;
function transformVue(code, id, vueVersion = 3) {
  console.log("[transformVue] called for:", id, "vueVersion:", vueVersion);
  if (!CHINESE_REGEX2.test(code)) {
    console.log("[transformVue] no Chinese, returning null");
    return null;
  }
  if (id.includes("?vue&type=template")) {
    if (vueVersion === 2) {
      return transformVue2TemplateBlock(code, id);
    } else {
      return transformVue3TemplateBlock(code, id);
    }
  }
  try {
    const { descriptor } = parse2(code, { filename: id });
    const s = new MagicString(code);
    let hasTransform = false;
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
    if (descriptor.script) {
      const script = descriptor.script;
      const transformedScript = transformJS(script.content, id);
      if (transformedScript) {
        s.overwrite(script.loc.start.offset, script.loc.end.offset, transformedScript);
        hasTransform = true;
      }
    }
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
function transformVue2Template(content, templateStart, s, id) {
  let hasTransform = false;
  const transformed = /* @__PURE__ */ new Set();
  const textNodeRegex = />([^<>]*[\u4e00-\u9fa5][^<>]*)</g;
  let match;
  while ((match = textNodeRegex.exec(content)) !== null) {
    const fullText = match[1];
    const text = fullText.trim();
    if (!text || !CHINESE_REGEX2.test(text)) continue;
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
    } catch (e) {
      console.warn(
        `[transformVue2Template] Failed to transform text:`,
        e.message
      );
    }
  }
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
      s.overwrite(
        actualStart,
        actualEnd,
        `:${attrName}="$t('${escapedValue}')"`
      );
      transformed.add(actualStart);
      hasTransform = true;
    } catch (e) {
      console.warn(
        `[transformVue2Template] Failed to transform attr:`,
        e.message
      );
    }
  }
  return hasTransform;
}
function transformVue3Template(content, templateStart, s, id) {
  const { ast, errors } = compileTemplate({
    source: content,
    filename: id,
    id: `data-v-${Math.random().toString(36).substring(2, 11)}`
  });
  if (errors && errors.length > 0) {
    console.warn(`[i18n-plugin] Vue 3 template compile errors in ${id}:`, errors);
  }
  let hasTransform = false;
  traverseTemplateAST(ast, (node) => {
    if (node.type === 2) {
      const text = node.content.trim();
      if (text && CHINESE_REGEX2.test(text) && !hasIgnoreComment2(node)) {
        const escapedText = text.replace(/'/g, "\\'");
        s.overwrite(
          templateStart + node.loc.start.offset,
          templateStart + node.loc.end.offset,
          `{{ $t('${escapedText}') }}`
        );
        hasTransform = true;
      }
    } else if (node.type === 5) {
      const expr = node.content?.content || node.content?.s;
      if (expr && CHINESE_REGEX2.test(expr) && !expr.includes("{{")) {
        const escapedText = expr.replace(/'/g, "\\'");
        s.overwrite(
          templateStart + node.loc.start.offset,
          templateStart + node.loc.end.offset,
          `{{ $t('${escapedText}') }}`
        );
        hasTransform = true;
      }
    } else if (node.type === 8) {
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child) => {
          if (child.type === 2) {
            const text = child.content.trim();
            if (text && CHINESE_REGEX2.test(text)) {
              const escapedText = text.replace(/'/g, "\\'");
              s.overwrite(
                templateStart + child.loc.start.offset,
                templateStart + child.loc.end.offset,
                `{{ $t('${escapedText}') }}`
              );
              hasTransform = true;
            }
          }
        });
      }
    } else if (node.type === 1) {
      if (node.props) {
        node.props.forEach((prop) => {
          if (prop.type === 6) {
            const attrName = prop.name;
            const attrValue = prop.value?.content;
            if (attrValue && CHINESE_REGEX2.test(attrValue) && ["placeholder", "title", "alt", "label"].includes(attrName)) {
              const escapedValue = attrValue.replace(/'/g, "\\'");
              s.overwrite(
                templateStart + prop.loc.start.offset,
                templateStart + prop.loc.end.offset,
                `:${attrName}="$t('${escapedValue}')"`
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
function traverseTemplateAST(node, callback) {
  if (!node) return;
  if (node.loc) {
    callback(node);
  }
  if (node.children) {
    node.children.forEach((child) => traverseTemplateAST(child, callback));
  }
}
function hasIgnoreComment2(node) {
  if (node.loc?.start?.comments) {
    for (const comment of node.loc.start.comments) {
      if (comment.content.includes("i18n-ignore") || comment.content.includes("i18n-ignore-next-line")) {
        return true;
      }
    }
  }
  if (node.parent) {
    return hasIgnoreComment2(node.parent);
  }
  return false;
}
function transformVue2TemplateBlock(code, id) {
  const s = new MagicString(code);
  let hasTransform = false;
  let i = 0;
  const len = code.length;
  while (i < len) {
    const char = code[i];
    if (char === "<") {
      if (code.substring(i, i + 4) === "<!--") {
        const commentEnd = code.indexOf("-->", i);
        if (commentEnd === -1) break;
        i = commentEnd + 3;
        continue;
      }
      if (code.substring(i, i + 8) === "<script>" || code.substring(i, i + 9) === "</script>") {
        const scriptEnd = code.indexOf(">", i);
        if (scriptEnd === -1) break;
        i = scriptEnd + 1;
        continue;
      }
      if (code.substring(i, i + 7) === "<style>" || code.substring(i, i + 8) === "</style>") {
        const styleEnd = code.indexOf(">", i);
        if (styleEnd === -1) break;
        i = styleEnd + 1;
        continue;
      }
      if (code.substring(i, i + 11) === "</template>") {
        i = i + 11;
        continue;
      }
      const tagEnd = code.indexOf(">", i);
      if (tagEnd === -1) break;
      const tagContent = code.substring(i, tagEnd + 1);
      if (!tagContent.startsWith("</")) {
        const attrMatches = tagContent.matchAll(
          /\b(placeholder|title|alt|label)="([^"]*[\u4e00-\u9fa5][^"]*)"/g
        );
        for (const match of attrMatches) {
          const attrName = match[1];
          const attrValue = match[2];
          const attrStart = i + match.index;
          const attrEnd = attrStart + match[0].length;
          const escapedValue = attrValue.replace(/'/g, "\\'");
          s.overwrite(
            attrStart,
            attrEnd,
            `:${attrName}="$t('${escapedValue}')"`
          );
          hasTransform = true;
        }
      }
      i = tagEnd + 1;
      continue;
    }
    if (char === "{" && code[i + 1] === "{") {
      const exprStart = i;
      const exprEnd = code.indexOf("}}", i + 2);
      if (exprEnd === -1) {
        i++;
        continue;
      }
      const exprContent = code.substring(i + 2, exprEnd).trim();
      if (CHINESE_REGEX2.test(exprContent)) {
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
    const nextTag = code.indexOf("<", i);
    let textEnd = nextTag === -1 ? len : nextTag;
    const textContent = code.substring(i, textEnd);
    const trimmedText = textContent.trim();
    if (trimmedText && CHINESE_REGEX2.test(trimmedText) && !trimmedText.includes("{{")) {
      const escapedText = trimmedText.replace(/'/g, "\\'");
      const leadingWhitespace = textContent.match(/^\s*/)?.[0] || "";
      const trailingWhitespace = textContent.match(/\s*$/)?.[0] || "";
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
function transformVue3TemplateBlock(code, id) {
  const s = new MagicString(code);
  let hasTransform = false;
  try {
    const { ast } = compileTemplate({
      source: code,
      filename: id,
      id: `data-v-${Math.random().toString(36).substring(2, 11)}`
    });
    traverseTemplateAST(ast, (node) => {
      if (node.type === 2) {
        const text = node.content.trim();
        if (text && CHINESE_REGEX2.test(text) && !hasIgnoreComment2(node)) {
          const escapedText = text.replace(/'/g, "\\'");
          s.overwrite(
            node.loc.start.offset,
            node.loc.end.offset,
            `{{ $t('${escapedText}') }}`
          );
          hasTransform = true;
        }
      } else if (node.type === 5) {
        const expr = node.content?.content || node.content?.s;
        if (expr && CHINESE_REGEX2.test(expr) && !expr.includes("{{")) {
          const escapedText = expr.replace(/'/g, "\\'");
          s.overwrite(
            node.loc.start.offset,
            node.loc.end.offset,
            `{{ $t('${escapedText}') }}`
          );
          hasTransform = true;
        }
      } else if (node.type === 1) {
        if (node.props) {
          node.props.forEach((prop) => {
            if (prop.type === 6) {
              const attrName = prop.name;
              const attrValue = prop.value?.content;
              if (attrValue && CHINESE_REGEX2.test(attrValue) && ["placeholder", "title", "alt", "label"].includes(attrName)) {
                const escapedValue = attrValue.replace(/'/g, "\\'");
                s.overwrite(
                  prop.loc.start.offset,
                  prop.loc.end.offset,
                  `:${attrName}="$t('${escapedValue}')"`
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

// src/index.ts
var unplugin = createUnplugin((options = {}) => {
  const {
    include = [/\.[jt]sx?$/, /\.vue$/],
    exclude = [/node_modules/, /\.d\.ts$/],
    vueVersion = 3
  } = options;
  return {
    name: "unplugin-i18n",
    enforce: "pre",
    transformInclude(id) {
      const cleanId = id.split("?")[0];
      if (id.includes("?vue&type=template") || id.includes("?vue&type=script")) {
        return true;
      }
      if (Array.isArray(exclude)) {
        if (exclude.some((pattern) => pattern.test(cleanId))) {
          return false;
        }
      } else if (exclude && exclude.test(cleanId)) {
        return false;
      }
      if (Array.isArray(include)) {
        return include.some((pattern) => pattern.test(cleanId));
      }
      return include.test(cleanId);
    },
    transform(code, id) {
      console.log(`[unplugin] transform called for: ${id}, hasChinese: ${/[\u4e00-\u9fa5]/.test(code)}`);
      if (id.includes(".vue?vue&type=template")) {
        const result = transformVue(code, id, vueVersion);
        if (result) {
          return {
            code: result,
            map: null
          };
        }
      }
      if (id.includes(".vue?vue&type=script")) {
        if (code.includes("<template>")) {
          return null;
        }
        const result = transformJS(code, id);
        if (result) {
          return {
            code: result,
            map: null
          };
        }
      }
      if (id.endsWith(".vue") && !id.includes("?vue&type=")) {
        const result = transformVue(code, id, vueVersion);
        if (result) {
          return {
            code: result,
            map: null
          };
        }
        return null;
      }
      if (/\.[jt]sx?$/.test(id)) {
        const result = transformJS(code, id);
        if (result) {
          console.log(`[unplugin] JS/TSX transform applied for: ${id}`);
          return {
            code: result,
            map: null
          };
        } else {
          console.log(`[unplugin] JS/TSX transform NOT applied for: ${id}`);
        }
      }
      return null;
    }
  };
});

// src/rollup.ts
var rollup_default = unplugin.rollup;
export {
  rollup_default as default
};
//# sourceMappingURL=rollup.mjs.map