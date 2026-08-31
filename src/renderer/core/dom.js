/**
 * Lightweight Vanilla DOM & Event Delegation Utilities
 */

/**
 * Returns all matching elements as a standard JavaScript Array.
 * @param {string} selector
 * @param {ParentNode} [parent=document]
 * @returns {Element[]}
 */
export function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Returns the first matching element, or null.
 * @param {string} selector
 * @param {ParentNode} [parent=document]
 * @returns {Element|null}
 */
export function $1(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Attaches a delegated event listener to a container matching a child selector.
 * Preserves the behavior of jQuery .on(event, selector, handler).
 * @param {Element|Document} container
 * @param {string} eventType
 * @param {string} selector
 * @param {Function} handler
 */
export function delegate(container, eventType, selector, handler) {
  if (!container) return;
  container.addEventListener(eventType, (event) => {
    const target = event.target.closest(selector);
    if (target && container.contains(target)) {
      handler.call(target, event, target);
    }
  });
}

/**
 * Displays a flat-design toast notification with spring pop-in and snap pop-out.
 * Standardized to exactly 3000ms duration.
 * @param {string} htmlContent - HTML string or message
 * @param {number} [duration=3000] - Duration in milliseconds (default: 3000)
 * @returns {HTMLElement|null}
 */
export function showToast(htmlContent, duration = 3000) {
  if (typeof document === "undefined" || !document.body) return null;

  // Clear any existing toasts immediately
  const existingToasts = document.querySelectorAll(".app-toast-notification, .login-toast-notification");
  existingToasts.forEach((t) => {
    if (t._toastTimer) clearTimeout(t._toastTimer);
    t.remove();
  });

  const toast = document.createElement("div");
  toast.className = "app-toast-notification";
  toast.innerHTML = htmlContent;
  document.body.appendChild(toast);

  const dismiss = () => {
    if (!toast.parentNode || toast.classList.contains("hide-toast")) return;
    if (toast._toastTimer) clearTimeout(toast._toastTimer);
    toast.classList.add("hide-toast");
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 160); // Clean DOM removal after 150ms snap pop-out completes
  };

  toast.addEventListener("click", dismiss);
  window.addEventListener("keydown", dismiss, { once: true });
  toast._toastTimer = setTimeout(dismiss, duration);

  return toast;
}

// Preserve backward-compatible window globals for unmigrated scripts
if (typeof window !== "undefined") {
  window.$$ = $$;
  window.$1 = $1;
  window.delegate = delegate;
  window.toast = {
    show: showToast,
    dismissAll: () => {
      if (typeof document === "undefined") return;
      document.querySelectorAll(".app-toast-notification, .login-toast-notification").forEach((t) => {
        if (t._toastTimer) clearTimeout(t._toastTimer);
        t.remove();
      });
    },
  };
}

export default { $$, $1, delegate, showToast };
