/**
 * Application Lifecycle & Root Key Event Handler
 */

window.app = {
  state: false,

  /**
   * Initializes error screen if main bundle fails to load.
   */
  initError: () => {
    window.app.state = false;
    const errorScreen = document.getElementById("error-screen");
    if (errorScreen) {
      errorScreen.style.display = "flex";
    }
  },

  /**
   * Global keydown handler. Delegates to main if active, or handles exit key.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    if (window.app.state && window.main?.keyDown) {
      window.main.keyDown(event);
    } else {
      const keyCode = event.keyCode;
      if (
        keyCode === window.tvKey?.KEY_BACK ||
        keyCode === window.tvKey?.KEY_EXIT ||
        keyCode === 27
      ) {
        if (typeof tizen !== "undefined") {
          tizen.application.getCurrentApplication().hide();
        }
      }
    }
  },
};

window.onload = () => {
  // Input modality detection
  window.addEventListener("mousemove", () => {
    if (!document.body.classList.contains("input-pointer")) {
      document.body.classList.add("input-pointer");
      document.body.classList.remove("input-controller");
    }
  }, { passive: true });

  window.addEventListener("keydown", () => {
    if (!document.body.classList.contains("input-controller")) {
      document.body.classList.add("input-controller");
      document.body.classList.remove("input-pointer");
    }
  }, { passive: true });

  if (typeof window.main !== "undefined" && typeof window.main.init === "function") {
    window.app.state = true;
    document.body.classList.add("input-controller");
    window.main.init();
  } else {
    window.app.initError();
  }
};

window.onunload = () => {
  if (window.app.state && typeof window.main?.destroy === "function") {
    window.main.destroy();
  }
};
