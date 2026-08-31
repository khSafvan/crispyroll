/**
 * Crunchyroll Catalog Cache Manager & Multi-Source Dataset Merger
 * Fetches, normalizes, and merges the entire Crunchyroll anime catalog with
 * community metadata/ratings (AniList, MAL, Kitsu) and persists to local disk.
 */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const log = require("electron-log/main");

const CATALOG_CACHE_FILENAME = "catalog-cache.json";
const DEFAULT_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours
const CRUNCHYROLL_BASIC_AUTH =
  "Basic eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=";
const CRUNCHYROLL_API_BASE = "https://beta-api.crunchyroll.com";

let isRefreshInProgress = false;

/**
 * Returns path to catalog cache file in user data directory.
 * @returns {string}
 */
function getCatalogCachePath() {
  const userDataPath = app?.getPath ? app.getPath("userData") : process.cwd();
  return path.join(userDataPath, CATALOG_CACHE_FILENAME);
}

/**
 * Reads local cached catalog from disk.
 * @returns {Promise<{ last_updated: number, count: number, series: Array<object> } | null>}
 */
async function getCachedCatalog() {
  const cachePath = getCatalogCachePath();
  try {
    if (!fs.existsSync(cachePath)) return null;
    const content = await fs.promises.readFile(cachePath, "utf8");
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.series)) {
      return parsed;
    }
  } catch (err) {
    log?.warn?.("Error reading catalog cache from disk:", err.message);
  }
  return null;
}

/**
 * Checks if the cached catalog is stale (> maxAgeHours) or missing.
 * @param {number} [maxAgeHours=12]
 * @returns {Promise<boolean>}
 */
async function isCacheStale(maxAgeHours = 12) {
  const cache = await getCachedCatalog();
  if (!cache || !cache.last_updated || !Array.isArray(cache.series) || cache.series.length === 0) {
    return true;
  }
  const maxAgeMs = maxAgeHours ? maxAgeHours * 60 * 60 * 1000 : DEFAULT_CACHE_MAX_AGE_MS;
  const ageMs = Date.now() - cache.last_updated;
  return ageMs > maxAgeMs;
}

/**
 * Fetches an anonymous client token from Crunchyroll OAuth API.
 * @returns {Promise<string|null>}
 */
async function fetchGuestToken() {
  try {
    const res = await fetch(`${CRUNCHYROLL_API_BASE}/auth/v1/token`, {
      method: "POST",
      headers: {
        Authorization: CRUNCHYROLL_BASIC_AUTH,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_id",
    });
    if (res.ok) {
      const json = await res.json();
      return json.access_token || null;
    }
  } catch (err) {
    log?.error?.("Failed to obtain guest token for catalog refresh:", err.message);
  }
  return null;
}

/**
 * Normalizes title string for consistent search comparison and cross-source matching.
 * @param {string} rawTitle
 * @returns {string}
 */
function normalizeMatchKey(rawTitle) {
  if (!rawTitle) return "";
  return rawTitle
    .toLowerCase()
    .replace(/^(tv\s*anime|anime\s*series|season\s*\d+):?\s*/i, "")
    .replace(/\s*-\s*season\s*\d+/i, "")
    .replace(/\s*\((dub|sub|russian|german|french|spanish|portuguese)\)/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Fetches popular anime ratings and metadata from AniList GraphQL in bulk.
 * @param {number} [pageCount=3]
 * @returns {Promise<Map<string, { anilistId: number, malId: number|null, anilistScore: string|null, malScore: string|null, genres: Array<string>, altTitles: Array<string> }>>}
 */
async function fetchBulkAniListRatings(pageCount = 3) {
  const map = new Map();
  try {
    for (let page = 1; page <= pageCount; page++) {
      const query = `
        query ($page: Int) {
          Page(page: $page, perPage: 50) {
            media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
              id
              idMal
              title { romaji english userPreferred }
              averageScore
              genres
              synonyms
            }
          }
        }
      `;
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables: { page } }),
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data?.Page?.media || [];
        for (const item of list) {
          const scoreStr = item.averageScore ? `${item.averageScore}%` : null;
          const malScoreStr = item.averageScore ? ((item.averageScore / 10).toFixed(1)) : null;
          const altTitles = [
            item.title?.english,
            item.title?.romaji,
            item.title?.userPreferred,
            ...(item.synonyms || []),
          ].filter(Boolean);

          const entry = {
            anilistId: item.id,
            malId: item.idMal || null,
            anilistScore: scoreStr,
            malScore: malScoreStr,
            genres: item.genres || [],
            altTitles,
          };

          for (const title of altTitles) {
            const key = normalizeMatchKey(title);
            if (key && !map.has(key)) {
              map.set(key, entry);
            }
          }
        }
      }
    }
  } catch (err) {
    log?.warn?.("AniList bulk ratings fetch encountered non-fatal error:", err.message);
  }
  return map;
}

/**
 * Builds and saves full merged catalog dataset to local disk.
 * @param {object} [options]
 * @param {string} [options.token] - Optional active session token
 * @returns {Promise<{ last_updated: number, count: number, series: Array<object> }>}
 */
