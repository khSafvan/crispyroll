/**
 * Profiles Selection Screen Controller, Full-Screen PIN Entry & Create Profile Screen
 * (Onyx & Ember: Dedicated Full-Screen Views, Progressive-Reveal PIN Setup & Live Avatar API)
 */

window.profilesScreen = {
  id: "profiles-screen",
  pinScreen: {
    active: false,
    profile: null,
    currentPin: "",
    selectedIndex: 4, // default focus on '5'
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

    const profileItems = profiles
      .map((profile) => {
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

        return `<li class="profile-card-wrapper ${is_selected ? "selected active is-focused" : ""}" id="${targetId}" data-locked="${isLocked ? "true" : "false"}">
        <div class="profile-card">
          <img src="https://static.crunchyroll.com/assets/avatar/170x170/${avatar}" alt="${displayName}"/>
          ${
            isLocked
              ? `<div class="profile-lock-badge"><i class="fa-solid fa-lock"></i></div>`
              : ""
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
   * Opens dedicated Full-Screen PIN Entry view.
   * @param {object} profile
   */
  openPinScreen: (profile) => {
    window.profilesScreen.pinScreen.active = true;
    window.profilesScreen.pinScreen.profile = profile;
    window.profilesScreen.pinScreen.currentPin = "";
    window.profilesScreen.pinScreen.selectedIndex = 4; // default focus on '5'

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
        <h2 class="pin-welcome-text">Welcome Back</h2>
        <p class="pin-profile-subtext">${displayName}</p>
      </div>

      <div class="pin-dots-row" id="pin-dots">
        <div class="pin-dot" id="dot-0"></div>
        <div class="pin-dot" id="dot-1"></div>
        <div class="pin-dot" id="dot-2"></div>
        <div class="pin-dot" id="dot-3"></div>
      </div>

      <div class="pin-error-text" id="pin-error-message"></div>

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
        <button class="numpad-btn" data-action="clear" title="Clear">CLR</button>
        <button class="numpad-btn" data-key="0">0</button>
        <button class="numpad-btn" data-action="backspace" title="Delete"><i class="fa-solid fa-delete-left"></i></button>
      </div>
    </div>`;

    document.body.appendChild(pinView);
    window.profilesScreen.setKeypadFocus(4);

    // Mouse click handlers on numpad buttons
    const btns = pinView.querySelectorAll(".numpad-btn");
    btns.forEach((btn, idx) => {
      btn.addEventListener("mouseenter", () => window.profilesScreen.setKeypadFocus(idx));
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-key");
        const action = btn.getAttribute("data-action");
        if (key !== null) {
          window.profilesScreen.handlePinInput(key);
        } else if (action === "backspace") {
          window.profilesScreen.handlePinBackspace();
        } else if (action === "clear") {
          window.profilesScreen.pinScreen.currentPin = "";
          window.profilesScreen.updatePinDots();
        }
      });
    });
  },

  /**
   * Sets focused button in PIN numpad grid.
   * @param {number} index
   */
  setKeypadFocus: (index) => {
    window.profilesScreen.pinScreen.selectedIndex = index;
    const btns = document.querySelectorAll("#pin-keypad .numpad-btn");
    btns.forEach((btn, idx) => {
      if (idx === index) {
        btn.classList.add("selected", "is-focused");
      } else {
        btn.classList.remove("selected", "is-focused");
      }
    });
  },

  /**
   * Appends digit to PIN and triggers auto-verification upon 4 digits.
   * @param {string} digit
   */
  handlePinInput: (digit) => {
    if (window.profilesScreen.pinScreen.currentPin.length < 4) {
      window.profilesScreen.pinScreen.currentPin += digit;
      window.profilesScreen.updatePinDots();

      if (window.profilesScreen.pinScreen.currentPin.length === 4) {
        window.profilesScreen.verifyPin();
      }
    }
  },

  /**
   * Removes last digit from PIN.
   */
  handlePinBackspace: () => {
    if (window.profilesScreen.pinScreen.currentPin.length > 0) {
      window.profilesScreen.pinScreen.currentPin = window.profilesScreen.pinScreen.currentPin.slice(
        0,
        -1
      );
      window.profilesScreen.updatePinDots();
      const errEl = document.getElementById("pin-error-message");
      if (errEl) errEl.textContent = "";
    }
  },

  /**
   * Updates filled/empty indicator dots in PIN view.
   */
  updatePinDots: () => {
    const len = window.profilesScreen.pinScreen.currentPin.length;
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) {
        if (i < len) {
          dot.classList.add("is-filled");
        } else {
          dot.classList.remove("is-filled");
        }
      }
    }
  },

  /**
   * Closes Full-Screen PIN view and restores Profile Selector.
   */
  closePinScreen: () => {
    window.profilesScreen.pinScreen.active = false;
    window.profilesScreen.pinScreen.currentPin = "";
    const pinView = document.getElementById("pin-screen");
    if (pinView) {
      document.body.removeChild(pinView);
    }
    const baseScreen = document.getElementById(window.profilesScreen.id);
    if (baseScreen) baseScreen.style.display = "flex";
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

    if (errorEl) errorEl.textContent = "";

    window.loading.start();
    window.session.switch_profile(
      {
        success: () => {
          window.loading.end();
          window.profilesScreen.closePinScreen();
          window.profilesScreen.destroy();
          window.menu.init();
          window.home.restart();
        },
        error: (err) => {
          window.loading.end();
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

          if (errorEl) {
            errorEl.textContent =
              err?.message && !err.message.includes("status")
                ? err.message
                : window.translate?.go("profiles.pin_error") || "Incorrect PIN";
          }
        },
      },
      targetId,
      currentPin
    );
  },

  /**
   * Opens dedicated Full-Screen Create Profile view with progressive PIN reveal.
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
      <div class="create-profile-topbar">
        <button class="btn-back-pill" id="btn-back-to-profiles">← Back to Profiles</button>
        <h2 class="create-profile-title">Create Profile</h2>
      </div>

      <div class="create-profile-body">
        <!-- Left: Circular Avatar Preview & Change Trigger -->
        <div class="avatar-preview-section">
          <div class="avatar-preview-card">
            <img id="create-avatar-preview" src="https://static.crunchyroll.com/assets/avatar/170x170/${window.profilesScreen.createScreen.selectedAvatar}" alt="Selected Avatar"/>
          </div>
          <button class="btn-change-avatar" id="btn-change-avatar">Change Avatar</button>
        </div>

        <!-- Right: Form Controls & Progressive PIN Setup -->
        <div class="form-fields-section">
          <div class="form-group">
            <label class="form-label" for="create-profile-name">Profile Name</label>
            <input class="form-input" type="text" id="create-profile-name" placeholder="Enter name..." maxlength="32" autofocus>
          </div>

          <div class="form-group">
            <label class="form-label">Mature Content (18+)</label>
            <div class="segmented-control" id="maturity-segmented-control">
              <button class="segment-btn" data-rating="Kids">Kids (G/PG)</button>
              <button class="segment-btn active" data-rating="Standard">Standard</button>
              <button class="segment-btn" data-rating="Mature">Mature (18+)</button>
            </div>
          </div>

          <div class="form-group">
            <label class="lock-toggle-container">
              <input type="checkbox" id="create-lock-toggle">
              <span class="lock-toggle-label">Require a 4-digit PIN to access this profile</span>
            </label>
            
            <!-- Progressive Reveal PIN Setup (0fr -> 1fr grid transition) -->
            <div class="progressive-pin-wrapper" id="progressive-pin-wrapper">
              <div class="progressive-pin-content">
                <div class="pin-setup-card" id="pin-setup-card">
                  <div class="pin-setup-step-label" id="pin-setup-step-label">
                    <i class="fa-solid fa-key"></i> <span>Enter 4-Digit PIN</span>
                  </div>
                  <div class="pin-slots-row" id="setup-pin-slots">
                    <div class="pin-slot" id="setup-slot-0"></div>
                    <div class="pin-slot" id="setup-slot-1"></div>
                    <div class="pin-slot" id="setup-slot-2"></div>
                    <div class="pin-slot" id="setup-slot-3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="notification is-danger is-light" id="create-profile-error" style="display:none; font-size:13px; padding:8px 12px; border-radius:8px; background:rgba(255, 51, 102, 0.15); color:var(--cr-error); border:1px solid var(--cr-error);"></div>

          <div class="create-profile-actions">
            <button class="create-profile-btn btn-cancel" id="btn-cancel-create">Cancel</button>
            <button class="create-profile-btn btn-save" id="btn-submit-create">Save Profile</button>
          </div>
        </div>
      </div>
    </div>`;

    document.body.appendChild(createView);

    // Event listeners
    const nameInput = document.getElementById("create-profile-name");
    const cancelBtn = document.getElementById("btn-cancel-create");
    const backPill = document.getElementById("btn-back-to-profiles");
    const submitBtn = document.getElementById("btn-submit-create");
    const changeAvatarBtn = document.getElementById("btn-change-avatar");
    const lockToggle = document.getElementById("create-lock-toggle");
    const pinWrapper = document.getElementById("progressive-pin-wrapper");

    nameInput?.focus();

    const closeScreen = () => window.profilesScreen.closeCreateProfileScreen();
    cancelBtn?.addEventListener("click", closeScreen);
    backPill?.addEventListener("click", closeScreen);
    submitBtn?.addEventListener("click", () => window.profilesScreen.submitCreateProfile());
    changeAvatarBtn?.addEventListener("click", () => window.profilesScreen.openAvatarPickerModal());

    // Segmented maturity rating control
    const segmentBtns = Array.from(createView.querySelectorAll(".segment-btn"));
    segmentBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        segmentBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        window.profilesScreen.createScreen.maturityRating = btn.getAttribute("data-rating") || "Standard";
      });
    });

    // Lock toggle listener (smooth 0fr -> 1fr reveal)
    lockToggle?.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      window.profilesScreen.createScreen.isLockEnabled = isChecked;
      if (pinWrapper) {
        if (isChecked) {
          pinWrapper.classList.add("is-expanded");
          window.profilesScreen.resetPinSetup();
        } else {
          pinWrapper.classList.remove("is-expanded");
          window.profilesScreen.createScreen.confirmedPin = "";
        }
      }
    });
  },

  /**
   * Resets progressive PIN setup to State 1.
   */
  resetPinSetup: () => {
    window.profilesScreen.createScreen.pinStep = 1;
    window.profilesScreen.createScreen.firstPin = "";
    window.profilesScreen.createScreen.confirmPin = "";
    window.profilesScreen.createScreen.confirmedPin = "";
    window.profilesScreen.updatePinSetupUI();
  },

  /**
   * Updates progressive PIN setup visual state.
   */
  updatePinSetupUI: () => {
    const labelEl = document.getElementById("pin-setup-step-label");
    const cardEl = document.getElementById("pin-setup-card");
    const { pinStep, firstPin, confirmPin } = window.profilesScreen.createScreen;

    if (cardEl) cardEl.classList.remove("is-error");

    if (pinStep === 1) {
      if (labelEl) {
        labelEl.innerHTML = `<i class="fa-solid fa-key"></i> <span>Enter 4-Digit PIN</span>`;
      }
      for (let i = 0; i < 4; i++) {
        const slot = document.getElementById(`setup-slot-${i}`);
        if (slot) {
          slot.className = "pin-slot" + (i < firstPin.length ? " is-filled" : "");
          slot.textContent = i < firstPin.length ? "●" : "";
        }
      }
    } else if (pinStep === 2) {
      if (labelEl) {
        labelEl.innerHTML = `<i class="fa-solid fa-shield-halved"></i> <span>Confirm your PIN</span>`;
      }
      for (let i = 0; i < 4; i++) {
        const slot = document.getElementById(`setup-slot-${i}`);
        if (slot) {
          slot.className = "pin-slot" + (i < confirmPin.length ? " is-filled" : "");
          slot.textContent = i < confirmPin.length ? "●" : "";
        }
      }
    } else if (pinStep === 3) {
      if (labelEl) {
        labelEl.innerHTML = `<i class="fa-solid fa-check" style="color:var(--cr-success)"></i> <span style="color:var(--cr-success)">PIN Confirmed ✓</span>`;
      }
      for (let i = 0; i < 4; i++) {
        const slot = document.getElementById(`setup-slot-${i}`);
        if (slot) {
          slot.className = "pin-slot is-success";
          slot.textContent = "✓";
        }
      }
      document.getElementById("btn-submit-create")?.focus();
    }
  },

  /**
   * Handles keyboard number entry for Create Profile PIN setup.
   * @param {string} digit
   */
  handleCreatePinInput: (digit) => {
    const { isLockEnabled, pinStep } = window.profilesScreen.createScreen;
    if (!isLockEnabled) return;

    if (pinStep === 1) {
      if (window.profilesScreen.createScreen.firstPin.length < 4) {
        window.profilesScreen.createScreen.firstPin += digit;
        window.profilesScreen.updatePinSetupUI();

        if (window.profilesScreen.createScreen.firstPin.length === 4) {
          setTimeout(() => {
            window.profilesScreen.createScreen.pinStep = 2;
            window.profilesScreen.updatePinSetupUI();
          }, 250);
        }
      }
    } else if (pinStep === 2) {
      if (window.profilesScreen.createScreen.confirmPin.length < 4) {
        window.profilesScreen.createScreen.confirmPin += digit;
        window.profilesScreen.updatePinSetupUI();

        if (window.profilesScreen.createScreen.confirmPin.length === 4) {
          const { firstPin, confirmPin } = window.profilesScreen.createScreen;
          if (firstPin === confirmPin) {
            // Match -> Success state
            window.profilesScreen.createScreen.confirmedPin = firstPin;
            window.profilesScreen.createScreen.pinStep = 3;
            window.profilesScreen.updatePinSetupUI();
          } else {
            // Mismatch -> Error shake & reset to State 1
            const cardEl = document.getElementById("pin-setup-card");
            if (cardEl) {
              cardEl.classList.add("is-error");
            }
            const labelEl = document.getElementById("pin-setup-step-label");
            if (labelEl) {
              labelEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--cr-error)"></i> <span style="color:var(--cr-error)">PINs did not match, try again</span>`;
            }
            setTimeout(() => {
              window.profilesScreen.resetPinSetup();
            }, 800);
          }
        }
      }
    }
  },

  /**
   * Handles backspace for Create Profile PIN setup.
   */
  handleCreatePinBackspace: () => {
    const { isLockEnabled, pinStep } = window.profilesScreen.createScreen;
    if (!isLockEnabled) return;

    if (pinStep === 1 && window.profilesScreen.createScreen.firstPin.length > 0) {
      window.profilesScreen.createScreen.firstPin = window.profilesScreen.createScreen.firstPin.slice(0, -1);
      window.profilesScreen.updatePinSetupUI();
    } else if (pinStep === 2 && window.profilesScreen.createScreen.confirmPin.length > 0) {
      window.profilesScreen.createScreen.confirmPin = window.profilesScreen.createScreen.confirmPin.slice(0, -1);
      window.profilesScreen.updatePinSetupUI();
    }
  },

  /**
   * Closes Full-Screen Create Profile view and restores Profile Selector.
   */
  closeCreateProfileScreen: () => {
    window.profilesScreen.createScreen.active = false;
    const createView = document.getElementById("create-profile-screen");
    if (createView) {
      document.body.removeChild(createView);
    }
    const baseScreen = document.getElementById(window.profilesScreen.id);
    if (baseScreen) baseScreen.style.display = "flex";
  },

  /**
   * Opens live Avatar Picker Modal sourcing avatar list from Crunchyroll's API.
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
        <button class="btn-back-pill" id="btn-close-avatar-picker">Cancel</button>
      </div>
      <div class="avatar-picker-content" id="avatar-picker-content">
        <div class="has-text-centered p-4" id="avatar-picker-loading">
          <div class="flat-spinner" style="margin: 20px auto;"></div>
          <p class="has-text-grey">Loading avatar catalog...</p>
        </div>
      </div>
    </div>`;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById("btn-close-avatar-picker");
    closeBtn?.addEventListener("click", () => window.profilesScreen.closeAvatarPickerModal());

    const renderAvatars = (items) => {
      const contentEl = document.getElementById("avatar-picker-content");
      if (!contentEl) return;

      // Group items by series/category
      const groups = {};
      items.forEach((item) => {
        const category = item.c_name || item.series_title || item.category || "Crunchyroll Originals";
        if (!groups[category]) groups[category] = [];
        groups[category].push(item);
      });

      let html = "";
      let globalIdx = 0;
      window.profilesScreen.avatarPicker.items = [];

      Object.keys(groups).forEach((catName) => {
        const catItems = groups[catName];
        html += `
        <div class="avatar-category-group">
          <div class="avatar-category-title">${catName}</div>
          <div class="avatar-category-grid">`;

        catItems.forEach((avatarObj) => {
          const avatarId = avatarObj.avatar_id || avatarObj.name || avatarObj.id || avatarObj;
          const avatarUrl =
            avatarObj.assets?.["170x170"] ||
            `https://static.crunchyroll.com/assets/avatar/170x170/${avatarId}`;
          const isSelected = avatarId === window.profilesScreen.createScreen.selectedAvatar;

          window.profilesScreen.avatarPicker.items.push(avatarId);

          html += `
            <div class="avatar-picker-item ${isSelected ? "selected is-focused" : ""}" data-avatar="${avatarId}" data-idx="${globalIdx}">
              <img src="${avatarUrl}" alt="${avatarId}"/>
            </div>`;
          globalIdx++;
        });

        html += `
          </div>
        </div>`;
      });

      contentEl.innerHTML = html;

      // Click handlers on circular thumbnails
      const thumbEls = Array.from(contentEl.querySelectorAll(".avatar-picker-item"));
      thumbEls.forEach((el) => {
        el.addEventListener("click", () => {
          const chosenAvatar = el.getAttribute("data-avatar");
          if (chosenAvatar) {
            window.profilesScreen.createScreen.selectedAvatar = chosenAvatar;
            const previewImg = document.getElementById("create-avatar-preview");
            if (previewImg) {
              previewImg.src = `https://static.crunchyroll.com/assets/avatar/170x170/${chosenAvatar}`;
            }
          }
          window.profilesScreen.closeAvatarPickerModal();
        });
      });
    };

    // Standard fallback presets in case API call fails or device is offline
    const fallbackPresets = [
      { avatar_id: "0001-cr-white-orange.png", c_name: "Crunchyroll Originals" },
      { avatar_id: "0002-cr-black-orange.png", c_name: "Crunchyroll Originals" },
      { avatar_id: "0003-cr-orange-white.png", c_name: "Crunchyroll Originals" },
      { avatar_id: "0004-cr-blue-white.png", c_name: "Crunchyroll Originals" },
      { avatar_id: "0005-cr-pink-white.png", c_name: "Crunchyroll Originals" },
      { avatar_id: "0006-cr-purple-white.png", c_name: "Crunchyroll Originals" },
      { avatar_id: "0007-cr-green-white.png", c_name: "Crunchyroll Originals" },
      { avatar_id: "0008-cr-yellow-black.png", c_name: "Crunchyroll Originals" },
    ];

    if (window.service?.avatars) {
      window.service.avatars({
        success: (res) => {
          const rawItems = res?.items || res?.data || (Array.isArray(res) ? res : null);
          if (rawItems && rawItems.length > 0) {
            renderAvatars(rawItems);
          } else {
            renderAvatars(fallbackPresets);
          }
        },
        error: () => {
          renderAvatars(fallbackPresets);
        },
      });
    } else {
      renderAvatars(fallbackPresets);
    }
  },

  /**
   * Closes the Avatar Picker Modal.
   */
  closeAvatarPickerModal: () => {
    window.profilesScreen.avatarPicker.active = false;
    const modal = document.getElementById("avatar-picker-modal");
    if (modal) {
      document.body.removeChild(modal);
    }
  },

  /**
   * Submits new profile creation to the Crunchyroll API.
   */
  submitCreateProfile: () => {
    const nameInput = document.getElementById("create-profile-name");
    const errorEl = document.getElementById("create-profile-error");

    const profileName = nameInput?.value?.trim() || "";
    const { isLockEnabled, confirmedPin } = window.profilesScreen.createScreen;

    if (!profileName) {
      if (errorEl) {
        errorEl.textContent = "Please enter a profile name.";
        errorEl.style.display = "block";
      }
      nameInput?.focus();
      return;
    }

    if (isLockEnabled && (!confirmedPin || confirmedPin.length !== 4)) {
      if (errorEl) {
        errorEl.textContent = "Please complete and confirm the 4-digit PIN.";
        errorEl.style.display = "block";
      }
      return;
    }

    const payload = {
      profile_name: profileName,
      avatar: window.profilesScreen.createScreen.selectedAvatar,
      is_mature: window.profilesScreen.createScreen.maturityRating !== "Kids",
    };
    if (isLockEnabled && confirmedPin) {
      payload.pin = confirmedPin;
    }

    window.loading.start();
    window.service.createProfile({
      data: payload,
      success: () => {
        // Refresh profiles list from server
        window.service.profiles({
          success: (res) => {
            window.loading.end();
            if (res && res.items) {
              window.session.storage.profiles = res.items;
              window.session.update();
            }
            window.profilesScreen.closeCreateProfileScreen();
            const menuEl = document.getElementById("settings-menu");
            if (menuEl) {
              menuEl.innerHTML = window.profilesScreen.getOptions();
            }
          },
          error: () => {
            window.loading.end();
            window.profilesScreen.closeCreateProfileScreen();
            window.profilesScreen.destroy();
            window.profilesScreen.init();
          },
        });
      },
      error: (err) => {
        window.loading.end();
        if (errorEl) {
          errorEl.textContent = err?.message || "Failed to create profile.";
          errorEl.style.display = "block";
        }
      },
    });
  },

  /**
   * Key down event handler for profile selection, full-screen PIN, Create Profile, and Avatar Picker.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    // 1. If Avatar Picker Modal is open
    if (window.profilesScreen.avatarPicker.active) {
      if (event.keyCode === 27 || window.tvKey?.IS_KEY_BACK(event.keyCode)) {
        window.profilesScreen.closeAvatarPickerModal();
        return;
      }

      const items = Array.from(document.querySelectorAll("#avatar-picker-modal .avatar-picker-item"));
      if (!items.length) return;

      const currentIdx = window.profilesScreen.avatarPicker.selectedIndex;
      const cols = 6;

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

      // Check if progressive PIN setup is active
      if (window.profilesScreen.createScreen.isLockEnabled && window.profilesScreen.createScreen.pinStep < 3) {
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

      if (event.keyCode === 8) {
        // Backspace
        window.profilesScreen.handlePinBackspace();
        return;
      }

      if (event.keyCode === 27 || window.tvKey?.IS_KEY_BACK(event.keyCode)) {
        // Escape / Back -> return to Profile Selector
        window.profilesScreen.closePinScreen();
        return;
      }

      // Numpad 3x4 Grid Navigation with Boundary Wrapping Focus Trapping
      const currentIdx = window.profilesScreen.pinScreen.selectedIndex;
      switch (event.keyCode) {
        case window.tvKey?.KEY_UP:
          if (currentIdx >= 3) {
            window.profilesScreen.setKeypadFocus(currentIdx - 3);
          } else {
            // Loop to bottom row
            window.profilesScreen.setKeypadFocus(currentIdx + 9);
          }
          break;
        case window.tvKey?.KEY_DOWN:
          if (currentIdx <= 8) {
            window.profilesScreen.setKeypadFocus(currentIdx + 3);
          } else {
            // Loop to top row
            window.profilesScreen.setKeypadFocus(currentIdx - 9);
          }
          break;
        case window.tvKey?.KEY_LEFT:
          if (currentIdx % 3 !== 0) {
            window.profilesScreen.setKeypadFocus(currentIdx - 1);
          } else {
            window.profilesScreen.setKeypadFocus(currentIdx + 2);
          }
          break;
        case window.tvKey?.KEY_RIGHT:
          if (currentIdx % 3 !== 2) {
            window.profilesScreen.setKeypadFocus(currentIdx + 1);
          } else {
            window.profilesScreen.setKeypadFocus(currentIdx - 2);
          }
          break;
        case 32:
        case window.tvKey?.KEY_ENTER:
        case window.tvKey?.KEY_PANEL_ENTER: {
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
              window.profilesScreen.pinScreen.currentPin = "";
              window.profilesScreen.updatePinDots();
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
        if (element?.id) {
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
