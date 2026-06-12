const http = require("node:http");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { URL } = require("node:url");

const root = __dirname;
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const maxBodyBytes = 48 * 1024 * 1024;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8"
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(Object.assign(new Error("Request body is too large."), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function cleanObject(input) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function authHeaders(req) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    const error = new Error("Please bind an API key first.");
    error.status = 401;
    throw error;
  }

  const headers = {
    authorization: `Bearer ${apiKey}`
  };
  if (req.headers["x-openai-organization"]) {
    headers["openai-organization"] = String(req.headers["x-openai-organization"]);
  }
  if (req.headers["x-openai-project"]) {
    headers["openai-project"] = String(req.headers["x-openai-project"]);
  }
  return headers;
}

function localAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${port}`);
}

function providerBaseUrl(req) {
  const value = String(req.headers["x-api-base-url"] || "https://api.openai.com/v1").trim();
  let url;
  try {
    url = new URL(value);
  } catch {
    const error = new Error("API Base URL is invalid.");
    error.status = 400;
    throw error;
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    const error = new Error("API Base URL must start with http:// or https://.");
    error.status = 400;
    throw error;
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

function imageEndpoint(req, route) {
  const base = providerBaseUrl(req);
  const pathname = base.pathname || "";
  if (pathname.endsWith("/images/generations") || pathname.endsWith("/images/edits")) {
    base.pathname = pathname.replace(/\/images\/(generations|edits)$/, `/images/${route}`);
  } else {
    base.pathname = `${pathname}/images/${route}`.replace(/\/{2,}/g, "/");
  }
  return base.toString();
}

function providerEndpoint(req, route) {
  const base = providerBaseUrl(req);
  const pathname = base.pathname || "";
  base.pathname = `${pathname}/${route}`.replace(/\/{2,}/g, "/");
  return base.toString();
}

function readableProviderError(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return "The provider returned an empty response.";
  const title = cleanText.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  if (title) return `Provider returned HTML error: ${title}`;
  if (/^\s*</.test(cleanText)) return "Provider returned an HTML error page instead of JSON.";
  return cleanText.slice(0, 800);
}

function dataUrlToBlob(file) {
  if (!file || typeof file.dataUrl !== "string") {
    throw Object.assign(new Error("上传图片格式无效。"), { status: 400 });
  }
  const match = file.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw Object.assign(new Error("上传图片必须是 base64 data URL。"), { status: 400 });
  }
  const bytes = Buffer.from(match[2], "base64");
  return {
    blob: new Blob([bytes], { type: match[1] }),
    name: file.name || `image.${match[1].split("/")[1] || "png"}`
  };
}

async function callOpenAI(req, payload) {
  const headers = authHeaders(req);
  const hasEditInputs = Array.isArray(payload.images) && payload.images.length > 0;
  const endpoint = imageEndpoint(req, hasEditInputs ? "edits" : "generations");

  let response;
  if (hasEditInputs) {
    const form = new FormData();
    const fields = cleanObject({
      model: payload.model,
      prompt: payload.prompt,
      n: payload.n,
      size: payload.size,
      quality: payload.quality,
      background: payload.background,
      output_format: payload.output_format,
      output_compression: payload.output_compression,
      input_fidelity: payload.input_fidelity,
      moderation: payload.moderation
    });
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, String(value));
    }
    for (const image of payload.images) {
      const { blob, name } = dataUrlToBlob(image);
      form.append("image[]", blob, name);
    }
    if (payload.mask?.dataUrl) {
      const { blob, name } = dataUrlToBlob(payload.mask);
      form.append("mask", blob, name);
    }
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: form
    });
  } else {
    const body = cleanObject({
      model: payload.model,
      prompt: payload.prompt,
      n: payload.n,
      size: payload.size,
      quality: payload.quality,
      background: payload.background,
      output_format: payload.output_format,
      output_compression: payload.output_compression,
      moderation: payload.moderation
    });
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...headers,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });
  }

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: { message: readableProviderError(text) } };
  }

  if (!response.ok) {
    const message = data?.error?.message || `OpenAI API 请求失败：${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const format = payload.output_format || "png";
  if (Array.isArray(data.data)) {
    data.data = data.data.map((item) => ({
      ...item,
      dataUrl: item.b64_json ? `data:image/${format};base64,${item.b64_json}` : item.url
    }));
  }
  return data;
}

async function testProvider(req) {
  const response = await fetch(providerEndpoint(req, "models"), {
    method: "GET",
    headers: authHeaders(req)
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: { message: readableProviderError(text) } };
  }
  if (!response.ok) {
    const error = new Error(data?.error?.message || `接口测试失败：${response.status}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return {
    ok: true,
    models: Array.isArray(data.data) ? data.data.slice(0, 12).map((item) => item.id || item.name).filter(Boolean) : []
  };
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const decoded = decodeURIComponent(requested);
  const filePath = path.normalize(path.join(publicDir, decoded));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": mimeTypes[ext] || "application/octet-stream",
      "cache-control": "no-cache"
    });
    res.end(file);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        local: `http://localhost:${port}`,
        lan: host === "0.0.0.0" ? localAddresses() : []
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/images") {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      if (!payload.prompt || String(payload.prompt).trim().length < 2) {
        sendJson(res, 400, { error: "请输入提示词。" });
        return;
      }
      const data = await callOpenAI(req, payload);
      sendJson(res, 200, data);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/test") {
      const data = await testProvider(req);
      sendJson(res, 200, data);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      await serveStatic(req, res, url.pathname);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, error.status || 500, {
      error: error.message || "Server error",
      details: error.details
    });
  }
});

server.listen(port, host, () => {
  console.log(`Image2 Studio running at http://localhost:${port}`);
  if (host === "0.0.0.0") {
    for (const address of localAddresses()) {
      console.log(`LAN access: ${address}`);
    }
  }
});
