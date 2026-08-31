/**
 * Search Screen & In-Memory Catalog Search Engine Tests
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function testSearchScreenModule() {
  console.log("Running Search Screen & Engine Tests...");

  const storageMap = {};
  global.localStorage = {
    getItem(k) {
      return storageMap[k] || null;
    },
    setItem(k, v) {
      storageMap[k] = String(v);
    },
  };

  const elementsById = {};
  global.document = {
    body: {
      appendChild: (el) => {
        if (el.id) elementsById[el.id] = el;
      },
      removeChild: (el) => {
        if (el.id) delete elementsById[el.id];
      },
    },
    createElement: (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        id: "",
        className: "",
        innerHTML: "",
        children: [],
        style: {},
        value: "",
        setAttribute: (k, v) => {
          el[k] = v;
        },
        getAttribute: (k) => el[k] || null,
        appendChild: (child) => {
          el.children.push(child);
        },
        remove: () => {},
        focus: () => {},
        scrollIntoView: () => {},
        addEventListener: () => {},
        classList: {
          _list: new Set(),
          add: (...classes) => classes.forEach((c) => el.classList._list.add(c)),
          remove: (...classes) => classes.forEach((c) => el.classList._list.delete(c)),
          contains: (c) => el.classList._list.has(c),
        },
        querySelector: (sel) => {
          if (sel === "#search-pagination-prev" || sel.includes("prev")) return el.children.find((c) => c.id === "search-pagination-prev") || null;
          if (sel === "#search-pagination-next" || sel.includes("next")) return el.children.find((c) => c.id === "search-pagination-next") || null;
          return null;
        },
        querySelectorAll: () => [],
      };
      return el;
    },
    createDocumentFragment: () => {
      const frag = {
        children: [],
        appendChild: (child) => {
          frag.children.push(child);
        },
      };
      return frag;
    },
    getElementById: (id) => elementsById[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  global.window = {
    translate: { go: () => "Search" },
    icons: { get: () => "<svg></svg>" },
    sanitizeTitle: (t) => t,
    main: { state: "search-screen" },
    menu: { open: () => {}, close: () => {} },
    home_details: { init: () => {} },
    electronUtilsRender: {
      getCachedCatalog: async () => null,
      refreshCatalog: async () => null,
    },
  };

  const searchSrc = fs.readFileSync(path.join(__dirname, "../src/renderer/screens/search.js"), "utf8");
  eval(searchSrc);

  // Generate 60 Mock Anime Items to test 25-per-page pagination
  const mockSeries = [];
  for (let i = 1; i <= 60; i++) {
    const letter = String.fromCharCode(65 + (i % 26)); // A, B, C...
    mockSeries.push({
      id: `ID_${i}`,
      title: `${letter} Anime Series ${i.toString().padStart(2, "0")}`,
      clean_title: `${letter} Anime Series ${i.toString().padStart(2, "0")}`,
      slug: `anime-series-${i}`,
      description: `Description for anime ${i}`,
      poster: `https://example.com/poster_${i}.jpg`,
      season_count: 1,
      episode_count: 12 + i,
      is_subbed: true,
      is_dubbed: i % 2 === 0,
      categories: ["Action", "Fantasy"],
      ratings: { anilist: `${70 + (i % 25)}%`, mal: (7.0 + (i % 25) / 10).toFixed(1) },
    });
  }

  window.search.catalog = { series: mockSeries };

  // 1. Test Score Badge Thresholds
  const highBadge = window.search.getScoreBadgeHtml({ mal: "9.1" });
  assert(highBadge.includes("score-high"), "MAL score 9.1 must map to score-high");

  const midBadge = window.search.getScoreBadgeHtml({ mal: "6.8" });
  assert(midBadge.includes("score-mid"), "MAL score 6.8 must map to score-mid");

  const lowBadge = window.search.getScoreBadgeHtml({ mal: "5.2" });
  assert(lowBadge.includes("score-low"), "MAL score 5.2 must map to score-low");

  // 2. Test Initial Idle Catalog Browser (Alphabetical A-Z, 25 per page)
  const mountEl = global.document.createElement("div");
  elementsById["search-content-mount"] = mountEl;
  elementsById["search-chips-bar"] = global.document.createElement("div");

  window.search.query = "";
  window.search.filters.sort = "alpha";
  window.search.executeSearch();

  assert.strictEqual(window.search.allFilteredItems.length, 60, "All 60 catalog items must be loaded when query is empty");
  assert.strictEqual(window.search.totalPages, 3, "60 items at 25/page must yield 3 pages");
  assert.strictEqual(window.search.results.length, 25, "Page 1 must render exactly 25 items");
  assert.strictEqual(window.search.currentPage, 0, "Initial page must be 0 (Page 1)");

  // Verify Alphabetical Sorting A-Z
  const firstTitle = window.search.results[0].clean_title;
  const secondTitle = window.search.results[1].clean_title;
  assert(firstTitle.localeCompare(secondTitle) <= 0, "Initial catalog list must be sorted alphabetically A-Z");

  // 3. Test Pagination Navigation (Next / Prev)
  window.search.nextPage();
  assert.strictEqual(window.search.currentPage, 1, "nextPage() must advance to page index 1 (Page 2)");
  assert.strictEqual(window.search.results.length, 25, "Page 2 must have 25 items");

  window.search.nextPage();
  assert.strictEqual(window.search.currentPage, 2, "nextPage() must advance to page index 2 (Page 3)");
  assert.strictEqual(window.search.results.length, 10, "Page 3 (last page of 60) must have remaining 10 items");

  window.search.prevPage();
  assert.strictEqual(window.search.currentPage, 1, "prevPage() must return to page index 1");

  // 4. Test Search Query Filtering + Pagination
  window.search.query = "Anime Series 0"; // Matches 01-09 (9 items)
  window.search.executeSearch();
  assert.strictEqual(window.search.allFilteredItems.length, 9, "Search query must find 9 matching items");
  assert.strictEqual(window.search.totalPages, 1, "9 items must fit in 1 page");
  assert.strictEqual(window.search.results.length, 9, "Current page must render 9 items");

  // 5. Test Filter Chips: Audio Format (Dub Only)
  window.search.query = "";
  window.search.setFilter("format", "dub");
  assert.strictEqual(window.search.allFilteredItems.length, 30, "Dub filter should match exactly 30 dubbed series");
  assert.strictEqual(window.search.totalPages, 2, "30 items should yield 2 pages (25 + 5)");

  // 6. Test Routing to Details on Result Selection
  let routedItem = null;
  window.home_details.init = (item) => {
    routedItem = item;
  };
  window.search.openDetails(mockSeries[0]);
  assert.strictEqual(routedItem?.id, "ID_1", "Selecting result must route to home_details");

  window.search.destroy();
  console.log("✓ Search screen & 25-per-page pagination engine tests passed!");
}

module.exports = { testSearchScreenModule };
