/**
 * Translation Engine Unit Tests
 */

const assert = require("assert");

function testTranslateEngine() {
  console.log("Running Translation Engine Tests...");

  // Mock global languages and session
  global.languages = {
    en: {
      generic: { alert: { cursor: "Mouse cursor is not supported." } },
      home: { details: { play: "Play: S{season} E{episode}" } },
    },
    es: {
      home: { details: { play: "Reproducir: T{season} E{episode}" } },
    },
  };

  global.session = {
    storage: { language: "en-US" },
    update: () => {},
  };

  global.window = global;

  // Load translate module
  require("../src/renderer/core/translate");

  window.translate.init();
  assert.strictEqual(window.translate.lang, "en");

  // Test simple key translation
  const alertText = window.translate.go("generic.alert.cursor");
  assert.strictEqual(alertText, "Mouse cursor is not supported.");

  // Test parameter replacement
  const paramText = window.translate.go("home.details.play", { season: 2, episode: 5 });
  assert.strictEqual(paramText, "Play: S2 E5");

  // Test withParams with surrounding whitespaces
  const withSpaces = window.translate.withParams("Hello { user }!", { user: "Crunchy" });
  assert.strictEqual(withSpaces, "Hello Crunchy!");

  // Test language switching
  window.translate.updateLanguage("es-ES");
  assert.strictEqual(window.translate.lang, "es");
  const esText = window.translate.go("home.details.play", { season: 1, episode: 3 });
  assert.strictEqual(esText, "Reproducir: T1 E3");

  // Test missing dotted key fallback behavior (must return "" so `|| "Fallback"` evaluates)
  const missingFallback = window.translate.go("nonexistent.key.name") || "Custom Fallback";
  assert.strictEqual(missingFallback, "Custom Fallback", "Unmapped dotted keys must fallback gracefully without leaking variable name");

  // Test plain non-key string pass-through
  const plainText = window.translate.go("Action Anime");
  assert.strictEqual(plainText, "Action Anime", "Plain non-key strings must be preserved");

  console.log("✓ Translation engine tests passed!");
}

module.exports = { testTranslateEngine };
