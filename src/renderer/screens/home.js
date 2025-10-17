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

    const title = document.querySelector("#home-screen .details .info .title");
    if (title) {
      title.style.fontSize = title.scrollHeight > title.clientHeight ? "3.5vh" : "5vh";
    }

    const description = document.querySelector("#home-screen .details .info .description");
    if (description) {
      description.style.fontSize =
        description.scrollHeight > description.clientHeight ? "2vh" : "2.5vh";
    }

    const rowsEl = document.querySelector(`#${window.home.id} .rows`);
    if (rowsEl && typeof $(rowsEl).slick === "function") {
      $(rowsEl).slick({
        vertical: true,
        dots: false,
        arrows: false,
        infinite: false,
        slidesToShow: 1.5,
        slidesToScroll: 1,
        speed: 150,
      });

      const rowContents = rowsEl.querySelectorAll(".row-content:not(.episode)");
      rowContents.forEach((rc) => {
        $(rc).slick({
          dots: false,
          arrows: false,
          infinite: false,
          slidesToShow: 10,
          slidesToScroll: 1,
          speed: 150,
        });
      });

      const epContents = rowsEl.querySelectorAll(".row-content.episode");
      epContents.forEach((ep) => {
        $(ep).slick({
          dots: false,
          arrows: false,
          infinite: false,
          slidesToShow: 5.5,
          slidesToScroll: 1,
          speed: 150,
        });
      });

      rowsEl.slick?.slickGoTo(0);
      rowContents[0]?.slick?.slickGoTo(0);
    }

    // Mouse click and hover handlers for details buttons
    const heroButtons = document.querySelectorAll("#home-screen .details .buttons a");
    heroButtons.forEach((btn, idx) => {
      btn.addEventListener("mouseover", () => {
        heroButtons.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      });

      btn.addEventListener("click", () => {
        const bannerItem = window.home.data.main?.banner;
        if (bannerItem) {
          window.home_details.init(bannerItem);
        }
      });
    });

    if (rowsEl) {
      rowsEl.addEventListener("mouseover", (e) => {
        const slide = e.target.closest(".slick-slide");
        const rowContent = e.target.closest(".row-content");
        if (slide && rowContent && rowsEl.contains(rowContent)) {
          const allRows = Array.from(rowsEl.querySelectorAll(".row-content"));
          const rowIdx = allRows.indexOf(rowContent);
          const slideIdx = parseInt(slide.dataset.slickIndex, 10);

          if (rowIdx >= 0 && !isNaN(slideIdx)) {
            window.home.position = rowIdx + 1;
            allRows.forEach((r) => r.classList.remove("selected"));
            rowContent.classList.add("selected");
            const detailsEl = document.querySelector("#home-screen .details");
            detailsEl?.classList.remove("full");
            if (rowContent.slick) {
              rowContent.slick.slickGoTo(slideIdx);
            }
            window.home.show_details();
          }
        }
      });

      rowsEl.addEventListener("click", (e) => {
        const slide = e.target.closest(".slick-slide");
        const rowContent = e.target.closest(".row-content");
        if (slide && rowContent && rowsEl.contains(rowContent)) {
          const allRows = Array.from(rowsEl.querySelectorAll(".row-content"));
          const rowIdx = allRows.indexOf(rowContent);
          const slideIdx = parseInt(slide.dataset.slickIndex, 10);

          if (rowIdx >= 0 && !isNaN(slideIdx)) {
            const item = window.home.data.main?.lists?.[rowIdx]?.items?.[slideIdx];
            if (item) {
              window.home_details.init(item);
            }
          }
        }
      });
    }

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
    const rowContents = document.querySelectorAll("#home-screen .row-content");
    const currentSlideIdx =
      window.home.position > 0
        ? rowContents[window.home.position - 1]?.slick?.currentSlide || 0
        : 0;

    const item =
      window.home.position > 0
        ? window.home.data.main.lists[window.home.position - 1]?.items[currentSlideIdx]
        : window.home.data.main.banner;

    if (!item) return;

    const bgImg = document.querySelector("#home-screen .details .background img");
    if (bgImg) bgImg.src = item.background || "";

    const title = document.querySelector("#home-screen .details .info .title");
    if (title) {
      title.innerText = item.title || "";
      title.style.fontSize = title.scrollHeight > title.clientHeight ? "3.5vh" : "5vh";
    }

    const description = document.querySelector("#home-screen .details .info .description");
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
    const rowContents = Array.from(document.querySelectorAll("#home-screen .row-content"));
    const rowsEl = document.querySelector("#home-screen .rows");

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
        rowContents.forEach((r) => r.classList.remove("selected"));
        if (window.home.position > 1) {
          window.home.position--;
          rowsEl?.slick?.slickGoTo(window.home.position - 1);
          const currentRow = rowContents[window.home.position - 1];
          if (currentRow?.slick) {
            currentRow.slick.slickGoTo(currentRow.slick.getCurrent());
            currentRow.classList.add("selected");
          }
        } else {
          const detailsEl = document.querySelector("#home-screen .details");
          detailsEl?.classList.add("full");
          window.home.position = 0;
        }
        window.home.show_details();
        break;
      case window.tvKey?.KEY_DOWN:
        if (window.home.position > 0) {
          rowContents.forEach((r) => r.classList.remove("selected"));
          window.home.position =
            window.home.position < window.home.data.main.lists.length
              ? window.home.position + 1
              : window.home.position;
          if (window.home.position <= window.home.data.main.lists.length) {
            rowsEl?.slick?.slickGoTo(window.home.position - 1);
            const currentRow = rowContents[window.home.position - 1];
            if (currentRow?.slick) {
              currentRow.slick.slickGoTo(currentRow.slick.getCurrent());
              currentRow.classList.add("selected");
            }
          }
        } else {
          const detailsEl = document.querySelector("#home-screen .details.full");
          detailsEl?.classList.remove("full");
          const firstRow = rowContents[0];
          rowsEl?.slick?.slickGoTo(0);
          if (firstRow?.slick) {
            firstRow.slick.slickGoTo(firstRow.slick.getCurrent());
            firstRow.classList.add("selected");
          }
          window.home.position++;
        }
        window.home.show_details();
        break;
      case window.tvKey?.KEY_LEFT:
        if (window.home.position > 0) {
          const currentSlide = rowContents[window.home.position - 1];
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
          const buttons = Array.from(document.querySelectorAll("#home-screen .details .buttons a"));
          const selBtn = document.querySelector("#home-screen .details .buttons a.selected");
          const current = selBtn ? buttons.indexOf(selBtn) : 0;
          if (current === 0) {
            if (!window.home.fromCategory.state) {
              window.menu.open();
            } else {
              window.home.destroy();
              window.browse.init(window.home.fromCategory.index);
            }
          } else {
            buttons.forEach((b) => b.classList.remove("selected"));
            const newCurrent = current > 0 ? current - 1 : current;
            buttons[newCurrent]?.classList.add("selected");
          }
        }
        break;
      case window.tvKey?.KEY_RIGHT:
        if (window.home.position > 0) {
          const currentList = window.home.data.main.lists[window.home.position - 1];
          const currentSlide = rowContents[window.home.position - 1];

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
          const buttons = Array.from(document.querySelectorAll("#home-screen .details .buttons a"));
          const selBtn = document.querySelector("#home-screen .details .buttons a.selected");
          const current = selBtn ? buttons.indexOf(selBtn) : 0;
          buttons.forEach((b) => b.classList.remove("selected"));
          const newCurrent = current < buttons.length - 1 ? current + 1 : current;
          buttons[newCurrent]?.classList.add("selected");
        }
        break;
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const item =
          window.home.position > 0
            ? window.home.data.main.lists[window.home.position - 1]?.items[
                rowContents[window.home.position - 1]?.slick?.currentSlide || 0
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
    const rowContents = document.querySelectorAll("#home-screen .row-content");
    const currentSlide = rowContents[window.home.position - 1];
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
