/**
 * Lightweight Vanilla DOM & Event Delegation Utilities
 */

/**
 * Returns all matching elements as a standard JavaScript Array.
 * @param {string} selector
 * @param {ParentNode} [parent=document]
 * @returns {Element[]}
 */
window.$$ = function (selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
};

/**
 * Returns the first matching element, or null.
 * @param {string} selector
 * @param {ParentNode} [parent=document]
 * @returns {Element|null}
 */
window.$1 = function (selector, parent = document) {
  return parent.querySelector(selector);
};

/**
 * Attaches a delegated event listener to a container matching a child selector.
 * Preserves the behavior of jQuery .on(event, selector, handler).
 * @param {Element|Document} container
 * @param {string} eventType
 * @param {string} selector
 * @param {Function} handler
 */
window.delegate = function (container, eventType, selector, handler) {
  if (!container) return;
  container.addEventListener(eventType, (event) => {
    const target = event.target.closest(selector);
    if (target && container.contains(target)) {
      handler.call(target, event, target);
    }
  });
};
