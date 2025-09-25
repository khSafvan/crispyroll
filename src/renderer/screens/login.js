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
            <input type="text" id="login-username" placeholder="${window.translate.go("login.username")}" autofocus>
          </div>
          <div class="input ${window.login.id}-option">
            <input type="password" id="login-password" placeholder="${window.translate.go("login.password")}">
          </div>
          <a class="button ${window.login.id}-option" id="login-submit" translate>${window.translate.go("login.enter")}</a>
          <span id="login-error-message"></span>
        </div>
      </div>
    </div>`;
    document.body.appendChild(loginElement);

    // Mouse click and hover handlers
    const options = document.getElementsByClassName(`${window.login.id}-option`);
    for (let i = 0; i < options.length; i++) {
      options[i].addEventListener("mouseenter", () => {
        window.login.move(i);
      });
      options[i].addEventListener("click", () => {
        window.login.move(i);
        if (i === 2) {
          window.login.action(2);
        } else {
          options[i].querySelector("input")?.focus();
        }
      });
    }

    // Direct physical input enter key handling
    const userInput = document.getElementById("login-username");
    const passInput = document.getElementById("login-password");

    userInput?.addEventListener("keydown", (e) => {
      if (e.keyCode === 13) {
        e.stopPropagation();
        passInput?.focus();
        window.login.move(1);
      }
    });

    passInput?.addEventListener("keydown", (e) => {
      if (e.keyCode === 13) {
        e.stopPropagation();
        window.login.move(2);
        window.login.action(2);
      }
    });

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
      case window.tvKey?.KEY_TAB:
      case window.tvKey?.KEY_DOWN:
        window.login.move(window.login.selected === 2 ? 0 : window.login.selected + 1);
        break;
      case window.tvKey?.KEY_UP:
        window.login.move(window.login.selected === 0 ? 2 : window.login.selected - 1);
        break;
      case 32: // Space (only when on submit button)
        if (window.login.selected === 2) {
          window.login.action(2);
        }
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
        if (i < 2) {
          options[i].querySelector("input")?.focus();
        } else {
          document.activeElement?.blur();
        }
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
      options[selected]?.querySelector("input")?.focus();
    }
  },
};
