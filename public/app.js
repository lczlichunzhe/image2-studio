const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const state = {
  mode: "generate",
  references: [],
  mask: null,
  history: [],
  settings: loadSettings()
};

const els = {
  connectionText: $("#connectionText"),
  openSettings: $("#openSettings"),
  settingsDialog: $("#settingsDialog"),
  providerName: $("#providerName"),
  apiBaseUrl: $("#apiBaseUrl"),
  apiKey: $("#apiKey"),
  organization: $("#organization"),
  project: $("#project"),
  rememberKey: $("#rememberKey"),
  saveKey: $("#saveKey"),
  forgetKey: $("#forgetKey"),
  testConnection: $("#testConnection"),
  openDocs: $("#openDocs"),
  themeSelect: $("#themeSelect"),
  quickSettings: $("#quickSettings"),
  modeGenerate: $("#modeGenerate"),
  modeEdit: $("#modeEdit"),
  modeBadge: $("#modeBadge"),
  prompt: $("#prompt"),
  avoid: $("#avoid"),
  preset: $("#preset"),
  polishPrompt: $("#polishPrompt"),
  model: $("#model"),
  customModel: $("#customModel"),
  count: $("#count"),
  size: $("#size"),
  resolutionTier: $("#resolutionTier"),
  quality: $("#quality"),
  promptOptimize: $("#promptOptimize"),
  width: $("#width"),
  height: $("#height"),
  background: $("#background"),
  format: $("#format"),
  compression: $("#compression"),
  moderation: $("#moderation"),
  inputFidelity: $("#inputFidelity"),
  generate: $("#generate"),
  resetForm: $("#resetForm"),
  referenceImages: $("#referenceImages"),
  referenceFolder: $("#referenceFolder"),
  maskImage: $("#maskImage"),
  refPreview: $("#refPreview"),
  maskPreview: $("#maskPreview"),
  clearRefs: $("#clearRefs"),
  clearMask: $("#clearMask"),
  results: $("#results"),
  history: $("#history"),
  historyCount: $("#historyCount"),
  historySearch: $("#historySearch"),
  historyFilter: $("#historyFilter"),
  clearResults: $("#clearResults"),
  clearHistory: $("#clearHistory"),
  statusText: $("#statusText"),
  progress: $("#progress"),
  costEstimate: $("#costEstimate")
};

const presets = {
  cinematic: "电影摄影，35mm 镜头，真实光影，细腻肤色，景深自然，色彩分级克制",
  product: "高端产品海报，干净布光，清晰边缘，材质真实，商业摄影构图",
  anime: "精致动画插画，动态姿态，干净线条，丰富表情，高质量背景",
  interior: "室内设计摄影，自然采光，空间层次清楚，材质细节准确，杂志级构图",
  isometric: "等距视角图标，清晰轮廓，柔和阴影，模块化结构，现代应用图形"
};

const aspectRatioLabels = {
  "9:16": "9:16 竖版",
  "3:4": "3:4 竖版",
  "4:5": "4:5 社媒竖版",
  "2:3": "2:3 海报竖版",
  "1:1": "1:1 方图",
  "4:3": "4:3 横版",
  "3:2": "3:2 横版",
  "16:9": "16:9 横版",
  "21:9": "21:9 超宽"
};

const clarityLabels = {
  "1k": "1K 快速",
  "2k": "2K 清晰",
  "4k": "4K 高清"
};

const clarityLongEdges = {
  "1k": 1536,
  "2k": 2048,
  "4k": 3840
};

const promptTemplates = {
  product: "高端产品商业摄影，主体居中，干净背景，柔和棚拍灯光，材质真实，边缘清晰，适合电商主图",
  "xhs-cover": "小红书封面，顶部留标题空间，主体明确，明亮自然光，画面干净，高级内容封面质感",
  avatar: "高级头像，面部清晰，背景简洁，柔和光线，细节精致，适合社交媒体头像",
  "video-cover": "短视频封面，强视觉中心，动态构图，醒目留白，电影感灯光，适合手机竖屏",
  interior: "室内设计摄影，自然采光，空间层次清楚，材质细节准确，杂志级构图",
  "curry-poster": "Stephen Curry 库里，Golden State Warriors 金州勇士，#30 球衣，NBA 篮球巨星，三分投篮瞬间，球场聚光灯，电影级运动海报，真实肖像摄影，清晰面部特征，蓝金配色"
};

const historyDbName = "image2-studio";
const historyDbStore = "history";
const maxReferenceImages = 24;

const promptOptimizeText = {
  balanced: "画面主体清晰，构图平衡，光线自然，细节丰富，材质可信，整体完成度高",
  precise: "严格遵循主体、数量、位置、颜色和动作描述，避免额外元素，边缘清晰，结构准确",
  cinema: "电影摄影感，真实镜头语言，层次光影，景深自然，色彩分级克制，情绪氛围明确",
  product: "商业成片质感，干净背景，专业布光，产品/主体边缘清晰，材质细节真实，适合展示",
  raw: ""
};

function loadJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key)) ?? fallback;
    return key === "image2.history" && Array.isArray(value) ? normalizeHistory(value) : value;
  } catch {
    return fallback;
  }
}

