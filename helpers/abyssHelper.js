const FormData = require("form-data");
const fs = require("fs");

const API = () => process.env.ABYSS_API_BASE || "https://api.abyss.to";
const UP = () => process.env.ABYSS_UPLOAD_BASE || "http://up.abyss.to";
const PLAYER = () => process.env.ABYSS_PLAYER_BASE || "https://abyss.to";
const KEY = () => process.env.ABYSS_API_KEY;

// ─────────────────────────────────────────────
//  UPLOAD VIDEO
// ─────────────────────────────────────────────

/**
 * Upload a video file to Abyss.to.
 * @param {string} filePath - absolute path on disk (from multer)
 * @param {string} filename - original filename
 * @returns {Promise<{ slug: string }>}
 */
const uploadVideo = async (filePath, filename) => {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), filename);

  const res = await fetch(`${UP()}/${KEY()}`, {
    method: "POST",
    headers: form.getHeaders(),
    body: form,
    duplex: "half", // required for streaming request bodies
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Abyss upload failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  if (!data.slug) throw new Error("Abyss upload: no slug returned");
  return { slug: data.slug };
};

/**
 * Upload subtitle file for a video.
 */
const uploadSubtitle = async (fileId, buffer, language, filename) => {
  const qs = new URLSearchParams({
    key: KEY(),
    language,
    filename,
  }).toString();

  const res = await fetch(`${API()}/v1/upload/subtitles/${fileId}?${qs}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Subtitle upload failed: ${res.status} ${text}`);
  }
  return await res.json();
};

// ─────────────────────────────────────────────
//  FILE INFO / DELETE
// ─────────────────────────────────────────────

const getFile = async (id) => {
  const res = await fetch(`${API()}/v1/files/${id}?key=${KEY()}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Abyss get file failed: ${res.status} ${text}`);
  }
  return await res.json();
};

const deleteFile = async (id) => {
  try {
    const res = await fetch(`${API()}/v1/files/${id}?key=${KEY()}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (_) {
    return false;
  }
};

const listSubtitles = async (fileId) => {
  const res = await fetch(`${API()}/v1/subtitles/${fileId}/list?key=${KEY()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
};

const deleteSubtitle = async (subtitleId) => {
  try {
    const res = await fetch(
      `${API()}/v1/subtitles/${subtitleId}?key=${KEY()}`,
      { method: "DELETE" },
    );
    return res.ok;
  } catch (_) {
    return false;
  }
};

// ─────────────────────────────────────────────
//  PLAYBACK URLS
// ─────────────────────────────────────────────

/** Public embed URL (use in a WebView). */
const getEmbedUrl = (slug) => `${PLAYER()}/e/${slug}`;

/** Direct download link (best-effort). */
const getDownloadUrl = (slug) => `${PLAYER()}/d/${slug}`;

/**
 * Best-effort extraction of a direct stream URL from the embed page.
 * Abyss may change their HTML structure — update regex if broken.
 */
const resolveDirectStreamUrl = async (slug) => {
  try {
    const res = await fetch(getEmbedUrl(slug), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: PLAYER(),
      },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const patterns = [
      /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i,
      /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/i,
      /sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/i,
      /src\s*:\s*"([^"]+\.mp4[^"]*)"/i,
    ];

    for (const p of patterns) {
      const m = html.match(p);
      if (m) return m[1] || m[0];
    }
    return null;
  } catch (_) {
    return null;
  }
};

/**
 * Full stream descriptor used by the mobile player.
 */
const getStreamInfo = async (slug) => {
  const embedUrl = getEmbedUrl(slug);
  const directUrl = await resolveDirectStreamUrl(slug);
  return {
    slug,
    embedUrl,
    directUrl,
    isReady: !!directUrl,
  };
};

module.exports = {
  uploadVideo,
  uploadSubtitle,
  getFile,
  deleteFile,
  listSubtitles,
  deleteSubtitle,
  getEmbedUrl,
  getDownloadUrl,
  resolveDirectStreamUrl,
  getStreamInfo,
};
