/**
 * ESBuild Bundler Script for Renderer
 */

const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

async function buildRenderer(options = {}) {
  const isProd = process.env.NODE_ENV === "production" || options.minify;
  const startTime = Date.now();
  const outfile = path.join(__dirname, "../src/renderer/bundle.js");

  await esbuild.build({
    entryPoints: [path.join(__dirname, "../src/renderer/index-module.js")],
    bundle: true,
    outfile,
    format: "iife",
    platform: "browser",
    sourcemap: !isProd,
    minify: true,
    legalComments: "none",
  });

  const stat = fs.statSync(outfile);
  const sizeKb = (stat.size / 1024).toFixed(1);
  const durationMs = Date.now() - startTime;
  console.log(`✓ ESBuild: Renderer bundle generated (${sizeKb} KB) in ${durationMs}ms`);
}

if (require.main === module) {
  buildRenderer().catch((err) => {
    console.error("ESBuild Error:", err);
    process.exit(1);
  });
}

module.exports = { buildRenderer };
