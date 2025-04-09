/**
 * Video Player Controller (Dash.js / DRM Playback)
 */

window.player = {
  drmLock: false,
  states: {
    STOPPED: 0,
    PLAYING: 1,
    PAUSED: 2,
    FORWARD: 3,
    REWIND: 4,
  },
  values: {
    forward_rewind: 0,
  },
  timers: {
    forward_rewind: null,
  },
  state: -1,
  plugin: null,
  video: null,
  duration: 0,
  levelId: -1,
  playhead: null,

  /**
   * Retrieves or creates the video element.
   * @returns {HTMLVideoElement}
   */
  getVideo: () => {
    window.player.video = document.getElementById("videoplayer");
    if (!window.player.video) {
      const newVideo = document.createElement("video");
      newVideo.id = "videoplayer";
      newVideo.style.height = "100%";
      newVideo.style.width = "100%";

      $("#video-screen .content").prepend(newVideo);
      window.player.video = newVideo;
    }
    return window.player.video;
  },

  /**
   * Removes current video element from DOM.
   */
  deleteVideo: () => {
    const video = document.getElementById("videoplayer");
    if (video?.parentNode) {
      video.parentNode.removeChild(video);
    }
  },

  /**
   * Configures time update and completion listeners for the video player.
   * @param {Function} timeFunction
   * @param {Function} endFunction
   */
  config: (timeFunction, endFunction) => {
    window.player.deleteVideo();
    const vid = window.player.getVideo();
    vid.addEventListener("timeupdate", timeFunction);
    vid.addEventListener("ended", endFunction);
    vid.addEventListener("waiting", window.player.onbufferingstart);
    vid.addEventListener("playing", window.player.onbufferingcomplete);
  },

  getPlayed: () => window.player.getVideo().currentTime,
  getDuration: () => window.player.getVideo().duration,

  /**
   * Releases DRM playback session token.
   * @param {{ data: { id: string, token: string }, success?: Function, error?: Function }} callback
   */
  deleteSession: (callback) => {
    window.session.refresh({
      success: (storage) => {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        fetch(`${window.service.api.drm}/v1/token/${callback.data.id}/${callback.data.token}`, {
          method: "DELETE",
          headers,
        })
          .then(() => {
            window.player.drmLock = false;
            callback.success?.();
          })
          .catch((error) => callback.error?.(error));
      },
    });
  },

  /**
   * Initializes Dash.js player instance with Widevine DRM and stream URL.
   * @param {{ id: string, token: string }} drm
   * @param {string} url
   * @param {number} [playhead]
   * @param {boolean} [noplay]
   */
  play: (drm, url, playhead, noplay) => {
    window.player.config(window.video.setPlayingTime, window.video.end);

    window.session.refresh({
      success: (storage) => {
        window.player.plugin = window.dashjs.MediaPlayer().create();
        window.player.plugin.extend(
          "RequestModifier",
          () => ({
            modifyRequestHeader: (xhr) => {
              xhr.setRequestHeader("Authorization", `Bearer ${storage.access_token}`);
              return xhr;
            },
          }),
          true
        );

        if (window.session.storage.quality !== "auto") {
          window.player.plugin.updateSettings({
            streaming: {
              abr: { autoSwitchBitrate: { video: false } },
            },
          });
        }

        window.player.plugin.initialize(window.player.getVideo(), url, true);

        const drmConfig = {
          "com.widevine.alpha": {
            priority: 1,
            serverURL: "https://cr-license-proxy.prd.crunchyrollsvc.com/v1/license/widevine",
            httpRequestHeaders: {
              "X-Cr-Content-Id": drm.id,
              "X-Cr-Video-Token": drm.token,
            },
            serverCertificate:
              "CrsCCAMSEKDc0WAwLAQT1SB2ogyBJEwYv4Tx7gUijgIwggEKAoIBAQC8Xc/GTRwZDtlnBThq8V382D1oJAM0F/YgCQtNDLz7vTWJ+QskNGi5Dd2qzO4s48Cnx5BLvL4H0xCRSw2Ed6ekHSdrRUwyoYOE+M/t1oIbccwlTQ7o+BpV1X6TB7fxFyx1jsBtRsBWphU65w121zqmSiwzZzJ4xsXVQCJpQnNI61gzHO42XZOMuxytMm0F6puNHTTqhyY3Z290YqvSDdOB+UY5QJuXJgjhvOUD9+oaLlvT+vwmV2/NJWxKqHBKdL9JqvOnNiQUF0hDI7Wf8Wb63RYSXKE27Ky31hKgx1wuq7TTWkA+kHnJTUrTEfQxfPR4dJTquE+IDLAi5yeVVxzbAgMBAAE6DGNhc3RsYWJzLmNvbUABEoADMmGXpXg/0qxUuwokpsqVIHZrJfu62ar+BF8UVUKdK5oYQoiTZd9OzK3kr29kqGGk3lSgM0/p499p/FUL8oHHzgsJ7Hajdsyzn0Vs3+VysAgaJAkXZ+k+N6Ka0WBiZlCtcunVJDiHQbz1sF9GvcePUUi2fM/h7hyskG5ZLAyJMzTvgnV3D8/I5Y6mCFBPb/+/Ri+9bEvquPF3Ff9ip3yEHu9mcQeEYCeGe9zR/27eI5MATX39gYtCnn7dDXVxo4/rCYK0A4VemC3HRai2X3pSGcsKY7+6we7h4IycjqtuGtYg8AbaigovcoURAZcr1d/G0rpREjLdVLG0Gjqk63Gx688W5gh3TKemsK3R1jV0dOfj3e6uV/kTpsNRL9KsD0v7ysBQVdUXEbJotcFz71tI5qc3jwr6GjYIPA3VzusD17PN6AGQniMwxJV12z/EgnUopcFB13osydpD2AaDsgWo5RWJcNf+fzCgtUQx/0Au9+xVm5LQBdv8Ja4f2oiHN3dw",
            audioRobustness: "SW_SECURE_CRYPTO",
            videoRobustness: "SW_SECURE_CRYPTO",
            sessionType: "temporary",
          },
        };

        window.player.plugin.setProtectionData(drmConfig);

        window.player.plugin.registerLicenseRequestFilter((req) => {
          req.headers["Content-Type"] = "application/octet-stream";
          req.headers["Authorization"] = `Bearer ${storage.access_token}`;
        });

        window.player.plugin.registerLicenseResponseFilter((response) => {
          const responseDataUint8Array = new Uint8Array(response.data);
          const decodedString = new TextDecoder("utf-8").decode(responseDataUint8Array);
          const licenseObject = JSON.parse(decodedString);
          const binaryLicenseString = atob(licenseObject.license);
          const binaryLicenseUint8Array = new Uint8Array(binaryLicenseString.length);
          for (let i = 0; i < binaryLicenseString.length; i++) {
            binaryLicenseUint8Array[i] = binaryLicenseString.charCodeAt(i);
          }
          response.data = binaryLicenseUint8Array.buffer;
          window.player.drmLock = true;
        });

        window.player.noplay = noplay;

        if (playhead && playhead > 0) {
          window.player.playhead = playhead * 60;
        }
      },
    });
  },

  pause: () => {
    window.player.getVideo().pause();
    window.player.state = window.player.states.PAUSED;
    window.video.showBTN("pause");
  },

  resume: () => {
    window.player.getVideo().play();
    window.video.hideBTN();
    window.player.state = window.player.states.PLAYING;
  },

  playPause: () => {
    if (window.player.getVideo().paused) {
      window.player.resume();
    } else {
      window.player.pause();
    }
  },

  rewind: (callback) => {
    window.player.pause();
    clearTimeout(window.player.timers.forward_rewind);
    window.video.showBTN("rewind");
    window.player.values.forward_rewind -= window.player.getDuration() * 0.01;
    callback(window.player.values.forward_rewind);
    window.player.timers.forward_rewind = setTimeout(() => {
      const current = window.player.getPlayed();
      const target = window.player.values.forward_rewind + current;
      window.player.getVideo().currentTime = target < 0 ? 0 : target;
      window.player.values.forward_rewind = 0;
      window.player.resume();
    }, 500);
  },

  forward: (callback) => {
    window.player.state = window.player.states.FORWARD;
    window.player.pause();
    clearTimeout(window.player.timers.forward_rewind);
    window.video.showBTN("forward");
    window.player.values.forward_rewind += window.player.getDuration() * 0.01;
    callback(window.player.values.forward_rewind);
    window.player.timers.forward_rewind = setTimeout(() => {
      const duration = window.player.getDuration();
      const current = window.player.getPlayed();
      const target = window.player.values.forward_rewind + current;
      window.player.getVideo().currentTime = target > duration - duration * 0.02 ? current : target;
      window.player.values.forward_rewind = 0;
      window.player.resume();
    }, 500);
  },

  forwardTo: (seconds) => {
    window.player.getVideo().currentTime = seconds;
  },

  getQuality: () => {
    const qualities = window.player.plugin.getBitrateInfoListFor("video");
    const id = Object.keys(qualities).find(
      (key) => qualities[key].height === +window.session.storage.quality
    );
    return id !== undefined ? id : -1;
  },

  stop: () => {
    if (window.player.state !== window.player.states.STOPPED) {
      window.player.getVideo().pause();
      window.player.plugin = null;
      window.player.video = null;
      window.player.STOP_CALLBACK?.();
      window.player.state = window.player.states.STOPPED;
    }
  },

  speed: (rate) => {
    window.player.getVideo().playbackRate = rate;
  },

  destroy: () => {
    window.player.stop();
  },

  onbufferingstart: () => {
    window.video.showBTN("loading");
  },

  onbufferingcomplete: () => {
    if (window.session.storage.quality !== "auto") {
      window.player.plugin.setQualityFor("video", window.player.getQuality());
    }

    if (window.player.playhead) {
      window.player.getVideo().currentTime = window.player.playhead;
      window.player.playhead = null;
    }

    if (window.player.noplay) {
      window.player.noplay = null;
      window.player.pause();
    } else {
      window.player.getVideo().play();
      window.player.state = window.player.states.PLAYING;
    }

    window.video.hideBTN();
  },

  oncurrentplaytime: (currentTime) => {
    window.video.setPlayingTime(currentTime);
  },
};
