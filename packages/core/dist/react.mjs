// src/react.ts
import React, { useState, useEffect } from "react";

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

// src/react.ts
function createReactI18n(config) {
  const i18nCore = createI18n(config);
  setGlobalI18n(i18nCore);
  return i18nCore;
}
function useI18n() {
  const i18nCore = getGlobalI18n();
  const [locale, setLocale] = useState(i18nCore.locale);
  useEffect(() => {
    setLocale(i18nCore.locale);
    console.log("[react] useEffect setup, subscribing...");
    const unsubscribe = i18nCore.subscribe(() => {
      console.log("[react] subscribe callback fired, locale:", i18nCore.locale);
      setLocale(i18nCore.locale);
    });
    return unsubscribe;
  }, [i18nCore]);
  const t = (key, ...args) => {
    return i18nCore.t(key, ...args);
  };
  return {
    locale,
    t,
    setLocale: i18nCore.setLocale,
    loadMessages: i18nCore.loadMessages
  };
}
function withI18n(Component) {
  return (props) => {
    const { t } = useI18n();
    return React.createElement(Component, { ...props, t });
  };
}
export {
  createReactI18n,
  useI18n,
  withI18n
};
//# sourceMappingURL=react.mjs.map