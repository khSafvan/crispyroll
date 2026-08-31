/**
 * Home Screen Controller — "Vinyl Gallery" Architecture
 * Floating Pill Sidebar, 1:1 Big Square Hero Carousel with Content Priority,
 * Tactile Action Blocks, and Smooth Natural Page Flow.
 */

window.home = {
  id: "home-screen",
  data: {
    main: null,
  },
  position: 0, // 0: Hero Action Blocks, 1+: Category Rows
  heroFocusIdx: 0, // 0: Primary Action, 1: Secondary Action
  carousel: {
    items: [],
    currentIndex: 0,
    timer: null,
    isPaused: false,
    intervalMs: 7000,
  },
  remainingContinue: [],
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
   * Initializes and renders Vinyl Gallery Home Screen with Hero Carousel.
   */
  init: () => {
    const homeElement = document.createElement("div");
    homeElement.id = window.home.id;

    // 1. Build Hero Carousel Slides with Content Priority
    const allLists = window.home.data.main?.lists || [];
    const inProgressItems = [];

    for (const list of allLists) {
      for (const item of list.items) {
        if (item.playhead > 0 && item.duration > 0 && item.playhead < item.duration) {
          if (!inProgressItems.some((x) => (x.id || x.stream) === (item.id || item.stream))) {
            inProgressItems.push(item);
          }
        }
      }
    }

    const carouselSlides = [];

    // Priority Slide 1: In-progress Continue Watching item (if present)
    if (inProgressItems.length > 0) {
      carouselSlides.push({
        ...inProgressItems[0],
        isContinue: true,
        eyebrow: window.translate.go("home.continue") || "CONTINUE WATCHING",
      });
      window.home.remainingContinue = inProgressItems.slice(1);
    } else {
      window.home.remainingContinue = [];
    }

    // Subsequent Slides: Featured / Spotlight promotional banners from Crunchyroll API
    const bannerList =
      window.home.data.main?.banners && window.home.data.main.banners.length > 0
        ? window.home.data.main.banners
        : window.home.data.main?.banner && window.home.data.main.banner.id
          ? [window.home.data.main.banner]
          : [];

    bannerList.forEach((b) => {
      if (b && b.title && !carouselSlides.some((s) => s.id === b.id)) {
        carouselSlides.push({
          ...b,
          isContinue: false,
          eyebrow: "FEATURED SIMULCAST",
        });
      }
    });

    // Supplement with top recommendations if needed so carousel has 3-5 rich slides
    if (carouselSlides.length < 3 && allLists.length > 0) {
      const topItems = allLists[0]?.items || [];
      for (const item of topItems) {
        if (carouselSlides.length >= 5) break;
        if (!carouselSlides.some((s) => s.id === item.id)) {
          carouselSlides.push({
            ...item,
            isContinue: false,
            eyebrow: "FEATURED SERIES",
          });
        }
      }
    }

    // Default fallback if feed is completely empty
    if (carouselSlides.length === 0) {
      carouselSlides.push({
        id: "fallback-featured",
        title: "Featured Anime",
        description: "Stream the latest anime simulcasts directly from Japan in high definition.",
        background: "",
        isContinue: false,
        eyebrow: "FEATURED SIMULCAST",
      });
    }

    window.home.carousel.items = carouselSlides;
    window.home.carousel.currentIndex = 0;

    // 2. Build Category Rows (Remaining Continue Watching + Standard 2:3 Poster Rows)
    let rowsHtml = "";

    // Remaining Continue Watching Row (16:9 widescreen cards)
    if (window.home.remainingContinue.length > 0) {
      rowsHtml += `
      <div class="row continue-watching-row" data-row-idx="0">
        <div class="row-title">${window.translate.go("home.continue") || "Continue Watching"}</div>
        <div class="row-content episode">`;
      window.home.remainingContinue.forEach((item) => {
        rowsHtml += window.home.createItem(item);
      });
      for (let i = 0; i < 9; i++) {
        rowsHtml += window.home.createEmptyItem("episode");
      }
      rowsHtml += `</div></div>`;
    }

    // Curated / Recommendation Rows (2:3 vertical poster cards)
    allLists.forEach((element, idx) => {
      if (element.items.length > 0) {
        const displayType = element.items[0]?.display === "episode" ? "episode" : "serie";
        const rowDataIdx = window.home.remainingContinue.length > 0 ? idx + 1 : idx;
        rowsHtml += `
        <div class="row" data-row-idx="${rowDataIdx}">
          <div class="row-title">${element.title}</div>
          <div class="row-content ${displayType}">`;
        element.items.forEach((item) => {
          rowsHtml += window.home.createItem(item);
        });
        for (let i = 0; i < 9; i++) {
          rowsHtml += window.home.createEmptyItem(displayType);
        }
        rowsHtml += `</div></div>`;
      }
    });

    homeElement.innerHTML = `
    <div class="content" id="home-content-scroll">
      ${
        window.home.fromCategory.state
          ? `<div class="browse-back"><span></span><p>${window.home.fromCategory.title}</p></div>`
          : ""
      }

      <!-- Vinyl Gallery Big Square Hero Carousel -->
      <div class="vinyl-hero-container" id="vinyl-hero-container">
        <!-- 1:1 Big Square Hero Artwork -->
        <div class="hero-square" id="hero-square" role="button" aria-label="Featured Artwork">
          <img class="hero-square-img" id="hero-square-img" src="" alt="Featured Art" onerror="this.style.display='none'; document.getElementById('hero-square-fallback').style.display='flex';"/>
          <div class="hero-square-fallback" id="hero-square-fallback" style="display:none;">
            <svg viewBox="0 0 100 100" class="hero-fallback-svg" width="96" height="96" fill="#ff6600">
              <path d="M50 8C26.8 8 8 26.8 8 50s18.8 42 42 42c13.2 0 25-6.1 32.7-15.6-3.8.8-7.7 1.2-11.7 1.2-22.1 0-40-17.9-40-40 0-11.8 5.1-22.4 13.3-29.7C49.9 8.2 47 8 50 8z" />
              <path d="M58 20c-16.6 0-30 13.4-30 30s13.4 30 30 30c6.6 0 12.8-2.1 17.8-5.8-3.1.5-6.3.8-9.8.8-17.7 0-32-14.3-32-32 0-9.4 4.1-17.9 10.6-23.7C62.1 20.1 60.1 20 58 20z" />
            </svg>
          </div>
        </div>

        <!-- Floating Typography Stack -->
        <div class="hero-typography-stack">
          <div class="hero-carousel-header">
            <span class="hero-eyebrow" id="hero-eyebrow">FEATURED SIMULCAST</span>
            <!-- Carousel Indicator Dots -->
            <div class="hero-carousel-dots" id="hero-carousel-dots"></div>
          </div>

          <h1 class="hero-title" id="hero-title">Featured Title</h1>
          <div class="hero-metadata-row" id="hero-metadata-row"></div>
          <p class="hero-description" id="hero-description"></p>
          
          <!-- Tactile Action Blocks -->
          <div class="hero-action-blocks">
            <button class="hero-action-block primary selected" id="hero-btn-primary" type="button">
              <i class="fa-solid fa-play"></i>
              <span id="hero-btn-primary-text">Watch Now</span>
            </button>
            <button class="hero-action-block secondary" id="hero-btn-secondary" type="button">
              <i class="fa-solid fa-bookmark" id="hero-btn-secondary-icon"></i>
              <span id="hero-btn-secondary-text">+ Watchlist</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Rows Container (Flows naturally below Hero) -->
      <div class="rows">
        ${rowsHtml}
      </div>

      <!-- Backward Compatibility Hidden Wrapper for home-details.js -->
      <div class="details full" style="display:none;">
        <div class="background"><img src="" alt=""></div>
        <div class="info">
          <div class="title"></div>
          <div class="description"></div>
          <div class="buttons">
            <a class="selected">Play</a>
            <a>Details</a>
          </div>
        </div>
      </div>
    </div>`;

    document.body.appendChild(homeElement);

    // Initialize Horizontal Slick for Category Rows
    const rowsEl = document.querySelector(`#${window.home.id} .rows`);
    if (rowsEl && typeof window.$ === "function") {
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
            { breakpoint: 1600, settings: { slidesToShow: 5 } },
            { breakpoint: 1200, settings: { slidesToShow: 4 } },
            { breakpoint: 800, settings: { slidesToShow: 3 } },
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
            { breakpoint: 1400, settings: { slidesToShow: 2.5 } },
            { breakpoint: 900, settings: { slidesToShow: 1.5 } },
          ],
        });
      });
    }

    // Render Initial Hero Carousel Slide
    window.home.renderCurrentHeroSlide();
    window.home.startAutoAdvance();

    // Pause auto-advance on mouse hover over hero
    const heroContainer = document.getElementById("vinyl-hero-container");
    heroContainer?.addEventListener("mouseenter", () => window.home.pauseAutoAdvance());
    heroContainer?.addEventListener("mouseleave", () => window.home.resumeAutoAdvance());

    // Hero Square Click (Opens Anime Details)
    const heroSquare = document.getElementById("hero-square");
    heroSquare?.addEventListener("click", () => {
      const current = window.home.carousel.items[window.home.carousel.currentIndex];
      if (current) {
        window.home_details.init(current);
      }
    });

    // Hero Action Buttons Click Listeners
    const primaryBtn = document.getElementById("hero-btn-primary");
    const secondaryBtn = document.getElementById("hero-btn-secondary");

    primaryBtn?.addEventListener("click", () => {
      const current = window.home.carousel.items[window.home.carousel.currentIndex];
      if (!current) return;
      if (current.isContinue || current.display === "episode" || current.stream) {
        window.video.init(current);
      } else {
        window.home_details.init(current);
      }
    });

    secondaryBtn?.addEventListener("click", () => {
      const current = window.home.carousel.items[window.home.carousel.currentIndex];
      if (!current) return;
      if (!current.isContinue) {
        window.mylist.toggleStatus(current.id, true, {
          success: () => {},
          error: () => {},
        });
      } else {
        window.home_details.init(current);
      }
    });

    // Poster Click & Selection Handlers (Does NOT alter Hero Carousel content)
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
            window.home.updateHeroFocus();
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
            let item;
            if (window.home.remainingContinue.length > 0 && rowIdx === 0) {
              item = window.home.remainingContinue[slideIdx];
            } else {
              const listOffset = window.home.remainingContinue.length > 0 ? 1 : 0;
              item = window.home.data.main?.lists?.[rowIdx - listOffset]?.items?.[slideIdx];
            }
            if (item) {
              if (item.display === "episode" || item.playhead) {
                window.video.init(item);
              } else {
                window.home_details.init(item);
              }
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
            let item;
            if (window.home.remainingContinue.length > 0 && rowIdx === 0) {
              item = window.home.remainingContinue[slideIdx];
            } else {
              const listOffset = window.home.remainingContinue.length > 0 ? 1 : 0;
              item = window.home.data.main?.lists?.[rowIdx - listOffset]?.items?.[slideIdx];
            }
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
    window.home.pauseAutoAdvance();
    window.home.closeContextMenu();
    window.home.position = 0;
    window.home.heroFocusIdx = 0;
    const el = document.getElementById(window.home.id);
    if (el) {
      document.body.removeChild(el);
    }
  },

  /**
   * Renders the current Hero Carousel slide with smooth image and typography transitions.
   */
  renderCurrentHeroSlide: () => {
    const { items, currentIndex } = window.home.carousel;
    if (!items || items.length === 0) return;

    const slide = items[currentIndex];
    if (!slide) return;

    const heroImg = document.getElementById("hero-square-img");
    const heroFallback = document.getElementById("hero-square-fallback");
    const eyebrowEl = document.getElementById("hero-eyebrow");
    const titleEl = document.getElementById("hero-title");
    const metaRowEl = document.getElementById("hero-metadata-row");
    const descEl = document.getElementById("hero-description");
    const primaryTextEl = document.getElementById("hero-btn-primary-text");
    const secondaryTextEl = document.getElementById("hero-btn-secondary-text");
    const secondaryIconEl = document.getElementById("hero-btn-secondary-icon");
    const dotsEl = document.getElementById("hero-carousel-dots");

    const heroImage = slide.background || slide.poster || "";
    const isCont = Boolean(slide.isContinue);
    const heroTitle = (isCont ? slide.serie || slide.title : slide.title) || "Featured Title";

    const heroEpisodeMeta = isCont
      ? `${slide.season_number ? `S${slide.season_number} ` : ""}${
          slide.episode_number ? `E${slide.episode_number}` : ""
        }${slide.episode ? ` • ${slide.episode}` : ""}`
      : "";

    const heroProgressText =
      isCont && slide.duration && slide.playhead
        ? `${Math.max(1, slide.duration - slide.playhead)}m left`
        : "";

    const heroDescription =
      (isCont ? slide.description || slide.episode : slide.description) ||
      "Stream the latest episodes in high definition with original audio and subtitles.";

    const primaryActionLabel = isCont
      ? `Resume ${slide.season_number ? `S${slide.season_number} ` : ""}${
          slide.episode_number ? `E${slide.episode_number}` : ""
        }`
      : window.translate.go("home.banner.play") || "Watch Now";

    const secondaryActionLabel = isCont
      ? window.translate.go("home.banner.info") || "Details"
      : window.translate.go("home.details.add") || "+ Watchlist";

    // Update Artwork
    if (heroImg) {
      if (heroImage) {
        heroImg.style.display = "block";
        if (heroFallback) heroFallback.style.display = "none";
        heroImg.src = heroImage;
      } else {
        heroImg.style.display = "none";
        if (heroFallback) heroFallback.style.display = "flex";
      }
    }

    // Update Floating Typography
    if (eyebrowEl) eyebrowEl.textContent = slide.eyebrow || "FEATURED SIMULCAST";
    if (titleEl) titleEl.textContent = heroTitle;
    if (descEl) descEl.textContent = heroDescription;
    if (primaryTextEl) primaryTextEl.textContent = primaryActionLabel;
    if (secondaryTextEl) secondaryTextEl.textContent = secondaryActionLabel;
    if (secondaryIconEl) {
      secondaryIconEl.className = isCont ? "fa-solid fa-circle-info" : "fa-solid fa-bookmark";
    }

    if (metaRowEl) {
      metaRowEl.innerHTML = `
        ${
          heroEpisodeMeta
            ? `<span class="hero-meta-tag episode-tag">${heroEpisodeMeta}</span>`
            : ""
        }
        ${
          heroProgressText
            ? `<span class="hero-meta-tag progress-tag">${heroProgressText}</span>`
            : ""
        }
        <span class="hero-meta-tag hd">HD</span>
        <span class="hero-meta-tag audio">SUB | DUB</span>`;
    }

    // Render Indicator Dots
    if (dotsEl && items.length > 1) {
      dotsEl.innerHTML = items
        .map(
          (_, idx) => `
        <button class="hero-carousel-dot ${
          idx === currentIndex ? "active" : ""
        }" data-dot-idx="${idx}" type="button" title="Slide ${idx + 1}"></button>`
        )
        .join("");

      dotsEl.querySelectorAll(".hero-carousel-dot").forEach((dot) => {
        dot.addEventListener("click", () => {
          const targetIdx = parseInt(dot.getAttribute("data-dot-idx"), 10);
          if (!isNaN(targetIdx)) {
            window.home.goToSlide(targetIdx);
          }
        });
      });
    }
  },

  /**
   * Advances Hero Carousel to next slide.
   */
  nextSlide: () => {
    const { items, currentIndex } = window.home.carousel;
    if (items.length <= 1) return;
    window.home.carousel.currentIndex = (currentIndex + 1) % items.length;
    window.home.renderCurrentHeroSlide();
  },

  /**
   * Advances Hero Carousel to previous slide.
   */
  prevSlide: () => {
    const { items, currentIndex } = window.home.carousel;
    if (items.length <= 1) return;
    window.home.carousel.currentIndex = (currentIndex - 1 + items.length) % items.length;
    window.home.renderCurrentHeroSlide();
  },

  /**
   * Jumps to a specific slide index.
   * @param {number} index
   */
  goToSlide: (index) => {
    const { items } = window.home.carousel;
    if (index >= 0 && index < items.length) {
      window.home.carousel.currentIndex = index;
      window.home.renderCurrentHeroSlide();
    }
  },

  /**
   * Starts automatic carousel rotation timer.
   */
  startAutoAdvance: () => {
    window.home.pauseAutoAdvance();
    window.home.carousel.timer = setInterval(() => {
      if (!window.home.carousel.isPaused && window.home.position !== 0) {
        window.home.nextSlide();
      }
    }, window.home.carousel.intervalMs);
  },

  /**
   * Pauses carousel rotation timer.
   */
  pauseAutoAdvance: () => {
    if (window.home.carousel.timer) {
      clearInterval(window.home.carousel.timer);
      window.home.carousel.timer = null;
    }
  },

  /**
   * Resumes carousel rotation timer.
   */
  resumeAutoAdvance: () => {
    window.home.startAutoAdvance();
  },

  /**
   * Updates visual focus between Primary and Secondary Action Blocks in Big Square Hero.
   */
  updateHeroFocus: () => {
    const primaryBtn = document.getElementById("hero-btn-primary");
    const secondaryBtn = document.getElementById("hero-btn-secondary");

    primaryBtn?.classList.remove("selected", "focus");
    secondaryBtn?.classList.remove("selected", "focus");

    if (window.home.position === 0) {
      if (window.home.heroFocusIdx === 0) {
        primaryBtn?.classList.add("selected", "focus");
      } else if (window.home.heroFocusIdx === 1) {
        secondaryBtn?.classList.add("selected", "focus");
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
          <span>${window.translate.go("home.banner.play") || "Play"}</span>
        </div>
        <div class="context-option" data-action="watchlist">
          <i class="fa-solid fa-bookmark"></i>
          <span>${window.translate.go("home.details.add") || "Add to Watchlist"}</span>
        </div>
        <div class="context-option" data-action="details">
          <i class="fa-solid fa-circle-info"></i>
          <span>${window.translate.go("home.banner.info") || "Details"}</span>
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
   * Key down event handler for Vinyl Gallery Home Screen navigation.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
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
    const scrollContainer = document.getElementById("home-content-scroll");

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
          const currentRow = rowContents[window.home.position - 1];
          if (currentRow) {
            currentRow.classList.add("selected");
            currentRow.closest(".row")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        } else if (window.home.position === 1) {
          // Move from Row 1 back up to Hero Carousel
          rowContents.forEach((r) => r.classList.remove("selected"));
          window.home.position = 0;
          window.home.updateHeroFocus();
          scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
        }
        break;

      case window.tvKey?.KEY_DOWN:
        if (window.home.position === 0) {
          // Move from Hero Carousel down into first row
          if (rowContents.length > 0) {
            window.home.position = 1;
            const firstRow = rowContents[0];
            firstRow.classList.add("selected");
            firstRow.closest(".row")?.scrollIntoView({ behavior: "smooth", block: "center" });
            window.home.updateHeroFocus();
          }
        } else if (window.home.position < rowContents.length) {
          rowContents.forEach((r) => r.classList.remove("selected"));
          window.home.position++;
          const currentRow = rowContents[window.home.position - 1];
          if (currentRow) {
            currentRow.classList.add("selected");
            currentRow.closest(".row")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
        break;

      case window.tvKey?.KEY_LEFT:
        if (window.home.position > 0) {
          // In category rows: if already on the leftmost poster card, pressing Left again opens the sidebar menu!
          const currentSlide = rowContents[window.home.position - 1];
          if (currentSlide?.slick) {
            if (currentSlide.slick.currentSlide > 0) {
              currentSlide.slick.prev();
            } else {
              // On leftmost card: navigate into the sidebar
              if (!window.home.fromCategory.state) {
                window.menu.open();
              } else {
                window.home.destroy();
                window.browse.init(window.home.fromCategory.index);
              }
            }
          }
        } else {
          // On Hero Banner: Left toggles between action buttons, or loops to prev slide if on primary
          if (window.home.heroFocusIdx > 0) {
            window.home.heroFocusIdx--;
            window.home.updateHeroFocus();
          } else {
            window.home.prevSlide();
          }
        }
        break;

      case window.tvKey?.KEY_RIGHT:
        if (window.home.position > 0) {
          const isRemainingRow =
            window.home.remainingContinue.length > 0 && window.home.position === 1;
          const listOffset = window.home.remainingContinue.length > 0 ? 1 : 0;
          const currentList = isRemainingRow
            ? { items: window.home.remainingContinue }
            : window.home.data.main.lists[window.home.position - 1 - listOffset];
          const currentSlide = rowContents[window.home.position - 1];

          if (
            currentSlide?.slick &&
            currentList?.items &&
            currentSlide.slick.currentSlide < currentList.items.length - 1
          ) {
            currentSlide.slick.next();
          }
        } else {
          // On Hero Banner: Right toggles between action buttons, or loops to next slide if on secondary
          if (window.home.heroFocusIdx < 1) {
            window.home.heroFocusIdx++;
            window.home.updateHeroFocus();
          } else {
            window.home.nextSlide();
          }
        }
        break;

      case 77: // 'M' for Context Menu
      case window.tvKey?.KEY_MENU: {
        if (window.home.position > 0) {
          const currentSlideIdx =
            rowContents[window.home.position - 1]?.slick?.currentSlide || 0;
          let item;
          if (window.home.remainingContinue.length > 0 && window.home.position === 1) {
            item = window.home.remainingContinue[currentSlideIdx];
          } else {
            const listOffset = window.home.remainingContinue.length > 0 ? 1 : 0;
            item =
              window.home.data.main.lists[window.home.position - 1 - listOffset]?.items[
                currentSlideIdx
              ];
          }
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
          const current = window.home.carousel.items[window.home.carousel.currentIndex];
          if (!current) return;

          if (window.home.heroFocusIdx === 0) {
            if (current.isContinue || current.display === "episode" || current.stream) {
              window.video.init(current);
            } else {
              window.home_details.init(current);
            }
          } else if (window.home.heroFocusIdx === 1) {
            if (!current.isContinue) {
              window.mylist.toggleStatus(current.id, true, {
                success: () => {},
                error: () => {},
              });
            } else {
              window.home_details.init(current);
            }
          }
        } else {
          const currentSlideIdx =
            rowContents[window.home.position - 1]?.slick?.currentSlide || 0;
          let item;
          if (window.home.remainingContinue.length > 0 && window.home.position === 1) {
            item = window.home.remainingContinue[currentSlideIdx];
          } else {
            const listOffset = window.home.remainingContinue.length > 0 ? 1 : 0;
            item =
              window.home.data.main.lists[window.home.position - 1 - listOffset]?.items[
                currentSlideIdx
              ];
          }
          if (item) {
            if (item.display === "episode" || item.playhead) {
              window.video.init(item);
            } else {
              window.home_details.init(item);
            }
          }
        }
        break;
      }
    }
  },

  /**
   * Refetches home feed and restarts Vinyl Gallery home view.
   */
  restart: () => {
    window.home.pauseAutoAdvance();
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
      <div class="poster ${isEpisode ? "episode" : "serie"}">
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
