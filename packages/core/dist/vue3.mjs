// src/vue3.ts
import { ref } from "vue";

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
  const localeRef = ref(i18nCore.locale);
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
  const localeRef = ref(i18nCore.locale);
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
export {
  createVue3I18n,
  useI18n
};
//# sourceMappingURL=vue3.mjs.map