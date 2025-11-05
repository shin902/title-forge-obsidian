// File: AutoTitleLLMGemini.js
// Gemini API を使用したタイトル自動生成（リファクタ済み）

/*
  目的:
  - 環境変数の安全な読み取り（process 未定義対策、.env 対応）
  - ヘルパ関数の明確化と単一責任化
  - 例外メッセージの改善と冪等なリネーム回避
  - 型/値チェックの強化と扱いやすいエラー通知
*/

module.exports = async ({ app }) => {
  const CONFIG = Object.freeze({
    maxTitleLength: 40,
    envPath: "99_others/scripts/AutoTitleCreater/.env.local",
    model: "gemini-2.5-flash-lite",
    request: {
      temperature: 0.2,
      topK: 1,
      topP: 1,
      maxOutputTokens: 64,
    },
  });

  // ---------- env / 設定 ----------

  /** .env 形式を読み込む（コメント/空行を無視） */
  async function readEnvFile(path) {
    try {
      const raw = await app.vault.adapter.read(path);
      const env = {};
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!m) continue;
        let v = m[2].trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        env[m[1]] = v;
      }
      return env;
    } catch {
      return {};
    }
  }

  /** env 変数の取得（process 未定義環境でも安全） */
  function readProcessEnv(name) {
    try {
      // Obsidian スクリプト環境では process が無い場合がある
      if (typeof process === "undefined" || !process?.env) return undefined;
      const v = process.env[name];
      return typeof v === "string" ? v : undefined;
    } catch {
      return undefined;
    }
  }

  async function getGeminiApiKey() {
    const fromProc = readProcessEnv("GEMINI_API_KEY");
    if (fromProc?.trim()) return fromProc.trim();

    const env = await readEnvFile(CONFIG.envPath);
    if (env.GEMINI_API_KEY?.trim()) return env.GEMINI_API_KEY.trim();
    return undefined;
  }

  function validateApiKey(apiKey) {
    if (!apiKey) {
      throw new Error(
        [
          "GEMINI_API_KEY が未設定です。次のいずれかで設定してください:",
          "1) 環境変数: export GEMINI_API_KEY=your-key",
          "2) .env.local: GEMINI_API_KEY=your-key",
        ].join("\n"),
      );
    }
    if (apiKey === "your-gemini-api-key-here") {
      throw new Error(
        [
          "APIキーがデフォルト値のままです。",
          ".env.local を実際の Gemini API キーで更新してください。",
          "取得先: https://aistudio.google.com/app/apikey",
        ].join("\n"),
      );
    }
    if (apiKey.length < 20 || !apiKey.startsWith("AI")) {
      throw new Error(
        "Gemini APIキーの形式が不正です。正しいキーを設定してください。",
      );
    }
  }

  // ---------- Prompt / API ----------

  function createPrompt(content) {
    return [
      "あなたは編集者です。以下の本文から、検索性と再利用性の高い短い日本語タイトルを1つ作ってください。",
      "要件:",
      `- ${CONFIG.maxTitleLength}文字以内`,
      "- 内容の核となる名詞を含める",
      "- 記号や絵文字は禁止",
      "- 「メモ/ノート/日記」などの汎用接頭辞は付けない",
      "- 出力はタイトル文字列のみ",
      "",
      "本文:",
      content,
    ].join("\n");
  }

  function buildRequestBody(prompt) {
    return {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: { ...CONFIG.request },
    };
  }

  async function callGeminiAPI(prompt, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.model}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestBody(prompt)),
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Gemini API エラー: ${resp.status} ${t}`);
    }
    return await resp.json();
  }

  function extractTitleFromResponse(json) {
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text.trim() : "";
  }

  // ---------- タイトル整形/パス ----------

  function sanitizeTitle(rawTitle) {
    const cleaned = String(rawTitle || "")
      // 先頭/末尾の引用符やカギ括弧を除去
      .replace(/^[\"'「『\s]+|[\"'」』\s]+$/g, "")
      // OS 非互換文字を安全化
      .replace(/[\/\\:\*\?\"<>\|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const truncated = cleaned.slice(0, CONFIG.maxTitleLength);
    return truncated || "untitled";
  }

  function getFolderPath(file) {
    // Obsidian API: file.parent?.path が最も素直
    return file?.parent?.path ?? "";
  }

  function stripMdExtension(name) {
    return name.endsWith(".md") ? name.slice(0, -3) : name;
  }

  function generateUniquePath(folder, safeTitle, ext, app) {
    let base = folder ? `${folder}/` : "";
    let newPath = `${base}${safeTitle}${ext}`;
    let i = 2;
    while (app.vault.getAbstractFileByPath(newPath)) {
      newPath = `${base}${safeTitle} - ${i}${ext}`;
      i += 1;
    }
    return newPath;
  }

  // ---------- メイン処理 ----------

  const apiKey = await getGeminiApiKey();
  validateApiKey(apiKey);

  const file = app.workspace.getActiveFile();
  if (!file) {
    throw new Error(
      "アクティブなファイルがありません。ノートを開いて実行してください。",
    );
  }

  const content = await app.vault.read(file);
  if (!content || !content.trim()) {
    throw new Error("本文が空です。テキストを入力してから実行してください。");
  }

  const prompt = createPrompt(content);
  const data = await callGeminiAPI(prompt, apiKey);
  const rawTitle = extractTitleFromResponse(data);
  if (!rawTitle) {
    throw new Error("タイトル生成に失敗しました。");
  }

  const safeTitle = sanitizeTitle(rawTitle);
  const folder = getFolderPath(file);

  // すでに同名（拡張子除く）であればリネームしない
  const currentBaseName = stripMdExtension(file.name);
  if (currentBaseName === safeTitle) {
    new Notice(`タイトルは既に最新です: ${safeTitle}`);
    return;
  }

  const newPath = generateUniquePath(folder, safeTitle, ".md", app);
  const oldName = file.name;
  await app.fileManager.renameFile(file, newPath);
  new Notice(`タイトル更新: ${oldName} → ${safeTitle}`);
};
