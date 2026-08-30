/**
 * Standalone Test Suite Runner
 */

const { testGamepadMappings } = require("./gamepad.test");
const { testTranslateEngine } = require("./translate.test");
const { testMappers } = require("./mappers.test");

function runAllTests() {
  console.log("=========================================");
  console.log("Running Crunchyroll Linux Test Suite...");
  console.log("=========================================");

  try {
    testGamepadMappings();
    testTranslateEngine();
    testMappers();
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
