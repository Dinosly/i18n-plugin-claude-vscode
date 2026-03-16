import Vue from "vue";
import App from "./App.vue";
import { createVue2I18n } from "@i18n-plugin/core/vue2";

// 创建 i18n 实例，传入 Vue 实例
const i18n = createVue2I18n(
  {
    locale: "zh-CN",
    fallbackLocale: "en-US",
    messages: {},
  },
  Vue,
);

// 安装 i18n 插件到 Vue
Vue.use(i18n);

// 动态加载语言包
async function loadLocaleMessages(locale) {
  try {
    const response = await fetch(`/locales/${locale}.json`);
    const messages = await response.json();
    console.log(`[main] Loaded messages for ${locale}:`, messages);
    i18n.loadMessages(locale, messages);
  } catch (error) {
    console.warn(`Failed to load locale ${locale}:`, error);
  }
}

// 创建 Vue 实例（先渲染组件，再加载语言包）
const vm = new Vue({
  render: (h) => h(App),
  methods: {
    async switchLocale(locale) {
      console.log(
        `[main] switchLocale called: ${locale}, current: ${i18n.locale}`,
      );

      await loadLocaleMessages(locale);
      i18n.setLocale(locale);
    },
  },
});

// 先挂载组件，再延迟加载语言包
vm.$mount("#app");
setTimeout(() => {
  console.log(`[main] Loading initial locale, current: ${i18n.locale}`);
  loadLocaleMessages("zh-CN");
}, 0);
