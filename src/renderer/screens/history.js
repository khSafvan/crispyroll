/**
 * Watch History Screen Controller
 */

window.historyScreen = {
  id: "history-screen",
  data: [],

  /**
   * Initializes and renders watch history grid.
   */
  init: () => {
    const historyElement = document.createElement("div");
    historyElement.id = window.historyScreen.id;

    historyElement.innerHTML = `
    <div class="content">
      <div class="list-container">
        <div class="list-container-over" id="history-list"></div>
      </div>
      <div class="logo-fixed">
        <img src="assets/images/logo-big.png" alt="Crunchyroll"/>
      </div>
    </div>`;

    document.body.appendChild(historyElement);

    window.loading.start();
    window.service.history({
      success: (response) => {
        let elements = "";
        window.historyScreen.data = window.mapper.history(response);
        window.historyScreen.data.forEach((element, index) => {
          elements += `
          <div class="item${index === 0 ? " selected" : ""}">
            <img src="${element.background}" alt="">
            ${window.historyScreen.view(element)}
          </div>`;
        });
        const listEl = document.getElementById("history-list");
        if (listEl) {
          listEl.innerHTML = elements;
        }
        window.loading.end();
      },
      error: () => {
        window.loading.end();
      },
    });
  },

  destroy: () => {
    window.historyScreen.data = [];
    const el = document.getElementById(window.historyScreen.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Returns HTML progress bar indicator for episode watch completion.
   * @param {object} item
   * @returns {string}
   */
  view: (item) => {
    if (!item.playhead) return "";
    const percent = (item.playhead * 100) / item.duration;
    const value =
      item.duration === item.playhead
        ? window.translate.go("home.episodes.watched")
        : `${item.duration - item.playhead}m`;

    return `<div class="progress" style="width: ${percent}%" value="${value}"></div>`;
  },

  /**
   * Key down event handler for history screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    const options = $(".list-container-over .item");
    const current = options.index($(".list-container-over .item.selected"));

    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.menu.open();
        break;
      case window.tvKey?.KEY_UP: {
        options.removeClass("selected");
        const newCurrent = current > 4 ? current - 5 : current;
        options.eq(newCurrent).addClass("selected");

        const row = Math.ceil((newCurrent + 1) / 5);
        const container = $(".list-container-over").get(0);
        if (container) {
          container.style.marginTop = `${row > 4 ? (row - 4) * -210 : 0}px`;
        }
        break;
      }
      case window.tvKey?.KEY_DOWN: {
        options.removeClass("selected");
        const newCurrent = current < options.length - 5 ? current + 5 : current;
        options.eq(newCurrent).addClass("selected");

        const row = Math.ceil((newCurrent + 1) / 5);
        const container = $(".list-container-over").get(0);
        if (container) {
          container.style.marginTop = `${row > 4 ? (row - 4) * -210 : 0}px`;
        }
        break;
      }
      case window.tvKey?.KEY_LEFT:
        if (current !== 0 && current % 5 !== 0) {
          options.removeClass("selected");
          options.eq(current - 1).addClass("selected");
        } else {
          window.menu.open();
        }
        break;
      case window.tvKey?.KEY_RIGHT: {
        options.removeClass("selected");
        const newCurrent =
          current + 1 < options.length && (current + 1) % 5 !== 0 ? current + 1 : current;
        options.eq(newCurrent).addClass("selected");
        break;
      }
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        if (window.historyScreen.data[current]) {
          window.home_details.init(
            window.historyScreen.data[current],
            (item) => {
              const homeElement = document.createElement("div");
              homeElement.id = window.home.id;
              homeElement.innerHTML = `
              <div class="content">
                <div class="details full">
                  <div class="background">
                    <img src="${item.background}">
                  </div>
                  <div class="info">
                    <div class="title resize">${item.title}</div>
                    <div class="description resize">${item.description}</div>
                    <div class="buttons">
                      <a class="selected">${window.translate.go("home.banner.play")}</a>
                      <a>${window.translate.go("home.banner.info")}</a>
                    </div>
                  </div>
                </div>
                <div class="logo-fixed">
                  <img src="assets/images/logo-big.png" alt="Crunchyroll"/>
                </div>
              </div>`;

              const historyDom = document.getElementById(window.historyScreen.id);
              if (historyDom) historyDom.style.display = "none";
              document.body.appendChild(homeElement);
            },
            () => {
              const historyDom = document.getElementById(window.historyScreen.id);
              if (historyDom) historyDom.style.display = "block";
              window.home.destroy();
            }
          );
        }
        break;
    }
  },
};
