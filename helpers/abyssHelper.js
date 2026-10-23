const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const API = () => process.env.ABYSS_API_BASE || "https://api.abyss.to";
const UP = () => process.env.ABYSS_UPLOAD_BASE || "http://up.abyss.to";
const PLAYER = () => process.env.ABYSS_PLAYER_BASE || "https://abyss.to";
const KEY = () => process.env.ABYSS_API_KEY;

// ─────────────────────────────────────────────
//  UPLOAD VIDEO  (axios handles streams correctly)
// ─────────────────────────────────────────────
const uploadVideo = async (filePath, filename) => {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), {
    filename,
    contentType: "application/octet-stream",
  });

  const url = `${UP()}/${KEY()}`;

  let response;
  try {
    response = await axios.post(url, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 0,
      validateStatus: () => true,
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    throw new Error(
      `Abyss upload network error: ${
        typeof detail === "string" ? detail : JSON.stringify(detail)
      }`,
    );
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Abyss upload failed (${response.status}): ${JSON.stringify(response.data)}`,
    );
  }

  const data = response.data;
  if (!data || !data.slug) {
    throw new Error(`Abyss upload: no slug returned → ${JSON.stringify(data)}`);
  }
  return { slug: data.slug };
};

// ─────────────────────────────────────────────
//  UPLOAD SUBTITLE
// ─────────────────────────────────────────────
const uploadSubtitle = async (fileId, buffer, language, filename) => {
  const url =
    `${API()}/v1/upload/subtitles/${fileId}` +
    `?key=${encodeURIComponent(KEY())}` +
    `&language=${encodeURIComponent(language)}` +
    `&filename=${encodeURIComponent(filename)}`;

  const response = await axios.put(url, buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      Authorization: `Bearer ${KEY()}`,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Subtitle upload failed (${response.status}): ${JSON.stringify(response.data)}`,
    );
  }
  return response.data;
};

// ─────────────────────────────────────────────
//  FILE INFO / DELETE
// ─────────────────────────────────────────────
const getFile = async (id) => {
  const response = await axios.get(`${API()}/v1/files/${id}`, {
    params: { key: KEY() },
    validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Abyss get file failed (${response.status}): ${JSON.stringify(response.data)}`,
    );
  }
  return response.data;
};

const deleteFile = async (id) => {
  try {
    const response = await axios.delete(`${API()}/v1/files/${id}`, {
      params: { key: KEY() },
      validateStatus: () => true,
    });
    return response.status >= 200 && response.status < 300;
  } catch (_) {
    return false;
  }
};

const listSubtitles = async (fileId) => {
  const response = await axios.get(`${API()}/v1/subtitles/${fileId}/list`, {
    params: { key: KEY() },
    validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) return [];
  return response.data.items || [];
};

const deleteSubtitle = async (subtitleId) => {
  try {
    const response = await axios.delete(`${API()}/v1/subtitles/${subtitleId}`, {
      params: { key: KEY() },
      validateStatus: () => true,
    });
    return response.status >= 200 && response.status < 300;
  } catch (_) {
    return false;
  }
};

// ─────────────────────────────────────────────
//  QUOTA / ABOUT
// ─────────────────────────────────────────────
const getAbout = async () => {
  const response = await axios.get(`${API()}/v1/about`, {
    params: { key: KEY() },
    validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Abyss /about failed (${response.status}): ${JSON.stringify(response.data)}`,
    );
  }
  return response.data;
};

// ─────────────────────────────────────────────
//  PLAYBACK URLS
// ─────────────────────────────────────────────
const getEmbedUrl = (slug) => `${PLAYER()}/e/${slug}`;
const getDownloadUrl = (slug) => `${PLAYER()}/d/${slug}`;

const resolveDirectStreamUrl = async (slug) => {
  try {
    const response = await axios.get(getEmbedUrl(slug), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: PLAYER(),
      },
      timeout: 15000,
      validateStatus: () => true,
    });
    if (response.status !== 200) return null;

    const html = response.data;
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

const getStreamInfo = async (slug) => {
  const embedUrl = getEmbedUrl(slug);
  const directUrl = await resolveDirectStreamUrl(slug);
  return { slug, embedUrl, directUrl, isReady: !!directUrl };
};

module.exports = {
  uploadVideo,
  uploadSubtitle,
  getFile,
  deleteFile,
  listSubtitles,
  deleteSubtitle,
  getAbout,
  getEmbedUrl,
  getDownloadUrl,
  resolveDirectStreamUrl,
  getStreamInfo,
};
