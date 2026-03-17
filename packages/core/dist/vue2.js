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

// src/vue2.ts
var vue2_exports = {};
__export(vue2_exports, {
  createVue2I18n: () => createVue2I18n
});
module.exports = __toCommonJS(vue2_exports);

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
function setGlobalI18n(instance) {
  globalInstance = instance;
}

// src/vue2.ts
function createVue2I18n(config, Vue) {
  const i18nCore = createI18n(config);
  setGlobalI18n(i18nCore);
  let vueInstance = Vue;
  if (!vueInstance) {
    try {
      vueInstance = require("vue");
    } catch {
      throw new Error("Vue 2 is required but not installed");
    }
  }
  const state = vueInstance.observable({
    locale: i18nCore.locale
  });
  Object.defineProperty(i18nCore, "locale", {
    get() {
      return state.locale;
    },
    configurable: true,
    enumerable: true
  });
  const originalSetLocale = i18nCore.setLocale;
  i18nCore.setLocale = (locale) => {
    originalSetLocale(locale);
    state.locale = locale;
  };
  const t = (key, ...args) => {
    console.log("[vue2] $t called, key:", key, "locale:", state.locale);
    const result = i18nCore.t(key, ...args);
    console.log("[vue2] $t result:", result);
    return result;
  };
  const install = (vue) => {
    vue.mixin({
      beforeCreate() {
        console.log("[vue2] beforeCreate hook, this:", this.$options.name);
        const unsubscribe = i18nCore.subscribe(() => {
          console.log("[vue2] subscribe callback fired for:", this.$options.name, "forcing update");
          this.$forceUpdate();
          console.log("[vue2] $forceUpdate called");
        });
        this.$once("hook:beforeDestroy", unsubscribe);
      }
    });
    vue.prototype.$t = t;
    vue.prototype.$i18n = i18nCore;
  };
  return {
    ...i18nCore,
    t,
    install
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createVue2I18n
});
//# sourceMappingURL=vue2.js.map