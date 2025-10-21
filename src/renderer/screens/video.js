/**
 * Video Player UI Screen Controller (OSD, Subtitles/Audio Selection, Skip Intro, Auto Next)
 */

window.video = {
  id: "video-screen",
  previous: null,
  episode: null,
  token: null,
  speed: {
    options: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    active: 1,
    state: false,
  },
  next: {
    shown: false,
    status: false,
    time: 60,
    episode: null,
  },
  option: false,
  options: [
    {
      icon: "fa-solid fa-forward-step",
      action: "nextEpisode",
      param: true,
    },
    {
      icon: "fa-solid fa-play playback-speed",
      action: "playbackSpeed",
      param: true,
    },
    {
      icon: "fa-solid fa-message",
      action: "openLanguages",
    },
    {
      icon: "toggle-aspect fa-solid fa-expand",
      action: "toggleAspectRatio",
    },
  ],
  aspects: ["expand", "compress", "crop-simple"],
  aspect: 0,
  subtitles: [],
  subtitle: null,
  audios: [],
  audio: null,
  intro: null,
  credits: null,
  streams: [],
  timers: {
    history: {
      object: null,
      duration: 30000,
    },
    next: null,
    osd: {
      object: null,
      duration: 4000,
    },
  },
  settings: {
    open: false,
    selected: false,
  },

  toggleAspectRatio: () => {
    window.video.aspect =
      window.video.aspect < window.video.aspects.length - 1 ? window.video.aspect + 1 : 0;
    const vid = document.getElementById("videoplayer");
    if (vid) {
      vid.className = window.video.aspects[window.video.aspect];
    }
    const aspectBtn = document.querySelector(".toggle-aspect");
    if (aspectBtn) {
      aspectBtn.className = `toggle-aspect fa-solid fa-${
        window.video.aspects[window.video.aspect]
      } selected`;
    }
  },

  openLanguages: () => {
    window.video.hideOSD();
    window.video.settings.open = true;
    window.player.pause();
    const osdIcon = document.getElementById("osd-icon");
    if (osdIcon) osdIcon.style.display = "none";
    const playerSettings = document.querySelector(".player-settings");
    if (playerSettings) playerSettings.style.display = "none";
    window.video.setAudios();
    window.video.setSubtitles();
    const settingsSlide = document.querySelector(".settings-slide");
    settingsSlide?.classList.add("open");
  },

  getSettings: () => {
    return window.video.options.map((element) => `<i class="${element.icon}"></i>`).join("");
  },

  /**
   * Initializes and renders video player overlay UI.
   * @param {object} item
   */
  init: (item) => {
    const videoElement = document.createElement("div");
    videoElement.id = window.video.id;

    window.video.play(item);

    videoElement.innerHTML = `
    <div class="content">
      <img id="background" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="">
      <video id="videoplayer" style="width:100%; height:100%;"></video>
      <div class="osd" id="osd">
        <div class="player-settings">
          <div id="setting-options">
            ${window.video.getSettings()}
          </div>
        </div>
        <div class="details">
          <div id="title">${item.serie || ""}</div>
          <div id="subtitle">
            ${item.season_number || 0}x${item.episode_number || 0} - ${item.episode || ""}
          </div>
        </div>
        <div class="progress">
          <div id="time">00:00:00</div>
          <div class="bar">
            <div id="played">
              <div class="preview">
                <img id="preview" alt="">
              </div>
            </div>
          </div>
          <div id="total">00:00:00</div>
        </div>
      </div>
      <div id="osd-icon" class="icon-status">
        <div class="icon"></div>
        <div id="osd-icon-data" class="percent"></div>
      </div>
      <div class="next-episode">
        <div class="next-episode-image">
          <img id="next-episode-image" alt="">
          <div id="next-episode-count"></div>
        </div>
      </div>

      <div id="skip-intro">
        <i class="fa-solid fa-forward"></i>
        ${window.translate.go("video.skip")}
      </div>

      <div class="settings-slide">
        <div id="languages-content">
          <div class="title">${window.translate.go("video.languages.audios")}</div>
          <ul id="audios"></ul>
          <div class="title">${window.translate.go("video.languages.subtitles")}</div>
          <ul id="subtitles"></ul>
        </div>
      </div>
    </div>`;

    document.body.appendChild(videoElement);
    window.video.setupMouseEvents();

    const homeEl = document.getElementById(window.home.id);
    if (homeEl) homeEl.style.display = "none";
    window.video.previous = window.main.state;
    window.main.state = window.video.id;
  },

  setupMouseEvents: () => {
    const videoScreen = document.getElementById(window.video.id);
    if (!videoScreen) return;

    // Show OSD on mouse move
    videoScreen.addEventListener("mousemove", () => {
      window.video.showOSD();
    });

    videoScreen.addEventListener("mouseleave", () => {
      window.video.hideOSD();
    });

    // Click on video surface or background to play/pause
    const handleSurfaceClick = (e) => {
      if (!e.target.closest(".osd, .settings-slide, #skip-intro, .next-episode")) {
        window.player.playPause();
      }
    };
    const vidEl = document.getElementById("videoplayer");
    const bgEl = document.getElementById("background");
    vidEl?.addEventListener("click", handleSurfaceClick);
    bgEl?.addEventListener("click", handleSurfaceClick);

    // Double click to toggle fullscreen
    const handleDblClick = () => {
      window.electronUtilsRender?.toggleFullScreen?.();
    };
    vidEl?.addEventListener("dblclick", handleDblClick);
    bgEl?.addEventListener("dblclick", handleDblClick);

    // Mouse wheel volume adjustment
    videoScreen.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const vid = window.player.getVideo();
        if (vid) {
          const delta = e.deltaY < 0 ? 0.05 : -0.05;
          vid.volume = Math.min(1, Math.max(0, vid.volume + delta));
        }
      },
      { passive: false }
    );

    // Progress bar click / drag seeking
    const progressBar = document.querySelector(".progress .bar");
    const progressPlayed = document.querySelector(".progress #played");
    const handleProgressClick = (e) => {
      e.stopPropagation();
      const bar = document.querySelector(".progress .bar");
      if (bar) {
        const rect = bar.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = clickX / rect.width;
        const totalDuration = window.player.getDuration();
        if (totalDuration > 0) {
          window.player.forwardTo(percentage * totalDuration);
        }
      }
    };
    progressBar?.addEventListener("click", handleProgressClick);
    progressPlayed?.addEventListener("click", handleProgressClick);

    // Click setting options
    const settingOpts = document.getElementById("setting-options");
    if (settingOpts) {
      settingOpts.addEventListener("click", (e) => {
        const icon = e.target.closest("i");
        if (icon && settingOpts.contains(icon)) {
          const icons = Array.from(settingOpts.querySelectorAll("i"));
          const idx = icons.indexOf(icon);
          const opt = window.video.options[idx];
          if (opt && typeof window.video[opt.action] === "function") {
            window.video[opt.action](opt.param);
          }
        }
      });
    }

    // Click Skip Intro
    const skipIntroEl = document.getElementById("skip-intro");
    skipIntroEl?.addEventListener("click", () => {
      if (window.video.intro?.end) {
        window.player.forwardTo(window.video.intro.end);
      }
    });

    // Click Next Episode
    const nextEpisodeEl = document.querySelector(".next-episode");
    nextEpisodeEl?.addEventListener("click", () => {
      window.video.playNext();
    });

    // Click languages / audios / subtitles
    const languagesContent = document.getElementById("languages-content");
    if (languagesContent) {
      languagesContent.addEventListener("click", (e) => {
        const option = e.target.closest(".option");
        if (option && languagesContent.contains(option)) {
          const parentList = option.parentElement;
          const isAudio = parentList?.id === "audios";
          const options = Array.from(parentList?.querySelectorAll(".option") || []);
          const idx = options.indexOf(option);
          options.forEach((opt) => opt.classList.remove("active"));
          option.classList.add("active");
          if (isAudio) {
            window.video.changeAudio(idx);
          } else {
            window.video.changeSubtitle(idx);
          }
        }
      });
    }
  },

  destroy: () => {
    window.video.hideOSD();
    window.player.stop();
    clearTimeout(window.video.timers.osd.object);
    clearInterval(window.video.timers.next);
    clearInterval(window.video.timers.history.object);
    window.main.state = window.video.previous;

    const el = document.getElementById(window.video.id);
    if (el) {
      document.body.removeChild(el);
    }

    const homeEl = document.getElementById(window.home.id);
    if (homeEl) homeEl.style.display = "block";
    window.video.next.episode = null;
    window.video.next.status = false;
    window.video.next.shown = false;
    window.video.episode = null;
    window.video.streams = [];
    window.video.speed.state = false;
    window.video.speed.active = 1;
  },

  /**
   * Key down event handler for video playback and OSD navigation.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    let osd = true;
    switch (event.keyCode) {
      case window.tvKey?.KEY_STOP:
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        if (window.video.settings.open) {
          osd = false;
          window.video.settings.open = false;
          const settingsSlide = document.querySelector(".settings-slide");
          settingsSlide?.classList.remove("open");
          const osdIcon = document.getElementById("osd-icon");
          if (osdIcon) osdIcon.style.display = "block";
          window.video.settings.selected = false;
          const settingOpts = document.getElementById("setting-options");
          settingOpts?.classList.remove("selected");
          const playerSettings = document.querySelector(".player-settings");
          if (playerSettings) playerSettings.style.display = "block";
          window.player.resume();
        } else {
          if (window.video.next.status) {
            window.video.stopNext();
          } else if (window.video.speed.state) {
            window.video.hidePlaySpeed();
            window.video.showOSD();
          } else {
            window.video.destroy();
          }
        }
        break;
      case window.tvKey?.KEY_PLAY:
        if (!window.video.settings.open) window.player.resume();
        break;
      case window.tvKey?.KEY_PAUSE:
        if (!window.video.settings.open) window.player.pause();
        break;
      case window.tvKey?.KEY_PLAY_PAUSE:
      case 32: // Space
      case 75: // K
        if (!window.video.settings.open) window.player.playPause();
        break;
      case 70: // F
      case 122: // F11
        window.electronUtilsRender?.toggleFullScreen?.();
        break;
      case 77: // M (Mute)
      case window.tvKey?.KEY_MUTE: {
        const vid = window.player.getVideo();
        if (vid) {
          vid.muted = !vid.muted;
        }
        break;
      }
      case 74: // J (Seek -10s)
        window.player.forwardTo(Math.max(0, window.player.getPlayed() - 10));
        break;
      case 76: // L (Seek +10s)
        window.player.forwardTo(Math.min(window.player.getDuration(), window.player.getPlayed() + 10));
        break;
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER:
        if (window.video.settings.open) {
          osd = false;
          const selected = document.querySelector("#languages-content .option.selected");
          if (selected) {
            const parentList = selected.parentElement;
            const isAudio = parentList?.id === "audios";
            const active = parentList?.querySelector(".option.active");

            if (active !== selected) {
              const options = Array.from(parentList?.querySelectorAll(".option") || []);
              options.forEach((opt) => opt.classList.remove("active"));
              selected.classList.add("active");

              const selectedIdx = options.indexOf(selected);
              if (isAudio) {
                window.video.changeAudio(selectedIdx);
              } else {
                window.video.changeSubtitle(selectedIdx);
              }
            }
          }
        }
        if (window.video.intro && window.video.intro.state) {
          osd = false;
          window.player.forwardTo(window.video.intro.end);
        } else if (window.video.next.status) {
          clearInterval(window.video.timers.next);
          window.video.playNext();
        } else {
          const osdEl = document.getElementById("osd");
          if (osdEl && osdEl.style.opacity === "1") {
            if (!window.video.option) {
              window.player.playPause();
            } else {
              const settingIcons = Array.from(document.querySelectorAll("#setting-options i"));
              const selIcon = document.querySelector("#setting-options i.selected");
              const selectedIdx = selIcon ? settingIcons.indexOf(selIcon) : 0;
              const opt = window.video.options[selectedIdx];
              if (opt && typeof window.video[opt.action] === "function") {
                osd = !window.video[opt.action](opt.param);
              }
            }
          }
        }
        break;
      case window.tvKey?.KEY_PREVIOUS:
      case window.tvKey?.KEY_LEFT:
        if (window.video.option) {
          if (window.video.speed.state) {
            osd = false;
            window.video.setSpeed(-1);
          } else {
            const options = Array.from(document.querySelectorAll("#setting-options i"));
            const selIcon = document.querySelector("#setting-options i.selected");
            const selected = selIcon ? options.indexOf(selIcon) : 0;
            options.forEach((opt) => opt.classList.remove("selected"));
            const newCurrent = selected > 0 ? selected - 1 : selected;
            options[newCurrent]?.classList.add("selected");
          }
        } else if (!window.video.settings.open) {
          window.player.rewind(window.video.setPlayingTime);
        }
        break;
      case window.tvKey?.KEY_RIGHT:
      case window.tvKey?.KEY_NEXT:
        if (window.video.option) {
          if (window.video.speed.state) {
            osd = false;
            window.video.setSpeed(1);
          } else {
            const options = Array.from(document.querySelectorAll("#setting-options i"));
            const selIcon = document.querySelector("#setting-options i.selected");
            const selected = selIcon ? options.indexOf(selIcon) : 0;
            options.forEach((opt) => opt.classList.remove("selected"));
            const newCurrent = selected < window.video.options.length - 1 ? selected + 1 : selected;
            options[newCurrent]?.classList.add("selected");
          }
        } else if (!window.video.settings.open) {
          window.player.forward(window.video.setPlayingTime);
        }
        break;
      case window.tvKey?.KEY_UP:
        if (window.video.settings.open) {
          const options = Array.from(document.querySelectorAll("#languages-content .option"));
          const selOpt = document.querySelector("#languages-content .option.selected");
          const current = selOpt ? options.indexOf(selOpt) : 0;

          options.forEach((opt) => opt.classList.remove("selected"));
          const newCurrent = current > 0 ? current - 1 : current;
          options[newCurrent]?.classList.add("selected");

          const selectedOption = options[newCurrent];
          const listSelected = selectedOption?.parentElement;
          if (listSelected) {
            let marginTop = 0;
            const max = listSelected.id === "audios" ? 4 : 3;
            const children = Array.from(listSelected.children);
            const currentInList = children.indexOf(selectedOption);
            if (children.length > max && currentInList > max - 1) {
              if (currentInList > children.length - (max - 1)) {
                marginTop = -((children.length - max) * 82);
              } else {
                marginTop = -((currentInList - (max - 1)) * 82);
              }
            }
            const firstChild = listSelected.firstElementChild;
            if (firstChild) firstChild.style.marginTop = `${marginTop}px`;
          }
        } else {
          const osdEl = document.getElementById("osd");
          if (osdEl && osdEl.style.opacity === "1" && !window.video.option) {
            const firstIcon = document.querySelector("#setting-options i");
            firstIcon?.classList.add("selected");
            window.video.option = true;
          }
        }
        break;
      case window.tvKey?.KEY_DOWN:
        if (window.video.settings.open) {
          const options = Array.from(document.querySelectorAll("#languages-content .option"));
          const selOpt = document.querySelector("#languages-content .option.selected");
          const current = selOpt ? options.indexOf(selOpt) : 0;

          options.forEach((opt) => opt.classList.remove("selected"));
          const newCurrent = current < options.length - 1 ? current + 1 : current;
          options[newCurrent]?.classList.add("selected");

          const selectedOption = options[newCurrent];
          const listSelected = selectedOption?.parentElement;
          if (listSelected) {
            let marginTop = 0;
            const max = listSelected.id === "audios" ? 4 : 3;
            const children = Array.from(listSelected.children);
            const currentInList = children.indexOf(selectedOption);
            if (children.length > max && currentInList > max - 1) {
              if (currentInList > children.length - (max - 1)) {
                marginTop = -((children.length - max) * 82);
              } else {
                marginTop = -((currentInList - (max - 1)) * 82);
              }
            }
            const firstChild = listSelected.firstElementChild;
            if (firstChild) firstChild.style.marginTop = `${marginTop}px`;
          }
        } else if (window.video.speed.state) {
          window.video.hidePlaySpeed();
          window.video.showOSD();
        } else {
          window.video.option = false;
          const settingIcons = document.querySelectorAll("#setting-options i");
          settingIcons.forEach((icon) => icon.classList.remove("selected"));
        }
        break;
    }

    if (!window.video.settings.open && !window.video.speed.state && osd) {
      window.video.showOSD();
    }
  },

  end: () => {
    if (window.video.next.status) {
      window.video.playNext();
    } else {
      window.video.destroy();
    }
  },

  /**
   * Fetches stream sources and launches playback.
   * @param {object} item
   * @param {boolean} [noplay]
   * @param {string} [forceSubtitle]
   */
  play: (item, noplay, forceSubtitle) => {
    window.video.episode = item.id;
    window.loading.start();

    window.service.getEpisode({
      data: {
        id: item.id,
      },
      success: (episodeResponse) => {
        window.video.intro = window.mapper.getIntro(episodeResponse);

        window.service.play({
          data: {
            id: item.id,
          },
          success: (response) => {
            window.loading.end();
            window.video.streams = window.mapper.streams(response);
            window.video.audios = window.mapper.audios(response);
            window.video.audio = window.mapper.audio(response);
            window.video.subtitles = window.mapper.subtitles(response);

            if (forceSubtitle) {
              window.video.subtitle = forceSubtitle;
            } else {
              window.video.subtitle = window.mapper.subtitle(response);
            }

            const stream = window.video.streams[0];
            if (stream) {
              window.player.play({
                stream: stream.url,
                playhead: item.playhead ? item.playhead * 60 : 0,
                duration: item.duration || 0,
                subtitles: window.video.subtitles,
                subtitle: window.video.subtitle,
                callbacks: {
                  timeupdate: (time) => {
                    window.video.setPlayingTime(time);
                    window.video.showSkip(time);
                  },
                  ended: () => {
                    window.video.end();
                  },
                },
              });
            }
          },
          error: () => {
            window.loading.end();
          },
        });
      },
      error: () => {
        window.loading.end();
      },
    });
  },

  setSkipIntro: (id) => {
    window.service.intro({
      data: { id },
      success: (data) => {
        if (data.intro?.end) {
          window.video.intro = {
            start: data.intro.start,
            end: data.intro.end,
            state: false,
          };
        } else {
          window.video.intro = null;
        }

        if (data.credits?.end) {
          window.video.credits = {
            start: data.credits.start,
            end: data.credits.end,
            state: false,
          };
          const countEl = document.getElementById("next-episode-count");
          if (countEl) countEl.innerText = data.credits.end - data.credits.start;
        } else {
          window.video.credits = null;
        }
      },
      error: () => {},
    });
  },

  showSkip: (time) => {
    if (!window.video.intro) return;
    const skipIntroEl = document.getElementById("skip-intro");
    if (time > window.video.intro.end) {
      window.video.intro.state = false;
      if (skipIntroEl) skipIntroEl.style.display = "none";
    } else if (
      !window.video.intro.state &&
      time > window.video.intro.start &&
      time < window.video.intro.end
    ) {
      window.video.intro.state = true;
      if (skipIntroEl) skipIntroEl.style.display = "block";
    }
  },

  setAudios: () => {
    const audiosEl = document.getElementById("audios");
    if (audiosEl) {
      let audiosHtml = "";
      window.video.audios.forEach((element) => {
        const displayName = window.session?.languages?.audios?.[element.name] || element.name;
        audiosHtml += `<li class="option${
          element.name === window.video.audio ? " active selected" : ""
        }">${displayName}</li>`;
      });
      audiosEl.innerHTML = audiosHtml;
    }
  },

  changeAudio: (index) => {
    if (window.video.audios[index]) {
      window.video.play(
        {
          id: window.video.audios[index].id,
          playhead: window.player.getPlayed() / 60,
          duration: window.player.getDuration(),
        },
        true
      );
      window.video.setSubtitles();
    }
  },

  setSubtitles: () => {
    const subtitlesEl = document.getElementById("subtitles");
    if (subtitlesEl) {
      let subtitlesHtml = "";
      window.video.subtitles.forEach((element) => {
        const displayName = window.session?.languages?.subtitles?.[element.name] || element.name;
        subtitlesHtml += `<li class="option${
          element.name === window.video.subtitle ? " active" : ""
        }">${displayName}</li>`;
      });
      subtitlesEl.innerHTML = subtitlesHtml;
    }
  },

  changeSubtitle: (index) => {
    if (window.video.subtitles[index]) {
      window.video.play(
        {
          id: window.video.episode,
          playhead: window.player.getPlayed() / 60,
          duration: window.player.getDuration(),
        },
        true,
        window.video.subtitles[index].name
      );
    }
  },

  stopNext: () => {
    clearInterval(window.video.timers.next);
    window.video.next.status = false;
    window.video.next.episode = null;
    const nextEpEl = document.querySelector(".next-episode");
    if (nextEpEl) nextEpEl.style.display = "none";
  },

  playNext: () => {
    window.video.saveHistory(Math.floor(window.player.getDuration()));
    if (window.video.next.episode) {
      window.video.play(window.video.next.episode);
      const titleEl = document.querySelector(".osd #title");
      const subtitleEl = document.querySelector(".osd #subtitle");
      if (titleEl) titleEl.textContent = window.video.next.episode.serie || "";
      if (subtitleEl) {
        subtitleEl.textContent = `${window.video.next.episode.season_number}x${window.video.next.episode.episode_number} - ${window.video.next.episode.episode}`;
      }
    }
  },

  nextEpisode: (instant) => {
    window.video.next.shown = true;
    try {
      window.service.continue({
        data: {
          ids: window.video.episode,
        },
        success: (data) => {
          window.video.next.episode = window.mapper.continue(data);

          if (instant) {
            window.video.playNext();
          } else {
            const nextImg = document.getElementById("next-episode-image");
            if (nextImg && window.video.next.episode.background) {
              nextImg.setAttribute("src", window.video.next.episode.background);
            }
            const nextEpEl = document.querySelector(".next-episode");
            if (nextEpEl) nextEpEl.style.display = "block";
            window.video.next.status = true;
            window.video.timers.next = setInterval(() => {
              const countEl = document.getElementById("next-episode-count");
              const value = countEl ? countEl.innerText : "0";
              if (+value <= 1) {
                clearInterval(window.video.timers.next);
              } else if (countEl) {
                countEl.innerText = String(+value - 1);
              }
            }, 1000);
          }
        },
        error: () => {},
      });
    } catch {
      // Continue next episode error
    }
  },

  playbackSpeed: () => {
    if (!window.video.speed.state) {
      const speedsOptions = `
        <ul id="speed-menu">
          <span></span>
          ${window.video.speed.options.map((e) => `<li>${e}</li>`).join("")}
        </ul>
      `;

      window.video.speed.state = true;
      window.video.showOSD(true);
      const settingOpts = document.getElementById("setting-options");
      if (settingOpts) settingOpts.style.display = "none";
      const playerSettings = document.querySelector(".player-settings");
      if (playerSettings) {
        const temp = document.createElement("div");
        temp.innerHTML = speedsOptions.trim();
        if (temp.firstElementChild) playerSettings.appendChild(temp.firstElementChild);
      }

      window.video.setSpeed(0);
      return true;
    }
    window.video.hidePlaySpeed();
    window.video.showOSD();
    return false;
  },

  hidePlaySpeed: () => {
    const speedMenu = document.getElementById("speed-menu");
    speedMenu?.remove();
    const settingOpts = document.getElementById("setting-options");
    if (settingOpts) settingOpts.style.display = "block";
    window.video.speed.state = false;
  },

  setSpeed: (increment) => {
    const index = window.video.speed.options.indexOf(window.video.speed.active);
    const newIndex = index + increment;
    if (newIndex >= 0 && newIndex < window.video.speed.options.length) {
      let width = 50;
      let classDirection = "";

      const speedMenu = document.getElementById("speed-menu");
      if (newIndex === 3) {
        speedMenu?.classList.remove("to-rigth", "to-right", "to-left");
      } else if (newIndex > 3) {
        const count = newIndex - 3;
        width = 50 + count * 75;
        classDirection = "to-right";
      } else {
        const count = 3 - newIndex;
        width = 50 + count * 75;
        classDirection = "to-left";
      }

      if (classDirection && speedMenu) {
        speedMenu.classList.add(classDirection);
      }
      const spanEl = speedMenu?.querySelector("span");
      if (spanEl) spanEl.style.width = `${width}px`;

      window.video.speed.active = window.video.speed.options[newIndex];
      window.player.speed(window.video.speed.options[newIndex]);
    }
  },

  showOSD: (noHide) => {
    clearTimeout(window.video.timers.osd.object);
    const osd = document.getElementById("osd");
    if (osd) osd.style.opacity = "1";
    if (!noHide) {
      window.video.timers.osd.object = setTimeout(() => {
        window.video.hideOSD();
      }, window.video.timers.osd.duration);
    }
  },

  hideOSD: () => {
    window.video.option = false;
    const settingIcons = document.querySelectorAll("#setting-options i");
    settingIcons.forEach((icon) => icon.classList.remove("selected"));
    window.video.timers.osd.object = null;
    const osd = document.getElementById("osd");
    if (osd) osd.style.opacity = "0";
  },

  showBTN: (state) => {
    const button = document.getElementById("osd-icon");
    if (button) {
      button.style.opacity = "1";
      button.className = `icon-status ${state}`;
    }
  },

  hideBTN: () => {
    const button = document.getElementById("osd-icon");
    if (button) {
      button.style.opacity = "0";
    }
  },

  startHistory: () => {
    clearInterval(window.video.timers.history.object);
    window.video.timers.history.object = setInterval(() => {
      window.video.saveHistory();
    }, window.video.timers.history.duration);
  },

  saveHistory: (time) => {
    window.service.setHistory({
      data: {
        content_id: window.video.episode,
        playhead: time || Math.floor(window.player.getPlayed()),
      },
      success: () => {},
      error: () => {},
    });
  },

  setPlayingTime: () => {
    let time = window.player.getPlayed() + (window.player.values.forward_rewind || 0);
    time = time < 0 ? 0 : time;
    const totalTime = window.player.getDuration() || 0;
    const timePercent = totalTime > 0 ? (100 * time) / totalTime : 0;

    if (window.video.intro) {
      window.video.showSkip(time);
    }

    if (
      !window.video.next.shown &&
      window.video.credits?.start &&
      window.player.state === window.player.states.PLAYING &&
      time >= window.video.credits.start
    ) {
      window.video.nextEpisode();
    }

    const formatPad = (num) => String(Math.floor(num)).padStart(2, "0");

    const totalSeconds = formatPad(totalTime % 60);
    const totalMinutes = formatPad((totalTime % 3600) / 60);
    const totalHours = formatPad(totalTime / 3600);

    const timeSeconds = formatPad(time % 60);
    const timeMinutes = formatPad((time % 3600) / 60);
    const timeHours = formatPad(time / 3600);

    const timeEl = document.getElementById("time");
    if (timeEl) timeEl.innerText = `${timeHours}:${timeMinutes}:${timeSeconds}`;

    const totalEl = document.getElementById("total");
    if (totalEl) totalEl.innerText = `${totalHours}:${totalMinutes}:${totalSeconds}`;

    const playedEl = document.getElementById("played");
    if (playedEl) playedEl.style.width = `${timePercent}%`;
  },
};
