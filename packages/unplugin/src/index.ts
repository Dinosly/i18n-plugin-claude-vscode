import { createUnplugin } from "unplugin";
import { transformJS } from "./transformJS";
import { transformVue } from "./transformVue";

export interface I18nPluginOptions {
  include?: RegExp | RegExp[];
  exclude?: RegExp | RegExp[];
  /** Vue 版本，影响模板 AST 解析器的选择。默认 3。Vue 2 项目请传 2。 */
  vueVersion?: 2 | 3;
}

/**
 * 创建 unplugin 实例
 * 一套代码支持 Vite/Webpack/Rollup
 */
export const unplugin = createUnplugin<I18nPluginOptions>((options = {}) => {
  const {
    include = [/\.[jt]sx?$/, /\.vue$/],
    exclude = [/node_modules/, /\.d\.ts$/],
    vueVersion = 3,
  } = options;

  return {
    name: "unplugin-i18n",

    enforce: "pre",

    transformInclude(id) {
      // 移除查询参数进行匹配
      const cleanId = id.split('?')[0];

      // 特殊处理 vue-loader 的内部请求
      // 支持: ?vue&type=script, ?vue&type=script&setup=true, ?vue&type=template
      if (id.includes("?vue&type=template") || id.includes("?vue&type=script")) {
        return true;
      }

      // 检查是否应该处理该文件
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

      // Vue template block (extracted by vue-loader)
      if (id.includes(".vue?vue&type=template")) {
        const result = transformVue(code, id, vueVersion);
        if (result) {
          return {
            code: result,
            map: null,
          };
        }
      }

      // Vue script block (extracted by vue-loader) - but skip if it looks like full SFC
      if (id.includes(".vue?vue&type=script")) {
        // Skip if this looks like the full SFC (contains <template>)
        if (code.includes('<template>')) {
          return null;
        }
        const result = transformJS(code, id);
        if (result) {
          return {
            code: result,
            map: null,
          };
        }
      }

      // For non-vue-loader builds (Vite/Rollup), transform full SFC
      // 注意: 只处理 .vue 文件的模板部分，script 部分由后续的 vue-loader 请求处理
      if (id.endsWith(".vue") && !id.includes("?vue&type=")) {
        const result = transformVue(code, id, vueVersion);
        if (result) {
          return {
            code: result,
            map: null,
          };
        }
        // 即使 transformVue 返回 null，也不再继续处理 JS/TSX
        return null;
      }

      // JS/TS/JSX/TSX 文件
      if (/\.[jt]sx?$/.test(id)) {
        const result = transformJS(code, id);
        if (result) {
          console.log(`[unplugin] JS/TSX transform applied for: ${id}`);
          return {
            code: result,
            map: null,
          };
        } else {
          console.log(`[unplugin] JS/TSX transform NOT applied for: ${id}`);
        }
      }

      return null;
    },
  };
});

export default unplugin;
