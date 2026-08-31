/**
 * Unit Tests for Multi-Provider Discovery & Deduplication Engine
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

async function testDiscoveryModule() {
  console.log("Running Multi-Provider Discovery & Deduplication Tests...");

  global.window = {
    discovery: null,
    sanitizeTitle: null,
    home: { data: { main: { lists: [] } } },
    translate: { go: (k) => k },
    electronUtilsRender: {
      getTrackerStatus: async () => ({ connected: false, token: null }),
    },
  };

  // Load sanitizeTitle module
  const sanitizeFile = path.join(__dirname, "../src/renderer/utils/sanitizeTitle.js");
  const sanitizeContent = fs.readFileSync(sanitizeFile, "utf8");
  eval(sanitizeContent);

  // Load discovery module
  const discoveryFile = path.join(__dirname, "../src/renderer/core/discovery.js");
  const discoveryContent = fs.readFileSync(discoveryFile, "utf8");
  eval(discoveryContent);

  assert(window.discovery, "window.discovery should be defined");
  assert(typeof window.discovery.normalizeKey === "function", "normalizeKey should be a function");
  assert(typeof window.discovery.deduplicate === "function", "deduplicate should be a function");
  assert(typeof window.discovery.fetchAniList === "function", "fetchAniList should be a function");
  assert(typeof window.discovery.fetchMAL === "function", "fetchMAL should be a function");
  assert(typeof window.discovery.fetchKitsu === "function", "fetchKitsu should be a function");

  // 1. Test normalizeKey
  assert.strictEqual(
    window.discovery.normalizeKey("Solo Leveling (English Dub) [1080p]"),
    "sololeveling",
    "Should strip dub and quality tags"
  );
  assert.strictEqual(
    window.discovery.normalizeKey("Frieren: Beyond Journey's End - Season 1"),
    "frierenbeyondjourneysend",
    "Should strip season tag and special characters"
  );
  assert.strictEqual(
    window.discovery.normalizeKey("Bogus Skill <<Fruitmaster>> ~About that time...~"),
    "bogusskillfruitmaster",
    "Should unwrap angle brackets and strip tilde clauses"
  );

  // 2. Test Strict Cross-Row & Intra-Row Deduplication
  const inProgress = [
    { id: "CR_100", title: "Frieren: Beyond Journey's End", playhead: 600, duration: 1400 },
  ];

  const rawFeeds = [
    {
      title: "Popular This Season",
      items: [
        { id: "CR_100", title: "Frieren: Beyond Journey's End (Dub)" }, // Should be dropped (in continue watching)
        { id: "CR_101", title: "Solo Leveling" },
        { id: "CR_102", title: "Demon Slayer: Kimetsu no Yaiba" },
        { id: "CR_101", title: "Solo Leveling (Sub)" }, // Duplicate within row, should be dropped
      ],
    },
    {
      title: "AniList: Trending Now",
      items: [
        { id: "ani_201", title: "Solo Leveling" }, // Duplicate from previous row, should be dropped
        { id: "ani_202", title: "Mushoku Tensei: Jobless Reincarnation" },
        { id: "ani_203", title: "Kaiju No. 8" },
      ],
    },
    {
      title: "MyAnimeList: Top Airing Anime",
      items: [
        { id: "mal_301", title: "Demon Slayer: Kimetsu no Yaiba" }, // Duplicate from Popular, should be dropped
        { id: "mal_302", title: "Kaiju No. 8 (Sub)" }, // Duplicate from AniList, should be dropped
        { id: "mal_303", title: "One Piece" },
      ],
    },
    {
      title: "Kitsu: Community Trending",
      items: [
        { id: "kitsu_401", title: "One Piece" }, // Duplicate, should be dropped
        { id: "kitsu_402", title: "Attack on Titan" },
      ],
    },
  ];

  const deduplicated = window.discovery.deduplicate(inProgress, rawFeeds);

  assert.strictEqual(deduplicated.length, 4, "All 4 rows should exist with unique items");
  assert.strictEqual(deduplicated[0].items.length, 2, "Popular should have 2 unique items (Solo Leveling, Demon Slayer)");
  assert.strictEqual(deduplicated[1].items.length, 2, "AniList should have 2 unique items (Mushoku Tensei, Kaiju No. 8)");
  assert.strictEqual(deduplicated[2].items.length, 1, "MAL should have 1 unique item (One Piece)");
  assert.strictEqual(deduplicated[3].items.length, 1, "Kitsu should have 1 unique item (Attack on Titan)");

  // 3. Verify that zero items are repeated anywhere across rows
  const allResultTitles = [];
  deduplicated.forEach((row) => {
    row.items.forEach((item) => {
      const key = window.discovery.normalizeKey(item.title);
      assert(!allResultTitles.includes(key), `Title ${item.title} (${key}) must not be duplicated!`);
      allResultTitles.push(key);
    });
  });

  // 4. Test fetchContinueWatching mapping
  window.service = {
    history: ({ success }) => {
      success({
        data: [
          {
            playhead: 1200,
            never_watched: false,
            fully_watched: true,
            panel: {
              id: "ep_123",
              title: "Arise",
              episode_metadata: {
                series_id: "G_SOLO",
                series_title: "Solo Leveling",
                season_number: 1,
                episode_number: 12,
                duration_ms: 1440000,
              },
              images: {
                thumbnail: [[{}, {}, {}, {}, { source: "https://example.com/thumb.jpg" }]],
              },
            },
          },
        ],
      });
    },
  };

  const continueItems = await window.discovery.fetchContinueWatching();
  assert.strictEqual(continueItems.length, 1, "Should map 1 continue watching item");
  assert.strictEqual(continueItems[0].serie, "Solo Leveling", "Should map series title");
  assert.strictEqual(continueItems[0].episode_number, 12, "Should map episode number");
  assert.strictEqual(continueItems[0].display, "episode", "Should have episode display type for 16:9 rectangle card");

  // 5. Test Card DOM rendering for Continue Watching (16:9) and Series Poster (2:3 with inside text & ratings)
  const homeScreenFile = path.join(__dirname, "../src/renderer/screens/home.js");
  const homeContent = fs.readFileSync(homeScreenFile, "utf8");
  eval(homeContent);

  const renderedContinueHtml = window.home.createItem(continueItems[0]);
  assert(renderedContinueHtml.includes("continue-item"), "Must include continue-item container");
  assert(renderedContinueHtml.includes("poster episode"), "Must include 16:9 episode poster container");
  assert(renderedContinueHtml.includes("episode-thumb"), "Must include episode-thumb");
  assert(renderedContinueHtml.includes("progress-track"), "Must include progress-track");
  assert(renderedContinueHtml.includes("poster-overlay-gradient"), "Must include gradient inside poster");
  assert(renderedContinueHtml.includes("poster-inner-meta"), "Must include inner metadata inside poster");
  assert(renderedContinueHtml.includes("poster-inner-title"), "Must include title inside poster");

  const renderedSeriesHtml = window.home.createItem({
    id: "series-1",
    title: "The Apothecary Diaries",
    poster: "https://example.com/poster.jpg",
    score: 8.8,
    season_count: 2,
    item_count: 24,
    subtitle: "Historical • Mystery • Drama",
    status: "Releasing",
  });
  assert(renderedSeriesHtml.includes("poster serie"), "Series card must have 2:3 poster serie container");
  assert(renderedSeriesHtml.includes("poster-img"), "Series card must have poster-img");
  assert(renderedSeriesHtml.includes("card-score-badge"), "Series card must have card-score-badge for ratings");
  assert(renderedSeriesHtml.includes("8.8"), "Series card must display score 8.8");
  assert(renderedSeriesHtml.includes("poster-overlay-gradient"), "Series card must have gradient overlay");
  assert(renderedSeriesHtml.includes("poster-inner-meta"), "Series card must have inner metadata");
  assert(renderedSeriesHtml.includes("poster-inner-title"), "Series card must have title inside poster");

  console.log("✓ Multi-Provider Discovery & Deduplication tests passed!");
}

module.exports = { testDiscoveryModule };
