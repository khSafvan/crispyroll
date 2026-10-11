/**
 * Formatting Utilities (Crispyroll)
 * Pure formatting helpers for durations, episode numbers, scores, and dates.
 */

/**
 * Formats seconds into HH:MM:SS or MM:SS timestamp.
 *
 * @param {number} totalSeconds
 * @param {boolean} [alwaysIncludeHours=false]
 * @returns {string} Formatted timestamp string (e.g. "23:45" or "01:23:45").
 */
export function formatDuration(totalSeconds, alwaysIncludeHours = false) {
  if (typeof totalSeconds !== "number" || isNaN(totalSeconds) || totalSeconds < 0) {
    return "00:00";
  }

  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);

  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

  if (h > 0 || alwaysIncludeHours) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Formats episode identifier string (e.g., 1 -> "E1", 12 -> "E12", 0.5 -> "E0.5").
 *
 * @param {number|string} ep
 * @returns {string} Formatted episode tag (e.g. "E12").
 */
export function formatEpisodeNumber(ep) {
  if (ep == null || ep === "") return "";
  const numStr = String(ep).trim();
  if (/^e?\d+/i.test(numStr)) {
    return numStr.toUpperCase().startsWith("E") ? numStr.toUpperCase() : `E${numStr}`;
  }
  return `E${numStr}`;
}

/**
 * Formats score badge text and rating percentage.
 *
 * @param {number|string} score Score value (0-10 or 0-100).
 * @returns {{ display: string, percentage: number, tier: "high"|"mid"|"low" }}
 */
export function formatScore(score) {
  if (score == null || score === "" || isNaN(Number(score))) {
    return { display: "N/A", percentage: 0, tier: "low" };
  }

  const num = Number(score);
  let percentage = num;
  let display = "";

  if (num <= 10) {
    percentage = Math.round(num * 10);
    display = `⭐ ${num.toFixed(1)}`;
  } else {
    percentage = Math.round(num);
    display = `⭐ ${(num / 10).toFixed(1)}`;
  }

  let tier = "low";
  if (percentage >= 75) {
    tier = "high";
  } else if (percentage >= 60) {
    tier = "mid";
  }

  return { display, percentage, tier };
}

/**
 * Formats ISO date string or timestamp into relative human-readable format.
 *
 * @param {string|number|Date} date
 * @returns {string} Relative time string (e.g. "2h ago", "3d ago", "Just now").
 */
export function formatRelativeDate(date) {
  if (!date) return "";
  const timestamp = new Date(date).getTime();
  if (isNaN(timestamp)) return "";

  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Global browser window attachment
if (typeof window !== "undefined") {
  window.utils = window.utils || {};
  window.utils.formatDuration = formatDuration;
  window.utils.formatEpisodeNumber = formatEpisodeNumber;
  window.utils.formatScore = formatScore;
  window.utils.formatRelativeDate = formatRelativeDate;
}
