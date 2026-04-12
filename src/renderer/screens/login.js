/**
 * Split-Screen Login Screen Controller
 * (Onyx & Ember: Centered Login Card with Header Branding & Live Fast TV Auth)
 */

window.login = {
  id: "login-screen",
  selected: 0, // 0: username, 1: password, 2: toggle-pass, 3: submit, 4: forgot-pass

  /**
   * Initializes and renders split-screen login.
   */
  init: () => {
    const loginElement = document.createElement("div");
    loginElement.id = window.login.id;

    const forgotText =
      window.translate?.go("login.forgot_password") !== "login.forgot_password"
        ? window.translate.go("login.forgot_password")
        : "Forgot Password?";

    loginElement.innerHTML = `
    <div class="login-container">
      <!-- Header Branding (Logo & Title) positioned directly above the card -->
      <div class="login-header">
        <div class="login-logo-row">
          <svg class="login-logo-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path fill="var(--cr-accent)" d="M95.861,43.517c-7.059-44.746-67.18-53.838-87.55-13.491c-14.094,28.783,5.422,62.6,37.287,65.569 c-0.246,0.138,11.835,0.216,5.657-0.32c-2.384-0.191-5.999-0.995-8.814-1.959C6.051,80.491,6.181,30.216,42.617,17.612 c23.974-8.48,50.92,8.586,53.287,33.766c0.096,1.138,0.173,1.413,0.319,1.15C96.493,52.047,96.261,46.285,95.861,43.517z"/>
            <path fill="var(--cr-accent)" d="M88.716,53.078c-8.249,8.928-23.788,3.74-25.163-8.21c-0.951-6.583,3.482-13.149,9.804-15.499 C26.439,7.838,3.291,82.524,55.402,89.897C76.571,91.661,93.966,72.754,90.013,52C89.961,51.915,89.377,52.4,88.716,53.078z"/>
          </svg>
          <span class="login-brand-name">Crispyroll</span>
        </div>
        <p class="login-subtext">Sign in to sync your watchlist, history, and custom profiles</p>
      </div>

      <!-- Centered Main Split-Screen Card -->
      <div class="login-card">
        <!-- Left Column: Fast TV Login (Disabled Placeholder) -->
        <div class="login-col-left" id="login-tv-section">
          <h2 class="login-col-title">Fast TV Login</h2>
          <p class="login-col-subtitle">Scan with phone camera or go to <strong>crunchyroll.com/activate</strong></p>

          <div class="qr-box-container disabled-qr-container" id="qr-box-container">
            <div class="qr-placeholder-pattern"></div>
          </div>

          <div class="user-code-badge disabled-code-badge" id="user-code-display">----</div>
          <div class="tv-login-warning-text">Not working properly — please use manual login</div>
        </div>

        <!-- Right Column: Manual PC/Desktop Login -->
        <div class="login-col-right" id="login-manual-section">
          <h2 class="login-col-title">Manual Login</h2>

          <div class="input-group">
            <label class="input-label" for="login-username">Email Address or Username</label>
            <input class="auth-input login-focus-target" type="text" id="login-username" placeholder="you@example.com" autofocus>
          </div>

          <div class="input-group">
            <label class="input-label" for="login-password">Password</label>
            <div class="password-row">
              <input class="auth-input login-focus-target" type="password" id="login-password" placeholder="••••••••••••">
              <button class="btn-show-pass login-focus-target" id="btn-toggle-password" type="button" title="Show/Hide password">
                <span id="icon-toggle-password-wrapper">${window.icons?.get?.("radix:eyeOpen", { size: 16 }) || ""}</span>
              </button>
            </div>
          </div>

          <div class="login-error-alert" id="login-error-message"></div>

          <button class="btn-login login-focus-target" id="login-submit" type="button">
            <span id="login-btn-text">${window.translate.go("login.enter") || "Log In"}</span>
          </button>

          <button class="btn-forgot login-focus-target" id="login-forgot-password" type="button">
            <span>${forgotText}</span>
            ${window.icons?.get?.("arrowUpRight", { size: 14 }) || ""}
          </button>
        </div>
      </div>
    </div>`;

    document.body.appendChild(loginElement);
    window.main.state = window.login.id;

    // Focus targets wiring
    const targets = window.login.getFocusTargets();
    targets.forEach((el, idx) => {
      el.addEventListener("mouseenter", () => {
        window.login.move(idx);
      });
      el.addEventListener("focus", () => {
        window.login.move(idx);
      });
    });

    // Button interactions
    const togglePassBtn = document.getElementById("btn-toggle-password");
    const submitBtn = document.getElementById("login-submit");
    const forgotBtn = document.getElementById("login-forgot-password");
    const userInput = document.getElementById("login-username");
    const passInput = document.getElementById("login-password");

    togglePassBtn?.addEventListener("click", () => {
      window.login.togglePasswordVisibility();
    });

    submitBtn?.addEventListener("click", () => {
      window.login.action(3);
    });

    forgotBtn?.addEventListener("click", () => {
      window.login.openForgotPassword();
    });

    // Enter key handling on input fields
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
        window.login.action(3);
      }
    });

    window.login.move(0);
  },

  destroy: () => {
    const el = document.getElementById(window.login.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Retrieves focusable interactive elements in manual form.
   * @returns {HTMLElement[]}
   */
  getFocusTargets: () => {
    return Array.from(document.querySelectorAll("#login-manual-section .login-focus-target"));
  },

  /**
   * Toggles password input visibility between masked and plaintext.
   */
  togglePasswordVisibility: () => {
    const passInput = document.getElementById("login-password");
    const toggleIconWrapper = document.getElementById("icon-toggle-password-wrapper");
    if (passInput && toggleIconWrapper) {
      if (passInput.type === "password") {
        passInput.type = "text";
        toggleIconWrapper.innerHTML = window.icons?.get?.("radix:eyeClosed", { size: 16 }) || "";
      } else {
        passInput.type = "password";
        toggleIconWrapper.innerHTML = window.icons?.get?.("radix:eyeOpen", { size: 16 }) || "";
      }
    }
  },

  /**
   * Opens Crunchyroll's password reset page in the system browser.
   */
  openForgotPassword: () => {
    // Show toast notification with 3s duration and pop-in/pop-out
    const arrowSvg = window.icons?.get?.("arrowUpRight", { size: 16 }) || "";
    const content = `${arrowSvg}<span>Opening system browser...</span>`;

    if (window.toast?.show) {
      window.toast.show(content, 3000);
    } else {
      const existingToast = document.querySelector(".app-toast-notification, .login-toast-notification");
      if (existingToast) existingToast.remove();

      const toast = document.createElement("div");
      toast.className = "app-toast-notification";
      toast.innerHTML = content;
      document.body.appendChild(toast);

      const dismiss = () => {
        if (!toast.parentNode || toast.classList.contains("hide-toast")) return;
        toast.classList.add("hide-toast");
        setTimeout(() => {
          if (toast.parentNode) toast.remove();
        }, 160);
      };

      toast.addEventListener("click", dismiss);
      setTimeout(dismiss, 3000);
    }

    const resetUrl = "https://www.crunchyroll.com/forgot_password";
    if (window.electronUtilsRender?.openExternal) {
      window.electronUtilsRender.openExternal(resetUrl);
    } else if (window.api?.openExternal) {
      window.api.openExternal(resetUrl);
    } else {
      window.open(resetUrl, "_blank");
    }
  },

  /**
   * Updates spatial navigation focus across interactive targets.
   * @param {number} index
   */
  move: (index) => {
    const targets = window.login.getFocusTargets();
    if (!targets.length) return;

    window.login.selected = (index + targets.length) % targets.length;

    targets.forEach((el, idx) => {
      if (idx === window.login.selected) {
        el.classList.add("is-focused", "selected");
        if (el.tagName.toLowerCase() === "input") {
          el.focus();
        }
      } else {
        el.classList.remove("is-focused", "selected");
      }
    });
  },

  /**
   * Executes manual login authentication flow.
   * @param {number} index
   */
  action: (index) => {
    if (index === 2) {
      window.login.togglePasswordVisibility();
      return;
    }
    if (index === 4) {
      window.login.openForgotPassword();
      return;
    }

    const userInput = document.getElementById("login-username");
    const passInput = document.getElementById("login-password");
    const errorEl = document.getElementById("login-error-message");
    const submitBtn = document.getElementById("login-submit");
    const btnText = document.getElementById("login-btn-text");

    const username = userInput?.value?.trim() || "";
    const password = passInput?.value?.trim() || "";

    if (errorEl) errorEl.style.display = "none";

    if (!username || !password) {
      if (errorEl) {
        errorEl.textContent = window.translate.go("login.fill_fields") || "Please fill all fields";
        errorEl.style.display = "block";
      }
      return;
    }

    // Set loading state
    if (submitBtn) {
      submitBtn.classList.add("is-loading");
    }
    if (btnText) {
      btnText.innerHTML = `<span class="flat-spinner" style="width:18px;height:18px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Logging in...`;
    }

    window.session.start({
      username,
      password,
      success: () => {
        window.login.destroy();
        window.profilesScreen.init();
      },
      error: (err) => {
        if (submitBtn) submitBtn.classList.remove("is-loading");
        if (btnText) btnText.textContent = window.translate.go("login.enter") || "Log In";

        if (errorEl) {
          errorEl.textContent =
            err?.message ||
            window.translate.go("login.invalid_credentials") ||
            "Invalid credentials";
          errorEl.style.display = "block";
        }
      },
    });
  },

  /**
   * Key down event handler for login screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    const current = window.login.selected;

    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.exit.init();
        break;

      case window.tvKey?.KEY_UP:
        if (current === 2) {
          window.login.move(0); // From eye button to username
        } else {
          window.login.move(current - 1);
        }
        break;

      case window.tvKey?.KEY_DOWN:
        if (current === 1 || current === 2) {
          window.login.move(3); // To Submit button
        } else {
          window.login.move(current + 1);
        }
        break;

      case window.tvKey?.KEY_LEFT:
        if (current === 2) {
          window.login.move(1); // From eye button to password input
        }
        break;

      case window.tvKey?.KEY_RIGHT:
        if (current === 1) {
          window.login.move(2); // From password input to eye button
        }
        break;

      case 32:
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === "input" && (current === 0 || current === 1)) {
          if (current === 0) {
            document.getElementById("login-password")?.focus();
            window.login.move(1);
          } else {
            window.login.action(3);
          }
        } else {
          window.login.action(current);
        }
        break;
      }
    }
  },
};
