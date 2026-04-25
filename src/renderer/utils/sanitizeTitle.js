/**
 * Advanced Title Sanitization Engine for Crispyroll
 * Strips markdown symbols, guillemets << >> / « », Japanese brackets 《 》 / 『 』,
 * language/audio tags, release quality metadata, trailing/explanatory tilde clauses,
 * and messy decorative punctuation while preserving legitimate series subtitles.
 */

function sanitizeTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== "string") return "";

  let title = rawTitle;

  // 1. Strip Markdown links: [Text](URL) -> Text
  title = title.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // 2. Strip Markdown formatting: ***bold-italic***, **bold**, *italic*, __bold__, _italic_, ~~strike~~, `code`
  title = title.replace(/\*{1,3}([^\*]+)\*{1,3}/g, "$1");
  title = title.replace(/_{1,3}([^_]+)_{1,3}/g, "$1");
  title = title.replace(/~~([^~]+)~~/g, "$1");
  title = title.replace(/`([^`]+)`/g, "$1");

  // 3. Strip leading Markdown headers (# ), blockquotes (> ), or list markers
  title = title.replace(/^[\s>#\-*+]+(?=[A-Za-z0-9])/g, "");

  // 4. Unwrap / strip all forms of angle brackets and guillemets wherever they appear:
  // <<Text>>, <Text>, «Text», 《Text》, 〈Text〉, 『Text』, 「Text」
  title = title.replace(/<<\s*([^>]+?)\s*>>/g, "$1");
  title = title.replace(/[«《〈『「]\s*([^»》〉』」]+?)\s*[»》〉』」]/g, "$1");
  title = title.replace(/[«»《》〈〉『』「」‹›]|<<|>>/g, "");

  // 5. Strip trailing or standalone tilde-wrapped explanatory clauses (common in LN subtitles like ~About that time...~)
  title = title.replace(/\s*~[^~]+~\s*$/g, "");
  title = title.replace(/\s*～[^～]+～\s*$/g, "");

  // 6. Strip language & audio tags inside parentheses or brackets
  title = title.replace(
    /\s*[\(\[]\s*(?:[A-Za-z\s]+Dub(?:bed)?|Sub(?:bed)?|Sub\s*&\s*Dub|Dual\s*Audio|Multi-Audio|Simulcast|English|Japanese|Spanish|Portuguese|French|German|Italian|Russian|Hindi|Arabic|Castilian|Latin\s*Spanish|Brazilian\s*Portuguese|Castellano)\s*[\)\]]/gi,
    ""
  );

  // 7. Strip release & quality metadata
  title = title.replace(
    /\s*[\(\[]\s*(?:1080p|720p|480p|4k|UHD|FHD|HD|TV|UNCUT|Uncut|Clean|Batch|Special|OVA|OAD|Movie|The\s*Movie|Preview|Recap|Dub|Sub)\s*[\)\]]/gi,
    ""
  );

  // 8. Strip dangling audio suffixes like " - English Dub" or " (Dub)"
  title = title.replace(
    /\s*[-–—]\s*(?:English|Japanese|Spanish|Portuguese|French|German|Italian|Russian|Hindi|Arabic|Castilian|Latin\s*Spanish|Brazilian\s*Portuguese)?\s*(?:Dub(?:bed)?|Sub(?:bed)?)\b/gi,
    ""
  );

  // 9. Remove empty brackets/parentheses left behind
  title = title.replace(/\s*[\(\[]\s*[\)\]]/g, "");

  // 10. Clean up leading & trailing punctuation (dashes, tildes, colons, spaces, quotes)
  title = title.replace(/^[\s\-–—~～:："'`«»《》〈〉]+|[\s\-–—~～:："'`«»《》〈〉]+$/g, "");

  // 11. Normalize multiple spaces
  title = title.replace(/\s{2,}/g, " ").trim();

  return title || rawTitle;
}

if (typeof window !== "undefined") {
  window.sanitizeTitle = sanitizeTitle;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { sanitizeTitle };
}
