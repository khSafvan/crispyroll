/**
 * Profiles Selection Screen Controller & PIN Verification
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
        if (window.profilesScreen.pinModal.active) return;
        const item = e.target.closest("li");
        if (item && menuEl.contains(item)) {
          const options = Array.from(menuEl.querySelectorAll("li"));
          options.forEach((opt) => opt.classList.remove("selected"));
          item.classList.add("selected");
        }
      });

      menuEl.addEventListener("click", (e) => {
        if (window.profilesScreen.pinModal.active) return;
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
    const el = document.getElementById(window.profilesScreen.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Generates profile list HTML markup with lock icons for PIN-protected profiles.
   * @returns {string}
   */
  getOptions: () => {
    const profiles = window.session?.storage?.profiles || [];

    return profiles
      .map((profile) => {
        const { is_selected, profile_name, username, profile_id } = profile;
        const isLocked = Boolean(profile.has_pin || profile.is_profile_locked);
        const avatar = profile.avatar || "0001-cr-white-orange.png";
        const displayName = (profile_name || username || "").trim().toUpperCase();

        return `<li class="${is_selected ? "selected active" : ""}" id="${profile_id}">
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
  },

  /**
   * Handles selecting a profile, gating PIN-locked profiles behind the PIN modal.
   * @param {string} profileId
   */
  selectProfile: (profileId) => {
    const profiles = window.session?.storage?.profiles || [];
    const profile = profiles.find((p) => p.profile_id === profileId);

    if (profile && (profile.has_pin || profile.is_profile_locked)) {
      window.profilesScreen.openPinModal(profile);
      return;
    }

    window.profilesScreen.executeSwitch(profileId);
  },

  /**
   * Executes the active profile switch.
   * @param {string} profileId
   */
  executeSwitch: (profileId) => {
    window.loading.start();
    window.session.switch_profile(
      {
        success: () => {
          window.loading.end();
          window.profilesScreen.destroy();
          window.menu.init();
          window.home.restart();
        },
        error: () => {
          window.loading.end();
        },
      },
      profileId
    );
  },

  /**
   * Opens the 4-digit PIN verification modal dialog.
   * @param {object} profile
   */
  openPinModal: (profile) => {
    window.profilesScreen.pinModal.active = true;
    window.profilesScreen.pinModal.profile = profile;
    window.profilesScreen.pinModal.currentPin = "";
    window.profilesScreen.pinModal.selectedIndex = 4; // Focus on '5'

    const avatar = profile.avatar || "0001-cr-white-orange.png";
    const displayName = (profile.profile_name || profile.username || "").trim().toUpperCase();

    const modalEl = document.createElement("div");
    modalEl.id = "profile-pin-modal";
    modalEl.className = "modal is-active";
    modalEl.innerHTML = `
      <div class="modal-background"></div>
      <div class="modal-card pin-modal-card box">
        <section class="modal-card-body has-text-centered">
          <div class="pin-profile-header">
            <img src="https://static.crunchyroll.com/assets/avatar/170x170/${avatar}" alt="${displayName}"/>
            <h3 class="title is-4 has-text-white mb-1">${displayName}</h3>
            <p class="subtitle is-6 has-text-grey-light">${window.translate.go("profiles.pin_message")}</p>
          </div>

          <div class="pin-dots-container" id="pin-dots">
            <div class="pin-dot" id="pin-dot-0"></div>
            <div class="pin-dot" id="pin-dot-1"></div>
            <div class="pin-dot" id="pin-dot-2"></div>
            <div class="pin-dot" id="pin-dot-3"></div>
          </div>

          <div class="pin-error-text" id="pin-error-message"></div>

          <div class="pin-keypad" id="pin-keypad">
            <button class="button is-rounded pin-key-btn" data-key="1">1</button>
            <button class="button is-rounded pin-key-btn" data-key="2">2</button>
            <button class="button is-rounded pin-key-btn" data-key="3">3</button>
            <button class="button is-rounded pin-key-btn" data-key="4">4</button>
            <button class="button is-rounded pin-key-btn" data-key="5">5</button>
            <button class="button is-rounded pin-key-btn" data-key="6">6</button>
            <button class="button is-rounded pin-key-btn" data-key="7">7</button>
            <button class="button is-rounded pin-key-btn" data-key="8">8</button>
            <button class="button is-rounded pin-key-btn" data-key="9">9</button>
            <button class="button is-rounded pin-key-btn is-dark" data-action="cancel">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <button class="button is-rounded pin-key-btn" data-key="0">0</button>
            <button class="button is-rounded pin-key-btn is-dark" data-action="backspace">
              <i class="fa-solid fa-delete-left"></i>
            </button>
          </div>

          <button class="button is-ghost is-small has-text-grey mt-2" id="pin-password-fallback">
            <span>${window.translate.go("profiles.pin_password_fallback")}</span>
          </button>
        </section>
      </div>`;

    document.body.appendChild(modalEl);

    // Mouse bindings on keypad buttons
    const keyBtns = Array.from(modalEl.querySelectorAll(".pin-key-btn"));
    keyBtns.forEach((btn, idx) => {
      btn.addEventListener("mouseenter", () => {
        window.profilesScreen.setKeypadFocus(idx);
      });
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

    const fallbackBtn = document.getElementById("pin-password-fallback");
    fallbackBtn?.addEventListener("click", () => {
      window.profilesScreen.promptPasswordFallback();
    });

    window.profilesScreen.setKeypadFocus(window.profilesScreen.pinModal.selectedIndex);
  },

  /**
   * Closes the PIN modal and restores profile selection focus.
   */
  closePinModal: () => {
    const modalEl = document.getElementById("profile-pin-modal");
    if (modalEl) modalEl.remove();
    window.profilesScreen.pinModal.active = false;
    window.profilesScreen.pinModal.profile = null;
    window.profilesScreen.pinModal.currentPin = "";
  },

  /**
   * Updates focus state across on-screen numpad grid buttons.
   * @param {number} index
   */
  setKeypadFocus: (index) => {
    window.profilesScreen.pinModal.selectedIndex = index;
    const btns = Array.from(document.querySelectorAll("#pin-keypad .pin-key-btn"));
    btns.forEach((btn, i) => {
      if (i === index) {
        btn.classList.add("selected", "is-focused");
      } else {
        btn.classList.remove("selected", "is-focused");
      }
    });
  },

  /**
   * Processes a numeric digit input for the PIN.
   * @param {string} digit
   */
  handlePinInput: (digit) => {
    if (window.profilesScreen.pinModal.currentPin.length >= 4) return;

    window.profilesScreen.pinModal.currentPin += digit;
    window.profilesScreen.updatePinDots();

    if (window.profilesScreen.pinModal.currentPin.length === 4) {
      window.profilesScreen.verifyPin();
    }
  },

  /**
   * Deletes the last entered PIN digit.
   */
  handlePinBackspace: () => {
    if (window.profilesScreen.pinModal.currentPin.length > 0) {
      window.profilesScreen.pinModal.currentPin = window.profilesScreen.pinModal.currentPin.slice(
        0,
        -1
      );
      window.profilesScreen.updatePinDots();
      const errorEl = document.getElementById("pin-error-message");
      if (errorEl) errorEl.textContent = "";
    }
  },

  /**
   * Updates visual fill state of the 4 PIN dots.
   */
  updatePinDots: () => {
    const pinLength = window.profilesScreen.pinModal.currentPin.length;
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`pin-dot-${i}`);
      if (dot) {
        if (i < pinLength) {
          dot.classList.add("is-filled");
        } else {
          dot.classList.remove("is-filled");
        }
      }
    }
  },

  /**
   * Verifies the entered 4-digit PIN against Crunchyroll servers.
   */
  verifyPin: () => {
    const pin = window.profilesScreen.pinModal.currentPin;
    const profile = window.profilesScreen.pinModal.profile;
    if (!profile) return;

    const errorEl = document.getElementById("pin-error-message");
    if (errorEl) errorEl.textContent = "";

    window.service.verifyProfilePin({
      data: {
        profile_id: profile.profile_id,
        pin,
      },
      success: () => {
        window.profilesScreen.closePinModal();
        window.profilesScreen.executeSwitch(profile.profile_id);
      },
      error: () => {
        // Shake indicator on rejection
        const dotsEl = document.getElementById("pin-dots");
        if (dotsEl) {
          dotsEl.classList.remove("shake");
          void dotsEl.offsetWidth; // Trigger DOM reflow for CSS animation
          dotsEl.classList.add("shake");
        }

        if (errorEl) {
          errorEl.textContent = window.translate.go("profiles.pin_error");
        }

        window.profilesScreen.pinModal.currentPin = "";
        window.profilesScreen.updatePinDots();
      },
    });
  },

  /**
   * Password fallback option if user forgot their PIN.
   */
  promptPasswordFallback: () => {
    const enteredPassword = window.prompt("Enter your Crunchyroll account password:");
    if (!enteredPassword) return;

    const username = window.session?.storage?.account?.username || "";
    window.loading.start();
    window.session.start(username, enteredPassword, {
      success: () => {
        window.loading.end();
        const profile = window.profilesScreen.pinModal.profile;
        window.profilesScreen.closePinModal();
        if (profile) {
          window.profilesScreen.executeSwitch(profile.profile_id);
        }
      },
      error: () => {
        window.loading.end();
        const errorEl = document.getElementById("pin-error-message");
        if (errorEl) {
          errorEl.textContent = "Incorrect account password.";
        }
      },
    });
  },

  /**
   * Key down event handler for profile selection & PIN keypad modal navigation.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    // 1. If PIN Modal is open, route keys to keypad / numbers
    if (window.profilesScreen.pinModal.active) {
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
        // Escape / Back
        window.profilesScreen.closePinModal();
        return;
      }

      // Numpad 3x4 Grid Navigation (Left, Right, Up, Down, Enter)
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
        case 32: // Space
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

    // 2. Base Profile Carousel Navigation
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
      case 32: // Space
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
