/**
 * ESBuild Bundler Script for Renderer
 */

const esbuild = require("esbuild");
const path = require("path");

async function buildRenderer() {
  await esbuild.build({
    entryPoints: [path.join(__dirname, "../src/renderer/index-module.js")],
    bundle: true,
    outfile: path.join(__dirname, "../src/renderer/bundle.js"),
    format: "iife",
    platform: "browser",
    sourcemap: true,
  });
  console.log("✓ ESBuild: Renderer bundle generated successfully at src/renderer/bundle.js");
}

if (require.main === module) {
  buildRenderer().catch((err) => {
    console.error("ESBuild Error:", err);
    process.exit(1);
  });
}

module.exports = { buildRenderer };
