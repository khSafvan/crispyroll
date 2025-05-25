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
      <div class="content">
        <div class="container-mid">
          <ul class="options" id="settings-menu">${window.settings.generateMenu()}</ul>
        </div>
        <div class="container" id="settings-details"></div>
      </div>`;

    document.body.appendChild(settingsElement);
    window.settings.details.show(window.settings.options[0]);
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
    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.menu.open();
        break;
      case window.tvKey?.KEY_UP:
        if (window.settings.isDetails) {
          const options = $(".options li");
          const current = options.index($(".options li.active"));
          window.settings.details[window.settings.options[current]?.type]?.move(-1);
        } else {
          const options = $(".options li");
          const current = options.index($(".options li.selected"));

          options.removeClass("selected");
          const newCurrent = current > 0 ? current - 1 : current;
          options.eq(newCurrent).addClass("selected");
          window.settings.details.show(window.settings.options[newCurrent]);
        }
        break;
      case window.tvKey?.KEY_DOWN:
        if (window.settings.isDetails) {
          const options = $(".options li");
          const current = options.index($(".options li.active"));
          window.settings.details[window.settings.options[current]?.type]?.move(1);
        } else {
          const options = $(".options li");
          const current = options.index($(".options li.selected"));

          options.removeClass("selected");
          const newCurrent = current < options.length - 1 ? current + 1 : current;
          options.eq(newCurrent).addClass("selected");
          window.settings.details.show(window.settings.options[newCurrent]);
        }
        break;
      case window.tvKey?.KEY_LEFT:
        if (window.settings.isDetails) {
          const options = $(".options li");
          const current = options.index($(".options li.active"));
          options.removeClass("active");
          options.eq(current).addClass("selected");
          window.settings.details[window.settings.options[current]?.type]?.move(false);
          window.settings.isDetails = false;
        } else {
          window.menu.open();
        }
        break;
      case window.tvKey?.KEY_RIGHT:
        if (!window.settings.isDetails) {
          const options = $(".options li");
          const current = options.index($(".options li.selected"));
          options.removeClass("selected");
          options.eq(current).addClass("active");

          window.settings.isDetails = true;
          window.settings.details[window.settings.options[current]?.type]?.move(0);
        }
        break;
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        if (window.settings.isDetails) {
          const options = $(".options li");
          const current = options.index($(".options li.active"));
          const element = window.settings.options[current];
          if (element) {
            window.settings.details[element.type]?.action(element.id);
          }
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
          `<li class="${idx === selected ? className : ""}">${window.translate.go(
            option.label
          )}</li>`
      )
      .join("");
  },

  resetLang: () => {
    const options = $(".options li");
    const current = options.index($(".options li.active"));
    $("#settings-menu").html(window.settings.generateMenu(current));
    window.menu.destroy();
    window.menu.init(true);
  },

  details: {
    show: (element) => {
      if (!element) return;
      $("#settings-details").html(window.settings.details[element.type]?.create(element.id) || "");
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
                `<li class="${option === active ? "active" : ""}">${options[option]}</li>`
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
        const optionsMenu = $("#settings-details li");
        const index = optionsMenu.index($("#settings-details li.selected"));

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
          optionsMenu.removeClass("active");
          optionsMenu.eq(index).addClass("active");
        }
      },

      move: (index) => {
        const options = $("#settings-details li");
        if (index === false) {
          options.removeClass("selected");
          return;
        }
        const currentSelected = options.index($("#settings-details li.selected"));
        const current =
          currentSelected >= 0 ? currentSelected : options.index($("#settings-details li.active"));

        options.removeClass("selected");
        const newCurrent =
          index < 0
            ? current > 0
              ? current + index
              : current
            : current + index < options.length
            ? current + index
            : current;

        options.eq(newCurrent).addClass("selected");
        window.settings.details.list.adjust(newCurrent, options.length, "list-details-offset");
      },
    },

    html: {
      create: () => {
        const version = window.session?.storage?.version || "v1.1.6";
        return `
        <div style="color: #fff;font-size: 23px;line-height: 51px;text-align: right;padding: 38px 0;position: absolute;right: 0;bottom: 0;">
          <div>Crunchyroll unofficial app.</div>
          <div>Ported to Linux by aarron-lee</div>
          <div>Github: https://github.com/aarron-lee/crunchyroll-linux</div>

          <div>App Icon from Enamo Studios:</div>
          <div>https://www.flaticon.com/free-icons/crunchyroll</div>

          <div>Original app from:</div>
          <div>Github: https://github.com/jhassan8/crunchyroll-tizen</div>
          <div>Version: ${version}</div>
        </div>`;
      },

      move: () => {},
    },
  },
};
