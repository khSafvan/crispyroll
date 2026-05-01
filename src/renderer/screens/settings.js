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
      iconName: "translate",
      type: "list",
    },
    {
      id: "audiolang",
      label: "settings.menu.audio_lang",
      iconName: "headphones",
      type: "list",
    },
    {
      id: "subtitlelang",
      label: "settings.menu.subtitle_lang",
      iconName: "closedCaptioning",
      type: "list",
    },
    {
      id: "videoquality",
      label: "settings.menu.video_quality",
      iconName: "television",
      type: "list",
    },
    {
      id: "mature",
      label: "settings.menu.mature",
      iconName: "shield",
      type: "list",
    },
    {
      id: "controller",
      label: "settings.menu.controller",
      iconName: "gameController",
      type: "list",
    },
    {
      id: "trackers",
      label: "settings.menu.trackers",
      iconName: "link",
      type: "trackers",
    },
    {
      id: "about",
      label: "settings.menu.about",
      iconName: "info",
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
          window.settings.details.show(window.settings.options[current]);
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
          window.settings.details.show(window.settings.options[current]);
          window.settings.details[window.settings.options[current]?.type]?.move(0);
        }
        break;
    }
  },

  generateMenu: (index) => {
    const className = index === undefined ? "selected" : "active";
    const selected = index === undefined ? 0 : index;
    return window.settings.options
      .map((option, idx) => {
        const isSelected = idx === selected;
        const iconSvg = window.icons?.get?.(option.iconName, {
          weight: isSelected ? "fill" : "regular",
          size: 18,
          className: "settings-menu-icon",
        }) || "";
        return `<li class="${isSelected ? className : ""}" data-idx="${idx}">
          <a class="settings-menu-link">
            <span class="settings-icon-wrapper">${iconSvg}</span>
            <span class="settings-label">${window.translate.go(option.label)}</span>
          </a>
        </li>`;
      })
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
        window.settings.details[element.type]?.initEvents?.(element.id);
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
        const el = document.getElementById(elementId);
        const container = document.getElementById("settings-details");
        const items = el ? el.querySelectorAll("li") : [];
        if (!el || !container || !items[index]) return;

        const activeItem = items[index];
        const itemTop = activeItem.offsetTop;
        const itemHeight = activeItem.offsetHeight;
        const containerHeight = container.offsetHeight;

        let targetScroll = 0;
        if (itemTop + itemHeight > containerHeight - 20) {
          targetScroll = -(itemTop - Math.floor(containerHeight / 3));
        }
        el.style.marginTop = `${Math.min(0, targetScroll)}px`;
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

    trackers: {
      create: () => {
        const anilistSvg = window.icons?.get?.("anilist", { size: 20, className: "brand-svg-icon" }) || "";
        const malSvg = window.icons?.get?.("mal", { size: 20, className: "brand-svg-icon" }) || "";
        const kitsuSvg = window.icons?.get?.("kitsu", { size: 20, className: "brand-svg-icon" }) || "";

        return `
        <div class="settings-trackers box">
          <div class="tracker-header mb-4">
            <h2 class="title is-4 has-text-weight-bold mb-1">Anime Tracking & Scrobbling</h2>
            <p class="subtitle is-6 has-text-grey">Automatically sync watch progress at 85% completion</p>
          </div>

          <div class="tracking-grid mb-4">
            <button class="brand-btn is-focused" id="tracker-tab-anilist" data-tracker="anilist" type="button">
              <span class="brand-icon-wrapper">${anilistSvg}</span>
              <span class="brand-name">AniList</span>
              <span class="brand-status-tag" id="anilist-status-pill">Disconnected</span>
            </button>

            <button class="brand-btn" id="tracker-tab-mal" data-tracker="mal" type="button">
              <span class="brand-icon-wrapper">${malSvg}</span>
              <span class="brand-name">MyAnimeList</span>
              <span class="brand-status-tag">Coming Soon</span>
            </button>

            <button class="brand-btn" id="tracker-tab-kitsu" data-tracker="kitsu" type="button">
              <span class="brand-icon-wrapper">${kitsuSvg}</span>
              <span class="brand-name">Kitsu</span>
              <span class="brand-status-tag">Coming Soon</span>
            </button>
          </div>

          <!-- AniList Integration Card -->
          <div class="tracker-card box" id="tracker-anilist-card">
            <div class="tracker-info mb-2">
              <div class="tracker-status-text has-text-weight-semibold" id="anilist-status-text">Checking status...</div>
            </div>

            <div class="tracker-client-id-row mt-3" id="anilist-client-id-row">
              <label class="label is-small has-text-grey mb-1">Client ID (optional, defaults to Crispyroll App):</label>
              <div class="field has-addons">
                <div class="control is-expanded">
                  <input class="input is-small is-dark" type="text" id="anilist-client-id-input" placeholder="Enter custom Client ID if desired" value="">
                </div>
              </div>
            </div>

            <div class="tracker-actions mt-4" id="anilist-actions">
              <button class="button is-primary is-small is-rounded tracker-btn" id="btn-connect-anilist" type="button">
                ${window.icons?.get?.("link", { size: 16, className: "mr-2" }) || ""}
                <span>Connect AniList</span>
              </button>
              <button class="button is-danger is-outlined is-small is-rounded tracker-btn" id="btn-disconnect-anilist" type="button" style="display:none;">
                ${window.icons?.get?.("linkBreak", { size: 16, className: "mr-2" }) || ""}
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>`;
      },

      initEvents: async () => {
        const connectBtn = document.getElementById("btn-connect-anilist");
        const disconnectBtn = document.getElementById("btn-disconnect-anilist");
        const statusText = document.getElementById("anilist-status-text");
        const statusPill = document.getElementById("anilist-status-pill");
        const clientIdInput = document.getElementById("anilist-client-id-input");
        const clientIdRow = document.getElementById("anilist-client-id-row");
        const trackerTabAnilist = document.getElementById("tracker-tab-anilist");

        const updateUi = (status) => {
          if (status?.connected) {
            const username = status.user?.name || "Connected";
            if (statusText) statusText.textContent = `Connected as ${username}`;
            if (statusPill) {
              statusPill.textContent = "Connected";
              statusPill.className = "brand-status-tag is-success";
            }
            if (trackerTabAnilist) trackerTabAnilist.classList.add("is-linked");
            if (connectBtn) connectBtn.style.display = "none";
            if (disconnectBtn) disconnectBtn.style.display = "inline-flex";
            if (clientIdRow) clientIdRow.style.display = "none";
          } else {
            if (statusText) statusText.textContent = "Not connected";
            if (statusPill) {
              statusPill.textContent = "Disconnected";
              statusPill.className = "brand-status-tag";
            }
            if (trackerTabAnilist) trackerTabAnilist.classList.remove("is-linked");
            if (connectBtn) connectBtn.style.display = "inline-flex";
            if (disconnectBtn) disconnectBtn.style.display = "none";
            if (clientIdRow) clientIdRow.style.display = "block";
          }
        };

        const getProfileId = () =>
          window.tracker?.getActiveProfileId?.() ||
          window.session?.storage?.profile_id ||
          window.session?.storage?.id ||
          window.session?.storage?.account?.username ||
          null;

        try {
          const status = await window.electronUtilsRender?.getTrackerStatus?.("anilist", getProfileId());
          updateUi(status);
        } catch {
          updateUi({ connected: false });
        }

        connectBtn?.addEventListener("click", async () => {
          const clientId = clientIdInput?.value?.trim();
          if (connectBtn) connectBtn.classList.add("is-loading");
          try {
            const res = await window.electronUtilsRender?.startAniListAuth?.(clientId, getProfileId());
            if (res?.success) {
              updateUi({ connected: true, user: res.user });
            }
          } catch {
            // Auth error
          } finally {
            connectBtn?.classList.remove("is-loading");
          }
        });

        disconnectBtn?.addEventListener("click", async () => {
          try {
            await window.electronUtilsRender?.disconnectTracker?.("anilist", getProfileId());
            updateUi({ connected: false });
          } catch {
            // Disconnect error
          }
        });
      },

      move: () => {},
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
