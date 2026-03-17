#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli.ts
var import_commander = require("commander");

// src/index.ts
var fs3 = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_glob = require("glob");

// src/extractJS.ts
var parser = __toESM(require("@babel/parser"));
var import_traverse = __toESM(require("@babel/traverse"));
var t = __toESM(require("@babel/types"));
var fs = __toESM(require("fs"));
var CHINESE_REGEX = /[\u4e00-\u9fa5]/;
function extractFromJS(filePath) {
  const code = fs.readFileSync(filePath, "utf-8");
  const results = [];
  try {
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators-legacy"]
    });
    (0, import_traverse.default)(ast, {
      // 字符串字面量
      StringLiteral(path3) {
        const { value } = path3.node;
        if (CHINESE_REGEX.test(value)) {
          if (hasIgnoreComment(path3.node.leadingComments)) {
            return;
          }
          results.push({
            key: value,
            text: value,
            file: filePath,
            line: path3.node.loc?.start.line || 0
          });
        }
      },
      // 模板字符串
      TemplateLiteral(path3) {
        const { quasis, expressions } = path3.node;
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
        if (hasChineseText && !hasIgnoreComment(path3.node.leadingComments)) {
          results.push({
            key: templateText,
            text: templateText,
            file: filePath,
            line: path3.node.loc?.start.line || 0
          });
        }
      },
      // JSX 文本节点
      JSXText(path3) {
        const text = path3.node.value.trim();
        if (text && CHINESE_REGEX.test(text)) {
          if (!hasIgnoreComment(path3.node.leadingComments)) {
            results.push({
              key: text,
              text,
              file: filePath,
              line: path3.node.loc?.start.line || 0
            });
          }
        }
      },
      // JSX 属性（如 placeholder, title）
      JSXAttribute(path3) {
        const attrName = path3.node.name.name;
        if (typeof attrName === "string" && ["placeholder", "title", "alt", "label"].includes(attrName)) {
          const value = path3.node.value;
          if (t.isStringLiteral(value) && CHINESE_REGEX.test(value.value)) {
            results.push({
              key: value.value,
              text: value.value,
              file: filePath,
              line: path3.node.loc?.start.line || 0
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
var import_compiler_sfc = require("@vue/compiler-sfc");
var fs2 = __toESM(require("fs"));
var CHINESE_REGEX2 = /[\u4e00-\u9fa5]/;
function extractFromVue(filePath) {
  const code = fs2.readFileSync(filePath, "utf-8");
  const results = [];
  try {
    const { descriptor } = (0, import_compiler_sfc.parse)(code, { filename: filePath });
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
  const files = await (0, import_glob.glob)("**/*.{js,jsx,ts,tsx,vue}", {
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

// src/cli.ts
var path2 = __toESM(require("path"));
var program = new import_commander.Command();
program.name("i18n-extract").description("\u63D0\u53D6\u6E90\u7801\u4E2D\u7684\u4E2D\u6587\u5E76\u751F\u6210\u56FD\u9645\u5316\u5B57\u5178").version("1.0.0");
program.command("extract").description("\u626B\u63CF\u6E90\u7801\u5E76\u63D0\u53D6\u4E2D\u6587").option("-s, --src <dir>", "\u6E90\u7801\u76EE\u5F55", "src").option("-o, --out <dir>", "\u8F93\u51FA\u76EE\u5F55", "locales").option("-l, --locales <locales>", "\u8BED\u8A00\u5217\u8868\uFF08\u9017\u53F7\u5206\u9694\uFF09", "zh-CN,en-US").option("-d, --default <locale>", "\u9ED8\u8BA4\u8BED\u8A00", "zh-CN").action(async (options) => {
  const srcDir = path2.resolve(process.cwd(), options.src);
  const outDir = path2.resolve(process.cwd(), options.out);
  const locales = options.locales.split(",").map((l) => l.trim());
  await extract({
    srcDir,
    outDir,
    locales,
    defaultLocale: options.default
  });
});
program.parse();
//# sourceMappingURL=cli.js.map