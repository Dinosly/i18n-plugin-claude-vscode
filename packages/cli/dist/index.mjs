// src/index.ts
import * as fs3 from "fs";
import * as path from "path";
import { glob } from "glob";

// src/extractJS.ts
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import * as fs from "fs";
var CHINESE_REGEX = /[\u4e00-\u9fa5]/;
function extractFromJS(filePath) {
  const code = fs.readFileSync(filePath, "utf-8");
  const results = [];
  try {
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators-legacy"]
    });
    traverse(ast, {
      // 字符串字面量
      StringLiteral(path2) {
        const { value } = path2.node;
        if (CHINESE_REGEX.test(value)) {
          if (hasIgnoreComment(path2.node.leadingComments)) {
            return;
          }
          results.push({
            key: value,
            text: value,
            file: filePath,
            line: path2.node.loc?.start.line || 0
          });
        }
      },
      // 模板字符串
      TemplateLiteral(path2) {
        const { quasis, expressions } = path2.node;
        let hasChineseText = false;
        let templateText = "";
        quasis.forEach((quasi, index) => {
          const text = quasi.value.cooked || quasi.value.raw;
          if (CHINESE_REGEX.test(text)) {
            hasChineseText = true;
          }
          templateText += text;
          if (index < expressions.length) {
            templateText += `{${index}}`;
          }
        });
        if (hasChineseText && !hasIgnoreComment(path2.node.leadingComments)) {
          results.push({
            key: templateText,
            text: templateText,
            file: filePath,
            line: path2.node.loc?.start.line || 0
          });
        }
      },
      // JSX 文本节点
      JSXText(path2) {
        const text = path2.node.value.trim();
        if (text && CHINESE_REGEX.test(text)) {
          if (!hasIgnoreComment(path2.node.leadingComments)) {
            results.push({
              key: text,
              text,
              file: filePath,
              line: path2.node.loc?.start.line || 0
            });
          }
        }
      },
      // JSX 属性（如 placeholder, title）
      JSXAttribute(path2) {
        const attrName = path2.node.name.name;
        if (typeof attrName === "string" && ["placeholder", "title", "alt", "label"].includes(attrName)) {
          const value = path2.node.value;
          if (t.isStringLiteral(value) && CHINESE_REGEX.test(value.value)) {
            results.push({
              key: value.value,
              text: value.value,
              file: filePath,
              line: path2.node.loc?.start.line || 0
            });
          }
        }
      }
    });
  } catch (error) {
    console.warn(`[Warning] Failed to parse ${filePath}:`, error);
  }
  return results;
}
function hasIgnoreComment(comments) {
  if (!comments) return false;
  return comments.some(
    (comment) => comment.value.includes("i18n-ignore") || comment.value.includes("i18n-ignore-next-line")
  );
}

// src/extractVue.ts
import { parse as parse2 } from "@vue/compiler-sfc";
import * as fs2 from "fs";
var CHINESE_REGEX2 = /[\u4e00-\u9fa5]/;
function extractFromVue(filePath) {
  const code = fs2.readFileSync(filePath, "utf-8");
  const results = [];
  try {
    const { descriptor } = parse2(code, { filename: filePath });
    if (descriptor.template) {
      const templateContent = descriptor.template.content;
      const lines = templateContent.split("\n");
      lines.forEach((line, index) => {
        const textMatches = line.match(/>([^<]+)</g);
        if (textMatches) {
          textMatches.forEach((match) => {
            const text = match.replace(/^>|<$/g, "").trim();
            if (text && CHINESE_REGEX2.test(text)) {
              results.push({
                key: text,
                text,
                file: filePath,
                line: index + 1
              });
            }
          });
        }
        const attrMatches = line.match(/(placeholder|title|alt|label)="([^"]+)"/g);
        if (attrMatches) {
          attrMatches.forEach((match) => {
            const value = match.match(/"([^"]+)"/)?.[1];
            if (value && CHINESE_REGEX2.test(value)) {
              results.push({
                key: value,
                text: value,
                file: filePath,
                line: index + 1
              });
            }
          });
        }
      });
    }
    if (descriptor.script || descriptor.scriptSetup) {
      const scriptContent = descriptor.script?.content || descriptor.scriptSetup?.content || "";
      const matches = scriptContent.match(/['"`]([\u4e00-\u9fa5][^'"`]*?)['"`]/g);
      if (matches) {
        matches.forEach((match) => {
          const text = match.replace(/^['"`]|['"`]$/g, "");
          if (CHINESE_REGEX2.test(text)) {
            results.push({
              key: text,
              text,
              file: filePath,
              line: 0
            });
          }
        });
      }
    }
  } catch (error) {
    console.warn(`[Warning] Failed to parse Vue file ${filePath}:`, error);
  }
  return results;
}

// src/index.ts
async function extract(options) {
  const { srcDir, outDir, locales, defaultLocale = "zh-CN" } = options;
  console.log(`[i18n-extract] Scanning directory: ${srcDir}`);
  const files = await glob("**/*.{js,jsx,ts,tsx,vue}", {
    cwd: srcDir,
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"]
  });
  console.log(`[i18n-extract] Found ${files.length} files`);
  const allResults = [];
  for (const file of files) {
    const ext = path.extname(file);
    let results = [];
    if (ext === ".vue") {
      results = extractFromVue(file);
    } else {
      results = extractFromJS(file);
    }
    allResults.push(...results);
  }
  console.log(`[i18n-extract] Extracted ${allResults.length} Chinese texts`);
  const uniqueMap = /* @__PURE__ */ new Map();
  allResults.forEach((result) => {
    if (!uniqueMap.has(result.key)) {
      uniqueMap.set(result.key, result);
    }
  });
  console.log(`[i18n-extract] Unique keys: ${uniqueMap.size}`);
  if (!fs3.existsSync(outDir)) {
    fs3.mkdirSync(outDir, { recursive: true });
  }
  for (const locale of locales) {
    const filePath = path.join(outDir, `${locale}.json`);
    let existingDict = {};
    if (fs3.existsSync(filePath)) {
      try {
        existingDict = JSON.parse(fs3.readFileSync(filePath, "utf-8"));
      } catch (error) {
        console.warn(`[Warning] Failed to parse existing ${locale}.json`);
      }
    }
    const newDict = { ...existingDict };
    uniqueMap.forEach((result, key) => {
      if (!newDict[key]) {
        newDict[key] = locale === defaultLocale ? result.text : "";
      }
    });
    fs3.writeFileSync(filePath, JSON.stringify(newDict, null, 2), "utf-8");
    console.log(`[i18n-extract] Generated: ${filePath}`);
  }
  console.log("[i18n-extract] Done!");
}
export {
  extract
};
//# sourceMappingURL=index.mjs.map