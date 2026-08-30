/**
 * Video Playback & Service Contract Unit Tests
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function testVideoServiceContract() {
  console.log("Running Video Playback & Service Contract Tests...");

  // 1. Verify service.js exports video_v2
  const serviceCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/core/service.js"),
    "utf8"
  );
  assert(serviceCode.includes("video_v2: (request)"), "service.js must export video_v2");
  assert(!serviceCode.includes("play: (request)"), "service.js does not export play");

  // 2. Verify video.js calls window.service.video_v2
  const videoCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/screens/video.js"),
    "utf8"
  );
  assert(
    videoCode.includes("window.service.video_v2"),
    "video.js must call window.service.video_v2"
  );
  assert(
    !videoCode.includes("window.service.play("),
    "video.js must NOT call non-existent window.service.play"
  );
  assert(
    !videoCode.includes("window.service.getEpisode("),
    "video.js must NOT call non-existent window.service.getEpisode"
  );

  // 3. Verify all window.service.* calls in screens map to valid methods in service.js
  const screensDir = path.resolve(__dirname, "../src/renderer/screens");
  const screenFiles = fs.readdirSync(screensDir).filter((f) => f.endsWith(".js"));

  const serviceMethodMatches = serviceCode.match(/([a-zA-Z0-9_]+):\s*\(/g) || [];
  const definedServiceMethods = new Set(
    serviceMethodMatches.map((m) => m.replace(/:\s*\(/, "").trim())
  );

  screenFiles.forEach((file) => {
    const fullPath = path.join(screensDir, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const calls = content.match(/window\.service\.([a-zA-Z0-9_]+)/g) || [];
    calls.forEach((call) => {
      const methodName = call.replace("window.service.", "");
      if (methodName !== "api" && methodName !== "format") {
        assert(
          definedServiceMethods.has(methodName),
          `Method window.service.${methodName} called in screens/${file} must exist in service.js`
        );
      }
    });
  });

  // 4. Verify history sync methods and lifecycle in video.js
  assert(videoCode.includes("startHistory: () =>"), "video.js must define startHistory");
  assert(videoCode.includes("saveHistory: (time)"), "video.js must define saveHistory");
  assert(videoCode.includes("onUnloadSync"), "video.js must define onUnloadSync for app exit");

  // 5. Test history sync simulation on playback teardown
  let savedHistoryPayload = null;
  const mockVideoWindow = {
    translate: { go: (k) => k },
    session: { storage: { account: { language: "en-US" } }, refresh: ({ success }) => success({ access_token: "t" }) },
    service: {
      setHistory: ({ data }) => {
        savedHistoryPayload = data;
      },
      video_v2: () => {},
    },
    player: {
      getPlayed: () => 142.6,
      getDuration: () => 1440,
      stop: () => {},
    },
    home: { id: "home-screen" },
    main: { state: "video-screen" },
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      body: { appendChild: () => {}, removeChild: () => {} },
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const videoEvalFunc = new Function("window", "document", videoCode);
  videoEvalFunc(mockVideoWindow, mockVideoWindow.document);

  // Set active episode and simulate destroy
  mockVideoWindow.video.episode = "ep-test-456";
  mockVideoWindow.video.destroy();

  assert(savedHistoryPayload !== null, "destroy() should send playhead history update");
  assert.strictEqual(savedHistoryPayload.content_id, "ep-test-456", "History should record correct episode id");
  assert.strictEqual(savedHistoryPayload.playhead, 142, "History should record correct floor playhead");

  console.log("✓ Video playback & service contract tests passed!");
}

module.exports = { testVideoServiceContract };
