/**
 * Renderer ES Module Entry Point (Crispyroll)
 */

import { $$, $1, delegate } from "./core/dom.js";
import translate from "./core/translate.js";
import { sanitizeTitle } from "./utils/sanitizeTitle.js";
import { debounce, throttle } from "./utils/timing.js";
import { extractDominantColor, calculateBrightness } from "./utils/colorExtractor.js";
import { formatDuration, formatEpisodeNumber, formatScore, formatRelativeDate } from "./utils/formatters.js";
import { createElement, safeRemove, trapFocus } from "./utils/domUtils.js";
import QRCode from "qrcode";

if (typeof window !== "undefined") {
  window.QRCode = QRCode;
  window.sanitizeTitle = sanitizeTitle;
  window.utils = window.utils || {};
  window.utils.sanitizeTitle = sanitizeTitle;
  window.utils.debounce = debounce;
  window.utils.throttle = throttle;
  window.utils.extractDominantColor = extractDominantColor;
  window.utils.calculateBrightness = calculateBrightness;
  window.utils.formatDuration = formatDuration;
  window.utils.formatEpisodeNumber = formatEpisodeNumber;
  window.utils.formatScore = formatScore;
  window.utils.formatRelativeDate = formatRelativeDate;
  window.utils.createElement = createElement;
  window.utils.safeRemove = safeRemove;
  window.utils.trapFocus = trapFocus;
}

export {
  $$,
  $1,
  delegate,
  translate,
  QRCode,
  sanitizeTitle,
  debounce,
  throttle,
  extractDominantColor,
  calculateBrightness,
  formatDuration,
  formatEpisodeNumber,
  formatScore,
  formatRelativeDate,
  createElement,
  safeRemove,
  trapFocus,
};
