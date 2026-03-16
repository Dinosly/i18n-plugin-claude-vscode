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

      // Vue script block (extracted by vue-loader)
      if (id.includes(".vue?vue&type=script")) {
        const result = transformJS(code, id);
        if (result) {
          return {
            code: result,
            map: null,
          };
        }
      }

      // Full Vue SFC (for Vite/Rollup)
      if (id.endsWith(".vue") && !id.includes("?vue&type=")) {
        const result = transformVue(code, id, vueVersion);
        if (result) {
          return {
            code: result,
            map: null,
          };
        }
      }

      // JS/TS/JSX/TSX 文件
      if (/\.[jt]sx?$/.test(id)) {
        const result = transformJS(code, id);
        if (result) {
          return {
            code: result,
            map: null,
          };
        }
      }

      return null;
    },
  };
});

export default unplugin;
