/**
 * Exit & Logout Confirmation Dialog Screen
 * High-priority overlay modal with robust stacking context, clear focus states, and clean session clearing.
 */

window.exit = {
  id: "exit-screen",
  previous: null,
  selected: false, // false: Cancel (No), true: Confirm (Yes)
  logout: false,

  /**
   * Initializes exit confirmation dialog.
   * @param {boolean|Function} [logout=false]
   */
  init: (logout = false) => {
    // Remove any existing instance first
    const existing = document.getElementById(window.exit.id);
    if (existing) {
      existing.remove();
    }

    const exitElement = document.createElement("div");
    exitElement.id = window.exit.id;
    window.exit.logout = logout;

    const isLogoutAction = typeof logout === "function" || Boolean(window.exit.logout);

    const messageText = isLogoutAction
      ? window.translate.go("exit.message_logout") || "Do you want to log out?"
      : window.translate.go("exit.message") || "Do you want to exit the application?";

    const yesLabel = isLogoutAction
      ? window.translate.go("menu.logout") || "Log Out"
      : window.translate.go("exit.yes") || "Exit";

    const noLabel = window.translate.go("exit.no") || "Cancel";

    exitElement.innerHTML = `
      <div class="exit-modal-backdrop"></div>
      <div class="exit-dialog-card" role="dialog" aria-modal="true" aria-labelledby="exit-modal-msg">
        <div class="exit-dialog-icon">
          <i class="fa-solid ${isLogoutAction ? "fa-arrow-right-from-bracket" : "fa-power-off"}"></i>
        </div>
        <p class="exit-message" id="exit-modal-msg">${messageText}</p>
        <div class="exit-buttons-row">
          <button class="exit-btn confirm" id="exit-screen-yes" type="button">
            <span>${yesLabel}</span>
          </button>
          <button class="exit-btn cancel selected is-focused" id="exit-screen-no" type="button">
            <span>${noLabel}</span>
          </button>
        </div>
      </div>`;

    document.body.appendChild(exitElement);

    // Mouse click and hover handlers
    const yesBtn = document.getElementById("exit-screen-yes");
    const noBtn = document.getElementById("exit-screen-no");

    yesBtn?.addEventListener("mouseenter", () => window.exit.move(true));
    yesBtn?.addEventListener("click", () => window.exit.action(true));

    noBtn?.addEventListener("mouseenter", () => window.exit.move(false));
    noBtn?.addEventListener("click", () => window.exit.action(false));

    // Backdrop click dismisses modal
    const backdrop = exitElement.querySelector(".exit-modal-backdrop");
    backdrop?.addEventListener("click", () => window.exit.action(false));

    window.exit.previous = window.main.state;
    window.main.state = window.exit.id;
    window.exit.move(false); // Default focus on Cancel (safe default)
  },

  destroy: () => {
    const el = document.getElementById(window.exit.id);
    if (el) {
      el.remove();
    }
    window.main.state = window.exit.previous;
  },

  /**
   * Key down handler for exit confirmation dialog.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case window.tvKey?.KEY_EXIT:
      case 27:
        window.exit.action(false);
        break;
      case window.tvKey?.KEY_LEFT:
        window.exit.move(true); // Yes / Log Out
        break;
      case window.tvKey?.KEY_RIGHT:
        window.exit.move(false); // No / Cancel
        break;
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        window.exit.action(window.exit.selected);
        break;
    }
  },

  /**
   * Toggles button selection (Yes / No).
   * @param {boolean} selected - true for Yes (Confirm), false for No (Cancel)
   */
  move: (selected) => {
    window.exit.selected = selected;
    const yesBtn = document.getElementById("exit-screen-yes");
    const noBtn = document.getElementById("exit-screen-no");

    if (yesBtn) {
      if (selected) {
        yesBtn.classList.add("selected", "is-focused");
      } else {
        yesBtn.classList.remove("selected", "is-focused");
      }
    }
    if (noBtn) {
      if (!selected) {
        noBtn.classList.add("selected", "is-focused");
      } else {
        noBtn.classList.remove("selected", "is-focused");
      }
    }
  },

  /**
   * Executes the confirmed action (exit or logout).
   * @param {boolean} selected
   */
  action: (selected) => {
    if (selected) {
      const logoutCallback = window.exit.logout;
      window.exit.destroy();

      if (typeof logoutCallback === "function") {
        logoutCallback();
        return;
      }

      if (logoutCallback) {
        window.session.clear();
        window.login.init();
        return;
      }

      if (typeof window.electronUtilsRender !== "undefined") {
        window.electronUtilsRender.exitApp();
      } else if (typeof tizen !== "undefined") {
        tizen.application.getCurrentApplication().exit();
      }
    } else {
      window.exit.destroy();
    }
  },
};
