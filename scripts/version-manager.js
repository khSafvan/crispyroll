#!/usr/bin/env node

/**
 * Crispyroll Automated Version Calculator & Release Manager
 *
 * Deterministically computes versioning by:
 * 1. Reading PLANS.md for milestone target and checklist completion ([x] vs [ ]).
 * 2. Reading RELEASES.md for the JSON array of past releases.
 * 3. Computing the semantic version tag (Alpha, Beta, RC, or Stable).
 * 4. Synchronizing package.json, package-lock.json, and RELEASES.md without requiring AI.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const PLANS_FILE = path.join(ROOT_DIR, "PLANS.md");
const RELEASES_FILE = path.join(ROOT_DIR, "RELEASES.md");
const PACKAGE_FILE = path.join(ROOT_DIR, "package.json");
const PACKAGE_LOCK_FILE = path.join(ROOT_DIR, "package-lock.json");

function extractReleasesArray(markdownText) {
  const jsonMatch = markdownText.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    return [];
  }
  try {
    return JSON.parse(jsonMatch[1]);
  } catch (err) {
    console.error("❌ Failed to parse JSON array in RELEASES.md:", err.message);
    return [];
  }
}

function updateReleasesMarkdown(originalText, releasesArray) {
  const jsonBlock = "```json\n" + JSON.stringify(releasesArray, null, 2) + "\n```";
  if (originalText.includes("```json")) {
    return originalText.replace(/```json\s*[\s\S]*?\s*```/, jsonBlock);
  }
  return originalText + "\n\n" + jsonBlock + "\n";
}

function main() {
  if (!fs.existsSync(PLANS_FILE)) {
    console.error("❌ PLANS.md file not found at:", PLANS_FILE);
    process.exit(1);
  }
  if (!fs.existsSync(RELEASES_FILE)) {
    console.error("❌ RELEASES.md file not found at:", RELEASES_FILE);
    process.exit(1);
  }

  // 1. Parse PLANS.md
  const plansContent = fs.readFileSync(PLANS_FILE, "utf-8");
  const milestoneMatch =
    plansContent.match(/Milestone Target:\s*`?v?(\d+\.\d+\.\d+)`?/i) ||
    plansContent.match(/milestone:\s*["']?v?(\d+\.\d+\.\d+)["']?/i);
  const milestone = milestoneMatch ? milestoneMatch[1] : "0.1.0";

  const completedTasks = (plansContent.match(/-\s*\[x\]/gi) || []).length;
  const pendingTasks = (plansContent.match(/-\s*\[ \]/gi) || []).length;
  const totalTasks = completedTasks + pendingTasks;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  // 2. Parse RELEASES.md
  const releasesContent = fs.readFileSync(RELEASES_FILE, "utf-8");
  const releases = extractReleasesArray(releasesContent);

  // Count past releases matching this milestone
  const milestoneReleases = releases.filter(
    (r) => r.milestone === milestone || r.version.startsWith(milestone)
  );
  const nextIteration = milestoneReleases.length + 1;

  // 3. Compute Semantic Version
  let computedVersion = milestone;
  let releaseType = "stable";

  if (completionPercent < 50) {
    computedVersion = `${milestone}-alpha.${nextIteration}`;
    releaseType = "alpha";
  } else if (completionPercent < 80) {
    computedVersion = `${milestone}-beta.${nextIteration}`;
    releaseType = "beta";
  } else if (completionPercent < 100) {
    computedVersion = `${milestone}-rc.${nextIteration}`;
    releaseType = "pre-release";
  } else {
    computedVersion = milestone;
    releaseType = "stable";
  }

  console.log("=========================================");
  console.log(`📊 Crispyroll Deterministic Version Calculator`);
  console.log(`- Target Milestone:    v${milestone}`);
  console.log(`- Checklist Progress:  ${completedTasks}/${totalTasks} tasks (${completionPercent}%)`);
  console.log(`- Past Releases Count: ${releases.length} total (${milestoneReleases.length} in v${milestone})`);
  console.log(`- Computed Version:    ${computedVersion} [${releaseType}]`);
  console.log("=========================================");

  // 4. Update package.json
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_FILE, "utf-8"));
  const previousVersion = pkg.version;
  pkg.version = computedVersion;
  fs.writeFileSync(PACKAGE_FILE, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  console.log(`✓ Updated package.json: ${previousVersion} -> ${computedVersion}`);

  // 5. Update package-lock.json
  if (fs.existsSync(PACKAGE_LOCK_FILE)) {
    try {
      const pkgLock = JSON.parse(fs.readFileSync(PACKAGE_LOCK_FILE, "utf-8"));
      pkgLock.version = computedVersion;
      if (pkgLock.packages && pkgLock.packages[""]) {
        pkgLock.packages[""].version = computedVersion;
      }
      fs.writeFileSync(PACKAGE_LOCK_FILE, JSON.stringify(pkgLock, null, 2) + "\n", "utf-8");
      console.log(`✓ Updated package-lock.json: ${computedVersion}`);
    } catch {
      try {
        execSync("npm install --package-lock-only", { cwd: ROOT_DIR, stdio: "ignore" });
      } catch {
        // Ignore fallback error
      }
    }
  }

  // 6. Update RELEASES.md array if new entry
  const latestEntry = releases[0];
  const today = new Date().toISOString().split("T")[0];

  if (!latestEntry || latestEntry.version !== computedVersion) {
    const newEntry = {
      version: computedVersion,
      date: today,
      type: releaseType,
      milestone: milestone,
      notes: `Automated progress build: ${completedTasks}/${totalTasks} tasks (${completionPercent}%) completed towards v${milestone}.`
    };
    releases.unshift(newEntry);
    const updatedMarkdown = updateReleasesMarkdown(releasesContent, releases);
    fs.writeFileSync(RELEASES_FILE, updatedMarkdown, "utf-8");
    console.log(`✓ Added ${computedVersion} entry to RELEASES.md array`);
  } else {
    console.log(`✓ RELEASES.md already up to date with version ${computedVersion}`);
  }

  console.log("=========================================\n");
}

main();
