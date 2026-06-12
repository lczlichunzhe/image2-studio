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
  maskImage: $("#maskImage"),
  refPreview: $("#refPreview"),
  maskPreview: $("#maskPreview"),
  clearRefs: $("#clearRefs"),
  clearMask: $("#clearMask"),
  results: $("#results"),
  history: $("#history"),
  historyCount: $("#historyCount"),
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

const tierToSize = {
  "1k-square": "1024x1024",
  "1k-wide": "1536x1024",
  "1k-tall": "1024x1536",
  "2k-square": "2048x2048",
  "2k-wide": "2048x1152",
  "4k-wide": "3840x2160",
  "4k-tall": "2160x3840",
  "xhs-avatar": "400x400",
  "xhs-profile-bg": "1000x800",
  "xhs-post-tall": "1242x1660",
  "xhs-post-square": "1080x1080",
  "xhs-post-wide": "2560x1440",
  "xhs-video-tall": "1080x1440",
  "xhs-video-wide": "1440x1080"
};

const qualityMultiplier = { low: 0.35, medium: 1, high: 2.6, auto: 1 };
const providerTierPrices = { "1K": 0.6, "2K": 0.8, "4K": 1 };
const historyDbName = "image2-studio";
const historyDbStore = "history";

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
      quality: item.quality || "auto",
      format: item.format || inferFormat(item.dataUrl || item.url),
      createdAt: item.createdAt || new Date().toISOString()
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
    const response = await fetch("/api/test", {
      method: "POST",
      headers: {
        "x-api-key": settings.apiKey,
        "x-api-base-url": settings.apiBaseUrl,
        "x-openai-organization": settings.organization,
        "x-openai-project": settings.project
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.details?.error?.message || "接口测试失败。");
    const models = data.models?.length ? ` 可见模型：${data.models.slice(0, 4).join("、")}` : "";
    flashStatus(`接口正常。${models}`);
  } catch (error) {
    flashStatus(`接口测试失败：${error.message}`, true);
  } finally {
    els.testConnection.disabled = false;
    els.testConnection.textContent = "测试接口";
  }
}

function normalizeBaseUrl(value) {
  return (value || "https://api.openai.com/v1").replace(/\/+$/, "");
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
  if (els.size.value !== "custom") return els.size.value;
  const width = clamp(Number(els.width.value), 256, 3840);
  const height = clamp(Number(els.height.value), 256, 3840);
  return `${Math.round(width)}x${Math.round(height)}`;
}

function getApiSize() {
  const size = getTargetSize();
  if (size === "auto") return size;
  const parsed = parseSize(size);
  if (!parsed) return size;
  return `${ceil16(parsed.width)}x${ceil16(parsed.height)}`;
}

