/**
 * DOM Utility Helpers (Crispyroll)
 * Pure helper functions for element creation, safe removal, and focus trapping.
 */

/**
 * Creates an HTML element with classes, attributes, and innerHTML.
 *
 * @param {string} tag
 * @param {string|string[]} [classes]
 * @param {Record<string, string>} [attributes]
 * @param {string} [innerHTML]
 * @returns {HTMLElement}
 */
export function createElement(tag, classes, attributes, innerHTML) {
  const el = document.createElement(tag);

  if (classes) {
    if (Array.isArray(classes)) {
      classes.filter(Boolean).forEach((c) => el.classList.add(c));
    } else if (typeof classes === "string" && classes.trim()) {
      classes
        .split(" ")
        .filter(Boolean)
        .forEach((c) => el.classList.add(c));
    }
  }

  if (attributes && typeof attributes === "object") {
    Object.entries(attributes).forEach(([key, val]) => {
      if (val != null) {
        el.setAttribute(key, String(val));
      }
    });
  }

  if (innerHTML != null) {
    el.innerHTML = innerHTML;
  }

  return el;
}

/**
 * Safely removes a DOM element by reference or ID.
 *
 * @param {HTMLElement|string} elementOrId
 * @returns {boolean} True if element was removed, false otherwise.
 */
export function safeRemove(elementOrId) {
  try {
    const el =
      typeof elementOrId === "string"
        ? document.getElementById(elementOrId)
        : elementOrId;
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
      return true;
    }
  } catch {
    // Ignore removal error
  }
  return false;
}

/**
 * Traps focus within a container element for accessibility and modal navigation.
 *
 * @param {HTMLElement} container
 * @param {KeyboardEvent} event
 */
export function trapFocus(container, event) {
  if (!container || event.key !== "Tab") return;

  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first) {
      last.focus();
      event.preventDefault();
    }
  } else {
    if (document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  }
}

// Global browser window attachment
if (typeof window !== "undefined") {
  window.utils = window.utils || {};
  window.utils.createElement = createElement;
  window.utils.safeRemove = safeRemove;
  window.utils.trapFocus = trapFocus;
}
