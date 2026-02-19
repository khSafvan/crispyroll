/**
 * Profile Selection & PIN Gating Unit Tests
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function testProfilesScreenAndPinGating() {
  console.log("Running Profile PIN Lock & Verification Tests...");

  const profilesCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/screens/profiles.js"),
    "utf8"
  );
  const serviceCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/core/service.js"),
    "utf8"
  );

  // 1. Verify service.js exports avatar and profile endpoints
  assert(
    serviceCode.includes("avatars: (request)"),
    "service.js must export avatars catalog endpoint"
  );
  assert(
    serviceCode.includes("createProfile: (request)"),
    "service.js must export createProfile endpoint"
  );

  // 2. Verify profiles.js has Active Slot boxes and Lockout logic
  assert(profilesCode.includes("profile-lock-badge"), "profiles.js must render lock badges");
  assert(profilesCode.includes("openPinModal"), "profiles.js must define openPinModal");
  assert(profilesCode.includes("pinModal"), "profiles.js must define pinModal");
  assert(profilesCode.includes("pin-slots-row"), "profiles.js must render pin slots row");
  assert(profilesCode.includes("executeSweepClear"), "profiles.js must define executeSweepClear");
  assert(profilesCode.includes("triggerPinLockout"), "profiles.js must define triggerPinLockout");

  // 3. Test simulated profiles screen execution
  const mockWindow = {
    translate: { go: (k) => k },
    session: {
      storage: {
        profiles: [
          {
            profile_id: "p1",
            profile_name: "Open Profile",
            has_pin: false,
            avatar: "avatar1.png",
          },
          {
            profile_id: "p2",
            profile_name: "Locked Profile",
            has_pin: true,
            avatar: "avatar2.png",
          },
        ],
      },
      switch_profile: (cb, id, pin) => {
        if (pin === "1234" || !pin) {
          mockWindow._switchedTo = id;
          cb.success?.();
        } else {
          cb.error?.(new Error("Invalid PIN"));
        }
      },
    },
    loading: { start: () => {}, end: () => {} },
    menu: { init: () => {}, destroy: () => {} },
    home: { restart: () => {} },
    main: { state: "" },
    document: {
      createElement: () => ({
        innerHTML: "",
        appendChild: () => {},
        remove: () => {},
        querySelectorAll: () => [],
      }),
      body: { appendChild: () => {}, removeChild: () => {} },
      getElementById: () => null,
      querySelectorAll: () => [],
      querySelector: () => null,
    },
  };

  const evalFunc = new Function("window", "document", profilesCode);
  evalFunc(mockWindow, mockWindow.document);

  assert(
    typeof mockWindow.profilesScreen.getOptions === "function",
    "profilesScreen.getOptions should be defined"
  );

  const markup = mockWindow.profilesScreen.getOptions();
  assert(markup.includes("OPEN PROFILE"), "Markup should render OPEN PROFILE");
  assert(markup.includes("LOCKED PROFILE"), "Markup should render LOCKED PROFILE");
  assert(markup.includes("profile-lock-badge"), "Locked profile should have lock badge");

  // 4. Test selecting unlocked profile directly switches
  mockWindow.profilesScreen.selectProfile("p1");
  assert.strictEqual(mockWindow._switchedTo, "p1", "Unlocked profile should switch immediately");

  // 5. Test selecting locked profile opens PIN screen
  mockWindow._switchedTo = null;
  mockWindow.profilesScreen.selectProfile("p2");
  assert.strictEqual(
    mockWindow.profilesScreen.pinModal.active,
    true,
    "Locked profile should open PIN modal"
  );
  assert.strictEqual(
    mockWindow._switchedTo,
    null,
    "Locked profile should NOT switch without PIN verification"
  );

  // 6. Test 150ms input debouncing
  mockWindow.profilesScreen.pinScreen.lastInputTime = 0;
  mockWindow.profilesScreen.handlePinInput("1");
  assert.strictEqual(mockWindow.profilesScreen.pinScreen.currentPin, "1", "First digit accepted");

  // Immediate input within 150ms should be rejected by debounce
  mockWindow.profilesScreen.handlePinInput("2");
  assert.strictEqual(
    mockWindow.profilesScreen.pinScreen.currentPin,
    "1",
    "Rapid input within 150ms must be debounced"
  );

  // Advancing timestamp allows next input
  mockWindow.profilesScreen.pinScreen.lastInputTime = 0;
  mockWindow.profilesScreen.handlePinInput("2");
  mockWindow.profilesScreen.pinScreen.lastInputTime = 0;
  mockWindow.profilesScreen.handlePinInput("3");
  mockWindow.profilesScreen.pinScreen.lastInputTime = 0;
  mockWindow.profilesScreen.handlePinInput("4");

  assert.strictEqual(
    mockWindow._switchedTo,
    "p2",
    "Profile should switch after entering correct 4-digit PIN"
  );

  // 7. Test Brute-Force Lockout
  mockWindow.profilesScreen.openPinScreen({ profile_id: "p2", profile_name: "Locked Profile" });
  mockWindow.profilesScreen.pinScreen.lastInputTime = 0;
  mockWindow.session.switch_profile = (cb) => cb.error?.(new Error("Invalid PIN"));

  // Attempt 1
  mockWindow.profilesScreen.pinScreen.currentPin = "999";
  mockWindow.profilesScreen.handlePinInput("9");
  assert.strictEqual(mockWindow.profilesScreen.pinScreen.failedAttempts, 1, "Attempt 1 recorded");

  // Attempt 2
  mockWindow.profilesScreen.pinScreen.lastInputTime = 0;
  mockWindow.profilesScreen.pinScreen.currentPin = "999";
  mockWindow.profilesScreen.handlePinInput("9");
  assert.strictEqual(mockWindow.profilesScreen.pinScreen.failedAttempts, 2, "Attempt 2 recorded");

  // Attempt 3
  mockWindow.profilesScreen.pinScreen.lastInputTime = 0;
  mockWindow.profilesScreen.pinScreen.currentPin = "999";
  mockWindow.profilesScreen.handlePinInput("9");
  assert.strictEqual(mockWindow.profilesScreen.pinScreen.failedAttempts, 3, "Attempt 3 recorded");

  // Attempt 4
  mockWindow.profilesScreen.pinScreen.lastInputTime = 0;
  mockWindow.profilesScreen.pinScreen.currentPin = "999";
  mockWindow.profilesScreen.handlePinInput("9");
  assert.strictEqual(mockWindow.profilesScreen.pinScreen.failedAttempts, 4, "Attempt 4 recorded");

  // Attempt 5 (triggers lockout)
  mockWindow.profilesScreen.pinScreen.lastInputTime = 0;
  mockWindow.profilesScreen.pinScreen.currentPin = "999";
  mockWindow.profilesScreen.handlePinInput("9");
  assert.strictEqual(mockWindow.profilesScreen.pinScreen.failedAttempts, 5, "Attempt 5 recorded");
  assert(mockWindow.profilesScreen.pinScreen.lockoutUntil > Date.now(), "Lockout timer active");

  // Inputs during lockout must be blocked
  mockWindow.profilesScreen.pinScreen.lastInputTime = 0;
  mockWindow.profilesScreen.handlePinInput("1");
  assert.strictEqual(
    mockWindow.profilesScreen.pinScreen.currentPin,
    "",
    "Inputs blocked during lockout"
  );

  console.log("✓ Profile PIN lock & verification tests passed!");
}

module.exports = { testProfilesScreenAndPinGating };
