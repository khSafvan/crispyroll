/**
 * My List & Watchlist Screen Controller
 */

window.mylist = {
  id: "mylist-screen",
  previous: null,
  data: {
    loadedLists: 0,
    lists: [],
  },
  selectedRow: 0,
  selectedColumns: {},

  /**
   * Updates horizontal card focus within a specific row.
   * @param {number} rowIdx 0-based row index
   * @param {number} colIdx 0-based slide/card index
   */
  updateRowFocus: (rowIdx, colIdx) => {
    const rows = Array.from(document.querySelectorAll("#mylist-screen .row-content"));
    const currentRow = rows[rowIdx];
    if (!currentRow) return;

    window.mylist.selectedColumns[rowIdx] = colIdx;

    const slides = Array.from(currentRow.querySelectorAll(".slick-slide:not(.slick-cloned)"));
    slides.forEach((slide, idx) => {
      if (idx === colIdx) {
        slide.classList.add("slick-current", "selected-card");
      } else {
        slide.classList.remove("slick-current", "selected-card");
      }
    });

    if (currentRow.slick) {
      currentRow.slick.slickGoTo(colIdx);
    }
  },

  /**
   * Initializes and renders user watchlists and custom lists.
   */
  init: () => {
    const mylistElement = document.createElement("div");
    mylistElement.id = window.mylist.id;
    window.loading.start();

    window.mylist.loadLists({
      success: () => {
        mylistElement.innerHTML = `
        <div class="content">
          <div class="details">
            <div class="background">
              <img id="generic-background" alt=""/>
            </div>
            <div class="information">
              <div id="generic-title"></div>
              <div id="generic-description"></div>
              <div class="extra-info"></div>
            </div>
          </div>
          <div class="lists">
            <div class="inner-lists">
              ${window.mylist.generateLists()}
              <div class="list-end">
                <img src="assets/images/empty_data.png" alt=""/>
                <div class="text">${window.translate.go("lists.empty")}</div>
              </div>
            </div>
          </div>
          <div class="logo-fixed">
            <img src="assets/images/logo-big.png" alt="Crunchyroll"/>
          </div>
        </div>`;

        document.body.appendChild(mylistElement);

        const listsContainer = mylistElement.querySelector(".lists");
        if (listsContainer) {
          const rowContents = listsContainer.querySelectorAll(".row-content");
          rowContents.forEach((rc) => {
            if (typeof window.$ === "function" && typeof window.$(rc)?.slick === "function") {
              window.$(rc).slick({
                dots: false,
                arrows: false,
                infinite: false,
                slidesToShow: 6.5,
                slidesToScroll: 1,
                speed: 150,
              });
            }
          });

          // Mouse click handlers
          listsContainer.addEventListener("click", (e) => {
            const slide = e.target.closest(".slick-slide");
            const rowContent = e.target.closest(".row-content");
            if (slide && rowContent && listsContainer.contains(rowContent)) {
              const allRows = Array.from(listsContainer.querySelectorAll(".row-content"));
              const rowIdx = allRows.indexOf(rowContent);
              const slideIdx = parseInt(slide.dataset.slickIndex, 10);

              if (rowIdx >= 0 && !isNaN(slideIdx)) {
                const item = window.mylist.data.lists?.[rowIdx]?.items?.[slideIdx];
                if (item) {
                  window.mylist.openDetails(item);
                }
              }
            }
          });
        }

        window.mylist.details();
        window.loading.end();
      },
      error: () => {
        mylistElement.innerHTML = `
        <div class="content">
          <div class="logo-fixed">
            <img src="assets/images/logo-big.png" alt="Crunchyroll"/>
          </div>
        </div>`;
        document.body.appendChild(mylistElement);
        window.loading.end();
      },
    });

    window.main.state = window.mylist.id;
  },

  /**
   * Opens details screen for selected watchlist item.
   * @param {object} item
   */
  openDetails: (item) => {
    if (item) {
      window.home_details.init(
        item,
        (itemData) => {
          const homeElement = document.createElement("div");
          homeElement.id = window.home.id;
          homeElement.innerHTML = `
        <div class="content">
          <div class="details full">
            <div class="background">
              <img src="${itemData.background}" alt="">
            </div>
            <div class="info">
              <div class="title resize">${itemData.title}</div>
              <div class="description resize">${itemData.description}</div>
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

          const mylistDom = document.getElementById(window.mylist.id);
          if (mylistDom) mylistDom.style.display = "none";
          document.body.appendChild(homeElement);
        },
        () => {
          const mylistDom = document.getElementById(window.mylist.id);
          if (mylistDom) mylistDom.style.display = "block";
          window.home.destroy();
        }
      );
    }
  },

  destroy: () => {
    window.mylist.data.lists = [];
    window.mylist.data.loadedLists = 0;
    window.mylist.selectedRow = 0;
    const el = document.getElementById(window.mylist.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Key down event handler for my list screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    const getRows = () => Array.from(document.querySelectorAll("#mylist-screen .row"));
    const getRowContents = () =>
      Array.from(document.querySelectorAll("#mylist-screen .row-content"));

    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case window.tvKey?.KEY_BACK:
      case 27:
        window.menu.open();
        break;
      case window.tvKey?.KEY_UP: {
        const options = getRows();
        const current = window.mylist.selectedRow;

        options.forEach((opt) => opt.classList.remove("selected"));
        const newCurrent = current > 0 ? current - 1 : current;
        options[newCurrent]?.classList.add("selected");
        window.mylist.selectedRow = newCurrent;

        let marginTop = 0;
        const max = 1;
        if (options.length > max && newCurrent > max - 1) {
          marginTop = -((newCurrent - (max - 1)) * 231);
        }

        const innerList = document.querySelector("#mylist-screen .inner-lists");
        if (innerList) innerList.style.marginTop = `${marginTop}px`;
        const colIdx = window.mylist.selectedColumns[newCurrent] || 0;
        window.mylist.updateRowFocus(newCurrent, colIdx);
        window.mylist.details();
        break;
      }
      case window.tvKey?.KEY_DOWN: {
        const options = getRows();
        const current = window.mylist.selectedRow;

        options.forEach((opt) => opt.classList.remove("selected"));
        const newCurrent = current < options.length - 1 ? current + 1 : current;
        options[newCurrent]?.classList.add("selected");
        window.mylist.selectedRow = newCurrent;

        let marginTop = 0;
        const max = 1;
        if (options.length > max && newCurrent > max - 1) {
          marginTop = -((newCurrent - (max - 1)) * 231);
        }

        const innerList = document.querySelector("#mylist-screen .inner-lists");
        if (innerList) innerList.style.marginTop = `${marginTop}px`;
        const colIdx = window.mylist.selectedColumns[newCurrent] || 0;
        window.mylist.updateRowFocus(newCurrent, colIdx);
        window.mylist.details();
        break;
      }
      case window.tvKey?.KEY_LEFT: {
        const rows = getRowContents();
        if (rows.length === 0) {
          window.menu.open();
          break;
        }
        const currentCol = window.mylist.selectedColumns[window.mylist.selectedRow] || 0;
        if (currentCol > 0) {
          window.mylist.updateRowFocus(window.mylist.selectedRow, currentCol - 1);
          window.mylist.details();
        } else {
          // On leftmost card (index 0): navigate into the sidebar
          window.menu.open();
        }
        break;
      }
      case window.tvKey?.KEY_RIGHT: {
        const currentList = window.mylist.data.lists[window.mylist.selectedRow];
        const totalItems = currentList?.items?.length || 0;
        const currentCol = window.mylist.selectedColumns[window.mylist.selectedRow] || 0;
        if (currentCol < totalItems - 1) {
          window.mylist.updateRowFocus(window.mylist.selectedRow, currentCol + 1);
          window.mylist.details();
        }
        break;
      }
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const currentCol = window.mylist.selectedColumns[window.mylist.selectedRow] || 0;
        const item =
          window.mylist.data.lists[window.mylist.selectedRow]?.items[currentCol];
        if (item) window.mylist.openDetails(item);
        break;
      }
    }
  },

  /**
   * Fetches custom lists and watchlist items concurrently.
   * @param {{ success: Function, error: Function }} callback
   */
  loadLists: (callback) => {
    window.service.getCustomLists({
      success: (responseList) => {
        const listToFetch = [
          {
            order: 0,
            title: "lists.watchlist",
            method: "getWatchList",
          },
        ];

        (responseList.data || []).forEach((customList, index) => {
          listToFetch.push({
            order: index + 1,
            title: customList.title,
            method: "getCustomListItems",
            data: customList.list_id,
          });
        });

        listToFetch.forEach((item) => {
          window.service[item.method]({
            data: item.data,
            success: (responseItems) => {
              window.mylist.data.loadedLists++;

              if (responseItems.data && responseItems.data.length > 0) {
                window.mylist.data.lists.push({
                  order: item.order,
                  title: item.title,
                  items: window.mapper.mapItems(responseItems.data),
                });
              }

              if (window.mylist.data.loadedLists === listToFetch.length) {
                window.mylist.data.lists.sort((a, b) => a.order - b.order);
                callback.success();
              }
            },
            error: () => {},
          });
        });
      },
      error: (error) => {
        callback.error(error);
      },
    });
  },

  /**
   * Generates DOM HTML string for watchlist and custom list rows.
   * @returns {string}
   */
  generateLists: () => {
    let posterItems = "";
    window.mylist.data.lists.forEach((element, index) => {
      if (element.items.length > 0) {
        posterItems += `
      <div class="row ${index === window.mylist.selectedRow ? "selected" : ""}">
        <div class="row-title">${window.translate.go(element.title)}</div>
        <div class="row-content fixed-error">`;
        element.items.forEach((item) => {
          posterItems += window.mylist.createItem(item);
        });
        for (let i = 0; i < 9; i++) {
          posterItems += window.mylist.createEmptyItem();
        }
        posterItems += "</div></div>";
      }
    });

    return posterItems;
  },

  createItem: (item) => {
    const playhead = item.playhead
      ? `<div class="progress" style="width: ${
          (item.playhead * 100) / item.duration
        }%" value="${item.duration - item.playhead}m"></div>`
      : "";
    return `
    <div class="item" data-id="${item.id || ""}">
      <div class="poster">
        <img src="${item.background}" alt=""/>
        ${playhead}
      </div>
    </div>`;
  },

  createEmptyItem: () => {
    return `
    <div class="item">
      <div class="poster">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="">
      </div>
    </div>`;
  },

  details: () => {
    try {
      const colIdx = window.mylist.selectedColumns[window.mylist.selectedRow] || 0;
      const item = window.mylist.data.lists[window.mylist.selectedRow]?.items[colIdx];
      if (!item) return;

      const bgImg = document.querySelector("#mylist-screen .details .background img");
      if (bgImg) bgImg.src = item.background || "";

      const title = document.querySelector("#mylist-screen .details .information #generic-title");
      if (title) {
        const rawT = item.title || "";
        title.innerText = typeof window.sanitizeTitle === "function" ? window.sanitizeTitle(rawT) : rawT;
        title.style.fontSize = title.scrollHeight > title.clientHeight ? "2.5vh" : "4vh";
      }

      const description = document.querySelector(
        "#mylist-screen .details .information #generic-description"
      );
      if (description) {
        description.innerText = item.description || "";
        description.style.fontSize =
          description.scrollHeight > description.clientHeight ? "1.5vh" : "2vh";
      }
    } catch {
      // Error reading item details
    }
  },

  /**
   * Toggles bookmark/watchlist status for a series or movie.
   * @param {string} id
   * @param {boolean} status
   * @param {{ success: Function, error: Function }} callback
   */
  toggleStatus: (id, status, callback) => {
    const action = status ? "addWatchlist" : "removeWatchlist";
    window.service[action]({
      data: {
        content_id: id,
      },
      success: callback.success,
      error: callback.error,
    });
  },
};
