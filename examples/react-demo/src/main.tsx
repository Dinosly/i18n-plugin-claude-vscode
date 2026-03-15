import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// import { createReactI18n } from "@i18n-plugin/core/react";
import { createReactI18n } from "../../../packages/core/src/react";

// 创建 i18n 实例
const i18n = createReactI18n({
  locale: "zh-CN",
  fallbackLocale: "en-US",
  messages: {},
});

// 动态加载语言包
async function loadLocaleMessages(locale: string) {
  try {
    const messages = await fetch(`/locales/${locale}.json`).then((res) =>
      res.json(),
    );
    console.log(`Loaded messages for ${locale}:`, messages);
    i18n.loadMessages(locale, messages);
  } catch (error) {
    console.warn(`Failed to load locale ${locale}:`, error);
  }
}

// 先渲染组件，再加载语言包
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// 组件挂载后延迟加载语言包，确保订阅者已注册
setTimeout(() => loadLocaleMessages("zh-CN"), 0);

// 导出切换语言的函数
export async function switchLocale(locale: string) {
  i18n.setLocale(locale);
  await loadLocaleMessages(locale);
}
