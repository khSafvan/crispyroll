/**
 * Data Mapper Unit Tests
 */

const assert = require("assert");

function testMappers() {
  console.log("Running Data Mapper Tests...");

  global.window = global;
  global.session = {
    storage: {
      account: {
        audio: "ja-JP",
        language: "en-US",
      },
    },
  };

  require("../src/renderer/core/mappers/crunchyroll");

  // Test mapper.continue
  const mockContinueData = {
    data: [
      {
        panel: {
          id: "G6NQ5DWZ6",
          streams_link: "https://beta-api.crunchyroll.com/cms/v2/videos/GR1234567/streams",
          title: "Episode 1",
          description: "The beginning of the journey.",
          images: {
            thumbnail: [[null, null, null, null, { source: "https://img.cr.com/thumb.jpg" }]],
          },
          episode_metadata: {
            series_title: "My Hero Series",
            season_number: 1,
            episode_number: 1,
            duration_ms: 1440000,
          },
        },
        never_watched: false,
        playhead: 720,
      },
    ],
  };

  const continued = window.mapper.continue(mockContinueData);
  assert.strictEqual(continued.id, "G6NQ5DWZ6");
  assert.strictEqual(
    continued.stream,
    "GR1234567",
    "Should extract 9-character video ID from stream URL"
  );
  assert.strictEqual(continued.serie, "My Hero Series");
  assert.strictEqual(continued.season_number, 1);
  assert.strictEqual(continued.episode_number, 1);
  assert.strictEqual(continued.playhead, 12, "720 seconds = 12 minutes");
  assert.strictEqual(continued.duration, 24, "1440000 ms = 24 minutes");

  // Test mapper.seasons
  const mockSeasonsData = {
    items: [
      {
        id: "S1",
        title: "Season 1",
        season_number: 1,
        audio_locale: "ja-JP",
        audio_locales: ["ja-JP"],
        versions: [{ audio_locale: "ja-JP" }],
        is_dubbed: false,
      },
      {
        id: "S2",
        title: "Season 1 (English Dub)",
        season_number: 1,
        audio_locale: "en-US",
        audio_locales: ["en-US"],
        versions: [{ audio_locale: "en-US" }],
        is_dubbed: true,
      },
    ],
  };

  const seasons = window.mapper.seasons(mockSeasonsData);
  assert.strictEqual(seasons.length, 1, "Should filter by user preferred audio ja-JP");
  assert.strictEqual(seasons[0].id, "S1");
  assert.strictEqual(seasons[0].audio_locale, "JA");

  // Test fallback image
  const fallback = window.mapper.preventImageErrorTest(() => {
    throw new Error("Broken nested key");
  });
  assert.strictEqual(fallback, "assets/images/empty_640x360.png");

  console.log("✓ Data mapper tests passed!");
}

module.exports = { testMappers };
