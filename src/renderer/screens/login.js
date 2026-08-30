/**
 * Login Screen Controller
 */

window.login = {
  id: "login-screen",
  selected: 0,

  /**
   * Initializes and renders login screen.
   */
  init: () => {
    const loginElement = document.createElement("div");
    loginElement.id = window.login.id;

    loginElement.innerHTML = `
    <div class="content">
      <div class="box">
        <div class="logo">
          <img src="assets/images/logo-big.png" alt="Crunchyroll">
        </div>
        <div class="form">
          <div class="input ${window.login.id}-option">
            <input type="text" tabindex="-1" placeholder="${window.translate.go("login.username")}">
          </div>
          <div class="input ${window.login.id}-option">
            <input type="password" tabindex="-1" placeholder="${window.translate.go(
              "login.password"
            )}">
          </div>
          <a class="button ${window.login.id}-option" translate>${window.translate.go(
      "login.enter"
    )}</a>
          <span id="login-error-message"></span>
        </div>
      </div>
    </div>`;
    document.body.appendChild(loginElement);

    window.login.move(window.login.selected);
    window.main.state = window.login.id;
  },

  destroy: () => {
    const el = document.getElementById(window.login.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Key down event handler for login screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.exit.init();
        break;
      case window.tvKey?.KEY_UP:
        window.login.move(window.login.selected === 0 ? 0 : window.login.selected - 1);
        break;
      case window.tvKey?.KEY_DOWN:
        window.login.move(window.login.selected === 2 ? 2 : window.login.selected + 1);
        break;
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        window.login.action(window.login.selected);
        break;
    }
  },

  /**
   * Moves focus to selected form option (username, password, submit button).
   * @param {number} selected
   */
  move: (selected) => {
    window.login.selected = selected;
    const options = document.getElementsByClassName(`${window.login.id}-option`);
    for (let i = 0; i < options.length; i++) {
      options[i].classList.remove("focus");
      if (i === selected) {
        options[i].classList.add("focus");
      }
    }
  },

  /**
   * Displays temporary error toast.
   * @param {string} message
   */
  error: (message) => {
    const element = $("#login-error-message");
    element.text(message);
    element.show();
    setTimeout(() => {
      element.hide();
    }, 3000);
  },

  /**
   * Executes focus action or form submission.
   * @param {number} selected
   */
  action: (selected) => {
    const options = document.getElementsByClassName(`${window.login.id}-option`);
    if (selected === 2) {
      const username = options[0]?.firstElementChild?.value || "";
      const password = options[1]?.firstElementChild?.value || "";

      if (!/\S+@\S+\.\S+/.test(username) || password.length < 5) {
        window.login.error(window.translate.go("login.error.invalid"));
      } else {
        window.login.destroy();
        window.loading.init();
        window.session.start(username, password, {
          success: () => {
            window.main.events.login();
          },
          error: () => {
            window.loading.destroy();
            window.login.init();
          },
        });
      }
    } else {
      window.keyboard.init(options[selected].firstElementChild);
    }
  },
};
