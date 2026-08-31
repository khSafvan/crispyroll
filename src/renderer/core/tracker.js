/**
 * Scrobbling & Tracking Synchronization Manager
 * Supports AniList (Phase 1) and extensible provider interface for MAL & Trakt.
 */

window.tracker = {
  providers: {
    anilist: {
      name: "AniList",
      graphqlUrl: "https://graphql.anilist.co",

      /**
       * Resolves an AniList Media ID from local store cache or GraphQL search.
       * @param {string} seriesId - Crunchyroll series ID
       * @param {string} title - Series / Anime title
       * @returns {Promise<number|null>}
       */
      resolveMediaId: async (seriesId, title) => {
        if (!seriesId && !title) return null;

        // 1. Check local persistent cache via IPC/Store
        try {
          const cachedId = await window.electronUtilsRender?.getTrackerMapping?.("anilist", seriesId);
          if (cachedId) {
            return Number(cachedId);
          }
        } catch {
          // Ignore cache read error
        }

        // 2. Query AniList GraphQL Search
        if (!title) return null;

        // Clean up common subtitle noise or season numbers from search query
        const cleanTitle = title
          .replace(/^(TV\s*Anime|Anime\s*Series|Season\s*\d+):?\s*/i, "")
          .replace(/\s*-\s*Season\s*\d+/i, "")
          .replace(/\s*\(Dub\)/i, "")
          .replace(/\s*\(Sub\)/i, "")
          .trim();

        const query = `
          query ($search: String) {
            Media (search: $search, type: ANIME, format_in: [TV, TV_SHORT, MOVIE, SPECIAL, OVA, ONA]) {
              id
              title {
                romaji
                english
              }
              episodes
            }
          }
        `;

        try {
          const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              query,
              variables: { search: cleanTitle },
            }),
          });

          if (response.ok) {
            const json = await response.json();
            const mediaId = json.data?.Media?.id;
            if (mediaId) {
              // Cache mapping to disk
              if (seriesId) {
                window.electronUtilsRender?.saveTrackerMapping?.("anilist", seriesId, mediaId);
              }
              return mediaId;
            }
          }
        } catch {
          // Best-effort lookup failed
        }

        return null;
      },

      /**
       * Updates anime watch progress on AniList.
       * @param {string} token - AniList OAuth access token
       * @param {number} mediaId - AniList Media ID
       * @param {number} progress - Episode number completed
       * @returns {Promise<boolean>}
       */
      saveProgress: async (token, mediaId, progress) => {
        if (!token || !mediaId) return false;

        const mutation = `
          mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
            SaveMediaListEntry (mediaId: $mediaId, progress: $progress, status: $status) {
              id
              status
              progress
            }
          }
        `;

        try {
          const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              query: mutation,
              variables: {
                mediaId,
                progress: Math.max(1, Math.floor(progress)),
                status: "CURRENT",
              },
            }),
          });

          return response.ok;
        } catch {
          return false;
        }
      },

      /**
       * Fetches current authenticated viewer profile.
       * @param {string} token
       * @returns {Promise<object|null>}
       */
      getViewer: async (token) => {
        if (!token) return null;
        const query = `
          query {
            Viewer {
              id
              name
              avatar {
                medium
              }
            }
          }
        `;

        try {
          const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ query }),
          });

          if (response.ok) {
            const json = await response.json();
            return json.data?.Viewer || null;
          }
        } catch {
          // Fetch failed
        }
        return null;
      },
    },
  },

  /**
   * Main player scrobble hook called when watch progress reaches threshold (85%).
   * Handles lookup, verification, and scrobbling silently in background.
   * @param {{ seriesId: string, title: string, episodeNumber: number, seasonNumber?: number }} data
   */
  scrobble: async (data) => {
    if (!data) return;

    try {
      const status = await window.electronUtilsRender?.getTrackerStatus?.("anilist");
      if (!status?.connected || !status?.token) {
        return; // AniList not connected by user, skip silently
      }

      const mediaId = await window.tracker.providers.anilist.resolveMediaId(
        data.seriesId,
        data.title
      );

      if (!mediaId) {
        return; // Unmapped series, skip silently
      }

      const episodeNumber = data.episodeNumber || 1;
      await window.tracker.providers.anilist.saveProgress(
        status.token,
        mediaId,
        episodeNumber
      );
    } catch {
      // Best-effort scrobble error, never throw or block UI
    }
  },

  ratingsCache: {},

  /**
   * Fetches community ratings from AniList, Kitsu, and MyAnimeList.
   * @param {string} title - Anime series title
   * @returns {Promise<{ anilist?: string, kitsu?: string, mal?: string }>}
   */
  fetchCommunityRatings: async (title) => {
    if (!title) return {};
    const cleanTitle = title
      .replace(/^(TV\s*Anime|Anime\s*Series|Season\s*\d+):?\s*/i, "")
      .replace(/\s*-\s*Season\s*\d+/i, "")
      .replace(/\s*\(Dub\)/i, "")
      .replace(/\s*\(Sub\)/i, "")
      .trim();

    if (window.tracker.ratingsCache[cleanTitle]) {
      return window.tracker.ratingsCache[cleanTitle];
    }

    const result = {};

    // 1. Query AniList for score & MAL ID
    let malId = null;
    try {
      const query = `
        query ($search: String) {
          Media (search: $search, type: ANIME, format_in: [TV, TV_SHORT, MOVIE, SPECIAL, OVA, ONA]) {
            idMal
            averageScore
            meanScore
          }
        }
      `;
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables: { search: cleanTitle } }),
      });
      if (res.ok) {
        const json = await res.json();
        const media = json.data?.Media;
        if (media) {
          const score = media.averageScore || media.meanScore;
          if (score) {
            result.anilist = `${score}%`;
          }
          if (media.idMal) {
            malId = media.idMal;
          }
        }
      }
    } catch {
      // Best-effort AniList lookup
    }

    // 2. Query Kitsu API
    try {
      const kitsuRes = await fetch(
        `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(cleanTitle)}&page[limit]=1`
      );
      if (kitsuRes.ok) {
        const kJson = await kitsuRes.json();
        const rawRating = kJson.data?.[0]?.attributes?.averageRating;
        if (rawRating) {
          const parsed = parseFloat(rawRating);
          if (!isNaN(parsed) && parsed > 0) {
            result.kitsu = `${Math.round(parsed)}%`;
          }
        }
      }
    } catch {
      // Best-effort Kitsu lookup
    }

    // 3. Query MyAnimeList (via Jikan using MAL ID or cleanTitle search)
    try {
      const malUrl = malId
        ? `https://api.jikan.moe/v4/anime/${malId}`
        : `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanTitle)}&limit=1`;
      const malRes = await fetch(malUrl);
      if (malRes.ok) {
        const malJson = await malRes.json();
        const score = malId ? malJson.data?.score : malJson.data?.[0]?.score;
        if (score && typeof score === "number") {
          result.mal = score.toFixed(1);
        }
      }
    } catch {
      // Best-effort MAL lookup
    }

    window.tracker.ratingsCache[cleanTitle] = result;
    return result;
  },
};
