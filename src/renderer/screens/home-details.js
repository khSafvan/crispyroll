/**
 * Home Details Overlay Screen Controller
 */

window.home_details = {
  id: "home_details-screen",
  previous: null,
  data: {
    this: null,
    continue: null,
  },
  callbacks: {
    init: null,
    destroy: null,
  },
  inWatchList: false,

  /**
   * Initializes media details view (play/continue, watchlist toggle, episodes list).
   * @param {object} item
   * @param {Function} [init]
   * @param {Function} [destroy]
   */
  init: (item, init, destroy) => {
    window.home_details.callbacks.init = init;
    window.home_details.callbacks.destroy = destroy;
    window.home_details.callbacks.init?.(item);

    window.service.inWatchList({
      data: item.id,
      success: (response) => {
        window.home_details.inWatchList = response.data?.length > 0;
        const iconClass = window.home_details.inWatchList ? "fa-solid" : "fa-regular";
        const textKey = window.home_details.inWatchList
          ? "home.details.remove"
          : "home.details.add";
        const content = `<i class="${iconClass} fa-bookmark"></i><p>${window.translate.go(
          textKey
        )}</p>`;
        const statusEl = document.getElementById("watchlist-status");
        if (statusEl) statusEl.innerHTML = content;
      },
      error: () => {
        window.home_details.inWatchList = false;
      },
    });

    const buttons = document.createElement("div");
    buttons.className = `${window.home_details.id} ${window.home_details.id}_buttons`;
    buttons.innerHTML = `
    <a class="selected">
      <i class="fa-solid fa-play"></i>
      <p>${window.translate.go("home.details.play", { season: 1, episode: 1 })}</p>
      <span></span>
    </a>
    <a id="watchlist-status">
      <i class="fa-regular fa-bookmark"></i>
      <p>${window.translate.go("home.details.add")}</p>
    </a>
    <a>
      <i class="fa-solid fa-list"></i>
      <p>${window.translate.go("home.details.episodes")}</p>
    </a>`;

    window.home_details.data.this = item;
    $(`#${window.home.id} .details .info`).append(buttons);

    if (item.type === "movie") {
      $(`.${window.home_details.id}.${window.home_details.id}_buttons a`).eq(2).remove();
      $(`.${window.home_details.id}.${window.home_details.id}_buttons a`)
        .eq(0)
        .addClass(item.playhead > 0 ? "played" : "")
        .attr("percent", (item.playhead * 100) / item.duration);

      const text = window.translate.go(`home.details.${item.playhead > 0 ? "continue" : "play"}`, {
        season: 0,
        episode: 0,
      });
      $(`.${window.home_details.id}.${window.home_details.id}_buttons a p`).eq(0).text(text);
      $(`.${window.home_details.id}.${window.home_details.id}_buttons a span`)
        .eq(0)
        .width(`${(item.playhead * 100) / item.duration}%`);
    } else {
      window.loading.start();
      window.service.continue({
        data: {
          ids: item.id,
        },
        success: (response) => {
          window.loading.end();
          window.home_details.data.continue = window.mapper.continue(response);
          const cont = window.home_details.data.continue;
          $(`.${window.home_details.id}.${window.home_details.id}_buttons a`)
            .eq(0)
            .addClass(cont.played > 0 ? "played" : "")
            .attr("percent", cont.played);

          const text = window.translate.go(
            `home.details.${cont.played > 0 ? "continue" : "play"}`,
            {
              season: cont.season_number,
              episode: cont.episode_number,
            }
          );
          $(`.${window.home_details.id}.${window.home_details.id}_buttons a p`).eq(0).text(text);
          $(`.${window.home_details.id}.${window.home_details.id}_buttons a span`)
            .eq(0)
            .width(`${cont.played}%`);
        },
        error: () => {
          window.loading.end();
        },
      });
    }

    $(`#${window.home.id} .details`).addClass("full");
    $("body").addClass(window.home_details.id);

    window.home_details.previous = window.main.state;
    window.main.state = window.home_details.id;
  },

  destroy: () => {
    $("body").removeClass(window.home_details.id);
    $(`#${window.home.id} .details.full`).removeClass("full");
    $(`.${window.home_details.id}`).remove();
    window.home_details.data.continue = null;
    window.home_details.data.this = null;
    window.home_details.inWatchList = false;

    window.main.state = window.home_details.previous;
    window.home_details.callbacks.destroy?.();
  },

  /**
   * Key down event handler for home details screen.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.home_details.destroy();
        break;
      case window.tvKey?.KEY_UP: {
        const buttons = $(`.${window.home_details.id}.${window.home_details.id}_buttons a`);
        const current = buttons.index(
          $(`.${window.home_details.id}.${window.home_details.id}_buttons a.selected`)
        );
        buttons.removeClass("selected");
        buttons.eq(current > 0 ? current - 1 : current).addClass("selected");
        break;
      }
      case window.tvKey?.KEY_DOWN: {
        const buttons = $(`.${window.home_details.id}.${window.home_details.id}_buttons a`);
        const current = buttons.index(
          $(`.${window.home_details.id}.${window.home_details.id}_buttons a.selected`)
        );
        buttons.removeClass("selected");
        buttons
          .eq(current < buttons.length - 1 ? current + 1 : current)
          .addClass("selected");
        break;
      }
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const buttons = $(`.${window.home_details.id}.${window.home_details.id}_buttons a`);
        const current = buttons.index(
          $(`.${window.home_details.id}.${window.home_details.id}_buttons a.selected`)
        );

        switch (current) {
          case 0:
            window.video.init(window.home_details.data.continue);
            break;
          case 1:
            window.loading.start();
            window.mylist.toggleStatus(
              window.home_details.data.this.id,
              !window.home_details.inWatchList,
              {
                success: () => {
                  window.home_details.inWatchList = !window.home_details.inWatchList;
                  const iconClass = window.home_details.inWatchList ? "fa-solid" : "fa-regular";
                  const textKey = window.home_details.inWatchList
                    ? "home.details.remove"
                    : "home.details.add";
                  const content = `<i class="${iconClass} fa-bookmark"></i><p>${window.translate.go(
                    textKey
                  )}</p>`;
                  const statusEl = document.getElementById("watchlist-status");
                  if (statusEl) statusEl.innerHTML = content;
                  window.loading.end();
                },
                error: () => {
                  window.loading.end();
                },
              }
            );
            break;
          case 2:
            window.home_episodes.init(window.home_details.data.this);
            break;
        }
        break;
      }
    }
  },
};
