/**
 * Tracker & Scrobble Hook Unit Tests (Phase 1: AniList)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

async function testTrackerModule() {
  console.log("Running Tracker & Scrobble Hook Tests...");

  // Set up mock window environment
  const mockStore = {
    mappings: {},
    trackers: {},
  };

  global.window = {
    electronUtilsRender: {
      getTrackerStatus: async (provider) => {
        return mockStore.trackers[provider] || { connected: false, token: null };
      },
      saveTrackerMapping: async (provider, seriesId, mediaId) => {
        if (!mockStore.mappings[provider]) mockStore.mappings[provider] = {};
        mockStore.mappings[provider][seriesId] = mediaId;
        return true;
      },
      getTrackerMapping: async (provider, seriesId) => {
        return mockStore.mappings[provider]?.[seriesId] || null;
      },
      disconnectTracker: async (provider) => {
        delete mockStore.trackers[provider];
        return { success: true };
      },
    },
    tracker: null,
  };

  // Load tracker module
  const trackerFile = path.join(__dirname, "../src/renderer/core/tracker.js");
  const trackerContent = fs.readFileSync(trackerFile, "utf8");
  // Evaluate tracker script in current context
  eval(trackerContent);

  assert(window.tracker, "window.tracker should be defined");
  assert(window.tracker.providers.anilist, "AniList provider should be defined");
  assert(typeof window.tracker.scrobble === "function", "window.tracker.scrobble should be a function");

  // 1. Test cached ID mapping
  mockStore.mappings.anilist = {
    GG5H5XQX4: 154587,
  };

  const cachedId = await window.tracker.providers.anilist.resolveMediaId("GG5H5XQX4", "Frieren");
  assert.strictEqual(cachedId, 154587, "Should resolve AniList media ID from local mapping cache");

  // 2. Test unmapped series with empty title
  const nullId = await window.tracker.providers.anilist.resolveMediaId("UNKNOWN_ID", "");
  assert.strictEqual(nullId, null, "Should return null gracefully when no mapping or title exists");

  // 3. Test Scrobble hook with disconnected state
  let mutationFired = false;
  window.tracker.providers.anilist.saveProgress = async () => {
    mutationFired = true;
    return true;
  };

  // When not connected, scrobble should silently return without firing mutation
  await window.tracker.scrobble({
    seriesId: "GG5H5XQX4",
    title: "Frieren: Beyond Journey's End",
    episodeNumber: 1,
  });
  assert.strictEqual(mutationFired, false, "Should not fire mutation when AniList is disconnected");

  // 4. Test Scrobble hook with connected state
  mockStore.trackers.anilist = {
    connected: true,
    token: "mock_anilist_access_token_12345",
    user: { name: "TestUser" },
  };

  await window.tracker.scrobble({
    seriesId: "GG5H5XQX4",
    title: "Frieren: Beyond Journey's End",
    episodeNumber: 5,
  });
  assert.strictEqual(mutationFired, true, "Should fire mutation when AniList is connected and ID is resolved");

  // 5. Test Disconnect
  await window.electronUtilsRender.disconnectTracker("anilist");
  const statusAfterDisconnect = await window.electronUtilsRender.getTrackerStatus("anilist");
  assert.strictEqual(statusAfterDisconnect.connected, false, "Should clear tracker state on disconnect");

  console.log("✓ Tracker & Scrobble Hook tests passed!");
}

module.exports = { testTrackerModule };
