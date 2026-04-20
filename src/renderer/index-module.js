/**
 * Renderer ES Module Entry Point (Crispyroll)
 */

import { $$, $1, delegate } from "./core/dom.js";
import translate from "./core/translate.js";
import { sanitizeTitle } from "./utils/sanitizeTitle.js";
import QRCode from "qrcode";

if (typeof window !== "undefined") {
  window.QRCode = QRCode;
  window.sanitizeTitle = sanitizeTitle;
}

export { $$, $1, delegate, translate, QRCode, sanitizeTitle };