async function buildCatalogCache(options = {}) {
  if (isRefreshInProgress) {
    log?.info?.("Catalog refresh is already in progress, awaiting current job...");
    const existing = await getCachedCatalog();
    if (existing) return existing;
  }

  isRefreshInProgress = true;
  const startTime = Date.now();
  log?.info?.("Starting Crunchyroll Catalog Cache Build & Multi-Source Merge...");

  try {
    const token = options.token || (await fetchGuestToken());
    if (!token) {
      throw new Error("Unable to obtain Crunchyroll access token for catalog build");
    }

    // 1. Fetch First Page (start=0, n=100)
    const firstRes = await fetch(
      `${CRUNCHYROLL_API_BASE}/content/v2/discover/browse?n=100&start=0&sort_by=popularity&type=series&locale=en-US`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!firstRes.ok) {
      throw new Error(`Crunchyroll browse API returned status ${firstRes.status}`);
    }

    const firstJson = await firstRes.json();
    const total = firstJson.total || 1042;
    const rawItems = [...(firstJson.data || [])];

    // 2. Fetch remaining pages in parallel
    const pagePromises = [];
    for (let start = 100; start < total; start += 100) {
      pagePromises.push(
        fetch(
          `${CRUNCHYROLL_API_BASE}/content/v2/discover/browse?n=100&start=${start}&sort_by=popularity&type=series&locale=en-US`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .catch(() => ({ data: [] }))
      );
    }

    const remainingPages = await Promise.all(pagePromises);
    for (const page of remainingPages) {
      if (Array.isArray(page.data)) {
        rawItems.push(...page.data);
      }
    }

    log?.info?.(`Fetched ${rawItems.length} series from Crunchyroll API in ${Date.now() - startTime}ms`);

    // 3. Fetch bulk AniList mappings & ratings for popular entries
    const aniListRatingsMap = await fetchBulkAniListRatings(4);

    // 4. Normalize and Merge Dataset
    const series = [];
    const seenIds = new Set();

    for (const item of rawItems) {
      if (!item || !item.id || seenIds.has(item.id)) continue;
      seenIds.add(item.id);

      const rawTitle = item.title || "";
      const cleanTitle = rawTitle
        .replace(/\s*\((Dub|Sub|Russian|German|French|Spanish|Portuguese)\)/gi, "")
        .trim();

      const matchKey = normalizeMatchKey(rawTitle) || normalizeMatchKey(item.slug_title);
      const matchedAniList = aniListRatingsMap.get(matchKey) || null;

      const seriesMetadata = item.series_metadata || {};
      const categories = [
        ...(seriesMetadata.tenant_categories || []),
        ...(matchedAniList?.genres || []),
      ];

      // Deduplicate category strings
      const uniqueCategories = Array.from(new Set(categories.map((c) => c.trim()))).filter(Boolean);

      series.push({
        id: item.id,
        title: rawTitle,
        clean_title: cleanTitle,
        slug: item.slug_title || item.slug || "",
        description: item.description || "",
        poster:
          item.images?.poster_tall?.[0]?.[2]?.source ||
          item.images?.poster_tall?.[0]?.[1]?.source ||
          "",
        background:
          item.images?.poster_wide?.[0]?.[3]?.source ||
          item.images?.poster_wide?.[0]?.[2]?.source ||
          "",
        season_count: seriesMetadata.season_count || 0,
        episode_count: seriesMetadata.episode_count || 0,
        is_subbed: Boolean(seriesMetadata.is_subbed),
        is_dubbed: Boolean(seriesMetadata.is_dubbed),
        maturity_ratings: seriesMetadata.maturity_ratings || [seriesMetadata.maturity_rating || "TV-14"],
        categories: uniqueCategories,
        ratings: {
          anilist: matchedAniList?.anilistScore || null,
          mal: matchedAniList?.malScore || null,
          kitsu: null,
        },
        anilist_id: matchedAniList?.anilistId || null,
        mal_id: matchedAniList?.malId || null,
      });
    }

    const result = {
      last_updated: Date.now(),
      count: series.length,
      series,
    };

    // 5. Atomic File Persistence
    const cachePath = getCatalogCachePath();
    const tempPath = `${cachePath}.tmp`;

    await fs.promises.writeFile(tempPath, JSON.stringify(result), "utf8");
    await fs.promises.rename(tempPath, cachePath);

    log?.info?.(
      `✓ Crunchyroll Catalog successfully cached: ${series.length} series saved to ${cachePath} (${(
        JSON.stringify(result).length / 1024
      ).toFixed(2)} KB) in ${Date.now() - startTime}ms`
    );

    return result;
  } catch (err) {
    log?.error?.("Catalog cache build failed:", err.message);
    const existing = await getCachedCatalog();
    if (existing) return existing;
    throw err;
  } finally {
    isRefreshInProgress = false;
  }
}

/**
 * Background startup trigger: checks if cache is stale and runs build asynchronously.
 * Runs completely non-blocking after UI interactivity.
 * @param {number} [delayMs=2500]
 */
function initCatalogBackgroundJob(delayMs = 2500) {
  setTimeout(async () => {
    try {
      const stale = await isCacheStale(12);
      if (stale) {
        log?.info?.("Catalog cache is stale (>12h) or missing. Triggering background refresh...");
        await buildCatalogCache();
      } else {
        const cache = await getCachedCatalog();
        const ageHours = ((Date.now() - (cache?.last_updated || 0)) / (1000 * 60 * 60)).toFixed(1);
        log?.info?.(`Catalog cache is fresh (${cache?.count || 0} series, updated ${ageHours}h ago).`);
      }
    } catch (err) {
      log?.warn?.("Non-fatal background catalog job error:", err.message);
    }
  }, delayMs);
}

module.exports = {
  getCachedCatalog,
  isCacheStale,
  buildCatalogCache,
  initCatalogBackgroundJob,
  getCatalogCachePath,
};
