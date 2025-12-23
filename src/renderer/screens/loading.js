/**
 * Loading Screen Controller (Flat & Minimal)
 */

window.loading = {
  id: "loading-screen",
  active: false,

  /**
   * Displays full-screen flat loading spinner overlay.
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
   * Initializes initial app launch splash/loading screen with brand logo and flat progress bar.
   */
  init: () => {
    const loadingElement = document.createElement("div");
    loadingElement.id = window.loading.id;

    loadingElement.innerHTML = `
    <div class="content">
      <div class="logo">
        <img src="assets/images/logo.png" alt="Crunchyroll">
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill"></div>
      </div>
    </div>`;
    document.body.appendChild(loadingElement);

    window.main.state = window.loading.id;
  },

  destroy: () => {
    const el = document.getElementById(window.loading.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Key down event handler for loading screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    const keyCode = event.keyCode;
    if (keyCode === window.tvKey?.IS_KEY_BACK(keyCode) || keyCode === window.tvKey?.KEY_EXIT) {
      window.exit.init(true);
    }
  },
};
