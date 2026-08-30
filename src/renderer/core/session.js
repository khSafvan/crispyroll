/**
 * Session & Authentication State Management
 */

const DEFAULT_SESSION_STORAGE = {
  version: null,
  language: "en-US",
  quality: "auto",
  account: {
    username: null,
    avatar: "0001-cr-white-orange.png",
    premium: false,
    language: "en-US",
    audio: "",
    mature: null,
  },
  profiles: [],
  cookies: {
    bucket: null,
    policy: null,
    signature: null,
    key_pair_id: null,
    expires: null,
  },
  profile_id: null,
  id: null,
  country: null,
  token_type: null,
  access_token: null,
  expires_in: null,
  refresh_token: null,
};

window.session = {
  languages: {
    audios: {},
    subtitles: {},
  },

  storage: { ...DEFAULT_SESSION_STORAGE },

  /**
   * Initializes session, loads stored data from localStorage and fetches available languages.
   */
  init: () => {
    window.service?.languages({
      data: { type: "audio" },
      success: (response) => {
        window.session.languages.audios = response || {};
        window.session.languages.audios["ja-JP"] = "Japanese";
      },
      error: () => {},
    });

    window.service?.languages({
      data: { type: "subtitle" },
      success: (response) => {
        window.session.languages.subtitles = response || {};
        window.session.languages.subtitles["Disabled"] = "Disabled";
      },
      error: () => {},
    });

    const storedSession = localStorage.getItem("session");
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        window.session.storage = {
          ...DEFAULT_SESSION_STORAGE,
          ...parsed,
          account: {
            ...DEFAULT_SESSION_STORAGE.account,
            ...(parsed.account || {}),
          },
          cookies: {
            ...DEFAULT_SESSION_STORAGE.cookies,
            ...(parsed.cookies || {}),
          },
        };
      } catch {
        // Fallback to default session on parse failure
        window.session.storage = { ...DEFAULT_SESSION_STORAGE };
      }
    }

    window.session.update();
  },

  /**
   * Authenticates user credentials with the Crunchyroll API.
   * Note: Password is used only during request execution and is not stored in localStorage.
   *
   * @param {string} username
   * @param {string} password
   * @param {{ success: Function, error: Function }} callback
   */
  start: (username, password, callback) => {
    window.service.token({
      data: {
        password,
        username,
      },
      success: (response) => {
        const now = new Date();
        window.session.storage.expires_in = new Date(
          now.getTime() + (response.expires_in || 0) * 1000
        ).getTime();
        window.session.storage.id = response.account_id;
        window.session.storage.account.username = username;
        window.session.storage.country = response.country;
        window.session.storage.token_type = response.token_type;
        window.session.storage.access_token = response.access_token;
        window.session.storage.refresh_token = response.refresh_token;

        return callback.success(window.session.update());
      },
      error: (error) => {
        window.session.clear();
        return callback.error(error);
      },
    });
  },

  /**
   * Refreshes access token if expired.
   *
   * @param {{ success: Function, error: Function }} callback
   */
  refresh: (callback) => {
    if (window.session.isExpired()) {
      window.service.refresh({
        data: {
          refresh_token: window.session.storage.refresh_token,
        },
        success: (response) => {
          const now = new Date();
          window.session.storage.expires_in = new Date(
            now.getTime() + (response.expires_in || 0) * 1000
          ).getTime();
          window.session.storage.id = response.account_id;
          window.session.storage.country = response.country;
          window.session.storage.token_type = response.token_type;
          window.session.storage.access_token = response.access_token;
          window.session.storage.refresh_token = response.refresh_token;

          callback.success(window.session.update());
        },
        error: (error) => {
          callback.error(error);
        },
      });
      return;
    }
    callback.success(window.session.storage);
  },

  /**
   * Refreshes CMS cloudfront cookies if expired.
   *
   * @param {{ success: Function, error: Function }} callback
   */
  cookies: (callback) => {
    if (window.session.isExpired(true)) {
      window.service.cookies({
        success: (response) => {
          if (response?.cms) {
            window.session.storage.cookies.bucket = response.cms.bucket;
            window.session.storage.account.premium =
              Boolean(response.cms.bucket && response.cms.bucket.includes("crunchyroll"));
            window.session.storage.cookies.policy = response.cms.policy;
            window.session.storage.cookies.signature = response.cms.signature;
            window.session.storage.cookies.key_pair_id = response.cms.key_pair_id;
            window.session.storage.cookies.expires = new Date(response.cms.expires).getTime();
          }

          callback.success(window.session.update());
        },
        error: (error) => {
          callback.error(error);
        },
      });
    } else {
      callback.success(window.session.storage);
    }
  },

  /**
   * Loads account details and linked profiles.
   *
   * @param {{ success: Function, error: Function }} callback
   */
  load_account: (callback) => {
    window.service.profile({
      success: (response) => {
        window.session.storage.account.audio = response.preferred_content_audio_language || "";
        window.session.storage.account.language =
          response.preferred_content_subtitle_language || "en-US";
        window.session.storage.account.avatar = response.avatar || "0001-cr-white-orange.png";
        window.session.storage.account.mature = response.maturity_rating;
        window.session.storage.account.username = response.username;
        window.session.update();

        window.session.load_profiles(callback);
      },
      error: callback?.error,
    });

    window.session.cookies({
      success: () => {},
      error: () => {},
    });
  },

  /**
   * Loads multi-profiles associated with the account.
   *
   * @param {{ success: Function, error: Function }} [callback]
   */
  load_profiles: (callback) => {
    try {
      window.service.profiles({
        success: (response) => {
          window.session.storage.profiles = response.profiles || [];
          window.session.update();
          if (callback?.success) {
            callback.success();
          }
        },
      });

      window.session.cookies({
        success: () => {},
        error: () => {},
      });
    } catch {
      // Ignore profile loading error
    }
  },

  /**
   * Switches active profile.
   *
   * @param {{ success: Function, error: Function }} callback
   * @param {string} profileId
   */
  switch_profile: (callback, profileId) => {
    return window.service.switchProfile(
      {
        success: (json) => {
          const now = new Date();
          window.session.storage.expires_in = new Date(
            now.getTime() + (json.expires_in || 0) * 1000
          ).getTime();
          window.session.storage.id = json.account_id;
          window.session.storage.profile_id = json.profile_id;
          window.session.storage.country = json.country;
          window.session.storage.token_type = json.token_type;
          window.session.storage.access_token = json.access_token;
          window.session.storage.refresh_token = json.refresh_token;
          window.session.update();

          // Refresh profiles to set correct is_selected status
          window.service.profiles({
            success: (response) => {
              window.session.storage.profiles = response.profiles || [];

              window.session.storage.profiles.forEach((profile) => {
                if (profile.is_selected) {
                  window.session.storage.account.audio =
                    profile.preferred_content_audio_language || "";
                  window.session.storage.account.language =
                    profile.preferred_content_subtitle_language || "en-US";
                  window.session.storage.account.avatar =
                    profile.avatar || "0001-cr-white-orange.png";
                }
              });

              window.session.update();
              return callback.success(json);
            },
            error: callback.error,
          });
        },
        error: callback.error,
      },
      profileId
    );
  },

  /**
   * Checks if session token is valid and refreshes if needed.
   *
   * @param {{ success: Function, error: Function }} callback
   */
  valid: (callback) => {
    if (window.session.storage && window.session.storage.access_token) {
      return window.session.refresh(callback);
    }
    return callback.error();
  },

  /**
   * Checks if token or cookie has expired.
   *
   * @param {boolean} [cookieType=false]
   * @returns {boolean}
   */
  isExpired: (cookieType = false) => {
    const expireDate = cookieType
      ? window.session.storage.cookies.expires
      : window.session.storage.expires_in;
    return !(expireDate && expireDate >= Date.now());
  },

  /**
   * Persists session to localStorage.
   * @returns {object}
   */
  update: () => {
    localStorage.setItem("session", JSON.stringify(window.session.storage));
    return window.session.storage;
  },

  /**
   * Returns display name for the active profile.
   * @returns {string}
   */
  get_active_profile_name: () => {
    const profiles = window.session.storage.profiles || [];

    for (let i = 0; i < profiles.length; i++) {
      const { is_selected, profile_name, username } = profiles[i];
      if (is_selected) {
        return profile_name || username || "";
      }
    }

    return window.session.storage.account.username || "";
  },

  /**
   * Clears active session and resets state.
   */
  clear: () => {
    window.session.storage = { ...DEFAULT_SESSION_STORAGE };
    window.session.update();
  },
};
