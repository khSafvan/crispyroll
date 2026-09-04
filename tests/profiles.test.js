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

  // 1. Verify profiles.js defines showAddProfileDisabledToast with clear redirect message
  assert(
    profilesCode.includes("showAddProfileDisabledToast"),
    "profiles.js must define showAddProfileDisabledToast"
  );
  assert(
    profilesCode.includes("Profile creation isn't available here"),
    "profiles.js must display clear redirect guidance"
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
        if (id === "p2" && pin !== "1234") {
          cb.error?.(new Error("Invalid PIN"));
          return;
        }
        mockWindow._switchedTo = id;
        cb.success?.();
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
  assert(markup.includes("Open Profile"), "Markup should render Open Profile");
  assert(markup.includes("Locked Profile"), "Markup should render Locked Profile");
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

  // 8. Verify TV / HTPC Two-Column Layout & Remote Hint
  assert(profilesCode.includes("pin-info-column"), "profiles.js must define pin-info-column");
  assert(profilesCode.includes("pin-keypad-column"), "profiles.js must define pin-keypad-column");
  assert(profilesCode.includes("pin-tv-remote-hint"), "profiles.js must define pin-tv-remote-hint");

  const profilesCss = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/styles/components/profiles.css"),
    "utf8"
  );
  assert(profilesCss.includes(".pin-info-column"), "profiles.css must style .pin-info-column");
  assert(profilesCss.includes(".pin-keypad-column"), "profiles.css must style .pin-keypad-column");
  assert(profilesCss.includes("@media (min-width: 860px)"), "profiles.css must define TV widescreen media query");
  assert(!profilesCss.includes("radial-gradient"), "profiles.css must not use radial gradients (Flat design)");
  assert(!profilesCss.includes("box-shadow: 0 16px 40px"), "pin-keypad-card must have no drop shadow (Flat design)");
  assert(!profilesCss.includes("box-shadow: 0 8px 24px"), "numpad-btn must have no drop shadow (Flat design)");

  // 9. Test real session.js PIN verification & active profile bypass logic
  const sessionCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/core/session.js"),
    "utf8"
  );
  const localStorageMock = {};
  const mockSessionWindow = {
    translate: { go: (k) => k },
    localStorage: {
      getItem: (k) => localStorageMock[k] || null,
      setItem: (k, v) => { localStorageMock[k] = String(v); },
      removeItem: (k) => { delete localStorageMock[k]; },
    },
    service: {
      switchProfile: (cb, profileId, _pin) => {
        mockSessionWindow._serviceSwitchCalled = true;
        cb.success({
          account_id: "acc_1",
          profile_id: profileId,
          access_token: "new_token",
          refresh_token: "new_refresh",
          token_type: "Bearer",
          expires_in: 3600,
        });
      },
      profiles: (cb) => cb.success([]),
    },
  };

  const sessionEval = new Function("window", "localStorage", sessionCode);
  sessionEval(mockSessionWindow, mockSessionWindow.localStorage);

  // Test get_profile_pin and set_profile_pin
  mockSessionWindow.session.set_profile_pin("prof_lock", "4321");
  assert.strictEqual(
    mockSessionWindow.session.get_profile_pin("prof_lock"),
    "4321",
    "session must store and retrieve profile PIN"
  );

  mockSessionWindow.session.storage = {
    profile_id: "prof_active",
    account: { audio: "en-US", language: "en-US", avatar: "0001.png" },
    profiles: [
      { profile_id: "prof_active", profile_name: "Active User", has_pin: true, pin: "5678" },
      { profile_id: "prof_lock", profile_name: "Other Locked", has_pin: true, pin: "4321" },
    ],
  };

  // Test 9a: Reject wrong PIN on locked profile
  let pinError = null;
  mockSessionWindow.session.switch_profile(
    {
      success: () => { assert.fail("Must not succeed with wrong PIN"); },
      error: (err) => { pinError = err; },
    },
    "prof_lock",
    "0000" // Wrong PIN
  );
  assert(pinError, "Must return error for incorrect PIN");
  assert.strictEqual(pinError.message, "Incorrect PIN", "Error message must be 'Incorrect PIN'");

  // Test 9b: Reject incomplete PIN (< 4 digits)
  pinError = null;
  mockSessionWindow.session.switch_profile(
    {
      success: () => { assert.fail("Must not succeed with incomplete PIN"); },
      error: (err) => { pinError = err; },
    },
    "prof_lock",
    "12" // Incomplete PIN
  );
  assert(pinError, "Must return error for incomplete PIN");

  // Test 9c: Selecting the ALREADY ACTIVE profile with correct PIN must bypass Crunchyroll switchProfile
  mockSessionWindow._serviceSwitchCalled = false;
  let activeProfileSwitched = false;
  mockSessionWindow.session.switch_profile(
    {
      success: () => { activeProfileSwitched = true; },
      error: (err) => { assert.fail(`Should not error on active profile: ${err.message}`); },
    },
    "prof_active",
    "5678" // Correct PIN
  );
  assert.strictEqual(activeProfileSwitched, true, "Active profile with correct PIN must succeed");
  assert.strictEqual(
    mockSessionWindow._serviceSwitchCalled,
    false,
    "Active profile must bypass service.switchProfile OAuth call (preventing false 400 error)"
  );

  // Test 9d: Switching to a DIFFERENT profile with correct PIN must call service.switchProfile
  mockSessionWindow._serviceSwitchCalled = false;
  let otherProfileSwitched = false;
  mockSessionWindow.session.switch_profile(
    {
      success: () => { otherProfileSwitched = true; },
      error: (err) => { assert.fail(`Should not error on other profile: ${err.message}`); },
    },
    "prof_lock",
    "4321" // Correct PIN
  );
  assert.strictEqual(otherProfileSwitched, true, "Other profile with correct PIN must succeed");
  assert.strictEqual(
    mockSessionWindow._serviceSwitchCalled,
    true,
    "Switching to different profile must invoke service.switchProfile"
  );

  // 10. Test real service.js verifyProfilePin deterministic verification
  const serviceCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/core/service.js"),
    "utf8"
  );
  const mockServiceWindow = {
    session: mockSessionWindow.session,
  };
  const serviceEval = new Function("window", serviceCode);
  serviceEval(mockServiceWindow);

  let verifyResult = null;
  mockServiceWindow.service.verifyProfilePin({
    data: { profile_id: "prof_lock", pin: "4321" },
    success: (res) => { verifyResult = res; },
    error: (err) => { assert.fail(`verifyProfilePin should succeed: ${err.message}`); },
  });
  assert(verifyResult?.valid, "verifyProfilePin must report valid for matching PIN");

  let verifyError = null;
  mockServiceWindow.service.verifyProfilePin({
    data: { profile_id: "prof_lock", pin: "9999" },
    success: () => { assert.fail("verifyProfilePin must not succeed for wrong PIN"); },
    error: (err) => { verifyError = err; },
  });
  assert(verifyError, "verifyProfilePin must error on wrong PIN");
  assert.strictEqual(verifyError.message, "Incorrect PIN", "verifyProfilePin error must be 'Incorrect PIN'");

  // 11. Test window resize accidental selection suppression
  assert(profilesCode.includes("isWindowResizing"), "profiles.js must define isWindowResizing guard");
  assert(profilesCode.includes("window.addEventListener(\"resize\""), "profiles.js must attach resize listener");

  // 12. Test sidebar menu restoration invariant
  const homeCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/screens/home.js"),
    "utf8"
  );
  assert(
    homeCode.includes("!document.getElementById(window.menu.id)"),
    "home.js must check if window.menu element exists in DOM"
  );
  assert(
    homeCode.includes("window.menu.init()"),
    "home.js must restore window.menu.init if menu element is absent"
  );
  assert(
    profilesCode.includes("window.menu && typeof window.menu.init === \"function\" && !document.getElementById(window.menu.id)"),
    "profilesScreen.destroy must restore window.menu if menu is absent"
  );

  // 13. Test service.switchProfile primary vs secondary grant type
  assert(
    serviceCode.includes("grant_type: isPrimary ? \"refresh_token\" : \"refresh_token_profile_id\""),
    "service.switchProfile must use refresh_token for primary profile and refresh_token_profile_id for secondary"
  );

  // 14. Test Reset PIN functionality
  assert(profilesCode.includes("btn-pin-reset"), "profiles.js must provide btn-pin-reset");
  assert(profilesCode.includes("resetPin:"), "profiles.js must define resetPin method");

  console.log("✓ Profile PIN lock & verification tests passed!");
}

module.exports = { testProfilesScreenAndPinGating };
