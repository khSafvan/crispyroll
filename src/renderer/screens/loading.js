/**
 * Animated Splash Screen & Loading Controller (SVG Stroke-Draw & Skeleton Handoff)
 */

window.loading = {
  id: "loading-screen",
  splashId: "splash-screen",
  active: false,
  startTime: 0,
  minDisplayTime: 700, // Minimal duration to ensure stroke-draw and fill animation readability

  /**
   * Displays in-app flat loading spinner overlay.
   */
  start: () => {
    if (!document.getElementById(window.loading.id)) {
      window.loading.active = true;
      const loadingElement = document.createElement("div");
      loadingElement.id = window.loading.id;
      loadingElement.className = "flat";
      loadingElement.innerHTML = `
      <div class="content flat">
        <div class="flat-spinner"></div>
      </div>`;
      document.body.appendChild(loadingElement);
    }
    window.loading.active = true;
  },

  /**
   * Dismisses loading spinner.
   */
  end: () => {
    const el = document.getElementById(window.loading.id);
    if (el) {
      document.body.removeChild(el);
    }
    window.loading.active = false;
  },

  /**
   * Initializes initial app launch animated splash overlay with crisp SVG stroke-draw & fill.
   */
  init: () => {
    // Destroy sidebar menu so NO sidebar is on splash screen
    if (window.menu && typeof window.menu.destroy === "function") {
      window.menu.destroy();
    }

    window.loading.startTime = performance.now();

    const splashElement = document.createElement("div");
    splashElement.id = window.loading.splashId;

    splashElement.innerHTML = `
    <div class="splash-logo-container">
      <svg class="splash-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path class="splash-logo-outer" d="M95.861,43.517c-7.059-44.746-67.18-53.838-87.55-13.491c-14.094,28.783,5.422,62.6,37.287,65.569 c-0.246,0.138,11.835,0.216,5.657-0.32c-2.384-0.191-5.999-0.995-8.814-1.959C6.051,80.491,6.181,30.216,42.617,17.612 c23.974-8.48,50.92,8.586,53.287,33.766c0.096,1.138,0.173,1.413,0.319,1.15C96.493,52.047,96.261,46.285,95.861,43.517z" />
        <path class="splash-logo-inner" d="M88.716,53.078c-8.249,8.928-23.788,3.74-25.163-8.21c-0.951-6.583,3.482-13.149,9.804-15.499 C26.439,7.838,3.291,82.524,55.402,89.897C76.571,91.661,93.966,72.754,90.013,52C89.961,51.915,89.377,52.4,88.716,53.078z" />
      </svg>
    </div>`;

    document.body.appendChild(splashElement);
    window.main.state = window.loading.splashId;
  },

  /**
   * Performs Phase 4 handoff: animates logo to nav rail and transitions smoothly into app view.
   * @param {Function} [onHandoffComplete]
   */
  destroy: (onHandoffComplete) => {
    const splashEl = document.getElementById(window.loading.splashId);
    const loadingEl = document.getElementById(window.loading.id);

    if (loadingEl) {
      document.body.removeChild(loadingEl);
    }

    if (!splashEl) {
      if (typeof onHandoffComplete === "function") {
        onHandoffComplete();
      }
      return;
    }

    const elapsed = performance.now() - (window.loading.startTime || 0);
    const remainingTime = Math.max(0, window.loading.minDisplayTime - elapsed);

    setTimeout(() => {
      splashEl.classList.add("handoff");
      splashEl.classList.add("fade-out");

      if (typeof onHandoffComplete === "function") {
        onHandoffComplete();
      }

      setTimeout(() => {
        if (splashEl.parentNode) {
          splashEl.parentNode.removeChild(splashEl);
        }
      }, 400);
    }, remainingTime);
  },

  /**
   * Key down event handler for splash / loading screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    const keyCode = event.keyCode;
    if (keyCode === window.tvKey?.IS_KEY_BACK(keyCode) || keyCode === window.tvKey?.KEY_EXIT) {
      window.exit.init(false);
    }
  },
};
