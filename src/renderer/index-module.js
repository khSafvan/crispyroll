/**
 * Renderer ES Module Entry Point (Crispyroll)
 */

import { $$, $1, delegate } from "./core/dom.js";
import translate from "./core/translate.js";
import QRCode from "qrcode";

if (typeof window !== "undefined") {
  window.QRCode = QRCode;
}

export { $$, $1, delegate, translate, QRCode };