function normalizeHistory(items) {
  return items
    .filter((item) => item && (item.dataUrl || item.url))
    .map((item) => ({
      id: item.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      dataUrl: item.dataUrl || item.url,
      prompt: item.prompt || "",
      model: item.model || "unknown",
      size: item.size || "unknown",
      aspectRatio: item.aspectRatio || "",
      clarity: item.clarity || "",
      quality: item.quality || "auto",
      format: item.format || inferFormat(item.dataUrl || item.url),
      createdAt: item.createdAt || new Date().toISOString(),
      durationMs: Number(item.durationMs) || 0,
      apiSize: item.apiSize || "",
      requestedSize: item.requestedSize || "",
      fallbackSize: item.fallbackSize || ""
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function openHistoryDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("当前浏览器不支持 IndexedDB。"));
      return;
    }
    const request = indexedDB.open(historyDbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(historyDbStore)) {
        const store = db.createObjectStore(historyDbStore, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("历史数据库打开失败。"));
  });
}

function readHistoryFromDb() {
  return new Promise((resolve, reject) => {
    openHistoryDb()
      .then((db) => {
        const transaction = db.transaction(historyDbStore, "readonly");
        const store = transaction.objectStore(historyDbStore);
        const request = store.getAll();
        request.onsuccess = () => resolve(normalizeHistory(request.result || []));
        request.onerror = () => reject(request.error || new Error("历史读取失败。"));
      })
      .catch(reject);
  });
}

function writeHistoryToDb(items) {
  return new Promise((resolve, reject) => {
    openHistoryDb()
      .then((db) => {
        const transaction = db.transaction(historyDbStore, "readwrite");
        const store = transaction.objectStore(historyDbStore);
        for (const item of normalizeHistory(items)) store.put(item);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error || new Error("历史保存失败。"));
      })
      .catch(reject);
  });
}

function clearHistoryDb() {
  return new Promise((resolve, reject) => {
    openHistoryDb()
      .then((db) => {
        const transaction = db.transaction(historyDbStore, "readwrite");
        transaction.objectStore(historyDbStore).clear();
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error || new Error("历史清空失败。"));
      })
      .catch(reject);
  });
}

function deleteHistoryFromDb(id) {
  return new Promise((resolve, reject) => {
    openHistoryDb()
      .then((db) => {
        const transaction = db.transaction(historyDbStore, "readwrite");
        transaction.objectStore(historyDbStore).delete(id);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error || new Error("历史删除失败。"));
      })
      .catch(reject);
  });
}

async function initHistory() {
  const legacy = loadJson("image2.history", []);
  try {
    const saved = await readHistoryFromDb();
    const merged = normalizeHistory([...saved, ...legacy]);
    if (legacy.length) {
      await writeHistoryToDb(legacy);
      localStorage.removeItem("image2.history");
    }
    state.history = merged;
  } catch {
    state.history = normalizeHistory(legacy);
  }
  renderHistory();
}

function loadSettings() {
  const local = loadJson("image2.settings", null);
  const session = loadJsonFrom(sessionStorage, "image2.settings", null);
  return local || session || {
    providerName: "OpenAI",
    apiBaseUrl: "https://api.openai.com/v1",
    apiKey: "",
    organization: "",
    project: "",
    remember: true
  };
}

