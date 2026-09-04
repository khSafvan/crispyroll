/**
 * Fast TV Login & OAuth2 Device Flow Unit Tests
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function testFastLogin() {
  console.log("Running Fast TV Login & Device Authorization Tests...");

  const loginCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/screens/login.js"),
    "utf8"
  );
  const serviceCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/core/service.js"),
    "utf8"
  );
  const sessionCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/core/session.js"),
    "utf8"
  );

  // 1. Verify service.deviceToken properly handles 204, pending, and token extraction
  assert(
    serviceCode.includes("res.status === 204") &&
      serviceCode.includes("request.pending?.()"),
    "service.deviceToken must handle HTTP 204 as pending authorization"
  );
  assert(
    serviceCode.includes("authorization_pending"),
    "service.deviceToken must treat authorization_pending as non-fatal pending"
  );

  // 2. Verify session.setTokens synthesizes fallback profile and decodes tokens
  assert(
    sessionCode.includes("window.session.storage.profiles = [") &&
      sessionCode.includes("profile_id: pid"),
    "session.setTokens must synthesize a default profile to avoid empty profile traps"
  );
  assert(
    sessionCode.includes("startWithToken: (tokens, callback) =>"),
    "session must define startWithToken"
  );

  // 3. Verify login.js polling interval normalization (500ms -> 2500-5000ms, not 500,000ms)
  assert(
    loginCode.includes("data.interval >= 100") &&
      loginCode.includes("Math.max(2500, Math.min(pollInterval, 5000))"),
    "login.js must normalize interval ms and clamp between 2500ms and 5000ms"
  );

  // 4. Verify login.js live countdown timer
  assert(
    loginCode.includes("window.login.countdownTimer = setInterval"),
    "login.js must run live countdown timer"
  );

  // 5. Verify simulated Fast Login activation and screen transition
  let navigatedTo = null;
  let loginDestroyed = false;
  let activeTimers = [];

  const mockWindow = {
    translate: { go: (k) => k },
    session: {
      storage: { account: {}, profiles: [] },
      setTokens: (tokens) => {
        mockWindow.session.storage.access_token = tokens.access_token;
        mockWindow.session.storage.profiles = [
          { id: "p1", profile_name: "TestUser", is_selected: true },
        ];
      },
      startWithToken: (tokens, cb) => {
        mockWindow.session.setTokens(tokens);
        cb?.success?.(mockWindow.session.storage);
      },
    },
    service: {
      deviceCode: (req) => {
        req.success?.({
          user_code: "eu7ap6",
          device_code: "mock-device-uuid-1234",
          interval: 500,
          expires_in: 300,
        });
      },
      deviceToken: (req) => {
        req.success?.({
          access_token: "mock-user-access-token",
          refresh_token: "mock-user-refresh-token",
          account_id: "cr-account-999",
        });
      },
    },
    profilesScreen: {
      init: () => {
        navigatedTo = "profiles";
      },
    },
    home: {
      init: () => {
        navigatedTo = "home";
      },
    },
    main: { state: "" },
    tvKey: {},
    setInterval: (fn, ms) => {
      const id = activeTimers.length + 1;
      activeTimers.push({ id, fn, ms });
      return id;
    },
    clearInterval: (id) => {
      activeTimers = activeTimers.filter((t) => t.id !== id);
    },
    setTimeout: (fn) => fn(),
    document: {
      createElement: () => ({
        innerHTML: "",
        appendChild: () => {},
        className: "",
        remove: () => {},
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {
          loginDestroyed = true;
        },
      },
      querySelectorAll: () => [],
      querySelector: () => null,
      getElementById: (id) => {
        return {
          tagName: id.includes("username") || id.includes("password") ? "INPUT" : "DIV",
          innerHTML: "",
          textContent: "",
          classList: { add: () => {}, remove: () => {} },
          style: {},
          focus: () => {},
          addEventListener: () => {},
          setAttribute: () => {},
        };
      },
    },
  };

  const evalFunc = new Function("window", "document", "setInterval", "clearInterval", loginCode);
  evalFunc(mockWindow, mockWindow.document, mockWindow.setInterval, mockWindow.clearInterval);

  // Initialize login and start device auth
  mockWindow.login.init();

  assert.strictEqual(
    mockWindow.login.currentDeviceCode,
    "mock-device-uuid-1234",
    "Current device code must be stored"
  );

  // Find and invoke the poll timer callback
  const pollTimerObj = activeTimers.find((t) => t.ms >= 2500 && t.ms <= 5000);
  assert(pollTimerObj, "Poll timer must be scheduled between 2500ms and 5000ms");

  // Fire poll timer (simulates Crunchyroll returning approved token)
  pollTimerObj.fn();

  // Verify that login was destroyed and app navigated to home (single profile)
  assert.strictEqual(loginDestroyed, true, "Login screen must be destroyed upon successful authorization");
  assert.strictEqual(navigatedTo, "home", "App must navigate to home on single profile");
  assert.strictEqual(
    mockWindow.session.storage.access_token,
    "mock-user-access-token",
    "Access token must be saved into session storage"
  );

  // Cleanup remaining timers
  mockWindow.login.destroy();

  console.log("✓ Fast TV Login & Device Authorization tests passed!");
}

module.exports = { testFastLogin };
