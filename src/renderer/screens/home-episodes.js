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

    $(`#${window.home.id}`).append(episodeContents);

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
        $(".seasons #seasons-list-offset").eq(0).html(seasonsHtml);
        if (window.home_episodes.data.seasons[0]) {
          window.home_episodes.load(window.home_episodes.data.seasons[0]);
        }
      },
      error: () => {
        window.loading.end();
      },
    });

    $("body").addClass(window.home_episodes.id);

    window.home_episodes.previous = window.main.state;
    window.main.state = window.home_episodes.id;
  },

  /**
   * Loads episodes for selected season.
   * @param {object} season
   */
  load: (season) => {
    const titleEl = $(".episodes .title")[0];
    if (titleEl) titleEl.innerText = `${season.title}`;

    const listEl = $(".episodes .episodes-list")[0];
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
        window.mapper.episodes(response, (result) => {
          window.home_episodes.data.episodes = result;

          let episodesHtml = "";
          window.home_episodes.data.episodes.forEach((episode) => {
            episodesHtml += `
            <div class="episode">
              <div class="episode-image">
                <img src="${episode.background}" alt="">
                ${window.home_episodes.view(episode)}
                ${window.home_episodes.premium(episode)}
              </div>
              <div class="episode-details">
                <div class="episode-title">${episode.episode_number}. ${episode.title}</div>
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
          $(".episodes .episodes-list").eq(0).html(episodesHtml);

          $(".episodes .episodes-list").slick({
            vertical: true,
            dots: false,
            arrows: false,
            infinite: false,
            slidesToShow: 5,
            slidesToScroll: 1,
            speed: 0,
            waitForAnimate: false,
          });

          $(".episodes .episodes-list")[0]?.slick?.slickGoTo(0);
          window.loading.end();
        });
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
    $("body").removeClass(window.home_episodes.id);
    $(`.${window.home_episodes.id}`).remove();
    window.main.state = window.home_episodes.previous;
  },

  /**
   * Key down event handler for episodes modal.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.home_episodes.destroy();
        break;
      case window.tvKey?.KEY_LEFT: {
        const options = $(`.${window.home_episodes.id}.${window.home_episodes.id}_content .option`);
        const current = options.index(
          $(`.${window.home_episodes.id}.${window.home_episodes.id}_content .option.active`)
        );
        options.removeClass("active");
        options.eq(current > 0 ? current - 1 : current).addClass("active");
        break;
      }
      case window.tvKey?.KEY_RIGHT: {
        const options = $(`.${window.home_episodes.id}.${window.home_episodes.id}_content .option`);
        const current = options.index(
          $(`.${window.home_episodes.id}.${window.home_episodes.id}_content .option.active`)
        );
        options.removeClass("active");
        options
          .eq(current < options.length - 1 ? current + 1 : current)
          .addClass("active");

        const seasonOptions = $(".seasons-list .season");
        const seasonCurrent = seasonOptions.index($(".seasons-list .season.active"));
        seasonOptions.removeClass("selected");

        let marginTop = 0;
        if (seasonOptions.length > 8 && seasonCurrent > 4) {
          if (seasonCurrent > seasonOptions.length - 4) {
            marginTop = -((seasonOptions.length - 8) * 72);
          } else {
            marginTop = -((seasonCurrent - 4) * 72);
          }
        }

        seasonOptions.eq(seasonCurrent).addClass("selected");
        const offsetEl = document.getElementById("seasons-list-offset");
        if (offsetEl) offsetEl.style.marginTop = `${marginTop}px`;
        break;
      }
      case window.tvKey?.KEY_UP: {
        const options = $(`.${window.home_episodes.id}.${window.home_episodes.id}_content .option`);
        const current = options.index(
          $(`.${window.home_episodes.id}.${window.home_episodes.id}_content .option.active`)
        );
        if (current > 0) {
          $(".episodes .episodes-list")[0]?.slick?.prev();
        } else {
          const seasonOptions = $(".seasons-list .season");
          const seasonCurrent = seasonOptions.index($(".seasons-list .season.selected"));

          seasonOptions.removeClass("selected");
          const newCurrent = seasonCurrent > 0 ? seasonCurrent - 1 : seasonCurrent;
          seasonOptions.eq(newCurrent).addClass("selected");

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
        const options = $(`.${window.home_episodes.id}.${window.home_episodes.id}_content .option`);
        const current = options.index(
          $(`.${window.home_episodes.id}.${window.home_episodes.id}_content .option.active`)
        );
        if (current > 0) {
          $(".episodes .episodes-list")[0]?.slick?.next();
        } else {
          const seasonOptions = $(".seasons-list .season");
          const seasonCurrent = seasonOptions.index($(".seasons-list .season.selected"));

          seasonOptions.removeClass("selected");
          const newCurrent =
            seasonCurrent < seasonOptions.length - 1 ? seasonCurrent + 1 : seasonCurrent;
          seasonOptions.eq(newCurrent).addClass("selected");

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
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const options = $(`.${window.home_episodes.id}.${window.home_episodes.id}_content .option`);
        const current = options.index(
          $(`.${window.home_episodes.id}.${window.home_episodes.id}_content .option.active`)
        );
        if (current > 0) {
          const slideIndex = $(".episodes .episodes-list")[0]?.slick?.currentSlide || 0;
          const targetEpisode = window.home_episodes.data.episodes?.[slideIndex];
          if (targetEpisode) {
            window.video.init(targetEpisode);
          }
        } else {
          const seasonOptions = $(".seasons-list .season");
          const seasonCurrent = seasonOptions.index($(".seasons-list .season.selected"));

          seasonOptions.removeClass("active");
          seasonOptions.eq(seasonCurrent).addClass("active");
          if (window.home_episodes.data.seasons?.[seasonCurrent]) {
            window.home_episodes.load(window.home_episodes.data.seasons[seasonCurrent]);
          }
        }
        break;
      }
    }
  },
};
