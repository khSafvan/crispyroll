/**
 * Crunchyroll API Service Layer
 */

window.service = {
  api: {
    url: "https://beta-api.crunchyroll.com",
    static: "https://static.crunchyroll.com",
    drm: "https://cr-play-service.prd.crunchyrollsvc.com",
    auth: "Basic ZXZ4YzVybGN1bnd4cm91YWpmeHI6NkJGWGM1SUk3UWx2Z3NFbzdiVjBuWUNfN1VRLXVlSVM=",
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
   */
  deviceCode: (request) => {
    const headers = new Headers();
    headers.append("Authorization", window.service.api.auth);
    headers.append("Content-Type", "application/x-www-form-urlencoded");

    const params = window.service.format({
      scope: "offline_access",
    });

    fetch(`${window.service.api.url}/auth/v1/device/code`, {
      method: "POST",
      headers,
      body: params,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
          throw new Error(json.error_description || json.message || "Failed to obtain device code");
        }
        return json;
      })
      .then((json) => request.success?.(json))
      .catch((err) => request.error?.(err));
  },

  /**
   * Polls OAuth2 device token endpoint for user authorization.
   * @param {{ data: { device_code: string }, success?: Function, pending?: Function, error?: Function }} request
   */
  deviceToken: (request) => {
    const headers = new Headers();
    headers.append("Authorization", window.service.api.auth);
    headers.append("Content-Type", "application/json");

    fetch(`${window.service.api.url}/auth/v1/device/token`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        device_code: request.data?.device_code,
      }),
    })
      .then(async (res) => {
        if (res.status === 204) {
          request.pending?.();
          return null;
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
          const errCode = json.error || json.code || "";
          if (
            errCode === "authorization_pending" ||
            errCode === "pending" ||
            (typeof errCode === "string" && errCode.includes("pending"))
          ) {
            request.pending?.();
            return null;
          }
          const err = new Error(
            json.error_description || json.message || errCode || "Device authorization pending or failed"
          );
          err.code = errCode;
          err.status = res.status;
          throw err;
        }
        return json;
      })
      .then((json) => {
        if (json) {
          const tokenData = json.access_token ? json : json.data || json;
          request.success?.(tokenData);
        }
      })
      .catch((err) => request.error?.(err));
  },

  /**
   * Refreshes OAuth2 access token using refresh_token.
   * @param {{ data?: { refresh_token: string }, success?: Function, error?: Function }} request
   */
  refresh: (request) => {
    const headers = new Headers();
    headers.append("Authorization", window.service.api.auth);
    headers.append("Content-Type", "application/x-www-form-urlencoded");

    const params = window.service.format({
      refresh_token: request.data?.refresh_token || window.session?.storage?.refresh_token,
      grant_type: "refresh_token",
      scope: "offline_access",
      device_id: window.session?.storage?.device_id || "crispyroll-linux",
      device_type: "Linux",
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
          .then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json.error || (json.code && json.code.includes("forbidden"))) {
              throw new Error(json.error_description || json.message || json.code || `HTTP ${res.status}`);
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
          .then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json.error || (json.code && json.code.includes("forbidden"))) {
              throw new Error(json.error_description || json.message || json.code || `HTTP ${res.status}`);
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

        const profiles = window.session?.storage?.profiles || [];
        const targetProfile = profiles.find((p) => (p.profile_id || p.id) === profileId);
        const isPrimary = Boolean(
          targetProfile?.is_primary ||
          !profileId ||
          profileId === storage.id ||
          profileId === window.session?.storage?.id
        );

        const data = {
          refresh_token: storage.refresh_token,
          grant_type: isPrimary ? "refresh_token" : "refresh_token_profile_id",
          scope: "offline_access",
          device_id: window.session?.storage?.device_id || "crispyroll-linux",
          device_type: "Linux",
        };
        if (!isPrimary) {
          data.profile_id = profileId;
        }
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
              const errCode = json.code || json.error || "";
              const isPinError =
                res.status === 401 ||
                errCode === "auth.obtain_access_token.invalid_credentials" ||
                errCode === "invalid_grant";
              const errMsg = isPinError
                ? "Incorrect PIN"
                : (json.error_description ||
                   json.message ||
                   json.error ||
                   `Profile switch failed (${res.status})`);
              const err = new Error(errMsg);
              err.status = res.status;
              err.code = errCode;
              throw err;
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
   * Verifies profile 4-digit PIN deterministically.
   * @param {{ data: { profile_id: string, pin: string }, success?: Function, error?: Function }} request
   */
  verifyProfilePin: (request) => {
    const pinStr = String(request.data?.pin || "").trim();
    const profileId = request.data?.profile_id;
    const storedPin = window.session?.get_profile_pin?.(profileId);
    const localProfile = (window.session?.storage?.profiles || []).find(
      (p) => (p.profile_id || p.id) === profileId
    );
    const expectedPin = localProfile?.pin || storedPin;

    if (!pinStr || pinStr.length !== 4 || !/^\d{4}$/.test(pinStr)) {
      request.error?.(new Error("Incorrect PIN"));
      return;
    }

    if (expectedPin) {
      if (expectedPin === pinStr) {
        request.success?.({ valid: true });
      } else {
        request.error?.(new Error("Incorrect PIN"));
      }
      return;
    }

    // Verify via switchProfile against Crunchyroll
    window.service.switchProfile(
      {
        success: (res) => {
          window.session?.set_profile_pin?.(profileId, pinStr);
          if (localProfile) localProfile.pin = pinStr;
          request.success?.(res || { valid: true });
        },
        error: (err) => {
          request.error?.(err?.message === "Incorrect PIN" ? err : new Error("Incorrect PIN"));
        },
      },
      profileId,
      pinStr
    );
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

        const hasAccountId =
          storage.id &&
          storage.id !== "null" &&
          storage.id !== "undefined" &&
          String(storage.id).trim() !== "";
        const feedPath = hasAccountId
          ? `/content/v2/discover/${storage.id}/home_feed`
          : "/content/v2/discover/home_feed";
        const audio = storage.account?.audio || "ja-JP";
        const lang = storage.language || "en-US";
        const url = `${window.service.api.url}${feedPath}?start=0&n=100&preferred_audio_language=${audio}&locale=${lang}`;
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

        fetch(`${window.service.api.drm}/v1/${request.data.id}/tv/android/play`, { headers })
          .then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json.error) {
              const errMsg =
                json.message ||
                json.reason ||
                (json.error === 40016
                  ? "Premium account required for playback"
                  : `Playback stream error (${res.status})`);
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
