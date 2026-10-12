/**
 * Timing Utilities (Crispyroll)
 * Pure debounce and throttle helper functions.
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param {Function} func The function to debounce.
 * @param {number} [wait=300] The number of milliseconds to delay.
 * @param {boolean} [immediate=false] Whether to trigger the function on the leading edge.
 * @returns {Function & { cancel: Function }} The debounced function with cancel support.
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout = null;

  const debounced = function (...args) {
    const context = this;
    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    }, wait);

    if (callNow) {
      func.apply(context, args);
    }
  };

  debounced.cancel = function () {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes func at most once per every limit milliseconds.
 *
 * @param {Function} func The function to throttle.
 * @param {number} [limit=300] The number of milliseconds to throttle invocations to.
 * @returns {Function & { cancel: Function }} The throttled function with cancel support.
 */
export function throttle(func, limit = 300) {
  let inThrottle = false;
  let lastFunc = null;
  let lastRan = null;

  const throttled = function (...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastFunc) {
          lastFunc();
          lastFunc = null;
        }
      }, limit);
    } else {
      lastFunc = () => {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      };
    }
  };

  throttled.cancel = function () {
    inThrottle = false;
    lastFunc = null;
    lastRan = null;
  };

  return throttled;
}

// Global browser window attachment
if (typeof window !== "undefined") {
  window.utils = window.utils || {};
  window.utils.debounce = debounce;
  window.utils.throttle = throttle;
}
