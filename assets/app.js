import { MODULES, getModuleBySlug } from "./data/modules.js";
import { ARTICLES, getArticleById, getArticlesByModuleSlug } from "./data/articles.js";
import { MODULE_QUIZ, FINAL_QUIZ } from "./data/quiz.generated.js";

// 用于在更新渲染/清洗逻辑后，自动清空内存缓存，避免旧的 md HTML 继续显示
const APP_VERSION = "2026-04-13.3";

const LS_KEYS = {
  theme: "stripekb.theme",
  bookmarks: "stripekb.bookmarks",
  read: "stripekb.read",
  pace: "stripekb.pace",
  quiz: "stripekb.quiz",
  streak: "stripekb.streak",
  translateLang: "stripekb.translate.lang",
  translateEndpoint: "stripekb.translate.endpoint",
  modulePassed: "stripekb.modulePassed", // { [moduleSlug]: true }
  modulePrompted: "stripekb.modulePrompted", // { [moduleSlug]: true }
};

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function lsGet(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  return safeJsonParse(raw, fallback);
}
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getModulePassedMap() {
  return lsGet(LS_KEYS.modulePassed, {});
}

function setModulePassed(moduleSlug, passed) {
  const m = getModulePassedMap();
  if (passed) m[moduleSlug] = true;
  else delete m[moduleSlug];
  lsSet(LS_KEYS.modulePassed, m);
}

function hasPassedModule(moduleSlug) {
  const m = getModulePassedMap();
  return Boolean(m && m[moduleSlug]);
}

function isModuleUnlocked(moduleSlug) {
  const idx = MODULES.findIndex((m) => m.slug === moduleSlug);
  if (idx <= 0) return true;
  const prev = MODULES[idx - 1];
  return hasPassedModule(prev.slug);
}

function allModulesPassed() {
  return MODULES.every((m) => hasPassedModule(m.slug));
}

function getModulePromptedMap() {
  return lsGet(LS_KEYS.modulePrompted, {});
}

function setModulePrompted(moduleSlug) {
  const m = getModulePromptedMap();
  m[moduleSlug] = true;
  lsSet(LS_KEYS.modulePrompted, m);
}

function hasPromptedModule(moduleSlug) {
  const m = getModulePromptedMap();
  return Boolean(m && m[moduleSlug]);
}

function getTheme() {
  const saved = localStorage.getItem(LS_KEYS.theme);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 轻量 Markdown 渲染（覆盖常见语法：标题/段落/列表/代码块/粗体/行内代码）
// 目标：无需外部依赖，纯静态站点可运行。
function markdownToHtml(md) {
  const lines = String(md || "").replaceAll("\r\n", "\n").split("\n");
  let html = "";
  let inCode = false;
  let inUl = false;
  let inOl = false;
  let codeBuf = [];
  let paraBuf = [];

  const flushLists = () => {
    if (inUl) {
      html += "</ul>";
      inUl = false;
    }
    if (inOl) {
      html += "</ol>";
      inOl = false;
    }
  };

  const isCjk = (ch) => /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/.test(ch);
  const joinPara = (parts) => {
    const out = [];
    for (const p of parts) {
      const s = String(p).trim();
      if (!s) continue;
      if (!out.length) {
        out.push(s);
        continue;
      }
      const prev = out[out.length - 1];
      const a = prev[prev.length - 1] || "";
      const b = s[0] || "";
      const glue = isCjk(a) && isCjk(b) ? "" : " ";
      out[out.length - 1] = prev + glue + s;
    }
    return out.join("");
  };

  const flushPara = () => {
    if (!paraBuf.length) return;
    flushLists();
    const text = joinPara(paraBuf);
    if (text) html += `<p>${inline(text)}</p>`;
    paraBuf = [];
  };

  const inline = (s) => {
    let x = escapeHtml(s);
    // 行内代码
    x = x.replace(/`([^`]+?)`/g, "<code>$1</code>");
    // 粗体
    x = x.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
    // 链接 [text](url)
    x = x.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return x;
  };

  const splitRow = (row) => {
    // 兼容 | a | b | 或 a | b
    const r = row.trim().replace(/^\|/, "").replace(/\|$/, "");
    return r.split("|").map((c) => c.trim());
  };
  const isTableSep = (row) => {
    const r = row.trim();
    return /^(\|?\s*:?-{3,}:?\s*)+\|?$/.test(r.replace(/\s*\|\s*/g, "|"));
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      if (!inCode) {
        flushPara();
        flushLists();
        inCode = true;
        codeBuf = [];
      } else {
        inCode = false;
        html += `<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
        codeBuf = [];
      }
      continue;
    }

    if (inCode) {
      codeBuf.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushPara();
      flushLists();
      continue;
    }

    // Markdown 表格（pipe table）
    // 形如：
    // | a | b |
    // |---|---|
    // | 1 | 2 |
    if (!inCode && line.includes("|") && idx + 1 < lines.length && isTableSep(lines[idx + 1])) {
      flushPara();
      flushLists();
      const headers = splitRow(line);
      idx += 1; // skip separator
      const rows = [];
      while (idx + 1 < lines.length) {
        const nxt = lines[idx + 1];
        if (!nxt.trim()) break;
        if (!nxt.includes("|")) break;
        rows.push(splitRow(nxt));
        idx += 1;
      }

      const thead = `<thead><tr>${headers
        .map((h) => `<th>${inline(h)}</th>`)
        .join("")}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
      html += `<div class="md-table"><table>${thead}${tbody}</table></div>`;
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      flushLists();
      const level = Math.min(6, h[1].length);
      html += `<h${level}>${inline(h[2])}</h${level}>`;
      continue;
    }

    // 引用块
    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      flushPara();
      flushLists();
      html += `<blockquote>${inline(bq[1])}</blockquote>`;
      continue;
    }

    // 分割线
    if (/^(-{3,}|\*{3,})\s*$/.test(line.trim())) {
      flushPara();
      flushLists();
      html += `<hr/>`;
      continue;
    }

    // 无序列表
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (!inUl) {
        flushLists();
        html += "<ul>";
        inUl = true;
      }
      html += `<li>${inline(ul[1])}</li>`;
      continue;
    }

    // 有序列表
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      flushPara();
      if (!inOl) {
        flushLists();
        html += "<ol>";
        inOl = true;
      }
      html += `<li>${inline(ol[1])}</li>`;
      continue;
    }

    // 普通段落：连续多行合并为同一个段落
    paraBuf.push(line);
  }

  flushPara();
  flushLists();
  if (inCode) html += `<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
  return html;
}

