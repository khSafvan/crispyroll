/**
 * Home Screen Controller (Feed, Contained Spotlight Hero, Continue Watching & Rows)
 * Single unified TV-first responsive design for Crispyroll
 */

window.home = {
  id: "home-screen",
  data: {
    main: null,
  },
  position: 0,
  heroFocusIdx: 0, // 0: Play Btn, 1: Info Btn, 2: Continue Tile (if present)
  continueItem: null,
  contextMenu: {
    isOpen: false,
    selectedIdx: 0,
    item: null,
  },
  fromCategory: {
    index: null,
    state: false,
    title: "",
  },

  /**
   * Initializes and renders home screen contained hero billboard, continue watching, and rows.
   */
  init: () => {
    const homeElement = document.createElement("div");
    homeElement.id = window.home.id;

    // Find any active continue watching / in-progress item
    window.home.continueItem = null;
    const allLists = window.home.data.main?.lists || [];
    for (const list of allLists) {
      const found = list.items.find(
        (item) => item.playhead > 0 && item.duration > 0 && item.playhead < item.duration
      );
      if (found) {
        window.home.continueItem = found;
        break;
      }
    }

    let posterItems = "";
    allLists.forEach((element) => {
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
    const cont = window.home.continueItem;

    const continueWatchingHtml = cont
      ? `
      <div class="continue-tile" id="home-continue-tile" data-id="${cont.id || ""}">
        <div class="tile-thumb">
          <img src="${cont.background || cont.poster || ""}" alt="${cont.title || ""}">
          <div class="tile-play-overlay">
            <div class="tile-play-icon"><i class="fa-solid fa-play"></i></div>
          </div>
          <div class="tile-progress-track">
            <div class="tile-progress-fill" style="width: ${Math.min(
              100,
              Math.max(5, (cont.playhead * 100) / cont.duration)
            )}%"></div>
          </div>
        </div>
        <div class="tile-info">
          <span class="tile-tag">${window.translate.go("home.continue") || "Continue Watching"}</span>
          <div class="tile-title">${cont.serie || cont.title || ""}</div>
          <div class="tile-subtitle">${
            cont.season_number ? `S${cont.season_number} ` : ""
          }${cont.episode_number ? `E${cont.episode_number}` : ""} ${
          cont.episode ? `• ${cont.episode}` : ""
        }</div>
        </div>
      </div>`
      : "";

    homeElement.innerHTML = `
    <div class="content">
      ${
        window.home.fromCategory.state
          ? `<div class="browse-back"><span></span><p>${window.home.fromCategory.title}</p></div>`
          : ""
      }
      
      <!-- Contained Billboard (Spotlight Hero & Continue Watching) -->
      <div class="billboard-container">
        <div class="spotlight-box">
          <div class="spotlight-bg">
            <img src="${banner.background || ""}" alt="">
          </div>
          <div class="spotlight-info">
            <div class="spotlight-badges">
              <span class="spotlight-badge featured">FEATURED</span>
              <span class="spotlight-badge hd">HD</span>
              <span class="spotlight-badge audio">SUB | DUB</span>
            </div>
            <h1 class="spotlight-title">${banner.title || ""}</h1>
            <p class="spotlight-description">${banner.description || ""}</p>
            <div class="spotlight-actions">
              <a class="btn-hero btn-primary selected" id="hero-btn-play">
                <i class="fa-solid fa-play"></i>
                <span>${window.translate.go("home.banner.play")}</span>
              </a>
              <a class="btn-hero btn-secondary" id="hero-btn-info">
                <i class="fa-solid fa-circle-info"></i>
                <span>${window.translate.go("home.banner.info")}</span>
              </a>
            </div>
          </div>
        </div>
        ${continueWatchingHtml}
      </div>

      <!-- Backward Compatibility Hidden Wrapper for home-details.js -->
      <div class="details full" style="display:none;">
        <div class="background">
          <img src="${banner.background || ""}" alt="">
        </div>
        <div class="info">
          <div class="title">${banner.title || ""}</div>
          <div class="description">${banner.description || ""}</div>
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

    const rowsEl = document.querySelector(`#${window.home.id} .rows`);
    if (rowsEl && typeof window.$ === "function" && typeof window.$(rowsEl)?.slick === "function") {
      window.$(rowsEl).slick({
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
        window.$(rc).slick({
          dots: false,
          arrows: false,
          infinite: false,
          slidesToShow: 6,
          slidesToScroll: 1,
          speed: 150,
          waitForAnimate: false,
          responsive: [
            {
              breakpoint: 1600,
              settings: { slidesToShow: 5 },
            },
            {
              breakpoint: 1200,
              settings: { slidesToShow: 4 },
            },
            {
              breakpoint: 800,
              settings: { slidesToShow: 3 },
            },
          ],
        });
      });

      const episodeContents = rowsEl.querySelectorAll(".row-content.episode");
      episodeContents.forEach((ep) => {
        window.$(ep).slick({
          dots: false,
          arrows: false,
          infinite: false,
          slidesToShow: 3.5,
          slidesToScroll: 1,
          speed: 150,
          waitForAnimate: false,
          responsive: [
            {
              breakpoint: 1400,
              settings: { slidesToShow: 2.5 },
            },
            {
              breakpoint: 900,
              settings: { slidesToShow: 1.5 },
            },
          ],
        });
      });

      window.$(rowsEl).slick("slickGoTo", 0);
      rowContents[0]?.slick?.slickGoTo(0);
    }

    // Hero Action Buttons Event Listeners
    const heroPlayBtn = document.getElementById("hero-btn-play");
    const heroInfoBtn = document.getElementById("hero-btn-info");
    const continueTile = document.getElementById("home-continue-tile");

    heroPlayBtn?.addEventListener("click", () => {
      const bannerItem = window.home.data.main?.banner;
      if (bannerItem) {
        window.home_details.init(bannerItem);
      }
    });

    heroInfoBtn?.addEventListener("click", () => {
      const bannerItem = window.home.data.main?.banner;
      if (bannerItem) {
        window.home_details.init(bannerItem);
      }
    });

    continueTile?.addEventListener("click", () => {
      if (window.home.continueItem) {
        window.video.init(window.home.continueItem);
      }
    });

    // Poster Click & Hover Handlers
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

      // Right Click Context Menu Handler
      rowsEl.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const slide = e.target.closest(".slick-slide");
        const rowContent = e.target.closest(".row-content");
        if (slide && rowContent) {
          const allRows = Array.from(rowsEl.querySelectorAll(".row-content"));
          const rowIdx = allRows.indexOf(rowContent);
          const slideIdx = parseInt(slide.dataset.slickIndex, 10);
          if (rowIdx >= 0 && !isNaN(slideIdx)) {
            const item = window.home.data.main?.lists?.[rowIdx]?.items?.[slideIdx];
            if (item) {
              window.home.openContextMenu(item);
            }
          }
        }
      });
    }

    window.home.updateHeroFocus();
    window.main.state = window.home.id;
    window.changelog.init();
  },

  destroy: () => {
    window.home.closeContextMenu();
    window.home.position = 0;
    window.home.heroFocusIdx = 0;
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

    const bgImg = document.querySelector("#home-screen .spotlight-bg img");
    if (bgImg && item.background) bgImg.src = item.background;

    const title = document.querySelector("#home-screen .spotlight-title");
    if (title) title.innerText = item.title || "";

    const description = document.querySelector("#home-screen .spotlight-description");
    if (description) description.innerText = item.description || "";
  },

  /**
   * Updates visual focus in hero billboard among Play, Info, and Continue Tile.
   */
  updateHeroFocus: () => {
    const playBtn = document.getElementById("hero-btn-play");
    const infoBtn = document.getElementById("hero-btn-info");
    const continueTile = document.getElementById("home-continue-tile");

    playBtn?.classList.remove("selected", "focus");
    infoBtn?.classList.remove("selected", "focus");
    continueTile?.classList.remove("selected", "focus");

    if (window.home.position === 0) {
      if (window.home.heroFocusIdx === 0) {
        playBtn?.classList.add("selected", "focus");
      } else if (window.home.heroFocusIdx === 1) {
        infoBtn?.classList.add("selected", "focus");
      } else if (window.home.heroFocusIdx === 2 && continueTile) {
        continueTile?.classList.add("selected", "focus");
      }
    }
  },

  /**
   * Opens Quick-Action Context Menu for given item.
   * @param {object} item
   */
  openContextMenu: (item) => {
    if (!item) return;
    window.home.closeContextMenu();
    window.home.contextMenu.isOpen = true;
    window.home.contextMenu.item = item;
    window.home.contextMenu.selectedIdx = 0;

    const menuEl = document.createElement("div");
    menuEl.id = "home-context-menu";
    menuEl.innerHTML = `
    <div class="context-panel">
      <div class="context-header">
        <img src="${item.poster || item.background || ""}" alt="${item.title || ""}">
        <div class="context-info">
          <div class="context-title">${item.title || ""}</div>
          <div class="context-meta">${item.display === "episode" ? "Episode" : "Series"}</div>
        </div>
      </div>
      <div class="context-options">
        <div class="context-option selected" data-action="play">
          <i class="fa-solid fa-play"></i>
          <span>${window.translate.go("home.banner.play")}</span>
        </div>
        <div class="context-option" data-action="watchlist">
          <i class="fa-solid fa-bookmark"></i>
          <span>${window.translate.go("home.details.add")}</span>
        </div>
        <div class="context-option" data-action="details">
          <i class="fa-solid fa-circle-info"></i>
          <span>${window.translate.go("home.banner.info")}</span>
        </div>
      </div>
    </div>`;

    menuEl.addEventListener("click", (e) => {
      if (e.target === menuEl) {
        window.home.closeContextMenu();
        return;
      }
      const opt = e.target.closest(".context-option");
      if (opt) {
        const action = opt.getAttribute("data-action");
        window.home.executeContextAction(action);
      }
    });

    document.body.appendChild(menuEl);
  },

  /**
   * Closes Quick-Action Context Menu.
   */
  closeContextMenu: () => {
    window.home.contextMenu.isOpen = false;
    window.home.contextMenu.item = null;
    const menuEl = document.getElementById("home-context-menu");
    if (menuEl) menuEl.remove();
  },

  /**
   * Executes Context Menu action.
   * @param {string} action
   */
  executeContextAction: (action) => {
    const item = window.home.contextMenu.item;
    window.home.closeContextMenu();
    if (!item) return;

    if (action === "play") {
      window.video.init(item);
    } else if (action === "watchlist") {
      window.mylist.toggleStatus(item.id, true, {
        success: () => {},
        error: () => {},
      });
    } else if (action === "details") {
      window.home_details.init(item);
    }
  },

  /**
   * Key down event handler for home screen navigation.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    // If Context Menu is open, handle context menu navigation
    if (window.home.contextMenu.isOpen) {
      const options = Array.from(document.querySelectorAll("#home-context-menu .context-option"));
      switch (event.keyCode) {
        case window.tvKey?.IS_KEY_BACK(event.keyCode):
        case 27:
          window.home.closeContextMenu();
          break;
        case window.tvKey?.KEY_UP:
          options.forEach((o) => o.classList.remove("selected", "focus"));
          window.home.contextMenu.selectedIdx =
            window.home.contextMenu.selectedIdx > 0
              ? window.home.contextMenu.selectedIdx - 1
              : options.length - 1;
          options[window.home.contextMenu.selectedIdx]?.classList.add("selected", "focus");
          break;
        case window.tvKey?.KEY_DOWN:
          options.forEach((o) => o.classList.remove("selected", "focus"));
          window.home.contextMenu.selectedIdx =
            window.home.contextMenu.selectedIdx < options.length - 1
              ? window.home.contextMenu.selectedIdx + 1
              : 0;
          options[window.home.contextMenu.selectedIdx]?.classList.add("selected", "focus");
          break;
        case 32:
        case window.tvKey?.KEY_ENTER:
        case window.tvKey?.KEY_PANEL_ENTER: {
          const opt = options[window.home.contextMenu.selectedIdx];
          if (opt) {
            const action = opt.getAttribute("data-action");
            window.home.executeContextAction(action);
          }
          break;
        }
      }
      return;
    }

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
        if (window.home.position > 1) {
          rowContents.forEach((r) => r.classList.remove("selected"));
          window.home.position--;
          rowsEl?.slick?.slickGoTo(window.home.position - 1);
          const currentRow = rowContents[window.home.position - 1];
          if (currentRow?.slick) {
            currentRow.slick.slickGoTo(currentRow.slick.getCurrent());
            currentRow.classList.add("selected");
          }
        } else if (window.home.position === 1) {
          // Move from row 1 back to Billboard
          rowContents.forEach((r) => r.classList.remove("selected"));
          window.home.position = 0;
          window.home.updateHeroFocus();
        }
        window.home.show_details();
        break;

      case window.tvKey?.KEY_DOWN:
        if (window.home.position === 0) {
          // Move from Billboard down into first row
          window.home.position = 1;
          const firstRow = rowContents[0];
          rowsEl?.slick?.slickGoTo(0);
          if (firstRow?.slick) {
            firstRow.slick.slickGoTo(firstRow.slick.getCurrent());
            firstRow.classList.add("selected");
          }
          window.home.updateHeroFocus();
        } else if (window.home.position < rowContents.length) {
          rowContents.forEach((r) => r.classList.remove("selected"));
          window.home.position++;
          rowsEl?.slick?.slickGoTo(window.home.position - 1);
          const currentRow = rowContents[window.home.position - 1];
          if (currentRow?.slick) {
            currentRow.slick.slickGoTo(currentRow.slick.getCurrent());
            currentRow.classList.add("selected");
          }
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
          // Hero Billboard Navigation
          if (window.home.heroFocusIdx > 0) {
            window.home.heroFocusIdx--;
            window.home.updateHeroFocus();
          } else {
            // At leftmost hero action, opening rail
            if (!window.home.fromCategory.state) {
              window.menu.open();
            } else {
              window.home.destroy();
              window.browse.init(window.home.fromCategory.index);
            }
          }
        }
        break;

      case window.tvKey?.KEY_RIGHT:
        if (window.home.position > 0) {
          const currentList = window.home.data.main.lists[window.home.position - 1];
          const currentSlide = rowContents[window.home.position - 1];

          if (
            currentSlide?.slick &&
            currentSlide.slick.currentSlide < currentList.items.length - 1
          ) {
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
          // Hero Billboard Navigation
          const maxHeroIdx = window.home.continueItem ? 2 : 1;
          if (window.home.heroFocusIdx < maxHeroIdx) {
            window.home.heroFocusIdx++;
            window.home.updateHeroFocus();
          }
        }
        break;

      case 77: // 'M' for Context Menu / Option
      case window.tvKey?.KEY_MENU: {
        if (window.home.position > 0) {
          const item =
            window.home.data.main.lists[window.home.position - 1]?.items[
              rowContents[window.home.position - 1]?.slick?.currentSlide || 0
            ];
          if (item) {
            window.home.openContextMenu(item);
          }
        }
        break;
      }

      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        if (window.home.position === 0) {
          if (window.home.heroFocusIdx === 0) {
            const bannerItem = window.home.data.main?.banner;
            if (bannerItem) window.home_details.init(bannerItem);
          } else if (window.home.heroFocusIdx === 1) {
            const bannerItem = window.home.data.main?.banner;
            if (bannerItem) window.home_details.init(bannerItem);
          } else if (window.home.heroFocusIdx === 2 && window.home.continueItem) {
            // Direct-play on select for continue watching tile
            window.video.init(window.home.continueItem);
          }
        } else {
          const item =
            window.home.data.main.lists[window.home.position - 1]?.items[
              rowContents[window.home.position - 1]?.slick?.currentSlide || 0
            ];
          if (item) {
            window.home_details.init(item);
          }
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
   * Creates DOM HTML string for a single media item card with external labels.
   * @param {object} item
   * @returns {string}
   */
  createItem: (item) => {
    const isEpisode = item.display === "episode";
    const playhead =
      item.playhead && item.duration
        ? `<div class="progress" style="width: ${Math.min(
            100,
            (item.playhead * 100) / item.duration
          )}%"></div>`
        : "";

    const titleText = isEpisode ? item.serie || item.title || "" : item.title || "";
    const subtitleText = isEpisode
      ? `${item.season_number ? `S${item.season_number} ` : ""}${
          item.episode_number ? `E${item.episode_number}` : ""
        } ${item.episode ? `• ${item.episode}` : ""}`
      : item.subtitle || (item.item_count ? `${item.item_count} Items` : "");

    return `
    <div class="item" data-id="${item.id || ""}">
      <div class="poster ${item.display}">
        <img src="${isEpisode ? item.background || item.poster : item.poster}" alt="${item.title || ""}">
        ${playhead}
      </div>
      <div class="card-meta">
        <div class="card-title">${titleText}</div>
        <div class="card-subtitle">${subtitleText}</div>
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
    <div class="item empty">
      <div class="poster ${type}">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="">
      </div>
      <div class="card-meta"></div>
    </div>`;
  },
};