function getSize() {
  return getTargetSize();
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

function syncTierToSize() {
  const size = tierToSize[els.resolutionTier.value];
  if (!size) return;
  els.size.value = size;
  toggleCustomSize();
  updateCostEstimate();
}

function sizePixels(size) {
  if (size === "auto") return 1024 * 1024;
  const parsed = parseSize(size);
  if (!parsed) return 1024 * 1024;
  return parsed.width * parsed.height;
}

function getProviderBillingTier(size) {
  if (size === "auto") return "auto";
  const match = String(size).match(/^(\d+)x(\d+)$/);
  if (!match) return "auto";
  const longEdge = Math.max(Number(match[1]), Number(match[2]));
  if (longEdge <= 1024) return "1K";
  if (longEdge <= 2048) return "2K";
  return "4K";
}

function updateCostEstimate() {
  const model = getModel() || "自定义模型";
  const size = getSize();
  const apiSize = getApiSize();
  const count = getCount();
  const quality = els.quality.value || "auto";
  const pixelRatio = sizePixels(apiSize) / (1024 * 1024);
  const q = qualityMultiplier[quality] || 1;
  const relative = Math.max(0.1, pixelRatio * q * count);
  const label = size === "auto" ? "自动尺寸" : size;
  const apiHint = apiSize !== size ? `接口尺寸 ${apiSize}，生成后处理为 ${size}。` : "";
  const billingTier = getProviderBillingTier(apiSize);
  const tierPrice = providerTierPrices[billingTier];
  const providerHint = billingTier === "auto"
    ? "服务商计费档：自动判定，生成前无法精确预估。"
    : `服务商计费档：预计 ${billingTier}${tierPrice ? `，约 $${(tierPrice * count).toFixed(2)} / ${count} 张` : ""}。`;
  const officialHint = model.startsWith("gpt-image")
    ? "这里按你当前供应商的 1K/2K/4K 阶梯估算，最终以账单为准。"
    : "第三方接口价格以服务商为准。";
  els.costEstimate.textContent = `费用预估：${label} · ${quality} · ${count} 张，${apiHint}${providerHint} 像素/质量相对量约 ${relative.toFixed(2)}x。${officialHint}`;
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
  const positive = optimize && !prompt.includes(optimize)
    ? `${prompt}，${optimize}`
    : prompt;
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

  setBusy(true);
  flashStatus(`正在请求 ${state.settings.providerName || "图像接口"}...`);
  try {
    const response = await fetch("/api/images", {
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
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.details?.error?.message || "生成失败。");
    }
    const images = (data.data || []).filter((item) => item.dataUrl || item.url);
    if (!images.length) throw new Error("接口没有返回图片。");
    const processedImages = await resizeImagesToTarget(images);
    renderResults(processedImages);
    const historySaved = await addHistory(processedImages);
    const historyNote = historySaved ? "" : " 图片已生成，但浏览器历史空间不足，未保存到历史。";
    flashStatus(`完成：${images.length} 张图片。${els.costEstimate.textContent.replace("费用预估：", "")}${historyNote}`, !historySaved);
  } catch (error) {
    flashStatus(error.message, true);
  } finally {
    setBusy(false);
  }
}

function renderResults(images) {
  els.results.innerHTML = "";
  for (const image of images) {
    els.results.appendChild(createImageCard(image, "result"));
  }
}

async function resizeImagesToTarget(images) {
  const targetSize = getTargetSize();
  const apiSize = getApiSize();
  if (targetSize === "auto" || targetSize === apiSize) return images;
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
    context.drawImage(bitmap, 0, 0, target.width, target.height);
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

async function addHistory(images) {
  const now = new Date().toISOString();
  const prompt = els.prompt.value.trim();
  const model = getModel();
  const size = getSize();
  const quality = els.quality.value;
  const format = els.format.value || inferFormat(images[0]?.dataUrl || images[0]?.url);
  const entries = images.map((image) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    dataUrl: image.dataUrl || image.url,
    prompt,
    model,
    size,
    quality,
    format,
    createdAt: now
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

  const src = image.dataUrl || image.url;
  const prompt = image.prompt || els.prompt.value.trim();
  const meta = [image.model, image.size, image.quality].filter(Boolean).join(" · ");
  const format = image.format || inferFormat(src);
  img.src = src;
  text.textContent = `${prompt || "Image2 Studio"}${meta ? `\n${meta}` : ""}`;
  download.href = src;
  download.download = `image2-${kind}-${Date.now()}.${format}`;
  reuse.addEventListener("click", () => {
    els.prompt.value = prompt;
    flashStatus("提示词已复用");
  });
  copy.addEventListener("click", () => copyImage(src));
  card.dataset.kind = kind;
  return card;
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
  els.historyCount.textContent = `${state.history.length} 条记录`;
  for (const item of state.history) {
    els.history.appendChild(createImageCard(item, "history"));
  }
}

function flashStatus(message, isError = false) {
  els.statusText.textContent = message;
  els.statusText.classList.toggle("error-text", isError);
}

function renderFilePreview(container, files) {
  container.innerHTML = "";
  for (const file of files) {
    const img = document.createElement("img");
    img.src = file.dataUrl;
    img.alt = file.name || "reference";
    container.appendChild(img);
  }
}

async function readFiles(fileList, limit = 6) {
  const files = Array.from(fileList || []).slice(0, limit);
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

function resetForm() {
  els.prompt.value = "";
  els.avoid.value = "";
  els.preset.value = "";
  els.model.value = "gpt-image-2";
  els.customModel.value = "";
  els.count.value = "1";
  els.size.value = "1024x1024";
  els.resolutionTier.value = "1k-square";
  els.quality.value = "auto";
  els.promptOptimize.value = "balanced";
  els.background.value = "auto";
  els.format.value = "png";
  els.compression.value = "90";
  els.moderation.value = "auto";
  els.inputFidelity.value = "auto";
  state.references = [];
  state.mask = null;
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
  els.size.addEventListener("change", () => {
    if (els.size.value !== tierToSize[els.resolutionTier.value]) {
      els.resolutionTier.value = "auto";
    }
    toggleCustomSize();
    updateCostEstimate();
  });
  els.resolutionTier.addEventListener("change", syncTierToSize);
  els.count.addEventListener("input", updateCostEstimate);
  els.quality.addEventListener("change", updateCostEstimate);
  els.width.addEventListener("input", updateCostEstimate);
  els.height.addEventListener("input", updateCostEstimate);
  els.format.addEventListener("change", updateCostEstimate);
  els.model.addEventListener("change", toggleCustomModel);
  els.customModel.addEventListener("input", updateCostEstimate);
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
    renderFilePreview(els.refPreview, []);
  });
  els.clearMask.addEventListener("click", () => {
    state.mask = null;
    els.maskImage.value = "";
    renderFilePreview(els.maskPreview, []);
  });
  els.referenceImages.addEventListener("change", async (event) => {
    state.references = await readFiles(event.target.files, 6);
    renderFilePreview(els.refPreview, state.references);
  });
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
toggleCustomSize();
toggleCustomModel();
updateCostEstimate();
