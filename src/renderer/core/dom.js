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

// Preserve backward-compatible window globals for unmigrated scripts
if (typeof window !== "undefined") {
  window.$$ = $$;
  window.$1 = $1;
  window.delegate = delegate;
}

export default { $$, $1, delegate };
