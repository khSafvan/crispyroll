/**
 * Localization & Translation Engine
 */

export const translate = {
  lang: "en",

  /**
   * Initializes language from saved session storage or defaults to 'en-US'.
   */
  init: () => {
    if (window.session?.storage?.language && window.session.storage.language.includes("-")) {
      translate.updateLanguage(window.session.storage.language);
    } else {
      translate.updateLanguage("en-US");
    }
  },

  /**
   * Refreshes all DOM elements marked with the [translate] attribute.
   */
  refresh: () => {
    const elements = document.querySelectorAll("[translate]");
    elements.forEach((element) => {
      element.innerText = translate.go(element.innerText.trim());
    });
  },

  /**
   * Resolves a dot-separated translation key into localized text.
   * Falls back to English, then to the key itself if translation is missing.
   *
   * @param {string} key
   * @param {Record<string, string|number>} [params]
   * @returns {string}
   */
  go: (key, params) => {
    if (!key) return "";
    const keys = key.split(".");
    const langDicts = typeof window !== "undefined" && window.languages ? window.languages : global.languages || {};

    try {
      const currentDict = langDicts[translate.lang];
      if (currentDict) {
        const text = keys.reduce((obj, i) => (obj !== undefined && obj !== null ? obj[i] : undefined), currentDict);
        if (typeof text === "string") {
          return params ? translate.withParams(text, params) : text;
        }
      }
    } catch {
      // ignore
    }

    try {
      const enDict = langDicts["en"];
      if (enDict) {
        const text = keys.reduce((obj, i) => (obj !== undefined && obj !== null ? obj[i] : undefined), enDict);
        if (typeof text === "string") {
          return params ? translate.withParams(text, params) : text;
        }
      }
    } catch {
      // ignore
    }

    // If it's an unmapped programmatic dotted key (e.g. 'home.continue'), return empty string
    // so that standard UI fallback expressions (e.g. `translate.go(...) || "Fallback"`) evaluate properly.
    // Otherwise return plain human-readable string.
    return key.includes(".") ? "" : key;
  },

  /**
   * Replaces placeholders like `{paramName}` with corresponding values.
   *
   * @param {string} message
   * @param {Record<string, string|number>} params
   * @returns {string}
   */
  withParams: (message, params) => {
    if (!message || !params) return message;
    return Object.keys(params).reduce((result, key) => {
      return result.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "g"), params[key]);
    }, message);
  },

  /**
   * Updates current language and syncs with session storage.
   *
   * @param {string} lang
   */
  updateLanguage: (lang) => {
    translate.lang = lang.split("-")[0];
    if (window.session?.storage) {
      window.session.storage.language = lang;
      window.session.update();
    }
  },
};

// Backward compatibility with unmigrated screens
if (typeof window !== "undefined") {
  window.translate = translate;
}

export default translate;
