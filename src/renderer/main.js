/**
 * Main Application Orchestrator & Screen Router
 */

window.main = {
  urls: {
    src: "assets/images",
  },
  events: {},
  mac: null,
  token: null,
  state: null,
  timer: null,

  /**
   * Initializes application core subsystems and triggers initial login validation.
   */
  init: () => {
    window.loading.init();
    window.session.init();
    window.translate.init();
    window.main.events.login();

    // LG webOS and TV key compatibility
    window.tvKey.IS_KEY_BACK = (keyCode) => {
      return [10009, 27, 461].includes(keyCode) ? keyCode : -1;
    };
  },

  events: {
    logout: () => {
      const logoutAction = () => {
        if (document.getElementById(window.menu?.id) != null) {
          window.menu.destroy();
        }

        const currentId = window.main.state ? window.main.state.replace("-screen", "") : "";
        const screenMap = {
          history: window.historyScreen,
          profiles: window.profilesScreen,
          home_details: window.home_details,
          home_episodes: window.home_episodes,
        };
        const targetScreen = screenMap[currentId] || window[currentId];

        if (targetScreen && typeof targetScreen.destroy === "function") {
          if (document.getElementById(window.main.state) != null) {
            targetScreen.destroy();
          }
        }
        window.session.clear();
        window.login.init();
      };

      window.exit.init(logoutAction);
    },

    login: () => {
      window.session.valid({
        success: () => {
          window.session.load_account({
            success: () => {
              window.main.events.profiles();
            },
            error: () => {
              window.loading.destroy();
              window.login.init();
            },
          });
        },
        error: () => {
          window.loading.destroy();
          window.login.init();
        },
      });
    },

    profiles: () => {
      window.loading.destroy();
      window.profilesScreen.init();
    },
  },

  /**
   * Destroys player on app exit.
   */
  destroy: () => {
    window.player.destroy();
  },

  /**
   * Appends text to on-screen debug console.
   * @param {string} text
   */
  log: (text) => {
    const consoleEl = document.getElementById("console");
    if (consoleEl) {
      consoleEl.innerHTML += `${text}<br/>`;
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  },

  /**
   * Main router for keyboard input events. Dispatches to currently active screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    if (event.keyCode === 122 || event.key === "F11") {
      event.preventDefault();
      window.electronUtilsRender?.toggleFullScreen?.();
      return;
    }

    if (window.loading.active) {
      if (window.tvKey.IS_KEY_BACK(event.keyCode)) {
        window.loading.end();
      }
    } else if (event.keyCode === window.tvKey.KEY_EXIT && window.main.state !== window.exit.id) {
      window.exit.init();
    } else {
      switch (window.main.state) {
        case window.changelog.id:
          window.changelog.keyDown(event);
          break;
        case window.loading.id:
          window.loading.keyDown(event);
          break;
        case window.exit.id:
          window.exit.keyDown(event);
          break;
        case window.login.id:
          window.login.keyDown(event);
          break;
        case window.keyboard.id:
          window.keyboard.keyDown(event);
          break;
        case window.menu.id:
          window.menu.keyDown(event);
          break;
        case window.mylist.id:
          window.mylist.keyDown(event);
          break;
        case window.search.id:
          window.search.keyDown(event);
          break;
        case window.historyScreen.id:
          window.historyScreen.keyDown(event);
          break;
        case window.profilesScreen.id:
          window.profilesScreen.keyDown(event);
          break;
        case window.browse.id:
          window.browse.keyDown(event);
          break;
        case window.home.id:
          window.home.keyDown(event);
          break;
        case window.home_details.id:
          window.home_details.keyDown(event);
          break;
        case window.home_episodes.id:
          window.home_episodes.keyDown(event);
          break;
        case window.video.id:
          window.video.keyDown(event);
          break;
        case window.settings.id:
          window.settings.keyDown(event);
          break;
        default:
          break;
      }
    }
  },
};
