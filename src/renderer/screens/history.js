/**
 * Watch History Screen Controller (Responsive Grid & Dynamic Row Navigation)
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
      <div class="list-container" id="history-list-container">
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

        const containerEl = document.querySelector("#history-screen .list-container");
        if (containerEl) {
          containerEl.addEventListener("mouseover", (e) => {
            const item = e.target.closest(".item");
            if (item && containerEl.contains(item)) {
              const options = Array.from(document.querySelectorAll("#history-list .item"));
              const idx = options.indexOf(item);
              if (idx >= 0) window.historyScreen.toggleFocus(idx);
            }
          });

          containerEl.addEventListener("click", (e) => {
            const item = e.target.closest(".item");
            if (item && containerEl.contains(item)) {
              const options = Array.from(document.querySelectorAll("#history-list .item"));
              const idx = options.indexOf(item);
              if (idx >= 0) {
                window.historyScreen.toggleFocus(idx);
                window.historyScreen.openDetails(idx);
              }
            }
          });

          containerEl.addEventListener("wheel", (e) => {
            e.preventDefault();
            const container = document.getElementById("history-list");
            if (!container) return;
            const delta = e.deltaY;
            const currentTop = parseFloat(container.style.marginTop || "0");
            const newTop = Math.min(0, currentTop - delta);
            container.style.marginTop = `${newTop}px`;
          });
        }

        window.loading.end();
      },
      error: () => {
        window.loading.end();
      },
    });
  },

  /**
   * Calculates actual number of items rendered per row based on geometry.
   * @returns {number}
   */
  getItemsPerRow: () => {
    const items = document.querySelectorAll("#history-list .item");
    if (items.length < 2) return 4;
    const firstTop = items[0].offsetTop;
    let count = 0;
    for (let i = 0; i < items.length; i++) {
      if (Math.abs(items[i].offsetTop - firstTop) < 15) {
        count++;
      } else {
        break;
      }
    }
    return Math.max(1, count);
  },

  /**
   * Toggles item focus and performs element-relative scroll centering.
   * @param {number} position
   */
  toggleFocus: (position) => {
    const items = Array.from(document.querySelectorAll("#history-list .item"));
    items.forEach((it, idx) => {
      if (idx === position) {
        it.classList.add("selected");
      } else {
        it.classList.remove("selected");
      }
    });

    const activeItem = items[position];
    const listContainer = document.getElementById("history-list-container");
    const listOver = document.getElementById("history-list");
    if (activeItem && listContainer && listOver) {
      const itemTop = activeItem.offsetTop;
      const itemHeight = activeItem.offsetHeight;
      const containerHeight = listContainer.offsetHeight;

      let targetScroll = 0;
      if (itemTop + itemHeight > containerHeight - 40) {
        targetScroll = -(itemTop - Math.floor(containerHeight / 3));
      }
      listOver.style.marginTop = `${Math.min(0, targetScroll)}px`;
    }
  },

  /**
   * Opens details screen for selected history item.
   * @param {number} index
   */
  openDetails: (index) => {
    const item = window.historyScreen.data[index];
    if (item) {
      window.home_details.init(
        item,
        (detailItem) => {
          const homeElement = document.createElement("div");
          homeElement.id = window.home.id;
          homeElement.innerHTML = `
          <div class="content">
            <div class="details full">
              <div class="background">
                <img src="${detailItem.background}">
              </div>
              <div class="info">
                <div class="title resize">${detailItem.title}</div>
                <div class="description resize">${detailItem.description}</div>
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
    const options = Array.from(document.querySelectorAll("#history-list .item"));
    const selectedEl = document.querySelector("#history-list .item.selected");
    const current = selectedEl ? options.indexOf(selectedEl) : 0;
    const itemsPerRow = window.historyScreen.getItemsPerRow();
    const totalItems = options.length;

    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.menu.open();
        break;

      case window.tvKey?.KEY_UP:
        if (current >= itemsPerRow) {
          window.historyScreen.toggleFocus(current - itemsPerRow);
        }
        break;

      case window.tvKey?.KEY_DOWN:
        if (current + itemsPerRow < totalItems) {
          window.historyScreen.toggleFocus(current + itemsPerRow);
        } else if (current < totalItems - 1) {
          window.historyScreen.toggleFocus(totalItems - 1);
        }
        break;

      case window.tvKey?.KEY_LEFT:
        if (current % itemsPerRow !== 0) {
          window.historyScreen.toggleFocus(current - 1);
        } else {
          window.menu.open();
        }
        break;

      case window.tvKey?.KEY_RIGHT:
        if (current < totalItems - 1) {
          window.historyScreen.toggleFocus(current + 1);
        }
        break;

      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        if (window.historyScreen.data[current]) {
          window.historyScreen.openDetails(current);
        }
        break;
    }
  },
};
