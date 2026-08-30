/**
 * Navigation Sidebar Menu Controller
 */

window.menu = {
  id: "menu-screen",
  options: [
    {
      id: "profilesScreen",
      label: "menu.profiles",
      icon: "fa-solid fa-user",
      tool: true,
      action: "profilesScreen.init",
      hidden: true,
    },
    {
      id: "search",
      label: "menu.search",
      icon: "fa-solid fa-magnifying-glass",
      action: "search.init",
    },
    {
      id: "home",
      label: "menu.home",
      icon: "fa-solid fa-house",
      action: "home.restart",
    },
    {
      id: "mylist",
      label: "menu.list",
      icon: "fa-solid fa-bookmark",
      action: "mylist.init",
    },
    {
      id: "historyScreen",
      label: "menu.history",
      icon: "fa-solid fa-clock-rotate-left",
      action: "historyScreen.init",
    },
    {
      id: "browse",
      label: "menu.browse",
      icon: "fa-regular fa-rectangle-list",
      action: "browse.init",
    },
    {
      id: "settings",
      label: "menu.settings",
      icon: "fa-solid fa-gear",
      tool: true,
      action: "settings.init",
    },
    {
      id: "logout",
      label: "menu.logout",
      icon: "fa-solid fa-sign-out",
      tool: true,
      event: "logout",
    },
  ],
  selected: 2,
  previous: null,
  isOpen: false,

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
      if (!element.hidden) {
        if (element.tool) {
          const isSelected = reset ? element.id === "settings" : index === window.menu.selected;
          toolOptions += `
          <a class="option ${isSelected ? "selected" : ""}">
            <i class="${element.icon}"></i>
            <p>${window.translate.go(element.label)}</p>
          </a>`;
        } else {
          const isSelected = !reset && index === window.menu.selected;
          menuOptions += `
          <a class="option ${isSelected ? "selected" : ""}">
            <i class="${element.icon}"></i>
            <p>${window.translate.go(element.label)}</p>
          </a>`;
        }
      }
    });

    const isPremium = window.session?.storage?.account?.premium;
    const avatar = window.session?.storage?.account?.avatar || "0001-cr-white-orange.png";
    const profileName = window.session?.get_active_profile_name() || "";

    menuElement.innerHTML = `
    <div class="content">
      <div class="options">
        <div class="option profile ${isPremium ? "premium" : ""}">
          <div class="avatar">
            <img src="https://static.crunchyroll.com/assets/avatar/170x170/${avatar}" alt="${profileName}">
          </div>
          <div class="profile-text">
            <div class="profile-name">
              <span id="active-profile-name">${profileName}</span>
              <i class="fa-solid fa-crown"></i>
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

    if (!document.getElementById(window.menu.id)) {
      document.body.appendChild(menuElement);
    }

    const menuNode = document.getElementById(window.menu.id);
    if (menuNode) {
      menuNode.addEventListener("mouseenter", () => {
        if (!window.menu.isOpen) {
          window.menu.open();
        }
      });

      menuNode.addEventListener("mouseleave", () => {
        if (window.menu.isOpen) {
          window.menu.close();
        }
      });

      menuNode.addEventListener("mouseover", (e) => {
        const option = e.target.closest(".option");
        if (option && menuNode.contains(option)) {
          const options = Array.from(menuNode.querySelectorAll(".option"));
          options.forEach((opt) => opt.classList.remove("focus"));
          option.classList.add("focus");
        }
      });

      menuNode.addEventListener("click", (e) => {
        const option = e.target.closest(".option");
        if (option && menuNode.contains(option)) {
          if (option.classList.contains("profile")) {
            window.profilesScreen.init();
            window.menu.close();
            return;
          }

          const options = Array.from(menuNode.querySelectorAll(".option"));
          const current = options.indexOf(option);
          const selectedOption = window.menu.options[current];

          if (selectedOption?.action) {
            const selected = options.findIndex((opt) => opt.classList.contains("selected"));
            options.forEach((opt) => opt.classList.remove("selected"));
            option.classList.add("selected");

            const targetModule = window[selectedOption.id];
            const previousModule = window[window.menu.options[selected]?.id];

            window.menu.previous = targetModule?.id || "";
            if (previousModule && typeof previousModule.destroy === "function") {
              previousModule.destroy();
            }

            const [moduleName, methodName] = selectedOption.action.split(".");
            if (window[moduleName] && typeof window[moduleName][methodName] === "function") {
              window[moduleName][methodName]();
            }
            window.menu.close();
          } else if (selectedOption?.event) {
            window.main.events[selectedOption.event]?.();
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
    const selectedEl = document.querySelector(`#${window.menu.id} .option.selected`);
    selectedEl?.classList.add("focus");
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
        window.exit.init();
        break;
      case window.tvKey?.KEY_UP: {
        const options = getOptions();
        const current = getFocusIdx();
        options.forEach((opt) => opt.classList.remove("focus"));
        const newCurrent = current > 0 ? current - 1 : current;
        options[newCurrent]?.classList.add("focus");
        break;
      }
      case window.tvKey?.KEY_DOWN: {
        const options = getOptions();
        const current = getFocusIdx();
        options.forEach((opt) => opt.classList.remove("focus"));
        const newCurrent = current < options.length - 1 ? current + 1 : current;
        options[newCurrent]?.classList.add("focus");
        break;
      }
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const options = getOptions();
        const current = getFocusIdx();
        const selectedOption = window.menu.options[current];

        if (selectedOption?.action) {
          const selected = options.findIndex((opt) => opt.classList.contains("selected"));
          options.forEach((opt) => opt.classList.remove("selected"));
          options[current]?.classList.add("selected");

          const targetModule = window[selectedOption.id];
          const previousModule = window[window.menu.options[selected]?.id];

          window.menu.previous = targetModule?.id || "";
          if (previousModule && typeof previousModule.destroy === "function") {
            previousModule.destroy();
          }

          const [moduleName, methodName] = selectedOption.action.split(".");
          if (window[moduleName] && typeof window[moduleName][methodName] === "function") {
            window[moduleName][methodName]();
          }
          window.menu.close();
        } else if (selectedOption?.event) {
          window.main.events[selectedOption.event]?.();
        }
        break;
      }
    }
  },
};
