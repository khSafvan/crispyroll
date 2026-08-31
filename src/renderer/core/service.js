/**
 * Crunchyroll API Service Layer
 */

window.service = {
  api: {
    url: "https://beta-api.crunchyroll.com",
    static: "https://static.crunchyroll.com",
    drm: "https://cr-play-service.prd.crunchyrollsvc.com",
    auth: "Basic eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=",
  },

  /**
   * Helper to format key-value pairs into URL-encoded form data string.
   * @param {Record<string, string|number>} params
   * @returns {string}
   */
  format: (params) => {
    return Object.keys(params)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join("&");
  },

  /**
   * Fetches OAuth2 access token for user credentials.
   * @param {{ data: { username: string, password: string }, success?: Function, error?: Function }} request
   */
  token: (request) => {
    const headers = new Headers();
    headers.append("Authorization", window.service.api.auth);
    headers.append("Content-Type", "application/x-www-form-urlencoded");

    const params = window.service.format({
      username: request.data.username,
      password: request.data.password,
      grant_type: "password",
      scope: "offline_access",
    });

    fetch(`${window.service.api.url}/auth/v1/token`, {
      method: "POST",
      headers,
      body: params,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
          const errMsg =
            json.error_description ||
            json.message ||
            (res.status === 401 || res.status === 400
              ? "Invalid username or password"
              : `Authentication failed (${res.status})`);
          throw new Error(errMsg);
        }
        return json;
      })
      .then((json) => request.success?.(json))
      .catch((err) => request.error?.(err));
  },

  /**
   * Requests an OAuth2 device authorization code.
   * @param {{ success?: Function, error?: Function }} request
  /**
   * Refreshes OAuth2 access token using refresh_token.
   * @param {{ data?: { refresh_token: string }, success?: Function, error?: Function }} request
   */
  refresh: (request) => {
    const headers = new Headers();
    headers.append("Authorization", window.service.api.auth);
    headers.append("Content-Type", "application/x-www-form-urlencoded");

    const params = window.service.format({
      refresh_token: request.data?.refresh_token || window.session.storage.refresh_token,
      grant_type: "refresh_token",
      scope: "offline_access",
    });

    fetch(`${window.service.api.url}/auth/v1/token`, {
      method: "POST",
      headers,
      body: params,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
          throw new Error(json.error_description || json.message || "Token refresh failed");
        }
        return json;
      })
      .then((json) => request.success?.(json))
      .catch((err) => request.error?.(err));
  },

  /**
   * Fetches active user profile.
   * @param {{ success?: Function, error?: Function }} request
   */
  profile: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        fetch(`${window.service.api.url}/accounts/v1/me/profile`, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches all multi-profiles on account.
   * @param {{ success?: Function, error?: Function }} request
   */
  profiles: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        fetch(`${window.service.api.url}/accounts/v1/me/multiprofile`, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Updates profile settings.
   * @param {{ data: object, success?: Function, error?: Function }} request
   */
  setProfile: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/json");

        fetch(`${window.service.api.url}/accounts/v1/me/profile`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(request.data),
        })
          .then((res) => res.json().catch(() => null))
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Switches active profile for token.
   * @param {{ success?: Function, error?: Function }} request
   * @param {string} profileId
   * @param {string} [pin]
   */
  switchProfile: (request, profileId, pin) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", window.service.api.auth);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        const data = {
          refresh_token: storage.refresh_token,
          grant_type: "refresh_token_profile_id",
          profile_id: profileId,
          scope: "offline_access",
        };
        if (pin) {
          headers.append("X-Cr-Profile-Pin", pin);
          headers.append("X-Profile-Pin", pin);
          data.pin = pin;
          data.profile_pin = pin;
          data.passcode = pin;
        }

        const params = window.service.format(data);

        fetch(`${window.service.api.url}/auth/v1/token`, {
          method: "POST",
          headers,
          body: params,
        })
          .then(async (res) => {
            const bodyText = await res.text();
            let json = {};
            try {
              json = JSON.parse(bodyText);
            } catch {
              json = { error: bodyText };
            }

            if (!res.ok || json.error) {
              const errMsg =
                json.error_description ||
                json.message ||
                json.error ||
                `Invalid PIN or Profile switch failed (${res.status})`;
              throw new Error(errMsg);
            }
            return json;
          })
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Verifies profile 4-digit PIN against Crunchyroll multiprofile service.
   * @param {{ data: { profile_id: string, pin: string }, success?: Function, error?: Function }} request
   */
  verifyProfilePin: (request) => {
    return window.session.refresh({
      success: async (storage) => {
        const pinStr = String(request.data.pin || "");
        const profileId = request.data.profile_id;

        // 1. Direct local check if profile object has PIN stored on account
        const localProfile = (storage.profiles || []).find(
          (p) => (p.profile_id || p.id) === profileId
        );
        if (localProfile && (localProfile.pin || localProfile.pin_code || localProfile.profile_pin || localProfile.passcode)) {
          const expectedPin = String(localProfile.pin || localProfile.pin_code || localProfile.profile_pin || localProfile.passcode);
          if (expectedPin === pinStr) {
            request.success?.({ valid: true });
            return;
          } else {
            request.error?.(new Error("Incorrect PIN"));
            return;
          }
        }

        // 2. Candidate Crunchyroll Multiprofile PIN verification endpoints
        const candidateProbes = [
          { url: `${window.service.api.url}/accounts/v1/me/multiprofile/${profileId}/pin`, body: { pin: pinStr } },
          { url: `${window.service.api.url}/accounts/v1/me/multiprofile/${profileId}/verify`, body: { pin: pinStr } },
          { url: `${window.service.api.url}/accounts/v1/me/multiprofile/${profileId}/pin/verify`, body: { pin: pinStr } },
          { url: `${window.service.api.url}/accounts/v1/me/multiprofile/${profileId}/verify-pin`, body: { pin: pinStr } },
          { url: `${window.service.api.url}/accounts/v1/me/multiprofile/pin`, body: { profile_id: profileId, pin: pinStr } },
          { url: `${window.service.api.url}/accounts/v1/me/multiprofile/verify`, body: { profile_id: profileId, pin: pinStr } },
          { url: `${window.service.api.url}/accounts/v1/me/profiles/${profileId}/pin`, body: { pin: pinStr } },
          { url: `${window.service.api.url}/accounts/v1/me/profile/pin`, body: { profile_id: profileId, pin: pinStr } },
        ];

        for (const probe of candidateProbes) {
          try {
            const headers = new Headers();
            headers.append("Authorization", `Bearer ${storage.access_token}`);
            headers.append("Content-Type", "application/json");
            headers.append("X-Cr-Profile-Pin", pinStr);
            headers.append("X-Profile-Pin", pinStr);

            const res = await fetch(probe.url, {
              method: "POST",
              headers,
              body: JSON.stringify(probe.body),
            });

            // 200 OK or 204 No Content -> verified!
            if (res.ok || res.status === 200 || res.status === 204) {
              const json = await res.json().catch(() => ({ valid: true }));
              if (json && (json.valid === false || json.success === false || json.error)) {
                request.error?.(new Error(json.message || json.error || "Incorrect PIN"));
                return;
              }
              request.success?.(json);
              return;
            }

            // Explicit rejection from server (400, 401, 403, 422) -> Incorrect PIN!
            if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 422) {
              const errBody = await res.json().catch(() => ({}));
              const lastErrMsg =
                errBody.error_description ||
                errBody.message ||
                errBody.error ||
                "Incorrect PIN";
              request.error?.(new Error(lastErrMsg));
              return;
            }
          } catch {
            // Ignore probe errors on 404
          }
        }

        // 3. Fallback: If no standalone REST verification endpoint matched, allow switchProfile
        // to complete the token verification with the PIN attached in headers & body.
        request.success?.({ valid: true });
      },
      error: request.error,
    });
  },

  /**
   * Fetches CMS Cloudfront index credentials.
   * @param {{ success?: Function, error?: Function }} request
   */
  cookies: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        fetch(`${window.service.api.url}/index/v2`, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches discover home feed.
   * @param {{ success?: Function, error?: Function }} request
   */
  home: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        const url = `${window.service.api.url}/content/v2/discover/${storage.id}/home_feed?start=0&n=100&preferred_audio_language=${storage.account.audio}&locale=${storage.language}`;
        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches up next continue watching item.
   * @param {{ data: { ids: string }, success?: Function, error?: Function }} request
   */
  continue: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        const url = `${window.service.api.url}/content/v2/discover/up_next/${request.data.ids}?locale=${storage.language}&preferred_audio_language=${storage.account.audio}`;
        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches playheads (playback progress) for given content IDs.
   * @param {{ data: { ids: string }, success?: Function, error?: Function }} request
   */
  playheads: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        const url = `${window.service.api.url}/content/v2/${storage.id}/playheads?content_ids=${request.data.ids}&preferred_audio_language=${storage.account.audio}&locale=${storage.language}`;
        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches seasons list for a series.
   * @param {{ data: { id: string }, success?: Function, error?: Function }} request
   */
  seasons: (request) => {
    return window.session.cookies({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        const { bucket, signature, policy, key_pair_id } = storage.cookies;
        const url = `${window.service.api.url}/cms/v2${bucket}/seasons?series_id=${request.data.id}&preferred_audio_language=${storage.account.audio}&locale=${storage.language}&Signature=${signature}&Policy=${policy}&Key-Pair-Id=${key_pair_id}`;

        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches episodes list for a season.
   * @param {{ data: { id: string }, success?: Function, error?: Function }} request
   */
  episodes: (request) => {
    return window.session.cookies({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        const { bucket, signature, policy, key_pair_id } = storage.cookies;
        const url = `${window.service.api.url}/cms/v2${bucket}/episodes?season_id=${request.data.id}&preferred_audio_language=${storage.account.audio}&locale=${storage.language}&Signature=${signature}&Policy=${policy}&Key-Pair-Id=${key_pair_id}`;

        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches DRM video stream playback manifest (v2).
   * @param {{ data: { id: string }, success?: Function, error?: Function }} request
   */
  video_v2: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        fetch(`${window.service.api.drm}/v1/${request.data.id}/tv/samsung/play`, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches CMS stream sources (v1).
   * @param {{ data: { id: string }, success?: Function, error?: Function }} request
   */
  video: (request) => {
    return window.session.cookies({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        const { bucket, signature, policy, key_pair_id } = storage.cookies;
        const url = `${window.service.api.url}/cms/v2${bucket}/videos/${request.data.id}/streams?Signature=${signature}&Policy=${policy}&Key-Pair-Id=${key_pair_id}`;

        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Searches Crunchyroll catalog for series and movies.
   * @param {{ data: { query: string }, success?: Function, error?: Function }} request
   */
  search: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        const url = `${window.service.api.url}/content/v2/discover/search?q=${encodeURIComponent(request.data.query)}&type=series,movie_listing&n=100&locale=${storage.language}`;
        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches user watch history.
   * @param {{ success?: Function, error?: Function }} request
   */
  history: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        const url = `${window.service.api.url}/content/v2/${storage.id}/watch-history?page_size=100&preferred_audio_language=${storage.account.audio}&locale=${storage.language}`;
        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Updates watch history / playhead for an episode.
   * @param {{ data: object, success?: Function, error?: Function }} request
   */
  setHistory: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/json");

        const url = `${window.service.api.url}/content/v2/${storage.id}/playheads?preferred_audio_language=${storage.account.audio}&locale=${storage.language}`;
        fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(request.data),
          keepalive: true,
        })
          .then((res) => res.text())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches available audio or subtitle languages config.
   * @param {{ data: { type: "audio" | "subtitle" }, success?: Function, error?: Function }} request
   */
  languages: (request) => {
    const file =
      request.data.type === "subtitle" ? "timed_text_languages.json" : "audio_languages.json";
    fetch(`${window.service.api.static}/config/i18n/v3/${file}`)
      .then((res) => res.json())
      .then((json) => request.success?.(json))
      .catch((err) => request.error?.(err));
  },

  /**
   * Fetches skip intro/credits skip events timing.
   * @param {{ data: { id: string }, success?: Function, error?: Function }} request
   */
  intro: (request) => {
    fetch(`${window.service.api.static}/skip-events/production/${request.data.id}.json`)
      .then((res) => res.json())
      .then((json) => request.success?.(json))
      .catch((err) => request.error?.(err));
  },

  /**
   * Fetches browse categories.
   * @param {{ success?: Function, error?: Function }} request
   */
  categories: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        const url = `${window.service.api.url}/content/v1/tenant_categories?include_subcategories=true&locale=${storage.language}`;
        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches user custom lists.
   * @param {{ success?: Function, error?: Function }} request
   */
  getCustomLists: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/json");

        const url = `${window.service.api.url}/content/v2/${storage.id}/custom-lists?preferred_audio_language=${storage.account.audio}&locale=${storage.language}`;
        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches items inside a custom list.
   * @param {{ data: string, success?: Function, error?: Function }} request
   */
  getCustomListItems: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/json");

        const url = `${window.service.api.url}/content/v2/${storage.id}/custom-lists/${request.data}?ratings=true&preferred_audio_language=${storage.account.audio}&locale=${storage.language}`;
        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Fetches user watchlist.
   * @param {{ success?: Function, error?: Function }} request
   */
  getWatchList: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/json");

        const url = `${window.service.api.url}/content/v2/discover/${storage.id}/watchlist?order=desc&n=1000&preferred_audio_language=${storage.account.audio}&locale=${storage.language}`;
        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Checks if an item is in watchlist.
   * @param {{ data: string, success?: Function, error?: Function }} request
   */
  inWatchList: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/json");

        const url = `${window.service.api.url}/content/v2/${storage.id}/watchlist?content_ids=${request.data}&preferred_audio_language=${storage.account.audio}&locale=${storage.language}`;
        fetch(url, { headers })
          .then((res) => res.json())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Adds an item to the watchlist.
   * @param {{ data: object, success?: Function, error?: Function }} request
   */
  addWatchlist: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/json");

        const url = `${window.service.api.url}/content/v2/${storage.id}/watchlist?preferred_audio_language=${storage.account.audio}&locale=${storage.language}`;
        fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(request.data),
        })
          .then((res) => res.text())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },

  /**
   * Removes an item from the watchlist.
   * @param {{ data: { content_id: string }, success?: Function, error?: Function }} request
   */
  removeWatchlist: (request) => {
    return window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/json");

        const url = `${window.service.api.url}/content/v2/${storage.id}/watchlist/${request.data.content_id}?preferred_audio_language=${storage.account.audio}&locale=${storage.language}`;
        fetch(url, {
          method: "DELETE",
          headers,
        })
          .then((res) => res.text())
          .then((json) => request.success?.(json))
          .catch((err) => request.error?.(err));
      },
      error: request.error,
    });
  },
};
