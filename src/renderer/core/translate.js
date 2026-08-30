/**
 * Localization & Translation Engine
 */

window.translate = {
  lang: "en",

  /**
   * Initializes language from saved session storage or defaults to 'en-US'.
   */
  init: () => {
    if (window.session?.storage?.language && window.session.storage.language.includes("-")) {
      window.translate.updateLanguage(window.session.storage.language);
    } else {
      window.translate.updateLanguage("en-US");
    }
  },

  /**
   * Refreshes all DOM elements marked with the [translate] attribute.
   */
  refresh: () => {
    const elements = document.querySelectorAll("[translate]");
    elements.forEach((element) => {
      element.innerText = window.translate.go(element.innerText.trim());
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
    let text = key;

    try {
      text = keys.reduce((obj, i) => obj[i], window.languages[window.translate.lang]);
      text = params ? window.translate.withParams(text, params) : text;
    } catch {
      try {
        text = keys.reduce((obj, i) => obj[i], window.languages["en"]);
        text = params ? window.translate.withParams(text, params) : text;
      } catch {
        // Translation key not found
      }
    }

    return text || key;
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
    window.translate.lang = lang.split("-")[0];
    if (window.session?.storage) {
      window.session.storage.language = lang;
      window.session.update();
    }
  },
};
