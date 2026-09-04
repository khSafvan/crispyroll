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

    try {
      const storedPins = JSON.parse(localStorage.getItem("crispyroll_profile_pins") || "{}");
      if (storedPins["2f6a9734-c7be-5452-a856-837b9298ebf0"] === "2222") {
        delete storedPins["2f6a9734-c7be-5452-a856-837b9298ebf0"];
        localStorage.setItem("crispyroll_profile_pins", JSON.stringify(storedPins));
      }
    } catch {}

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
   * Directly sets OAuth2 tokens (e.g. from Device Code flow).
   * @param {object} response
   */
  setTokens: (response) => {
    const data = response?.data || response || {};
    const now = new Date();
    window.session.storage.expires_in = new Date(
      now.getTime() + (data.expires_in || 0) * 1000
    ).getTime();
    if (data.account_id) window.session.storage.id = data.account_id;
    if (data.country) window.session.storage.country = data.country;
    if (data.token_type) window.session.storage.token_type = data.token_type;
    if (data.access_token) window.session.storage.access_token = data.access_token;
    if (data.refresh_token) window.session.storage.refresh_token = data.refresh_token;

    // Decode JWT payload if available to extract account_id, profile_id, or username
    try {
      if (data.access_token && typeof data.access_token === "string" && data.access_token.includes(".")) {
        const parts = data.access_token.split(".");
        if (parts[1]) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payload.account_id && !window.session.storage.id) {
            window.session.storage.id = payload.account_id;
          }
          if (payload.profile_id && !window.session.storage.profile_id) {
            window.session.storage.profile_id = payload.profile_id;
          }
          if (payload.email && !window.session.storage.account.username) {
            window.session.storage.account.username = payload.email;
          }
        }
      }
    } catch {
      // Ignore JWT decoding failure
    }

    // Ensure a default profile is set up in session storage
    if (!window.session.storage.profiles || window.session.storage.profiles.length === 0) {
      const pid = window.session.storage.profile_id || window.session.storage.id || "primary";
      const username = window.session.storage.account.username || "Profile 1";
      window.session.storage.profiles = [
        {
          profile_id: pid,
          id: pid,
          profile_name: username,
          avatar: window.session.storage.account.avatar || "0001-cr-white-orange.png",
          is_selected: true,
          has_pin: false,
          is_profile_locked: false,
        },
      ];
      window.session.storage.profile_id = pid;
    }

    return window.session.update();
  },

  /**
   * Initializes session using pre-acquired OAuth2 tokens and fetches account/profile data.
   * @param {object} tokens
   * @param {{ success?: Function, error?: Function }} [callback]
   */
  startWithToken: (tokens, callback) => {
    window.session.setTokens(tokens);
    window.session.load_account({
      success: () => callback?.success?.(window.session.storage),
      error: (err) => {
        // Fallback: even if account/profiles secondary fetching encounters an issue,
        // valid tokens have already been stored and default profile initialized.
        console.warn("[Session] load_account non-fatal error in startWithToken:", err);
        if (callback?.success) {
          callback.success(window.session.storage);
        } else if (callback?.error) {
          callback.error(err);
        }
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
        if (response && !response.code && !response.error) {
          window.session.storage.account.audio = response.preferred_content_audio_language || "";
          window.session.storage.account.language =
            response.preferred_content_subtitle_language || "en-US";
          window.session.storage.account.avatar = response.avatar || "0001-cr-white-orange.png";
          window.session.storage.account.mature = response.maturity_rating;
          if (response.username) {
            window.session.storage.account.username = response.username;
          }
          if (response.account_id) {
            window.session.storage.id = response.account_id;
          }
          if (response.profile_id) {
            window.session.storage.profile_id = response.profile_id;
          }
          window.session.update();
        }

        window.session.load_profiles(callback);
      },
      error: (err) => {
        console.warn("[Session] Failed to fetch account profile:", err);
        window.session.load_profiles(callback);
      },
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

          if (rawProfiles.length > 0) {
            window.session.storage.profiles = rawProfiles.map((p) => {
              const pid = p.profile_id || p.id || p.profileId || "";
              const storedPin = window.session.get_profile_pin(pid);
              const resolvedPin = p.pin || p.pin_code || p.profile_pin || p.passcode || p.lock_pin || storedPin || "";
              const isLocked = Boolean(
                p.has_pin ||
                p.is_profile_locked ||
                p.is_pin_required ||
                p.is_pin_protected ||
                p.profile_flags?.is_pin_protected ||
                resolvedPin ||
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
                pin: resolvedPin,
              };
            });
          } else if (!window.session.storage.profiles || window.session.storage.profiles.length === 0) {
            const pid = window.session.storage.profile_id || window.session.storage.id || "primary";
            window.session.storage.profiles = [
              {
                profile_id: pid,
                id: pid,
                profile_name: window.session.storage.account.username || "Profile 1",
                avatar: window.session.storage.account.avatar || "0001-cr-white-orange.png",
                is_selected: true,
                has_pin: false,
                is_profile_locked: false,
              },
            ];
            window.session.storage.profile_id = pid;
          }

          window.session.update();
          if (callback?.success) {
            callback.success();
          }
        },
        error: (err) => {
          console.warn("[Session] Failed to fetch multiprofiles:", err);
          if (!window.session.storage.profiles || window.session.storage.profiles.length === 0) {
            const pid = window.session.storage.profile_id || window.session.storage.id || "primary";
            window.session.storage.profiles = [
              {
                profile_id: pid,
                id: pid,
                profile_name: window.session.storage.account.username || "Profile 1",
                avatar: window.session.storage.account.avatar || "0001-cr-white-orange.png",
                is_selected: true,
                has_pin: false,
                is_profile_locked: false,
              },
            ];
            window.session.storage.profile_id = pid;
            window.session.update();
          }
          if (callback?.success) {
            callback.success();
          } else if (callback?.error) {
            callback.error(err);
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
   * Retrieves securely stored PIN for a profile.
   * @param {string} profileId
   * @returns {string}
   */
  get_profile_pin: (profileId) => {
    if (!profileId) return "";
    try {
      const stored = JSON.parse(localStorage.getItem("crispyroll_profile_pins") || "{}");
      return String(stored[profileId] || "");
    } catch {
      return "";
    }
  },

  /**
   * Stores PIN for a profile locally in persistent storage.
   * @param {string} profileId
   * @param {string} pin
   */
  set_profile_pin: (profileId, pin) => {
    if (!profileId) return;
    try {
      const stored = JSON.parse(localStorage.getItem("crispyroll_profile_pins") || "{}");
      if (pin) {
        stored[profileId] = String(pin).trim();
      } else {
        delete stored[profileId];
      }
      localStorage.setItem("crispyroll_profile_pins", JSON.stringify(stored));
    } catch {}
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
    const storedPin = window.session.get_profile_pin(profileId);
    const expectedPin = profile?.pin || storedPin || "";
    const isLocked = Boolean(
      profile?.has_pin ||
      profile?.is_profile_locked ||
      profile?.is_pin_required ||
      profile?.is_pin_protected ||
      profile?.profile_flags?.is_pin_protected ||
      expectedPin ||
      profile?.pin_status === "locked" ||
      profile?.pin_status === "enabled"
    );

    const pinStr = String(pin || "").trim();

    // 1. PIN verification if profile is locked
    if (isLocked) {
      if (!pinStr || pinStr.length !== 4 || !/^\d{4}$/.test(pinStr)) {
        callback.error?.(new Error("Incorrect PIN"));
        return;
      }

      // If we already have a known/stored PIN for this profile:
      if (expectedPin) {
        if (pinStr !== String(expectedPin)) {
          callback.error?.(new Error("Incorrect PIN"));
          return;
        }
      } else {
        // First-time entry on this device: memorize PIN
        window.session.set_profile_pin(profileId, pinStr);
        if (profile) profile.pin = pinStr;
      }
    }

    // 2. Check if we are selecting the ALREADY active profile
    const currentActiveId = window.session.storage.profile_id || window.session.storage.id;
    const isAlreadyActive =
      currentActiveId === profileId || (!currentActiveId && profile?.is_selected);

    // If profile is already active AND (it is not locked OR pin is verified):
    if (isAlreadyActive) {
      if (profile) {
        window.session.storage.profile_id = profileId;
        if (profile.preferred_content_audio_language) {
          window.session.storage.account.audio = profile.preferred_content_audio_language;
        }
        if (profile.preferred_content_subtitle_language) {
          window.session.storage.account.language = profile.preferred_content_subtitle_language;
        }
        if (profile.avatar) {
          window.session.storage.account.avatar = profile.avatar;
        }
      }
      if (window.session.storage.profiles) {
        window.session.storage.profiles.forEach((p) => {
          p.is_selected = (p.profile_id || p.id) === profileId;
        });
      }
      window.session.update();
      callback.success?.();
      return;
    }

    // 3. Otherwise, perform token exchange via Crunchyroll service.switchProfile
    return window.service.switchProfile(
      {
        success: (json) => {
          const now = new Date();
          window.session.storage.expires_in = new Date(
            now.getTime() + (json.expires_in || 0) * 1000
          ).getTime();
          window.session.storage.id = json.account_id || window.session.storage.id;
          window.session.storage.profile_id = json.profile_id || profileId;
          window.session.storage.country = json.country || window.session.storage.country;
          window.session.storage.token_type = json.token_type || "Bearer";
          window.session.storage.access_token = json.access_token;
          window.session.storage.refresh_token = json.refresh_token;
          window.session.update();

          // Ensure PIN is stored for this profile
          if (pinStr) {
            window.session.set_profile_pin(profileId, pinStr);
            if (profile) profile.pin = pinStr;
          }

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
                const sPin = window.session.get_profile_pin(pid);
                const pPin = p.pin || p.pin_code || p.profile_pin || p.passcode || p.lock_pin || sPin || "";
                const isPLocked = Boolean(
                  p.has_pin ||
                  p.is_profile_locked ||
                  p.is_pin_required ||
                  p.is_pin_protected ||
                  p.profile_flags?.is_pin_protected ||
                  pPin ||
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
                  pin: pPin,
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
          callback.error?.(err?.message === "Incorrect PIN" ? err : new Error(err?.message || "Failed to switch profile"));
        },
      },
      profileId,
      pinStr
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
   * Checks whether the current session represents an authenticated user.
   * @returns {boolean}
   */
  isLogged: () => {
    return Boolean(
      window.session.storage?.access_token &&
      window.session.storage?.refresh_token &&
      window.session.storage?.id
    );
  },

  /**
   * Clears active session and resets state.
   */
  clear: () => {
    window.session.storage = { ...DEFAULT_SESSION_STORAGE };
    window.session.update();
  },
};