function sanitizeMarkdown(rawMd, opts = {}) {
  let md = String(rawMd || "");
  // 去除 YAML front matter（--- ... ---）
  if (md.startsWith("---")) {
    const m = md.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
    if (m) md = md.slice(m[0].length);
  }
  // 删除常见“目录”噪声（爬虫容易重复）
  // 规则：如果出现“目录”独立一行，后续连续的目录项（以 • 或 - 开头）最多删除 60 行，直到遇到标题
  const lines = md.replaceAll("\r\n", "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "目录") {
      let j = i + 1;
      let dropped = 0;
      while (j < lines.length && dropped < 60) {
        const t = lines[j].trim();
        if (/^#{1,6}\s+/.test(t)) break;
        if (!t || t.startsWith("•") || t.startsWith("-") || t.includes("•")) {
          j += 1;
          dropped += 1;
          continue;
        }
        // 非目录项也先删除（很多文章目录会重复标题）
        j += 1;
        dropped += 1;
      }
      i = j;
      continue;
    }
    out.push(line);
    i += 1;
  }
  // 去除“连续重复行/重复段落”
  const out2 = [];
  for (const line of out) {
    const cur = line.trim();
    const prev = (out2.length ? out2[out2.length - 1] : "").trim();
    // 去掉连续完全重复（包括空行）
    if (cur && prev && cur === prev) continue;
    // 去掉无意义的单字符噪声行（常见于爬取残留）
    if (cur.length === 1 && "。·•".includes(cur)) continue;
    out2.push(line);
  }

  // 去掉连续重复“块”（按空行分段）
  const joined = out2.join("\n");
  const blocks = joined.split(/\n{2,}/);
  const normBlock = (b) =>
    b
      .replaceAll("\r", "")
      .replace(/\s+/g, " ")
      .trim();

  // 段内“重复句子”去重（常见：爬虫把同一段话重复输出）
  const dedupSentences = (b) => {
    const text = b.trim();
    // 太短不处理，避免误伤
    if (text.length < 80) return b.trimEnd();
    // 代码块/表格不做句子级处理
    if (text.includes("```") || text.includes("|")) return b.trimEnd();

    // 以中文句号/问号/叹号/英文 .!? 做近似切分（保留分隔符）
    const parts = text.split(/([。！？.!?])/);
    const outParts = [];
    let prevNorm = null;
    for (let i = 0; i < parts.length; i += 2) {
      const seg = (parts[i] || "").trim();
      const punct = parts[i + 1] || "";
      if (!seg) continue;
      const cur = (seg + punct).trim();
      const curNorm = cur.replace(/\s+/g, "");
      if (prevNorm && curNorm === prevNorm) continue;
      outParts.push(cur);
      prevNorm = curNorm;
    }
    // 句子之间不强行插空格，避免中文出现多余空格
    const merged = outParts.join("");
    return (merged || text).trimEnd();
  };

  const cleaned = [];
  const seen = new Set();
  let lastNorm = null;
  for (const b0 of blocks) {
    const b1 = dedupSentences(b0);
    const norm = normBlock(b1);
    if (!norm) continue;

    // 1) 相邻重复块（强规则）
    if (lastNorm && norm === lastNorm) continue;

    // 2) 全文重复块（弱规则）：同一大段内容在文章里出现两次，保留第一次
    // 为避免误伤：只对“较长”的块做全局去重
    if (norm.length >= 40) {
      if (seen.has(norm)) continue;
      seen.add(norm);
    }

    cleaned.push(b1.trimEnd());
    lastNorm = norm;
  }

  let result = cleaned.join("\n\n");

  // 可选：移除开头的 H1（常见：正文里自带标题，而页面已单独显示标题）
  if (opts.stripTitle) {
    const lines3 = result.split("\n");
    const normTitle = String(opts.stripTitle)
      .trim()
      .replace(/\|\s*stripe.*$/i, "")
      .replace(/[|｜]/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();
    // 移除“开头区域”的第一条 H1（不强依赖标题匹配，避免 BOM/噪声导致遗漏）
    // 规则：在前 40 行内，跳过空行；找到第一条形如 "# xxx" 的行即删除（并删除紧随其后的空行）
    for (let k = 0; k < Math.min(lines3.length, 40); k++) {
      const ln0 = lines3[k];
      const ln = ln0.replace(/^\uFEFF/, "").trim(); // 兼容 BOM
      if (!ln) continue;
      if (/^#\s+/.test(ln)) {
        lines3.splice(k, 1);
        if (lines3[k] && !lines3[k].trim()) lines3.splice(k, 1);
        break;
      }
      // 如果已经遇到正文（非标题），则不再向后找，避免误删文章中的中段标题
      break;
    }

    // 兜底：如果开头第一行是“纯标题文本”（不带 #），也移除一次
    for (let k = 0; k < Math.min(lines3.length, 8); k++) {
      const ln = String(lines3[k] || "").replace(/^\uFEFF/, "").trim();
      if (!ln) continue;
      const n = ln
        .replace(/\|\s*stripe.*$/i, "")
        .replace(/[|｜]/g, " ")
        .replace(/\s+/g, " ")
        .toLowerCase();
      if (n && normTitle && (n === normTitle || n.includes(normTitle) || normTitle.includes(n))) {
        lines3.splice(k, 1);
        if (lines3[k] && !lines3[k].trim()) lines3.splice(k, 1);
      }
      break;
    }
    result = lines3.join("\n");
  }

  // 规范化：把“行内标题 ###”拆成真正的标题行；把“·/•”拆成列表行
  // 解决两类高频问题：
  // 1) 多个 bullet 挤在一个段落里（不换行）
  // 2) “###/##”出现在正文中（通常是因为它出现在行中间，没被当作标题解析）
  const normalizeBulletsAndHeadings = (text) => {
    const lines = String(text || "").replaceAll("\r\n", "\n").split("\n");
    const out = [];
    let inCode = false;
    const bulletChars = "•·・●";
    const bulletRe = new RegExp(`[${bulletChars}]\\s+`, "g");

    const countBullets = (s) => {
      const m = s.match(new RegExp(`[${bulletChars}]\\s+`, "g"));
      return m ? m.length : 0;
    };

    const splitInlineHeadings = (line) => {
      // 将 “...。 ### 标题” 拆成两行："...。" 与 "### 标题"
      let cur = line;
      const parts = [];
      while (true) {
        const idx = cur.search(/\s#{2,6}\s+/);
        if (idx <= 0) break;
        const pre = cur.slice(0, idx).trimEnd();
        const rest = cur.slice(idx).trimStart();
        if (pre) parts.push(pre);
        cur = rest;
      }
      parts.push(cur);
      return parts;
    };

    const splitBullets = (line) => {
      const t = line.trim();
      if (!t) return [line];
      // 已经是 markdown 列表的不动
      if (/^([-*]|\d+\.)\s+/.test(t)) return [line];

      const bCount = countBullets(t);
      const startsWithBullet = new RegExp(`^[${bulletChars}]\\s+`).test(t);
      const hasPunctBullet = /[。！？.!?]\s*[•·・●]\s+/.test(t);
      if (!(startsWithBullet || bCount >= 2 || hasPunctBullet)) return [line];

      // 情况 A：整行就是 bullet 串（以 bullet 开头）
      if (startsWithBullet) {
        const items = t.split(new RegExp(`[${bulletChars}]\\s+`)).filter((x) => x.trim());
        return items.map((x) => `- ${x.trim()}`);
      }

      // 情况 B：前面有正常句子，后面跟多个 bullet
      const firstIdx = t.search(new RegExp(`[${bulletChars}]\\s+`));
      if (firstIdx > 0) {
        const pre = t.slice(0, firstIdx).trimEnd();
        const rest = t.slice(firstIdx);
        const items = rest.split(new RegExp(`[${bulletChars}]\\s+`)).filter((x) => x.trim());
        const outLines = [];
        if (pre) outLines.push(pre);
        items.forEach((x) => outLines.push(`- ${x.trim()}`));
        return outLines;
      }

      // fallback
      return [line.replace(bulletRe, "\n- ")];
    };

    for (const raw of lines) {
      const line = raw.replace(/^\uFEFF/, ""); // BOM
      if (line.trimStart().startsWith("```")) {
        inCode = !inCode;
        out.push(raw);
        continue;
      }
      if (inCode) {
        out.push(raw);
        continue;
      }

      // 先拆“行内标题”
      const headingParts = splitInlineHeadings(line);
      for (const hp of headingParts) {
        // 再拆 bullet
        const bulletParts = splitBullets(hp);
        bulletParts.forEach((x) => out.push(x));
      }
    }

    return out.join("\n");
  };

  result = normalizeBulletsAndHeadings(result);

  return result;
}

function getTranslateEndpoint() {
  // 可在 localStorage 手动设置 stripekb.translate.endpoint 来替换默认服务
  // 例如：https://libretranslate.de/translate
  return localStorage.getItem(LS_KEYS.translateEndpoint) || "https://libretranslate.de/translate";
}

function getPreferredTranslateLang() {
  return localStorage.getItem(LS_KEYS.translateLang) || "";
}

function setPreferredTranslateLang(lang) {
  localStorage.setItem(LS_KEYS.translateLang, lang);
}

function translationCacheKey(articleId, targetLang) {
  return `stripekb.translation.${targetLang}.${articleId}`;
}

async function libreTranslate(text, targetLang) {
  const endpoint = getTranslateEndpoint();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: "auto",
      target: targetLang,
      format: "text",
      api_key: "",
    }),
  });
  if (!res.ok) throw new Error(`翻译接口错误：HTTP ${res.status}`);
  const data = await res.json();
  if (!data || typeof data.translatedText !== "string") throw new Error("翻译接口返回格式异常");
  return data.translatedText;
}

function extractTranslatableSegments(md) {
  const lines = String(md || "").replaceAll("\r\n", "\n").split("\n");
  const segs = [];
  let inCode = false;

  const push = (t) => {
    const s = String(t || "").trim();
    if (!s) return;
    segs.push(s);
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (!line.trim()) continue;

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      push(h[2]);
      continue;
    }
    // 引用
    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      push(bq[1]);
      continue;
    }
    // 列表
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      push(ul[1]);
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      push(ol[1]);
      continue;
    }
    // 表格：| a | b |
    if (line.includes("|")) {
      const cells = line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      // 分隔线不翻译
      if (!cells.every((c) => /^:?-{3,}:?$/.test(c))) {
        cells.forEach(push);
      }
      continue;
    }

    // 普通文本
    push(line);
  }
  return segs;
}

async function translateMarkdown(md, targetLang, onProgress) {
  // 把 markdown 拆成“可翻译片段”，用哨兵拼接后分块请求
  const sentinel = "\n<<<STRIPEKB_SPLIT>>>\n";
  const segments = extractTranslatableSegments(md);
  if (!segments.length) return md;

  const chunks = [];
  let cur = [];
  let curLen = 0;
  const maxChars = 3200; // LibreTranslate 公共实例通常有限制，保守一些
  for (const s of segments) {
    const addLen = s.length + sentinel.length;
    if (curLen + addLen > maxChars && cur.length) {
      chunks.push(cur.join(sentinel));
      cur = [s];
      curLen = s.length + sentinel.length;
    } else {
      cur.push(s);
      curLen += addLen;
    }
  }
  if (cur.length) chunks.push(cur.join(sentinel));

  const translatedSegments = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress?.({ phase: "translate", current: i + 1, total: chunks.length });
    const out = await libreTranslate(chunks[i], targetLang);
    // 尽量按哨兵切回 segments；若哨兵被翻译破坏，就降级为整块
    const parts = out.split("<<<STRIPEKB_SPLIT>>>");
    if (parts.length > 1) {
      parts.forEach((p) => translatedSegments.push(p.replace(/\n/g, " ").trim()));
    } else {
      translatedSegments.push(out.replace(/\n/g, " ").trim());
    }
    // 轻微限速，避免公共服务限流
    await sleep(180);
  }

  // 生成“译文模式”的 markdown（保留结构符号，替换正文文本）
  const lines = String(md || "").replaceAll("\r\n", "\n").split("\n");
  let inCode = false;
  let segIdx = 0;
  const outLines = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("```")) {
      inCode = !inCode;
      outLines.push(raw);
      continue;
    }
    if (inCode) {
      outLines.push(raw);
      continue;
    }
    if (!line.trim()) {
      outLines.push(raw);
      continue;
    }

    const nextSeg = () => translatedSegments[segIdx++] || "";

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      outLines.push(`${h[1]} ${nextSeg()}`);
      continue;
    }
    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      outLines.push(`> ${nextSeg()}`);
      continue;
    }
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      outLines.push(`${line.slice(0, 2)}${nextSeg()}`);
      continue;
    }
    const ol = line.match(/^(\d+\.)\s+(.*)$/);
    if (ol) {
      outLines.push(`${ol[1]} ${nextSeg()}`);
      continue;
    }
    if (line.includes("|")) {
      const trimmed = line.trim();
      // 分隔线行保持原样
      const cells = trimmed
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
      const isSep = cells.filter(Boolean).every((c) => /^:?-{3,}:?$/.test(c));
      if (isSep) {
        outLines.push(raw);
      } else {
        const newCells = cells.map((c) => (c.trim() ? nextSeg() : c));
        outLines.push(`| ${newCells.join(" | ")} |`);
      }
      continue;
    }

    outLines.push(nextSeg() || raw);
  }

  return outLines.join("\n");
}