function loadJsonFrom(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveSettings() {
  const settings = {
    providerName: els.providerName.value.trim() || "自定义接口",
    apiBaseUrl: normalizeBaseUrl(els.apiBaseUrl.value.trim()),
    apiKey: els.apiKey.value.trim(),
    organization: els.organization.value.trim(),
    project: els.project.value.trim(),
    remember: els.rememberKey.checked
  };
  state.settings = settings;
  localStorage.removeItem("image2.settings");
  sessionStorage.removeItem("image2.settings");
  const storage = settings.remember ? localStorage : sessionStorage;
  storage.setItem("image2.settings", JSON.stringify(settings));
  updateConnection();
}

async function testConnection() {
  const settings = {
    providerName: els.providerName.value.trim() || "自定义接口",
    apiBaseUrl: normalizeBaseUrl(els.apiBaseUrl.value.trim()),
    apiKey: els.apiKey.value.trim(),
    organization: els.organization.value.trim(),
    project: els.project.value.trim()
  };
  if (!settings.apiKey) {
    flashStatus("请先填写 API Key。", true);
    return;
  }
  els.testConnection.disabled = true;
  els.testConnection.textContent = "测试中...";
  try {
    const response = await fetch(apiUrl("/api/test"), {
      method: "POST",
      headers: {
        "x-api-key": settings.apiKey,
        "x-api-base-url": settings.apiBaseUrl,
        "x-openai-organization": settings.organization,
        "x-openai-project": settings.project
      }
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.error || data.details?.error?.message || "接口测试失败。");
    const models = data.models?.length ? ` 可见模型：${data.models.slice(0, 4).join("、")}` : "";
    flashStatus(`接口正常。${models}`);
  } catch (error) {
    flashStatus(`接口测试失败：${readableLocalFetchError(error)}`, true);
  } finally {
    els.testConnection.disabled = false;
    els.testConnection.textContent = "测试接口";
  }
}

function normalizeBaseUrl(value) {
  return (value || "https://api.openai.com/v1").replace(/\/+$/, "");
}

function apiUrl(path) {
  return window.location.protocol === "file:"
    ? `http://localhost:4173${path}`
    : path;
}

function updateConnection() {
  const key = state.settings.apiKey || "";
  if (!key) {
    els.connectionText.textContent = "未绑定 API Key";
    els.connectionText.classList.add("error-text");
    return;
  }
  const tail = key.slice(-4).padStart(4, "*");
  els.connectionText.textContent = `${state.settings.providerName || "接口"}：•••• ${tail}`;
  els.connectionText.classList.remove("error-text");
}

function setMode(mode) {
  state.mode = mode;
  const isEdit = mode === "edit";
  els.modeGenerate.classList.toggle("active", !isEdit);
  els.modeEdit.classList.toggle("active", isEdit);
  els.modeBadge.textContent = isEdit ? "图生图" : "文生图";
  $$(".edit-only").forEach((el) => el.classList.toggle("hidden", !isEdit));
}

function setBusy(isBusy) {
  els.generate.disabled = isBusy;
  els.progress.classList.toggle("hidden", !isBusy);
  els.generate.innerHTML = isBusy
    ? "<span>生成中...</span>"
    : '<svg><use href="#icon-wand"></use></svg>开始生成';
}

function getTargetSize() {
  const target = computeTargetSize();
  return `${target.width}x${target.height}`;
}

function getApiSize() {
  const size = getTargetSize();
  const parsed = parseSize(size);
  if (!parsed) return size;
  return normalizeRequestSize(parsed, getClarity());
}

function getSize() {
  return getTargetSize();
}

function getClarity() {
  return ["1k", "2k", "4k"].includes(els.resolutionTier.value) ? els.resolutionTier.value : "1k";
}

function getAspectRatioParts() {
  if (els.size.value === "custom") {
    return {
      width: clamp(Math.round(Number(els.width.value)), 1, 32),
      height: clamp(Math.round(Number(els.height.value)), 1, 32),
      label: `${clamp(Math.round(Number(els.width.value)), 1, 32)}:${clamp(Math.round(Number(els.height.value)), 1, 32)} 自定义`
    };
  }
  const match = String(els.size.value || "9:16").match(/^(\d+):(\d+)$/);
  if (!match) return { width: 9, height: 16, label: aspectRatioLabels["9:16"] };
  const key = `${Number(match[1])}:${Number(match[2])}`;
  return { width: Number(match[1]), height: Number(match[2]), label: aspectRatioLabels[key] || key };
}

function computeTargetSize(clarity = getClarity(), ratio = getAspectRatioParts()) {
  const longEdge = clarityLongEdges[clarity] || clarityLongEdges["1k"];
  const isWide = ratio.width >= ratio.height;
  const scale = longEdge / Math.max(ratio.width, ratio.height);
  const width = ceil16(isWide ? longEdge : ratio.width * scale);
  const height = ceil16(isWide ? ratio.height * scale : longEdge);
  return { width, height };
}

function inferFormat(src) {
  const match = String(src || "").match(/^data:image\/([^;,]+)/);
  if (match) return match[1] === "jpeg" ? "jpg" : match[1];
  const ext = String(src || "").split("?")[0].match(/\.([a-z0-9]+)$/i)?.[1];
  return ext || "png";
}

function getModel() {
  return els.model.value === "custom"
    ? els.customModel.value.trim()
    : els.model.value;
}

function syncOutputControls() {
  toggleCustomSize();
  updateCostEstimate();
}

function normalizeRequestSize(parsed, clarity = getClarity()) {
  const width = ceil16(parsed.width);
  const height = ceil16(parsed.height);
  const longEdge = Math.max(width, height);
  const isWide = width >= height;
  if (width === height) {
    return clarity === "4k" ? "2048x2048" : (longEdge > 1536 ? "2048x2048" : "1024x1024");
  }
  if (clarity === "4k" && longEdge >= 3072) return isWide ? "3840x2160" : "2160x3840";
  if (clarity !== "1k" || longEdge > 1536) return isWide ? "2048x1152" : "1152x2048";
  return isWide ? "1536x1024" : "1024x1536";
}

function updateCostEstimate() {
  const ratio = getAspectRatioParts();
  const clarity = getClarity();
  const size = getSize();
  const apiSize = getApiSize();
  const count = getCount();
  const clarityLabel = clarityLabels[clarity] || clarity.toUpperCase();
  const apiHint = apiSize !== size ? `接口先用 ${apiSize}，出图后适配为 ${size}。` : `接口尺寸 ${apiSize}。`;
  els.costEstimate.textContent = `尺寸说明：${ratio.label} · ${clarityLabel} · ${count} 张，目标输出 ${size}。${apiHint}`;
  const engineTier = $("#engineTier");
  if (engineTier) engineTier.textContent = `${ratio.label} · ${clarityLabel} · ${size}`;
}

function formatDuration(ms) {
  const value = Math.max(0, Number(ms) || 0);
  if (value < 1000) return `${value}ms`;
  const seconds = value / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${rest}s`;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function parseSize(size) {
  const match = String(size || "").match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function ceil16(value) {
  return clamp(Math.ceil(value / 16) * 16, 256, 3840);
}

function getCount() {
  const value = Math.floor(Number(els.count.value));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function round16(value) {
  return Math.round(value / 16) * 16;
}

function buildPrompt() {
  const prompt = els.prompt.value.trim();
  const avoid = els.avoid.value.trim();
  const optimize = promptOptimizeText[els.promptOptimize.value] || "";
  const curryHint = /库里|柯瑞|curry|stephen\s*curry/i.test(prompt)
    ? "Stephen Curry, Golden State Warriors, NBA basketball superstar, #30 jersey, elite point guard, basketball court lighting, accurate facial likeness, authentic sports photography"
    : "";
  const parts = [prompt, curryHint, optimize].filter((item, index, arr) => item && arr.indexOf(item) === index);
  const positive = parts.join("，");
  return avoid ? `${positive}\n\nAvoid: ${avoid}` : positive;
}
function buildPayload() {
  const outputFormat = els.format.value;
  const model = getModel();
  const payload = {
    model,
    prompt: buildPrompt(),
    n: getCount(),
    size: getApiSize(),
    quality: els.quality.value,
    background: els.background.value,
    output_format: outputFormat,
    moderation: els.moderation.value
  };
  if (outputFormat !== "png") {
    payload.output_compression = Number(els.compression.value);
  }
  if (state.mode === "edit") {
    payload.images = state.references;
    if (state.mask) payload.mask = state.mask;
    if (
      els.inputFidelity.value !== "auto" &&
      !["gpt-image-2", "gpt-image-1-mini"].includes(model)
    ) {
      payload.input_fidelity = els.inputFidelity.value;
    }
  }
  return payload;
}

async function generateImages() {
  const key = state.settings.apiKey;
  if (!key) {
    els.settingsDialog.showModal();
    return;
  }
  if (!els.prompt.value.trim()) {
    flashStatus("请输入提示词。", true);
    els.prompt.focus();
    return;
  }
  if (state.mode === "edit" && state.references.length === 0) {
    flashStatus("请上传参考图。", true);
    return;
  }
  if (els.model.value === "custom" && !els.customModel.value.trim()) {
    flashStatus("请输入自定义模型 ID。", true);
    els.customModel.focus();
    return;
  }
  if (els.background.value === "transparent" && els.format.value === "jpeg") {
    flashStatus("透明背景需要 png 或 webp。", true);
    return;
  }

  const startedAt = performance.now();
  const requestedAt = new Date().toISOString();
  setBusy(true);
  flashStatus(`正在请求 ${state.settings.providerName || "图像接口"}...`);
  try {
    const response = await fetch(apiUrl("/api/images"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "x-api-base-url": state.settings.apiBaseUrl || "https://api.openai.com/v1",
        "x-openai-organization": state.settings.organization || "",
        "x-openai-project": state.settings.project || ""
      },
      body: JSON.stringify(buildPayload())
    });
    const data = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(data.error || data.details?.error?.message || "生成失败。");
    }
    const images = (data.data || []).filter((item) => item.dataUrl || item.url);
    if (!images.length) throw new Error("接口没有返回图片。");
    const durationMs = Math.round(performance.now() - startedAt);
    const apiSize = data.apiSize || data.fallbackSize || getApiSize();
    const processedImages = (await resizeImagesToTarget(images, apiSize)).map((image) => ({
      ...image,
      createdAt: requestedAt,
      durationMs,
      apiSize: image.apiSize || apiSize,
      requestedSize: image.requestedSize || data.requestedSize || getApiSize(),
      fallbackSize: image.fallbackSize || data.fallbackSize || ""
    }));
    renderResults(processedImages);
    const historySaved = await addHistory(processedImages, { createdAt: requestedAt, durationMs });
    const historyNote = historySaved ? "" : " 图片已生成，但浏览器历史空间不足，未保存到历史。";
    flashStatus(`完成：${images.length} 张图片，用时 ${formatDuration(durationMs)}。${els.costEstimate.textContent.replace("尺寸说明：", "")}${historyNote}`, !historySaved);
  } catch (error) {
    flashStatus(readableLocalFetchError(error), true);
  } finally {
    setBusy(false);
  }
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    throw new Error("本地服务返回了非 JSON 响应。请确认打开的是 http://localhost:4173，或重新双击“启动生图网站.vbs”。");
  }
}

function readableLocalFetchError(error) {
  const message = error?.message || "";
  if (message && message !== "Failed to fetch" && message !== "fetch failed") return message;
  return "本地服务连接失败：请双击项目文件夹里的“启动生图网站.vbs”，然后使用 http://localhost:4173。不要只打开 index.html；如果已经启动，请刷新页面重试。";
}

function renderResults(images) {
  els.results.innerHTML = "";
  for (const image of images) {
    els.results.appendChild(createImageCard(image, "result"));
  }
}

async function resizeImagesToTarget(images, apiSize = getApiSize()) {
  const targetSize = getTargetSize();
  if (targetSize === "auto") return images;
  const target = parseSize(targetSize);
  if (!target) return images;
  return Promise.all(images.map((image) => resizeImageToTarget(image, target, apiSize)));
}

async function resizeImageToTarget(image, target, apiSize) {
  const src = image.dataUrl || image.url;
  if (!src) return image;
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const sourceRatio = bitmap.width / bitmap.height;
    const targetRatio = target.width / target.height;
    let sourceWidth = bitmap.width;
    let sourceHeight = bitmap.height;
    let sourceX = 0;
    let sourceY = 0;
    if (sourceRatio > targetRatio) {
      sourceWidth = bitmap.height * targetRatio;
      sourceX = (bitmap.width - sourceWidth) / 2;
    } else if (sourceRatio < targetRatio) {
      sourceHeight = bitmap.width / targetRatio;
      sourceY = (bitmap.height - sourceHeight) / 2;
    }
    context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, target.width, target.height);
    if (typeof bitmap.close === "function") bitmap.close();
    const format = els.format.value || inferFormat(src);
    const mime = format === "jpg" || format === "jpeg" ? "image/jpeg" : `image/${format}`;
    const quality = clamp(Number(els.compression.value) / 100, 0, 1);
    const dataUrl = mime === "image/png" ? canvas.toDataURL(mime) : canvas.toDataURL(mime, quality);
    return {
      ...image,
      dataUrl,
      url: undefined,
      apiSize,
      size: `${target.width}x${target.height}`,
      format: inferFormat(dataUrl)
    };
  } catch {
    return image;
  }
}

async function addHistory(images, meta = {}) {
  const now = meta.createdAt || new Date().toISOString();
  const prompt = els.prompt.value.trim();
  const model = getModel();
  const size = getSize();
  const ratio = getAspectRatioParts();
  const clarity = getClarity();
  const quality = els.quality.value;
  const format = els.format.value || inferFormat(images[0]?.dataUrl || images[0]?.url);
  const entries = images.map((image) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    dataUrl: image.dataUrl || image.url,
    prompt,
    model,
    size,
    aspectRatio: ratio.label,
    clarity,
    requestedSize: image.requestedSize || getApiSize(),
    fallbackSize: image.fallbackSize || "",
    quality,
    format,
    createdAt: now,
    durationMs: image.durationMs || meta.durationMs || 0,
    apiSize: image.apiSize || getApiSize()
  }));
  state.history = normalizeHistory([...entries, ...state.history]);
  const saved = await persistHistory(entries);
  renderHistory();
  return saved;
}

async function persistHistory(entries) {
  try {
    await writeHistoryToDb(entries);
    localStorage.removeItem("image2.history");
    return true;
  } catch {
    return false;
  }
}

function createImageCard(image, kind) {
  const template = $("#imageCardTemplate").content.cloneNode(true);
  const card = template.querySelector(".image-card");
  const img = template.querySelector("img");
  const text = template.querySelector("p");
  const download = template.querySelector(".download-image");
  const reuse = template.querySelector(".reuse-prompt");
  const copy = template.querySelector(".copy-image");
  const view = template.querySelector(".view-image");

  const src = image.dataUrl || image.url;
  const prompt = image.prompt || els.prompt.value.trim();
  const meta = imageMetaLine(image);
  const format = image.format || inferFormat(src);
  img.src = src;
  text.textContent = kind === "result"
    ? (meta || prompt || "Image2 Studio")
    : `${prompt || "Image2 Studio"}${meta ? `\n${meta}` : ""}`;
  download.href = src;
  download.download = `image2-${kind}-${Date.now()}.${format}`;
  reuse.addEventListener("click", () => {
    els.prompt.value = prompt;
    flashStatus("提示词已复用");
  });
  copy.addEventListener("click", () => copyImage(src));
  view?.addEventListener("click", () => openImageViewer({ ...image, prompt, src }));
  img.addEventListener("dblclick", () => openImageViewer({ ...image, prompt, src }));
  card.dataset.kind = kind;
  return card;
}

function createHistoryThumbLegacy(item) {
  const src = item.dataUrl || item.url;
  const button = document.createElement("button");
  button.className = "history-thumb";
  button.type = "button";
  button.title = item.prompt || "历史图片";

  const img = document.createElement("img");
  img.alt = "历史图片";
  img.src = src;
  img.loading = "lazy";
  img.addEventListener("error", () => {
    button.classList.add("is-broken");
  });

  const label = document.createElement("span");
  label.textContent = item.size || "image";

  button.append(img, label);
  button.addEventListener("click", () => {
    renderResults([item]);
    if (item.prompt) els.prompt.value = item.prompt;
    flashStatus("已从历史轨道打开图片");
  });
  button.addEventListener("dblclick", () => openImageViewer(item));
  return button;
}

function createHistoryThumb(item) {
  const src = item.dataUrl || item.url;
  const button = document.createElement("article");
  button.className = "history-thumb";
  button.tabIndex = 0;
  button.setAttribute("role", "button");
  button.title = item.prompt || "历史图片";

  const img = document.createElement("img");
  img.alt = "历史图片";
  img.src = src;
  img.loading = "lazy";
  img.addEventListener("error", () => {
    button.classList.add("is-broken");
  });

  const info = document.createElement("div");
  info.className = "history-thumb-info";

  const title = document.createElement("b");
  title.textContent = shortText(item.prompt || "历史图片", 34);

  const meta = document.createElement("span");
  meta.textContent = imageMetaLine(item);

  const remove = document.createElement("button");
  remove.className = "thumb-delete history-delete";
  remove.type = "button";
  remove.textContent = "×";
  remove.title = "删除这条历史";
  remove.setAttribute("aria-label", "删除这条历史");

  info.append(title, meta);
  button.append(img, info, remove);
  button.addEventListener("click", () => {
    renderResults([item]);
    if (item.prompt) els.prompt.value = item.prompt;
    flashStatus("已从历史轨道打开图片");
  });
  button.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    renderResults([item]);
    if (item.prompt) els.prompt.value = item.prompt;
    flashStatus("已从历史轨道打开图片");
  });
  remove.addEventListener("click", async (event) => {
    event.stopPropagation();
    await deleteHistoryItem(item.id);
  });
  button.addEventListener("dblclick", () => openImageViewer(item));
  return button;
}

function shortText(value, maxLength) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatHistoryTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function imageMetaLine(image) {
  return [
    image.aspectRatio,
    image.clarity ? (clarityLabels[image.clarity] || image.clarity.toUpperCase()) : "",
    image.size,
    image.apiSize && image.apiSize !== image.size ? `接口 ${image.apiSize}` : "",
    image.fallbackSize ? "已自动降档" : "",
    image.model,
    image.quality,
    image.durationMs ? `耗时 ${formatDuration(image.durationMs)}` : "",
    image.createdAt ? formatHistoryTime(image.createdAt) : ""
  ].filter(Boolean).join(" · ");
}

async function deleteHistoryItem(id) {
  state.history = state.history.filter((item) => item.id !== id);
  try {
    await deleteHistoryFromDb(id);
  } catch {
    localStorage.setItem("image2.history", JSON.stringify(state.history));
  }
  renderHistory();
  flashStatus("已删除这条历史");
}

function openImageViewer(image) {
  const src = image.src || image.dataUrl || image.url;
  if (!src) {
    flashStatus("这条记录没有可查看的图片地址", true);
    return;
  }

  let dialog = $("#imageViewerDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "imageViewerDialog";
    dialog.className = "image-viewer";
    document.body.appendChild(dialog);
  }

  const prompt = image.prompt || "Image2 Studio";
  const meta = [image.model, image.size, image.quality, image.format].filter(Boolean).join(" · ");
  dialog.innerHTML = `
    <div class="viewer-shell">
      <div class="viewer-head">
        <div>
          <h2>查看大图</h2>
          <p>${escapeHtml(meta || prompt)}</p>
        </div>
        <div class="viewer-actions">
          <button class="ghost-button viewer-fit" type="button">适应窗口</button>
          <button class="ghost-button viewer-actual" type="button">原始尺寸</button>
          <a class="ghost-button viewer-download" download="image2-full.${image.format || inferFormat(src)}">下载</a>
          <button class="icon-button viewer-close" type="button" aria-label="关闭">×</button>
        </div>
      </div>
      <div class="viewer-canvas">
        <img alt="查看大图" />
      </div>
    </div>
  `;

  const canvas = dialog.querySelector(".viewer-canvas");
  const img = dialog.querySelector("img");
  const download = dialog.querySelector(".viewer-download");
  img.src = src;
  download.href = src;
  dialog.querySelector(".viewer-fit").addEventListener("click", () => canvas.classList.remove("actual-size"));
  dialog.querySelector(".viewer-actual").addEventListener("click", () => canvas.classList.add("actual-size"));
  dialog.querySelector(".viewer-close").addEventListener("click", () => dialog.close());
  if (!dialog.open) dialog.showModal();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function copyImage(src) {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) {
      await navigator.clipboard.writeText(src);
      flashStatus("已复制图片地址");
      return;
    }
    const blob = await (await fetch(src)).blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    flashStatus("图片已复制");
  } catch {
    await navigator.clipboard.writeText(src);
    flashStatus("已复制图片地址");
  }
}

function renderHistory() {
  els.history.innerHTML = "";
  const query = (els.historySearch?.value || "").trim().toLowerCase();
  const filter = els.historyFilter?.value || "all";
  const today = new Date().toISOString().slice(0, 10);
  const filtered = state.history.filter((item) => {
    const haystack = [item.prompt, item.size, item.apiSize, item.model, item.quality, item.aspectRatio, item.clarity].filter(Boolean).join(" ").toLowerCase();
    const size = [item.size, item.apiSize, item.clarity].filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesFilter =
      filter === "all" ||
      (filter === "1k" && (/1024|1536|1k/.test(size))) ||
      (filter === "2k" && (/2048|2k/.test(size))) ||
      (filter === "4k" && (/3840|2160|4k/.test(size))) ||
      (filter === "today" && String(item.createdAt || "").startsWith(today));
    return matchesQuery && matchesFilter;
  });
  els.historyCount.textContent = renderHistoryCountText(state.history.length, filtered.length);
  for (const item of filtered) {
    els.history.appendChild(createHistoryThumb(item));
  }
}

function formatHistoryCount(total, shown) {
  return `${total} 条记录${shown !== total ? ` / 显示 ${shown}` : ""}`;
}

function renderHistoryCountText(total, shown) {
  return `${total} 条记录${shown !== total ? ` / 显示 ${shown}` : ""}`;
}

function flashStatus(message, isError = false) {
  els.statusText.textContent = message;
  els.statusText.classList.toggle("error-text", isError);
}

function renderFilePreview(container, files) {
  container.innerHTML = "";
  files.forEach((file, index) => {
    const wrap = document.createElement("div");
    wrap.className = "ref-thumb";
    const img = document.createElement("img");
    img.src = file.dataUrl;
    img.alt = file.name || "reference";
    const label = document.createElement("span");
    label.textContent = shortText(file.name || "reference", 18);
    wrap.append(img, label);
    if (container === els.refPreview) {
      const remove = document.createElement("button");
      remove.className = "thumb-delete";
      remove.type = "button";
      remove.textContent = "×";
      remove.title = "移除这张参考图";
      remove.setAttribute("aria-label", "移除这张参考图");
      remove.addEventListener("click", () => removeReferenceImage(index));
      wrap.appendChild(remove);
    }
    container.appendChild(wrap);
  });
}

function removeReferenceImage(index) {
  state.references.splice(index, 1);
  els.referenceImages.value = "";
  if (els.referenceFolder) els.referenceFolder.value = "";
  renderFilePreview(els.refPreview, state.references);
  flashStatus(`已移除 1 张参考图，当前 ${state.references.length} 张。`);
}

async function readFiles(fileList, limit = maxReferenceImages) {
  const files = Array.from(fileList || [])
    .filter((file) => /^image\/(png|jpe?g|webp)$/i.test(file.type))
    .slice(0, limit);
  return Promise.all(files.map(readFile));
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function appendReferenceFiles(fileList, sourceLabel = "图片") {
  const remaining = Math.max(0, maxReferenceImages - state.references.length);
  if (!remaining) {
    flashStatus(`最多保留 ${maxReferenceImages} 张参考图，请先清空一部分。`, true);
    return;
  }
  const incoming = await readFiles(fileList, remaining);
  if (!incoming.length) {
    flashStatus("没有找到可用图片。", true);
    return;
  }
  const known = new Set(state.references.map((file) => `${file.name}-${file.dataUrl.length}`));
  const unique = incoming.filter((file) => {
    const key = `${file.name}-${file.dataUrl.length}`;
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
  state.references = [...state.references, ...unique].slice(0, maxReferenceImages);
  renderFilePreview(els.refPreview, state.references);
  setMode("edit");
  flashStatus(`已追加 ${unique.length} 张${sourceLabel}，当前 ${state.references.length} 张参考图。`);
}

function resetForm() {
  els.prompt.value = "";
  els.avoid.value = "";
  els.preset.value = "";
  els.model.value = "gpt-image-2";
  els.customModel.value = "";
  els.count.value = "1";
  els.size.value = "9:16";
  els.resolutionTier.value = "1k";
  els.quality.value = "auto";
  els.promptOptimize.value = "balanced";
  els.background.value = "auto";
  els.format.value = "png";
  els.compression.value = "90";
  els.moderation.value = "auto";
  els.inputFidelity.value = "auto";
  state.references = [];
  state.mask = null;
  els.referenceImages.value = "";
  if (els.referenceFolder) els.referenceFolder.value = "";
  els.maskImage.value = "";
  renderFilePreview(els.refPreview, []);
  renderFilePreview(els.maskPreview, []);
  toggleCustomSize();
  toggleCustomModel();
  updateCostEstimate();
  flashStatus("已重置");
}

function toggleCustomSize() {
  const show = els.size.value === "custom";
  $$(".custom-size").forEach((el) => el.classList.toggle("hidden", !show));
}

function toggleCustomModel() {
  const show = els.model.value === "custom";
  $$(".custom-model").forEach((el) => el.classList.toggle("hidden", !show));
  updateCostEstimate();
}

function bindEvents() {
  els.themeSelect?.addEventListener("change", () => {
    document.body.dataset.theme = els.themeSelect.value;
    localStorage.setItem("image2.theme", els.themeSelect.value);
  });
  els.quickSettings?.addEventListener("click", () => {
    hydrateSettingsForm();
    els.settingsDialog.showModal();
  });
  els.openSettings.addEventListener("click", () => {
    hydrateSettingsForm();
    els.settingsDialog.showModal();
  });
  els.openDocs.addEventListener("click", () => {
    window.open("https://platform.openai.com/docs/guides/image-generation?lang=curl", "_blank", "noopener");
  });
  els.saveKey.addEventListener("click", saveSettings);
  els.testConnection.addEventListener("click", testConnection);
  els.forgetKey.addEventListener("click", () => {
    state.settings = { ...state.settings, apiKey: "" };
    hydrateSettingsForm();
    saveSettings();
    updateConnection();
  });
  els.modeGenerate.addEventListener("click", () => setMode("generate"));
  els.modeEdit.addEventListener("click", () => setMode("edit"));
  $$(".rail-button[data-mode-target]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.modeTarget));
  });
  $$(".rail-button[data-scroll-target='history']").forEach((button) => {
    button.addEventListener("click", () => $(".inspector-history-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  });
  els.size.addEventListener("change", syncOutputControls);
  els.resolutionTier.addEventListener("change", syncOutputControls);
  els.count.addEventListener("input", updateCostEstimate);
  els.quality.addEventListener("change", updateCostEstimate);
  els.width.addEventListener("input", updateCostEstimate);
  els.height.addEventListener("input", updateCostEstimate);
  els.format.addEventListener("change", updateCostEstimate);
  els.model.addEventListener("change", toggleCustomModel);
  els.customModel.addEventListener("input", updateCostEstimate);
  els.historySearch?.addEventListener("input", renderHistory);
  els.historyFilter?.addEventListener("change", renderHistory);
  els.generate.addEventListener("click", generateImages);
  els.resetForm.addEventListener("click", resetForm);
  els.clearResults.addEventListener("click", () => {
    els.results.innerHTML = "";
    flashStatus("作品已清空");
  });
  els.clearHistory.addEventListener("click", async () => {
    state.history = [];
    localStorage.removeItem("image2.history");
    try {
      await clearHistoryDb();
    } catch {
      // The in-memory list is already cleared; keep the UI responsive if storage is blocked.
    }
    renderHistory();
    flashStatus("历史已清空");
  });
  els.clearRefs.addEventListener("click", () => {
    state.references = [];
    els.referenceImages.value = "";
    if (els.referenceFolder) els.referenceFolder.value = "";
    renderFilePreview(els.refPreview, []);
  });
  els.clearMask.addEventListener("click", () => {
    state.mask = null;
    els.maskImage.value = "";
    renderFilePreview(els.maskPreview, []);
  });
  $$(".template-chip").forEach((button) => {
    button.addEventListener("click", () => {
      const text = promptTemplates[button.dataset.template];
      if (!text) return;
      els.prompt.value = els.prompt.value.trim() ? `${els.prompt.value.trim()}，${text}` : text;
      flashStatus("提示词模板已加入");
    });
  });
  $("#economyMode")?.addEventListener("click", () => {
    $("#economyMode").classList.add("active");
    $("#qualityMode")?.classList.remove("active");
    $("#engineMode").textContent = "快速模式";
    els.resolutionTier.value = "1k";
    syncOutputControls();
  });
  $("#qualityMode")?.addEventListener("click", () => {
    $("#qualityMode").classList.add("active");
    $("#economyMode")?.classList.remove("active");
    $("#engineMode").textContent = "高清模式";
    if (els.resolutionTier.value === "1k") els.resolutionTier.value = "2k";
    syncOutputControls();
    flashStatus("高清模式会提升清晰度，最终以当前服务商支持的接口尺寸为准。");
  });
  els.referenceImages.addEventListener("change", async (event) => {
    await appendReferenceFiles(event.target.files, "图片");
    els.referenceImages.value = "";
  });
  els.referenceFolder?.addEventListener("change", async (event) => {
    await appendReferenceFiles(event.target.files, "文件夹图片");
    els.referenceFolder.value = "";
  });
  const dropRefs = $("#dropRefs");
  if (dropRefs) {
    ["dragenter", "dragover"].forEach((type) => {
      dropRefs.addEventListener(type, (event) => {
        event.preventDefault();
        dropRefs.classList.add("drag-over");
      });
    });
    ["dragleave", "drop"].forEach((type) => {
      dropRefs.addEventListener(type, (event) => {
        event.preventDefault();
        dropRefs.classList.remove("drag-over");
      });
    });
    dropRefs.addEventListener("drop", async (event) => {
      await appendReferenceFiles(event.dataTransfer?.files, "拖入图片");
    });
  }
  els.maskImage.addEventListener("change", async (event) => {
    const [mask] = await readFiles(event.target.files, 1);
    state.mask = mask || null;
    renderFilePreview(els.maskPreview, state.mask ? [state.mask] : []);
  });
  els.preset.addEventListener("change", () => {
    const value = presets[els.preset.value];
    if (!value) return;
    els.prompt.value = els.prompt.value.trim()
      ? `${els.prompt.value.trim()}，${value}`
      : value;
  });
  els.polishPrompt.addEventListener("click", () => {
    const base = els.prompt.value.trim();
    if (!base) return;
    if (base.includes("构图")) {
      flashStatus("提示词已足够完整");
      return;
    }
    const optimize = promptOptimizeText[els.promptOptimize.value] || promptOptimizeText.balanced;
    els.prompt.value = `${base}，${optimize}`;
    flashStatus("提示词已润色");
  });
}

function bindMotionEffects() {
  document.body.classList.add("no-mouse-mode");
}

function hydrateSettingsForm() {
  els.providerName.value = state.settings.providerName || "OpenAI";
  els.apiBaseUrl.value = state.settings.apiBaseUrl || "https://api.openai.com/v1";
  els.apiKey.value = state.settings.apiKey || "";
  els.organization.value = state.settings.organization || "";
  els.project.value = state.settings.project || "";
  els.rememberKey.checked = state.settings.remember !== false;
}

bindEvents();
hydrateSettingsForm();
updateConnection();
initHistory();
const savedTheme = localStorage.getItem("image2.theme") || "curry";
document.body.dataset.theme = savedTheme;
if (els.themeSelect) els.themeSelect.value = savedTheme;
toggleCustomSize();
toggleCustomModel();
updateCostEstimate();
bindMotionEffects();
