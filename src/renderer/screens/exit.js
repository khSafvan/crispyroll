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

    if (typeof logout === "function") {
      logoutMessage = `${window.translate.go("menu.logout")}?`;
    }

    exitElement.innerHTML = `
      <div class="content">
        <div class="window">
          <div class="text">${logoutMessage}</div>
          <div class="buttons">
            <div class="button" id="exit-screen-yes">${window.translate.go("exit.yes")}</div>
            <div class="button" id="exit-screen-no">${window.translate.go("exit.no")}</div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(exitElement);

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
    if (yesBtn) yesBtn.className = `button ${selected ? "selected" : ""}`.trim();
    if (noBtn) noBtn.className = `button ${!selected ? "selected" : ""}`.trim();
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
