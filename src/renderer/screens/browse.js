/**
 * Browse Screen Controller (Categories & Genres)
 */

window.browse = {
  id: "browse-screen",
  data: {
    categories: [],
    main: [],
  },

  /**
   * Initializes and renders browse categories screen.
   * @param {number} [selected=0]
   */
  init: (selected = 0) => {
    const browseElement = document.createElement("div");
    browseElement.id = window.browse.id;

    window.loading.start();
    window.service.categories({
      success: (response) => {
        window.browse.data.categories = response.items || [];
        let elements = "";
        window.browse.data.categories.forEach((element, index) => {
          elements += `
          <li class="item${index === (selected || 0) ? " focus" : ""}">
            <img src="${element.images.low[0].source}" alt=""/>
            ${element.localization.title}
          </li>`;
        });

        browseElement.innerHTML = `
        <div class="content">
          <img id="browse-background" alt=""/>
          <div id="browse-menu">
            <div class="browse-content">
              <ul class="browse-content-wrapper">
                ${elements}
              </ul>
            </div>
          </div>
        </div>`;

        document.body.appendChild(browseElement);
        window.menu.destroy();
        window.loading.end();
        window.browse.move("down");
        window.browse.move("up");

        // Mouse click and hover handlers
        $(".browse-content").on("mouseenter", ".item", function () {
          const options = $(".browse-content .item");
          const idx = options.index(this);
          options.removeClass("focus");
          $(this).addClass("focus");
          const bgSource = window.browse.data.categories[idx]?.images?.background?.[4]?.source;
          if (bgSource) {
            $("#browse-background").attr("src", bgSource);
          }
        });

        $(".browse-content").on("click", ".item", function () {
          const options = $(".browse-content .item");
          const idx = options.index(this);
          window.browse.selectCategory(idx);
        });

        $(".browse-content").on("wheel", function (e) {
          e.preventDefault();
          if (e.originalEvent.deltaY > 0) {
            window.browse.move("down");
          } else {
            window.browse.move("up");
          }
        });
      },
      error: () => {
        window.loading.end();
      },
    });
    window.main.state = window.browse.id;
  },

  /**
   * Selects and loads a category at given index.
   * @param {number} index
   */
  selectCategory: (index) => {
    const current = window.browse.data.categories[index];
    if (current) {
      window.loading.start();
      window.home.data.main = null;
      window.mapper.listByCategories(
        current.tenant_category,
        current.sub_categories,
        {
          success: () => {
            window.loading.end();
            window.home.fromCategory.state = true;
            window.home.fromCategory.index = index;
            window.home.fromCategory.title = current.localization?.title || "";
            window.home.init();
            window.browse.destroy();
          },
          error: () => {
            window.loading.end();
          },
        }
      );
    }
  },

  destroy: () => {
    const el = document.getElementById(window.browse.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Key down event handler for browse screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.browse.destroy();
        window.menu.init();
        window.home.restart();
        break;
      case window.tvKey?.KEY_UP:
        window.browse.move("up");
        break;
      case window.tvKey?.KEY_DOWN:
        window.browse.move("down");
        break;
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const options = $(".browse-content .item");
        const currentIdx = options.index($(".browse-content .item.focus"));
        window.browse.selectCategory(currentIdx);
        break;
      }
    }
  },

  /**
   * Moves category selection cursor up or down.
   * @param {"up"|"down"} direction
   */
  move: (direction) => {
    const options = $(".browse-content .item");
    const current = options.index($(".browse-content .item.focus"));

    options.removeClass("focus");

    const newCurrent =
      direction === "up"
        ? current > 0
          ? current - 1
          : current
        : current < options.length - 1
        ? current + 1
        : current;

    options.eq(newCurrent).addClass("focus");

    const bgSource = window.browse.data.categories[newCurrent]?.images?.background?.[4]?.source;
    if (bgSource) {
      $("#browse-background").attr("src", bgSource);
    }

    let marginTop = 0;
    const max = 9;
    if (options.length > max && newCurrent > max - 1) {
      marginTop = -((newCurrent - (max - 1)) * 110);
    }

    const wrapper = $(".browse-content-wrapper")[0];
    if (wrapper) {
      wrapper.style.marginTop = `${marginTop}px`;
    }
  },
};