async function hydrateRemoteMarkdown() {
  const nodes = [...document.querySelectorAll("[data-md-path]")];
  if (!nodes.length) return;
  // 版本化缓存：避免旧逻辑渲染结果被复用导致“标题重复仍存在”
  if (window.__mdCacheVersion !== APP_VERSION) {
    window.__mdCacheVersion = APP_VERSION;
    window.__mdCache = new Map();
    window.__mdSourceCache = new Map();
  }
  window.__mdCache = window.__mdCache || new Map();
  window.__mdSourceCache = window.__mdSourceCache || new Map();

  for (const el of nodes) {
    const path = el.getAttribute("data-md-path");
    if (!path || el.getAttribute("data-md-loaded") === "1") continue;
    el.setAttribute("data-md-loaded", "1");

    try {
      const cacheKey = `${APP_VERSION}:${path}`;
      const bodyHost = el.querySelector("[data-md-body]");
      if (!bodyHost) continue;
      if (window.__mdCache.has(cacheKey)) {
        bodyHost.innerHTML = window.__mdCache.get(cacheKey);
        continue;
      }
      const res = await fetch(path, { cache: "force-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.text();
      const articleId = el.getAttribute("data-article-id") || "";
      const articleTitle = articleId ? getArticleById(articleId)?.title : "";
      const md = sanitizeMarkdown(raw, { stripTitle: articleTitle || "" });
      window.__mdSourceCache.set(path, md);
      const html = markdownToHtml(md);
      window.__mdCache.set(cacheKey, html);
      bodyHost.innerHTML = html;
    } catch (e) {
      const bodyHost = el.querySelector("[data-md-body]");
      if (bodyHost) bodyHost.innerHTML = `<div class="small">内容加载失败：${escapeHtml(String(e))}</div>`;
    }
  }
}

function h(tag, attrs = {}, children = "") {
  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v !== false && v != null)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeHtml(v)}"`))
    .join("");
  return `<${tag}${attrStr}>${children}</${tag}>`;
}

function pill(text, kind = "") {
  const cls = ["pill", kind ? ` ${kind}` : ""].join("");
  return `<span class="${cls.trim()}">${escapeHtml(text)}</span>`;
}

function formatPct(v) {
  const n = Math.max(0, Math.min(100, Math.round(v)));
  return `${n}%`;
}

function nowDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function updateStreakOnRead() {
  const streak = lsGet(LS_KEYS.streak, { lastDay: null, days: 0 });
  const today = nowDateKey();
  if (streak.lastDay === today) return streak;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(
    yesterday.getDate(),
  ).padStart(2, "0")}`;

  const days = streak.lastDay === yKey ? (streak.days || 0) + 1 : 1;
  const next = { lastDay: today, days };
  lsSet(LS_KEYS.streak, next);
  return next;
}

function getBookmarks() {
  return new Set(lsGet(LS_KEYS.bookmarks, []));
}
function setBookmarks(set) {
  lsSet(LS_KEYS.bookmarks, [...set]);
}
function getReadSet() {
  return new Set(lsGet(LS_KEYS.read, []));
}
function setReadSet(set) {
  lsSet(LS_KEYS.read, [...set]);
}
function markRead(articleId) {
  const read = getReadSet();
  if (!read.has(articleId)) {
    read.add(articleId);
    setReadSet(read);
    updateStreakOnRead();
  }
}

function route() {
  // hash route: #/learn, #/payment-infra/gateway
  const raw = location.hash.replace(/^#/, "") || "/";
  const clean = raw.startsWith("/") ? raw : `/${raw}`;
  const parts = clean.replace(/^\/+/, "").split("/").filter(Boolean);
  return { raw: clean, parts };
}

function navLink(label, href, isActive) {
  return `<a href="${href}" class="${isActive ? "active" : ""}">${escapeHtml(label)}</a>`;
}

function topbar(currentPath) {
  return `
  <header class="topbar">
    <div class="container topbar-inner">
      <a class="logo" href="#/"><span>Stripe 支付知识库</span></a>

      <div class="spacer"></div>

      <div class="searchbar">
        <input id="topSearch" type="search" placeholder="🔎 搜索支付知识…" autocomplete="off" />
        <kbd>⌘K</kbd>
      </div>

      <button class="iconbtn" id="themeToggle" title="切换明暗模式">🌓</button>
      <a class="iconbtn" href="#/learn" title="学习中心">📚</a>
    </div>
  </header>
  `;
}

function bottomNav(currentPath) {
  const is = (p) => currentPath === p || currentPath.startsWith(p + "/");
  const item = (label, icon, href, active) =>
    `<a href="${href}" class="${active ? "active" : ""}"><span>${icon}</span><span>${label}</span></a>`;
  return `
    <nav class="bottomnav" aria-label="底部导航">
      ${item("首页", "🏠", "#/", is("/"))}
      ${item("学习", "📚", "#/learn", is("/learn"))}
      ${item("测验", "🧠", "#/quiz", is("/quiz"))}
      ${item("收藏", "⭐", "#/bookmarks", is("/bookmarks"))}
      ${item("我的", "👤", "#/progress", is("/progress"))}
    </nav>
  `;
}

function pageShell(currentPath, contentHtml) {
  return `
    ${topbar(currentPath)}
    <main class="main">
      <div class="container">
        ${contentHtml}
        <div class="footer">
          内容参考自 Stripe 官方知识库，仅供学习参考。<br/>
          当前为纯静态 HTML 演示版：内容数据为 ${ARTICLES.length} 篇文章（已去重）。
        </div>
      </div>
    </main>
    ${bottomNav(currentPath)}
    ${searchModal()}
    ${translateModal()}
  `;
}

function searchModal() {
  return `
  <div class="modal" id="searchModal" role="dialog" aria-modal="true" aria-label="搜索">
    <div class="modal-panel">
      <div class="modal-head">
        <input id="modalSearchInput" type="search" placeholder="输入关键词搜索文章标题/模块…" autocomplete="off" />
        <button class="iconbtn" id="modalCloseBtn" title="关闭">Esc</button>
      </div>
      <div class="modal-body">
        <div id="modalResults" class="list"></div>
      </div>
    </div>
  </div>
  `;
}

function translateModal() {
  return `
  <div class="modal" id="translateModal" role="dialog" aria-modal="true" aria-label="翻译">
    <div class="modal-panel">
      <div class="modal-head">
        <div style="font-weight:800;">一键翻译</div>
        <div class="spacer"></div>
        <button class="iconbtn" id="translateCloseBtn" title="关闭">Esc</button>
      </div>
      <div class="modal-body">
        <div class="row">
          <div class="title">选择目标语言</div>
          <div class="small">提示：这是“翻译工具/插件入口”。点击下面按钮才会开始翻译；首次翻译会稍慢，之后会缓存到本地。</div>
          <div class="cta-row" style="margin-top:12px;">
            <button class="btn primary" id="translateToZh">翻译成中文</button>
            <button class="btn" id="translateToEn">Translate to English</button>
            <button class="btn" id="translateBack">切回原文</button>
          </div>
        </div>
        <div class="row" id="translateProgress" style="display:none;"></div>
        <div class="row">
          <div class="small">如翻译服务不可用，你可以在控制台或 localStorage 设置 <code>stripekb.translate.endpoint</code> 为可用的 LibreTranslate <code>/translate</code> 地址。</div>
        </div>
      </div>
    </div>
  </div>
  `;
}

function renderHome() {
  const read = getReadSet();
  const pct = (read.size / Math.max(ARTICLES.length, 1)) * 100;
  const streak = lsGet(LS_KEYS.streak, { days: 0 });
  const modulesList = MODULES.map((m) => {
    const modRead = getArticlesByModuleSlug(m.slug).filter((a) => read.has(a.id)).length;
    const modTotal = Math.max(getArticlesByModuleSlug(m.slug).length, 0);
    const locked = !isModuleUnlocked(m.slug);
    return `
      <div class="module-item" ${locked ? 'data-locked="1" data-module="' + escapeHtml(m.slug) + '"' : 'data-link="#/' + escapeHtml(m.slug) + '"'}>
        <div>
          <div class="name">${escapeHtml(m.name)}</div>
          <div class="meta">${locked ? "🔒 需完成上一模块并通过测试后解锁" : `${escapeHtml(m.tag)} · ${escapeHtml(m.points)} 知识点 · ${modRead}/${modTotal} 已读`}</div>
        </div>
        <div class="arrow">${locked ? "🔒" : "›"}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="section">
      <section class="hero-proto">
        <h1>Stripe 支付知识库</h1>
        <p>面向支付行业与电商从业者的系统化学习平台：网关/卡支付/跨境/风控/合规，一站式掌握。</p>
        <div class="hero-actions">
          <a class="btn primary" href="#/learn">开始学习</a>
          <a class="btn ghost" href="#/quiz">知识测验</a>
          <button class="btn ghost" id="openSearchBtn">🔎 搜索</button>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="label">知识模块</div><div class="value">10</div></div>
          <div class="hero-stat"><div class="label">学习进度</div><div class="value">${formatPct(pct)}</div></div>
        </div>
      </section>

      <section class="card-lite">
        <div class="title">欢迎回来</div>
        <div class="desc">建议：每天学 2 篇就很棒！当前连续学习 <b>${Number(streak.days || 0)}</b> 天。</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 8px;color:var(--secondary);font-size:12px;">
          <span>总体进度</span><span>${formatPct(pct)}</span>
        </div>
        <div class="progressbar"><div style="width:${formatPct(pct)}"></div></div>
      </section>

      <section class="card-lite">
        <div class="title">关键数据</div>
        <div class="desc">快速了解平台规模与学习建议。</div>
        <div class="stats" style="margin-top:10px">
          <div class="stat"><div class="n">${ARTICLES.length}</div><div class="t">文章总数</div></div>
          <div class="stat"><div class="n">970+</div><div class="t">核心知识点</div></div>
          <div class="stat"><div class="n">2</div><div class="t">建议/天</div></div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>核心知识模块</h2>
          <p class="hint">按模块学习，或者用搜索直达</p>
        </div>
        <div class="module-list">
          ${modulesList}
        </div>
      </section>

      <section class="card-lite">
        <div class="title">学习路径建议</div>
        <div class="desc">
          1) 先学支付基础设施 → 2) 再学卡/转账 → 3) 跨境与风控合规 → 4) 结账转化与本地化。
        </div>
        <div class="hero-actions" style="margin-top:12px">
          <a class="btn primary" href="#/learn">进入学习中心</a>
          <a class="btn" href="#/progress">查看学习进度</a>
        </div>
      </section>
    </div>
  `;
}

function paceOptions() {
  const saved = localStorage.getItem(LS_KEYS.pace) || "steady";
  const opts = [
    { id: "easy", label: "🌱 轻松起步", desc: "每天 1 篇，~5分钟" },
    { id: "steady", label: "📚 稳扎稳打", desc: "每天 2 篇，~15分钟" },
    { id: "deep", label: "🚀 深度学习", desc: "每天 3 篇，~30分钟" },
  ];
  return `
    <div class="module-list">
      ${opts
        .map(
          (o) => `
        <div class="module-item" data-pace="${o.id}">
          <div>
            <div class="name">${escapeHtml(o.label)} ${o.id === saved ? `<span class="tag" style="margin-left:6px">已选择</span>` : ""}</div>
            <div class="meta">${escapeHtml(o.desc)}</div>
          </div>
          <div class="arrow">›</div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

function renderLearn() {
  const read = getReadSet();
  const done = read.size;
  const total = ARTICLES.length;
  const pct = (done / Math.max(total, 1)) * 100;
  const modulesList = MODULES.map((m) => {
    const arts = getArticlesByModuleSlug(m.slug);
    const doneM = arts.filter((a) => read.has(a.id)).length;
    const pctM = (doneM / Math.max(arts.length, 1)) * 100;
    const locked = !isModuleUnlocked(m.slug);
    return `
      <div class="module-item" ${locked ? 'data-locked="1" data-module="' + escapeHtml(m.slug) + '"' : 'data-link="#/' + escapeHtml(m.slug) + '"'}>
        <div>
          <div class="name">${escapeHtml(m.name)}</div>
          <div class="meta">${locked ? "🔒 需完成上一模块并通过测试后解锁" : `${escapeHtml(m.desc)}<br/>进度：${doneM}/${arts.length}（${formatPct(pctM)}）`}</div>
          <div class="progressbar" style="margin-top:10px"><div style="width:${formatPct(pctM)}"></div></div>
        </div>
        <div class="arrow">${locked ? "🔒" : "›"}</div>
      </div> 
    `;
  }).join("");

  return `
    <div class="section">
      <section class="hero-proto">
        <h1>学习中心</h1>
        <p>今日学习建议：0/2 篇。坚持每天一点点，进度会非常可观。</p>
        <div class="hero-actions">
          <button class="btn ghost" id="openSearchBtn2">🔎 搜索文章</button>
          <a class="btn ghost" href="#/quiz">去测验</a>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="label">已完成</div><div class="value">${done}/${total}</div></div>
          <div class="hero-stat"><div class="label">完成率</div><div class="value">${formatPct(pct)}</div></div>
        </div>
      </section>

      <section class="card-lite">
        <div class="title">学习节奏</div>
        <div class="desc">选一个适合你的节奏，坚持就会有反馈。</div>
        <div style="margin-top:12px">${paceOptions()}</div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>10 个知识模块</h2>
          <p class="hint">点击进入模块，逐篇学习</p>
        </div>
        <div class="module-list">${modulesList}</div>
      </section>
    </div>
  `;
}

function breadcrumb(items) {
  return `<div style="color:var(--muted);font-size:13px;margin-bottom:10px;">${items
    .map((it, idx) => {
      const sep = idx === 0 ? "" : "  ›  ";
      return `${sep}${it.href ? `<a href="${it.href}" style="text-decoration:underline;">${escapeHtml(it.label)}</a>` : escapeHtml(it.label)}`;
    })
    .join("")}</div>`;
}

function renderModule(moduleSlug) {
  const m = getModuleBySlug(moduleSlug);
  if (!m) return renderNotFound();
  if (!isModuleUnlocked(moduleSlug)) {
    const idx = MODULES.findIndex((x) => x.slug === moduleSlug);
    const prev = idx > 0 ? MODULES[idx - 1] : null;
    return `
      ${breadcrumb([{ label: "首页", href: "#/" }, { label: m.name }])}
      <div class="card-lite">
        <div class="title">🔒 模块尚未解锁</div>
        <div class="desc">请先完成并通过上一模块测试：<b>${escapeHtml(prev?.name || "上一模块")}</b>（≥80%）。</div>
        <div class="hero-actions" style="margin-top:12px">
          <a class="btn primary" href="#/${escapeHtml(prev?.slug || "learn")}">去上一模块</a>
          <a class="btn" href="#/learn">返回学习中心</a>
        </div>
      </div>
    `;
  }
  const read = getReadSet();
  const arts = getArticlesByModuleSlug(moduleSlug);
  window.__moduleListState = window.__moduleListState || {};
  const state = window.__moduleListState[moduleSlug] || { limit: 50 };
  const limit = Math.max(20, Number(state.limit || 50));
  const visible = arts.slice(0, limit);
  const done = arts.filter((a) => read.has(a.id)).length;
  const pct = (done / Math.max(arts.length, 1)) * 100;
  const moduleQuizUnlocked = pct >= 100;
  const passed = hasPassedModule(moduleSlug);

  const list = visible
    .map((a) => {
      const isRead = read.has(a.id);
      const badge = isRead ? pill("已读", "good") : pill(a.difficulty, a.difficulty === "入门" ? "good" : "warn");
      return `
        <div class="row">
          <div class="top">
            <div>
              <div class="title">${escapeHtml(a.title)}</div>
              <div class="small">${badge} · ${escapeHtml(a.category || "")} · 预计阅读 ${escapeHtml(a.readTime)}</div>
            </div>
            <a class="btn primary" href="#/${a.id}">阅读</a>
          </div>
        </div>
      `;
    })
    .join("");

  const moreBtn =
    arts.length > visible.length
      ? `<button class="btn" id="loadMoreBtn" data-module="${escapeHtml(moduleSlug)}">加载更多（已显示 ${visible.length}/${arts.length}）</button>`
      : `<span class="tag">已显示全部 ${arts.length} 篇</span>`;

  return `
    ${breadcrumb([{ label: "首页", href: "#/" }, { label: m.name }])}
    <div id="moduleMeta" data-module="${escapeHtml(moduleSlug)}" data-pct="${formatPct(pct)}" data-total="${arts.length}" data-done="${done}" data-passed="${passed ? "1" : "0"}"></div>
    <div class="row">
      <div class="top">
        <div>
          <div class="title">${escapeHtml(m.name)}</div>
          <div class="small">${escapeHtml(m.desc)}</div>
        </div>
        <a class="btn ${moduleQuizUnlocked ? "" : "disabled"}" ${moduleQuizUnlocked ? `href="#/quiz?module=${encodeURIComponent(m.slug)}"` : 'aria-disabled="true"'}>${
          passed ? "✅ 已通过模块测试" : moduleQuizUnlocked ? "🧠 开始模块测试" : "🧠 完成阅读后解锁测试"
        }</a>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 8px;color:var(--muted);font-size:13px;">
        <span>${done}/${arts.length} 已完成</span><span>${formatPct(pct)}</span>
      </div>
      <div class="progressbar"><div style="width:${formatPct(pct)}"></div></div>
      <div class="small" style="margin-top:10px;">Tab：${m.tabs.map((t) => `<span class="tag" style="margin-right:6px">${escapeHtml(t)}</span>`).join("")}</div>
    </div>

    <div class="section-title">
      <div>
        <h2>本模块文章</h2>
        <p>点击进入详情页，支持收藏、已读标记、测验。</p>
      </div>
      <div>${moreBtn}</div>
    </div>
    <div class="list">${list || `<div class="row"><div class="small">该模块暂未加载文章。</div></div>`}</div>
  `;
}

function renderSection(section) {
  const title = section.title ? `<h3 style="margin:14px 0 8px">${escapeHtml(section.title)}</h3>` : "";
  if (section.type === "text") {
    return `${title}<p class="sub" style="margin:0">${escapeHtml(section.content)}</p>`;
  }
  if (section.type === "list") {
    const items = Array.isArray(section.content) ? section.content : [];
    return `${title}<ol style="margin:0;padding-left:18px;line-height:1.8;color:var(--text)">${items
      .map((it) => `<li>${escapeHtml(it)}</li>`)
      .join("")}</ol>`;
  }
  if (section.type === "comparison") {
    const c = section.content || {};
    const col = (t, arr) => `
      <div class="row" style="background:color-mix(in srgb, var(--panel) 92%, transparent);">
        <div class="title">${escapeHtml(t || "")}</div>
        <div class="small">${(arr || []).map((x) => `✅ ${escapeHtml(x)}`).join("<br/>")}</div>
      </div>
    `;
    return `${title}<div class="grid" style="grid-template-columns:1fr 1fr">${col(c.leftTitle, c.left)}${col(
      c.rightTitle,
      c.right,
    )}</div>`;
  }
  if (section.type === "table") {
    const t = section.content || {};
    const headers = t.headers || [];
    const rows = t.rows || [];
    return `${title}
      <div class="row" style="overflow:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr>
              ${headers
                .map(
                  (hd) =>
                    `<th style="text-align:left;padding:10px;border-bottom:1px solid var(--border);color:var(--muted);font-weight:700;">${escapeHtml(
                      hd,
                    )}</th>`,
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>${(r || [])
                  .map(
                    (cell) =>
                      `<td style="padding:10px;border-bottom:1px solid var(--border);vertical-align:top;">${escapeHtml(
                        cell,
                      )}</td>`,
                  )
                  .join("")}</tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  return `${title}<div class="small">（未知段落类型：${escapeHtml(section.type)}）</div>`;
}

function renderArticle(moduleSlug, articleSlug) {
  const id = `${moduleSlug}/${articleSlug}`;
  const art = getArticleById(id);
  const mod = getModuleBySlug(moduleSlug);
  if (!art || !mod) return renderNotFound();

  markRead(art.id);
  const read = getReadSet();
  const bookmarks = getBookmarks();
  const isBookmarked = bookmarks.has(art.id);

  const stats = (art.keyStats || [])
    .slice(0, 3)
    .map(
      (s) => `
      <div class="stat">
        <div class="t">${escapeHtml(s.label)}</div>
        <div class="n">${escapeHtml(s.value)}</div>
        <div class="t">${escapeHtml(s.context || "")}</div>
      </div>
    `,
    )
    .join("");

  const sections = (art.sections || []).map((sec) => `<div class="row">${renderSection(sec)}</div>`).join("");
  const hasRemote = Boolean(art.contentPath);
  const body =
    hasRemote
      ? `
        <div class="row">
          <div class="small">${escapeHtml(art.description || "")}</div>
        </div>
        <div class="row md-shell" data-md-path="${escapeHtml(art.contentPath)}" data-article-id="${escapeHtml(art.id)}">
          <div class="article-shell">
            <div class="article-toolbar">
              <a href="#/${mod.slug}" class="btn">← 返回模块</a>
              <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                <button class="btn" id="translateBtn" data-article="${escapeHtml(art.id)}" data-md-path="${escapeHtml(
                  art.contentPath || "",
                )}">🌐 一键翻译</button>
                <button class="btn" id="bookmarkBtn" data-article="${escapeHtml(art.id)}">${isBookmarked ? "⭐ 已收藏" : "☆ 收藏"}</button>
              </div>
            </div>
            <div class="article-meta">
              ${pill(art.difficulty, art.difficulty === "入门" ? "good" : "warn")} · ${escapeHtml(art.category || "")} · 预计阅读 ${escapeHtml(
                art.readTime,
              )} · ${read.has(art.id) ? "✅ 已读" : ""}
            </div>
            <div class="article-title">${escapeHtml(art.title)}</div>
            <div class="md" data-md-body><div class="small">内容加载中…</div></div>
          </div>
        </div>
      `
      : `
        <div class="list" style="margin-top:12px;">
          ${sections}
        </div>
      `;

  return `
    ${breadcrumb([
      { label: "首页", href: "#/" },
      { label: mod.name, href: `#/${mod.slug}` },
      { label: art.title },
    ])}

    ${stats ? `<div class="stats">${stats}</div>` : ""}

    ${body}

    <div class="card-lite">
      <div class="top">
        <div class="title">本篇测验</div>
        <a class="btn primary" href="#/quiz?mode=article&article=${encodeURIComponent(art.id)}">开始</a>
      </div>
    </div>
  `;
}

function getQueryParams() {
  const h = location.hash;
  const qIdx = h.indexOf("?");
  if (qIdx === -1) return {};
  const qs = h.slice(qIdx + 1);
  const usp = new URLSearchParams(qs);
  return Object.fromEntries(usp.entries());
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 文章测验：从正文抽句子做“扣空选择题”（用于确认是否认真阅读）
function generateArticleQuizFromMarkdown(md, articleTitle, count = 3) {
  const text = String(md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/#+\s+/g, "")
    .replace(/[•·・●]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 切句（中英混合）
  const sentences = text
    .split(/(?<=[。！？.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 28 && s.length <= 150);

  const pickPhrase = (s) => {
    // 优先选英文缩写或数字缩写（2-6）
    const ac = s.match(/\b[A-Z0-9]{2,6}\b/);
    if (ac) return ac[0];
    // 再选中文 2-6 字片段
    const cj = s.match(/[\u4e00-\u9fff]{2,6}/);
    if (cj) return cj[0];
    // 兜底：选一个较长单词
    const w = s.match(/\b[a-zA-Z]{4,12}\b/);
    return w ? w[0] : null;
  };

  // 备选干扰项池
  const pool = [];
  for (const s of sentences.slice(0, 120)) {
    const p = pickPhrase(s);
    if (p && p.length >= 2) pool.push(p);
  }

  const picks = shuffle(sentences).slice(0, Math.max(count, Math.min(count, sentences.length)));
  const qs = [];
  let idx = 0;
  for (const s of picks) {
    if (qs.length >= count) break;
    const ans = pickPhrase(s);
    if (!ans) continue;
    const blanked = s.replace(ans, "____");
    // 生成 3 个干扰项
    const distract = shuffle(pool.filter((x) => x !== ans)).slice(0, 3);
    const options = shuffle([ans, ...distract]).slice(0, 4);
    const answer = options.indexOf(ans);
    if (options.length < 4 || answer < 0) continue;
    qs.push({
      _id: `article#${idx++}`,
      _scope: articleTitle || "本篇文章",
      type: "mcq",
      question: `请补全原文句子：${blanked}`,
      options,
      answer,
      explanation: "该题来自原文句子扣空，用于确认是否认真阅读。",
    });
  }
  return qs;
}

