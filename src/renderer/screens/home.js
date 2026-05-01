/**
 * Home Screen Controller — Full Cinematic Hero Carousel, Category Row Icons & Stable Page Flow
 * Full-width Hero Banner (No separate buttons, click to open details),
 * fixed height typography bounds (zero layout shifts), and deliberate navigation.
 */

window.home = {
  id: "home-screen",
  data: {
    main: null,
  },
  position: 0, // 0: Full Hero Banner, 1+: Category Rows
  carousel: {
    items: [],
    currentIndex: 0,
    timer: null,
    isPaused: false,
    intervalMs: 7000,
  },
  continueWatching: [],
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
   * Returns a matching Phosphor inline SVG icon for each row category title.
   * @param {string} title
   * @param {string} [displayType="serie"]
   * @returns {string} Inline SVG string
   */
  getRowIcon: (title, displayType) => {
    if (window.icons?.getRowIcon) {
      return window.icons.getRowIcon(title, displayType, 18);
    }
    return "";
  },

  /**
   * Initializes and renders Home Screen with Full Cinematic Hero Banner & Icons.
   */
  init: () => {
    if (!window.home.data.main) {
      window.home.restart();
      return;
    }

    const homeElement = document.createElement("div");
    homeElement.id = window.home.id;

    // 1. Build Hero Carousel Slides with Content Priority
    const allLists = window.home.data.main?.lists || [];
    const inProgressItems = Array.isArray(window.home.continueWatching) && window.home.continueWatching.length > 0
      ? [...window.home.continueWatching]
      : [];

    if (inProgressItems.length === 0) {
      for (const list of allLists) {
        for (const item of list.items || []) {
          if (item.playhead > 0 && item.duration > 0 && item.playhead < item.duration) {
            if (!inProgressItems.some((x) => (x.id || x.stream) === (item.id || item.stream))) {
              inProgressItems.push(item);
            }
          }
        }
      }
    }

    window.home.continueWatching = inProgressItems;
    const carouselSlides = [];

    // Priority Slide 1: In-progress / Continue Watching item (if present)
    if (inProgressItems.length > 0) {
      carouselSlides.push({
        ...inProgressItems[0],
        isContinue: true,
        eyebrow: window.translate.go("home.continue") || "CONTINUE WATCHING",
      });
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

    // 2. Build Category Rows with Icons (Continue Watching + Standard 2:3 Poster Rows)
    let rowsHtml = "";

    // Continue Watching Row (16:9 widescreen rectangle cards)
    if (window.home.continueWatching.length > 0) {
      const continueTitle = window.translate.go("home.continue") || "Continue Watching";
      const iconSvg = window.home.getRowIcon(continueTitle, "episode");
      rowsHtml += `
      <div class="row continue-watching-row" data-row-idx="0">
        <div class="row-title">
          ${iconSvg}
          <span>${continueTitle}</span>
        </div>
        <div class="row-content episode">`;
      window.home.continueWatching.forEach((item) => {
        rowsHtml += window.home.createItem(item);
      });
      rowsHtml += `</div></div>`;
    }

    // Curated / Recommendation Rows (2:3 vertical poster cards)
    allLists.forEach((element, idx) => {
      if (element.items.length > 0) {
        const displayType = element.items[0]?.display === "episode" ? "episode" : "serie";
        const rowDataIdx = window.home.continueWatching.length > 0 ? idx + 1 : idx;
        const iconSvg = window.home.getRowIcon(element.title, displayType);
        rowsHtml += `
        <div class="row" data-row-idx="${rowDataIdx}">
          <div class="row-title">
            ${iconSvg}
            <span>${element.title}</span>
          </div>
          <div class="row-content ${displayType}">`;
        element.items.forEach((item) => {
          rowsHtml += window.home.createItem(item);
        });
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

      <!-- Full Cinematic Hero Banner (Click anywhere to Open Anime Details) -->
      <div class="hero-full-banner selected" id="hero-full-banner" tabindex="0" role="button" aria-label="Featured Banner">
        <img class="hero-banner-bg" id="hero-banner-bg" src="" alt="Featured Banner" onerror="this.style.display='none'; document.getElementById('hero-banner-fallback').style.display='flex';"/>
        <div class="hero-banner-fallback" id="hero-banner-fallback" style="display:none;">
          <svg viewBox="0 0 100 100" class="hero-fallback-svg" width="96" height="96" fill="#ff6600">
            <path d="M50 8C26.8 8 8 26.8 8 50s18.8 42 42 42c13.2 0 25-6.1 32.7-15.6-3.8.8-7.7 1.2-11.7 1.2-22.1 0-40-17.9-40-40 0-11.8 5.1-22.4 13.3-29.7C49.9 8.2 47 8 50 8z" />
            <path d="M58 20c-16.6 0-30 13.4-30 30s13.4 30 30 30c6.6 0 12.8-2.1 17.8-5.8-3.1.5-6.3.8-9.8.8-17.7 0-32-14.3-32-32 0-9.4 4.1-17.9 10.6-23.7C62.1 20.1 60.1 20 58 20z" />
          </svg>
        </div>

        <!-- Shading Gradient Overlays -->
        <div class="hero-banner-overlay-left"></div>
        <div class="hero-banner-overlay-bottom"></div>

        <!-- Pinned Typography Split Layout (Corners: Top-Left Title/Rating, Top-Right Floating Ratings, Bottom-Left Tags) -->
        <div class="hero-banner-content">
          <div class="hero-top-row">
            <div class="hero-top-left-group">
              <div class="hero-badge-row">
                <span class="hero-rating-badge" id="hero-rating-badge">TV-14</span>
                <span class="hero-eyebrow" id="hero-eyebrow">FEATURED SIMULCAST</span>
              </div>
              <h1 class="hero-title" id="hero-title">Featured Title</h1>
            </div>

            <!-- Upper-Right Corner: Floating Unboxed Community Ratings -->
            <div class="hero-upper-right-ratings" id="hero-upper-right-ratings"></div>
          </div>

          <div class="hero-bottom-group">
            <div class="hero-metadata-row" id="hero-metadata-row"></div>
          </div>
        </div>

        <!-- Carousel Indicator Dots (Positioned on lower right corner of banner) -->
        <div class="hero-carousel-dots" id="hero-carousel-dots"></div>
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

    // Full Banner Hover & Click Listeners (Clicking anywhere on banner opens Anime Details)
    const bannerEl = document.getElementById("hero-full-banner");
    bannerEl?.addEventListener("mouseenter", () => window.home.pauseAutoAdvance());
    bannerEl?.addEventListener("mouseleave", () => window.home.resumeAutoAdvance());

    bannerEl?.addEventListener("click", (e) => {
      // If clicking directly on a carousel dot, don't trigger details
      if (e.target.closest(".hero-carousel-dot")) return;
      const current = window.home.carousel.items[window.home.carousel.currentIndex];
      if (current) {
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
            if (window.home.continueWatching.length > 0 && rowIdx === 0) {
              item = window.home.continueWatching[slideIdx];
            } else {
              const listOffset = window.home.continueWatching.length > 0 ? 1 : 0;
              item = window.home.data.main?.lists?.[rowIdx - listOffset]?.items?.[slideIdx];
            }
            if (item) {
              window.home.openItem(item);
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
            if (window.home.continueWatching.length > 0 && rowIdx === 0) {
              item = window.home.continueWatching[slideIdx];
            } else {
              const listOffset = window.home.continueWatching.length > 0 ? 1 : 0;
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
    window.home.checkAndShowF11Toast();
  },

  f11ToastTimer: null,

  /**
   * Displays a one-time persisted toast notification on initial boot informing the user of F11 fullscreen toggle.
   */
  checkAndShowF11Toast: async () => {
    try {
      if (typeof window.electronUtilsRender?.getStoreValue === "function") {
        const hasShown = await window.electronUtilsRender.getStoreValue("hasShownF11Toast", false);
        if (hasShown) return;
        await window.electronUtilsRender.setStoreValue("hasShownF11Toast", true);
      }
    } catch {
      // Best-effort fallback
    }

    const infoSvg = window.icons?.get?.("info", { size: 16 }) || "";
    const content = `${infoSvg}<span>Press F11 to exit fullscreen</span>`;

    if (window.toast?.show) {
      window.toast.show(content, 3000);
    } else {
      const existingToast = document.querySelector(".app-toast-notification");
      if (existingToast) existingToast.remove();

      const toast = document.createElement("div");
      toast.className = "app-toast-notification";
      toast.innerHTML = content;
      document.body.appendChild(toast);

      const dismissToast = () => {
        if (!toast.parentNode || toast.classList.contains("hide-toast")) return;
        toast.classList.add("hide-toast");
        setTimeout(() => {
          if (toast.parentNode) toast.remove();
        }, 160);
      };

      toast.addEventListener("click", dismissToast);
      window.addEventListener("keydown", dismissToast, { once: true });
      setTimeout(dismissToast, 3000);
    }
  },

  destroy: () => {
    if (window.home.f11ToastTimer) {
      clearTimeout(window.home.f11ToastTimer);
      window.home.f11ToastTimer = null;
    }
    const existingToast = document.querySelector(".app-toast-notification");
    if (existingToast) existingToast.remove();
    window.home.pauseAutoAdvance();
    window.home.closeContextMenu();
    window.home.position = 0;
    const el = document.getElementById(window.home.id);
    if (el) {
      document.body.removeChild(el);
    }
  },  /** Title cache for elegant AniList sanitized titles */
  titleCache: new Map(),

  /**
   * Sanitizes noisy audio/dub/metadata tokens from catalog titles without mangling subtitles.
   * @param {string} rawTitle
   * @returns {string}
   */
  sanitizeAnimeTitle: (rawTitle) => {
    if (typeof window.sanitizeTitle === "function") {
      return window.sanitizeTitle(rawTitle);
    }
    return String(rawTitle || "");
  },

  /**
   * Resolves a concise, elegant English title for long titles (>45 chars) via AniList or sanitized fallback.
   * @param {string} rawTitle
   * @param {string} [slideId]
   * @returns {Promise<string>}
   */
  getElegantTitle: async (rawTitle, slideId) => {
    if (!rawTitle) return "Featured Title";
    const sanitized = window.home.sanitizeAnimeTitle(rawTitle);
    const cacheKey = slideId || sanitized;

    if (window.home.titleCache.has(cacheKey)) {
      return window.home.titleCache.get(cacheKey);
    }

    if (sanitized.length > 45 || /[-~–—]/.test(sanitized)) {
      try {
        const query = `
          query ($search: String) {
            Media(search: $search, type: ANIME) {
              title {
                english
                romaji
                userPreferred
              }
            }
          }
        `;
        const response = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { search: sanitized } }),
        });
        if (response.ok) {
          const data = await response.json();
          const alEnglish = data?.data?.Media?.title?.english;
          if (alEnglish && alEnglish.trim().length > 0) {
            const cleanAl = alEnglish.trim();
            window.home.titleCache.set(cacheKey, cleanAl);
            return cleanAl;
          }
        }
      } catch {
        // Fall back gracefully to sanitized local title
      }
    }

    window.home.titleCache.set(cacheKey, sanitized);
    return sanitized;
  },

  /**
   * Analyzes poster artwork image luminance to extract dominant RGB and apply
   * a dynamic linear-gradient vignette overlay on the banner with a slight 3px blur,
   * setting text color to white or black based on YIQ luminance with zero solid background box.
   * @param {HTMLImageElement} imgElement
   * @param {HTMLElement} [titleElement]
   */
  applyDynamicFlatContrast: (imgElement, titleElement) => {
    if (!imgElement) return;

    try {
      const bannerEl = document.querySelector("#home-screen .hero-full-banner");
      if (!bannerEl) return;

      if (!imgElement.complete || imgElement.naturalWidth === 0) {
        return;
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = 50;
      canvas.height = 50;

      // Downscale image to 50x50 canvas
      ctx.drawImage(imgElement, 0, 0, 50, 50);

      // Sample full image & bottom/left reading zone (50x50)
      const imgData = ctx.getImageData(0, 0, 50, 50);
      const data = imgData.data;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a > 20) {
          totalR += data[i];
          totalG += data[i + 1];
          totalB += data[i + 2];
          count++;
        }
      }

      const r = count > 0 ? Math.round(totalR / count) : 18;
      const g = count > 0 ? Math.round(totalG / count) : 18;
      const b = count > 0 ? Math.round(totalB / count) : 22;

      // Calculate perceived luminance for dominant color scaling
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;

      // Title text is always pure white for consistent, high-contrast readability
      const textColor = "#FFFFFF";

      // Darken dominant color for rich atmospheric vignette stops
      const darkenFactor = yiq > 100 ? 0.16 : 0.40;
      const darkR = Math.max(8, Math.min(36, Math.round(r * darkenFactor)));
      const darkG = Math.max(8, Math.min(36, Math.round(g * darkenFactor)));
      const darkB = Math.max(10, Math.min(42, Math.round(b * darkenFactor)));

      bannerEl.style.setProperty("--banner-vignette-color", `rgba(${darkR}, ${darkG}, ${darkB}, 0.92)`);
      bannerEl.style.setProperty("--banner-vignette-color-soft", `rgba(${darkR}, ${darkG}, ${darkB}, 0.55)`);
      bannerEl.style.setProperty("--hero-title-color", textColor);

      if (titleElement) {
        titleElement.style.color = textColor;
        titleElement.style.backgroundColor = "transparent";
        titleElement.style.border = "none";
        titleElement.style.padding = "0";
      }
    } catch {
      // Defensive fallback
      if (titleElement) {
        titleElement.style.color = "#FFFFFF";
        titleElement.style.backgroundColor = "transparent";
        titleElement.style.border = "none";
        titleElement.style.padding = "0";
      }
    }
  },

  /**
   * Analyzes poster artwork image luminance to dynamically compute an artwork-tinted uniform perimeter vignette
   * and subtle dynamic blur for guaranteed cinematic text legibility.
   * @param {HTMLImageElement} imgElement
   */
  analyzePosterContrast: (imgElement) => {
    window.home.applyDynamicFlatContrast(imgElement, document.getElementById("hero-title"));
  },

  /**
   * Renders the current Hero Carousel slide with smooth image and typography transitions.
   */
  renderCurrentHeroSlide: () => {
    const { items, currentIndex } = window.home.carousel;
    if (!items || items.length === 0) return;

    const slide = items[currentIndex];
    if (!slide) return;

    const bannerBg = document.getElementById("hero-banner-bg");
    const bannerFallback = document.getElementById("hero-banner-fallback");
    const ratingEl = document.getElementById("hero-rating-badge");
    const eyebrowEl = document.getElementById("hero-eyebrow");
    const titleEl = document.getElementById("hero-title");
    const metaRowEl = document.getElementById("hero-metadata-row");
    const dotsEl = document.getElementById("hero-carousel-dots");

    const heroImage = slide.background || slide.poster_wide || slide.poster || "";
    const isCont = Boolean(slide.isContinue);
    const rawHeroTitle = (isCont ? slide.serie || slide.title : slide.title) || "Featured Title";
    const heroRating =
      slide.maturity_rating ||
      slide.content_rating ||
      slide.rating ||
      slide.series_metadata?.maturity_rating ||
      (slide.is_mature ? "TV-MA" : "TV-14");

    const heroEpisodeMeta = isCont
      ? `${slide.season_number ? `S${slide.season_number} ` : ""}${
          slide.episode_number ? `E${slide.episode_number}` : ""
        }${slide.episode ? ` • ${window.home.sanitizeAnimeTitle(slide.episode)}` : ""}`
      : "";

    const heroProgressText =
      isCont && slide.duration && slide.playhead
        ? `${Math.max(1, slide.duration - slide.playhead)}m left`
        : "";

    // Immediate Sanitized Title & Asynchronous Elegant AniList Lookup
    if (titleEl) {
      const sanitized = window.home.sanitizeAnimeTitle(rawHeroTitle);
      titleEl.textContent = sanitized;

      const slideIdx = currentIndex;
      window.home.getElegantTitle(rawHeroTitle, slide.id || slide.series_id).then((elegantTitle) => {
        if (window.home.carousel.currentIndex === slideIdx && titleEl) {
          titleEl.textContent = elegantTitle;
        }
      });
    }

    // Update Background Artwork & Apply Dynamic Flat Contrast Plate
    if (bannerBg) {
      if (heroImage) {
        bannerBg.style.display = "block";
        if (bannerFallback) bannerFallback.style.display = "none";

        bannerBg.crossOrigin = "anonymous";
        bannerBg.onload = () => {
          // Smart 3:1 Focal Cropping Strategy:
          // For portrait posters (h > w), focus higher (18%) on character head/face.
          // For landscape key art (w >= h), focus on eye-level action line (25%).
          if (bannerBg.naturalHeight > bannerBg.naturalWidth) {
            bannerBg.style.objectPosition = "center 18%";
          } else {
            bannerBg.style.objectPosition = "center 25%";
          }
          window.home.analyzePosterContrast(bannerBg);
        };
        bannerBg.src = heroImage;
        if (bannerBg.complete && bannerBg.naturalWidth > 0) {
          if (bannerBg.naturalHeight > bannerBg.naturalWidth) {
            bannerBg.style.objectPosition = "center 18%";
          } else {
            bannerBg.style.objectPosition = "center 25%";
          }
          window.home.analyzePosterContrast(bannerBg);
        }
      } else {
        bannerBg.style.display = "none";
        if (bannerFallback) bannerFallback.style.display = "flex";
      }
    }

    // Update Anchored Top-Left Group (Rating, Eyebrow)
    if (ratingEl) ratingEl.textContent = heroRating;
    if (eyebrowEl) eyebrowEl.textContent = slide.eyebrow || "FEATURED SIMULCAST";

    // Immediate Skeleton Loader for Ratings to Eliminate Pop-In Jank
    const ratingsContainer = document.getElementById("hero-upper-right-ratings");
    if (ratingsContainer) {
      ratingsContainer.innerHTML = `
        <div class="hero-ratings-bar">
          <div class="hero-rating-skeleton"></div>
          <div class="hero-rating-skeleton"></div>
        </div>`;
      const currentTitle = rawHeroTitle;
      window.tracker?.fetchCommunityRatings?.(currentTitle).then((ratings) => {
        const titleNow = document.getElementById("hero-title")?.textContent;
        if (titleNow !== currentTitle) return;

        const entries = [];

        if (ratings?.anilist) {
          const alIcon = window.icons?.get?.("anilist", { size: 15, className: "rating-platform-icon" }) || "";
          entries.push(`
            <div class="hero-rating-entry anilist" title="AniList Community Rating">
              <span class="hero-rating-icon">${alIcon}</span>
              <span class="hero-rating-score">${ratings.anilist}</span>
            </div>`);
        }
        if (ratings?.mal) {
          const malIcon = window.icons?.get?.("mal", { size: 15, className: "rating-platform-icon" }) || "";
          const starSvg =
            window.icons?.get?.("star", { weight: "fill", size: 11, className: "rating-star-icon" }) || "★";
          entries.push(`
            <div class="hero-rating-entry mal" title="MyAnimeList Community Score">
              <span class="hero-rating-icon">${malIcon}</span>
              <span class="hero-rating-score">${ratings.mal}</span>
              <span class="hero-rating-star">${starSvg}</span>
            </div>`);
        }
        if (ratings?.kitsu) {
          const kitsuIcon = window.icons?.get?.("kitsu", { size: 15, className: "rating-platform-icon" }) || "";
          entries.push(`
            <div class="hero-rating-entry kitsu" title="Kitsu Community Rating">
              <span class="hero-rating-icon">${kitsuIcon}</span>
              <span class="hero-rating-score">${ratings.kitsu}</span>
            </div>`);
        }

        if (entries.length > 0) {
          ratingsContainer.innerHTML = `<div class="hero-ratings-bar">${entries.join("")}</div>`;
        } else {
          ratingsContainer.innerHTML = "";
        }
      }).catch(() => {
        ratingsContainer.innerHTML = "";
      });
    }

    const seasonCount = slide.season_count || slide.series_metadata?.season_count || 0;
    const episodeCount = slide.episode_count || slide.series_metadata?.episode_count || 0;

    let seasonsInfoTag = "";
    if (seasonCount > 0) {
      const avgEps = episodeCount > 0 ? Math.round(episodeCount / seasonCount) : 0;
      const seasonText = `${seasonCount} ${seasonCount === 1 ? "Season" : "Seasons"}`;
      const avgText = avgEps > 0 ? `~${avgEps} eps/season` : "";
      const slateIcon = window.icons?.get?.("filmSlate", { weight: "regular", size: 14, className: "tag-ph-icon" }) || "";
      const tvIcon = window.icons?.get?.("television", { weight: "regular", size: 14, className: "tag-ph-icon" }) || "";

      seasonsInfoTag = `
        <span class="hero-meta-tag season-tag">${slateIcon} ${seasonText}</span>
        ${
          avgText
            ? `<span class="hero-meta-tag avg-episodes-tag">${tvIcon} ${avgText}</span>`
            : ""
        }`;
    } else if (episodeCount > 0) {
      const tvIcon = window.icons?.get?.("television", { weight: "regular", size: 14, className: "tag-ph-icon" }) || "";
      seasonsInfoTag = `<span class="hero-meta-tag avg-episodes-tag">${tvIcon} ${episodeCount} Episodes</span>`;
    }

    const fireIcon = window.icons?.get?.("fire", { weight: "fill", size: 14, className: "tag-ph-icon" }) || "";
    const audioIcon = window.icons?.get?.("headphones", { weight: "regular", size: 14, className: "tag-ph-icon" }) || "";
    const subIcon = window.icons?.get?.("closedCaptioning", { weight: "regular", size: 14, className: "tag-ph-icon" }) || "";

    if (metaRowEl) {
      metaRowEl.innerHTML = `
        <span class="hero-meta-tag trending-tag">${fireIcon} TRENDING</span>
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
        ${seasonsInfoTag}
        <span class="hero-meta-tag hd">HD</span>
        <span class="hero-meta-tag audio">${audioIcon} DUB</span>
        <span class="hero-meta-tag sub">${subIcon} SUB</span>`;
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
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
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
   * Updates visual focus on Full Hero Banner vs Row Items.
   */
  updateHeroFocus: () => {
    const bannerEl = document.getElementById("hero-full-banner");
    if (window.home.position === 0) {
      bannerEl?.classList.add("selected", "focus");
    } else {
      bannerEl?.classList.remove("selected", "focus");
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
          ${window.icons?.get?.("heroiconsSolid:play", { size: 16 }) || ""}
          <span>${window.translate.go("home.banner.play") || "Play"}</span>
        </div>
        <div class="context-option" data-action="watchlist">
          ${window.icons?.get?.("heroiconsSolid:bookmark", { size: 16 }) || ""}
          <span>${window.translate.go("home.details.add") || "Add to Watchlist"}</span>
        </div>
        <div class="context-option" data-action="details">
          ${window.icons?.get?.("info", { weight: "regular", size: 16 }) || ""}
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
      if (item.isExternal) {
        window.discovery?.openExternalItem?.(item);
      } else {
        window.video.init(item);
      }
    } else if (action === "watchlist") {
      if (!item.isExternal) {
        window.mylist.toggleStatus(item.id, true, {
          success: () => {},
          error: () => {},
        });
      }
    } else if (action === "details") {
      if (item.isExternal) {
        window.discovery?.openExternalItem?.(item);
      } else {
        window.home_details.init(item);
      }
    }
  },

  /**
   * Universal item launcher (handles both Crunchyroll native items and external tracker items).
   * @param {object} item
   */
  openItem: (item) => {
    if (!item) return;
    if (item.isExternal) {
      if (typeof window.discovery?.openExternalItem === "function") {
        window.discovery.openExternalItem(item);
      } else {
        window.home_details.init(item);
      }
    } else if (item.display === "episode" || item.playhead) {
      window.video.init(item);
    } else {
      window.home_details.init(item);
    }
  },

  /**
   * Key down event handler for Home Screen navigation.
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
          // Move from Row 1 back up to Hero Banner
          rowContents.forEach((r) => r.classList.remove("selected"));
          window.home.position = 0;
          window.home.updateHeroFocus();
          scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
        }
        break;

      case window.tvKey?.KEY_DOWN:
        if (window.home.position === 0) {
          // Move from Hero Banner down into first row
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
          // On Hero Banner: loops through carousel slides
          window.home.prevSlide();
        }
        break;

      case window.tvKey?.KEY_RIGHT:
        if (window.home.position > 0) {
          const isContinueRow =
            window.home.continueWatching.length > 0 && window.home.position === 1;
          const listOffset = window.home.continueWatching.length > 0 ? 1 : 0;
          const currentList = isContinueRow
            ? { items: window.home.continueWatching }
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
          // On Hero Banner: loops through carousel slides to next slide
          window.home.nextSlide();
        }
        break;

      case 77: // 'M' for Context Menu
      case window.tvKey?.KEY_MENU: {
        if (window.home.position > 0) {
          const currentSlideIdx =
            rowContents[window.home.position - 1]?.slick?.currentSlide || 0;
          let item;
          if (window.home.continueWatching.length > 0 && window.home.position === 1) {
            item = window.home.continueWatching[currentSlideIdx];
          } else {
            const listOffset = window.home.continueWatching.length > 0 ? 1 : 0;
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
          // On Hero Banner: open anime details directly
          const current = window.home.carousel.items[window.home.carousel.currentIndex];
          if (current) {
            window.home_details.init(current);
          }
        } else {
          const currentSlideIdx =
            rowContents[window.home.position - 1]?.slick?.currentSlide || 0;
          let item;
          if (window.home.continueWatching.length > 0 && window.home.position === 1) {
            item = window.home.continueWatching[currentSlideIdx];
          } else {
            const listOffset = window.home.continueWatching.length > 0 ? 1 : 0;
            item =
              window.home.data.main.lists[window.home.position - 1 - listOffset]?.items[
                currentSlideIdx
              ];
          }
          if (item) {
            window.home.openItem(item);
          }
        }
        break;
      }
    }
  },

  /**
   * Refetches home feed and restarts home view with multi-provider discovery enrichment.
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
          success: async () => {
            if (typeof window.discovery?.enrichHomeData === "function") {
              await window.discovery.enrichHomeData();
            }
            window.home.init();
            window.loading.end();
          },
        });
      },
      error: async () => {
        window.home.data.main = { banners: [], banner: null, lists: [] };
        if (typeof window.discovery?.enrichHomeData === "function") {
          await window.discovery.enrichHomeData();
        }
        window.home.init();
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
    const rowContents = document.querySelectorAll("#home-screen .row-content");
    const currentSlide = rowContents[window.home.position - 1];
    window.home.data.main.lists[index].items =
      window.home.data.main.lists[index].items.concat(newItems);

    newItems.forEach((element) => {
      currentSlide?.slick?.slickAdd(window.home.createItem(element));
    });
  },

  /**
   * Creates DOM HTML string for a single media item card.
   * @param {object} item
   * @returns {string}
   */
  createItem: (item) => {
    const isEpisode = item.display === "episode";
    const playheadPercent =
      item.playhead && item.duration
        ? Math.min(100, Math.max(0, Math.round((item.playhead * 100) / item.duration)))
        : (item.played ? Math.min(100, Math.max(0, Math.round(item.played))) : 0);

    const playhead =
      playheadPercent > 0
        ? `<div class="progress-track"><div class="progress-fill" style="width: ${playheadPercent}%;"></div></div>`
        : "";

    const rawTitle = isEpisode ? item.serie || item.title || "" : item.title || "";
    const titleText = typeof window.sanitizeTitle === "function" ? window.sanitizeTitle(rawTitle) : rawTitle;
    const scoreBadge = item.score ? `<span class="card-score-badge">${item.score}</span>` : "";
    const subtitleText = isEpisode
      ? `${item.season_number ? `S${item.season_number} ` : ""}${
          item.episode_number ? `E${item.episode_number}` : ""
        }${item.episode ? ` • ${typeof window.sanitizeTitle === "function" ? window.sanitizeTitle(item.episode) : item.episode}` : ""}`
      : item.subtitle || (item.score ? item.score : (item.item_count ? `${item.item_count} Items` : ""));

    return `
    <div class="item ${item.isExternal ? "external-item" : ""}" data-id="${item.id || ""}" ${item.externalProvider ? `data-provider="${item.externalProvider}"` : ""}>
      <div class="poster ${isEpisode ? "episode" : "serie"}">
        <img src="${isEpisode ? item.background || item.poster : item.poster}" alt="${titleText}" onerror="this.src='assets/images/empty_640x360.png'">
        ${playhead}
        ${scoreBadge}
        <div class="poster-overlay-gradient"></div>
        <div class="poster-inner-meta">
          <div class="poster-inner-title" title="${titleText}">${titleText}</div>
          ${subtitleText ? `<div class="poster-inner-subtitle" title="${subtitleText}">${subtitleText}</div>` : ""}
        </div>
      </div>
      <div class="card-meta">
        <div class="card-title" title="${titleText}">${titleText}</div>
        <div class="card-subtitle" title="${subtitleText}">${subtitleText}</div>
      </div>
    </div>`;
  },

  /**
   * Creates DOM HTML string for an empty placeholder item.
   * @returns {string}
   */
  createEmptyItem: () => {
    return "";
  },
};
