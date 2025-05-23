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
        <div class="input focus" id="search-screen_input">
          <input type="text" tabindex="-1" placeholder="${window.translate.go(
            "search.placeholder"
          )}">
        </div>
        <div class="list-container">
          <div class="list-container-over" style="grid-template-columns: repeat(${
            window.search.items_per_row
          }, 1fr);"></div>
        </div>
        <div class="logo-fixed">
          <img src="assets/images/logo-big.png" alt="Crunchyroll"/>
        </div>
      </div>`;

    document.body.appendChild(searchElement);
    const searchInput = document.getElementById("search-screen_input");
    if (searchInput) {
      window.search.input = searchInput.firstElementChild;
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

        $(".list-container-over").html(elementsContent);
        window.search.last_position = 0;

        const firstItem = $(".list-container-over .item").get(0);
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
    if (newIndex < 0) {
      $("#search-screen_input").addClass("focus");
      $(".list-container").removeClass("focus");
      window.search.last_position =
        window.search.position >= 0 ? window.search.position : window.search.last_position;
      newIndex = -1;
    } else {
      if (window.search.position === -1) {
        $("#search-screen_input").removeClass("focus");
        $(".list-container").addClass("focus");
      }
      if (newIndex >= window.search.data.result.length) {
        newIndex = window.search.data.result.length - 1;
      }
      $(".list-container .item").removeClass("selected");
      $(".list-container .item").eq(newIndex).addClass("selected");
    }
    window.search.position = newIndex;
  },

  scroll: () => {
    if (window.search.data.result.length === 0) return;
    let currentRow = Math.floor(window.search.position / window.search.items_per_row);
    const container = $(".list-container-over").get(0);
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
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        if (window.search.position === -1) {
          window.keyboard.init(window.search.input, window.search.start);
        } else if (window.search.data.result[window.search.position]) {
          window.home_details.init(
            window.search.data.result[window.search.position],
            (item) => {
              const homeElement = document.createElement("div");
              homeElement.id = window.home.id;
              homeElement.innerHTML = `
            <div class="content">
              <div class="details full">
                <div class="background">
                  <img src="${item.background}" alt="">
                </div>
                <div class="info">
                  <div class="title resize">${item.title}</div>
                  <div class="description resize">${item.description}</div>
                  <div class="buttons">
                    <a class="selected">Play</a>
                    <a>More information</a>
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

              const title = $(".details .info .title")[0];
              if (title) {
                title.style.fontSize = title.scrollHeight > title.clientHeight ? "3.5vh" : "5vh";
              }

              const description = $(".details .info .description")[0];
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
        break;
    }
  },
};
