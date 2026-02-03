/**
 * Crunchyroll API Data Mapper
 * Transforms raw API responses into UI presentation models.
 */

window.mapper = {
  loaded: 0,
  loadedSubcategories: 0,

  /**
   * Maps discover home feed data into home screen model.
   * @param {object} response
   * @param {{ success: Function }} callback
   */
  home: (response, callback) => {
    const lists = (response.data || []).filter((element) =>
      ["recommendations", "history", "browse", "series", "because_you_watched"].includes(
        element.response_type
      )
    );

    const bannerPanels = (response.data || [])
      .filter((p) => p.resource_type === "panel" && p.panel)
      .map((b) => ({
        id: b.panel.id,
        title: b.panel.title,
        description: b.panel.description,
        background: window.mapper.preventImageErrorTest(
          () =>
            (b.panel.images?.poster_wide
              ? b.panel.images.poster_wide[0][4]?.source
              : b.panel.images?.thumbnail?.[0][4]?.source) || "",
          b.panel.id
        ),
      }));

    window.home.data.main = {
      banner: bannerPanels[0] || { id: "", title: "", description: "", background: "" },
      banners: bannerPanels,
      lists: lists.map((list) => ({
        title: list.title,
        items: [],
      })),
    };

    window.mapper.loaded = 0;
    if (lists.length === 0) {
      callback.success();
      return;
    }

    for (let index = 0; index < lists.length; index++) {
      window.mapper.load(lists[index], index, {
        success: (listData, on) => {
          window.home.data.main.lists[on].items = window.mapper.mapItems(listData.data || []);
          window.mapper.loaded++;
          if (window.mapper.loaded === lists.length) {
            window.home.data.main.lists = window.home.data.main.lists.filter(
              (e) => e.items.length > 0
            );
            callback.success();
          }
        },
      });
    }
  },

  /**
   * Loads panel / dynamic collection items asynchronously.
   * @param {object} item
   * @param {number} index
   * @param {{ success: Function }} callback
   */
  load: (item, index, callback) => {
    window.session.refresh({
      success: (storage) => {
        let url;
        if (item.resource_type === "dynamic_collection") {
          url = item.link;
        } else {
          url = `/content/v2/cms/objects/${item.ids.join()}?locale=${storage.account.language}`;
        }

        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        return fetch(`${window.service.api.url}${url}`, { headers })
          .then((res) => res.json())
          .then((json) => callback.success(json, index))
          .catch(() => {});
      },
    });
  },

  /**
   * Maps continue watching item data.
   * @param {object} response
   * @returns {object}
   */
  continue: (response) => {
    const item = response.data[0];
    const streamLink = item.panel.streams_link || "";
    const videoIndex = streamLink.indexOf("/videos/");
    const streamId = videoIndex !== -1 ? streamLink.substring(videoIndex + 8, videoIndex + 17) : "";

    return {
      id: item.panel.id,
      stream: streamId,
      serie: item.panel.episode_metadata.series_title,
      episode: item.panel.title,
      season_number: item.panel.episode_metadata.season_number || 0,
      episode_number: item.panel.episode_metadata.episode_number || 0,
      description: item.panel.description,
      background: window.mapper.preventImageErrorTest(
        () => item.panel.images.thumbnail[0][4].source,
        item.panel.id
      ),
      watched: !item.never_watched,
      playhead: Math.round((item.playhead || 0) / 60),
      duration: Math.round((item.panel.episode_metadata.duration_ms || 0) / 60000),
      played:
        ((item.playhead || 0) * 100) / ((item.panel.episode_metadata.duration_ms || 1000) / 1000),
    };
  },

  /**
   * Maps seasons list and filters by user preferred audio.
   * @param {object} response
   * @returns {Array<object>}
   */
  seasons: (response) => {
    let seasons = (response.items || []).filter((season) => {
      const userAudio = window.session.storage.account.audio;
      const isAudioMatch =
        season.audio_locale === userAudio ||
        (Array.isArray(season.audio_locales) && season.audio_locales.includes(userAudio));
      const hasAudioMatch =
        Array.isArray(season.versions) &&
        season.versions.some((version) => version.audio_locale === userAudio);
      return isAudioMatch || (!season.is_dubbed && !hasAudioMatch);
    });

    if (!seasons?.length) {
      seasons = response.items || [];
    }

    return seasons.map((season) => {
      let audioLocale = "";
      try {
        audioLocale = (season.audio_locale || "").split("-")[0].toUpperCase();
      } catch {
        audioLocale = "";
      }
      return {
        id: season.id,
        title: season.title,
        number: season.season_number,
        audio_locale: audioLocale,
      };
    });
  },

  /**
   * Maps episodes list and correlates with user playhead progress.
   * @param {object} response
   * @param {Function} callback
   */
  episodes: (response, callback) => {
    let episodeList = (response.items || []).map((episode) => {
      const streamHref = episode.__links__?.streams?.href || "";
      const videoIndex = streamHref.indexOf("/videos/");
      const streamId =
        videoIndex !== -1 ? streamHref.substring(videoIndex + 8, videoIndex + 17) : undefined;

      return {
        id: episode.id,
        title: episode.title,
        episode: episode.title,
        serie: episode.series_title,
        description: episode.description,
        episode_number: episode.episode_number || 0,
        season_number: episode.season_number || 0,
        background: window.mapper.preventImageErrorTest(
          () => episode.images.thumbnail?.[0]?.[1]?.source || "",
          episode.id
        ),
        stream: streamId,
        duration: Math.round((episode.duration_ms || 0) / 60000),
        premium: episode.is_premium_only,
      };
    });

    window.mapper.playheads(episodeList, (playheads) => {
      episodeList = episodeList.map((e) => {
        const element = playheads.get(e.id);
        e.playhead = element
          ? element.fully_watched
            ? e.duration
            : Math.round(element.playhead / 60)
          : 0;
        return e;
      });
      callback?.(episodeList);
    });
  },

  /**
   * Fetches playheads map for an array of episodes.
   * @param {Array<object>} episodes
   * @param {Function} callback
   */
  playheads: (episodes, callback) => {
    if (!episodes.length) {
      callback?.(new Map());
      return;
    }
    window.service.playheads({
      data: {
        ids: episodes.map((e) => e.id).join(","),
      },
      success: (response) => {
        const playheads = new Map((response.data || []).map((obj) => [obj.content_id, obj]));
        callback?.(playheads);
      },
      error: () => {
        callback?.(new Map());
      },
    });
  },

  /**
   * Maps search results for series and movies.
   * @param {object} response
   * @returns {Array<object>}
   */
  search: (response) => {
    return (response.data || []).reduce((acc, elem) => {
      if (elem.type === "series" || elem.type === "movie_listing") {
        const mapped = (elem.items || []).map((item) => ({
          display: "serie",
          type: item.type,
          id: item.id,
          title: item.title,
          description: item.description,
          background: window.mapper.preventImageErrorTest(
            () => item.images.poster_wide[0][5].source,
            item.id
          ),
          poster: window.mapper.preventImageErrorTest(() => item.images.poster_tall[0][2].source),
        }));
        return [...acc, ...mapped];
      }
      return acc;
    }, []);
  },

  /**
   * Maps user watch history items.
   * @param {object} response
   * @returns {Array<object>}
   */
  history: (response) => {
    return (response.data || [])
      .filter((element) => element.panel)
      .map((element) => ({
        id: element.panel.episode_metadata.series_id,
        playhead: element.playhead ? Math.round(element.playhead / 60) : 0,
        duration: Math.round(
          (element.panel
            ? element.panel.episode_metadata.duration_ms
            : element.episode_metadata.duration_ms) / 60000
        ),
        title: element.panel ? element.panel.episode_metadata.series_title : element.title,
        description: element.panel.title,
        background: window.mapper.preventImageErrorTest(
          () =>
            element.panel
              ? element.panel.images.thumbnail[0][4].source
              : element.images.thumbnail[0][4].source,
          element.panel.episode_metadata.series_id
        ),
      }));
  },

  /**
   * Safe image accessor with fallback on missing nested image keys.
   * @param {Function} callback
   * @param {string} [id="default"]
   * @returns {string}
   */
  preventImageErrorTest: (callback, _id = "default") => {
    try {
      return callback();
    } catch {
      return `assets/images/empty_640x360.png`;
    }
  },

  /**
   * Loads category listing by subcategories.
   * @param {string} id
   * @param {Array<object>} subcategories
   * @param {{ success: Function }} callback
   */
  listByCategories: (id, subcategories, callback, filters = {}) => {
    window.home.data.main = {
      category: subcategories[0]?.parent_category,
      banner: { id: "", title: "", description: "", background: "" },
      lists: subcategories.map((subcategory) => ({
        lazy: true,
        id: subcategory.tenant_category,
        title: subcategory.localization.description,
        items: [],
      })),
    };

    window.mapper.loadedSubcategories = 0;
    for (let index = 0; index < subcategories.length; index++) {
      window.mapper.loadCategoryListAsync(
        `${id},${subcategories[index].tenant_category}`,
        0,
        20,
        index,
        {
          success: (res, listPosition) => {
            window.home.data.main.lists[listPosition].items = window.mapper.mapItems(
              res.items || []
            );
            window.mapper.loadedSubcategories++;
            if (window.mapper.loadedSubcategories === subcategories.length) {
              window.home.data.main.lists = window.home.data.main.lists.filter(
                (e) => e.items.length > 0
              );
              window.home.data.main.banner =
                window.home.data.main.lists[listPosition]?.items[0] || {};
              callback.success();
            }
          },
          error: () => {},
        },
        filters
      );
    }
  },

  /**
   * Normalizes raw items (episodes, movies, series) into standard UI item models.
   * @param {Array<object>} items
   * @returns {Array<object>}
   */
  mapItems: (items) => {
    try {
      return items.map((rawItem) => {
        const playhead = rawItem.playhead ? Math.round(rawItem.playhead / 60) : undefined;
        const item = rawItem.panel ? rawItem.panel : rawItem;
        let id = item.id;
        let display = "serie";
        let title = item.title;
        let duration;
        let background;
        let poster;
        let categories;

        if (item.type === "episode") {
          display = "episode";
          id = item.episode_metadata.series_id;
          title = `${item.episode_metadata.series_title} - S${item.episode_metadata.season_number}E${item.episode_metadata.episode_number} - ${item.title}`;
          duration = Math.round(item.episode_metadata.duration_ms / 60000);
          background = window.mapper.preventImageErrorTest(
            () => item.images.thumbnail[0][4].source,
            item.id
          );
        } else {
          background = window.mapper.preventImageErrorTest(
            () => item.images.poster_wide[0][4].source,
            item.id
          );
          poster = window.mapper.preventImageErrorTest(
            () => item.images.poster_tall[0][2].source,
            item.id
          );
        }

        if (item.type === "movie") {
          categories = item.movie_metadata?.movie_listing_title;
        }

        return {
          id,
          display,
          duration,
          playhead,
          background,
          poster,
          title,
          description: item.description,
          type: item.type,
          categories,
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * Loads category list asynchronously via browse API endpoint.
   * @param {string} categories
   * @param {number} offset
   * @param {number} size
   * @param {number} index
   * @param {{ success: Function, error: Function }} callback
   * @param {object} [filters={}]
   */
  loadCategoryListAsync: (categories, offset, size, index, callback, filters = {}) => {
    window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        let url = `${window.service.api.url}/content/v1/browse?categories=${encodeURIComponent(
          categories
        )}&n=${size}&start=${offset}`;

        if (filters.sort_by) {
          url += `&sort_by=${encodeURIComponent(filters.sort_by)}`;
        }
        if (filters.is_subbed !== undefined) {
          url += `&is_subbed=${filters.is_subbed}`;
        }
        if (filters.is_dubbed !== undefined) {
          url += `&is_dubbed=${filters.is_dubbed}`;
        }
        if (filters.type) {
          url += `&type=${encodeURIComponent(filters.type)}`;
        }

        return fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => callback.success(json, index))
          .catch((err) => callback.error(err));
      },
    });
  },
};
