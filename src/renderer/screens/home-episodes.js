/**
 * Home Episodes & Seasons Modal Screen Controller
 */

window.home_episodes = {
  id: "home_episodes-screen",
  previous: null,
  data: {
    seasons: null,
    episodes: null,
  },

  /**
   * Initializes seasons & episodes selection overlay.
   * @param {object} item
   */
  init: (item) => {
    const episodeContents = document.createElement("div");
    episodeContents.className = `${window.home_episodes.id} ${window.home_episodes.id}_content`;

    episodeContents.innerHTML = `
    <div class="option seasons">
      <div class="title resize">${item.title}</div>
      <div class="seasons-list">
        <div id="seasons-list-offset"></div>
      </div>
    </div>
    <div class="option episodes active">
      <div class="title"></div>
      <div class="episodes-list"></div>
    </div>`;

    const homeElement = document.getElementById(window.home.id);
    if (homeElement) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = episodeContents;
      while (tempDiv.firstChild) {
        homeElement.appendChild(tempDiv.firstChild);
      }
    }

    window.loading.start();
    window.service.seasons({
      data: {
        id: item.id,
      },
      success: (response) => {
        window.loading.end();
        window.home_episodes.data.seasons = window.mapper.seasons(response);
        let seasonsHtml = "";
        window.home_episodes.data.seasons.forEach((season, index) => {
          let audioLocaleTag = "";
          if (season.audio_locale && season.audio_locale.length > 0) {
            audioLocaleTag = `(<i class="fa-solid fa-volume-low"></i> ${season.audio_locale})`;
          }
          seasonsHtml += `
          <div class="season${index === 0 ? " selected active" : ""}">${season.title} ${audioLocaleTag}</div>`;
        });
        const offsetList = document.querySelector("#seasons-list-offset");
        if (offsetList) offsetList.innerHTML = seasonsHtml;
        if (window.home_episodes.data.seasons[0]) {
          window.home_episodes.load(window.home_episodes.data.seasons[0]);
        }
      },
      error: () => {
        window.loading.end();
      },
    });

    document.body.classList.add(window.home_episodes.id);

    // Mouse click and hover handlers for seasons
    const seasonsContainer = document.querySelector(".seasons");
    if (seasonsContainer) {
      seasonsContainer.addEventListener("mouseover", (e) => {
        const season = e.target.closest(".season");
        if (season && seasonsContainer.contains(season)) {
          const allSeasons = Array.from(seasonsContainer.querySelectorAll(".season"));
          allSeasons.forEach((s) => s.classList.remove("selected"));
          season.classList.add("selected");
        }
      });

      seasonsContainer.addEventListener("click", (e) => {
        const season = e.target.closest(".season");
        if (season && seasonsContainer.contains(season)) {
          const allSeasons = Array.from(seasonsContainer.querySelectorAll(".season"));
          const idx = allSeasons.indexOf(season);
          allSeasons.forEach((s) => s.classList.remove("active", "selected"));
          season.classList.add("active", "selected");
          if (window.home_episodes.data.seasons?.[idx]) {
            window.home_episodes.load(window.home_episodes.data.seasons[idx]);
          }
        }
      });
    }

    // Mouse click and wheel handlers for episodes
    const episodesContainer = document.querySelector(".episodes");
    if (episodesContainer) {
      episodesContainer.addEventListener("click", (e) => {
        const episode = e.target.closest(".episode");
        if (episode && episodesContainer.contains(episode)) {
          const idx =
            episode.dataset.slickIndex ||
            Array.from(episodesContainer.querySelectorAll(".episode")).indexOf(episode);
          if (idx !== undefined && window.home_episodes.data.episodes?.[idx]) {
            window.video.init(window.home_episodes.data.episodes[idx]);
          }
        }
      });

      episodesContainer.addEventListener("wheel", (e) => {
        e.preventDefault();
        const slick = episodesContainer.querySelector(".episodes-list")?.slick;
        if (slick) {
          if (e.deltaY > 0) {
            slick.next();
          } else {
            slick.prev();
          }
        }
      });
    }

    window.home_episodes.previous = window.main.state;
    window.main.state = window.home_episodes.id;
  },

  /**
   * Loads episodes for selected season.
   * @param {object} season
   */
  load: (season) => {
    const titleEl = document.querySelector(".episodes .title");
    if (titleEl) titleEl.innerText = `${season.title}`;

    const listEl = document.querySelector(".episodes .episodes-list");
    if (listEl?.slick) {
      listEl.slick.destroy();
    }
    if (listEl) {
      listEl.innerHTML = "";
    }

    window.loading.start();
    window.service.episodes({
      data: {
        id: season.id,
      },
      success: (response) => {
        window.home_episodes.data.episodes = window.mapper.episodes(response);
        let episodesHtml = "";
        window.home_episodes.data.episodes.forEach((episode) => {
          episodesHtml += `
          <div class="episode">
            <div class="episode-image">
              <img src="${episode.background}" alt="">
              ${window.home_episodes.view(episode)}
            </div>
            <div class="episode-details">
              <div class="episode-title">
                <span>E${episode.episode_number} - ${episode.title}</span>
                ${window.home_episodes.premium(episode)}
              </div>
              <div class="episode-description">${episode.description}</div>
            </div>
          </div>`;
        });
        for (let index = 0; index < 4; index++) {
          episodesHtml += `
          <div class="episode">
            <div class="episode-image">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="">
            </div>
          </div>`;
        }
        if (listEl) {
          listEl.innerHTML = episodesHtml;
          if (typeof $(listEl).slick === "function") {
            $(listEl).slick({
              vertical: true,
              dots: false,
              arrows: false,
              infinite: false,
              slidesToShow: 5,
              slidesToScroll: 1,
              speed: 0,
              waitForAnimate: false,
            });
            listEl.slick?.slickGoTo(0);
          }
        }
        window.loading.end();
      },
      error: () => {
        window.loading.end();
      },
    });
  },

  /**
   * Returns progress bar indicator for episode watch completion.
   * @param {object} episode
   * @returns {string}
   */
  view: (episode) => {
    if (!episode.playhead) return "";
    const percent = (episode.playhead * 100) / episode.duration;
    const value =
      episode.duration === episode.playhead
        ? window.translate.go("home.episodes.watched")
        : `${episode.duration - episode.playhead}m`;
    return `<div class="progress" style="width: ${percent}%" value="${value}"></div>`;
  },

  /**
   * Returns crown badge for premium episodes.
   * @param {object} episode
   * @returns {string}
   */
  premium: (episode) => {
    try {
      return !window.session?.storage?.account?.premium && episode.premium
        ? '<i class="fa-solid fa-crown premium"></i>'
        : "";
    } catch {
      return episode.premium ? '<i class="fa-solid fa-crown premium"></i>' : "";
    }
  },

  destroy: () => {
    document.body.classList.remove(window.home_episodes.id);
    const injected = document.querySelectorAll(`.${window.home_episodes.id}`);
    injected.forEach((el) => el.remove());
    window.main.state = window.home_episodes.previous;
  },

  /**
   * Key down event handler for episodes modal.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    const getContentOptions = () =>
      Array.from(
        document.querySelectorAll(
          `.${window.home_episodes.id}.${window.home_episodes.id}_content .option`
        )
      );
    const getActiveOptionIdx = () => {
      const opts = getContentOptions();
      const active = document.querySelector(
        `.${window.home_episodes.id}.${window.home_episodes.id}_content .option.active`
      );
      return active ? opts.indexOf(active) : 0;
    };
    const getSeasons = () => Array.from(document.querySelectorAll(".seasons-list .season"));
    const getSelectedSeasonIdx = () => {
      const seasons = getSeasons();
      const sel = document.querySelector(".seasons-list .season.selected");
      return sel ? seasons.indexOf(sel) : 0;
    };
    const getActiveSeasonIdx = () => {
      const seasons = getSeasons();
      const active = document.querySelector(".seasons-list .season.active");
      return active ? seasons.indexOf(active) : 0;
    };

    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.home_episodes.destroy();
        break;
      case window.tvKey?.KEY_LEFT: {
        const options = getContentOptions();
        const current = getActiveOptionIdx();
        options.forEach((opt) => opt.classList.remove("active"));
        const newCurrent = current > 0 ? current - 1 : current;
        options[newCurrent]?.classList.add("active");
        break;
      }
      case window.tvKey?.KEY_RIGHT: {
        const options = getContentOptions();
        const current = getActiveOptionIdx();
        options.forEach((opt) => opt.classList.remove("active"));
        const newCurrent = current < options.length - 1 ? current + 1 : current;
        options[newCurrent]?.classList.add("active");

        const seasonOptions = getSeasons();
        const seasonCurrent = getActiveSeasonIdx();
        seasonOptions.forEach((s) => s.classList.remove("selected"));

        let marginTop = 0;
        if (seasonOptions.length > 8 && seasonCurrent > 4) {
          if (seasonCurrent > seasonOptions.length - 4) {
            marginTop = -((seasonOptions.length - 8) * 72);
          } else {
            marginTop = -((seasonCurrent - 4) * 72);
          }
        }

        seasonOptions[seasonCurrent]?.classList.add("selected");
        const offsetEl = document.getElementById("seasons-list-offset");
        if (offsetEl) offsetEl.style.marginTop = `${marginTop}px`;
        break;
      }
      case window.tvKey?.KEY_UP: {
        const current = getActiveOptionIdx();
        if (current > 0) {
          const listEl = document.querySelector(".episodes .episodes-list");
          listEl?.slick?.prev();
        } else {
          const seasonOptions = getSeasons();
          const seasonCurrent = getSelectedSeasonIdx();

          seasonOptions.forEach((s) => s.classList.remove("selected"));
          const newCurrent = seasonCurrent > 0 ? seasonCurrent - 1 : seasonCurrent;
          seasonOptions[newCurrent]?.classList.add("selected");

          let marginTop = 0;
          if (seasonOptions.length > 8 && newCurrent > 4) {
            if (newCurrent > seasonOptions.length - 4) {
              marginTop = -((seasonOptions.length - 8) * 72);
            } else {
              marginTop = -((newCurrent - 4) * 72);
            }
          }

          const offsetEl = document.getElementById("seasons-list-offset");
          if (offsetEl) offsetEl.style.marginTop = `${marginTop}px`;
        }
        break;
      }
      case window.tvKey?.KEY_DOWN: {
        const current = getActiveOptionIdx();
        if (current > 0) {
          const listEl = document.querySelector(".episodes .episodes-list");
          listEl?.slick?.next();
        } else {
          const seasonOptions = getSeasons();
          const seasonCurrent = getSelectedSeasonIdx();

          seasonOptions.forEach((s) => s.classList.remove("selected"));
          const newCurrent =
            seasonCurrent < seasonOptions.length - 1 ? seasonCurrent + 1 : seasonCurrent;
          seasonOptions[newCurrent]?.classList.add("selected");

          let marginTop = 0;
          if (seasonOptions.length > 8 && newCurrent > 4) {
            if (newCurrent > seasonOptions.length - 4) {
              marginTop = -((seasonOptions.length - 8) * 72);
            } else {
              marginTop = -((newCurrent - 4) * 72);
            }
          }

          const offsetEl = document.getElementById("seasons-list-offset");
          if (offsetEl) offsetEl.style.marginTop = `${marginTop}px`;
        }
        break;
      }
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const current = getActiveOptionIdx();
        if (current > 0) {
          const listEl = document.querySelector(".episodes .episodes-list");
          const slideIndex = listEl?.slick?.currentSlide || 0;
          const targetEpisode = window.home_episodes.data.episodes?.[slideIndex];
          if (targetEpisode) {
            window.video.init(targetEpisode);
          }
        } else {
          const seasonOptions = getSeasons();
          const seasonCurrent = getSelectedSeasonIdx();

          seasonOptions.forEach((s) => s.classList.remove("active"));
          seasonOptions[seasonCurrent]?.classList.add("active");
          if (window.home_episodes.data.seasons?.[seasonCurrent]) {
            window.home_episodes.load(window.home_episodes.data.seasons[seasonCurrent]);
          }
        }
        break;
      }
    }
  },
};
