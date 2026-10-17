const jwt = require("jsonwebtoken");

const CF_API = "https://api.cloudflare.com/client/v4";

const authHeaders = () => ({
  Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
});

const jsonHeaders = () => ({
  ...authHeaders(),
  "Content-Type": "application/json",
});

// ─────────────────────────────────────────────
//  CLOUDFLARE STREAM  (videos)
// ─────────────────────────────────────────────

const createDirectUploadUrl = async ({
  maxDurationSeconds = 7200,
  creator = "finder",
  meta = {},
  requireSignedURLs = false,
  allowedOrigins = ["*"],
} = {}) => {
  const res = await fetch(
    `${CF_API}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        maxDurationSeconds,
        creator,
        meta,
        requireSignedURLs,
        allowedOrigins,
      }),
    },
  );

  const data = await res.json();
  if (!data.success) {
    const err = new Error(
      data.errors?.[0]?.message || "Stream upload URL failed",
    );
    err.status = 400;
    throw err;
  }
  return data.result; // { uploadURL, uid }
};

const uploadVideoFromUrl = async (
  url,
  meta = {},
  requireSignedURLs = false,
) => {
  const res = await fetch(
    `${CF_API}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ url, meta, requireSignedURLs }),
    },
  );

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || "Stream copy failed");
  }
  return data.result;
};

const getVideo = async (uid) => {
  const res = await fetch(
    `${CF_API}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
    { headers: authHeaders() },
  );
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || "Stream get failed");
  }
  return data.result;
};

const deleteVideo = async (uid) => {
  const res = await fetch(
    `${CF_API}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
    { method: "DELETE", headers: authHeaders() },
  );
  const data = await res.json();
  return data.success;
};

const getHlsUrl = (uid) =>
  `https://${process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN}/${uid}/manifest/video.m3u8`;

const getThumbnailUrl = (uid, time = "0s") =>
  `https://${process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN}/${uid}/thumbnails/thumbnail.jpg?time=${time}`;

const getDownloadUrl = (uid) =>
  `https://${process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN}/${uid}/downloads/default.mp4`;

const buildSignedToken = (uid, expiresInSeconds = 3600) => {
  const privateKey = (process.env.CLOUDFLARE_STREAM_SIGNING_KEY || "").replace(
    /\\n/g,
    "\n",
  );
  const kid = process.env.CLOUDFLARE_STREAM_SIGNING_KID;

  if (!privateKey || !kid) {
    throw new Error("Stream signing key not configured");
  }

  return jwt.sign(
    {
      sub: uid,
      kid,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    },
    privateKey,
    { algorithm: "RS256" },
  );
};

// ─────────────────────────────────────────────
//  CLOUDFLARE IMAGES  (posters, backdrops, ads)
// ─────────────────────────────────────────────

const uploadImage = async (buffer, filename = "image.jpg", metadata = {}) => {
  const form = new FormData();
  form.append("file", new Blob([buffer]), filename);

  if (metadata.creator) form.append("creator", metadata.creator);
  if (metadata.requireSignedURLs) {
    form.append("requireSignedURLs", "true");
  }

  const res = await fetch(
    `${CF_API}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    {
      method: "POST",
      headers: authHeaders(),
      body: form,
    },
  );

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || "Image upload failed");
  }
  return data.result;
};

const deleteImage = async (imageId) => {
  const res = await fetch(
    `${CF_API}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
    { method: "DELETE", headers: authHeaders() },
  );
  const data = await res.json();
  return data.success;
};

const getImage = async (imageId) => {
  const res = await fetch(
    `${CF_API}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
    { headers: authHeaders() },
  );
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || "Image get failed");
  }
  return data.result;
};

module.exports = {
  // Stream
  createDirectUploadUrl,
  uploadVideoFromUrl,
  getVideo,
  deleteVideo,
  getHlsUrl,
  getThumbnailUrl,
  getDownloadUrl,
  buildSignedToken,
  // Images
  uploadImage,
  deleteImage,
  getImage,
};
