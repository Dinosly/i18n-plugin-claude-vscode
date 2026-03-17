"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/vue3.ts
var vue3_exports = {};
__export(vue3_exports, {
  createVue3I18n: () => createVue3I18n,
  useI18n: () => useI18n
});
module.exports = __toCommonJS(vue3_exports);
var import_vue = require("vue");

// src/core.ts
function createI18n(config) {
  let currentLocale = config.locale;
  const messages = config.messages || {};
  const fallbackLocale = config.fallbackLocale || "zh-CN";
  const subscribers = /* @__PURE__ */ new Set();
  function t(key, ...args) {
    const dict = messages[currentLocale] || {};
    let text = dict[key];
    if (!text && currentLocale !== fallbackLocale) {
      text = (messages[fallbackLocale] || {})[key];
    }
    if (!text) {
      return key;
    }
    return text.replace(/\{(\d+)\}/g, (_, index) => {
      const value = args[Number(index)];
      return value !== void 0 ? String(value) : `{${index}}`;
    });
  }
  function setLocale(locale) {
    console.log("[i18n] setLocale called:", locale, "current:", currentLocale);
    if (currentLocale === locale) {
      console.log("[i18n] setLocale early return (same locale)");
      return;
    }
    currentLocale = locale;
    console.log("[i18n] setLocale notify subscribers, count:", subscribers.size);
    notify();
  }
  function loadMessages(locale, dict) {
    console.log("[i18n] loadMessages called:", locale, "keys:", Object.keys(dict));
    messages[locale] = { ...messages[locale], ...dict };
    console.log("[i18n] loadMessages notify subscribers");
    notify();
  }
  function subscribe(callback) {
    console.log("[i18n] subscribe called, total subscribers:", subscribers.size + 1);
    subscribers.add(callback);
    return () => {
      console.log("[i18n] unsubscribe called");
      subscribers.delete(callback);
    };
  }
  function notify() {
    console.log("[i18n] notify called, subscribers count:", subscribers.size);
    subscribers.forEach((cb) => cb());
  }
  return {
    get locale() {
      return currentLocale;
    },
    messages,
    t,
    setLocale,
    loadMessages,
    subscribe
  };
}
var globalInstance = null;
function getGlobalI18n() {
  if (!globalInstance) {
    throw new Error(
      "[i18n-plugin/core] Global instance not initialized. Call createI18n() first."
    );
  }
  return globalInstance;
}
function setGlobalI18n(instance) {
  globalInstance = instance;
}

// src/vue3.ts
function createVue3I18n(config) {
  const i18nCore = createI18n(config);
  setGlobalI18n(i18nCore);
  const localeRef = (0, import_vue.ref)(i18nCore.locale);
  const originalSetLocale = i18nCore.setLocale;
  i18nCore.setLocale = (locale) => {
    originalSetLocale(locale);
    localeRef.value = locale;
  };
  const t = (key, ...args) => {
    void localeRef.value;
    return i18nCore.t(key, ...args);
  };
  const install = (app) => {
    app.config.globalProperties.$t = t;
    app.config.globalProperties.$i18n = i18nCore;
    app.provide("i18n", i18nCore);
    app.provide("$t", t);
  };
  return {
    ...i18nCore,
    t,
    install
  };
}
function useI18n() {
  const i18nCore = getGlobalI18n();
  const localeRef = (0, import_vue.ref)(i18nCore.locale);
  i18nCore.subscribe(() => {
    localeRef.value = i18nCore.locale;
  });
  const t = (key, ...args) => {
    void localeRef.value;
    return i18nCore.t(key, ...args);
  };
  return {
    locale: localeRef,
    t,
    setLocale: i18nCore.setLocale,
    loadMessages: i18nCore.loadMessages
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createVue3I18n,
  useI18n
});
//# sourceMappingURL=vue3.js.map