function renderQuiz() {
  const qp = getQueryParams();
  const moduleSlug = qp.module || null;
  const articleId = qp.article || null;

  const pool = collectQuestions({ moduleSlug, articleId });
  if (!pool.length) {
    return `
      <div class="row">
        <div class="title">知识测验</div>
        <div class="small">当前题库为空（全量文章未包含可直接使用的 quiz 字段）。如果你希望“每篇文章配套 5-10 道题”，我可以基于文章内容批量生成题库并接入。</div>
        <div class="cta-row" style="margin-top:10px">
          <a class="btn primary" href="#/learn">去学习中心</a>
          <a class="btn" href="#/">返回首页</a>
        </div>
      </div>
    `;
  }

  const take = Math.min(10, Math.max(5, pool.length));
  const questions = shuffle(pool).slice(0, take);

  const qHtml = questions
    .map((q, i) => {
      const opts = (q.options || [])
        .map(
          (opt, idx) => `
            <label style="display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--border);border-radius:14px;background:color-mix(in srgb, var(--panel) 90%, transparent);cursor:pointer;">
              <input type="radio" name="q${i}" value="${idx}" style="margin-top:3px"/>
              <div>
                <div style="font-weight:700">${escapeHtml(opt)}</div>
              </div>
            </label>
          `,
        )
        .join("");
      return `
        <div class="row" data-qid="${escapeHtml(q._id)}">
          <div class="small">${pill("单选题", "warn")} · 来自：${escapeHtml(q._scope || "")}</div>
          <div class="title" style="margin-top:8px;">${i + 1}. ${escapeHtml(q.question)}</div>
          <div style="display:grid;gap:8px;margin-top:10px;">${opts}</div>
          <div class="small" data-feedback style="margin-top:10px;"></div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="row">
      <div class="top">
        <div>
          <div class="title">知识测验</div>
          <div class="small">每次 5-10 道单选题，答完即时反馈。加油！</div>
        </div>
        <button class="btn primary" id="submitQuizBtn">提交并查看得分</button>
      </div>
    </div>
    <div class="list">${qHtml}</div>
    <div class="row" id="quizSummary" style="display:none;"></div>
  `;
}

function renderProgress() {
  const read = getReadSet();
  const bookmarks = getBookmarks();
  const pct = (read.size / Math.max(ARTICLES.length, 1)) * 100;
  const streak = lsGet(LS_KEYS.streak, { days: 0 });
  const perModule = MODULES.map((m) => {
    const arts = getArticlesByModuleSlug(m.slug);
    const done = arts.filter((a) => read.has(a.id)).length;
    const pctM = (done / Math.max(arts.length, 1)) * 100;
    return `
      <div class="row">
        <div class="top">
          <div>
            <div class="title">${escapeHtml(m.name)}</div>
            <div class="small">${done}/${arts.length} · ${formatPct(pctM)}</div>
          </div>
          <a class="btn" href="#/${m.slug}">继续</a>
        </div>
        <div class="progressbar" style="margin-top:10px"><div style="width:${formatPct(pctM)}"></div></div>
      </div>
    `;
  }).join("");

  return `
    <div class="row">
      <div class="title">学习进度</div>
      <div class="small">总体掌握度：<b>${formatPct(pct)}</b> · 已读 ${read.size}/${ARTICLES.length} · 收藏 ${bookmarks.size} · 连续学习 ${Number(
        streak.days || 0,
      )} 天</div>
      <div class="cta-row" style="margin-top:10px;">
        <button class="btn" id="resetProgressBtn">重置学习进度</button>
      </div>
    </div>
    <div class="list">${perModule}</div>
  `;
}

function renderBookmarks() {
  const bookmarks = getBookmarks();
  const list = [...bookmarks]
    .map((id) => getArticleById(id))
    .filter(Boolean)
    .map(
      (a) => `
      <div class="row">
        <div class="top">
          <div>
            <div class="title">${escapeHtml(a.title)}</div>
            <div class="small">${escapeHtml(a.moduleSlug)} · ${escapeHtml(a.readTime)}</div>
          </div>
          <a class="btn primary" href="#/${a.id}">打开</a>
        </div>
      </div>
    `,
    )
    .join("");

  return `
    <div class="row">
      <div class="top">
        <div>
          <div class="title">我的收藏</div>
          <div class="small">收藏你的重点文章，随时回顾。</div>
        </div>
        <button class="btn" id="openSearchBtn3">🔎 搜索</button>
      </div>
    </div>
    <div class="list">${list || `<div class="row"><div class="small">暂无收藏。打开文章页点“收藏”即可。</div></div>`}</div>
  `;
}

function renderDashboard() {
  return `
    <div class="row">
      <div class="title">数据仪表盘</div>
      <div class="small">静态版演示：后续可接入更多行业数据卡片、学习日历热力图等。</div>
    </div>
    <div class="grid">
      <div class="stat"><div class="t">全球数字支付规模</div><div class="n">$11.6万亿</div><div class="t">（2024年）</div></div>
      <div class="stat"><div class="t">电商欺诈损失</div><div class="n">$480亿</div><div class="t">（2023年）</div></div>
      <div class="stat"><div class="t">平均拒付成本倍数</div><div class="n">3.75x</div><div class="t">每次拒付的综合成本</div></div>
    </div>
  `;
}

function renderNotFound() {
  return `
    <div class="row">
      <div class="title">页面不存在</div>
      <div class="small">你访问的路径没有匹配到页面。可以从首页重新开始。</div>
      <div class="cta-row" style="margin-top:10px">
        <a class="btn primary" href="#/">返回首页</a>
        <a class="btn" href="#/learn">去学习中心</a>
      </div>
    </div>
  `;
}

function render() {
  const r = route();
  // strip query from currentPath for active nav highlight
  const currentPath = r.raw.split("?")[0] || "/";

  let content = "";
  const parts = currentPath.replace(/^\/+/, "").split("/").filter(Boolean);

  if (currentPath === "/" || parts.length === 0) content = renderHome();
  else if (parts[0] === "learn") content = renderLearn();
  else if (parts[0] === "quiz") content = renderQuiz();
  else if (parts[0] === "progress") content = renderProgress();
  else if (parts[0] === "bookmarks") content = renderBookmarks();
  else if (parts[0] === "dashboard") content = renderDashboard();
  else if (parts.length === 1) content = renderModule(parts[0]);
  else if (parts.length === 2) content = renderArticle(parts[0], parts[1]);
  else content = renderNotFound();

  const app = document.getElementById("app");
  app.innerHTML = pageShell(currentPath, content);
  // 路由切换后滚动到顶部，保证“内部跳转”顺滑
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  wireUi();
}

function openSearch(prefill = "") {
  const modal = document.getElementById("searchModal");
  const input = document.getElementById("modalSearchInput");
  modal.classList.add("open");
  input.value = prefill;
  input.focus();
  runSearch(prefill);
}

function closeSearch() {
  const modal = document.getElementById("searchModal");
  modal.classList.remove("open");
}

function openTranslate() {
  const modal = document.getElementById("translateModal");
  modal.classList.add("open");
}

function closeTranslate() {
  const modal = document.getElementById("translateModal");
  modal.classList.remove("open");
}

function getCurrentArticleContext() {
  const btn = document.getElementById("translateBtn");
  if (!btn) return null;
  const articleId = btn.getAttribute("data-article") || "";
  const mdPath = btn.getAttribute("data-md-path") || "";
  if (!articleId || !mdPath) return null;
  return { articleId, mdPath };
}

async function showTranslated(articleId, mdPath, targetLang) {
  const shell = document.querySelector(`[data-md-path="${CSS.escape(mdPath)}"]`);
  const host = shell ? shell.querySelector("[data-md-body]") : null;
  if (!shell || !host) return;

  const key = translationCacheKey(articleId, targetLang);
  const cached = localStorage.getItem(key);
  if (cached) {
    host.innerHTML = markdownToHtml(cached);
    shell.setAttribute("data-translated-lang", targetLang);
    return;
  }

  const md = window.__mdSourceCache?.get(mdPath);
  if (!md) {
    host.innerHTML = `<div class="small">原文尚未加载完成，请稍后再试。</div>`;
    return;
  }

  const progress = document.getElementById("translateProgress");
  if (progress) {
    progress.style.display = "block";
    progress.innerHTML = `<div class="title">翻译中…</div><div class="small">准备翻译</div>`;
  }

  try {
    const out = await translateMarkdown(md, targetLang, ({ current, total }) => {
      if (!progress) return;
      progress.innerHTML = `<div class="title">翻译中…</div><div class="small">进度：${current}/${total}</div>`;
    });
    localStorage.setItem(key, out);
    setPreferredTranslateLang(targetLang);

    host.innerHTML = markdownToHtml(out);
    shell.setAttribute("data-translated-lang", targetLang);

    if (progress) {
      progress.innerHTML = `<div class="title">已完成</div><div class="small">已缓存到本地，下次会更快。</div>`;
      setTimeout(() => (progress.style.display = "none"), 800);
    }
  } catch (e) {
    if (progress) {
      progress.innerHTML = `<div class="title">翻译失败</div><div class="small">${escapeHtml(String(e))}</div>`;
    }
  }
}

function showOriginal(mdPath) {
  const shell = document.querySelector(`[data-md-path="${CSS.escape(mdPath)}"]`);
  const host = shell ? shell.querySelector("[data-md-body]") : null;
  if (!shell || !host) return;
  // 复用原始 HTML 缓存（只取 md 正文部分）
  const html = window.__mdCache?.get(`${APP_VERSION}:${mdPath}`);
  if (html) host.innerHTML = html;
  shell.removeAttribute("data-translated-lang");
}

function runSearch(q) {
  const query = (q || "").trim().toLowerCase();
  const results = document.getElementById("modalResults");

  const matchModule = (m) =>
    m.name.toLowerCase().includes(query) || m.slug.toLowerCase().includes(query) || (m.desc || "").toLowerCase().includes(query);
  const matchArticle = (a) =>
    a.title.toLowerCase().includes(query) || a.id.toLowerCase().includes(query) || a.moduleSlug.toLowerCase().includes(query);

  const list = [];
  if (!query) {
    list.push(
      `<div class="row"><div class="small">输入关键词开始搜索。示例：<b>ACH</b>、<b>拒付</b>、<b>3DS</b>、<b>跨境</b>…</div></div>`,
    );
  } else {
    const mods = MODULES.filter(matchModule).slice(0, 6);
    const arts = ARTICLES.filter(matchArticle).slice(0, 20);
    if (!mods.length && !arts.length) {
      list.push(`<div class="row"><div class="small">没有找到结果。</div></div>`);
    } else {
      mods.forEach((m) => {
        list.push(`
          <div class="row">
            <div class="top">
              <div>
                <div class="title">📦 ${escapeHtml(m.name)}</div>
                <div class="small">${escapeHtml(m.desc)}</div>
              </div>
              <a class="btn primary" href="#/${m.slug}">打开</a>
            </div>
          </div>
        `);
      });
      arts.forEach((a) => {
        list.push(`
          <div class="row">
            <div class="top">
              <div>
                <div class="title">📄 ${escapeHtml(a.title)}</div>
                <div class="small">${escapeHtml(a.moduleSlug)} · ${escapeHtml(a.readTime)} · ${escapeHtml(a.id)}</div>
              </div>
              <a class="btn" href="#/${a.id}">阅读</a>
            </div>
          </div>
        `);
      });
    }
  }

  results.innerHTML = `<div class="list">${list.join("")}</div>`;
}

function wireUi() {
  // card clicks
  document.querySelectorAll("[data-link]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const href = el.getAttribute("data-link");
      if (href) location.hash = href.replace(/^#/, "");
    });
  });
  document.querySelectorAll("[data-locked='1']").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const slug = el.getAttribute("data-module") || "";
      const idx = MODULES.findIndex((m) => m.slug === slug);
      const prev = idx > 0 ? MODULES[idx - 1] : null;
      alert(`该模块尚未解锁。\n请先完成并通过上一模块测试（≥80%）：${prev?.name || "上一模块"}`);
    });
  });

  // theme toggle
  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = document.body.classList.contains("dark") ? "light" : "dark";
      localStorage.setItem(LS_KEYS.theme, next);
      applyTheme(next);
    });
  }

  // bookmark toggle on article page
  const bbtn = document.getElementById("bookmarkBtn");
  if (bbtn) {
    bbtn.addEventListener("click", () => {
      const id = bbtn.getAttribute("data-article");
      if (!id) return;
      const set = getBookmarks();
      if (set.has(id)) set.delete(id);
      else set.add(id);
      setBookmarks(set);
      render(); // re-render button state
    });
  }

  // translate
  const tbtn = document.getElementById("translateBtn");
  if (tbtn) {
    tbtn.addEventListener("click", () => {
      // “翻译插件”入口：只打开面板，不自动翻译
      openTranslate();
    });
  }

  const translateCloseBtn = document.getElementById("translateCloseBtn");
  const translateModalEl = document.getElementById("translateModal");
  if (translateCloseBtn) translateCloseBtn.addEventListener("click", closeTranslate);
  if (translateModalEl) {
    translateModalEl.addEventListener("click", (e) => {
      if (e.target === translateModalEl) closeTranslate();
    });
  }
  const toZh = document.getElementById("translateToZh");
  const toEn = document.getElementById("translateToEn");
  const back = document.getElementById("translateBack");
  if (toZh) {
    toZh.addEventListener("click", async () => {
      const ctx = getCurrentArticleContext();
      if (!ctx) return;
      await showTranslated(ctx.articleId, ctx.mdPath, "zh");
    });
  }
  if (toEn) {
    toEn.addEventListener("click", async () => {
      const ctx = getCurrentArticleContext();
      if (!ctx) return;
      await showTranslated(ctx.articleId, ctx.mdPath, "en");
    });
  }
  if (back) {
    back.addEventListener("click", () => {
      const ctx = getCurrentArticleContext();
      if (!ctx) return;
      showOriginal(ctx.mdPath);
    });
  }

  // reset progress
  const resetBtn = document.getElementById("resetProgressBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!confirm("确定要重置学习进度与测验成绩吗？")) return;
      localStorage.removeItem(LS_KEYS.read);
      localStorage.removeItem(LS_KEYS.quiz);
      localStorage.removeItem(LS_KEYS.streak);
      render();
    });
  }

  // pace selection
  document.querySelectorAll("[data-pace]").forEach((el) => {
    el.addEventListener("click", () => {
      const pace = el.getAttribute("data-pace");
      if (!pace) return;
      localStorage.setItem(LS_KEYS.pace, pace);
      render();
    });
  });

  // search wiring (top input + cmd+k)
  const openBtns = ["openSearchBtn", "openSearchBtn2", "openSearchBtn3"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  openBtns.forEach((btn) => btn.addEventListener("click", () => openSearch("")));

  const topSearch = document.getElementById("topSearch");
  if (topSearch) {
    topSearch.addEventListener("focus", () => openSearch(""));
    topSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openSearch(topSearch.value);
    });
  }

  const modal = document.getElementById("searchModal");
  const modalInput = document.getElementById("modalSearchInput");
  const closeBtn = document.getElementById("modalCloseBtn");
  if (modal && modalInput && closeBtn) {
    closeBtn.addEventListener("click", closeSearch);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeSearch();
    });
    modalInput.addEventListener("input", () => runSearch(modalInput.value));
    modalInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeSearch();
    });
  }

  // quiz scoring
  const submitQuizBtn = document.getElementById("submitQuizBtn");
  if (submitQuizBtn) {
    submitQuizBtn.addEventListener("click", () => {
      const runtime = window.__quizRuntime || {};
      const qs = runtime.questions || [];
      let correct = 0;
      let total = 0;

      qs.forEach((q, i) => {
        total += 1;
        const checked = document.querySelector(`input[name="q${i}"]:checked`);
        const chosen = checked ? Number(checked.value) : -1;
        const fb = document.querySelectorAll("[data-feedback]")[i];
        const options = q.type === "tf" ? ["正确", "错误"] : q.options || [];

        if (!fb) return;
        if (chosen < 0) {
          fb.innerHTML = `${pill("未作答", "warn")}`;
          return;
        }

        if (chosen === Number(q.answer)) {
          correct += 1;
          fb.innerHTML = `${pill("正确", "good")} ${escapeHtml(q.explanation || "")}`;
        } else {
          fb.innerHTML = `${pill("错误", "bad")} 正确答案：${escapeHtml(options[Number(q.answer)] || "")}<br/>${escapeHtml(
            q.explanation || "",
          )}`;
        }
      });

      const scorePct = (correct / Math.max(total, 1)) * 100;
      const summary = document.getElementById("quizSummary");
      if (summary) {
        summary.style.display = "block";
        summary.innerHTML = `
          <div class="top">
            <div>
              <div class="title">你的得分：${correct}/${total}（${formatPct(scorePct)}）</div>
              <div class="small">${
                (Number(runtime.passPct) || 0) > 0 && scorePct >= Number(runtime.passPct)
                  ? "很棒！继续保持。"
                  : scorePct >= 50
                    ? "不错！建议回顾错题对应的文章。"
                    : "没关系，先回到学习中心按模块推进。"
              }</div>
            </div>
            <a class="btn primary" href="#/learn">回到学习中心</a>
          </div>
        `;
      }

      // 模块通过写入（≥80%）
      if (runtime.mode === "module" && String(runtime.scopeKey || "").startsWith("module:")) {
        const moduleSlug = String(runtime.scopeKey).split(":")[1] || "";
        if (moduleSlug && scorePct >= (Number(runtime.passPct) || 80)) {
          setModulePassed(moduleSlug, true);
          summary.innerHTML += `<div class="small" style="margin-top:8px;">✅ 已通过模块测试：已解锁下一模块。</div>`;
        } else {
          summary.innerHTML += `<div class="small" style="margin-top:8px;">未达通过线（≥${Number(runtime.passPct) || 80}%），请回顾后再测。</div>`;
        }
      }

      // store history
      const hist = lsGet(LS_KEYS.quiz, []);
      hist.push({ ts: Date.now(), mode: runtime.mode || "quiz", scope: runtime.scopeKey || "", correct, total, pct: Math.round(scorePct) });
      lsSet(LS_KEYS.quiz, hist.slice(-50));
      submitQuizBtn.disabled = true;
      submitQuizBtn.textContent = "已提交";
    });
  }

  // quiz timer（模块10分钟 / 期末35分钟）
  const timerEl = document.getElementById("quizTimer");
  if (timerEl) {
    const totalSec = Number(timerEl.getAttribute("data-seconds") || "0");
    if (totalSec > 0) {
      const start = Date.now();
      const tick = () => {
        const left = Math.max(0, totalSec - Math.floor((Date.now() - start) / 1000));
        const mm = String(Math.floor(left / 60)).padStart(2, "0");
        const ss = String(left % 60).padStart(2, "0");
        timerEl.textContent = `⏱️ ${mm}:${ss}`;
        if (left <= 0) {
          const btn = document.getElementById("submitQuizBtn");
          if (btn && !btn.disabled) btn.click();
          clearInterval(intv);
        }
      };
      tick();
      const intv = setInterval(tick, 1000);
    } else {
      timerEl.textContent = "⏱️ 不限时";
    }
  }

  // 模块完成 100% 后提示开始模块测试（只提示一次）
  const moduleMeta = document.getElementById("moduleMeta");
  if (moduleMeta) {
    const moduleSlug = moduleMeta.getAttribute("data-module") || "";
    const pctStr = moduleMeta.getAttribute("data-pct") || "0%";
    const pct = Number(String(pctStr).replace("%", "")) || 0;
    const passed = moduleMeta.getAttribute("data-passed") === "1";
    if (moduleSlug && pct >= 100 && !passed && !hasPromptedModule(moduleSlug)) {
      setModulePrompted(moduleSlug);
      setTimeout(() => {
        const ok = confirm("你已完成本模块全部文章。现在开始模块测试吗？");
        if (ok) location.hash = `/quiz?module=${encodeURIComponent(moduleSlug)}`;
      }, 300);
    }
  }

  // 文章正文按需加载（fetch markdown）
  hydrateRemoteMarkdown();

  // 模块页“加载更多”
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      const moduleSlug = loadMoreBtn.getAttribute("data-module");
      if (!moduleSlug) return;
      window.__moduleListState = window.__moduleListState || {};
      const prev = window.__moduleListState[moduleSlug] || { limit: 50 };
      window.__moduleListState[moduleSlug] = { limit: Number(prev.limit || 50) + 50 };
      render();
    });
  }
}

