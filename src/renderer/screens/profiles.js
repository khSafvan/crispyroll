/**
 * Profiles Selection Screen Controller, PIN Verification & Profile Creation
 */

window.profilesScreen = {
  id: "profiles-screen",
  pinModal: {
    active: false,
    profile: null,
    currentPin: "",
    selectedIndex: 4, // default focus on '5'
    usePasswordMode: false,
  },
  createModal: {
    active: false,
    selectedAvatar: "0001-cr-white-orange.png",
    avatarPresets: [
      "0001-cr-white-orange.png",
      "0002-cr-black-orange.png",
      "0003-cr-orange-white.png",
      "0004-cr-blue-white.png",
      "0005-cr-pink-white.png",
      "0006-cr-purple-white.png",
    ],
    avatarIndex: 0,
    focusedElement: 0, // 0: avatar row, 1: name input, 2: pin input, 3: cancel, 4: submit
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
        <div class="legend">${window.translate.go("profiles.label")}</div>
        <ul class="options" id="settings-menu">${window.profilesScreen.getOptions()}</ul>
      </div>
    </div>`;

    window.menu.destroy();
    document.body.appendChild(profilesElement);
    window.main.state = window.profilesScreen.id;

    // Mouse click and hover bindings for profiles
    const menuEl = document.getElementById("settings-menu");
    if (menuEl) {
      menuEl.addEventListener("mouseover", (e) => {
        if (window.profilesScreen.pinModal.active || window.profilesScreen.createModal.active) return;
        const item = e.target.closest("li");
        if (item && menuEl.contains(item)) {
          const options = Array.from(menuEl.querySelectorAll("li"));
          options.forEach((opt) => opt.classList.remove("selected"));
          item.classList.add("selected");
        }
      });

      menuEl.addEventListener("click", (e) => {
        if (window.profilesScreen.pinModal.active || window.profilesScreen.createModal.active) return;
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
    window.profilesScreen.closePinModal();
    window.profilesScreen.closeCreateProfileModal();
    const el = document.getElementById(window.profilesScreen.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Generates profile list HTML markup with lock icons and add-profile card.
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

        return `<li class="${is_selected ? "selected active" : ""}" id="${targetId}" data-locked="${isLocked ? "true" : "false"}">
        <div class="profile-avatar-wrapper">
          <img src="https://static.crunchyroll.com/assets/avatar/170x170/${avatar}" alt="${displayName}"/>
          ${
            isLocked
              ? `<span class="profile-lock-badge"><i class="fa-solid fa-lock"></i></span>`
              : ""
          }
        </div>
        <span>${displayName}</span>
      </li>`;
      })
      .join("");

    // If account has fewer than 5 profiles, show "Add Profile" card
    let addProfileItem = "";
    if (profiles.length < 5) {
      addProfileItem = `
      <li class="add-profile-card" id="btn-add-profile">
        <div class="profile-avatar-wrapper add-avatar-wrapper">
          <div class="add-profile-icon"><i class="fa-solid fa-plus"></i></div>
        </div>
        <span>${window.translate.go("profiles.add_profile") || "ADD PROFILE"}</span>
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
      window.profilesScreen.openCreateProfileModal();
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
      window.profilesScreen.openPinModal(
        profile || {
          profile_id: profileId,
          profile_name: cardEl?.querySelector("span")?.textContent || "PROFILE",
          avatar: "0001-cr-white-orange.png",
        }
      );
      return;
    }

    window.profilesScreen.executeSwitch(profileId);
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
   * Opens the Create Profile Modal dialog.
   */
  openCreateProfileModal: () => {
    window.profilesScreen.createModal.active = true;
    window.profilesScreen.createModal.avatarIndex = 0;
    window.profilesScreen.createModal.selectedAvatar =
      window.profilesScreen.createModal.avatarPresets[0];
    window.profilesScreen.createModal.focusedElement = 1; // default focus on Name input

    const modal = document.createElement("div");
    modal.id = "create-profile-modal";

    const avatarItems = window.profilesScreen.createModal.avatarPresets
      .map(
        (img, idx) => `
      <div class="avatar-picker-item ${idx === 0 ? "selected" : ""}" data-avatar="${img}" data-idx="${idx}">
        <img src="https://static.crunchyroll.com/assets/avatar/170x170/${img}" alt="Avatar ${idx + 1}"/>
      </div>`
      )
      .join("");

    modal.innerHTML = `
    <div class="create-profile-card">
      <div class="modal-title">${window.translate.go("profiles.create_title") || "Create Profile"}</div>
      
      <div class="field">
        <label class="label has-text-grey-light mb-2">Choose Avatar</label>
        <div class="avatar-picker-row" id="create-avatar-row">
          ${avatarItems}
        </div>
      </div>

      <div class="field">
        <label class="label has-text-grey-light mb-2">Profile Name</label>
        <input class="input is-medium is-rounded" type="text" id="create-profile-name" placeholder="Enter profile name" maxlength="30" autofocus>
      </div>

      <div class="field">
        <label class="label has-text-grey-light mb-2">Optional 4-Digit PIN</label>
        <input class="input is-medium is-rounded" type="password" id="create-profile-pin" placeholder="Leave empty for no PIN" maxlength="4" pattern="[0-9]*">
      </div>

      <div class="create-profile-actions">
        <button class="create-profile-btn btn-cancel" id="btn-cancel-create">Cancel</button>
        <button class="create-profile-btn btn-submit" id="btn-submit-create">Create</button>
      </div>

      <div class="notification is-danger is-light mt-2" id="create-profile-error" style="display:none; font-size:13px; padding:8px 12px;"></div>
    </div>`;

    document.body.appendChild(modal);

    // Mouse handlers for modal
    const nameInput = document.getElementById("create-profile-name");
    const cancelBtn = document.getElementById("btn-cancel-create");
    const submitBtn = document.getElementById("btn-submit-create");

    nameInput?.focus();

    cancelBtn?.addEventListener("click", () => window.profilesScreen.closeCreateProfileModal());
    submitBtn?.addEventListener("click", () => window.profilesScreen.submitCreateProfile());

    const avatarElements = Array.from(modal.querySelectorAll(".avatar-picker-item"));
    avatarElements.forEach((el) => {
      el.addEventListener("click", () => {
        avatarElements.forEach((a) => a.classList.remove("selected"));
        el.classList.add("selected");
        window.profilesScreen.createModal.selectedAvatar = el.getAttribute("data-avatar");
        window.profilesScreen.createModal.avatarIndex = parseInt(el.getAttribute("data-idx") || "0", 10);
      });
    });
  },

  /**
   * Closes the Create Profile Modal dialog.
   */
  closeCreateProfileModal: () => {
    window.profilesScreen.createModal.active = false;
    const modal = document.getElementById("create-profile-modal");
    if (modal) {
      document.body.removeChild(modal);
    }
  },

  /**
   * Submits new profile creation to the Crunchyroll API.
   */
  submitCreateProfile: () => {
    const nameInput = document.getElementById("create-profile-name");
    const pinInput = document.getElementById("create-profile-pin");
    const errorEl = document.getElementById("create-profile-error");

    const profileName = nameInput?.value?.trim() || "";
    const pin = pinInput?.value?.trim() || "";

    if (!profileName) {
      if (errorEl) {
        errorEl.textContent = "Please enter a profile name.";
        errorEl.style.display = "block";
      }
      nameInput?.focus();
      return;
    }

    if (pin && !/^\d{4}$/.test(pin)) {
      if (errorEl) {
        errorEl.textContent = "PIN must be exactly 4 digits.";
        errorEl.style.display = "block";
      }
      pinInput?.focus();
      return;
    }

    const payload = {
      profile_name: profileName,
      avatar: window.profilesScreen.createModal.selectedAvatar,
      is_mature: true,
    };
    if (pin) {
      payload.pin = pin;
    }

    window.loading.start();
    window.service.createProfile({
      data: payload,
      success: () => {
        // Refresh profiles from server
        window.service.profiles({
          success: (res) => {
            window.loading.end();
            if (res && res.items) {
              window.session.storage.profiles = res.items;
              window.session.update();
            }
            window.profilesScreen.closeCreateProfileModal();
            const menuEl = document.getElementById("settings-menu");
            if (menuEl) {
              menuEl.innerHTML = window.profilesScreen.getOptions();
            }
          },
          error: () => {
            window.loading.end();
            window.profilesScreen.closeCreateProfileModal();
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
   * Opens PIN keypad modal for profile authentication.
   * @param {object} profile
   */
  openPinModal: (profile) => {
    window.profilesScreen.pinModal.active = true;
    window.profilesScreen.pinModal.profile = profile;
    window.profilesScreen.pinModal.currentPin = "";
    window.profilesScreen.pinModal.selectedIndex = 4; // default focus on '5'

    const modal = document.createElement("div");
    modal.id = "pin-modal-overlay";
    modal.className = "modal is-active";

    const displayName = (profile.profile_name || profile.username || "PROFILE").trim().toUpperCase();
    const avatar = profile.avatar || "0001-cr-white-orange.png";

    modal.innerHTML = `
    <div class="modal-background" style="background: rgba(13, 13, 17, 0.88);"></div>
    <div class="modal-card pin-modal-card box">
      <div class="pin-profile-header has-text-centered">
        <img src="https://static.crunchyroll.com/assets/avatar/170x170/${avatar}" alt="${displayName}"/>
        <h3 class="title is-4 has-text-white mb-1">${displayName}</h3>
        <p class="subtitle is-6 has-text-grey">${window.translate.go("profiles.enter_pin") || "Enter 4-Digit PIN"}</p>
      </div>

      <div class="pin-dots-container" id="pin-dots">
        <div class="pin-dot" id="dot-0"></div>
        <div class="pin-dot" id="dot-1"></div>
        <div class="pin-dot" id="dot-2"></div>
        <div class="pin-dot" id="dot-3"></div>
      </div>

      <div class="has-text-centered pin-error-text" id="pin-error-message"></div>

      <div class="pin-keypad" id="pin-keypad">
        <button class="button pin-key-btn" data-key="1">1</button>
        <button class="button pin-key-btn" data-key="2">2</button>
        <button class="button pin-key-btn" data-key="3">3</button>
        <button class="button pin-key-btn" data-key="4">4</button>
        <button class="button pin-key-btn" data-key="5">5</button>
        <button class="button pin-key-btn" data-key="6">6</button>
        <button class="button pin-key-btn" data-key="7">7</button>
        <button class="button pin-key-btn" data-key="8">8</button>
        <button class="button pin-key-btn" data-key="9">9</button>
        <button class="button pin-key-btn" data-action="cancel"><i class="fa-solid fa-xmark"></i></button>
        <button class="button pin-key-btn" data-key="0">0</button>
        <button class="button pin-key-btn" data-action="backspace"><i class="fa-solid fa-delete-left"></i></button>
      </div>
    </div>`;

    document.body.appendChild(modal);
    window.profilesScreen.setKeypadFocus(4);

    // Mouse click handlers on PIN keypad buttons
    const btns = modal.querySelectorAll(".pin-key-btn");
    btns.forEach((btn, idx) => {
      btn.addEventListener("mouseenter", () => window.profilesScreen.setKeypadFocus(idx));
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-key");
        const action = btn.getAttribute("data-action");
        if (key !== null) {
          window.profilesScreen.handlePinInput(key);
        } else if (action === "backspace") {
          window.profilesScreen.handlePinBackspace();
        } else if (action === "cancel") {
          window.profilesScreen.closePinModal();
        }
      });
    });
  },

  /**
   * Sets focused button in PIN keypad grid.
   * @param {number} index
   */
  setKeypadFocus: (index) => {
    window.profilesScreen.pinModal.selectedIndex = index;
    const btns = document.querySelectorAll("#pin-keypad .pin-key-btn");
    btns.forEach((btn, idx) => {
      if (idx === index) {
        btn.classList.add("selected", "is-focused");
      } else {
        btn.classList.remove("selected", "is-focused");
      }
    });
  },

  /**
   * Appends digit to PIN and triggers verification upon 4 digits.
   * @param {string} digit
   */
  handlePinInput: (digit) => {
    if (window.profilesScreen.pinModal.currentPin.length < 4) {
      window.profilesScreen.pinModal.currentPin += digit;
      window.profilesScreen.updatePinDots();

      if (window.profilesScreen.pinModal.currentPin.length === 4) {
        window.profilesScreen.verifyPin();
      }
    }
  },

  /**
   * Removes last digit from PIN.
   */
  handlePinBackspace: () => {
    if (window.profilesScreen.pinModal.currentPin.length > 0) {
      window.profilesScreen.pinModal.currentPin = window.profilesScreen.pinModal.currentPin.slice(
        0,
        -1
      );
      window.profilesScreen.updatePinDots();
      const errEl = document.getElementById("pin-error-message");
      if (errEl) errEl.textContent = "";
    }
  },

  /**
   * Updates filled/empty indicator dots in PIN modal.
   */
  updatePinDots: () => {
    const len = window.profilesScreen.pinModal.currentPin.length;
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
   * Closes PIN modal.
   */
  closePinModal: () => {
    window.profilesScreen.pinModal.active = false;
    window.profilesScreen.pinModal.currentPin = "";
    const modal = document.getElementById("pin-modal-overlay");
    if (modal) {
      document.body.removeChild(modal);
    }
  },

  /**
   * Verifies PIN against Crunchyroll service.
   */
  verifyPin: () => {
    const { profile, currentPin } = window.profilesScreen.pinModal;
    const targetId = profile?.profile_id || profile?.id;
    const errorEl = document.getElementById("pin-error-message");
    const dotsContainer = document.getElementById("pin-dots");

    if (errorEl) errorEl.textContent = "";

    if (window.service?.verifyProfilePin) {
      window.service.verifyProfilePin({
        data: {
          profile_id: targetId,
          pin: currentPin,
        },
        success: () => {
          window.profilesScreen.closePinModal();
          window.profilesScreen.executeSwitch(targetId, currentPin);
        },
        error: (err) => {
          if (dotsContainer) {
            dotsContainer.classList.add("shake");
            setTimeout(() => dotsContainer.classList.remove("shake"), 450);
          }
          window.profilesScreen.pinModal.currentPin = "";
          window.profilesScreen.updatePinDots();
          if (errorEl) {
            errorEl.textContent = err?.message || window.translate?.go("profiles.pin_error") || "Incorrect PIN";
          }
        },
      });
    } else {
      window.profilesScreen.closePinModal();
      window.profilesScreen.executeSwitch(targetId, currentPin);
    }
  },

  /**
   * Key down event handler for profile selection, PIN modal, and Create Profile modal.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    // 1. If Create Profile Modal is open
    if (window.profilesScreen.createModal.active) {
      if (event.keyCode === 27 || window.tvKey?.IS_KEY_BACK(event.keyCode)) {
        window.profilesScreen.closeCreateProfileModal();
        return;
      }

      if (event.keyCode === 13) {
        // Enter submits form
        window.profilesScreen.submitCreateProfile();
        return;
      }
      return;
    }

    // 2. If PIN Modal is open, route keys to keypad / numbers
    if (window.profilesScreen.pinModal.active) {
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
        window.profilesScreen.handlePinBackspace();
        return;
      }

      if (event.keyCode === 27 || window.tvKey?.IS_KEY_BACK(event.keyCode)) {
        window.profilesScreen.closePinModal();
        return;
      }

      const currentIdx = window.profilesScreen.pinModal.selectedIndex;
      switch (event.keyCode) {
        case window.tvKey?.KEY_UP:
          if (currentIdx >= 3) {
            window.profilesScreen.setKeypadFocus(currentIdx - 3);
          }
          break;
        case window.tvKey?.KEY_DOWN:
          if (currentIdx <= 8) {
            window.profilesScreen.setKeypadFocus(currentIdx + 3);
          }
          break;
        case window.tvKey?.KEY_LEFT:
          if (currentIdx % 3 !== 0) {
            window.profilesScreen.setKeypadFocus(currentIdx - 1);
          }
          break;
        case window.tvKey?.KEY_RIGHT:
          if (currentIdx % 3 !== 2) {
            window.profilesScreen.setKeypadFocus(currentIdx + 1);
          }
          break;
        case 32:
        case window.tvKey?.KEY_ENTER:
        case window.tvKey?.KEY_PANEL_ENTER: {
          const btns = Array.from(document.querySelectorAll("#pin-keypad .pin-key-btn"));
          const activeBtn = btns[currentIdx];
          if (activeBtn) {
            const key = activeBtn.getAttribute("data-key");
            const action = activeBtn.getAttribute("data-action");
            if (key !== null) {
              window.profilesScreen.handlePinInput(key);
            } else if (action === "backspace") {
              window.profilesScreen.handlePinBackspace();
            } else if (action === "cancel") {
              window.profilesScreen.closePinModal();
            }
          }
          break;
        }
      }
      return;
    }

    // 3. Base Profile Carousel Navigation
    const options = Array.from(document.querySelectorAll("#profiles-screen .options li"));
    const selectedEl = document.querySelector("#profiles-screen .options li.selected");
    const current = selectedEl ? options.indexOf(selectedEl) : 0;

    switch (event.keyCode) {
      case window.tvKey?.KEY_RIGHT: {
        options.forEach((opt) => opt.classList.remove("selected"));
        const newCurrent = current < options.length - 1 ? current + 1 : current;
        options[newCurrent]?.classList.add("selected");
        break;
      }
      case window.tvKey?.KEY_LEFT: {
        options.forEach((opt) => opt.classList.remove("selected"));
        const newCurrent = current > 0 ? current - 1 : current;
        options[newCurrent]?.classList.add("selected");
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
    }
  },
};
