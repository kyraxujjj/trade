#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
在你本机“离线生成”模块测验/期末测验题库（使用 Google Gemini API），并写入：
  stripe-kb/assets/data/quiz.generated.js

用法（在 stripe-kb 目录下执行）：
  export GEMINI_API_KEY="AIzaSy..."
  export GEMINI_MODEL="gemini-1.5-flash-latest"   # 或 gemini-1.5-pro-latest
  python3 tools/generate_quiz_gemini.py

说明：
- 生成完成后网站纯静态运行，不再需要任何 API Key。
- 该脚本不会把 API Key 写入任何文件。
"""

from __future__ import annotations

import json
import os
import random
import re
import time
from pathlib import Path
from typing import Dict, List

import requests


SITE_DIR = Path(__file__).resolve().parents[1]
ARTICLES_JS = SITE_DIR / "assets" / "data" / "articles.generated.js"
MODULES_JS = SITE_DIR / "assets" / "data" / "modules.js"
OUT_JS = SITE_DIR / "assets" / "data" / "quiz.generated.js"


def parse_exported_json_array(js_text: str, name: str) -> list:
    m = re.search(rf"export const {re.escape(name)}\s*=\s*(\[[\s\S]*?\]);", js_text, re.S)
    if not m:
        raise RuntimeError(f"无法解析 {name} 数组")
    return json.loads(m.group(1))


def load_modules() -> List[dict]:
    txt = MODULES_JS.read_text(encoding="utf-8")
    blocks = re.findall(r"\{\s*slug:\s*\"([^\"]+)\"[\s\S]*?name:\s*\"([^\"]+)\"[\s\S]*?\}", txt)
    if not blocks:
        raise RuntimeError("无法从 modules.js 提取模块信息")
    return [{"slug": slug, "name": name} for slug, name in blocks]


def load_articles() -> List[dict]:
    txt = ARTICLES_JS.read_text(encoding="utf-8")
    return parse_exported_json_array(txt, "ARTICLES")


def read_article_md(content_path: str) -> str:
    p = (SITE_DIR / content_path.replace("./", "")).resolve()
    return p.read_text(encoding="utf-8", errors="ignore")


def strip_md_noise(md: str) -> str:
    md = md.replace("\r\n", "\n")
    md = re.sub(r"```[\s\S]*?```", "", md)
    md = re.sub(r"^---[\s\S]*?---\s*", "", md)
    md = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", md)
    md = md.replace("|", " ")
    md = re.sub(r"[ \t]+", " ", md)
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip()


def build_module_context(module_slug: str, articles: List[dict], max_articles: int = 10, max_chars: int = 24000) -> str:
    cands = [a for a in articles if a.get("moduleSlug") == module_slug]
    pool = sorted(cands, key=lambda x: int(x.get("wordCount") or 0), reverse=True)[:40]
    random.shuffle(pool)
    picked = pool[: max_articles]
    chunks = []
    for a in picked:
        md = strip_md_noise(read_article_md(a["contentPath"]))
        excerpt = md[:1800]
        chunks.append(f"【文章】{a['title']}\n{excerpt}")
    ctx = "\n\n".join(chunks)
    return ctx[:max_chars]


def gemini_generate(model: str, system: str, user: str, max_tokens: int = 2048) -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("缺少环境变量 GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": f"{system}\n\n{user}"}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": max_tokens, "topP": 0.95},
    }
    r = requests.post(url, params={"key": key}, json=payload, timeout=180)
    r.raise_for_status()
    obj = r.json()
    cand = (obj.get("candidates") or [{}])[0]
    parts = ((cand.get("content") or {}).get("parts") or [])
    return "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()


def parse_questions_json(text: str) -> List[dict]:
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise RuntimeError("模型返回中未找到 JSON")
    obj = json.loads(m.group(0))
    qs = obj.get("questions")
    if not isinstance(qs, list) or not qs:
        raise RuntimeError("JSON 中缺少 questions 数组")
    out = []
    for q in qs:
        qtype = q.get("type")
        if qtype == "tf":
            answer = 0 if q.get("answer") in (True, "true", "正确", 0) else 1
            out.append({"type": "tf", "question": q.get("question"), "answer": answer, "explanation": q.get("explanation", "")})
        else:
            options = q.get("options") or []
            if len(options) != 4:
                raise RuntimeError("mcq 选项必须为 4 个")
            out.append(
                {
                    "type": "mcq",
                    "question": q.get("question"),
                    "options": options,
                    "answer": int(q.get("answerIndex")),
                    "explanation": q.get("explanation", ""),
                }
            )
    return out


def gen_module_quiz(module: dict, articles: List[dict], model: str) -> List[dict]:
    ctx = build_module_context(module["slug"], articles)
    system = "你是一名支付领域培训师。只输出严格 JSON，不要输出其它文本。"
    user = f"""
【模块】{module['name']}
【要求】
- 题量：12 题
- 题型：选择题（4选1）或判断题（正确/错误）
- 难度：中等偏上，至少 4 题需要跨多个概念综合判断
- 每题都要有 explanation（1-2 句）
- 输出 JSON 结构：
{{"questions":[{{"type":"mcq","question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."}},{{"type":"tf","question":"...","answer":true,"explanation":"..."}}]}}

【文章摘录】
{ctx}
"""
    text = gemini_generate(model=model, system=system, user=user, max_tokens=2600)
    return parse_questions_json(text)


def gen_final_quiz(modules: List[dict], articles: List[dict], model: str) -> List[dict]:
    parts = []
    for m in modules:
        parts.append(f"=== 模块：{m['name']} ===\n{build_module_context(m['slug'], articles, max_articles=3, max_chars=6500)}")
    ctx = "\n\n".join(parts)[:52000]
    system = "你是一名支付领域培训师。只输出严格 JSON，不要输出其它文本。"
    user = f"""
【期末综合测验要求】
- 题量：40 题
- 题型：选择题（4选1）或判断题（正确/错误）
- 难度：偏深。至少 12 题需要跨模块综合推理
- 每题都要有 explanation（1-2 句）
- 输出 JSON 结构同上（questions 数组）

【文章摘录（跨模块）】
{ctx}
"""
    text = gemini_generate(model=model, system=system, user=user, max_tokens=4200)
    return parse_questions_json(text)


def main() -> None:
    random.seed(42)
    model = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash-latest")
    modules = load_modules()
    articles = load_articles()

    module_quiz: Dict[str, List[dict]] = {}
    for m in modules:
        print(f"== generating module quiz: {m['slug']} ==")
        qs = gen_module_quiz(m, articles, model)
        module_quiz[m["slug"]] = [{**q, "_id": f"module#{m['slug']}#{i}", "_scope": f"{m['name']} · 模块测试"} for i, q in enumerate(qs)]
        time.sleep(1.0)

    print("== generating final quiz ==")
    final = gen_final_quiz(modules, articles, model)
    final_qs = [{**q, "_id": f"final#{i}", "_scope": "期末综合测验"} for i, q in enumerate(final)]

    OUT_JS.write_text(
        "// 由脚本离线生成：模块测验 + 期末测验（不含文章测验）\n"
        f"// model={model}\n\n"
        "export const MODULE_QUIZ = " + json.dumps(module_quiz, ensure_ascii=False, separators=(',', ':')) + ";\n\n"
        "export const FINAL_QUIZ = " + json.dumps(final_qs, ensure_ascii=False, separators=(',', ':')) + ";\n",
        encoding="utf-8",
    )
    print(f"✅ wrote {OUT_JS}")


if __name__ == "__main__":
    main()

