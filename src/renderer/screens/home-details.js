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
        const isAdded = window.home_details.inWatchList;
        const iconSvg = window.icons?.get("heroiconsSolid:bookmark", {
          size: 18,
        }) || "";
        const textKey = isAdded ? "home.details.remove" : "home.details.add";
        const content = `${iconSvg}<p>${window.translate.go(textKey)}</p>`;
        const statusEl = document.getElementById("watchlist-status");
        if (statusEl) statusEl.innerHTML = content;
      },
      error: () => {
        window.home_details.inWatchList = false;
      },
    });

    const playSvg = window.icons?.get("heroiconsSolid:play", { size: 20 }) || "";
    const bookmarkSvg = window.icons?.get("heroiconsSolid:bookmark", { size: 18 }) || "";
    const listSvg = window.icons?.get("listBullets", { weight: "regular", size: 18 }) || "";

    const buttons = document.createElement("div");
    buttons.className = `${window.home_details.id} ${window.home_details.id}_buttons`;
    buttons.innerHTML = `
    <a class="selected">
      ${playSvg}
      <p>${window.translate.go("home.details.play", { season: 1, episode: 1 })}</p>
      <span></span>
    </a>
    <a id="watchlist-status">
      ${bookmarkSvg}
      <p>${window.translate.go("home.details.add")}</p>
    </a>
    <a>
      ${listSvg}
      <p>${window.translate.go("home.details.episodes")}</p>
    </a>`;

    window.home_details.data.this = item;
    const rawTitle = item.serie || item.title || "";
    const cleanTitle = typeof window.sanitizeTitle === "function" ? window.sanitizeTitle(rawTitle) : rawTitle;

    const titleEl = document.querySelector(`#${window.home.id} .details .info .title`);
    if (titleEl) {
      titleEl.textContent = cleanTitle;
    }
    const bgImg = document.querySelector(`#${window.home.id} .details .background img`);
    if (bgImg && (item.background || item.poster)) {
      bgImg.src = item.background || item.poster;
    }
    const descEl = document.querySelector(`#${window.home.id} .details .info .description`);
    if (descEl && item.description) {
      descEl.textContent = item.description;
    }

    const infoEl = document.querySelector(`#${window.home.id} .details .info`);
    if (infoEl) {
      infoEl.appendChild(buttons);
    }

    if (item.type === "movie") {
      const btnList = document.querySelectorAll(
        `.${window.home_details.id}.${window.home_details.id}_buttons a`
      );
      btnList[2]?.remove();
      if (btnList[0]) {
        if (item.playhead > 0) btnList[0].classList.add("played");
        btnList[0].setAttribute("percent", (item.playhead * 100) / item.duration);
        const pEl = btnList[0].querySelector("p");
        const spanEl = btnList[0].querySelector("span");
        const text = window.translate.go(
          `home.details.${item.playhead > 0 ? "continue" : "play"}`,
          {
            season: 0,
            episode: 0,
          }
        );
        if (pEl) pEl.textContent = text;
        if (spanEl) spanEl.style.width = `${(item.playhead * 100) / item.duration}%`;
      }
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
          const btnList = document.querySelectorAll(
            `.${window.home_details.id}.${window.home_details.id}_buttons a`
          );
          if (btnList[0]) {
            if (cont.played > 0) btnList[0].classList.add("played");
            btnList[0].setAttribute("percent", cont.played);
            const pEl = btnList[0].querySelector("p");
            const spanEl = btnList[0].querySelector("span");
            const text = window.translate.go(
              `home.details.${cont.played > 0 ? "continue" : "play"}`,
              {
                season: cont.season_number,
                episode: cont.episode_number,
              }
            );
            if (pEl) pEl.textContent = text;
            if (spanEl) spanEl.style.width = `${cont.played}%`;
          }
        },
        error: () => {
          window.loading.end();
        },
      });
    }

    const detailsEl = document.querySelector(`#${window.home.id} .details`);
    detailsEl?.classList.add("full");
    document.body.classList.add(window.home_details.id);

    // Mouse click handlers
    const buttonsContainer = document.querySelector(
      `.${window.home_details.id}.${window.home_details.id}_buttons`
    );
    if (buttonsContainer) {
      buttonsContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("a");
        if (btn && buttonsContainer.contains(btn)) {
          const allBtns = Array.from(buttonsContainer.querySelectorAll("a"));
          const idx = allBtns.indexOf(btn);
          allBtns.forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          window.home_details.triggerAction(idx);
        }
      });
    }

    window.home_details.previous = window.main.state;
    window.main.state = window.home_details.id;
  },

  /**
   * Executes button action at given index.
   * @param {number} current
   */
  triggerAction: (current) => {
    switch (current) {
      case 0:
        window.video.init(window.home_details.data.continue || window.home_details.data.this);
        break;
      case 1:
        window.loading.start();
        window.mylist.toggleStatus(
          window.home_details.data.this.id,
          !window.home_details.inWatchList,
          {
            success: () => {
              window.home_details.inWatchList = !window.home_details.inWatchList;
              const isAdded = window.home_details.inWatchList;
              const iconSvg = window.icons?.get("heroiconsSolid:bookmark", {
                size: 18,
              }) || "";
              const textKey = isAdded ? "home.details.remove" : "home.details.add";
              const content = `${iconSvg}<p>${window.translate.go(textKey)}</p>`;
              const statusEl = document.getElementById("watchlist-status");
              if (statusEl) statusEl.innerHTML = content;

              // Targeted update across visible home / mylist cards without full rebuild
              const targetId = window.home_details.data.this?.id;
              if (targetId) {
                const matchingCards = document.querySelectorAll(`.item[data-id="${targetId}"]`);
                matchingCards.forEach((card) => {
                  card.setAttribute("data-in-watchlist", isAdded ? "true" : "false");
                  let bookmarkBadge = card.querySelector(".card-watchlist-badge");
                  if (isAdded) {
                    if (!bookmarkBadge) {
                      bookmarkBadge = document.createElement("span");
                      bookmarkBadge.className = "card-watchlist-badge";
                      bookmarkBadge.innerHTML = window.icons?.get("bookmarkSimple", {
                        weight: "fill",
                        size: 14,
                      }) || "";
                      card.querySelector(".poster")?.appendChild(bookmarkBadge);
                    }
                  } else {
                    bookmarkBadge?.remove();
                  }
                });
              }

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
  },

  destroy: () => {
    document.body.classList.remove(window.home_details.id);
    const fullEl = document.querySelector(`#${window.home.id} .details.full`);
    fullEl?.classList.remove("full");
    const injected = document.querySelectorAll(`.${window.home_details.id}`);
    injected.forEach((el) => el.remove());

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
    const getButtons = () =>
      Array.from(
        document.querySelectorAll(`.${window.home_details.id}.${window.home_details.id}_buttons a`)
      );
    const getSelectedIdx = () => {
      const btns = getButtons();
      const sel = document.querySelector(
        `.${window.home_details.id}.${window.home_details.id}_buttons a.selected`
      );
      return sel ? btns.indexOf(sel) : 0;
    };

    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.home_details.destroy();
        break;
      case window.tvKey?.KEY_UP: {
        const buttons = getButtons();
        const current = getSelectedIdx();
        buttons.forEach((b) => b.classList.remove("selected"));
        const newCurrent = current > 0 ? current - 1 : current;
        buttons[newCurrent]?.classList.add("selected");
        break;
      }
      case window.tvKey?.KEY_DOWN: {
        const buttons = getButtons();
        const current = getSelectedIdx();
        buttons.forEach((b) => b.classList.remove("selected"));
        const newCurrent = current < buttons.length - 1 ? current + 1 : current;
        buttons[newCurrent]?.classList.add("selected");
        break;
      }
      case 32: // Space
      case window.tvKey?.KEY_ENTER:
      case window.tvKey?.KEY_PANEL_ENTER: {
        const current = getSelectedIdx();
        window.home_details.triggerAction(current);
        break;
      }
    }
  },
};
