/**
 * Standalone Test Suite Runner
 */

const { testGamepadMappings } = require("./gamepad.test");
const { testTranslateEngine } = require("./translate.test");
const { testMappers } = require("./mappers.test");
const { testWidevineModule } = require("./widevine.test");
const { testKeysModule } = require("./keys.test");
const { testDomAndArchitecture } = require("./dom.test");
const { testStoreModule } = require("./store.test");
const { testVideoServiceContract } = require("./video.test");
const { testProfilesScreenAndPinGating } = require("./profiles.test");
const { testLoginValidation } = require("./auth.test");
const { testEpisodesAndDetailsDom } = require("./episodes.test");
const { runAvatarAndAuthTests } = require("./avatar-and-auth.test");

async function runAllTests() {
  console.log("=========================================");
  console.log("Running Crispyroll Test Suite...");
  console.log("=========================================");

  try {
    testGamepadMappings();
    testTranslateEngine();
    testMappers();
    testWidevineModule();
    testKeysModule();
    testDomAndArchitecture();
    testStoreModule();
    testVideoServiceContract();
    testProfilesScreenAndPinGating();
    testLoginValidation();
    testEpisodesAndDetailsDom();
    await runAvatarAndAuthTests();
    console.log("=========================================");
    console.log("All unit tests completed successfully! 🎉");
    console.log("=========================================");
  } catch (error) {
    console.error("❌ Test failure:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
