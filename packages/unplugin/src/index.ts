import { createUnplugin } from "unplugin";
import { transformJS } from "./transformJS";
import { transformVue } from "./transformVue";

export interface I18nPluginOptions {
  include?: RegExp | RegExp[];
  exclude?: RegExp | RegExp[];
}

/**
 * 创建 unplugin 实例
 * 一套代码支持 Vite/Webpack/Rollup
 */
export const unplugin = createUnplugin<I18nPluginOptions>((options = {}) => {
  const {
    include = [/\.[jt]sx?$/, /\.vue$/],
    exclude = [/node_modules/, /\.d\.ts$/],
  } = options;

  return {
    name: "unplugin-i18n",

    enforce: "pre",

    transformInclude(id) {
      // 检查是否应该处理该文件
      if (Array.isArray(exclude)) {
        if (exclude.some((pattern) => pattern.test(id))) return false;
      } else if (exclude && exclude.test(id)) {
        return false;
      }

      if (Array.isArray(include)) {
        return include.some((pattern) => pattern.test(id));
      }
      return include.test(id);
    },

    transform(code, id) {
      // Vue 文件
      if (id.endsWith(".vue")) {
        const result = transformVue(code, id);
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
