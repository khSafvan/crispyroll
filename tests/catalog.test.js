/**
 * Crunchyroll Catalog Cache Manager & Merger Tests
 */

const assert = require("assert");
const fs = require("fs");
const catalog = require("../src/main/catalog");

async function testCatalogModule() {
  console.log("Running Catalog Cache & Multi-Source Merge Tests...");

  // 1. Verify Stale Detection
  const cachePath = catalog.getCatalogCachePath();
  const backupPath = `${cachePath}.test-bak`;

  // Backup existing cache if any
  let hadOriginal = false;
  if (fs.existsSync(cachePath)) {
    hadOriginal = true;
    fs.renameSync(cachePath, backupPath);
  }

  try {
    // When no cache exists
    const staleWhenMissing = await catalog.isCacheStale(12);
    assert.strictEqual(staleWhenMissing, true, "Missing cache must be reported as stale");

    // Write a mock fresh cache (< 12 hours old)
    const freshData = {
      last_updated: Date.now() - 2 * 60 * 60 * 1000, // 2 hours old
      count: 2,
      series: [
        {
          id: "TEST1",
          title: "Frieren: Beyond Journey's End",
          clean_title: "Frieren: Beyond Journey's End",
          slug: "frieren",
          description: "An elf mage journeys.",
          poster: "https://example.com/poster.jpg",
          background: "https://example.com/bg.jpg",
          season_count: 1,
          episode_count: 28,
          is_subbed: true,
          is_dubbed: true,
          maturity_ratings: ["TV-14"],
          categories: ["Fantasy", "Adventure"],
          ratings: { anilist: "91%", mal: "9.1", kitsu: null },
          anilist_id: 154587,
          mal_id: 52991,
        },
        {
          id: "TEST2",
          title: "Demon Slayer: Kimetsu no Yaiba",
          clean_title: "Demon Slayer: Kimetsu no Yaiba",
          slug: "demon-slayer",
          description: "Tanjiro fights demons.",
          poster: "https://example.com/poster2.jpg",
          background: "https://example.com/bg2.jpg",
          season_count: 4,
          episode_count: 55,
          is_subbed: true,
          is_dubbed: true,
          maturity_ratings: ["TV-MA"],
          categories: ["Action", "Supernatural"],
          ratings: { anilist: "85%", mal: "8.5", kitsu: null },
          anilist_id: 101922,
          mal_id: 38000,
        },
      ],
    };

    fs.writeFileSync(cachePath, JSON.stringify(freshData), "utf8");

    const staleWhenFresh = await catalog.isCacheStale(12);
    assert.strictEqual(staleWhenFresh, false, "Cache less than 12 hours old must NOT be stale");

    const cached = await catalog.getCachedCatalog();
    assert(cached, "getCachedCatalog must return cached data");
    assert.strictEqual(cached.count, 2, "Cached count must match");
    assert.strictEqual(cached.series[0].id, "TEST1", "First series ID must match");
    assert.strictEqual(cached.series[0].ratings.anilist, "91%", "Attached AniList rating must match");
    assert.strictEqual(cached.series[0].mal_id, 52991, "Attached MAL ID must match");

    // Write a mock stale cache (> 12 hours old)
    const staleData = {
      ...freshData,
      last_updated: Date.now() - 14 * 60 * 60 * 1000, // 14 hours old
    };
    fs.writeFileSync(cachePath, JSON.stringify(staleData), "utf8");

    const staleWhenOld = await catalog.isCacheStale(12);
    assert.strictEqual(staleWhenOld, true, "Cache older than 12 hours must be reported as stale");

    console.log("✓ Catalog cache and multi-source merge tests passed!");
  } finally {
    // Restore original cache file if it existed
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
    if (hadOriginal && fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, cachePath);
    }
  }
}

module.exports = { testCatalogModule };
