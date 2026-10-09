/**
 * Color Extractor Utility (Crispyroll)
 * Pure off-screen canvas dominant color and brightness extraction.
 */

/**
 * Extracts average RGB color and brightness from an image element.
 *
 * @param {HTMLImageElement} img The source image element.
 * @param {number} [sampleSize=10] Downsample grid dimension for performance.
 * @returns {{ r: number, g: number, b: number, brightness: number, isDark: boolean, hex: string }}
 */
export function extractDominantColor(img, sampleSize = 10) {
  const fallback = {
    r: 13,
    g: 13,
    b: 17,
    brightness: 14,
    isDark: true,
    hex: "#0d0d11",
  };

  if (!img || !img.naturalWidth || !img.naturalHeight) {
    return fallback;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fallback;

    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imageData.data;

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 128) {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
        count++;
      }
    }

    if (count === 0) return fallback;

    const r = Math.round(rSum / count);
    const g = Math.round(gSum / count);
    const b = Math.round(bSum / count);
    // Relative luminance formula (ITU-R BT.709)
    const brightness = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const isDark = brightness < 128;
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

    return { r, g, b, brightness, isDark, hex };
  } catch {
    return fallback;
  }
}

/**
 * Calculates brightness of an RGB color tuple.
 * @param {number} r Red 0-255
 * @param {number} g Green 0-255
 * @param {number} b Blue 0-255
 * @returns {number} Brightness value 0-255
 */
export function calculateBrightness(r, g, b) {
  return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

// Global browser window attachment
if (typeof window !== "undefined") {
  window.utils = window.utils || {};
  window.utils.extractDominantColor = extractDominantColor;
  window.utils.calculateBrightness = calculateBrightness;
}
