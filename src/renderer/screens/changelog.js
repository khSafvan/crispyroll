/**
 * Changelog Modal Screen Controller
 */

window.changelog = {
  id: "changelog-modal",
  data: {
    version: "v1.1.6",
    changes: [],
  },

  init: () => {
    // Changelog modal can be rendered when active announcements exist
  },

  destroy: () => {
    const el = document.getElementById(window.changelog.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Generates changelog item HTML markup.
   * @returns {string}
   */
  getChanges: () => {
    let contentChanges = "";
    window.changelog.data.changes.forEach((element) => {
      contentChanges += `
      <li>
        <div class="change-title">
          ${element.title}
        </div>
        <div class="change-description">
          ${element.description}
        </div>
      </li>`;
    });
    return contentChanges;
  },

  /**
   * Key down handler for changelog screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    switch (event.keyCode) {
      case 32: // Space
      case window.tvKey?.KEY_PANEL_ENTER:
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.changelog.destroy();
        break;
    }
  },
};