async function renderWithQuizStableQuestions() {
  // 统一渲染 quiz（文章/模块/期末），并把题目放到 window 里供评分使用
  const r = route();
  const currentPath = r.raw.split("?")[0] || "/";
  const parts = currentPath.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts[0] !== "quiz") return render();

  const qp = getQueryParams();
  const mode = qp.mode || (qp.final ? "final" : qp.module ? "module" : qp.article ? "article" : "");
  let title = "知识测验";
  let subtitle = "选择/判断题，答完即时反馈。";
  let durationSec = 0;
  let passPct = 0;
  let scopeKey = "";

  // 题目加载
  let qs = [];

  if (mode === "article" && qp.article) {
    const art = getArticleById(qp.article);
    if (!art) return renderNotFound();
    title = "本篇测验";
    subtitle = "3 题";
    durationSec = 0;
    passPct = 0;
    scopeKey = `article:${art.id}`;
    try {
      const res = await fetch(art.contentPath, { cache: "force-cache" });
      const raw = await res.text();
      const md = sanitizeMarkdown(raw, { stripTitle: art.title || "" });
      qs = generateArticleQuizFromMarkdown(md, art.title, 3);
    } catch (e) {
      qs = [];
    }
  } else if (mode === "module" && qp.module) {
    const m = getModuleBySlug(qp.module);
    if (!m) return renderNotFound();
    if (!isModuleUnlocked(m.slug)) {
      const content = `
        <div class="card-lite">
          <div class="title">🔒 模块测试尚未解锁</div>
          <div class="desc">请先完成并通过上一模块测试（≥80%）。</div>
          <div class="hero-actions" style="margin-top:12px">
            <a class="btn primary" href="#/learn">返回学习中心</a>
          </div>
        </div>
      `;
      const app = document.getElementById("app");
      app.innerHTML = pageShell(currentPath, content);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      wireUi();
      return;
    }
    // 只有读完才允许模块测试
    const read = getReadSet();
    const arts = getArticlesByModuleSlug(m.slug);
    const done = arts.filter((a) => read.has(a.id)).length;
    const pct = (done / Math.max(arts.length, 1)) * 100;
    if (pct < 100) {
      const content = `
        <div class="card-lite">
          <div class="title">🧠 模块测试暂未解锁</div>
          <div class="desc">请先完成本模块全部文章阅读（100%）后再开始测试。</div>
          <div class="hero-actions" style="margin-top:12px">
            <a class="btn primary" href="#/${escapeHtml(m.slug)}">返回模块</a>
          </div>
        </div>
      `;
      const app = document.getElementById("app");
      app.innerHTML = pageShell(currentPath, content);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      wireUi();
      return;
    }
    title = `${m.name} · 模块测试`;
    subtitle = "12 题 · 10 分钟";
    durationSec = 10 * 60;
    passPct = 80;
    scopeKey = `module:${m.slug}`;
    qs = (MODULE_QUIZ && MODULE_QUIZ[m.slug]) ? MODULE_QUIZ[m.slug] : [];
  } else if (mode === "final") {
    title = "期末综合测验";
    subtitle = "40 题 · 35 分钟";
    durationSec = 35 * 60;
    passPct = 0;
    scopeKey = "final";
    if (!allModulesPassed()) {
      const content = `
        <div class="card-lite">
          <div class="title">🔒 期末测验尚未解锁</div>
          <div class="desc">请先按顺序完成并通过所有模块测试。</div>
          <div class="hero-actions" style="margin-top:12px">
            <a class="btn primary" href="#/learn">返回学习中心</a>
          </div>
        </div>
      `;
      const app = document.getElementById("app");
      app.innerHTML = pageShell(currentPath, content);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      wireUi();
      return;
    }
    qs = Array.isArray(FINAL_QUIZ) ? FINAL_QUIZ : [];
  } else {
    // quiz 入口页
    const finalBtn = allModulesPassed()
      ? `<a class="btn primary" href="#/quiz?final=1">开始期末测验（35分钟）</a>`
      : `<button class="btn" disabled>期末测验未解锁</button>`;
    const content = `
      <div class="section">
        <section class="hero-proto">
          <h1>知识测验</h1>
          <p>按“每篇 / 每模块 / 期末”三层结构学习与测验。</p>
          <div class="hero-actions">
            <a class="btn ghost" href="#/learn">去学习中心</a>
            ${finalBtn}
          </div>
        </section>
        <div class="card-lite">
          <div class="title">规则说明</div>
          <div class="desc">
            - 每篇文章：3 题<br/>
            - 模块测试：12 题，10 分钟（≥80% 通过）<br/>
            - 期末测试：40 题，35 分钟
          </div>
        </div>
      </div>
    `;
    const app = document.getElementById("app");
    app.innerHTML = pageShell(currentPath, content);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    wireUi();
    return;
  }

  if (!qs.length) {
    const content = `
      <div class="card-lite">
        <div class="title">题库尚未就绪</div>
        <div class="desc">该测验题库还未生成/接入，请稍后再试。</div>
        <div class="hero-actions" style="margin-top:12px">
          <a class="btn primary" href="#/learn">返回学习中心</a>
        </div>
      </div>
    `;
    const app = document.getElementById("app");
    app.innerHTML = pageShell(currentPath, content);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    wireUi();
    return;
  }

  // 题目稳定：按 scopeKey 缓存，不在同一次测验中变化
  const runtimeKey = `stripekb.quiz.runtime.${scopeKey}`;
  const cached = lsGet(runtimeKey, null);
  if (cached && Array.isArray(cached.questions) && cached.questions.length === qs.length) {
    qs = cached.questions;
  } else {
    // 模块/期末题不 shuffle（保持生成顺序），文章题可轻微打散选项但题序保持
    lsSet(runtimeKey, { ts: Date.now(), questions: qs });
  }
  window.__quizRuntime = { mode, scopeKey, durationSec, passPct, questions: qs, startedAt: Date.now() };

  const qHtml = qs
    .map((q, i) => {
      const isTf = q.type === "tf";
      const options = isTf ? ["正确", "错误"] : q.options || [];
      const opts = options
        .map(
          (opt, idx) => `
            <label style="display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--bgSoft);cursor:pointer;">
              <input type="radio" name="q${i}" value="${idx}" style="margin-top:3px"/>
              <div><div style="font-weight:700">${escapeHtml(opt)}</div></div>
            </label>
          `,
        )
        .join("");
      return `
        <div class="card-lite" data-qid="${escapeHtml(q._id)}">
          <div class="small">${pill(isTf ? "判断题" : "选择题", "warn")} · ${escapeHtml(q._scope || "")}</div>
          <div class="title" style="margin-top:8px;">${i + 1}. ${escapeHtml(q.question)}</div>
          <div style="display:grid;gap:8px;margin-top:10px;">${opts}</div>
          <div class="small" data-feedback style="margin-top:10px;"></div>
        </div>
      `;
    })
    .join("");

  const content = `
    <div class="section">
      <section class="hero-proto">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
        <div class="hero-actions">
          <button class="btn primary" id="submitQuizBtn">提交并查看得分</button>
          <span class="btn ghost" id="quizTimer" data-seconds="${durationSec}">⏱️</span>
          <a class="btn ghost" href="#/learn">返回学习中心</a>
        </div>
      </section>
      <div class="section-head">
        <h2>题目</h2>
        <p class="hint">共 ${qs.length} 题</p>
      </div>
      <div class="module-list">${qHtml}</div>
      <div class="card-lite" id="quizSummary" style="display:none;"></div>
    </div>
  `;

  const app = document.getElementById("app");
  app.innerHTML = pageShell(currentPath, content);
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  wireUi();
}

function globalHotkeys() {
  window.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const k = e.key.toLowerCase();
    const want = (isMac && e.metaKey && k === "k") || (!isMac && e.ctrlKey && k === "k");
    if (want) {
      e.preventDefault();
      openSearch("");
      return;
    }
    if (k === "escape") closeSearch();
    if (k === "escape") closeTranslate();
  });
}

function bootstrap() {
  // 版本变更时清空内存缓存（无需用户手动强刷也能生效）
  if (window.__stripeKbVersion !== APP_VERSION) {
    window.__stripeKbVersion = APP_VERSION;
    window.__mdCache = new Map();
    window.__mdSourceCache = new Map();
  }

  applyTheme(getTheme());
  globalHotkeys();
  window.addEventListener("hashchange", () => {
    // 仅 quiz 需要稳定题目集
    const p = (location.hash.replace(/^#/, "") || "/").split("?")[0];
    if (p === "/quiz" || p.startsWith("/quiz")) void renderWithQuizStableQuestions();
    else render();
  });

  // initial
  const p = (location.hash.replace(/^#/, "") || "/").split("?")[0];
  if (p === "/quiz" || p.startsWith("/quiz")) void renderWithQuizStableQuestions();
  else render();
}

bootstrap();
