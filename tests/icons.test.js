const assert = require("assert");
const fs = require("fs");
const path = require("path");

function testIconsModule() {
  console.log("Testing Phosphor Icons Module (src/renderer/core/icons.js)...");

  // Load icons.js into a mocked global window context
  global.window = global.window || {};
  const iconsCode = fs.readFileSync(
    path.join(__dirname, "../src/renderer/core/icons.js"),
    "utf8"
  );
  eval(iconsCode);

  assert(global.window.icons, "window.icons must be defined");
  assert.strictEqual(typeof global.window.icons.get, "function", "window.icons.get must be a function");
  assert.strictEqual(typeof global.window.icons.getRowIcon, "function", "window.icons.getRowIcon must be a function");

  // Test standard icon lookup
  const houseRegular = global.window.icons.get("house");
  assert(houseRegular.includes("<svg"), "House icon must contain <svg tag");
  assert(houseRegular.includes('viewBox="0 0 256 256"'), "House icon must have Phosphor viewBox");
  assert(houseRegular.includes('width="24"'), "Default size must be 24");
  assert(houseRegular.includes('fill="currentColor"'), "Default fill must be currentColor");

  // Test fill weight
  const houseFill = global.window.icons.get("house", { weight: "fill", size: 32, className: "custom-class" });
  assert(houseFill.includes('width="32"'), "Custom size must be 32");
  assert(houseFill.includes('class="ph-icon ph-fill custom-class"'), "Class name must include custom class");
  assert(houseFill !== houseRegular, "Fill and regular weights should produce different SVG paths");

  // Test aliases (e.g. magnifyingGlass vs magnifying-glass / search)
  const searchAlias = global.window.icons.get("search");
  const glassDirect = global.window.icons.get("magnifyingGlass");
  assert(searchAlias.includes("<svg"), "Alias 'search' must resolve to SVG");
  assert(glassDirect.includes("<svg"), "Direct lookup 'magnifyingGlass' must resolve to SVG");

  // Test getRowIcon mapping logic
  const continueIcon = global.window.icons.getRowIcon("Continue Watching", "episode");
  assert(continueIcon.includes("<svg"), "Continue Watching row must return SVG");

  const popularIcon = global.window.icons.getRowIcon("Top Popular Series", "serie");
  assert(popularIcon.includes("<svg"), "Popular row must return SVG");

  const simulcastIcon = global.window.icons.getRowIcon("New Simulcasts This Season", "serie");
  assert(simulcastIcon.includes("<svg"), "Simulcasts row must return SVG");

  const romanceIcon = global.window.icons.getRowIcon("Romance & Drama", "serie");
  assert(romanceIcon.includes("<svg"), "Romance row must return SVG");

  const fallbackIcon = global.window.icons.getRowIcon("Uncategorized Content", "serie");
  assert(fallbackIcon.includes("<svg"), "Unknown row title must fallback to default SVG");

  // Test invalid icon fallback
  const nonExistent = global.window.icons.get("completelyNonExistentIconNameXYZ");
  assert.strictEqual(nonExistent, "", "Non-existent icon should return empty string");

  // Test Carbon Icons (Player OSD / 32x32)
  const carbonPlay = global.window.icons.carbon.get("play");
  assert(carbonPlay.includes('viewBox="0 0 32 32"'), "Carbon play must have 32x32 viewBox");
  assert(carbonPlay.includes("carbon-icon"), "Carbon icon must have carbon-icon class");

  const carbonSkip = global.window.icons.get("carbon:skipForward", { size: 20 });
  assert(carbonSkip.includes('viewBox="0 0 32 32"'), "Prefixed carbon lookup must work");
  assert(carbonSkip.includes('width="20"'), "Carbon icon size must be applied");

  // Test Radix Icons (Micro-UI / 15x15)
  const radixSearch = global.window.icons.radix.get("magnifyingGlass");
  assert(radixSearch.includes('viewBox="0 0 15 15"'), "Radix search must have 15x15 viewBox");
  assert(radixSearch.includes("radix-icon"), "Radix icon must have radix-icon class");

  const radixEye = global.window.icons.get("radix:eyeOpen");
  assert(radixEye.includes('viewBox="0 0 15 15"'), "Prefixed radix eyeOpen must work");

  const radixArrow = global.window.icons.get("radix:arrowLeft");
  assert(radixArrow.includes('viewBox="0 0 15 15"'), "Prefixed radix arrowLeft must work");

  // Test Heroicons Solid (Primary CTAs / 24x24)
  const heroPlay = global.window.icons.heroiconsSolid.get("play");
  assert(heroPlay.includes('viewBox="0 0 24 24"'), "Heroicons solid play must have 24x24 viewBox");
  assert(heroPlay.includes("heroicon-solid"), "Heroicon must have heroicon-solid class");

  const heroBookmark = global.window.icons.get("heroiconsSolid:bookmark");
  assert(heroBookmark.includes('viewBox="0 0 24 24"'), "Prefixed heroiconsSolid bookmark must work");

  // Test Phosphor Search & Star
  const phosphorSearch = global.window.icons.phosphor.get("magnifyingGlass", { weight: "fill", size: 22 });
  assert(phosphorSearch.includes('viewBox="0 0 256 256"'), "Phosphor search must have 256x256 viewBox");
  assert(phosphorSearch.includes("ph-fill"), "Phosphor fill search must have ph-fill class");

  const phosphorStar = global.window.icons.phosphor.get("star", { weight: "fill", size: 12 });
  assert(phosphorStar.includes('viewBox="0 0 256 256"'), "Phosphor star must have 256x256 viewBox");

  // Test Streaming Content Icons
  const lightningIcon = global.window.icons.get("lightning");
  assert(lightningIcon.includes("<svg"), "Lightning action icon must resolve");

  const slateIcon = global.window.icons.get("filmSlate");
  assert(slateIcon.includes("<svg"), "FilmSlate fallback icon must resolve");

  const headphonesIcon = global.window.icons.get("headphones");
  assert(headphonesIcon.includes("<svg"), "Headphones DUB icon must resolve");

  const ccIcon = global.window.icons.get("closedCaptioning");
  assert(ccIcon.includes("<svg"), "ClosedCaptioning SUB icon must resolve");

  const meterIcon = global.window.icons.get("carbon:meter");
  assert(meterIcon.includes('viewBox="0 0 32 32"'), "Carbon meter speed icon must resolve");

  // Test Brand Icons (AniList, MAL, Kitsu)
  const alIcon = global.window.icons.get("anilist");
  assert(alIcon.includes('viewBox="0 0 24 24"'), "AniList brand icon must resolve with 24x24 viewBox");
  assert(alIcon.includes("brand-icon"), "AniList brand icon must have brand-icon class");

  const malIcon = global.window.icons.get("brand:mal");
  assert(malIcon.includes('viewBox="0 0 24 24"'), "MAL brand icon must resolve with 24x24 viewBox");

  const kitsuIcon = global.window.icons.brand.get("kitsu");
  assert(kitsuIcon.includes('viewBox="0 0 24 24"'), "Kitsu brand icon must resolve with 24x24 viewBox");

  console.log("  ✓ Multi-Library Icons Module verified (Phosphor, Carbon, Radix, Heroicons Solid, and Brand Icons).");
}

module.exports = { testIconsModule };
