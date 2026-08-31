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
   * Authenticates user credentials with the Crunchyroll API or initializes existing session tokens.
   * Note: Password is used only during request execution and is not stored in localStorage.
   *
   * @param {string|object} usernameOrOpts
   * @param {string} [password]
   * @param {{ success: Function, error: Function }} [callback]
   */
  start: (usernameOrOpts, password, callback) => {
    let u = usernameOrOpts;
    let p = password;
    let cb = callback;

    if (typeof usernameOrOpts === "object" && usernameOrOpts !== null && !callback) {
      u = usernameOrOpts.username;
      p = usernameOrOpts.password;
      cb = {
        success: usernameOrOpts.success || (() => {}),
        error: usernameOrOpts.error || (() => {}),
      };
    }

    // If already has access token (e.g. from OAuth Device Code Grant), fetch full account & profiles
    if (!u && !p && window.session.storage.access_token) {
      window.session.update();
      window.session.load_account({
        success: () => {
          cb?.success?.(window.session.storage);
        },
        error: (err) => {
          cb?.error?.(err);
        },
      });
      return;
    }

    window.service.token({
      data: {
        password: p,
        username: u,
      },
      success: (response) => {
        if (!response?.access_token) {
          window.session.clear();
          return cb?.error?.(new Error("Authentication failed"));
        }

        const now = new Date();
        window.session.storage.expires_in = new Date(
          now.getTime() + (response.expires_in || 0) * 1000
        ).getTime();
        window.session.storage.id = response.account_id;
        window.session.storage.account.username = u;
        window.session.storage.country = response.country;
        window.session.storage.token_type = response.token_type;
        window.session.storage.access_token = response.access_token;
        window.session.storage.refresh_token = response.refresh_token;
        window.session.update();

        // Load account details and normalized multi-profiles before completing login
        window.session.load_account({
          success: () => {
            return cb?.success?.(window.session.storage);
          },
          error: (err) => {
            return cb?.error?.(err);
          },
        });
      },
      error: (error) => {
        window.session.clear();
        return cb?.error?.(error);
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
            window.session.storage.account.premium = Boolean(
              response.cms.bucket && response.cms.bucket.includes("crunchyroll")
            );
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
          const rawProfiles =
            response?.profiles ||
            response?.items ||
            response?.data ||
            (Array.isArray(response) ? response : []);

          window.session.storage.profiles = rawProfiles.map((p) => {
            const pid = p.profile_id || p.id || p.profileId || "";
            const isLocked = Boolean(
              p.has_pin ||
              p.is_profile_locked ||
              p.is_pin_required ||
              p.is_pin_protected ||
              p.pin ||
              p.pin_status === "locked" ||
              p.pin_status === "enabled" ||
              p.is_locked ||
              p.profile_lock
            );
            return {
              ...p,
              profile_id: pid,
              id: pid,
              profile_name: p.profile_name || p.username || p.name || "",
              has_pin: isLocked,
              is_profile_locked: isLocked,
              pin: p.pin || p.pin_code || p.profile_pin || p.passcode || p.lock_pin || "",
            };
          });
          window.session.update();
          if (callback?.success) {
            callback.success();
          }
        },
        error: (err) => {
          callback?.error?.(err);
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
   * @param {string} [pin]
   */
  switch_profile: (callback, profileId, pin) => {
    const profiles = window.session?.storage?.profiles || [];
    const profile = profiles.find((p) => (p.profile_id || p.id) === profileId);
    const isLocked = Boolean(
      profile?.has_pin ||
      profile?.is_profile_locked ||
      profile?.is_pin_required ||
      profile?.is_pin_protected ||
      profile?.pin ||
      profile?.pin_status === "locked" ||
      profile?.pin_status === "enabled"
    );

    const performTokenSwitch = () => {
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
                const rawProfiles =
                  response?.profiles ||
                  response?.items ||
                  response?.data ||
                  (Array.isArray(response) ? response : []);

                window.session.storage.profiles = rawProfiles.map((p) => {
                  const pid = p.profile_id || p.id || p.profileId || "";
                  const isPLocked = Boolean(
                    p.has_pin ||
                    p.is_profile_locked ||
                    p.is_pin_required ||
                    p.is_pin_protected ||
                    p.pin ||
                    p.pin_status === "locked" ||
                    p.pin_status === "enabled" ||
                    p.is_locked ||
                    p.profile_lock
                  );
                  return {
                    ...p,
                    profile_id: pid,
                    id: pid,
                    profile_name: p.profile_name || p.username || p.name || "",
                    has_pin: isPLocked,
                    is_profile_locked: isPLocked,
                  };
                });

                window.session.storage.profiles.forEach((p) => {
                  if (p.is_selected || p.profile_id === profileId) {
                    window.session.storage.account.audio =
                      p.preferred_content_audio_language || "";
                    window.session.storage.account.language =
                      p.preferred_content_subtitle_language || "en-US";
                    window.session.storage.account.avatar =
                      p.avatar || "0001-cr-white-orange.png";
                  }
                });

                window.session.update();
                return callback.success(json);
              },
              error: () => callback.success(json),
            });
          },
          error: (err) => {
            callback.error?.(err);
          },
        },
        profileId,
        pin
      );
    };

    // If profile is PIN-locked, strictly verify the PIN first!
    if (isLocked) {
      if (!pin || String(pin).trim().length === 0) {
        callback.error?.(new Error("Incorrect PIN"));
        return;
      }

      // If profile object has locally stored PIN, verify it directly
      if (profile.pin && String(profile.pin) !== String(pin)) {
        callback.error?.(new Error("Incorrect PIN"));
        return;
      }

      // Verify PIN against Crunchyroll multiprofile verification endpoint
      if (typeof window.service?.verifyProfilePin === "function") {
        window.service.verifyProfilePin({
          data: { profile_id: profileId, pin: String(pin) },
          success: (verifyRes) => {
            if (verifyRes && (verifyRes.valid === false || verifyRes.error || verifyRes.success === false)) {
              callback.error?.(new Error("Incorrect PIN"));
              return;
            }
            performTokenSwitch();
          },
          error: (err) => {
            callback.error?.(err || new Error("Incorrect PIN"));
          },
        });
        return;
      }
    }

    // Unlocked profile: proceed with token switch directly
    performTokenSwitch();
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
