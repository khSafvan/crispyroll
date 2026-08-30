/**
 * Profiles Selection Screen Controller
 */

window.profilesScreen = {
  id: "profiles-screen",

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

    // Mouse click and hover bindings
    $(".options li").on("mouseenter", function () {
      $(".options li").removeClass("selected");
      $(this).addClass("selected");
    });

    $(".options li").on("click", function () {
      const profileId = this.id;
      if (profileId) {
        window.session.switch_profile(
          {
            success: () => {
              window.profilesScreen.destroy();
              window.menu.init();
              window.home.restart();
            },
            error: () => {},
          },
          profileId
        );
      }
    });
  },

  destroy: () => {
    const el = document.getElementById(window.profilesScreen.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Generates profile list HTML markup.
   * @returns {string}
   */
  getOptions: () => {
    const profiles = window.session?.storage?.profiles || [];

    return profiles
      .map((profile) => {
        const { is_selected, profile_name, username, profile_id } = profile;
        const avatar = profile.avatar || "0001-cr-white-orange.png";
        const displayName = (profile_name || username || "").trim().toUpperCase();

        return `<li class="${is_selected ? "selected active" : ""}" id="${profile_id}">
        <img src="https://static.crunchyroll.com/assets/avatar/170x170/${avatar}" alt="${displayName}"/>
        <span>${displayName}</span>
      </li>`;
      })
      .join("");
  },

  /**
   * Key down event handler for profile selection.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    const options = $(".options li");
    const current = options.index($(".options li.selected"));

    switch (event.keyCode) {
      case window.tvKey?.KEY_RIGHT: {
        options.removeClass("selected");
        const newCurrent = current < options.length - 1 ? current + 1 : current;
        options.eq(newCurrent).addClass("selected");
        break;
      }
      case window.tvKey?.KEY_LEFT: {
        options.removeClass("selected");
        const newCurrent = current > 0 ? current - 1 : current;
        options.eq(newCurrent).addClass("selected");
        break;
      }
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const element = options[current];
        if (element?.id) {
          window.session.switch_profile(
            {
              success: () => {
                window.profilesScreen.destroy();
                window.menu.init();
                window.home.restart();
              },
              error: () => {},
            },
            element.id
          );
        }
        break;
      }
    }
  },
};
