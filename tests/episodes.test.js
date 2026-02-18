/**
 * Home Details & Episodes DOM Injection Unit Tests
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function testEpisodesAndDetailsDom() {
  console.log("Running Episodes & Details DOM Structure Tests...");

  const detailsCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/screens/home-details.js"),
    "utf8"
  );
  const episodesCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/screens/home-episodes.js"),
    "utf8"
  );

  // 1. Confirm no tempDiv.innerHTML = HTMLElement regressions exist
  assert(
    !detailsCode.includes("tempDiv.innerHTML = buttons"),
    "home-details.js must not assign HTMLElement to innerHTML"
  );
  assert(
    !episodesCode.includes("tempDiv.innerHTML = episodeContents"),
    "home-episodes.js must not assign HTMLElement to innerHTML"
  );

  const appendedElements = [];
  const mockDetailsWindow = {
    translate: { go: (k) => k },
    home: { id: "home-screen" },
    home_details: { id: "home_details-screen" },
    service: {
      inWatchList: ({ success }) => success({ data: [] }),
      continue: ({ success }) => success({ data: [] }),
    },
    mapper: {
      continue: (res) => res.data,
    },
    main: { state: "" },
    loading: { start: () => {}, end: () => {} },
    document: {
      createElement: (tag) => ({
        tagName: tag,
        className: "",
        innerHTML: "",
        querySelector: () => null,
        querySelectorAll: () => [],
        appendChild: (child) => {
          appendedElements.push(child);
        },
      }),
      querySelector: () => ({
        classList: { add: () => {}, remove: () => {} },
        appendChild: (child) => {
          appendedElements.push(child);
        },
        addEventListener: () => {},
      }),
      querySelectorAll: () => [],
      getElementById: () => null,
      body: { classList: { add: () => {}, remove: () => {} } },
    },
  };

  const detailsEvalFunc = new Function("window", "document", detailsCode);
  detailsEvalFunc(mockDetailsWindow, mockDetailsWindow.document);

  mockDetailsWindow.home_details.init({ id: "series-123", title: "Test Series", type: "series" });

  assert(appendedElements.length > 0, "home-details must append action buttons to DOM");
  assert(
    appendedElements.some((el) => el.innerHTML?.includes("fa-play")),
    "Action buttons must include Play action button"
  );
  assert(
    appendedElements.some((el) => el.innerHTML?.includes("watchlist-status")),
    "Action buttons must include Watchlist action button"
  );

  // 3. Simulate home-episodes DOM injection
  const episodeAppends = [];
  const mockEpisodesWindow = {
    translate: { go: (k) => k },
    home: { id: "home-screen" },
    home_episodes: { id: "home_episodes-screen" },
    service: {
      seasons: ({ success }) => {
        success({
          data: [
            { id: "s1", title: "Season 1", audio_locale: "ja-JP" },
            { id: "s2", title: "Season 2", audio_locale: "en-US" },
          ],
        });
      },
      episodes: ({ success }) => {
        success({
          data: [{ id: "ep1", title: "Episode 1", episode_number: "1", duration_ms: 1440000 }],
        });
      },
    },
    mapper: {
      seasons: (res) => res.data,
      episodes: (res) => res.data.map((d) => ({ ...d, duration: 24, background: "thumb.jpg" })),
    },
    main: { state: "" },
    loading: { start: () => {}, end: () => {} },
    document: {
      createElement: (tag) => ({
        tagName: tag,
        className: "",
        innerHTML: "",
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        appendChild: (child) => {
          episodeAppends.push(child);
        },
      }),
      getElementById: () => ({
        appendChild: (child) => {
          episodeAppends.push(child);
        },
      }),
      querySelector: () => ({
        innerHTML: "",
        addEventListener: () => {},
      }),
      querySelectorAll: () => [],
      body: { classList: { add: () => {}, remove: () => {} } },
    },
  };

  const episodesEvalFunc = new Function("window", "document", episodesCode);
  episodesEvalFunc(mockEpisodesWindow, mockEpisodesWindow.document);

  mockEpisodesWindow.home_episodes.init({ id: "series-123", title: "Test Series" });

  assert(episodeAppends.length > 0, "home-episodes must append overlay container to DOM");
  assert(
    episodeAppends.some((el) => el.innerHTML?.includes("seasons-list")),
    "Overlay container must contain seasons list"
  );
  assert(
    episodeAppends.some((el) => el.innerHTML?.includes("episodes-list")),
    "Overlay container must contain episodes list"
  );

  console.log("✓ Episodes & details DOM structure tests passed!");
}

module.exports = { testEpisodesAndDetailsDom };
