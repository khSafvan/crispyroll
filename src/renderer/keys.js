/**
 * Key Codes and Platform Media Key Registrations
 * Defines TV navigation, media, and shortcut key code mappings.
 */

window.tvKey = {
  KEY_1: 49,
  KEY_2: 50,
  KEY_3: 51,
  KEY_4: 52,
  KEY_5: 53,
  KEY_6: 54,
  KEY_7: 55,
  KEY_8: 56,
  KEY_9: 57,
  KEY_0: 48,
  KEY_MINUS: 189,
  KEY_VOLUMEUP: 447,
  KEY_VOLUMEDOWN: 448,
  KEY_MUTE: 449,
  KEY_CHANNELUP: 427,
  KEY_CHANNELDOWN: 428,
  KEY_PREVIOUS: 412,
  KEY_NEXT: 417,
  KEY_PAUSE: 19,
  KEY_RECORD: 416,
  KEY_PLAY: 415,
  KEY_PLAY_PAUSE: 10252,
  KEY_STOP: 413,
  KEY_INFO: 457,
  KEY_LEFT: 37,
  KEY_RIGHT: 39,
  KEY_UP: 38,
  KEY_DOWN: 40,
  KEY_ENTER: 13,
  KEY_BACK: 10009,
  KEY_RED: 403,
  KEY_GREEN: 404,
  KEY_YELLOW: 405,
  KEY_BLUE: 406,
  KEY_MENU: 18,
  KEY_EXIT: 0,
  KEY_ESCAPE: 27,
  KEY_PANEL_ENTER: 13,
  KEY_SPACE: 32,
  KEY_TAB: 9,
  KEY_F: 70,
  KEY_J: 74,
  KEY_K: 75,
  KEY_L: 76,
  KEY_M: 77,
  KEY_F11: 122,

  /**
   * Helper to check if a key code corresponds to the Back/Escape action.
   * Supports Tizen, web, and LG webOS keycodes.
   * @param {number} keyCode
   * @returns {number} returns the keyCode if matched, or -1
   */
  IS_KEY_BACK: (keyCode) => {
    return [10009, 27, 461].includes(keyCode) ? keyCode : -1;
  },

  /**
   * Helper to check if a key code corresponds to Enter / Space / Activation.
   * @param {number} keyCode
   * @returns {boolean}
   */
  IS_KEY_ENTER: (keyCode) => {
    return [13, 32].includes(keyCode);
  },
};

// Register Tizen TV media key inputs if available
const MEDIA_KEYS = [
  "MediaPause",
  "MediaPlay",
  "MediaPlayPause",
  "MediaFastForward",
  "MediaRewind",
  "MediaStop",
];

MEDIA_KEYS.forEach((key) => {
  if (typeof tizen !== "undefined" && tizen.tvinputdevice?.registerKey) {
    try {
      tizen.tvinputdevice.registerKey(key);
    } catch {
      // Ignore if TV input registration is not supported
    }
  }
});
