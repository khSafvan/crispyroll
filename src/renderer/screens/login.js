/**
 * Split-Screen Login Screen Controller
 * (Onyx & Ember: Centered Login Card with Header Branding & Live Fast TV Auth)
 */

window.login = {
  id: "login-screen",
  selected: 0, // 0: username, 1: password, 2: toggle-pass, 3: submit, 4: forgot-pass, 5: open-activate
  pollTimer: null,
  currentDeviceCode: null,

  /**
   * Initializes and renders split-screen login.
   */
  init: () => {
    // Destroy sidebar menu so NO sidebar is on login screen
    if (window.menu && typeof window.menu.destroy === "function") {
      window.menu.destroy();
    }

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
        <!-- Left Column: Fast TV Login -->
        <div class="login-col-left" id="login-tv-section">
          <h2 class="login-col-title">Fast TV Login</h2>
          <p class="login-col-subtitle">Scan with phone camera or go to <strong id="activate-link-text" style="cursor:pointer; text-decoration:underline;">crunchyroll.com/activate</strong></p>

          <div class="qr-box-container disabled-qr-container" id="qr-box-container">
            <div class="qr-placeholder-pattern" id="qr-placeholder"></div>
          </div>

          <div class="user-code-badge disabled-code-badge is-loading" id="user-code-display">••••••</div>
          <div class="qr-timer-text" id="qr-timer-display">Waiting for activation...</div>
          <div class="tv-login-warning-text" id="tv-login-warning-text" style="display:none;">Not working properly — please use manual login</div>
          <button class="btn-activate-browser login-focus-target" id="btn-open-activate" type="button">
            <span>Open crunchyroll.com/activate</span>
            ${window.icons?.get?.("arrowUpRight", { size: 13 }) || ""}
          </button>
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
      el.addEventListener("focus", () => {
        window.login.move(idx);
      });
      el.addEventListener("click", () => {
        window.login.move(idx);
      });
    });

    // Button interactions
    const togglePassBtn = document.getElementById("btn-toggle-password");
    const submitBtn = document.getElementById("login-submit");
    const forgotBtn = document.getElementById("login-forgot-password");
    const activateBtn = document.getElementById("btn-open-activate");
    const activateLink = document.getElementById("activate-link-text");
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

    activateBtn?.addEventListener("click", () => {
      window.login.openActivatePage();
    });

    activateLink?.addEventListener("click", () => {
      window.login.openActivatePage();
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
    window.login.startDeviceAuth();
  },

  /**
   * Cleans up screen and stops polling and countdown intervals.
   */
  destroy: () => {
    if (window.login.pollTimer) {
      clearInterval(window.login.pollTimer);
      window.login.pollTimer = null;
    }
    if (window.login.countdownTimer) {
      clearInterval(window.login.countdownTimer);
      window.login.countdownTimer = null;
    }
    const el = document.getElementById(window.login.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Retrieves focusable interactive elements across both columns.
   * @returns {HTMLElement[]}
   */
  getFocusTargets: () => {
    return [
      document.getElementById("login-username"),
      document.getElementById("login-password"),
      document.getElementById("btn-toggle-password"),
      document.getElementById("login-submit"),
      document.getElementById("login-forgot-password"),
      document.getElementById("btn-open-activate"),
    ].filter(Boolean);
  },

  /**
   * Requests device code from Crunchyroll and starts polling for user activation.
   */
  startDeviceAuth: () => {
    if (window.login.pollTimer) {
      clearInterval(window.login.pollTimer);
      window.login.pollTimer = null;
    }
    if (window.login.countdownTimer) {
      clearInterval(window.login.countdownTimer);
      window.login.countdownTimer = null;
    }

    const codeBadge = document.getElementById("user-code-display");
    const timerText = document.getElementById("qr-timer-display");
    const qrBox = document.getElementById("qr-box-container");
    const warningEl = document.getElementById("tv-login-warning-text");

    if (codeBadge) {
      codeBadge.classList.add("is-loading");
      codeBadge.textContent = "••••••";
    }
    if (timerText) {
      timerText.textContent = "Requesting activation code...";
    }

    window.service?.deviceCode?.({
      success: (data) => {
        if (!document.getElementById(window.login.id)) return;

        window.login.currentDeviceCode = data.device_code;
        const userCode = (data.user_code || "").toUpperCase();

        if (codeBadge) {
          codeBadge.classList.remove("is-loading", "disabled-code-badge");
          codeBadge.textContent = userCode;
        }

        const activateUrl = `https://crunchyroll.com/activate?code=${encodeURIComponent(userCode)}`;

        if (window.QRCode?.toDataURL) {
          window.QRCode.toDataURL(activateUrl, { width: 148, margin: 1 })
            .then((dataUrl) => {
              if (qrBox && document.getElementById(window.login.id)) {
                qrBox.classList.remove("disabled-qr-container");
                qrBox.innerHTML = `<img src="${dataUrl}" alt="Activation QR Code" width="148" height="148" />`;
              }
            })
            .catch(() => {});
        }

        if (warningEl) {
          warningEl.style.display = "none";
        }

        // Live countdown timer display
        let remainingSeconds = data.expires_in || 300;
        const updateTimerDisplay = () => {
          if (!timerText || !document.getElementById(window.login.id)) return;
          const mins = Math.floor(remainingSeconds / 60);
          const secs = String(remainingSeconds % 60).padStart(2, "0");
          timerText.textContent = `Expires in ${mins}:${secs} • Enter at crunchyroll.com/activate`;
        };
        updateTimerDisplay();

        window.login.countdownTimer = setInterval(() => {
          if (!document.getElementById(window.login.id)) {
            clearInterval(window.login.countdownTimer);
            window.login.countdownTimer = null;
            return;
          }
          remainingSeconds--;
          if (remainingSeconds <= 0) {
            clearInterval(window.login.countdownTimer);
            window.login.countdownTimer = null;
            if (window.login.pollTimer) {
              clearInterval(window.login.pollTimer);
              window.login.pollTimer = null;
            }
            if (timerText) {
              timerText.textContent = "Code expired. Generating new code...";
            }
            setTimeout(() => {
              if (document.getElementById(window.login.id)) {
                window.login.startDeviceAuth();
              }
            }, 1200);
            return;
          }
          updateTimerDisplay();
        }, 1000);

        // Normalize polling interval: Crunchyroll returns 500 (milliseconds)
        let pollInterval = 3000;
        if (typeof data.interval === "number") {
          pollInterval = data.interval >= 100 ? data.interval : data.interval * 1000;
        }
        // Poll every 2.5 - 4 seconds for responsive activation
        pollInterval = Math.max(2500, Math.min(pollInterval, 5000));

        let consecutiveErrors = 0;
        let isAuthenticating = false;

        window.login.pollTimer = setInterval(() => {
          if (!document.getElementById(window.login.id) || isAuthenticating) {
            return;
          }

          window.service?.deviceToken?.({
            data: { device_code: window.login.currentDeviceCode },
            pending: () => {
              consecutiveErrors = 0;
            },
            success: (tokenData) => {
              isAuthenticating = true;
              if (window.login.pollTimer) {
                clearInterval(window.login.pollTimer);
                window.login.pollTimer = null;
              }
              if (window.login.countdownTimer) {
                clearInterval(window.login.countdownTimer);
                window.login.countdownTimer = null;
              }

              if (qrBox) {
                qrBox.innerHTML = `
                  <div class="qr-success-overlay">
                    <div class="qr-success-icon">✓</div>
                    <div class="qr-success-text">Authorized!</div>
                  </div>`;
              }
              if (timerText) {
                timerText.textContent = "Authorized! Entering app...";
              }

              const navigateAfterLogin = () => {
                window.login.destroy();
                const profiles = window.session?.storage?.profiles || [];
                if (profiles.length > 1 && window.profilesScreen && typeof window.profilesScreen.init === "function") {
                  window.profilesScreen.init();
                } else if (window.home && typeof window.home.init === "function") {
                  window.home.init();
                } else if (window.profilesScreen && typeof window.profilesScreen.init === "function") {
                  window.profilesScreen.init();
                }
              };

              window.session?.startWithToken?.(tokenData, {
                success: () => {
                  navigateAfterLogin();
                },
                error: (err) => {
                  console.warn("[FastTVLogin] Account/profile fetch issue, continuing into app:", err);
                  navigateAfterLogin();
                },
              });
            },
            error: (err) => {
              consecutiveErrors++;
              // Abort and regenerate code ONLY on explicit token expiration/invalidation
              // or after 10 consecutive failures (>25s of persistent failure)
              const isExplicitFailure =
                err?.code === "auth.obtain_device_access_token.obtain_device_access_token_failure" ||
                (typeof err?.message === "string" && err.message.toLowerCase().includes("expired"));

              if (isExplicitFailure || consecutiveErrors >= 10) {
                if (window.login.pollTimer) {
                  clearInterval(window.login.pollTimer);
                  window.login.pollTimer = null;
                }
                if (window.login.countdownTimer) {
                  clearInterval(window.login.countdownTimer);
                  window.login.countdownTimer = null;
                }
                if (timerText) {
                  timerText.textContent = "Code expired. Generating new code...";
                }
                setTimeout(() => {
                  if (document.getElementById(window.login.id)) {
                    window.login.startDeviceAuth();
                  }
                }, 1500);
              }
            },
          });
        }, pollInterval);
      },
      error: () => {
        if (timerText) {
          timerText.textContent = "Fast TV Login offline";
        }
        if (warningEl) {
          warningEl.style.display = "block";
        }
      },
    });
  },

  /**
   * Opens the Crunchyroll activation page in the default system browser.
   */
  openActivatePage: () => {
    const userCode = document.getElementById("user-code-display")?.textContent?.trim() || "";
    const hasCode = userCode && userCode !== "••••••" && !userCode.includes("•");
    const url = hasCode
      ? `https://crunchyroll.com/activate?code=${encodeURIComponent(userCode)}`
      : "https://crunchyroll.com/activate";

    if (window.toast?.show) {
      window.toast.show("Opening crunchyroll.com/activate in browser...", 3000);
    }

    if (window.electronUtilsRender?.openExternal) {
      window.electronUtilsRender.openExternal(url);
    } else if (window.api?.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  },

  /**
   * Opens Crunchyroll's password reset page in the system browser.
   */
  openForgotPassword: () => {
    const arrowSvg = window.icons?.get?.("arrowUpRight", { size: 16 }) || "";
    const content = `${arrowSvg}<span>Opening system browser...</span>`;

    if (window.toast?.show) {
      window.toast.show(content, 3000);
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
        if (el?.tagName && el.tagName.toLowerCase() === "input") {
          el.focus();
        }
      } else {
        el.classList.remove("is-focused", "selected");
      }
    });
  },

  /**
   * Executes button action or authentication submission.
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
    if (index === 5) {
      window.login.openActivatePage();
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
        if (window.profilesScreen && typeof window.profilesScreen.init === "function") {
          window.profilesScreen.init();
        } else if (window.home && typeof window.home.init === "function") {
          window.home.init();
        }
      },
      error: () => {
        if (submitBtn) submitBtn.classList.remove("is-loading");
        if (btnText) btnText.textContent = window.translate.go("login.enter") || "Log In";

        if (errorEl) {
          errorEl.innerHTML = `
            <div style="font-weight:700;margin-bottom:3px;">Crunchyroll requires browser activation</div>
            <div style="font-size:12px;opacity:0.9;line-height:1.4;">
              Direct password login is blocked by Crunchyroll security. Please use the activation code on the left at <strong>crunchyroll.com/activate</strong>.
            </div>`;
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
        if (current === 1) {
          window.login.move(0);
        } else if (current === 2) {
          window.login.move(0);
        } else if (current === 3) {
          window.login.move(1);
        } else if (current === 4) {
          window.login.move(3);
        } else if (current === 5) {
          window.login.move(0);
        }
        break;

      case window.tvKey?.KEY_DOWN:
        if (current === 0) {
          window.login.move(1);
        } else if (current === 1 || current === 2) {
          window.login.move(3);
        } else if (current === 3) {
          window.login.move(4);
        } else if (current === 5) {
          window.login.move(0);
        }
        break;

      case window.tvKey?.KEY_LEFT:
        if (current === 2) {
          window.login.move(1);
        } else if (current === 0 || current === 1 || current === 3 || current === 4) {
          window.login.move(5); // Move to activate button on left column
        }
        break;

      case window.tvKey?.KEY_RIGHT:
        if (current === 5) {
          window.login.move(0); // From left column to username
        } else if (current === 1) {
          window.login.move(2); // From password to eye
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
