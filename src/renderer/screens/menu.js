/**
 * Navigation Sidebar Menu Controller
 */

window.menu = {
  id: "menu-screen",
  options: [
    {
      id: "search",
      label: "menu.search",
      iconName: "magnifyingGlass",
      action: "search.init",
    },
    {
      id: "home",
      label: "menu.home",
      iconName: "house",
      action: "home.restart",
    },
    {
      id: "browse",
      label: "menu.browse",
      iconName: "squaresFour",
      action: "browse.init",
    },
    {
      id: "mylist",
      label: "menu.list",
      iconName: "bookmarkSimple",
      action: "mylist.init",
    },
    {
      id: "settings",
      label: "menu.settings",
      iconName: "gearSix",
      tool: true,
      action: "settings.init",
    },
    {
      id: "quit",
      label: "menu.quit",
      iconName: "power",
      tool: true,
      event: "quit",
    },
  ],
  selected: 1, // Default index for 'home'
  previous: null,
  isOpen: false,

  /**
   * Returns inline SVG for an option based on its active/focused weight.
   * Explicitly uses Phosphor icons for all navigation sidebar items.
   * @param {string} iconName
   * @param {boolean} isFilled
   * @returns {string} Inline SVG string
   */
  getOptionIcon: (iconName, isFilled = false) => {
    if (window.icons?.phosphor?.get) {
      return window.icons.phosphor.get(iconName, {
        weight: isFilled ? "fill" : "regular",
        size: 22,
        className: "menu-ph-icon",
      });
    }
    if (window.icons?.get) {
      return window.icons.get(iconName, {
        weight: isFilled ? "fill" : "regular",
        size: 22,
        className: "menu-ph-icon",
      });
    }
    return "";
  },

  /**
   * Updates icon weights across all sidebar options based on active/focused state.
   */
  updateIconWeights: () => {
    const menuEl = document.getElementById(window.menu.id);
    if (!menuEl) return;

    const optionNodes = menuEl.querySelectorAll(".option[data-id]");
    optionNodes.forEach((node) => {
      const optId = node.getAttribute("data-id");
      const opt = window.menu.options.find((o) => o.id === optId);
      if (opt && opt.iconName) {
        const isFilled = node.classList.contains("selected") || node.classList.contains("focus");
        const iconContainer = node.querySelector(".option-icon-wrapper");
        if (iconContainer) {
          iconContainer.innerHTML = window.menu.getOptionIcon(opt.iconName, isFilled);
        }
      }
    });
  },

  /**
   * Initializes and renders sidebar navigation menu.
   * @param {boolean} [reset=false]
   */
  init: (reset = false) => {
    const menuElement = document.createElement("div");
    menuElement.id = window.menu.id;

    let toolOptions = "";
    let menuOptions = "";

    window.menu.options.forEach((element, index) => {
      if (element.tool) {
        const isSelected = reset ? element.id === "settings" : index === window.menu.selected;
        const iconSvg = window.menu.getOptionIcon(element.iconName, isSelected);
        toolOptions += `
        <a class="option ${isSelected ? "selected" : ""}" data-id="${element.id}">
          <span class="option-icon-wrapper">${iconSvg}</span>
          <p>${window.translate.go(element.label)}</p>
        </a>`;
      } else {
        const isSelected = !reset && index === window.menu.selected;
        const iconSvg = window.menu.getOptionIcon(element.iconName, isSelected);
        menuOptions += `
        <a class="option ${isSelected ? "selected" : ""}" data-id="${element.id}">
          <span class="option-icon-wrapper">${iconSvg}</span>
          <p>${window.translate.go(element.label)}</p>
        </a>`;
      }
    });

    const isPremium = window.session?.storage?.account?.premium;
    const avatar = window.session?.storage?.account?.avatar || "0001-cr-white-orange.png";
    const rawProfileName = window.session?.get_active_profile_name() || "";
    const profileName = rawProfileName
      ? rawProfileName
          .toLowerCase()
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "";
    const crownSvg = window.icons?.get("crown", { weight: "fill", size: 14, className: "profile-crown-icon" }) || "";

    menuElement.innerHTML = `
    <div class="content">
      <div class="options">
        <div class="option profile ${isPremium ? "premium" : ""}" data-id="profile">
          <div class="avatar">
            <img src="https://static.crunchyroll.com/assets/avatar/170x170/${avatar}" alt="${profileName}">
          </div>
          <div class="profile-text">
            <div class="profile-name">
              <span id="active-profile-name">${profileName}</span>
              ${crownSvg}
            </div>
            <div class="profile-change">${window.translate.go("profiles.change")}</div>
          </div>
        </div>
        ${menuOptions}
      </div>
      <div class="tools">
        ${toolOptions}
      </div>
    </div>`;

    const existing = document.getElementById(window.menu.id);
    if (existing) {
      existing.remove();
    }
    document.body.appendChild(menuElement);

    const menuNode = document.getElementById(window.menu.id);
    if (menuNode) {
      menuNode.addEventListener("click", (e) => {
        const option = e.target.closest(".option");
        if (option && menuNode.contains(option)) {
          const optionId = option.getAttribute("data-id");

          if (optionId === "profile") {
            window.menu.close();
            window.profilesScreen.init();
            return;
          }

          const selectedOption = window.menu.options.find((o) => o.id === optionId);
          if (!selectedOption) return;

          if (selectedOption.action) {
            const allNavOptions = Array.from(menuNode.querySelectorAll(".option:not(.profile)"));
            allNavOptions.forEach((opt) => opt.classList.remove("selected"));
            option.classList.add("selected");

            const optIdx = window.menu.options.findIndex((o) => o.id === optionId);
            if (optIdx >= 0) {
              window.menu.selected = optIdx;
            }

            const targetModule = window[selectedOption.id];
            window.menu.previous = targetModule?.id || "";

            const [moduleName, methodName] = selectedOption.action.split(".");
            if (window[moduleName] && typeof window[moduleName][methodName] === "function") {
              window[moduleName][methodName]();
            }
            window.menu.updateIconWeights();
            window.menu.close();
          } else if (selectedOption.event === "quit" || selectedOption.id === "quit") {
            window.menu.close();
            window.exit.init(false);
          } else if (selectedOption.event === "logout") {
            window.menu.close();
            window.main.events.logout();
          }
        }
      });
    }
  },

  destroy: () => {
    if (window.menu.isOpen) {
      window.menu.close();
    }
    const el = document.getElementById(window.menu.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Opens sidebar drawer.
   */
  open: () => {
    window.menu.isOpen = true;
    document.body.classList.add("open-menu");
    const selectedEl =
      document.querySelector(`#${window.menu.id} .option.selected`) ||
      document.querySelector(`#${window.menu.id} .option`);
    selectedEl?.classList.add("focus");
    window.menu.updateIconWeights();
    window.menu.previous = window.main.state;
    window.main.state = window.menu.id;
  },

  /**
   * Closes sidebar drawer.
   */
  close: () => {
    window.menu.isOpen = false;
    document.body.classList.remove("open-menu");
    const options = document.querySelectorAll(`#${window.menu.id} .option`);
    options.forEach((opt) => opt.classList.remove("focus"));
    window.menu.updateIconWeights();
    window.main.state = window.menu.previous;
  },

  /**
   * Key down event handler for sidebar menu.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    const getOptions = () => Array.from(document.querySelectorAll(`#${window.menu.id} .option`));
    const getFocusIdx = () => {
      const opts = getOptions();
      const focusEl = document.querySelector(`#${window.menu.id} .option.focus`);
      return focusEl ? opts.indexOf(focusEl) : 0;
    };

    switch (event.keyCode) {
      case window.tvKey?.KEY_RIGHT:
        window.menu.close();
        break;
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.menu.close();
        break;
      case window.tvKey?.KEY_UP: {
        const options = getOptions();
        const current = getFocusIdx();
        options.forEach((opt) => opt.classList.remove("focus"));
        const newCurrent = current > 0 ? current - 1 : current;
        options[newCurrent]?.classList.add("focus");
        window.menu.updateIconWeights();
        break;
      }
      case window.tvKey?.KEY_DOWN: {
        const options = getOptions();
        const current = getFocusIdx();
        options.forEach((opt) => opt.classList.remove("focus"));
        const newCurrent = current < options.length - 1 ? current + 1 : current;
        options[newCurrent]?.classList.add("focus");
        window.menu.updateIconWeights();
        break;
      }
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const options = getOptions();
        const current = getFocusIdx();
        const option = options[current];
        if (!option) break;

        const optionId = option.getAttribute("data-id");
        if (optionId === "profile") {
          window.menu.close();
          window.profilesScreen.init();
          break;
        }

        const selectedOption = window.menu.options.find((o) => o.id === optionId);
        if (!selectedOption) break;

        if (selectedOption.action) {
          const allNavOptions = Array.from(document.querySelectorAll(`#${window.menu.id} .option:not(.profile)`));
          allNavOptions.forEach((opt) => opt.classList.remove("selected"));
          option.classList.add("selected");

          const optIdx = window.menu.options.findIndex((o) => o.id === optionId);
          if (optIdx >= 0) {
            window.menu.selected = optIdx;
          }

          const targetModule = window[selectedOption.id];
          window.menu.previous = targetModule?.id || "";

          const [moduleName, methodName] = selectedOption.action.split(".");
          if (window[moduleName] && typeof window[moduleName][methodName] === "function") {
            window[moduleName][methodName]();
          }
          window.menu.updateIconWeights();
          window.menu.close();
        } else if (selectedOption.event === "quit" || selectedOption.id === "quit") {
          window.menu.close();
          window.exit.init(false);
        } else if (selectedOption.event === "logout") {
          window.menu.close();
          window.main.events.logout();
        }
        break;
      }
    }
  },
};
