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

  // 4. Verify avatar picker extracts avatar keys and provides fallback
  assert(
    profilesCode.includes("DEFAULT_AVATARS") &&
      profilesCode.includes("data-avatar") &&
      profilesCode.includes("createScreen.selectedAvatar"),
    "profiles.js must provide standard avatar catalog and wire selectedAvatar"
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
      homeCode.includes("getRowIcon") &&
      homeCode.includes("row-title-icon"),
    "home.js must implement Full Hero Banner with click-to-open and Category Row Icons"
  );

  assert(
    homeCss.includes(".hero-full-banner") &&
      homeCss.includes(".row-title-icon") &&
      homeCss.includes("aspect-ratio: 2 / 3 !important") &&
      homeCss.includes("aspect-ratio: 16 / 9 !important"),
    "home.css must enforce full banner layout, row title icons, and 2:3 / 16:9 card aspect ratios"
  );

  assert(
    exitCss.includes("z-index: 999999 !important;"),
    "exit.css must set exit-screen z-index to 999999 for highest stacking context"
  );

  console.log(
    "✓ Avatar catalog, login error handling, PIN controller, Full Hero Banner, and Row Title Icons tests passed!"
  );
}

if (require.main === module) {
  runAvatarAndAuthTests();
}

module.exports = { runAvatarAndAuthTests };
