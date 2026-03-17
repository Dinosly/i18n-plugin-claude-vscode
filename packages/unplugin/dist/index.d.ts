import * as unplugin$1 from 'unplugin';

interface I18nPluginOptions {
    include?: RegExp | RegExp[];
    exclude?: RegExp | RegExp[];
    /** Vue 版本，影响模板 AST 解析器的选择。默认 3。Vue 2 项目请传 2。 */
    vueVersion?: 2 | 3;
}
/**
 * 创建 unplugin 实例
 * 一套代码支持 Vite/Webpack/Rollup
 */
declare const unplugin: unplugin$1.UnpluginInstance<I18nPluginOptions, boolean>;

export { type I18nPluginOptions, unplugin as default, unplugin };
