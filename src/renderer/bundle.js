(() => {
  // src/renderer/core/dom.js
  function $$(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }
  function $1(selector, parent = document) {
    return parent.querySelector(selector);
  }
  function delegate(container, eventType, selector, handler) {
    if (!container) return;
    container.addEventListener(eventType, (event) => {
      const target = event.target.closest(selector);
      if (target && container.contains(target)) {
        handler.call(target, event, target);
      }
    });
  }
  if (typeof window !== "undefined") {
    window.$$ = $$;
    window.$1 = $1;
    window.delegate = delegate;
  }

  // src/renderer/core/translate.js
  var translate = {
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
      let text = key;
      try {
        text = keys.reduce((obj, i) => obj[i], window.languages[translate.lang]);
        text = params ? translate.withParams(text, params) : text;
      } catch {
        try {
          text = keys.reduce((obj, i) => obj[i], window.languages["en"]);
          text = params ? translate.withParams(text, params) : text;
        } catch {
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
      translate.lang = lang.split("-")[0];
      if (window.session?.storage) {
        window.session.storage.language = lang;
        window.session.update();
      }
    }
  };
  if (typeof window !== "undefined") {
    window.translate = translate;
  }
  var translate_default = translate;
})();
//# sourceMappingURL=bundle.js.map
