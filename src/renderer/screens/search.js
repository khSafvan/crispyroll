/**
 * Immersive Full-Screen Search Screen Controller
 * Instant local-cache-driven search & catalog browser with 25 entries per page,
 * alphabetical default sorting, 600ms query debounce, real-time filter chips,
 * and high-density color-coded score results.
 */

const PAGE_SIZE = 25;

window.search = {
  id: "search-screen",
  catalog: null,
  previous: null,
  input: null,
  debounceTimer: null,
  query: "",
  filters: {
    sort: "alpha", // Default to alphabetical per spec: 'alpha' | 'popularity' | 'score' | 'episodes'
    format: "all", // 'all' | 'sub' | 'dub'
  },
  currentPage: 0,
  totalPages: 1,
  totalFilteredCount: 0,
  activeZone: "input", // 'input' | 'chips' | 'results' | 'pagination'
  focusedChipIdx: 0,
  focusedResultIdx: -1,
  focusedPaginationBtn: "next", // 'prev' | 'next'
  results: [], // Current page sliced items
  allFilteredItems: [], // Full matching dataset

  /**
   * Initializes search screen with local catalog loader gating, instant autofocus,
   * and default alphabetical 25-per-page catalog browsing.
   */
  init: async () => {
    window.search.activeZone = "input";
    window.search.focusedResultIdx = -1;
    window.search.focusedChipIdx = 0;
    window.search.focusedPaginationBtn = "next";
    window.search.currentPage = 0;
    window.search.query = "";

    // 1. Fast Catalog Hydration: Load local catalog immediately without freezing the UI
    if (!window.search.catalog?.series?.length) {
      try {
        const cached = await window.electronUtilsRender?.getCachedCatalog?.();
        if (cached?.series?.length) {
          window.search.catalog = cached;
        } else {
          // Trigger non-blocking background refresh if cache is empty
          window.electronUtilsRender
            ?.refreshCatalog?.()
            .then((fresh) => {
              if (fresh?.series?.length && !window.search.catalog?.series?.length) {
                window.search.catalog = fresh;
                if (window.main?.state === window.search.id && !window.search.query) {
                  window.search.executeSearch();
                }
              }
            })
            .catch(() => {});
        }
      } catch {
        // Ignore IPC error
      }
    }

    // 2. Build Search DOM
    const existing = document.getElementById(window.search.id);
    if (existing) existing.remove();

    const searchElement = document.createElement("div");
    searchElement.id = window.search.id;

    const xSvg = window.icons?.get?.("x", { size: 22 }) || "✕";

    searchElement.innerHTML = `
      <div class="search-container">
        <!-- 1. Header & Massive Transparent Input -->
        <div class="search-header">
          <div class="search-input-wrapper">
            <input
              class="search-massive-input"
              id="search-input-field"
              type="text"
              placeholder="${window.translate.go("search.placeholder") || "Type to search..."}"
              autocomplete="off"
              spellcheck="false"
            />
            <button class="search-clear-btn" id="search-clear-btn" type="button" aria-label="Clear Search">
              ${xSvg}
            </button>
          </div>
        </div>

        <!-- 2. Real-Time Filter Chips Bar -->
        <div class="search-chips-bar" id="search-chips-bar">
          <div class="chip-group sort-chips">
            <span class="chip-group-label">Sort:</span>
            <button class="filter-chip ${window.search.filters.sort === "alpha" ? "active" : ""}" data-filter="sort" data-value="alpha">Title (A-Z)</button>
            <button class="filter-chip ${window.search.filters.sort === "popularity" ? "active" : ""}" data-filter="sort" data-value="popularity">Popularity</button>
            <button class="filter-chip ${window.search.filters.sort === "score" ? "active" : ""}" data-filter="sort" data-value="score">Score</button>
            <button class="filter-chip ${window.search.filters.sort === "episodes" ? "active" : ""}" data-filter="sort" data-value="episodes">Episodes</button>
          </div>
          <div class="chip-group format-chips">
            <span class="chip-group-label">Audio:</span>
            <button class="filter-chip ${window.search.filters.format === "all" ? "active" : ""}" data-filter="format" data-value="all">All</button>
            <button class="filter-chip ${window.search.filters.format === "sub" ? "active" : ""}" data-filter="format" data-value="sub">Sub</button>
            <button class="filter-chip ${window.search.filters.format === "dub" ? "active" : ""}" data-filter="format" data-value="dub">Dub</button>
          </div>
        </div>

        <!-- 3. Dynamic Content Body (Paginated Results Table) -->
        <div class="search-body" id="search-body">
          <div id="search-content-mount"></div>
        </div>
      </div>`;

    document.body.appendChild(searchElement);
    window.search.previous = window.main.state;
    window.main.state = window.search.id;

    const searchInput = document.getElementById("search-input-field");
    const clearBtn = document.getElementById("search-clear-btn");
    const chipsBar = document.getElementById("search-chips-bar");

    if (searchInput) {
      window.search.input = searchInput;
      // Auto-focus immediately
      setTimeout(() => {
        searchInput.focus();
        window.search.setZone("input");
      }, 50);

      searchInput.addEventListener("input", (e) => {
        const val = e.target.value;
        window.search.query = val;
        if (clearBtn) {
          if (val.length > 0) clearBtn.classList.add("visible");
          else clearBtn.classList.remove("visible");
        }

        window.search.currentPage = 0; // Reset to page 1 on new input
        clearTimeout(window.search.debounceTimer);

        if (val.trim().length === 0) {
          window.search.executeSearch();
        } else {
          window.search.debounceTimer = setTimeout(() => {
            window.search.executeSearch();
          }, 600);
        }
      });

      searchInput.addEventListener("keydown", (e) => {
        if (e.keyCode === 13) {
          e.preventDefault();
          clearTimeout(window.search.debounceTimer);
          window.search.executeSearch();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (window.search.input) {
          window.search.input.value = "";
          window.search.query = "";
          clearBtn.classList.remove("visible");
          window.search.currentPage = 0;
          window.search.executeSearch();
          window.search.input.focus();
        }
      });
    }

    if (chipsBar) {
      chipsBar.addEventListener("click", (e) => {
        const chip = e.target.closest(".filter-chip");
        if (chip) {
          const filterType = chip.getAttribute("data-filter");
          const filterValue = chip.getAttribute("data-value");
          if (filterType && filterValue) {
            window.search.setFilter(filterType, filterValue);
          }
        }
      });
    }

    // Render Initial Catalog State (All entries sorted A-Z, 25 per page)
    window.search.executeSearch();
  },

  destroy: () => {
    clearTimeout(window.search.debounceTimer);
    const el = document.getElementById(window.search.id);
    if (el) el.remove();
    window.main.state = window.search.previous || "home-screen";
  },

  /**
   * Sets active navigation zone for D-pad navigation.
   * @param {"input"|"chips"|"results"|"pagination"} zone
   */
  setZone: (zone) => {
    window.search.activeZone = zone;
    const screenEl = document.getElementById(window.search.id);
    if (screenEl) {
      screenEl.classList.remove(
        "focus-zone-input",
        "focus-zone-chips",
        "focus-zone-results",
        "focus-zone-pagination"
      );
      screenEl.classList.add(`focus-zone-${zone}`);
    }

    if (zone !== "chips") {
      document
        .querySelectorAll("#search-chips-bar .filter-chip")
        .forEach((c) => c.classList.remove("is-focused"));
    }
    if (zone !== "results") {
      document
        .querySelectorAll("#search-screen .search-result-row")
        .forEach((r) => r.classList.remove("is-focused"));
    }
    if (zone !== "pagination") {
      document
        .querySelectorAll("#search-screen .pagination-btn")
        .forEach((b) => b.classList.remove("is-focused"));
    }
  },

  /**
   * Sets a filter chip value and triggers instant re-filtering.
   * @param {string} filterType
   * @param {string} filterValue
   */
  setFilter: (filterType, filterValue) => {
    window.search.filters[filterType] = filterValue;
    window.search.currentPage = 0; // Reset to page 1

    // Update active chip UI
    const group = document.querySelector(`.chip-group.${filterType}-chips`);
    if (group) {
      group.querySelectorAll(".filter-chip").forEach((chip) => {
        if (chip.getAttribute("data-value") === filterValue) {
          chip.classList.add("active");
        } else {
          chip.classList.remove("active");
        }
      });
    }

    window.search.executeSearch();
  },

  /**
   * Formats color-coded score badges using explicit score tokens.
   * @param {object} ratings
   * @returns {string}
   */
  getScoreBadgeHtml: (ratings) => {
    if (!ratings) return `<span class="score-badge empty">—</span>`;
    const mal = ratings.mal ? parseFloat(ratings.mal) : null;
    const ani = ratings.anilist ? parseInt(ratings.anilist, 10) : null;

    const scoreVal =
      mal !== null && !isNaN(mal) ? mal : ani !== null && !isNaN(ani) ? ani / 10 : null;
    if (scoreVal === null || isNaN(scoreVal) || scoreVal <= 0) {
      return `<span class="score-badge empty">—</span>`;
    }

    let scoreClass = "score-mid";
    if (scoreVal >= 7.5) scoreClass = "score-high";
    else if (scoreVal < 6.0) scoreClass = "score-low";

    const displayScore = mal !== null && !isNaN(mal) ? `★ ${mal.toFixed(1)}` : `${ani}%`;
    return `<span class="score-badge ${scoreClass}">${displayScore}</span>`;
  },

  /**
   * Advances to next page.
   */
  nextPage: () => {
    if (window.search.currentPage < window.search.totalPages - 1) {
      window.search.currentPage++;
      window.search.executeSearch();
      window.search.setResultFocus(0);
    }
  },

  /**
   * Goes to previous page.
   */
  prevPage: () => {
    if (window.search.currentPage > 0) {
      window.search.currentPage--;
      window.search.executeSearch();
      window.search.setResultFocus(0);
    }
  },

  /**
   * Executes local in-memory catalog query, sorts results, and renders paginated 25 items per page.
   */
  executeSearch: () => {
    const mount = document.getElementById("search-content-mount");
    if (!mount) return;

    const query = window.search.query?.trim() || "";
    const catalogItems = window.search.catalog?.series || [];
    const normalizedQ = query.toLowerCase();

    // 1. In-Memory Filter Engine
    const filtered = catalogItems.filter((item) => {
      // Query filter (if provided)
      if (normalizedQ.length > 0) {
        const title = (item.title || "").toLowerCase();
        const cleanTitle = (item.clean_title || "").toLowerCase();
        const slug = (item.slug || "").toLowerCase();
        const categories = (item.categories || []).map((c) => c.toLowerCase());

        const matchesQuery =
          title.includes(normalizedQ) ||
          cleanTitle.includes(normalizedQ) ||
          slug.includes(normalizedQ) ||
          categories.some((c) => c.includes(normalizedQ));

        if (!matchesQuery) return false;
      }

      // Audio Format Filter
      if (window.search.filters.format === "sub" && !item.is_subbed) return false;
      if (window.search.filters.format === "dub" && !item.is_dubbed) return false;

      return true;
    });

    // 2. Sort Engine (Defaults to Alphabetical A-Z)
    const sort = window.search.filters.sort;
    if (sort === "alpha") {
      filtered.sort((a, b) =>
        (a.clean_title || a.title || "").localeCompare(b.clean_title || b.title || "")
      );
    } else if (sort === "score") {
      filtered.sort((a, b) => {
        const scoreA =
          parseFloat(
            a.ratings?.mal || (a.ratings?.anilist ? parseInt(a.ratings.anilist, 10) / 10 : 0)
          ) || 0;
        const scoreB =
          parseFloat(
            b.ratings?.mal || (b.ratings?.anilist ? parseInt(b.ratings.anilist, 10) / 10 : 0)
          ) || 0;
        return scoreB - scoreA;
      });
    } else if (sort === "episodes") {
      filtered.sort((a, b) => (b.episode_count || 0) - (a.episode_count || 0));
    }
    // "popularity" keeps raw catalog ordering (already ordered by Crunchyroll popularity)

    window.search.allFilteredItems = filtered;
    window.search.totalFilteredCount = filtered.length;
    window.search.totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    // Ensure currentPage is within bounds
    if (window.search.currentPage >= window.search.totalPages) {
      window.search.currentPage = Math.max(0, window.search.totalPages - 1);
    }

    // 3. Slice 25 items for current page
    const startIdx = window.search.currentPage * PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
    window.search.results = pageItems;

    // 4. Empty Results View
    if (filtered.length === 0) {
      mount.innerHTML = `
        <div class="search-no-results">
          <div class="search-no-results-icon">${window.icons?.get?.("magnifyingGlass", { size: 48 }) || "🔍"}</div>
          <div class="search-no-results-text">No anime found matching "${query}"</div>
        </div>`;
      return;
    }

    mount.innerHTML = "";
    const tableEl = document.createElement("div");
    tableEl.className = "search-results-table";

    // Header Row
    const headerRow = document.createElement("div");
    headerRow.className = "search-results-header";
    headerRow.innerHTML = `
      <span></span>
      <span>Title</span>
      <span>Format</span>
      <span>Genres</span>
      <span>Community Score</span>`;
    tableEl.appendChild(headerRow);

    // Batch DocumentFragment for high-density rows
    const fragment = document.createDocumentFragment();

    pageItems.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "search-result-row";
      row.setAttribute("data-idx", idx);
      row.setAttribute("data-id", item.id);

      const cleanTitle =
        typeof window.sanitizeTitle === "function" ? window.sanitizeTitle(item.title) : item.title;
      const subtitle =
        item.clean_title && item.clean_title !== item.title
          ? item.title
          : item.categories?.slice(0, 2).join(" • ") || "";
      const seasonsText = `${item.season_count || 1} Season${(item.season_count || 1) > 1 ? "s" : ""} • ${item.episode_count || 0} Ep${(item.episode_count || 0) > 1 ? "s" : ""}`;
      const scoreBadgeHtml = window.search.getScoreBadgeHtml(item.ratings);

      const tagsHtml = (item.categories || [])
        .slice(0, 3)
        .map((tag) => `<span class="mini-tag">${tag}</span>`)
        .join("");

      row.innerHTML = `
        <div class="col-thumb">
          <img src="${item.poster}" alt="${cleanTitle}" onerror="this.src='assets/images/empty_640x360.png'"/>
        </div>
        <div class="col-title">
          <div class="title-main" title="${cleanTitle}">${cleanTitle}</div>
          ${subtitle ? `<div class="title-sub" title="${subtitle}">${subtitle}</div>` : ""}
        </div>
        <div class="col-meta">${seasonsText}</div>
        <div class="col-tags">${tagsHtml}</div>
        <div class="col-score">${scoreBadgeHtml}</div>`;

      row.addEventListener("click", () => {
        window.search.setResultFocus(idx);
        window.search.openDetails(item);
      });

      fragment.appendChild(row);
    });

    tableEl.appendChild(fragment);
    mount.appendChild(tableEl);

    // 5. Render Pagination Bar Footer
    const paginationBar = document.createElement("div");
    paginationBar.className = "search-pagination-bar";
    paginationBar.id = "search-pagination-bar";

    const prevDisabled = window.search.currentPage === 0 ? "disabled" : "";
    const nextDisabled =
      window.search.currentPage >= window.search.totalPages - 1 ? "disabled" : "";
    const rangeStart = startIdx + 1;
    const rangeEnd = Math.min(startIdx + PAGE_SIZE, filtered.length);

    const caretLeft = window.icons?.get?.("caretLeft", { size: 16 }) || "‹";
    const caretRight = window.icons?.get?.("caretRight", { size: 16 }) || "›";

    paginationBar.innerHTML = `
      <button class="pagination-btn prev-btn" id="search-pagination-prev" ${prevDisabled} type="button">
        ${caretLeft} <span>Previous</span>
      </button>
      <div class="pagination-info" id="search-pagination-info">
        Page ${window.search.currentPage + 1} of ${window.search.totalPages} (${rangeStart}–${rangeEnd} of ${filtered.length} series)
      </div>
      <button class="pagination-btn next-btn" id="search-pagination-next" ${nextDisabled} type="button">
        <span>Next</span> ${caretRight}
      </button>`;

    const prevBtn = paginationBar.querySelector("#search-pagination-prev");
    const nextBtn = paginationBar.querySelector("#search-pagination-next");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => window.search.prevPage());
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => window.search.nextPage());
    }

    mount.appendChild(paginationBar);
  },

  /**
   * Focuses result row by index with auto-scroll.
   * @param {number} idx
   */
  setResultFocus: (idx) => {
    window.search.setZone("results");
    window.search.focusedResultIdx = idx;
    const rows = Array.from(document.querySelectorAll("#search-screen .search-result-row"));
    rows.forEach((r, i) => {
      if (i === idx) {
        r.classList.add("is-focused");
        r.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        r.classList.remove("is-focused");
      }
    });
  },

  /**
   * Focuses chip by index.
   * @param {number} idx
   */
  setChipFocus: (idx) => {
    window.search.setZone("chips");
    const chips = Array.from(document.querySelectorAll("#search-chips-bar .filter-chip"));
    if (chips.length === 0) return;
    const boundedIdx = Math.max(0, Math.min(idx, chips.length - 1));
    window.search.focusedChipIdx = boundedIdx;
    chips.forEach((c, i) => {
      if (i === boundedIdx) {
        c.classList.add("is-focused");
        c.focus();
      } else {
        c.classList.remove("is-focused");
      }
    });
  },

  /**
   * Focuses pagination button ('prev' or 'next').
   * @param {"prev"|"next"} btnType
   */
  setPaginationFocus: (btnType) => {
    window.search.setZone("pagination");
    window.search.focusedPaginationBtn = btnType;

    const prevBtn = document.getElementById("search-pagination-prev");
    const nextBtn = document.getElementById("search-pagination-next");

    if (prevBtn) prevBtn.classList.remove("is-focused");
    if (nextBtn) nextBtn.classList.remove("is-focused");

    if (btnType === "prev" && prevBtn && !prevBtn.disabled) {
      prevBtn.classList.add("is-focused");
      prevBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else if (nextBtn && !nextBtn.disabled) {
      nextBtn.classList.add("is-focused");
      nextBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else if (prevBtn && !prevBtn.disabled) {
      prevBtn.classList.add("is-focused");
      prevBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  },

  /**
   * Routes to Show Meta Details screen.
   * @param {object} item
   */
  openDetails: (item) => {
    if (!item) return;

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
  },

  /**
   * Main D-Pad & Keyboard navigation router for Search.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    const chips = Array.from(document.querySelectorAll("#search-chips-bar .filter-chip"));
    const resultRows = Array.from(document.querySelectorAll("#search-screen .search-result-row"));

    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27: // ESC
        if (window.search.query?.length > 0) {
          if (window.search.input) {
            window.search.input.value = "";
            window.search.query = "";
            document.getElementById("search-clear-btn")?.classList.remove("visible");
            window.search.currentPage = 0;
            window.search.executeSearch();
            window.search.input.focus();
            window.search.setZone("input");
          }
        } else {
          window.search.destroy();
          window.menu.open();
        }
        break;

      case window.tvKey?.KEY_UP:
        if (window.search.activeZone === "pagination") {
          if (resultRows.length > 0) {
            window.search.setResultFocus(resultRows.length - 1);
          } else {
            window.search.setChipFocus(0);
          }
        } else if (window.search.activeZone === "results") {
          if (window.search.focusedResultIdx > 0) {
            window.search.setResultFocus(window.search.focusedResultIdx - 1);
          } else {
            window.search.setChipFocus(0);
          }
        } else if (window.search.activeZone === "chips") {
          window.search.setZone("input");
          window.search.input?.focus();
        }
        break;

      case window.tvKey?.KEY_DOWN:
        if (window.search.activeZone === "input") {
          if (chips.length > 0) {
            window.search.setChipFocus(0);
          } else if (resultRows.length > 0) {
            window.search.setResultFocus(0);
          }
        } else if (window.search.activeZone === "chips") {
          if (resultRows.length > 0) {
            window.search.setResultFocus(0);
          } else {
            window.search.setPaginationFocus("next");
          }
        } else if (window.search.activeZone === "results") {
          if (window.search.focusedResultIdx < resultRows.length - 1) {
            window.search.setResultFocus(window.search.focusedResultIdx + 1);
          } else {
            // Reached bottom of rows -> focus pagination footer
            window.search.setPaginationFocus("next");
          }
        }
        break;

      case window.tvKey?.KEY_LEFT:
        if (window.search.activeZone === "chips") {
          if (window.search.focusedChipIdx > 0) {
            window.search.setChipFocus(window.search.focusedChipIdx - 1);
          } else {
            window.menu.open();
          }
        } else if (window.search.activeZone === "input") {
          if (!window.search.input?.value) {
            window.menu.open();
          }
        } else if (window.search.activeZone === "pagination") {
          window.search.setPaginationFocus("prev");
        }
        break;

      case window.tvKey?.KEY_RIGHT:
        if (window.search.activeZone === "chips") {
          if (window.search.focusedChipIdx < chips.length - 1) {
            window.search.setChipFocus(window.search.focusedChipIdx + 1);
          }
        } else if (window.search.activeZone === "pagination") {
          window.search.setPaginationFocus("next");
        }
        break;

      case 33: // Page Up
        window.search.prevPage();
        break;

      case 34: // Page Down
        window.search.nextPage();
        break;

      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        if (window.search.activeZone === "chips") {
          chips[window.search.focusedChipIdx]?.click();
        } else if (window.search.activeZone === "results") {
          const target = window.search.results[window.search.focusedResultIdx];
          if (target) window.search.openDetails(target);
        } else if (window.search.activeZone === "pagination") {
          if (window.search.focusedPaginationBtn === "prev") {
            window.search.prevPage();
          } else {
            window.search.nextPage();
          }
        }
        break;
    }
  },
};
