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
          const imgSrc = element.images?.low?.[0]?.source || "";
          elements += `
          <li class="item${index === (selected || 0) ? " focus" : ""}">
            ${imgSrc ? `<img src="${imgSrc}" alt=""/>` : ""}
            <span>${element.localization?.title || ""}</span>
          </li>`;
        });

        browseElement.innerHTML = `
        <div class="content">
          <img id="browse-background" alt=""/>
          <div id="browse-menu">
            <div class="title">${window.translate.go("menu.browse") || "Browse"}</div>
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

        const browseContent = document.querySelector("#browse-screen .browse-content");
        if (browseContent) {
          browseContent.addEventListener("mouseover", (e) => {
            const item = e.target.closest(".item");
            if (item && browseContent.contains(item)) {
              const options = Array.from(browseContent.querySelectorAll(".item"));
              const idx = options.indexOf(item);
              options.forEach((opt) => opt.classList.remove("focus"));
              item.classList.add("focus");
              const bgSource = window.browse.data.categories[idx]?.images?.background?.[4]?.source;
              const bgEl = document.getElementById("browse-background");
              if (bgSource && bgEl) {
                bgEl.src = bgSource;
              }
            }
          });

          browseContent.addEventListener("click", (e) => {
            const item = e.target.closest(".item");
            if (item && browseContent.contains(item)) {
              const options = Array.from(browseContent.querySelectorAll(".item"));
              const idx = options.indexOf(item);
              if (idx >= 0) window.browse.selectCategory(idx);
            }
          });

          browseContent.addEventListener("wheel", (e) => {
            e.preventDefault();
            if (e.deltaY > 0) {
              window.browse.move("down");
            } else {
              window.browse.move("up");
            }
          });
        }
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
      window.mapper.listByCategories(current.tenant_category, current.sub_categories, {
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
      });
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
        const options = Array.from(
          document.querySelectorAll("#browse-screen .browse-content .item")
        );
        const focusEl = document.querySelector("#browse-screen .browse-content .item.focus");
        const currentIdx = focusEl ? options.indexOf(focusEl) : 0;
        window.browse.selectCategory(currentIdx);
        break;
      }
    }
  },

  /**
   * Moves category selection cursor up or down with element-relative scroll calculation.
   * @param {"up"|"down"} direction
   */
  move: (direction) => {
    const options = Array.from(document.querySelectorAll("#browse-screen .browse-content .item"));
    if (options.length === 0) return;

    const focusEl = document.querySelector("#browse-screen .browse-content .item.focus");
    const current = focusEl ? options.indexOf(focusEl) : 0;

    options.forEach((opt) => opt.classList.remove("focus"));

    const newCurrent =
      direction === "up"
        ? current > 0
          ? current - 1
          : current
        : current < options.length - 1
          ? current + 1
          : current;

    const activeItem = options[newCurrent];
    if (activeItem) {
      activeItem.classList.add("focus");

      const bgSource = window.browse.data.categories[newCurrent]?.images?.background?.[4]?.source;
      const bgEl = document.getElementById("browse-background");
      if (bgSource && bgEl) {
        bgEl.src = bgSource;
      }

      // Element-relative scroll offset to prevent drift across viewports
      const container = document.querySelector("#browse-screen .browse-content");
      const wrapper = document.querySelector("#browse-screen .browse-content-wrapper");
      if (container && wrapper) {
        const itemTop = activeItem.offsetTop;
        const itemHeight = activeItem.offsetHeight;
        const containerHeight = container.offsetHeight;

        let targetScroll = 0;
        if (itemTop + itemHeight > containerHeight - 40) {
          targetScroll = -(itemTop - Math.floor(containerHeight / 3));
        }
        wrapper.style.marginTop = `${Math.min(0, targetScroll)}px`;
      }
    }
  },
};
