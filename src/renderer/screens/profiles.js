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
  createScreen: {
    active: false,
    selectedAvatar: "0001-cr-white-orange.png",
    avatarCatalog: null,
    maturityRating: "Standard",
    isLockEnabled: false,
    pinStep: 1, // 1: enter, 2: confirm, 3: success
    firstPin: "",
    confirmPin: "",
    confirmedPin: "",
  },
  // Backward compatibility alias for unit tests
  get createModal() {
    return window.profilesScreen.createScreen;
  },
  avatarPicker: {
    active: false,
    selectedIndex: 0,
    items: [],
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

    // Mouse click and hover bindings for profiles
    const menuEl = document.getElementById("settings-menu");
    if (menuEl) {
      menuEl.addEventListener("mouseover", (e) => {
        if (
          window.profilesScreen.pinScreen.active ||
          window.profilesScreen.createScreen.active ||
          window.profilesScreen.avatarPicker.active
        ) {
          return;
        }
        const item = e.target.closest("li");
        if (item && menuEl.contains(item)) {
          const options = Array.from(menuEl.querySelectorAll("li"));
          options.forEach((opt) => opt.classList.remove("selected", "is-focused"));
          item.classList.add("selected", "is-focused");
        }
      });

      menuEl.addEventListener("click", (e) => {
        if (
          window.profilesScreen.pinScreen.active ||
          window.profilesScreen.createScreen.active ||
          window.profilesScreen.avatarPicker.active
        ) {
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
    window.profilesScreen.closeCreateProfileScreen();
    window.profilesScreen.closeAvatarPickerModal();
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
          profile.has_pin ||
          profile.is_profile_locked ||
          profile.is_pin_required ||
          profile.is_pin_protected ||
          profile.pin ||
          profile.pin_status === "locked" ||
          profile.pin_status === "enabled"
        );
        const avatar = profile.avatar || "0001-cr-white-orange.png";
        const displayName = (profile_name || username || "").trim().toUpperCase();
        const isFocused = is_selected || (!hasExplicitSelection && idx === 0);

        return `<li class="profile-card-wrapper ${isFocused ? "selected active is-focused" : ""}" id="${targetId}" data-locked="${isLocked ? "true" : "false"}">
        <div class="profile-card">
          <img src="https://static.crunchyroll.com/assets/avatar/170x170/${avatar}" alt="${displayName}"/>
          ${
            isLocked ? `<div class="profile-lock-badge"><i class="fa-solid fa-lock"></i></div>` : ""
          }
        </div>
        <span class="profile-name">${displayName}</span>
      </li>`;
      })
      .join("");

    // If account has fewer than 5 profiles, show circular "Add Profile" card
    let addProfileItem = "";
    if (profiles.length < 5) {
      addProfileItem = `
      <li class="profile-card-wrapper add-profile-card" id="btn-add-profile">
        <div class="profile-card">
          <div class="add-profile-icon"><i class="fa-solid fa-plus"></i></div>
        </div>
        <span class="profile-name">${window.translate.go("profiles.add_profile") || "Add Profile"}</span>
      </li>`;
    }

    return profileItems + addProfileItem;
  },

  /**
   * Handles selecting a profile or opening the create profile flow.
   * @param {string} profileId
   */
  selectProfile: (profileId) => {
    if (profileId === "btn-add-profile") {
      window.profilesScreen.openCreateProfileScreen();
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
   * Backward compatibility alias for tests.
   * @param {object} profile
   */
  openPinModal: (profile) => {
    window.profilesScreen.openPinScreen(profile);
  },
  closePinModal: () => {
    window.profilesScreen.closePinScreen();
  },
  openCreateProfileModal: () => {
    window.profilesScreen.openCreateProfileScreen();
  },
  closeCreateProfileModal: () => {
    window.profilesScreen.closeCreateProfileScreen();
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
    const toggleIcon = document.getElementById("icon-toggle-pin");
    const toggleText = document.getElementById("text-toggle-pin");

    if (toggleIcon) {
      toggleIcon.className = isShowing ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
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
          <i class="fa-solid fa-eye" id="icon-toggle-pin"></i>
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
        <button class="numpad-btn" data-action="backspace" title="Delete (Hold to Clear)"><i class="fa-solid fa-delete-left"></i></button>
      </div>

      <div class="pin-footer-actions">
        <button class="pin-cancel-btn" id="btn-pin-cancel" type="button">
          <i class="fa-solid fa-arrow-left"></i>
          <span>${window.translate.go("profiles.cancel") || "Back to Profiles"}</span>
        </button>
      </div>
    </div>`;

    document.body.appendChild(pinView);
    window.profilesScreen.setKeypadFocus(4);
    window.profilesScreen.updatePinDots();

    // Mouse and Pointer Handlers on Numpad Buttons with Hold-to-Clear Support
    const btns = pinView.querySelectorAll(".numpad-btn");
    btns.forEach((btn, idx) => {
      btn.addEventListener("mouseenter", () => {
        if (Date.now() >= window.profilesScreen.pinScreen.lockoutUntil) {
          window.profilesScreen.setKeypadFocus(idx);
        }
      });

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
    toggleBtn?.addEventListener("mouseenter", () => {
      if (Date.now() >= window.profilesScreen.pinScreen.lockoutUntil) {
        window.profilesScreen.setKeypadFocus(12);
      }
    });
    toggleBtn?.addEventListener("click", () => {
      window.profilesScreen.togglePinVisibility();
    });

    const cancelBtn = document.getElementById("btn-pin-cancel");
    cancelBtn?.addEventListener("mouseenter", () => {
      if (Date.now() >= window.profilesScreen.pinScreen.lockoutUntil) {
        window.profilesScreen.setKeypadFocus(13);
      }
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
   * Opens dedicated Full-Screen Create Profile view with progressive PIN setup.
   */
  openCreateProfileScreen: () => {
    window.profilesScreen.createScreen.active = true;
    window.profilesScreen.createScreen.selectedAvatar = "0001-cr-white-orange.png";
    window.profilesScreen.createScreen.maturityRating = "Standard";
    window.profilesScreen.createScreen.isLockEnabled = false;
    window.profilesScreen.createScreen.pinStep = 1;
    window.profilesScreen.createScreen.firstPin = "";
    window.profilesScreen.createScreen.confirmPin = "";
    window.profilesScreen.createScreen.confirmedPin = "";

    // Hide profile selector container
    const baseScreen = document.getElementById(window.profilesScreen.id);
    if (baseScreen) baseScreen.style.display = "none";

    const createView = document.createElement("div");
    createView.id = "create-profile-screen";
    createView.className = "create-profile-fullscreen-view";

    createView.innerHTML = `
    <div class="create-profile-container">
      <div class="create-profile-card">
        <h2 class="create-profile-title">${window.translate.go("profiles.add_profile") || "Create Profile"}</h2>

        <div class="create-profile-body">
          <!-- Left Column: Circular Avatar Preview & Change Trigger -->
          <div class="create-profile-avatar-col">
            <div class="create-avatar-wrapper" id="btn-change-avatar" title="Change Avatar">
              <img id="create-avatar-preview" src="https://static.crunchyroll.com/assets/avatar/170x170/0001-cr-white-orange.png" alt="Profile Avatar"/>
              <div class="avatar-edit-overlay"><i class="fa-solid fa-camera"></i></div>
            </div>
            <button class="btn-change-avatar-text" id="btn-change-avatar-link" type="button">Change Avatar</button>
          </div>

          <!-- Right Column: Form Fields & Progressive PIN Reveal -->
          <div class="create-profile-form-col">
            <div class="form-group">
              <label class="form-label" for="input-profile-name">Profile Name</label>
              <input class="form-input" type="text" id="input-profile-name" placeholder="Name" maxlength="32" autofocus>
            </div>

            <div class="form-group">
              <label class="form-label">Maturity Rating</label>
              <div class="segmented-control" id="maturity-segmented-control">
                <button class="segment-btn active" data-value="Standard" type="button">Standard</button>
                <button class="segment-btn" data-value="Mature" type="button">Mature</button>
                <button class="segment-btn" data-value="Kids" type="button">Kids</button>
              </div>
            </div>

            <!-- Progressive PIN Setup Switch -->
            <div class="form-group">
              <label class="lock-toggle-container" for="checkbox-enable-pin">
                <input type="checkbox" id="checkbox-enable-pin"/>
                <span class="lock-toggle-label">Protect with Profile PIN</span>
              </label>

              <div class="progressive-pin-wrapper" id="progressive-pin-wrapper">
                <div class="progressive-pin-content">
                  <div class="pin-setup-card" id="create-pin-setup-card">
                    <div class="pin-setup-step-label" id="create-pin-step-label">
                      <i class="fa-solid fa-lock"></i>
                      <span>Step 1: Enter 4-Digit PIN</span>
                    </div>

                    <div class="pin-slots-row" id="create-pin-slots">
                      <div class="pin-slot" id="create-slot-0"></div>
                      <div class="pin-slot" id="create-slot-1"></div>
                      <div class="pin-slot" id="create-slot-2"></div>
                      <div class="pin-slot" id="create-slot-3"></div>
                    </div>

                    <div class="pin-error-text" id="create-pin-error"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="create-profile-actions">
          <button class="create-profile-btn btn-cancel" id="btn-create-cancel" type="button">${window.translate.go("profiles.cancel") || "Cancel"}</button>
          <button class="create-profile-btn btn-save" id="btn-create-save" type="button">${window.translate.go("profiles.save") || "Create Profile"}</button>
        </div>
      </div>
    </div>`;

    document.body.appendChild(createView);

    // Event Bindings for Create Profile Screen
    const changeAvatarBtn = document.getElementById("btn-change-avatar");
    const changeAvatarLink = document.getElementById("btn-change-avatar-link");
    const lockCheckbox = document.getElementById("checkbox-enable-pin");
    const cancelBtn = document.getElementById("btn-create-cancel");
    const saveBtn = document.getElementById("btn-create-save");
    const segBtns = createView.querySelectorAll(".segment-btn");

    changeAvatarBtn?.addEventListener("click", () => window.profilesScreen.openAvatarPickerModal());
    changeAvatarLink?.addEventListener("click", () =>
      window.profilesScreen.openAvatarPickerModal()
    );

    lockCheckbox?.addEventListener("change", (e) => {
      window.profilesScreen.toggleCreatePinSetup(e.target.checked);
    });

    segBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        segBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        window.profilesScreen.createScreen.maturityRating = btn.getAttribute("data-value");
      });
    });

    cancelBtn?.addEventListener("click", () => window.profilesScreen.closeCreateProfileScreen());
    saveBtn?.addEventListener("click", () => window.profilesScreen.submitCreateProfile());
  },

  /**
   * Closes Create Profile Screen and returns to Profile Selector.
   */
  closeCreateProfileScreen: () => {
    window.profilesScreen.createScreen.active = false;
    const view = document.getElementById("create-profile-screen");
    if (view) {
      document.body.removeChild(view);
    }
    const baseScreen = document.getElementById(window.profilesScreen.id);
    if (baseScreen) baseScreen.style.display = "flex";
  },

  /**
   * Toggles progressive PIN setup accordion transition (0fr <-> 1fr).
   * @param {boolean} isEnabled
   */
  toggleCreatePinSetup: (isEnabled) => {
    window.profilesScreen.createScreen.isLockEnabled = isEnabled;
    const wrapper = document.getElementById("progressive-pin-wrapper");
    if (wrapper) {
      if (isEnabled) {
        wrapper.classList.add("is-expanded");
        window.profilesScreen.createScreen.pinStep = 1;
        window.profilesScreen.createScreen.firstPin = "";
        window.profilesScreen.createScreen.confirmPin = "";
        window.profilesScreen.createScreen.confirmedPin = "";
        window.profilesScreen.updateCreatePinSlots();
      } else {
        wrapper.classList.remove("is-expanded");
      }
    }
  },

  /**
   * Handles numeric input during progressive PIN creation.
   * @param {string} digit
   */
  handleCreatePinInput: (digit) => {
    const { pinStep, firstPin, confirmPin } = window.profilesScreen.createScreen;

    if (pinStep === 1) {
      if (firstPin.length < 4) {
        window.profilesScreen.createScreen.firstPin += digit;
        window.profilesScreen.updateCreatePinSlots();

        if (window.profilesScreen.createScreen.firstPin.length === 4) {
          // Transition to Step 2: Confirm PIN
          setTimeout(() => {
            window.profilesScreen.createScreen.pinStep = 2;
            window.profilesScreen.updateCreatePinSlots();
          }, 300);
        }
      }
    } else if (pinStep === 2) {
      if (confirmPin.length < 4) {
        window.profilesScreen.createScreen.confirmPin += digit;
        window.profilesScreen.updateCreatePinSlots();

        if (window.profilesScreen.createScreen.confirmPin.length === 4) {
          // Validate match
          if (
            window.profilesScreen.createScreen.confirmPin ===
            window.profilesScreen.createScreen.firstPin
          ) {
            window.profilesScreen.createScreen.confirmedPin =
              window.profilesScreen.createScreen.confirmPin;
            window.profilesScreen.createScreen.pinStep = 3;
            window.profilesScreen.updateCreatePinSlots();
          } else {
            // Mismatch error & shake
            const card = document.getElementById("create-pin-setup-card");
            const errEl = document.getElementById("create-pin-error");
            if (card) {
              card.classList.remove("is-error");
              void card.offsetWidth;
              card.classList.add("is-error");
            }
            if (errEl) errEl.textContent = "PINs do not match. Please try again.";
            setTimeout(() => {
              window.profilesScreen.createScreen.pinStep = 1;
              window.profilesScreen.createScreen.firstPin = "";
              window.profilesScreen.createScreen.confirmPin = "";
              if (card) card.classList.remove("is-error");
              if (errEl) errEl.textContent = "";
              window.profilesScreen.updateCreatePinSlots();
            }, 800);
          }
        }
      }
    }
  },

  /**
   * Handles backspace during progressive PIN creation.
   */
  handleCreatePinBackspace: () => {
    const { pinStep, firstPin, confirmPin } = window.profilesScreen.createScreen;
    if (pinStep === 1 && firstPin.length > 0) {
      window.profilesScreen.createScreen.firstPin = firstPin.slice(0, -1);
      window.profilesScreen.updateCreatePinSlots();
    } else if (pinStep === 2 && confirmPin.length > 0) {
      window.profilesScreen.createScreen.confirmPin = confirmPin.slice(0, -1);
      window.profilesScreen.updateCreatePinSlots();
    }
  },

  /**
   * Updates PIN slot UI for Create Profile screen.
   */
  updateCreatePinSlots: () => {
    const { pinStep, firstPin, confirmPin } = window.profilesScreen.createScreen;
    const labelEl = document.getElementById("create-pin-step-label");
    const currentPin = pinStep === 1 ? firstPin : confirmPin;

    if (labelEl) {
      if (pinStep === 1) {
        labelEl.innerHTML = `<i class="fa-solid fa-lock"></i> <span>Step 1: Enter 4-Digit PIN</span>`;
      } else if (pinStep === 2) {
        labelEl.innerHTML = `<i class="fa-solid fa-lock"></i> <span>Step 2: Confirm PIN</span>`;
      } else if (pinStep === 3) {
        labelEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--cr-success);"></i> <span style="color:var(--cr-success);">PIN Configured Successfully</span>`;
      }
    }

    for (let i = 0; i < 4; i++) {
      const slot = document.getElementById(`create-slot-${i}`);
      if (slot) {
        if (pinStep === 3) {
          slot.classList.add("is-filled", "is-success");
          slot.textContent = "✓";
        } else if (i < currentPin.length) {
          slot.classList.add("is-filled");
          slot.classList.remove("is-success");
          slot.textContent = "•";
        } else {
          slot.classList.remove("is-filled", "is-success");
          slot.textContent = "";
        }
      }
    }
  },

  /**
   * Submits newly created profile to Crunchyroll API.
   */
  submitCreateProfile: () => {
    const nameInput = document.getElementById("input-profile-name");
    const name = nameInput?.value?.trim();
    if (!name) {
      nameInput?.focus();
      return;
    }

    const { selectedAvatar, maturityRating, isLockEnabled, confirmedPin } =
      window.profilesScreen.createScreen;

    if (isLockEnabled && !confirmedPin) {
      const errEl = document.getElementById("create-pin-error");
      if (errEl) errEl.textContent = "Please complete PIN configuration.";
      return;
    }

    const payload = {
      profile_name: name,
      avatar: selectedAvatar,
      is_mature: maturityRating === "Mature",
    };

    if (isLockEnabled && confirmedPin) {
      payload.pin = confirmedPin;
    }

    window.loading.start();
    window.service.createProfile({
      data: payload,
      success: () => {
        // Refresh session profiles and return to selector
        window.session.load_profiles({
          success: () => {
            window.loading.end();
            window.profilesScreen.closeCreateProfileScreen();
            const menuEl = document.getElementById("settings-menu");
            if (menuEl) {
              menuEl.innerHTML = window.profilesScreen.getOptions();
            }
          },
          error: () => {
            window.loading.end();
            window.profilesScreen.closeCreateProfileScreen();
          },
        });
      },
      error: (err) => {
        window.loading.end();
        const errEl = document.getElementById("create-pin-error");
        if (errEl) {
          errEl.textContent = err?.message || "Failed to create profile. Please try again.";
        }
      },
    });
  },

  /**
   * Opens Live Avatar Catalog Picker Modal.
   */
  openAvatarPickerModal: () => {
    window.profilesScreen.avatarPicker.active = true;
    window.profilesScreen.avatarPicker.selectedIndex = 0;

    const modal = document.createElement("div");
    modal.id = "avatar-picker-modal";

    modal.innerHTML = `
    <div class="avatar-picker-card">
      <div class="avatar-picker-header">
        <h3>Select Profile Avatar</h3>
        <button class="create-profile-btn btn-cancel" id="btn-close-avatar-picker" type="button">Close</button>
      </div>
      <div class="avatar-picker-content" id="avatar-picker-content">
        <div class="flat-spinner" style="margin:40px auto;"></div>
      </div>
    </div>`;

    document.body.appendChild(modal);

    document.getElementById("btn-close-avatar-picker")?.addEventListener("click", () => {
      window.profilesScreen.closeAvatarPickerModal();
    });

    // Standard Crunchyroll catalog avatars
    const DEFAULT_AVATARS = [
      "0001-cr-white-orange.png",
      "0002-cr-white-black.png",
      "0003-cr-black-orange.png",
      "0004-cr-orange-white.png",
      "0005-cr-orange-black.png",
      "0006-cr-white-pink.png",
      "0007-cr-white-purple.png",
      "0008-cr-white-blue.png",
      "0009-cr-white-green.png",
      "0010-cr-white-yellow.png",
      "0011-cr-white-red.png",
      "0012-cr-black-white.png",
      "0013-cr-black-blue.png",
      "0014-cr-black-red.png",
      "0015-cr-black-pink.png",
      "0016-cr-black-purple.png",
      "0017-cr-black-yellow.png",
      "0018-cr-black-green.png",
      "0019-cr-grey-orange.png",
      "0020-cr-grey-white.png",
      "0021-cr-grey-black.png",
      "0022-cr-grey-blue.png",
      "0023-cr-grey-pink.png",
      "0024-cr-grey-purple.png",
    ];

    const renderAvatars = (rawList) => {
      const contentEl = document.getElementById("avatar-picker-content");
      if (!contentEl) return;

      let items = [];
      if (Array.isArray(rawList)) {
        rawList.forEach((entry) => {
          if (entry && Array.isArray(entry.items)) {
            entry.items.forEach((sub) => items.push(sub));
          } else if (entry) {
            items.push(entry);
          }
        });
      }

      if (!items.length) {
        items = DEFAULT_AVATARS.map((name) => ({ avatar_name: name }));
      }

      window.profilesScreen.avatarPicker.items = items;

      contentEl.innerHTML = `
      <div class="avatar-category-group">
        <div class="avatar-category-grid" id="avatar-items-grid">
          ${items
            .map((item, idx) => {
              const avatarKey =
                typeof item === "string"
                  ? item
                  : item.avatar_name ||
                    item.name ||
                    item.id ||
                    item.c_avatar ||
                    item.assets?.["170x170"] ||
                    "0001-cr-white-orange.png";
              const imgSrc = avatarKey.startsWith("http")
                ? avatarKey
                : `https://static.crunchyroll.com/assets/avatar/170x170/${avatarKey}`;
              const cleanAvatarId =
                typeof item === "string"
                  ? item
                  : item.avatar_name || item.name || item.id || avatarKey;

              return `
            <div class="avatar-picker-item ${idx === 0 ? "selected is-focused" : ""}" data-avatar="${cleanAvatarId}" data-src="${imgSrc}">
              <img src="${imgSrc}" alt="Avatar" onerror="this.src='https://static.crunchyroll.com/assets/avatar/170x170/0001-cr-white-orange.png'"/>
            </div>`;
            })
            .join("")}
        </div>
      </div>`;

      // Click bindings for avatar picker items
      const avatarEls = contentEl.querySelectorAll(".avatar-picker-item");
      avatarEls.forEach((el, idx) => {
        el.addEventListener("mouseenter", () => {
          avatarEls.forEach((a) => a.classList.remove("selected", "is-focused"));
          el.classList.add("selected", "is-focused");
          window.profilesScreen.avatarPicker.selectedIndex = idx;
        });

        el.addEventListener("click", () => {
          const chosen = el.getAttribute("data-avatar");
          const chosenSrc = el.getAttribute("data-src");
          if (chosen) {
            window.profilesScreen.createScreen.selectedAvatar = chosen;
            const previewImg = document.getElementById("create-avatar-preview");
            if (previewImg) {
              previewImg.src =
                chosenSrc || `https://static.crunchyroll.com/assets/avatar/170x170/${chosen}`;
            }
          }
          window.profilesScreen.closeAvatarPickerModal();
        });
      });
    };

    // Fetch official avatar catalog from Crunchyroll DAM API with instant fallback
    window.service.avatars({
      success: (catalog) => {
        const raw = catalog?.items || catalog?.data || catalog || [];
        renderAvatars(raw);
      },
      error: () => {
        renderAvatars(DEFAULT_AVATARS.map((name) => ({ avatar_name: name })));
      },
    });
  },

  /**
   * Closes Live Avatar Catalog Picker Modal.
   */
  closeAvatarPickerModal: () => {
    window.profilesScreen.avatarPicker.active = false;
    const modal = document.getElementById("avatar-picker-modal");
    if (modal) {
      document.body.removeChild(modal);
    }
  },

  /**
   * Keyboard spatial navigation handler for Profiles, PIN entry, Create Profile, and Avatar Picker.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    // 1. If Avatar Picker Modal is active
    if (window.profilesScreen.avatarPicker.active) {
      const items = Array.from(document.querySelectorAll("#avatar-items-grid .avatar-picker-item"));
      const currentIdx = window.profilesScreen.avatarPicker.selectedIndex;
      const cols = 6;

      if (event.keyCode === 27 || window.tvKey?.IS_KEY_BACK(event.keyCode)) {
        window.profilesScreen.closeAvatarPickerModal();
        return;
      }

      switch (event.keyCode) {
        case window.tvKey?.KEY_LEFT:
          if (currentIdx > 0) {
            window.profilesScreen.avatarPicker.selectedIndex = currentIdx - 1;
            items[currentIdx]?.classList.remove("selected", "is-focused");
            items[currentIdx - 1]?.classList.add("selected", "is-focused");
            items[currentIdx - 1]?.scrollIntoView({ block: "nearest" });
          }
          break;
        case window.tvKey?.KEY_RIGHT:
          if (currentIdx < items.length - 1) {
            window.profilesScreen.avatarPicker.selectedIndex = currentIdx + 1;
            items[currentIdx]?.classList.remove("selected", "is-focused");
            items[currentIdx + 1]?.classList.add("selected", "is-focused");
            items[currentIdx + 1]?.scrollIntoView({ block: "nearest" });
          }
          break;
        case window.tvKey?.KEY_UP:
          if (currentIdx >= cols) {
            window.profilesScreen.avatarPicker.selectedIndex = currentIdx - cols;
            items[currentIdx]?.classList.remove("selected", "is-focused");
            items[currentIdx - cols]?.classList.add("selected", "is-focused");
            items[currentIdx - cols]?.scrollIntoView({ block: "nearest" });
          }
          break;
        case window.tvKey?.KEY_DOWN:
          if (currentIdx + cols < items.length) {
            window.profilesScreen.avatarPicker.selectedIndex = currentIdx + cols;
            items[currentIdx]?.classList.remove("selected", "is-focused");
            items[currentIdx + cols]?.classList.add("selected", "is-focused");
            items[currentIdx + cols]?.scrollIntoView({ block: "nearest" });
          }
          break;
        case 32:
        case window.tvKey?.KEY_ENTER:
        case window.tvKey?.KEY_PANEL_ENTER: {
          const selectedEl = items[currentIdx];
          const chosenAvatar = selectedEl?.getAttribute("data-avatar");
          if (chosenAvatar) {
            window.profilesScreen.createScreen.selectedAvatar = chosenAvatar;
            const previewImg = document.getElementById("create-avatar-preview");
            if (previewImg) {
              previewImg.src = `https://static.crunchyroll.com/assets/avatar/170x170/${chosenAvatar}`;
            }
          }
          window.profilesScreen.closeAvatarPickerModal();
          break;
        }
      }
      return;
    }

    // 2. If Create Profile Screen is open
    if (window.profilesScreen.createScreen.active) {
      if (event.keyCode === 27 || window.tvKey?.IS_KEY_BACK(event.keyCode)) {
        window.profilesScreen.closeCreateProfileScreen();
        return;
      }

      // Progressive PIN setup handling
      if (
        window.profilesScreen.createScreen.isLockEnabled &&
        window.profilesScreen.createScreen.pinStep < 3
      ) {
        if (
          (event.keyCode >= 48 && event.keyCode <= 57) ||
          (event.keyCode >= 96 && event.keyCode <= 105)
        ) {
          const digit = event.key;
          if (/^[0-9]$/.test(digit)) {
            window.profilesScreen.handleCreatePinInput(digit);
            return;
          }
        }
        if (event.keyCode === 8) {
          window.profilesScreen.handleCreatePinBackspace();
          return;
        }
      }

      if (event.keyCode === 13) {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== "input" && activeTag !== "button") {
          window.profilesScreen.submitCreateProfile();
        }
        return;
      }
      return;
    }

    // 3. If Dedicated Full-Screen PIN Entry is open
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
