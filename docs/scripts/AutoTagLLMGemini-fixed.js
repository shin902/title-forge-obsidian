// File: AutoTagLLMGemini-fixed.js
// Gemini API を使用したタグ自動生成スクリプト（リーズニングモデル対応版）

/*
  目的:
  - タイトル生成スクリプトの構成/エラーハンドリングを踏襲
  - リーズニングモデル（Pro/Flash）のトークン制限問題を解決
  - Frontmatter (tags) を Gemini 応答で安全に更新
  - モデル自動検出と適切な maxOutputTokens 設定
  - エラーハンドリングの強化とフォールバック機能
*/

module.exports = async ({ app }) => {
  const CONFIG = Object.freeze({
    envPath: "99_others/scripts/AutoTitleCreater/.env.local",
    // デフォルトモデル（環境変数 GEMINI_MODEL で上書き可能）
    defaultModel: "gemini-2.5-flash",
    // リーズニングモデルのパターン
    reasoningModelPattern: /gemini-2\.5-(pro|flash)$/i,
    // モデル別の設定
    modelConfigs: {
      // Flash Lite: リーズニング機能なし
      "flash-lite": {
        temperature: 0.2,
        topK: 1,
        topP: 1,
        maxOutputTokens: 128,
      },
      // Flash/Pro: リーズニング機能あり
      reasoning: {
        temperature: 0.2,
        topK: 1,
        topP: 1,
        maxOutputTokens: undefined, // 制限なし（トークン制限問題を回避）
        // または大きな値: 8192
      },
    },
    promptTemplate: [
      "次のContentからキーワードを抽出しタグを日本語で生成してください。",
      "追加のコメントなしで、カンマ区切りのリストとしてタグのみを返します。",
      "複数の単語はハイフンで繋いでタグにしてください。",
      "",
      "Content:",
      "{content}",
    ].join("\n"),
    maxContentLength: 100,
  });

  // ---------- env / 設定 ----------

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

  function readProcessEnv(name) {
    try {
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

  async function getGeminiModel() {
    // 環境変数から取得を試みる
    const fromProc = readProcessEnv("GEMINI_MODEL");
    if (fromProc?.trim()) return fromProc.trim();

    const env = await readEnvFile(CONFIG.envPath);
    if (env.GEMINI_MODEL?.trim()) return env.GEMINI_MODEL.trim();

    return CONFIG.defaultModel;
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

  /**
   * モデルがリーズニング機能を持つか判定
   * @param {string} model - モデル名
   * @returns {boolean}
   */
  function isReasoningModel(model) {
    return CONFIG.reasoningModelPattern.test(model);
  }

  /**
   * モデルに応じた設定を取得
   * @param {string} model - モデル名
   * @returns {object} - generationConfig
   */
  function getGenerationConfig(model) {
    if (isReasoningModel(model)) {
      return { ...CONFIG.modelConfigs.reasoning };
    }
    return { ...CONFIG.modelConfigs["flash-lite"] };
  }

  // ---------- Prompt / API ----------

  function stripFrontmatter(markdown) {
    if (!markdown.startsWith("---")) return markdown;
    const end = markdown.indexOf("\n---", 3);
    if (end === -1) return markdown;
    return markdown.slice(end + 4);
  }

  function truncateForPrompt(text) {
    if (text.length <= CONFIG.maxContentLength) return text;
    return `${text.slice(0, CONFIG.maxContentLength)}\n...`;
  }

  function createPrompt(content) {
    const body = truncateForPrompt(stripFrontmatter(content).trim());
    if (!body) {
      throw new Error("本文が空です。タグを生成できませんでした。");
    }
    return CONFIG.promptTemplate.replace("{content}", body);
  }

  function buildRequestBody(prompt, generationConfig) {
    return {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig,
    };
  }

  async function callGeminiAPI(prompt, apiKey, model, generationConfig) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestBody(prompt, generationConfig)),
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Gemini API エラー: ${resp.status} ${t}`);
    }
    return await resp.json();
  }

  /**
   * フォールバック付きでGemini APIを呼び出す
   * MAX_TOKENSエラー時に設定を変更して再試行
   */
  async function callGeminiAPIWithFallback(prompt, apiKey, model) {
    const configs = [
      // 最初は通常設定で試行
      getGenerationConfig(model),
      // 失敗したらより緩い制限で試行
      {
        temperature: 0.2,
        topK: 1,
        topP: 1,
        maxOutputTokens: undefined, // 制限なし
      },
    ];

    let lastError = null;
    for (let i = 0; i < configs.length; i++) {
      try {
        const data = await callGeminiAPI(prompt, apiKey, model, configs[i]);

        // 最初の試行で失敗して2回目で成功した場合は通知
        if (i > 0) {
          new Notice(
            `トークン制限エラーが発生しましたが、設定を調整して正常に完了しました。`
          );
        }

        return data;
      } catch (error) {
        lastError = error;
        const errorMsg = String(error);

        // MAX_TOKENSエラーまたはトークン関連エラーの場合のみリトライ
        if (
          errorMsg.includes("MAX_TOKENS") ||
          errorMsg.includes("token") ||
          errorMsg.includes("Token")
        ) {
          if (i < configs.length - 1) {
            continue; // 次の設定で試行
          }
        }

        // その他のエラーは即座に投げる
        throw error;
      }
    }

    throw lastError;
  }

  function extractTagsFromResponse(json) {
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text.trim() : "";
  }

  function normalizeTags(rawText) {
    const seen = new Set();
    const result = [];
    for (const chunk of rawText.split(",")) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      const normalized = trimmed
        .replace(/#/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^\p{Letter}\p{Number}\-]/gu, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
      if (!normalized) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    }
    return result;
  }

  function tagsAreEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((tag, idx) => tag === b[idx]);
  }

  // ---------- メイン処理 ----------

  const apiKey = await getGeminiApiKey();
  validateApiKey(apiKey);

  const model = await getGeminiModel();
  console.log(`使用モデル: ${model} (リーズニング: ${isReasoningModel(model)})`);

  const file = app.workspace.getActiveFile();
  if (!file) {
    throw new Error(
      "アクティブなファイルがありません。ノートを開いて実行してください。",
    );
  }

  const content = await app.vault.read(file);
  if (!content || !content.trim()) {
    throw new Error("本文が空です。タグを生成できませんでした。");
  }

  const prompt = createPrompt(content);
  const data = await callGeminiAPIWithFallback(prompt, apiKey, model);
  const rawTags = extractTagsFromResponse(data);
  if (!rawTags) {
    throw new Error("Gemini 応答からタグを取得できませんでした。");
  }

  const tags = normalizeTags(rawTags);
  if (tags.length === 0) {
    throw new Error(`タグが生成されませんでした: "${rawTags}"`);
  }

  const cache = app.metadataCache.getFileCache(file);
  const existing = Array.isArray(cache?.frontmatter?.tags)
    ? cache.frontmatter.tags.map((tag) => String(tag))
    : cache?.frontmatter?.tags
      ? [String(cache.frontmatter.tags)]
      : [];

  if (tagsAreEqual(existing, tags)) {
    new Notice(`タグは既に最新です: ${tags.join(", ")}`);
    return;
  }

  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter.tags = tags;
  });

  new Notice(`タグを更新しました: ${tags.join(", ")}`);
};
