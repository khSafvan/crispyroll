/**
 * Pure Utility Modules Test Suite (Crispyroll)
 */

const assert = require("assert");
const { debounce, throttle } = require("../src/renderer/utils/timing.js");
const { formatDuration, formatEpisodeNumber, formatScore, formatRelativeDate } = require("../src/renderer/utils/formatters.js");
const { calculateBrightness } = require("../src/renderer/utils/colorExtractor.js");
const { createElement, safeRemove } = require("../src/renderer/utils/domUtils.js");
const { sanitizeTitle } = require("../src/renderer/utils/sanitizeTitle.js");

function runUtilsTests() {
  console.log("Running Pure Utility Modules Tests...");

  // 1. Timing Utilities: Debounce
  let counter = 0;
  const debouncedFn = debounce(() => {
    counter++;
  }, 50);

  debouncedFn();
  debouncedFn();
  debouncedFn();
  assert.strictEqual(counter, 0, "Debounced function should not execute synchronously");

  // 2. Timing Utilities: Throttle
  let throttleCount = 0;
  const throttledFn = throttle(() => {
    throttleCount++;
  }, 100);

  throttledFn();
  throttledFn();
  assert.strictEqual(throttleCount, 1, "Throttled function should execute leading call immediately");

  // 3. Formatters: formatDuration
  assert.strictEqual(formatDuration(0), "00:00");
  assert.strictEqual(formatDuration(65), "01:05");
  assert.strictEqual(formatDuration(3665), "01:01:05");
  assert.strictEqual(formatDuration(3665, true), "01:01:05");
  assert.strictEqual(formatDuration(125, true), "00:02:05");
  assert.strictEqual(formatDuration(-10), "00:00");

  // 4. Formatters: formatEpisodeNumber
  assert.strictEqual(formatEpisodeNumber(1), "E1");
  assert.strictEqual(formatEpisodeNumber("12"), "E12");
  assert.strictEqual(formatEpisodeNumber("E5"), "E5");
  assert.strictEqual(formatEpisodeNumber("0.5"), "E0.5");
  assert.strictEqual(formatEpisodeNumber(null), "");

  // 5. Formatters: formatScore
  const high = formatScore(8.8);
  assert.strictEqual(high.display, "⭐ 8.8");
  assert.strictEqual(high.percentage, 88);
  assert.strictEqual(high.tier, "high");

  const mid = formatScore(6.5);
  assert.strictEqual(mid.display, "⭐ 6.5");
  assert.strictEqual(mid.percentage, 65);
  assert.strictEqual(mid.tier, "mid");

  const low = formatScore(4.2);
  assert.strictEqual(low.display, "⭐ 4.2");
  assert.strictEqual(low.tier, "low");

  const invalid = formatScore(null);
  assert.strictEqual(invalid.display, "N/A");
  assert.strictEqual(invalid.tier, "low");

  // 6. Formatters: formatRelativeDate
  assert.strictEqual(formatRelativeDate(Date.now()), "Just now");
  assert.strictEqual(formatRelativeDate(Date.now() - 5 * 60 * 1000), "5m ago");
  assert.strictEqual(formatRelativeDate(Date.now() - 3 * 3600 * 1000), "3h ago");
  assert.strictEqual(formatRelativeDate(Date.now() - 2 * 86400 * 1000), "2d ago");
  assert.strictEqual(formatRelativeDate("invalid-date"), "");

  // 7. Color Extractor: calculateBrightness
  assert.strictEqual(calculateBrightness(0, 0, 0), 0);
  assert.strictEqual(calculateBrightness(255, 255, 255), 255);
  const darkBr = calculateBrightness(13, 13, 17);
  assert.strictEqual(darkBr < 128, true, "Deep charcoal should be categorized as dark");

  // 8. DOM Utils (Node environment mock test)
  if (typeof document !== "undefined") {
    const el = createElement("div", "test-class extra-class", { id: "test-node", "data-val": "123" }, "<span>Content</span>");
    assert.strictEqual(el.tagName, "DIV");
    assert.strictEqual(el.classList.contains("test-class"), true);
    assert.strictEqual(el.getAttribute("data-val"), "123");
    document.body.appendChild(el);
    assert.strictEqual(safeRemove("test-node"), true);
  }

  // 9. Title Sanitizer
  assert.strictEqual(
    sanitizeTitle("Attack on Titan (English Dub)"),
    "Attack on Titan"
  );
  assert.strictEqual(
    sanitizeTitle("Demon Slayer: Kimetsu no Yaiba - Entertainment District Arc"),
    "Demon Slayer: Kimetsu no Yaiba - Entertainment District Arc"
  );

  console.log("✓ Pure utility modules tests passed!");
}

module.exports = { runUtilsTests };

if (require.main === module) {
  runUtilsTests();
}
