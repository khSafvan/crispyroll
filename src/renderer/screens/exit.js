/**
 * Exit & Logout Confirmation Dialog Screen
 */

window.exit = {
  id: "exit-screen",
  previous: null,
  selected: false,
  logout: false,

  /**
   * Initializes exit confirmation dialog.
   * @param {boolean|Function} [logout=false]
   */
  init: (logout = false) => {
    const exitElement = document.createElement("div");
    exitElement.id = window.exit.id;
    window.exit.logout = logout;

    let logoutMessage = window.translate.go(
      window.exit.logout ? "exit.message_logout" : "exit.message"
    );

    if (typeof logout === "function" || window.exit.logout) {
      logoutMessage = `${window.translate.go("menu.logout")}?`;
    }

    exitElement.innerHTML = `
      <div class="modal is-active">
        <div class="modal-background"></div>
        <div class="modal-card exit-dialog-card box">
          <section class="modal-card-body has-text-centered">
            <p class="exit-message has-text-weight-semibold mb-5">${logoutMessage}</p>
            <div class="buttons is-centered mt-4">
              <button class="button is-medium is-rounded is-primary exit-btn" id="exit-screen-yes">
                <span>${window.translate.go("exit.yes")}</span>
              </button>
              <button class="button is-medium is-rounded is-dark exit-btn" id="exit-screen-no">
                <span>${window.translate.go("exit.no")}</span>
              </button>
            </div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(exitElement);

    // Mouse click and hover handlers
    const yesBtn = document.getElementById(`${window.exit.id}-yes`);
    const noBtn = document.getElementById(`${window.exit.id}-no`);

    yesBtn?.addEventListener("mouseenter", () => window.exit.move(true));
    yesBtn?.addEventListener("click", () => window.exit.action(true));

    noBtn?.addEventListener("mouseenter", () => window.exit.move(false));
    noBtn?.addEventListener("click", () => window.exit.action(false));

    window.exit.previous = window.main.state;
    window.main.state = window.exit.id;
    window.exit.move(false);
  },

  destroy: () => {
    const el = document.getElementById(window.exit.id);
    if (el) {
      document.body.removeChild(el);
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
        window.exit.destroy();
        break;
      case window.tvKey?.KEY_LEFT:
        window.exit.move(true);
        break;
      case window.tvKey?.KEY_RIGHT:
        window.exit.move(false);
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
   * @param {boolean} selected - true for Yes, false for No
   */
  move: (selected) => {
    window.exit.selected = selected;
    const yesBtn = document.getElementById(`${window.exit.id}-yes`);
    const noBtn = document.getElementById(`${window.exit.id}-no`);
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
      if (typeof window.exit.logout === "function") {
        window.exit.destroy();
        window.exit.logout();
        return;
      }
      if (window.exit.logout) {
        window.session.clear();
      }
      if (typeof window.electronUtilsRender !== "undefined") {
        window.electronUtilsRender.exitApp();
      }
      if (typeof tizen !== "undefined") {
        tizen.application.getCurrentApplication().exit();
      }
    } else {
      window.exit.destroy();
    }
  },
};
