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

  // 1. Verify service.js exports verifyProfilePin
  assert(
    serviceCode.includes("verifyProfilePin: (request)"),
    "service.js must export verifyProfilePin endpoint"
  );

  // 2. Verify profiles.js has PIN modal and lock badge logic
  assert(profilesCode.includes("profile-lock-badge"), "profiles.js must render lock badges");
  assert(profilesCode.includes("openPinModal"), "profiles.js must define openPinModal");
  assert(profilesCode.includes("pinModal"), "profiles.js must define pinModal");

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

  // Test selecting unlocked profile directly switches
  mockWindow.profilesScreen.selectProfile("p1");
  assert.strictEqual(mockWindow._switchedTo, "p1", "Unlocked profile should switch immediately");

  // Test selecting locked profile opens PIN modal
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

  // Test PIN input and verification
  mockWindow.profilesScreen.handlePinInput("1");
  mockWindow.profilesScreen.handlePinInput("2");
  mockWindow.profilesScreen.handlePinInput("3");
  mockWindow.profilesScreen.handlePinInput("4");

  assert.strictEqual(
    mockWindow._switchedTo,
    "p2",
    "Profile should switch after entering correct 4-digit PIN"
  );

  console.log("✓ Profile PIN lock & verification tests passed!");
}

module.exports = { testProfilesScreenAndPinGating };
