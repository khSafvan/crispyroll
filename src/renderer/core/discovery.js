/**
 * Discovery & Multi-Provider Content Aggregator for Crispyroll
 * Orchestrates Crunchyroll, AniList, MyAnimeList (MAL), and Kitsu feeds with:
 * 1. User-specific personal lists & recommendations if authenticated with trackers.
 * 2. General trending, top-rated, and seasonal feeds if guest/unauthenticated.
 * 3. Strict cross-row and intra-row deduplication engine (zero duplicate anime across entire screen).
 * 4. Transparent Crunchyroll search & mapping resolution for external titles.
 */

window.discovery = {
  /**
   * Generates a normalized canonical alphanumeric key for a title to detect duplicates accurately
   * across different localization conventions, seasons, and dub/sub tags.
   * @param {string} title
   * @returns {string}
   */
  normalizeKey: (title) => {
    if (!title || typeof title !== "string") return "";
    const sanitized = typeof window.sanitizeTitle === "function" ? window.sanitizeTitle(title) : title;
    return sanitized
      .toLowerCase()
      .replace(/^(tv\s*anime|anime\s*series|season\s*\d+):?\s*/i, "")
      .replace(/\s*-\s*season\s*\d+/i, "")
      .replace(/\s*[\(\[][^\)\]]*(?:dub|sub|uncut|1080p|720p|4k|tv)[^\)\]]*[\)\]]/gi, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  },

  /**
   * Fetches AniList Feeds (User-based if logged in for active profile, else Trending/Top-Rated).
   * @returns {Promise<Array<{ title: string, items: Array<object> }>>}
   */
  fetchAniList: async () => {
    const results = [];
    try {
      let isConnected = false;
      let token = null;

      try {
        const profileId =
          window.tracker?.getActiveProfileId?.() ||
          window.session?.storage?.profile_id ||
          window.session?.storage?.id ||
          null;
        const status = await window.electronUtilsRender?.getTrackerStatus?.("anilist", profileId);
        isConnected = Boolean(status?.connected && status?.token);
        token = status?.token || null;
      } catch {
        // Fallback to unauthenticated
      }

      if (isConnected && token) {
        // 1. User-Based: Currently Watching List
        try {
          const userWatchingQuery = `
            query {
              MediaListCollection(type: ANIME, status: CURRENT) {
                lists {
                  entries {
                    mediaId
                    progress
                    media {
                      id
                      title { romaji english userPreferred }
                      coverImage { extraLarge large medium }
                      bannerImage
                      averageScore
                      genres
                      description
                    }
                  }
                }
              }
            }
          `;
          const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ query: userWatchingQuery }),
          });
          if (res.ok) {
            const data = await res.json();
            const entries = data.data?.MediaListCollection?.lists?.[0]?.entries || [];
            if (entries.length > 0) {
              const items = entries.map((e) => ({
                id: `anilist-${e.media.id}`,
                externalProvider: "anilist",
                externalId: e.media.id,
                title: e.media.title.english || e.media.title.userPreferred || e.media.title.romaji,
                poster: e.media.coverImage?.extraLarge || e.media.coverImage?.large,
                background: e.media.bannerImage || e.media.coverImage?.extraLarge,
                description: e.media.description || "",
                subtitle: e.progress ? `Episode ${e.progress} • In Progress` : (e.media.genres?.slice(0, 2).join(" • ") || "Currently Watching"),
                score: e.media.averageScore ? `${e.media.averageScore}%` : "",
                display: "serie",
                isExternal: true,
              }));
              results.push({
                title: "AniList: Currently Watching",
                items,
              });
            }
          }
        } catch {
          // Fallback gracefully
        }
      }

      // 2. AniList Trending Now
      try {
        const trendingQuery = `
          query {
            Page(page: 1, perPage: 15) {
              media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
                id
                title { romaji english userPreferred }
                coverImage { extraLarge large medium }
                bannerImage
                averageScore
                genres
                description
              }
            }
          }
        `;
        const trendRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ query: trendingQuery }),
        });
        if (trendRes.ok) {
          const data = await trendRes.json();
          const mediaList = data.data?.Page?.media || [];
          if (mediaList.length > 0) {
            const items = mediaList.map((m) => ({
              id: `anilist-${m.id}`,
              externalProvider: "anilist",
              externalId: m.id,
              title: m.title.english || m.title.userPreferred || m.title.romaji,
              poster: m.coverImage?.extraLarge || m.coverImage?.large,
              background: m.bannerImage || m.coverImage?.extraLarge,
              description: m.description || "",
              subtitle: m.genres?.slice(0, 2).join(" • ") || "Trending on AniList",
              score: m.averageScore ? `${m.averageScore}%` : "",
              display: "serie",
              isExternal: true,
            }));
            results.push({
              title: "AniList: Trending Now",
              items,
            });
          }
        }
      } catch {
        // Fallback gracefully
      }

      // 3. AniList Top Rated
      try {
        const topRatedQuery = `
          query {
            Page(page: 1, perPage: 15) {
              media(type: ANIME, sort: SCORE_DESC, isAdult: false, format_in: [TV, MOVIE]) {
                id
                title { romaji english userPreferred }
                coverImage { extraLarge large medium }
                bannerImage
                averageScore
                genres
                description
              }
            }
          }
        `;
        const topRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ query: topRatedQuery }),
        });
        if (topRes.ok) {
          const data = await topRes.json();
          const mediaList = data.data?.Page?.media || [];
          if (mediaList.length > 0) {
            const items = mediaList.map((m) => ({
              id: `anilist-${m.id}`,
              externalProvider: "anilist",
              externalId: m.id,
              title: m.title.english || m.title.userPreferred || m.title.romaji,
              poster: m.coverImage?.extraLarge || m.coverImage?.large,
              background: m.bannerImage || m.coverImage?.extraLarge,
              description: m.description || "",
              subtitle: m.genres?.slice(0, 2).join(" • ") || "Highest Rated",
              score: m.averageScore ? `${m.averageScore}%` : "",
              display: "serie",
              isExternal: true,
            }));
            results.push({
              title: "AniList: Top Rated Anime",
              items,
            });
          }
        }
      } catch {
        // Fallback gracefully
      }
    } catch {
      // Best-effort AniList feeds
    }
    return results;
  },

  /**
   * Fetches full continue watching items from user watch history and in-progress playheads.
   * Includes both in-progress episodes and next episodes for caught-up series.
   * @returns {Promise<Array<object>>}
   */
  fetchContinueWatching: () => {
    return new Promise((resolve) => {
      try {
        if (typeof window.service?.history !== "function") {
          return resolve([]);
        }
        window.service.history({
          success: (response) => {
            const rawItems = response.data || [];
            const continueItems = [];

            for (const entry of rawItems) {
              if (!entry.panel) continue;
              const p = entry.panel;
              const meta = p.episode_metadata || {};
              const durationSec = (meta.duration_ms || 1440000) / 1000;
              const playheadSec = entry.playhead || 0;
              const isWatched = entry.fully_watched || (!entry.never_watched && playheadSec >= durationSec * 0.9);

              const streamLink = p.streams_link || "";
              const videoIndex = streamLink.indexOf("/videos/");
              const streamId = videoIndex !== -1 ? streamLink.substring(videoIndex + 8, videoIndex + 17) : "";

              const seasonNum = meta.season_number || 0;
              const epNum = meta.episode_number || 0;
              const seriesTitle = meta.series_title || p.title;
              const episodeTitle = p.title;

              continueItems.push({
                id: meta.series_id || p.id,
                series_id: meta.series_id || p.id,
                stream: streamId,
                display: "episode",
                serie: seriesTitle,
                title: `${seriesTitle}${seasonNum ? ` - S${seasonNum}` : ""}${epNum ? `E${epNum}` : ""} - ${episodeTitle}`,
                episode: episodeTitle,
                season_number: seasonNum,
                episode_number: epNum,
                playhead: Math.round(playheadSec / 60),
                duration: Math.round(durationSec / 60),
                played: Math.min(100, Math.round((playheadSec / (durationSec || 1)) * 100)),
                isWatched,
                background: window.mapper?.preventImageErrorTest
                  ? window.mapper.preventImageErrorTest(
                      () => (p.images?.thumbnail?.[0]?.[4]?.source || p.images?.thumbnail?.[0]?.[1]?.source || ""),
                      p.id
                    )
                  : (p.images?.thumbnail?.[0]?.[4]?.source || ""),
                poster: p.images?.poster_tall?.[0]?.[2]?.source || "",
                description: p.description || "",
              });
            }

            resolve(continueItems);
          },
          error: () => resolve([]),
        });
      } catch {
        resolve([]);
      }
    });
  },

  /**
   * Fetches MyAnimeList (MAL) feeds via public Jikan API with reliable GraphQL fallback.
   * @returns {Promise<Array<{ title: string, items: Array<object> }>>}
   */
  fetchMAL: async () => {
    const results = [];
    try {
      // 1. Top Airing Anime (Try Jikan first)
      let topAiringItems = [];
      try {
        const airingRes = await fetch("https://api.jikan.moe/v4/top/anime?filter=airing&limit=15");
        if (airingRes.ok) {
          const data = await airingRes.json();
          const list = data.data || [];
          if (list.length > 0) {
            topAiringItems = list.map((a) => ({
              id: `mal-${a.mal_id}`,
              externalProvider: "mal",
              externalId: a.mal_id,
              title: a.title_english || a.title,
              poster: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url,
              background: a.images?.jpg?.large_image_url,
              description: a.synopsis || "",
              subtitle: a.genres?.slice(0, 2).map((g) => g.name).join(" • ") || "Top Airing",
              score: a.score ? `★ ${a.score}` : "",
              display: "serie",
              isExternal: true,
            }));
          }
        }
      } catch {
        // Fallback below
      }

      // 2. Most Popular Anime (Try Jikan first)
      let popularItems = [];
      try {
        const popularRes = await fetch("https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=15");
        if (popularRes.ok) {
          const data = await popularRes.json();
          const list = data.data || [];
          if (list.length > 0) {
            popularItems = list.map((a) => ({
              id: `mal-${a.mal_id}`,
              externalProvider: "mal",
              externalId: a.mal_id,
              title: a.title_english || a.title,
              poster: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url,
              background: a.images?.jpg?.large_image_url,
              description: a.synopsis || "",
              subtitle: a.genres?.slice(0, 2).map((g) => g.name).join(" • ") || "All-Time Popular",
              score: a.score ? `★ ${a.score}` : "",
              display: "serie",
              isExternal: true,
            }));
          }
        }
      } catch {
        // Fallback below
      }

      // If Jikan fails or is rate-limited (504/429), fetch MAL rankings via GraphQL
      if (topAiringItems.length === 0 || popularItems.length === 0) {
        try {
          const malQuery = `
            query {
              topAiring: Page(page: 1, perPage: 15) {
                media(type: ANIME, status: RELEASING, sort: SCORE_DESC, isAdult: false) {
                  id
                  idMal
                  title { romaji english userPreferred }
                  coverImage { extraLarge large medium }
                  bannerImage
                  averageScore
                  genres
                  description
                }
              }
              popular: Page(page: 1, perPage: 15) {
                media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
                  id
                  idMal
                  title { romaji english userPreferred }
                  coverImage { extraLarge large medium }
                  bannerImage
                  averageScore
                  genres
                  description
                }
              }
            }
          `;
          const fallbackRes = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ query: malQuery }),
          });
          if (fallbackRes.ok) {
            const fallbackJson = await fallbackRes.json();
            if (topAiringItems.length === 0) {
              const airList = fallbackJson.data?.topAiring?.media || [];
              topAiringItems = airList.map((m) => ({
                id: `mal-${m.idMal || m.id}`,
                externalProvider: "mal",
                externalId: m.idMal || m.id,
                title: m.title.english || m.title.userPreferred || m.title.romaji,
                poster: m.coverImage?.extraLarge || m.coverImage?.large,
                background: m.bannerImage || m.coverImage?.extraLarge,
                description: m.description || "",
                subtitle: m.genres?.slice(0, 2).join(" • ") || "Top Airing on MAL",
                score: m.averageScore ? `★ ${(m.averageScore / 10).toFixed(1)}` : "",
                display: "serie",
                isExternal: true,
              }));
            }
            if (popularItems.length === 0) {
              const popList = fallbackJson.data?.popular?.media || [];
              popularItems = popList.map((m) => ({
                id: `mal-${m.idMal || m.id}`,
                externalProvider: "mal",
                externalId: m.idMal || m.id,
                title: m.title.english || m.title.userPreferred || m.title.romaji,
                poster: m.coverImage?.extraLarge || m.coverImage?.large,
                background: m.bannerImage || m.coverImage?.extraLarge,
                description: m.description || "",
                subtitle: m.genres?.slice(0, 2).join(" • ") || "Most Popular on MAL",
                score: m.averageScore ? `★ ${(m.averageScore / 10).toFixed(1)}` : "",
                display: "serie",
                isExternal: true,
              }));
            }
          }
        } catch {
          // Fallback failed
        }
      }

      if (topAiringItems.length > 0) {
        results.push({
          title: "MyAnimeList: Top Airing Anime",
          items: topAiringItems,
        });
      }

      if (popularItems.length > 0) {
        results.push({
          title: "MyAnimeList: Most Popular Anime",
          items: popularItems,
        });
      }
    } catch {
      // Best-effort MAL feeds
    }
    return results;
  },

  /**
   * Fetches Kitsu Feeds (Trending & Highest Rated).
   * @returns {Promise<Array<{ title: string, items: Array<object> }>>}
   */
  fetchKitsu: async () => {
    const results = [];
    try {
      // 1. Kitsu Trending
      try {
        const trendRes = await fetch("https://kitsu.io/api/edge/trending/anime?limit=15");
        if (trendRes.ok) {
          const data = await trendRes.json();
          const list = data.data || [];
          if (list.length > 0) {
            const items = list.map((k) => {
              const attr = k.attributes || {};
              return {
                id: `kitsu-${k.id}`,
                externalProvider: "kitsu",
                externalId: k.id,
                title: attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || "Kitsu Anime",
                poster: attr.posterImage?.large || attr.posterImage?.medium || attr.posterImage?.original,
                background: attr.coverImage?.large || attr.posterImage?.large,
                description: attr.synopsis || "",
                subtitle: attr.showType ? `${attr.showType.toUpperCase()} • Kitsu Trending` : "Trending on Kitsu",
                score: attr.averageRating ? `${Math.round(parseFloat(attr.averageRating))}%` : "",
                display: "serie",
                isExternal: true,
              };
            });
            results.push({
              title: "Kitsu: Community Trending",
              items,
            });
          }
        }
      } catch {
        // Fallback gracefully
      }

      // 2. Kitsu Top Rated
      try {
        const ratedRes = await fetch("https://kitsu.io/api/edge/anime?sort=-averageRating&page[limit]=15");
        if (ratedRes.ok) {
          const data = await ratedRes.json();
          const list = data.data || [];
          if (list.length > 0) {
            const items = list.map((k) => {
              const attr = k.attributes || {};
              return {
                id: `kitsu-${k.id}`,
                externalProvider: "kitsu",
                externalId: k.id,
                title: attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || "Kitsu Anime",
                poster: attr.posterImage?.large || attr.posterImage?.medium || attr.posterImage?.original,
                background: attr.coverImage?.large || attr.posterImage?.large,
                description: attr.synopsis || "",
                subtitle: attr.showType ? `${attr.showType.toUpperCase()} • Top Rated` : "Highest Rated",
                score: attr.averageRating ? `${Math.round(parseFloat(attr.averageRating))}%` : "",
                display: "serie",
                isExternal: true,
              };
            });
            results.push({
              title: "Kitsu: Highest Rated Anime",
              items,
            });
          }
        }
      } catch {
        // Fallback gracefully
      }
    } catch {
      // Best-effort Kitsu feeds
    }
    return results;
  },

  /**
   * Fetches Crunchyroll Watchlist to build "From Your Watchlist" row.
   * @returns {Promise<{ title: string, items: Array<object> }|null>}
   */
  fetchCrunchyrollWatchlist: () => {
    return new Promise((resolve) => {
      try {
        if (typeof window.service?.getWatchList !== "function") {
          return resolve(null);
        }
        window.service.getWatchList({
          success: (response) => {
            const items = window.mapper?.mapItems ? window.mapper.mapItems(response.data || []) : [];
            if (items.length > 0) {
              resolve({
                title: window.translate?.go?.("home.watchlist") || "From Your Watchlist",
                items,
              });
            } else {
              resolve(null);
            }
          },
          error: () => resolve(null),
        });
      } catch {
        resolve(null);
      }
    });
  },

  /**
   * Master deduplication function across all rows and in-progress items.
   * Ensures 100% unique anime titles across all rows and unique row categories on the home screen.
   * @param {Array<object>} inProgressItems
   * @param {Array<object>} rawLists
   * @returns {Array<object>} Filtered lists with zero duplicate titles or rows
   */
  deduplicate: (inProgressItems = [], rawLists = []) => {
    const seenKeys = new Set();
    const seenIds = new Set();
    const seenRowKeys = new Set();

    // 1. Register in-progress / continue watching items first so they have top priority
    for (const item of inProgressItems) {
      if (item.id) seenIds.add(String(item.id));
      if (item.series_id) seenIds.add(String(item.series_id));
      const key = window.discovery.normalizeKey(item.serie || item.title);
      if (key) seenKeys.add(key);
    }

    const deduplicatedLists = [];

    // 2. Iterate through each list and filter out duplicate row headers and already-seen titles/IDs
    for (const list of rawLists) {
      if (!list || !Array.isArray(list.items) || list.items.length === 0) continue;

      const rawRowTitle = list.title || "";
      const rowKey = window.discovery.normalizeKey(rawRowTitle);

      // Skip redundant continue watching rows inside recommendation lists (handled separately at row 0)
      if (rowKey === "continuewatching" || rowKey === "inprogress" || rowKey === "recentlywatched") {
        continue;
      }

      // Prevent duplicate row titles
      if (rowKey && seenRowKeys.has(rowKey)) {
        continue;
      }

      const uniqueItems = [];
      for (const item of list.items) {
        if (!item || (!item.title && !item.serie)) continue;

        const idStr = String(item.id || item.stream || "");
        const key = window.discovery.normalizeKey(item.serie || item.title);

        // Check if ID or Title has already been used on the page
        if ((idStr && seenIds.has(idStr)) || (key && seenKeys.has(key))) {
          continue; // Duplicate! Skip quietly.
        }

        if (idStr) seenIds.add(idStr);
        if (key) seenKeys.add(key);
        uniqueItems.push(item);
      }

      if (uniqueItems.length > 0) {
        if (rowKey) seenRowKeys.add(rowKey);
        deduplicatedLists.push({
          title: list.title,
          items: uniqueItems,
        });
      }
    }

    return deduplicatedLists;
  },

  /**
   * Enriches home screen data with multi-provider discovery feeds (AniList, MAL, Kitsu, Watchlist, Continue Watching).
   * Runs in parallel with a timeout guarantee so UI never blocks or hangs.
   */
  enrichHomeData: async () => {
    if (!window.home?.data?.main) return;

    try {
      // Parallel fetch with 3.5s timeout race
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve([]), 3500));

      const fetchPromise = Promise.allSettled([
        window.discovery.fetchAniList(),
        window.discovery.fetchMAL(),
        window.discovery.fetchKitsu(),
        window.discovery.fetchCrunchyrollWatchlist(),
        window.discovery.fetchContinueWatching(),
      ]);

      const [settledResults] = await Promise.race([
        fetchPromise.then((res) => [res]),
        timeoutPromise.then((res) => [res]),
      ]);

      const extraLists = [];
      let historyContinueItems = [];

      if (Array.isArray(settledResults)) {
        for (let i = 0; i < settledResults.length; i++) {
          const res = settledResults[i];
          if (res.status === "fulfilled" && res.value) {
            if (i === 4 && Array.isArray(res.value)) {
              // Result of fetchContinueWatching
              historyContinueItems = res.value;
            } else if (Array.isArray(res.value)) {
              extraLists.push(...res.value);
            } else if (res.value.title && Array.isArray(res.value.items)) {
              extraLists.push(res.value);
            }
          }
        }
      }

      // Combine existing Crunchyroll lists with newly fetched provider lists
      const existingLists = window.home.data.main.lists || [];
      const combinedLists = [...existingLists, ...extraLists];

      // Identify in-progress items from existing continue watching
      const inProgressItems = [];
      for (const list of existingLists) {
        for (const item of list.items || []) {
          if (item.playhead > 0 && item.duration > 0 && item.playhead < item.duration) {
            if (!inProgressItems.some((x) => (x.id || x.stream) === (item.id || item.stream))) {
              inProgressItems.push(item);
            }
          }
        }
      }

      // Merge history items with in-progress items into master continue watching list
      const mergedContinue = [...inProgressItems];
      for (const hItem of historyContinueItems) {
        if (!mergedContinue.some((x) => (x.id || x.stream) === (hItem.id || hItem.stream) || (x.serie && hItem.serie && window.discovery.normalizeKey(x.serie) === window.discovery.normalizeKey(hItem.serie)))) {
          mergedContinue.push(hItem);
        }
      }
      window.home.continueWatching = mergedContinue;

      // Deduplicate everything cleanly against all continue watching items!
      window.home.data.main.lists = window.discovery.deduplicate(mergedContinue, combinedLists);
    } catch {
      // Ensure home data is preserved if discovery enrichment encounters any issue
    }
  },

  /**
   * Resolves and opens external items by searching Crunchyroll for matching streamable anime.
   * @param {object} item
   */
  openExternalItem: async (item) => {
    if (!item) return;

    window.loading?.start?.();
    const rawSearchTitle = item.title || "";
    const cleanSearchTitle = typeof window.sanitizeTitle === "function" ? window.sanitizeTitle(rawSearchTitle) : rawSearchTitle;

    try {
      window.service.search({
        data: { query: cleanSearchTitle },
        success: (response) => {
          window.loading?.end?.();
          const crItems = window.mapper?.search ? window.mapper.search(response) : [];
          const targetKey = window.discovery.normalizeKey(cleanSearchTitle);

          let match = crItems.find(
            (c) => window.discovery.normalizeKey(c.title || c.serie) === targetKey
          );
          if (!match && crItems.length > 0) {
            match = crItems[0];
          }

          if (match && match.id) {
            window.home_details.init(match);
          } else {
            // Display external item metadata in details
            window.home_details.init({
              ...item,
              id: item.id || `ext-${Date.now()}`,
              description: item.description || "Streamable title details.",
            });
          }
        },
        error: () => {
          window.loading?.end?.();
          window.home_details.init(item);
        },
      });
    } catch {
      window.loading?.end?.();
      window.home_details.init(item);
    }
  },
};
