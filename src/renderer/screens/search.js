/**
 * Search Screen Controller (Responsive Grid & Dynamic Row Navigation)
 */

window.search = {
  id: "search-screen",
  previous: null,
  input: null,
  position: -1,
  last_position: 0,
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
      listContainer.addEventListener("mouseover", (e) => {
        const item = e.target.closest(".item");
        if (item && listContainer.contains(item)) {
          const items = Array.from(listContainer.querySelectorAll(".item"));
          const idx = items.indexOf(item);
          if (idx >= 0) window.search.toggleFocus(idx);
        }
      });

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
    const el = document.getElementById(window.search.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Calculates actual number of items rendered per row based on geometry.
   * @returns {number}
   */
  getItemsPerRow: () => {
    const items = document.querySelectorAll("#search-list-over .item");
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
   * Executes search query against Crunchyroll API.
   */
  start: () => {
    const query = window.search.input?.value?.trim();
    if (!query) return;

    window.loading.start();
    window.service.search({
      data: query,
      success: (response) => {
        window.loading.end();
        window.search.data.result = window.mapper.search(response);
        let itemsHtml = "";
        window.search.data.result.forEach((item) => {
          itemsHtml += `
          <div class="item" data-id="${item.id}">
            <img src="${item.poster}" alt=""/>
            <div class="title">${item.title}</div>
          </div>`;
        });

        const listOver = document.getElementById("search-list-over");
        if (listOver) {
          listOver.innerHTML = itemsHtml;
          listOver.style.marginTop = "0px";
        }

        if (window.search.data.result.length > 0) {
          window.search.toggleFocus(0);
        }
      },
      error: () => {
        window.loading.end();
      },
    });
  },

  /**
   * Opens title details view for search item.
   * @param {number} index
   */
  openDetails: (index) => {
    const item = window.search.data.result[index];
    if (item) {
      window.home_details.init(
        item,
        () => {
          window.search.destroy();
          window.home.init();
        },
        () => {
          window.search.init();
        }
      );
    }
  },

  /**
   * Key down event handler for search input & result grid navigation.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.search.destroy();
        window.menu.init();
        window.home.restart();
        break;

      case window.tvKey?.KEY_UP:
        window.search.move("up");
        break;

      case window.tvKey?.KEY_DOWN:
        window.search.move("down");
        break;

      case window.tvKey?.KEY_LEFT:
        window.search.move("left");
        break;

      case window.tvKey?.KEY_RIGHT:
        window.search.move("right");
        break;

      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        if (window.search.position === -1) {
          window.search.start();
        } else {
          window.search.openDetails(window.search.position);
        }
        break;
    }
  },

  /**
   * Toggles focus between search bar (-1) and grid items (>=0).
   * @param {number} position
   */
  toggleFocus: (position) => {
    window.search.position = position;
    const searchControl = document.getElementById("search-screen_input");
    const items = Array.from(document.querySelectorAll("#search-list-over .item"));

    if (position === -1) {
      searchControl?.classList.add("focus");
      items.forEach((it) => it.classList.remove("selected"));
      window.search.input?.focus();
    } else {
      searchControl?.classList.remove("focus");
      items.forEach((it, idx) => {
        if (idx === position) {
          it.classList.add("selected");
        } else {
          it.classList.remove("selected");
        }
      });
      document.activeElement?.blur();
      window.search.last_position = position;

      // Scroll container to keep active item in comfortable view
      const activeItem = items[position];
      const listContainer = document.getElementById("search-list-container");
      const listOver = document.getElementById("search-list-over");
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
    }
  },

  /**
   * Moves focus across search input and results grid.
   * @param {"up"|"down"|"left"|"right"} direction
   */
  move: (direction) => {
    const items = Array.from(document.querySelectorAll("#search-list-over .item"));
    const itemsPerRow = window.search.getItemsPerRow();
    const totalItems = items.length;

    if (window.search.position === -1) {
      if (direction === "down" && totalItems > 0) {
        window.search.toggleFocus(Math.min(window.search.last_position || 0, totalItems - 1));
      }
      return;
    }

    let newPosition = window.search.position;
    switch (direction) {
      case "up":
        if (newPosition < itemsPerRow) {
          window.search.toggleFocus(-1);
          return;
        }
        newPosition = Math.max(0, newPosition - itemsPerRow);
        break;

      case "down":
        if (newPosition + itemsPerRow < totalItems) {
          newPosition = newPosition + itemsPerRow;
        } else if (newPosition < totalItems - 1) {
          newPosition = totalItems - 1;
        }
        break;

      case "left":
        if (newPosition % itemsPerRow === 0) {
          // At left edge of row: go back to sidebar menu
          window.search.destroy();
          window.menu.init();
          return;
        }
        newPosition = Math.max(0, newPosition - 1);
        break;

      case "right":
        if (newPosition < totalItems - 1) {
          newPosition = newPosition + 1;
        }
        break;
    }

    window.search.toggleFocus(newPosition);
  },
};
