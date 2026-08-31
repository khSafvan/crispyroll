/**
 * Avatar Catalog, Login Error Handling, and PIN Screen Controller Test Suite
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function runAvatarAndAuthTests() {
  console.log("Running Avatar Catalog, Login Error Handling, and PIN Controller Tests...");

  const loginCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/screens/login.js"),
    "utf8"
  );
  const profilesCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/screens/profiles.js"),
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

  // 1. Verify service.token checks res.ok and throws error on invalid credentials
  assert(
    serviceCode.includes("res.status === 401") || serviceCode.includes("!res.ok || json.error"),
    "service.token must inspect res.ok and throw on authentication failure"
  );

  // 2. Verify session.start verifies access_token presence before proceeding
  assert(
    sessionCode.includes("if (!response?.access_token)"),
    "session.start must reject responses lacking access_token"
  );

  // 3. Verify login.js displays error and stays on screen during auth failure
  assert(
    loginCode.includes('errorEl.style.display = "block"') &&
      loginCode.includes("login-error-message"),
    "login.js must display inline error message on authentication failure"
  );

  // 4. Verify disabled TV login warning text and disabled Add Profile toast
  assert(
    loginCode.includes("tv-login-warning-text") &&
      loginCode.includes("Not working properly — please use manual login"),
    "login.js must render warning label for disabled Fast TV login"
  );
  assert(
    profilesCode.includes("showAddProfileDisabledToast"),
    "profiles.js must define showAddProfileDisabledToast"
  );

  // 5. Verify full-screen PIN layout uses expanded tokens and HTPC sizing
  const profilesCss = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/styles/components/profiles.css"),
    "utf8"
  );
  assert(
    profilesCss.includes(".pin-screen-container") &&
      profilesCss.includes("clamp(110px, 12vw, 156px)") &&
      profilesCss.includes("clamp(72px, 6.5vw, 88px)"),
    "profiles.css must define expanded full-screen PIN layout with large avatar and slots"
  );

  // 6. Verify controller smart grid navigation and back button handler
  assert(
    profilesCode.includes("window.profilesScreen.setKeypadFocus") &&
      profilesCode.includes("window.profilesScreen.closePinScreen"),
    "profiles.js must support remote/controller D-pad navigation and back/cancel buttons"
  );

  // 7. Verify Home screen Hero Carousel and Non-Sticky Layout
  const homeCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/screens/home.js"),
    "utf8"
  );
  const homeCss = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/styles/components/home.css"),
    "utf8"
  );
  const exitCss = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/styles/components/exit.css"),
    "utf8"
  );

  assert(
    homeCode.includes("carousel: {") &&
      homeCode.includes("renderCurrentHeroSlide") &&
      homeCode.includes("startAutoAdvance") &&
      homeCode.includes("isContinue"),
    "home.js must implement Hero Carousel with Continue Watching priority"
  );

  assert(
    !homeCode.includes("window.home.show_details();") ||
      !homeCode.includes('rowsEl.addEventListener("mouseover"'),
    "home.js must NOT update hero banner on poster hover"
  );

  assert(
    homeCode.includes("hero-full-banner") &&
      homeCode.includes("hero-top-group") &&
      homeCode.includes("hero-bottom-group") &&
      homeCode.includes("hero-rating-badge") &&
      homeCode.includes("getRowIcon"),
    "home.js must implement Full Hero Banner with top-left / bottom-left split and rating badge"
  );

  assert(
    homeCss.includes(".hero-full-banner") &&
      homeCss.includes(".hero-top-group") &&
      homeCss.includes(".hero-rating-badge") &&
      homeCss.includes("-webkit-line-clamp: 2") &&
      homeCss.includes(".row-title-icon") &&
      homeCss.includes("aspect-ratio: 2 / 3 !important") &&
      homeCss.includes("aspect-ratio: 16 / 9 !important"),
    "home.css must enforce split hero banner layout, defensive line-clamp, and card aspect ratios"
  );

  assert(
    exitCss.includes("z-index: 999999 !important;"),
    "exit.css must set exit-screen z-index to 999999 for highest stacking context"
  );

  // 7. Verify Default Fullscreen, F11 before-input-event, and F11 Toast
  const mainIndexCode = fs.readFileSync(
    path.resolve(__dirname, "../src/main/index.js"),
    "utf8"
  );
  const preloadCode = fs.readFileSync(
    path.resolve(__dirname, "../src/preload/preload.js"),
    "utf8"
  );

  assert(
    mainIndexCode.includes('process.env.FULL_SCREEN !== "0"'),
    "main/index.js must default fullscreen to true"
  );
  assert(
    mainIndexCode.includes('before-input-event') && mainIndexCode.includes('"F11"'),
    "main/index.js must handle F11 via before-input-event"
  );
  assert(
    preloadCode.includes("getStoreValue") && preloadCode.includes("setStoreValue"),
    "preload.js must expose getStoreValue and setStoreValue"
  );
  assert(
    homeCode.includes("checkAndShowF11Toast"),
    "home.js must implement checkAndShowF11Toast"
  );

  console.log(
    "✓ Avatar catalog, login error handling, PIN controller, Full Hero Banner, and F11 Fullscreen tests passed!"
  );
}

if (require.main === module) {
  runAvatarAndAuthTests();
}

module.exports = { runAvatarAndAuthTests };
