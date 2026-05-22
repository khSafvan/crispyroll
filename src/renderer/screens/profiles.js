/**
 * Profiles Selection Screen Controller, Full-Screen PIN Entry & Create Profile Screen
 * (Onyx & Ember: Active-Slot PIN Indicator, 150ms Debounce, Hold-To-Clear, Lockout & Real API Validation)
 */

window.profilesScreen = {
  id: "profiles-screen",
  pinScreen: {
    active: false,
    profile: null,
    currentPin: "",
    selectedIndex: 4, // default focus on '5'
    showPin: false,
    lastInputTime: 0,
    holdTimer: null,
    isHoldTriggered: false,
    failedAttempts: 0,
    lockoutUntil: 0,
    lockoutInterval: null,
  },
  // Backward compatibility alias for unit tests
  get pinModal() {
    return window.profilesScreen.pinScreen;
  },

  /**
   * Initializes profiles screen.
   */
  init: () => {
    // If profiles not yet in session storage, fetch them and populate dynamically
    if (!window.session?.storage?.profiles || window.session.storage.profiles.length === 0) {
      window.session?.load_account?.({
        success: () => {
          const menuEl = document.getElementById("settings-menu");
          if (menuEl) {
            menuEl.innerHTML = window.profilesScreen.getOptions();
            const first = menuEl.querySelector("li");
            if (first && !menuEl.querySelector("li.selected")) {
              first.classList.add("selected", "is-focused");
            }
          }
        },
        error: () => {},
      });
    }

    const profilesElement = document.createElement("div");
    profilesElement.id = window.profilesScreen.id;

    profilesElement.innerHTML = `
    <div class="content">
      <div class="container">
        <h1 class="profile-select-title">${window.translate.go("profiles.label") || "Who's Watching?"}</h1>
        <ul class="options profile-grid" id="settings-menu">${window.profilesScreen.getOptions()}</ul>
      </div>
    </div>`;

    window.menu.destroy();
    document.body.appendChild(profilesElement);
    window.main.state = window.profilesScreen.id;

    // Mouse click bindings for profiles
    const menuEl = document.getElementById("settings-menu");
    if (menuEl) {
      menuEl.addEventListener("click", (e) => {
        if (window.profilesScreen.pinScreen.active) {
          return;
        }
        const item = e.target.closest("li");
        if (item && menuEl.contains(item)) {
          const profileId = item.id;
          if (profileId) {
            window.profilesScreen.selectProfile(profileId);
          }
        }
      });
    }
  },

  destroy: () => {
    window.profilesScreen.closePinScreen();
    const el = document.getElementById(window.profilesScreen.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Generates profile list HTML markup with circular avatar cards and lock badge.
   * @returns {string}
   */
  getOptions: () => {
    const profiles = window.session?.storage?.profiles || [];
    const hasExplicitSelection = profiles.some((p) => p.is_selected);

    const profileItems = profiles
      .map((profile, idx) => {
        const { is_selected, profile_name, username, profile_id, id } = profile;
        const targetId = profile_id || id || "";
        const isLocked = Boolean(
          profile.profile_flags?.is_pin_protected ||
          profile.is_pin_protected ||
          profile.is_locked ||
          profile.has_pin ||
          profile.is_profile_locked ||
          profile.is_pin_required ||
          profile.pin ||
          profile.pin_status === "locked" ||
          profile.pin_status === "enabled"
        );
        const avatar = profile.avatar || "0001-cr-white-orange.png";
        const rawName = (profile_name || username || "").trim();
        const displayName = rawName
          ? rawName
              .toLowerCase()
              .split(/\s+/)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")
          : "Profile";
        const isFocused = is_selected || (!hasExplicitSelection && idx === 0);
        const lockIcon = window.icons?.get?.("lockSimple", { weight: "fill", size: 14 }) || "";

        return `<li class="profile-card-wrapper ${isFocused ? "selected active is-focused" : ""}" id="${targetId}" data-locked="${isLocked ? "true" : "false"}">
        <div class="profile-card">
          <img src="https://static.crunchyroll.com/assets/avatar/170x170/${avatar}" alt="${displayName}"/>
          ${
            isLocked ? `<div class="profile-lock-badge">${lockIcon}</div>` : ""
          }
        </div>
        <span class="profile-name">${displayName}</span>
      </li>`;
      })
      .join("");

    // If account has fewer than 5 profiles, show circular "Add Profile" card
    let addProfileItem = "";
    if (profiles.length < 5) {
      const plusIcon = window.icons?.get?.("plus", { weight: "regular", size: 24 }) || "";
      addProfileItem = `
      <li class="profile-card-wrapper add-profile-card" id="btn-add-profile">
        <div class="profile-card">
          <div class="add-profile-icon">${plusIcon}</div>
        </div>
        <span class="profile-name">${window.translate.go("profiles.add_profile") || "Add Profile"}</span>
      </li>`;
    }

    return profileItems + addProfileItem;
  },

  /**
   * Handles selecting a profile or showing Add Profile redirect toast.
   * @param {string} profileId
   */
  selectProfile: (profileId) => {
    if (profileId === "btn-add-profile") {
      window.profilesScreen.showAddProfileDisabledToast();
      return;
    }

    const profiles = window.session?.storage?.profiles || [];
    const profile = profiles.find((p) => (p.profile_id || p.id) === profileId);

    const cardEl = document.getElementById(profileId);
    const isDomLocked = cardEl?.getAttribute("data-locked") === "true";
    const isProfileLocked = Boolean(
      profile?.has_pin ||
      profile?.is_profile_locked ||
      profile?.is_pin_required ||
      profile?.is_pin_protected ||
      profile?.pin ||
      isDomLocked
    );

    if (isProfileLocked) {
      window.profilesScreen.openPinScreen(
        profile || {
          profile_id: profileId,
          profile_name: cardEl?.querySelector(".profile-name")?.textContent || "PROFILE",
          avatar: "0001-cr-white-orange.png",
        }
      );
      return;
    }

    window.profilesScreen.executeSwitch(profileId);
  },

  /**
   * Displays an unobtrusive toast informing the user to use the official website/app to create profiles.
   */
  showAddProfileDisabledToast: () => {
    const infoSvg = window.icons?.get?.("info", { size: 16 }) || "";
    const content = `${infoSvg}<span>Profile creation isn't available here — please use the official Crunchyroll app or crunchyroll.com to manage your profiles.</span>`;

    if (window.toast?.show) {
      window.toast.show(content, 3000);
    } else {
      const existingToast = document.querySelector(".app-toast-notification");
      if (existingToast) existingToast.remove();

      const toast = document.createElement("div");
      toast.className = "app-toast-notification";
      toast.innerHTML = content;
      document.body.appendChild(toast);

      const dismissToast = () => {
        if (!toast.parentNode || toast.classList.contains("hide-toast")) return;
        toast.classList.add("hide-toast");
        setTimeout(() => {
          if (toast.parentNode) toast.remove();
        }, 160);
      };

      toast.addEventListener("click", dismissToast);
      window.addEventListener("keydown", dismissToast, { once: true });
      setTimeout(dismissToast, 3000);
    }
  },

  /**
   * Backward compatibility alias for tests.
   * @param {object} profile
   */
  openPinModal: (profile) => {
    window.profilesScreen.openPinScreen(profile);
  },
  closePinModal: () => {
    window.profilesScreen.closePinScreen();
  },

  /**
   * Executes active profile switch.
   * @param {string} profileId
   * @param {string} [pin]
   */
  executeSwitch: (profileId, pin) => {
    window.loading.start();
    window.session.switch_profile(
      {
        success: () => {
          window.loading.end();
          window.profilesScreen.destroy();
          window.menu.init();
          window.home.restart();
        },
        error: (err) => {
          window.loading.end();
          const errorEl = document.getElementById("pin-error-message");
          if (errorEl) {
            errorEl.textContent = err?.message || window.translate.go("profiles.pin_error");
          }
        },
      },
      profileId,
      pin
    );
  },

  /**
   * Toggles PIN visibility between masked bullets and revealed numeric digits.
   */
  togglePinVisibility: () => {
    window.profilesScreen.pinScreen.showPin = !window.profilesScreen.pinScreen.showPin;
    const isShowing = window.profilesScreen.pinScreen.showPin;
    const toggleIconWrapper = document.getElementById("icon-toggle-pin-wrapper");
    const toggleText = document.getElementById("text-toggle-pin");

    if (toggleIconWrapper) {
      toggleIconWrapper.innerHTML = window.icons?.get?.(isShowing ? "radix:eyeClosed" : "radix:eyeOpen", {
        size: 16,
      }) || "";
    }
    if (toggleText) {
      toggleText.textContent = isShowing ? "Hide PIN" : "Show PIN";
    }
    window.profilesScreen.updatePinDots();
  },

  /**
   * Opens dedicated Full-Screen PIN Entry view with 64x64px Active Slot paradigm.
   * @param {object} profile
   */
  openPinScreen: (profile) => {
    window.profilesScreen.pinScreen.active = true;
    window.profilesScreen.pinScreen.profile = profile;
    window.profilesScreen.pinScreen.currentPin = "";
    window.profilesScreen.pinScreen.selectedIndex = 4; // default focus on '5'
    window.profilesScreen.pinScreen.showPin = false;
    window.profilesScreen.pinScreen.lastInputTime = 0;
    window.profilesScreen.pinScreen.failedAttempts = 0;
    window.profilesScreen.pinScreen.lockoutUntil = 0;
    if (window.profilesScreen.pinScreen.lockoutInterval) {
      clearInterval(window.profilesScreen.pinScreen.lockoutInterval);
      window.profilesScreen.pinScreen.lockoutInterval = null;
    }

    // Hide profile selector container
    const baseScreen = document.getElementById(window.profilesScreen.id);
    if (baseScreen) baseScreen.style.display = "none";

    const pinView = document.createElement("div");
    pinView.id = "pin-screen";
    pinView.className = "pin-fullscreen-view";

    const displayName = (profile.profile_name || profile.username || "PROFILE").trim();
    const avatar = profile.avatar || "0001-cr-white-orange.png";

    pinView.innerHTML = `
    <div class="pin-screen-container" id="pin-screen-container">
      <div class="pin-profile-header">
        <img class="pin-avatar-circle" src="https://static.crunchyroll.com/assets/avatar/170x170/${avatar}" alt="${displayName}"/>
        <h2 class="pin-welcome-text">Enter Profile PIN</h2>
        <p class="pin-profile-subtext">Access restricted for <strong>${displayName}</strong></p>
      </div>

      <div class="pin-display-wrapper">
        <!-- 4 Distinct 64x64px Active Slot Boxes -->
        <div class="pin-slots-row" id="pin-dots">
          <div class="pin-slot is-active" id="dot-0"><span class="pin-slot-char"></span><span class="pin-slot-cursor"></span></div>
          <div class="pin-slot" id="dot-1"><span class="pin-slot-char"></span><span class="pin-slot-cursor"></span></div>
          <div class="pin-slot" id="dot-2"><span class="pin-slot-char"></span><span class="pin-slot-cursor"></span></div>
          <div class="pin-slot" id="dot-3"><span class="pin-slot-char"></span><span class="pin-slot-cursor"></span></div>
        </div>
        <button class="pin-toggle-btn" id="btn-toggle-pin-visibility" type="button" title="Toggle PIN Visibility">
          <span id="icon-toggle-pin-wrapper">${window.icons?.get?.("radix:eyeOpen", { size: 16 }) || ""}</span>
          <span id="text-toggle-pin">Show PIN</span>
        </button>
      </div>

      <div class="pin-error-text" id="pin-error-message"></div>

      <!-- 3x4 Numpad Grid -->
      <div class="numpad-grid" id="pin-keypad">
        <button class="numpad-btn" data-key="1">1</button>
        <button class="numpad-btn" data-key="2">2</button>
        <button class="numpad-btn" data-key="3">3</button>
        <button class="numpad-btn" data-key="4">4</button>
        <button class="numpad-btn" data-key="5">5</button>
        <button class="numpad-btn" data-key="6">6</button>
        <button class="numpad-btn" data-key="7">7</button>
        <button class="numpad-btn" data-key="8">8</button>
        <button class="numpad-btn" data-key="9">9</button>
        <button class="numpad-btn" data-action="clear" title="Hold to Clear Entire PIN">CLR</button>
        <button class="numpad-btn" data-key="0">0</button>
        <button class="numpad-btn" data-action="backspace" title="Delete (Hold to Clear)">${window.icons?.get?.("backspace", { weight: "regular", size: 20 }) || ""}</button>
      </div>

      <div class="pin-footer-actions">
        <button class="pin-cancel-btn" id="btn-pin-cancel" type="button">
          ${window.icons?.get?.("radix:arrowLeft", { size: 16 }) || ""}
          <span>${window.translate.go("profiles.cancel") || "Back to Profiles"}</span>
        </button>
      </div>
    </div>`;

    document.body.appendChild(pinView);
    window.profilesScreen.setKeypadFocus(4);
    window.profilesScreen.updatePinDots();

    // Mouse and Pointer Handlers on Numpad Buttons with Hold-to-Clear Support
    const btns = pinView.querySelectorAll(".numpad-btn");
    btns.forEach((btn) => {
      const key = btn.getAttribute("data-key");
      const action = btn.getAttribute("data-action");

      if (key !== null) {
        btn.addEventListener("click", () => {
          window.profilesScreen.handlePinInput(key);
        });
      } else if (action === "backspace" || action === "clear") {
        // Hold-to-clear detection (600ms hold -> sweep clear, short tap -> single backspace)
        btn.addEventListener("pointerdown", () => {
          window.profilesScreen.pinScreen.isHoldTriggered = false;
          if (window.profilesScreen.pinScreen.holdTimer) {
            clearTimeout(window.profilesScreen.pinScreen.holdTimer);
          }
          window.profilesScreen.pinScreen.holdTimer = setTimeout(() => {
            window.profilesScreen.pinScreen.isHoldTriggered = true;
            window.profilesScreen.executeSweepClear();
          }, 600);
        });

        const cancelHold = (isClick) => {
          if (window.profilesScreen.pinScreen.holdTimer) {
            clearTimeout(window.profilesScreen.pinScreen.holdTimer);
            window.profilesScreen.pinScreen.holdTimer = null;
          }
          if (isClick && !window.profilesScreen.pinScreen.isHoldTriggered) {
            if (action === "backspace") {
              window.profilesScreen.handlePinBackspace();
            } else {
              window.profilesScreen.executeSweepClear();
            }
          }
        };

        btn.addEventListener("pointerup", () => cancelHold(true));
        btn.addEventListener("pointerleave", () => cancelHold(false));
        btn.addEventListener("pointercancel", () => cancelHold(false));
      }
    });

    const toggleBtn = document.getElementById("btn-toggle-pin-visibility");
    toggleBtn?.addEventListener("click", () => {
      window.profilesScreen.togglePinVisibility();
    });

    const cancelBtn = document.getElementById("btn-pin-cancel");
    cancelBtn?.addEventListener("click", () => {
      window.profilesScreen.closePinScreen();
    });
    cancelBtn?.addEventListener("click", () => {
      window.profilesScreen.closePinScreen();
    });
  },

  /**
   * Sets focused button in PIN numpad grid or footer actions.
   * @param {number} index
   */
  setKeypadFocus: (index) => {
    window.profilesScreen.pinScreen.selectedIndex = index;
    const numpadBtns = Array.from(document.querySelectorAll("#pin-keypad .numpad-btn"));
    const toggleBtn = document.getElementById("btn-toggle-pin-visibility");
    const cancelBtn = document.getElementById("btn-pin-cancel");

    const allTargets = [...numpadBtns, toggleBtn, cancelBtn].filter(Boolean);

    allTargets.forEach((btn, idx) => {
      if (idx === index) {
        btn.classList.add("selected", "is-focused");
      } else {
        btn.classList.remove("selected", "is-focused");
      }
    });
  },

  /**
   * Briefly flashes corresponding on-screen numpad key on physical keyboard input.
   * @param {string} digit
   */
  flashNumpadButton: (digit) => {
    const btn = document.querySelector(`#pin-keypad button[data-key="${digit}"]`);
    if (btn) {
      btn.classList.add("is-pressed");
      setTimeout(() => btn.classList.remove("is-pressed"), 150);
    }
  },

  /**
   * Appends digit to PIN with 150ms debounce and triggers auto-verification on 4 digits.
   * @param {string} digit
   */
  handlePinInput: (digit) => {
    // Check lockout state
    if (Date.now() < window.profilesScreen.pinScreen.lockoutUntil) return;

    // 150ms unified debounce
    const now = Date.now();
    if (now - window.profilesScreen.pinScreen.lastInputTime < 150) return;
    window.profilesScreen.pinScreen.lastInputTime = now;

    window.profilesScreen.flashNumpadButton(digit);

    if (window.profilesScreen.pinScreen.currentPin.length < 4) {
      const slotIdx = window.profilesScreen.pinScreen.currentPin.length;
      window.profilesScreen.pinScreen.currentPin += digit;
      window.profilesScreen.updatePinDots(slotIdx, digit);

      if (window.profilesScreen.pinScreen.currentPin.length === 4) {
        window.profilesScreen.verifyPin();
      }
    }
  },

  /**
   * Removes last digit from PIN with 150ms debounce.
   */
  handlePinBackspace: () => {
    if (Date.now() < window.profilesScreen.pinScreen.lockoutUntil) return;

    const now = Date.now();
    if (now - window.profilesScreen.pinScreen.lastInputTime < 150) return;
    window.profilesScreen.pinScreen.lastInputTime = now;

    if (window.profilesScreen.pinScreen.currentPin.length > 0) {
      window.profilesScreen.pinScreen.currentPin = window.profilesScreen.pinScreen.currentPin.slice(
        0,
        -1
      );
      window.profilesScreen.updatePinDots();
      const errEl = document.getElementById("pin-error-message");
      if (errEl && !window.profilesScreen.pinScreen.lockoutUntil) {
        errEl.textContent = "";
      }
    }
  },

  /**
   * Executes hold-to-clear sweep animation across all slots and resets PIN.
   */
  executeSweepClear: () => {
    const slots = document.querySelectorAll(".pin-slot");
    slots.forEach((s, idx) => {
      setTimeout(() => {
        s.classList.add("is-sweeping");
        setTimeout(() => s.classList.remove("is-sweeping"), 300);
      }, idx * 60);
    });

    window.profilesScreen.pinScreen.currentPin = "";
    setTimeout(() => {
      window.profilesScreen.updatePinDots();
    }, 240);
  },

  /**
   * Updates 64x64px slots with active-slot highlight, blinking cursor, and brief digit pop.
   * @param {number} [justEnteredIdx]
   * @param {string} [justEnteredDigit]
   */
  updatePinDots: (justEnteredIdx, justEnteredDigit) => {
    const pin = window.profilesScreen.pinScreen.currentPin;
    const isShowing = window.profilesScreen.pinScreen.showPin;

    for (let i = 0; i < 4; i++) {
      const slot = document.getElementById(`dot-${i}`);
      if (!slot) continue;

      const charSpan = slot.querySelector(".pin-slot-char") || slot;
      const cursorSpan = slot.querySelector(".pin-slot-cursor");

      if (i < pin.length) {
        // Filled state
        slot.classList.add("is-filled");
        slot.classList.remove("is-active");
        if (cursorSpan) cursorSpan.style.display = "none";

        if (isShowing) {
          charSpan.textContent = pin[i];
        } else if (i === justEnteredIdx && justEnteredDigit) {
          // Brief 200ms digit flash before collapsing to bullet
          charSpan.textContent = justEnteredDigit;
          slot.classList.add("is-popping");
          setTimeout(() => {
            slot.classList.remove("is-popping");
            if (
              !window.profilesScreen.pinScreen.showPin &&
              i < window.profilesScreen.pinScreen.currentPin.length
            ) {
              charSpan.textContent = "•";
            }
          }, 200);
        } else {
          charSpan.textContent = "•";
        }
      } else if (i === pin.length) {
        // Active next slot
        slot.classList.add("is-active");
        slot.classList.remove("is-filled", "is-popping");
        charSpan.textContent = "";
        if (cursorSpan) cursorSpan.style.display = "block";
      } else {
        // Empty upcoming slot
        slot.classList.remove("is-filled", "is-active", "is-popping");
        charSpan.textContent = "";
        if (cursorSpan) cursorSpan.style.display = "none";
      }
    }
  },

  /**
   * Closes Full-Screen PIN view, cancels timers, and restores Profile Selector.
   */
  closePinScreen: () => {
    window.profilesScreen.pinScreen.active = false;
    window.profilesScreen.pinScreen.currentPin = "";
    window.profilesScreen.pinScreen.showPin = false;
    if (window.profilesScreen.pinScreen.holdTimer) {
      clearTimeout(window.profilesScreen.pinScreen.holdTimer);
      window.profilesScreen.pinScreen.holdTimer = null;
    }
    if (window.profilesScreen.pinScreen.lockoutInterval) {
      clearInterval(window.profilesScreen.pinScreen.lockoutInterval);
      window.profilesScreen.pinScreen.lockoutInterval = null;
    }
    const pinView = document.getElementById("pin-screen");
    if (pinView) {
      document.body.removeChild(pinView);
    }
    const baseScreen = document.getElementById(window.profilesScreen.id);
    if (baseScreen) baseScreen.style.display = "flex";
  },

  /**
   * Triggers brute-force lockout with live countdown timer and disabled numpad.
   * @param {number} cooldownSeconds
   */
  triggerPinLockout: (cooldownSeconds) => {
    window.profilesScreen.pinScreen.lockoutUntil = Date.now() + cooldownSeconds * 1000;
    const keypad = document.getElementById("pin-keypad");
    const errorEl = document.getElementById("pin-error-message");

    if (keypad) keypad.classList.add("is-locked-out");

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((window.profilesScreen.pinScreen.lockoutUntil - Date.now()) / 1000)
      );
      if (errorEl) {
        errorEl.textContent = `Too many attempts. Try again in ${remaining}s`;
      }
      if (remaining <= 0) {
        if (window.profilesScreen.pinScreen.lockoutInterval) {
          clearInterval(window.profilesScreen.pinScreen.lockoutInterval);
          window.profilesScreen.pinScreen.lockoutInterval = null;
        }
        window.profilesScreen.pinScreen.failedAttempts = 0;
        window.profilesScreen.pinScreen.lockoutUntil = 0;
        if (keypad) keypad.classList.remove("is-locked-out");
        if (errorEl) errorEl.textContent = "";
        window.profilesScreen.updatePinDots();
      }
    };

    updateTimer();
    window.profilesScreen.pinScreen.lockoutInterval = setInterval(updateTimer, 1000);
  },

  /**
   * Verifies the entered 4-digit PIN directly against Crunchyroll servers via switch_profile.
   */
  verifyPin: () => {
    const { profile, currentPin } = window.profilesScreen.pinScreen;
    const targetId = profile?.profile_id || profile?.id;
    const errorEl = document.getElementById("pin-error-message");
    const dotsRow = document.getElementById("pin-dots");
    const container = document.getElementById("pin-screen-container");

    if (errorEl && !window.profilesScreen.pinScreen.lockoutUntil) {
      errorEl.textContent = "";
    }

    window.loading.start();
    window.session.switch_profile(
      {
        success: () => {
          window.loading.end();
          window.profilesScreen.pinScreen.failedAttempts = 0;
          window.profilesScreen.closePinScreen();
          window.profilesScreen.destroy();
          window.menu.init();
          window.home.restart();
        },
        error: (err) => {
          window.loading.end();
          window.profilesScreen.pinScreen.failedAttempts++;

          if (dotsRow) dotsRow.classList.add("is-error");
          if (container) {
            container.classList.remove("is-error");
            void container.offsetWidth; // Trigger reflow for shake animation
            container.classList.add("is-error");
          }

          window.profilesScreen.pinScreen.currentPin = "";
          setTimeout(() => {
            if (dotsRow) dotsRow.classList.remove("is-error");
            window.profilesScreen.updatePinDots();
          }, 400);

          const attempts = window.profilesScreen.pinScreen.failedAttempts;

          // Attempt 5+ triggers 30s brute-force lockout
          if (attempts >= 5) {
            window.profilesScreen.triggerPinLockout(30);
            return;
          }

          if (errorEl) {
            if (attempts === 4) {
              errorEl.textContent = "Incorrect PIN. 1 attempt remaining before timeout";
            } else {
              errorEl.textContent =
                err?.message && !err.message.includes("status")
                  ? err.message
                  : window.translate?.go("profiles.pin_error") || "Incorrect PIN";
            }
          }
        },
      },
      targetId,
      currentPin
    );
  },

  /**
   * Keyboard spatial navigation handler for Profiles and PIN entry.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    // 1. If Dedicated Full-Screen PIN Entry is open
    if (window.profilesScreen.pinScreen.active) {
      // Check lockout state
      if (Date.now() < window.profilesScreen.pinScreen.lockoutUntil) {
        if (event.keyCode === 27 || window.tvKey?.IS_KEY_BACK(event.keyCode)) {
          window.profilesScreen.closePinScreen();
        }
        return;
      }

      // Direct numeric keyboard entry (0-9, Numpad 0-9)
      if (
        (event.keyCode >= 48 && event.keyCode <= 57) ||
        (event.keyCode >= 96 && event.keyCode <= 105)
      ) {
        const digit = event.key;
        if (/^[0-9]$/.test(digit)) {
          window.profilesScreen.handlePinInput(digit);
          return;
        }
      }

      // Backspace / Hold-To-Clear Detection for physical keyboard
      if (event.keyCode === 8) {
        window.profilesScreen.handlePinBackspace();
        return;
      }

      if (event.keyCode === 27 || window.tvKey?.IS_KEY_BACK(event.keyCode)) {
        // Escape / Back -> return to Profile Selector
        window.profilesScreen.closePinScreen();
        return;
      }

      // Smart Grid Wrapping (Row 0: 0-2, Row 1: 3-5, Row 2: 6-8, Row 3: 9-11, Row 4: 12-13)
      const currentIdx = window.profilesScreen.pinScreen.selectedIndex;
      switch (event.keyCode) {
        case window.tvKey?.KEY_UP:
          if (currentIdx === 12 || currentIdx === 13) {
            window.profilesScreen.setKeypadFocus(10); // From footer to '0'
          } else if (currentIdx >= 3) {
            window.profilesScreen.setKeypadFocus(currentIdx - 3);
          } else {
            // Loop to footer
            window.profilesScreen.setKeypadFocus(13);
          }
          break;
        case window.tvKey?.KEY_DOWN:
          if (currentIdx <= 8) {
            window.profilesScreen.setKeypadFocus(currentIdx + 3);
          } else if (currentIdx === 9 || currentIdx === 10) {
            window.profilesScreen.setKeypadFocus(12); // To Show PIN toggle
          } else if (currentIdx === 11) {
            window.profilesScreen.setKeypadFocus(13); // To Back button
          } else {
            // Loop to top row
            window.profilesScreen.setKeypadFocus(1);
          }
          break;
        case window.tvKey?.KEY_LEFT:
          if (currentIdx === 13) {
            window.profilesScreen.setKeypadFocus(12);
          } else if (currentIdx === 12) {
            window.profilesScreen.setKeypadFocus(13);
          } else if (currentIdx % 3 !== 0) {
            window.profilesScreen.setKeypadFocus(currentIdx - 1);
          } else {
            // Row wrap left to rightmost element of same row
            window.profilesScreen.setKeypadFocus(currentIdx + 2);
          }
          break;
        case window.tvKey?.KEY_RIGHT:
          if (currentIdx === 12) {
            window.profilesScreen.setKeypadFocus(13);
          } else if (currentIdx === 13) {
            window.profilesScreen.setKeypadFocus(12);
          } else if (currentIdx % 3 !== 2) {
            window.profilesScreen.setKeypadFocus(currentIdx + 1);
          } else {
            // Row wrap right to leftmost element of same row
            window.profilesScreen.setKeypadFocus(currentIdx - 2);
          }
          break;
        case 32:
        case window.tvKey?.KEY_ENTER:
        case window.tvKey?.KEY_PANEL_ENTER: {
          if (currentIdx === 12) {
            window.profilesScreen.togglePinVisibility();
          } else if (currentIdx === 13) {
            window.profilesScreen.closePinScreen();
          } else {
            const btns = Array.from(document.querySelectorAll("#pin-keypad .numpad-btn"));
            const activeBtn = btns[currentIdx];
            if (activeBtn) {
              const key = activeBtn.getAttribute("data-key");
              const action = activeBtn.getAttribute("data-action");
              if (key !== null) {
                window.profilesScreen.handlePinInput(key);
              } else if (action === "backspace") {
                window.profilesScreen.handlePinBackspace();
              } else if (action === "clear") {
                window.profilesScreen.executeSweepClear();
              }
            }
          }
          break;
        }
      }
      return;
    }

    // 4. Base Profile Grid Navigation
    const options = Array.from(document.querySelectorAll("#profiles-screen .options li"));
    const selectedEl = document.querySelector("#profiles-screen .options li.selected");
    const current = selectedEl ? options.indexOf(selectedEl) : 0;

    switch (event.keyCode) {
      case window.tvKey?.KEY_LEFT: {
        const newCurrent = Math.max(0, current - 1);
        options[current]?.classList.remove("selected", "is-focused");
        options[newCurrent]?.classList.add("selected", "is-focused");
        break;
      }
      case window.tvKey?.KEY_RIGHT: {
        const newCurrent = Math.min(options.length - 1, current + 1);
        options[current]?.classList.remove("selected", "is-focused");
        options[newCurrent]?.classList.add("selected", "is-focused");
        break;
      }
      case 32:
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const element = options[current];
        if (element) {
          window.profilesScreen.selectProfile(element.id);
        }
        break;
      }
      case 27:
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case window.tvKey?.KEY_EXIT: {
        window.main.events.logout();
        break;
      }
    }
  },
};
