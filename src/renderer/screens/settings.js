/**
 * Settings Screen Controller
 */

const CONTROLLER_KEY = "controllerSupport";

window.settings = {
  id: "settings-screen",
  isDetails: false,
  options: [
    {
      id: "applicationlang",
      label: "settings.menu.application_lang",
      type: "list",
    },
    {
      id: "audiolang",
      label: "settings.menu.audio_lang",
      type: "list",
    },
    {
      id: "subtitlelang",
      label: "settings.menu.subtitle_lang",
      type: "list",
    },
    {
      id: "videoquality",
      label: "settings.menu.video_quality",
      type: "list",
    },
    {
      id: "mature",
      label: "settings.menu.mature",
      type: "list",
    },
    {
      id: "controller",
      label: "settings.menu.controller",
      type: "list",
    },
    {
      id: "about",
      label: "settings.menu.about",
      type: "html",
    },
  ],
  qualities: {
    auto: "Auto",
    240: "240p",
    360: "360p",
    480: "480p",
    720: "720p HD",
    1080: "1080p HD",
  },
  bool: {
    M2: "NO",
    M3: "YES",
  },
  controllerSupport: {
    DISABLE: "Disable Game Controller Support",
    ENABLE: "Enable Game Controller Support",
  },
  previous: null,

  /**
   * Initializes and renders settings screen.
   */
  init: () => {
    const settingsElement = document.createElement("div");
    settingsElement.id = window.settings.id;

    settingsElement.innerHTML = `
      <div class="content settings-container">
        <div class="columns is-gapless settings-columns">
          <div class="column is-5 settings-menu-col">
            <aside class="menu">
              <ul class="menu-list options" id="settings-menu">${window.settings.generateMenu()}</ul>
            </aside>
          </div>
          <div class="column is-7 settings-details-col" id="settings-details"></div>
        </div>
      </div>`;

    document.body.appendChild(settingsElement);
    window.settings.details.show(window.settings.options[0]);

    // Mouse click and hover handlers for left menu
    const menuEl = document.getElementById("settings-menu");
    if (menuEl) {
      menuEl.addEventListener("mouseover", (e) => {
        const item = e.target.closest("li");
        if (item && menuEl.contains(item)) {
          const options = Array.from(menuEl.querySelectorAll("li"));
          const idx = options.indexOf(item);
          options.forEach((opt) => opt.classList.remove("selected", "active"));
          item.classList.add("selected");
          window.settings.isDetails = false;
          window.settings.details.show(window.settings.options[idx]);
        }
      });

      menuEl.addEventListener("click", (e) => {
        const item = e.target.closest("li");
        if (item && menuEl.contains(item)) {
          const options = Array.from(menuEl.querySelectorAll("li"));
          const idx = options.indexOf(item);
          options.forEach((opt) => opt.classList.remove("selected"));
          item.classList.add("active");
          window.settings.isDetails = true;
          window.settings.details.show(window.settings.options[idx]);
          window.settings.details[window.settings.options[idx]?.type]?.move(0);
        }
      });
    }

    // Mouse click handlers for detail list items
    const detailsEl = document.getElementById("settings-details");
    if (detailsEl) {
      detailsEl.addEventListener("click", (e) => {
        const item = e.target.closest("li");
        if (item && detailsEl.contains(item)) {
          const menuOptions = Array.from(document.querySelectorAll("#settings-menu li"));
          const activeMenu = document.querySelector(
            "#settings-menu li.active, #settings-menu li.selected"
          );
          const currentMenuIdx = activeMenu ? menuOptions.indexOf(activeMenu) : 0;
          const opt = window.settings.options[currentMenuIdx];

          const detailItems = Array.from(detailsEl.querySelectorAll("li"));
          const detailIdx = detailItems.indexOf(item);

          detailItems.forEach((it) => it.classList.remove("selected", "active"));
          item.classList.add("selected", "active");

          if (opt?.id) {
            window.settings.actions[opt.id]?.(detailIdx);
          }
        }
      });
    }
  },

  destroy: () => {
    window.settings.isDetails = false;
    const el = document.getElementById(window.settings.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Key down event handler for settings screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    const getMenuOptions = () => Array.from(document.querySelectorAll("#settings-menu li"));
    const getActiveMenuIdx = () => {
      const opts = getMenuOptions();
      const active = document.querySelector("#settings-menu li.active");
      return active ? opts.indexOf(active) : 0;
    };
    const getSelectedMenuIdx = () => {
      const opts = getMenuOptions();
      const selected = document.querySelector("#settings-menu li.selected");
      return selected ? opts.indexOf(selected) : 0;
    };

    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.menu.open();
        break;
      case window.tvKey?.KEY_UP:
        if (window.settings.isDetails) {
          const current = getActiveMenuIdx();
          window.settings.details[window.settings.options[current]?.type]?.move(-1);
        } else {
          const options = getMenuOptions();
          const current = getSelectedMenuIdx();

          options.forEach((opt) => opt.classList.remove("selected"));
          const newCurrent = current > 0 ? current - 1 : current;
          options[newCurrent]?.classList.add("selected");
          window.settings.details.show(window.settings.options[newCurrent]);
        }
        break;
      case window.tvKey?.KEY_DOWN:
        if (window.settings.isDetails) {
          const current = getActiveMenuIdx();
          window.settings.details[window.settings.options[current]?.type]?.move(1);
        } else {
          const options = getMenuOptions();
          const current = getSelectedMenuIdx();

          options.forEach((opt) => opt.classList.remove("selected"));
          const newCurrent = current < options.length - 1 ? current + 1 : current;
          options[newCurrent]?.classList.add("selected");
          window.settings.details.show(window.settings.options[newCurrent]);
        }
        break;
      case window.tvKey?.KEY_LEFT:
        if (window.settings.isDetails) {
          const options = getMenuOptions();
          const current = getActiveMenuIdx();
          options.forEach((opt) => opt.classList.remove("active"));
          options[current]?.classList.add("selected");
          window.settings.details[window.settings.options[current]?.type]?.move(false);
          window.settings.isDetails = false;
        } else {
          window.menu.open();
        }
        break;
      case window.tvKey?.KEY_RIGHT:
        if (!window.settings.isDetails) {
          const options = getMenuOptions();
          const current = getSelectedMenuIdx();
          options.forEach((opt) => opt.classList.remove("selected"));
          options[current]?.classList.add("active");

          window.settings.isDetails = true;
          window.settings.details[window.settings.options[current]?.type]?.move(0);
        }
        break;
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        if (window.settings.isDetails) {
          const current = getActiveMenuIdx();
          const element = window.settings.options[current];
          if (element) {
            window.settings.details[element.type]?.action(element.id);
          }
        } else {
          const options = getMenuOptions();
          const current = getSelectedMenuIdx();
          options.forEach((opt) => opt.classList.remove("selected"));
          options[current]?.classList.add("active");

          window.settings.isDetails = true;
          window.settings.details[window.settings.options[current]?.type]?.move(0);
        }
        break;
    }
  },

  generateMenu: (index) => {
    const className = index === undefined ? "selected" : "active";
    const selected = index === undefined ? 0 : index;
    return window.settings.options
      .map(
        (option, idx) =>
          `<li class="${idx === selected ? className : ""}"><a>${window.translate.go(
            option.label
          )}</a></li>`
      )
      .join("");
  },

  resetLang: () => {
    const menuEl = document.getElementById("settings-menu");
    const active = menuEl?.querySelector("li.active");
    const current = active ? Array.from(menuEl.querySelectorAll("li")).indexOf(active) : 0;
    if (menuEl) menuEl.innerHTML = window.settings.generateMenu(current);
    window.menu.destroy();
    window.menu.init(true);
  },

  details: {
    show: (element) => {
      if (!element) return;
      const detailsEl = document.getElementById("settings-details");
      if (detailsEl) {
        detailsEl.innerHTML = window.settings.details[element.type]?.create(element.id) || "";
      }
    },

    list: {
      create: (id) => {
        let options = {};
        let active = "";

        switch (id) {
          case "audiolang":
            options = window.session?.languages?.audios || {};
            active = window.session?.storage?.account?.audio;
            break;
          case "applicationlang":
            options = JSON.parse(JSON.stringify(window.session?.languages?.subtitles || {}));
            delete options[""];
            active = window.session?.storage?.language;
            break;
          case "subtitlelang":
            options = window.session?.languages?.subtitles || {};
            active = window.session?.storage?.account?.language;
            break;
          case "videoquality":
            options = window.settings.qualities;
            active = window.session?.storage?.quality || "auto";
            break;
          case "mature":
            options = window.settings.bool;
            active = window.session?.storage?.account?.mature;
            break;
          case "controller":
            options = window.settings.controllerSupport;
            active = window.localStorage.getItem(CONTROLLER_KEY);
            break;
        }

        return (
          '<ul class="list-active" id="list-details-offset">' +
          Object.keys(options)
            .map(
              (option) =>
                `<li class="${option === active ? "active" : ""}"><a>${options[option]}</a></li>`
            )
            .join("") +
          "</ul>"
        );
      },

      adjust: (index, size, elementId) => {
        let marginTop = 0;
        if (size > 6 && index > 5) {
          if (index > size - 2) {
            marginTop = -((size - 6) * 104);
          } else {
            marginTop = -((index - 5) * 104);
          }
        }
        const el = document.getElementById(elementId);
        if (el) el.style.marginTop = `${marginTop}px`;
      },

      action: (id) => {
        const detailItems = Array.from(document.querySelectorAll("#settings-details li"));
        const selectedEl = document.querySelector("#settings-details li.selected");
        const index = selectedEl ? detailItems.indexOf(selectedEl) : -1;
        if (index < 0) return;

        let options = {};
        let method = () => {};

        switch (id) {
          case "audiolang":
            options = window.session?.languages?.audios || {};
            method = (value) => {
              window.service.setProfile({
                data: { preferred_content_audio_language: value },
                success: () => {
                  window.session.storage.account.audio = value;
                  window.session.update();
                },
                error: () => {},
              });
            };
            break;
          case "applicationlang":
            options = JSON.parse(JSON.stringify(window.session?.languages?.subtitles || {}));
            delete options[""];
            method = (value) => {
              window.translate.updateLanguage(value);
              window.settings.resetLang();
            };
            break;
          case "subtitlelang":
            options = window.session?.languages?.subtitles || {};
            method = (value) => {
              window.service.setProfile({
                data: { preferred_content_subtitle_language: value },
                success: () => {
                  window.session.storage.account.language = value;
                  window.session.update();
                },
                error: () => {},
              });
            };
            break;
          case "videoquality":
            options = window.settings.qualities;
            method = (value) => {
              window.session.storage.quality = value;
              window.session.update();
            };
            break;
          case "mature":
            options = window.settings.bool;
            method = (value) => {
              window.service.setProfile({
                data: { maturity_rating: value },
                success: () => {
                  window.session.storage.account.mature = value;
                  window.session.update();
                },
                error: () => {},
              });
            };
            break;
          case "controller":
            options = window.settings.controllerSupport;
            method = (value) => {
              if (value === "DISABLE" || value === "ENABLE") {
                window.localStorage.setItem(CONTROLLER_KEY, value);
              }
              window.setControllerEnabled?.(value === "ENABLE");
              window.session.update();
            };
            break;
        }

        const selectedValue = Object.keys(options)[index];
        if (selectedValue !== undefined) {
          method(selectedValue);
          detailItems.forEach((it) => it.classList.remove("active"));
          detailItems[index]?.classList.add("active");
        }
      },

      move: (index) => {
        const options = Array.from(document.querySelectorAll("#settings-details li"));
        if (options.length === 0) return;

        if (index === false) {
          options.forEach((opt) => opt.classList.remove("selected"));
          return;
        }

        const selectedEl = document.querySelector("#settings-details li.selected");
        const activeEl = document.querySelector("#settings-details li.active");
        const currentSelected = selectedEl ? options.indexOf(selectedEl) : -1;
        const current =
          currentSelected >= 0 ? currentSelected : activeEl ? options.indexOf(activeEl) : 0;

        options.forEach((opt) => opt.classList.remove("selected"));
        const newCurrent =
          index < 0
            ? current > 0
              ? current + index
              : current
            : current + index < options.length
              ? current + index
              : current;

        options[newCurrent]?.classList.add("selected");
        window.settings.details.list.adjust(newCurrent, options.length, "list-details-offset");
      },
    },

    html: {
      create: () => {
        const version = window.session?.storage?.version || "v1.1.6";
        return `
        <div class="settings-about box">
          <div class="has-text-weight-bold mb-2">Crispyroll - Unofficial Crunchyroll Client for Linux</div>
          <div class="has-text-grey-light mb-1">Fork of: https://github.com/aarron-lee/crunchyroll-linux</div>
          <div class="has-text-grey-light mb-3">Github: https://github.com/khSafvan/crispyroll</div>

          <div class="has-text-grey">Original app by jhassan8: https://github.com/jhassan8/crunchyroll-tizen</div>
          <div class="tag is-primary is-light mt-3">Version ${version}</div>
        </div>`;
      },

      move: () => {},
    },
  },
};
