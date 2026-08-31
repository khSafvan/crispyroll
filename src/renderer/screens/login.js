/**
 * Login Screen Controller (Responsive, Dual Focus & Forgot Password Link)
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

    const forgotText =
      window.translate?.go("login.forgot_password") !== "login.forgot_password"
        ? window.translate.go("login.forgot_password")
        : "Forgot Password?";

    loginElement.innerHTML = `
    <div class="content">
      <div class="card login-card box">
        <div class="card-content">
          <div class="logo">
            <img src="assets/images/logo-big.png" alt="Crunchyroll">
          </div>
          <div class="form">
            <div class="field">
              <div class="control has-icons-left input-wrapper ${window.login.id}-option">
                <input class="input is-medium is-rounded" type="text" id="login-username" placeholder="${window.translate.go("login.username")}" autofocus>
                <span class="icon is-left">
                  <i class="fa-solid fa-envelope"></i>
                </span>
              </div>
            </div>
            <div class="field">
              <div class="control has-icons-left input-wrapper ${window.login.id}-option">
                <input class="input is-medium is-rounded" type="password" id="login-password" placeholder="${window.translate.go("login.password")}">
                <span class="icon is-left">
                  <i class="fa-solid fa-lock"></i>
                </span>
              </div>
            </div>
            <div class="field mt-4">
              <div class="control">
                <a class="button is-primary is-fullwidth is-medium is-rounded ${window.login.id}-option" id="login-submit">
                  <span>${window.translate.go("login.enter")}</span>
                </a>
              </div>
            </div>
            <div class="forgot-password-container">
              <a class="forgot-password-link ${window.login.id}-option" id="login-forgot-password">
                <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i> ${forgotText}
              </a>
            </div>
            <div class="notification is-danger is-light login-alert" id="login-error-message"></div>
          </div>
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
        if (i === 2 || i === 3) {
          window.login.action(i);
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
    const totalOptions = 4;
    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.exit.init();
        break;
      case window.tvKey?.KEY_TAB:
      case window.tvKey?.KEY_DOWN:
        window.login.move((window.login.selected + 1) % totalOptions);
        break;
      case window.tvKey?.KEY_UP:
        window.login.move((window.login.selected - 1 + totalOptions) % totalOptions);
        break;
      case 32: // Space (when on submit or forgot password)
        if (window.login.selected >= 2) {
          window.login.action(window.login.selected);
        }
        break;
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        window.login.action(window.login.selected);
        break;
    }
  },

  /**
   * Moves focus to selected form option (0: username, 1: password, 2: submit, 3: forgot password).
   * @param {number} selected
   */
  move: (selected) => {
    window.login.selected = selected;
    const options = document.getElementsByClassName(`${window.login.id}-option`);
    for (let i = 0; i < options.length; i++) {
      options[i].classList.remove("focus", "selected", "is-focused");
      if (i === selected) {
        options[i].classList.add("focus", "selected", "is-focused");
        if (i < 2) {
          options[i].querySelector("input")?.focus();
        } else {
          document.activeElement?.blur();
        }
      }
    }
  },

  /**
   * Displays temporary error/info toast.
   * @param {string} message
   * @param {boolean} [isSuccess=false]
   */
  error: (message, isSuccess = false) => {
    const element = document.getElementById("login-error-message");
    if (element) {
      element.textContent = message;
      if (isSuccess) {
        element.className = "notification is-info is-light login-alert";
      } else {
        element.className = "notification is-danger is-light login-alert";
      }
      element.style.display = "block";
      setTimeout(() => {
        element.style.display = "none";
      }, 4000);
    }
  },

  /**
   * Executes focus action, form submission, or forgot password trigger.
   * @param {number} selected
   */
  action: (selected) => {
    const options = document.getElementsByClassName(`${window.login.id}-option`);
    if (selected === 2) {
      const username = options[0]?.querySelector("input")?.value || "";
      const password = options[1]?.querySelector("input")?.value || "";
      const trimmedUsername = username.trim();
      const isEmail = trimmedUsername.includes("@");
      const isValidIdentifier = isEmail
        ? /\S+@\S+\.\S+/.test(trimmedUsername)
        : trimmedUsername.length >= 3;

      if (!isValidIdentifier || password.length < 5) {
        window.login.error(window.translate.go("login.error.invalid"));
      } else {
        window.login.destroy();
        window.loading.init();
        window.session.start(trimmedUsername, password, {
          success: () => {
            window.main.events.login();
          },
          error: () => {
            window.loading.destroy();
            window.login.init();
          },
        });
      }
    } else if (selected === 3) {
      const url = "https://www.crunchyroll.com/forgot_password";
      if (window.electronUtilsRender?.openExternal) {
        window.electronUtilsRender.openExternal(url);
      } else {
        window.open(url, "_blank");
      }
      window.login.error("Opening password reset in browser...", true);
    } else {
      options[selected]?.querySelector("input")?.focus();
    }
  },
};
