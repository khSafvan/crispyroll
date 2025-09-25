/**
 * Home Screen Controller (Feed, Featured Banner & Rows)
 */

window.home = {
  id: "home-screen",
  data: {
    main: null,
  },
  position: 0,
  fromCategory: {
    index: null,
    state: false,
    title: "",
  },

  /**
   * Initializes and renders home screen rows and hero banner.
   */
  init: () => {
    const homeElement = document.createElement("div");
    homeElement.id = window.home.id;

    let posterItems = "";
    (window.home.data.main?.lists || []).forEach((element) => {
      if (element.items.length > 0) {
        posterItems += `
      <div class="row">
        <div class="row-title">${element.title}</div>
        <div class="row-content ${element.items[0].display}">`;
        element.items.forEach((item) => {
          posterItems += window.home.createItem(item);
        });
        for (let i = 0; i < 9; i++) {
          posterItems += window.home.createEmptyItem(element.items[0].display);
        }
        posterItems += "</div></div>";
      }
    });

    const banner = window.home.data.main?.banner || {};

    homeElement.innerHTML = `
    <div class="content">
      ${
        window.home.fromCategory.state
          ? `<div class="browse-back"><span></span><p>${window.home.fromCategory.title}</p></div>`
          : ""
      }
      <div class="details full">
        <div class="background">
          <img src="${banner.background || ""}" alt="">
        </div>
        <div class="info">
          <div class="title resize">${banner.title || ""}</div>
          <div class="description resize">${banner.description || ""}</div>
          <div class="buttons">
            <a class="selected">${window.translate.go("home.banner.play")}</a>
            <a>${window.translate.go("home.banner.info")}</a>
          </div>
        </div>
      </div>
      <div class="rows">
        ${posterItems}
      </div>
      <div class="logo-fixed">
        <img src="assets/images/logo-big.png" alt="Crunchyroll"/>
      </div>
    </div>`;

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

    $(`#${window.home.id} .rows`).slick({
      vertical: true,
      dots: false,
      arrows: false,
      infinite: false,
      slidesToShow: 1.5,
      slidesToScroll: 1,
      speed: 150,
    });

    $(`#${window.home.id} .rows .row-content`)
      .not(".episode")
      .slick({
        dots: false,
        arrows: false,
        infinite: false,
        slidesToShow: 10,
        slidesToScroll: 1,
        speed: 150,
      });

    $(`#${window.home.id} .rows .row-content.episode`).slick({
      dots: false,
      arrows: false,
      infinite: false,
      slidesToShow: 5.5,
      slidesToScroll: 1,
      speed: 150,
    });

    const rowsSlick = $(`#${window.home.id} .rows`)[0]?.slick;
    if (rowsSlick) rowsSlick.slickGoTo(0);

    const firstRowSlick = $(`#${window.home.id} .rows .row-content`)[0]?.slick;
    if (firstRowSlick) firstRowSlick.slickGoTo(0);

    // Mouse click and hover handlers
    $(".details .buttons a").on("mouseenter", function () {
      $(".details .buttons a").removeClass("selected");
      $(this).addClass("selected");
    });

    $(".details .buttons a").on("click", function () {
      const idx = $(".details .buttons a").index(this);
      const bannerItem = window.home.data.main?.banner;
      if (bannerItem) {
        window.home_details.init(bannerItem);
      }
    });

    $(`#${window.home.id} .rows`).on("mouseenter", ".row-content .slick-slide", function () {
      const rowContent = $(this).closest(".row-content");
      const allRows = $(`#${window.home.id} .rows .row-content`);
      const rowIdx = allRows.index(rowContent);
      const slideIdx = $(this).data("slick-index");

      if (rowIdx >= 0 && slideIdx !== undefined) {
        window.home.position = rowIdx + 1;
        allRows.removeClass("selected");
        rowContent.addClass("selected");
        $(".details").removeClass("full");
        if (rowContent[0]?.slick) {
          rowContent[0].slick.slickGoTo(slideIdx);
        }
        window.home.show_details();
      }
    });

    $(`#${window.home.id} .rows`).on("click", ".row-content .slick-slide", function () {
      const rowContent = $(this).closest(".row-content");
      const allRows = $(`#${window.home.id} .rows .row-content`);
      const rowIdx = allRows.index(rowContent);
      const slideIdx = $(this).data("slick-index");

      if (rowIdx >= 0 && slideIdx !== undefined) {
        const item = window.home.data.main?.lists?.[rowIdx]?.items?.[slideIdx];
        if (item) {
          window.home_details.init(item);
        }
      }
    });

    window.main.state = window.home.id;
    window.changelog.init();
  },

  destroy: () => {
    window.home.position = 0;
    const el = document.getElementById(window.home.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Updates hero details banner to reflect currently focused row/carousel item.
   */
  show_details: () => {
    const item =
      window.home.position > 0
        ? window.home.data.main.lists[window.home.position - 1]?.items[
            $(".row-content")[window.home.position - 1]?.slick?.currentSlide || 0
          ]
        : window.home.data.main.banner;

    if (!item) return;

    $(".details .background img").attr("src", item.background || "");
    const title = $(".details .info .title")[0];
    if (title) {
      title.innerText = item.title || "";
      title.style.fontSize = title.scrollHeight > title.clientHeight ? "3.5vh" : "5vh";
    }

    const description = $(".details .info .description")[0];
    if (description) {
      description.innerText = item.description || "";
      description.style.fontSize =
        description.scrollHeight > description.clientHeight ? "2vh" : "2.5vh";
    }
  },

  /**
   * Key down event handler for home screen navigation.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        if (!window.home.fromCategory.state) {
          window.menu.open();
        } else {
          window.home.destroy();
          window.browse.init(window.home.fromCategory.index);
        }
        break;
      case window.tvKey?.KEY_UP:
        $(".row-content").removeClass("selected");
        if (window.home.position > 1) {
          window.home.position--;
          $(".rows")[0]?.slick?.slickGoTo(window.home.position - 1);
          const currentRow = $(".row-content")[window.home.position - 1];
          if (currentRow?.slick) {
            currentRow.slick.slickGoTo(currentRow.slick.getCurrent());
            currentRow.className += " selected";
          }
        } else {
          $(".details").addClass("full");
          window.home.position = 0;
        }
        window.home.show_details();
        break;
      case window.tvKey?.KEY_DOWN:
        if (window.home.position > 0) {
          $(".row-content").removeClass("selected");
          window.home.position =
            window.home.position < window.home.data.main.lists.length
              ? window.home.position + 1
              : window.home.position;
          if (window.home.position <= window.home.data.main.lists.length) {
            $(".rows")[0]?.slick?.slickGoTo(window.home.position - 1);
            const currentRow = $(".row-content")[window.home.position - 1];
            if (currentRow?.slick) {
              currentRow.slick.slickGoTo(currentRow.slick.getCurrent());
              currentRow.className += " selected";
            }
          }
        } else {
          $(".details.full").removeClass("full");
          const firstRow = $(".row-content")[0];
          $(".rows")[0]?.slick?.slickGoTo(0);
          if (firstRow?.slick) {
            firstRow.slick.slickGoTo(firstRow.slick.getCurrent());
            firstRow.className += " selected";
          }
          window.home.position++;
        }
        window.home.show_details();
        break;
      case window.tvKey?.KEY_LEFT:
        if (window.home.position > 0) {
          const currentSlide = $(".row-content")[window.home.position - 1];
          if (currentSlide?.slick?.currentSlide === 0) {
            if (!window.home.fromCategory.state) {
              window.menu.open();
            } else {
              window.home.destroy();
              window.browse.init(window.home.fromCategory.index);
            }
          } else if (currentSlide?.slick) {
            currentSlide.slick.prev();
            window.home.show_details();
          }
        } else {
          const buttons = $(".details .buttons a");
          const current = buttons.index($(".details .buttons a.selected"));
          if (current === 0) {
            if (!window.home.fromCategory.state) {
              window.menu.open();
            } else {
              window.home.destroy();
              window.browse.init(window.home.fromCategory.index);
            }
          } else {
            buttons.removeClass("selected");
            buttons.eq(current > 0 ? current - 1 : current).addClass("selected");
          }
        }
        break;
      case window.tvKey?.KEY_RIGHT:
        if (window.home.position > 0) {
          const currentList = window.home.data.main.lists[window.home.position - 1];
          const currentSlide = $(".row-content")[window.home.position - 1];

          if (currentSlide?.slick && currentSlide.slick.currentSlide < currentList.items.length - 1) {
            if (window.home.fromCategory.state && currentList.lazy) {
              if (
                currentList.items.length > 15 &&
                currentSlide.slick.currentSlide > currentList.items.length - 10
              ) {
                currentList.lazy = false;
                window.loading.start();
                window.mapper.loadCategoryListAsync(
                  `${window.home.data.main.category},${currentList.id}`,
                  currentList.items.length,
                  20,
                  window.home.position - 1,
                  {
                    success: (res, listIdx) => {
                      window.home.data.main.lists[listIdx].lazy = res.items.length === 20;
                      window.home.addToList(listIdx, window.mapper.mapItems(res.items || []));
                      window.loading.end();
                    },
                    error: () => {
                      window.loading.end();
                    },
                  }
                );
              }
            }
            currentSlide.slick.next();
            window.home.show_details();
          }
        } else {
          const buttons = $(".details .buttons a");
          const current = buttons.index($(".details .buttons a.selected"));
          buttons.removeClass("selected");
          buttons.eq(current < buttons.length - 1 ? current + 1 : current).addClass("selected");
        }
        break;
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const item =
          window.home.position > 0
            ? window.home.data.main.lists[window.home.position - 1]?.items[
                $(".row-content")[window.home.position - 1]?.slick?.currentSlide || 0
              ]
            : window.home.data.main.banner;
        if (item) {
          window.home_details.init(item);
        }
        break;
      }
    }
  },

  /**
   * Refetches home feed and restarts home screen view.
   */
  restart: () => {
    window.home.fromCategory.state = false;
    window.home.fromCategory.index = null;
    window.loading.start();
    window.home.data.main = null;
    window.service.home({
      success: (response) => {
        window.mapper.home(response, {
          success: () => {
            window.home.init();
            window.loading.end();
          },
        });
      },
      error: () => {
        window.loading.end();
      },
    });
  },

  /**
   * Dynamically appends lazily loaded items into existing slick row.
   * @param {number} index
   * @param {Array<object>} newItems
   */
  addToList: (index, newItems) => {
    const itemsCount = window.home.data.main.lists[index].items.length;
    const currentSlide = $(".row-content")[window.home.position - 1];
    window.home.data.main.lists[index].items =
      window.home.data.main.lists[index].items.concat(newItems);

    for (let i = 0; i < 9; i++) {
      currentSlide?.slick?.slickRemove(itemsCount + 8 - i);
    }

    newItems.forEach((element) => {
      currentSlide?.slick?.slickAdd(window.home.createItem(element));
    });

    for (let i = 0; i < 9; i++) {
      currentSlide?.slick?.slickAdd(window.home.createEmptyItem(newItems[0]?.display));
    }
  },

  /**
   * Creates DOM HTML string for a single media item card.
   * @param {object} item
   * @returns {string}
   */
  createItem: (item) => {
    const playhead = item.playhead
      ? `<div class="progress" style="width: ${
          (item.playhead * 100) / item.duration
        }%" value="${item.duration - item.playhead}m"></div>`
      : "";

    return `
    <div class="item">
      <div class="poster ${item.display}">
        ${
          item.display !== "serie"
            ? `<img src="${item.background}" alt="">${playhead}`
            : `<img src="${item.poster}" alt="">`
        }
      </div>
    </div>`;
  },

  /**
   * Creates DOM HTML string for an empty placeholder item.
   * @param {string} type
   * @returns {string}
   */
  createEmptyItem: (type) => {
    return `
    <div class="item">
      <div class="poster ${type}">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="">
      </div>
    </div>`;
  },
};
