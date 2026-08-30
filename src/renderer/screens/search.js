/**
 * Search Screen Controller
 */

window.search = {
  id: "search-screen",
  previous: null,
  input: null,
  position: -1,
  last_position: 0,
  items_per_row: 9,
  scroll_data: {
    item_padding: 30,
    item_height: 390,
    rows: 10,
  },
  data: {
    result: [],
  },

  /**
   * Initializes search screen.
   */
  init: () => {
    const searchElement = document.createElement("div");
    searchElement.id = window.search.id;

    searchElement.innerHTML = `
      <div class="content">
        <div class="field search-field-container">
          <div class="control has-icons-left focus search-control" id="search-screen_input">
            <input class="input is-medium is-rounded search-input" type="text" id="search-input-field" placeholder="${window.translate.go(
              "search.placeholder"
            )}" autofocus>
            <span class="icon is-left">
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
          </div>
        </div>
        <div class="list-container" id="search-list-container">
          <div class="list-container-over" id="search-list-over"></div>
        </div>
        <div class="logo-fixed">
          <img src="assets/images/logo-big.png" alt="Crunchyroll"/>
        </div>
      </div>`;

    document.body.appendChild(searchElement);
    const searchInput = document.getElementById("search-input-field");
    if (searchInput) {
      window.search.input = searchInput;
      searchInput.addEventListener("keydown", (e) => {
        if (e.keyCode === 13) {
          e.stopPropagation();
          window.search.start();
        }
      });
      searchInput.addEventListener("focus", () => {
        window.search.toggleFocus(-1);
      });
    }

    const listContainer = document.getElementById("search-list-container");
    if (listContainer) {
      // Mouse hover on search items
      listContainer.addEventListener("mouseover", (e) => {
        const item = e.target.closest(".item");
        if (item && listContainer.contains(item)) {
          const items = Array.from(listContainer.querySelectorAll(".item"));
          const idx = items.indexOf(item);
          if (idx >= 0) window.search.toggleFocus(idx);
        }
      });

      // Mouse click on search items
      listContainer.addEventListener("click", (e) => {
        const item = e.target.closest(".item");
        if (item && listContainer.contains(item)) {
          const items = Array.from(listContainer.querySelectorAll(".item"));
          const idx = items.indexOf(item);
          if (idx >= 0) {
            window.search.toggleFocus(idx);
            window.search.openDetails(idx);
          }
        }
      });

      // Mouse wheel scroll
      listContainer.addEventListener("wheel", (e) => {
        e.preventDefault();
        const container = document.getElementById("search-list-over");
        if (!container) return;
        const delta = e.deltaY;
        const currentTop = parseFloat(container.style.marginTop || "0");
        const newTop = Math.min(0, currentTop - delta);
        container.style.marginTop = `${newTop}px`;
      });
    }
  },

  destroy: () => {
    window.search.data.result = [];
    const el = document.getElementById(window.search.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Opens details screen for selected item index.
   * @param {number} index
   */
  openDetails: (index) => {
    const item = window.search.data.result[index];
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

          const searchDom = document.getElementById(window.search.id);
          if (searchDom) searchDom.style.display = "none";
          document.body.appendChild(homeElement);

          const title = document.querySelector("#home-screen .details .info .title");
          if (title) {
            title.style.fontSize = title.scrollHeight > title.clientHeight ? "3.5vh" : "5vh";
          }

          const description = document.querySelector("#home-screen .details .info .description");
          if (description) {
            description.style.fontSize =
              description.scrollHeight > description.clientHeight ? "2vh" : "2.5vh";
          }
        },
        () => {
          const searchDom = document.getElementById(window.search.id);
          if (searchDom) searchDom.style.display = "block";
          window.home.destroy();
          window.search.toggleFocus(window.search.position);
        }
      );
    }
  },

  /**
   * Executes search query.
   */
  start: () => {
    if (!window.search.input?.value?.trim()) return;
    window.loading.start();
    window.service.search({
      data: {
        query: window.search.input.value,
      },
      success: (response) => {
        window.loading.end();
        window.search.data.result = window.mapper.search(response);
        let elementsContent = "";
        window.search.data.result.forEach((element, index) => {
          elementsContent += `
              <div class="item${index === 0 ? " selected" : ""}">
                <img src="${element.poster}" alt="">
                <div class="title">${element.title}</div>
              </div>`;
        });

        const containerOver = document.getElementById("search-list-over");
        if (containerOver) containerOver.innerHTML = elementsContent;
        window.search.last_position = 0;

        const firstItem = containerOver?.querySelector(".item");
        if (firstItem) {
          window.search.scroll_data.item_height = parseFloat(
            window.getComputedStyle(firstItem).height.replace("px", "")
          );
        }
        window.search.scroll_data.rows = Math.ceil(
          window.search.data.result.length / window.search.items_per_row
        );
      },
      error: () => {
        window.loading.end();
      },
    });
  },

  /**
   * Toggles focus between input field and result grid.
   * @param {number} newIndex
   */
  toggleFocus: (newIndex) => {
    const inputEl = document.getElementById("search-screen_input");
    const listEl = document.getElementById("search-list-container");

    if (newIndex < 0) {
      inputEl?.classList.add("focus");
      listEl?.classList.remove("focus");
      window.search.last_position =
        window.search.position >= 0 ? window.search.position : window.search.last_position;
      newIndex = -1;
    } else {
      if (window.search.position === -1) {
        inputEl?.classList.remove("focus");
        listEl?.classList.add("focus");
      }
      if (newIndex >= window.search.data.result.length) {
        newIndex = window.search.data.result.length - 1;
      }
      const items = document.querySelectorAll("#search-screen .list-container .item");
      items.forEach((it, idx) => {
        if (idx === newIndex) {
          it.classList.add("selected");
        } else {
          it.classList.remove("selected");
        }
      });
    }
    window.search.position = newIndex;
  },

  scroll: () => {
    if (window.search.data.result.length === 0) return;
    let currentRow = Math.floor(window.search.position / window.search.items_per_row);
    const container = document.getElementById("search-list-over");
    if (!container) return;

    if (currentRow < 2) {
      container.style.marginTop = "0px";
    } else if (!(currentRow + 1 >= window.search.scroll_data.rows)) {
      currentRow -= 1;
      container.style.marginTop = `-${
        currentRow * (window.search.scroll_data.item_height + window.search.scroll_data.item_padding)
      }px`;
    }
  },

  /**
   * Key down event handler for search screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        if (window.search.position === -1) {
          window.menu.open();
        } else {
          window.search.toggleFocus(-1);
        }
        break;
      case window.tvKey?.KEY_UP:
        window.search.toggleFocus(window.search.position - window.search.items_per_row);
        window.search.scroll();
        break;
      case window.tvKey?.KEY_DOWN: {
        let toIndex = window.search.position + window.search.items_per_row;
        if (window.search.position === -1) toIndex = window.search.last_position;
        window.search.toggleFocus(toIndex);
        window.search.scroll();
        break;
      }
      case window.tvKey?.KEY_LEFT:
        if (window.search.position % window.search.items_per_row === 0) {
          window.menu.open();
        } else {
          window.search.toggleFocus(window.search.position - 1);
        }
        break;
      case window.tvKey?.KEY_RIGHT:
        if ((window.search.position + 1) % window.search.items_per_row === 0) return;
        window.search.toggleFocus(window.search.position + 1);
        break;
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        if (window.search.position === -1) {
          window.search.start();
        } else if (window.search.data.result[window.search.position]) {
          window.search.openDetails(window.search.position);
        }
        break;
    }
  },
};
