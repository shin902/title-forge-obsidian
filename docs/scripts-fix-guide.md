# スクリプト修正ガイド - リーズニングモデル対応

## 問題の概要

元のスクリプト（`AutoTitleLLMGemini.js`、`AutoTagLLMGemini.js`）は `gemini-2.5-flash-lite` を使用しており、このモデルはリーズニング機能を持たないため正常に動作します。

しかし、`gemini-2.5-pro` や `gemini-2.5-flash` などのリーズニング機能を持つモデルに変更すると、以下の問題が発生します：

1. **トークン制限エラー**: リーズニング処理で大量のトークンが消費され、`maxOutputTokens` の制限に達する
2. **MAX_TOKENS finish reason**: `thinking_tokens + output_tokens > maxOutputTokens` となり、応答が途中で切れる
3. **空のレスポンス**: エラー時に何も返されず、デバッグが困難

## 修正版スクリプトの変更点

### 1. モデル自動検出機能

```javascript
// リーズニングモデルのパターン
reasoningModelPattern: /gemini-2\.5-(pro|flash)$/i,

// モデルがリーズニング機能を持つか判定
function isReasoningModel(model) {
  return CONFIG.reasoningModelPattern.test(model);
}
```

### 2. モデル別の設定

```javascript
modelConfigs: {
  // Flash Lite: リーズニング機能なし
  "flash-lite": {
    temperature: 0.2,
    topK: 1,
    topP: 1,
    maxOutputTokens: 64, // または 128
  },
  // Flash/Pro: リーズニング機能あり
  reasoning: {
    temperature: 0.2,
    topK: 1,
    topP: 1,
    maxOutputTokens: undefined, // 制限なし（重要！）
  },
},
```

**重要**: リーズニングモデルでは `maxOutputTokens: undefined` を設定することで、トークン制限エラーを回避します。

### 3. 環境変数でモデルを指定可能

```javascript
async function getGeminiModel() {
  // 環境変数から取得を試みる
  const fromProc = readProcessEnv("GEMINI_MODEL");
  if (fromProc?.trim()) return fromProc.trim();

  const env = await readEnvFile(CONFIG.envPath);
  if (env.GEMINI_MODEL?.trim()) return env.GEMINI_MODEL.trim();

  return CONFIG.defaultModel; // デフォルト: gemini-2.5-flash
}
```

### 4. フォールバック機能

トークン制限エラーが発生した場合、自動的により緩い設定で再試行します。

```javascript
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
```

## 使用方法

### オプション1: .env.localでモデルを指定

`.env.local` ファイルに以下を追加：

```bash
GEMINI_API_KEY=your-actual-api-key
GEMINI_MODEL=gemini-2.5-flash  # または gemini-2.5-pro
```

### オプション2: 環境変数で指定

```bash
export GEMINI_API_KEY=your-actual-api-key
export GEMINI_MODEL=gemini-2.5-flash
```

### オプション3: デフォルトモデルを変更

スクリプト内の `defaultModel` を変更：

```javascript
const CONFIG = Object.freeze({
  // ...
  defaultModel: "gemini-2.5-flash",  // お好みのモデルに変更
  // ...
});
```

## モデル一覧と推奨設定

| モデル | リーズニング | maxOutputTokens | 推奨用途 |
|--------|--------------|-----------------|----------|
| gemini-2.5-flash-lite | なし | 64-128 | 高速・低コスト、単純なタスク |
| gemini-2.5-flash | あり | undefined | バランス型、ほとんどのタスク |
| gemini-2.5-pro | あり | undefined | 複雑なタスク、高品質が必要 |

## 移行ステップ

### ステップ1: バックアップ

```bash
# 元のスクリプトをバックアップ
cp docs/scripts/AutoTitleLLMGemini.js docs/scripts/AutoTitleLLMGemini.js.bak
cp docs/scripts/AutoTagLLMGemini.js docs/scripts/AutoTagLLMGemini.js.bak
```

### ステップ2: 修正版に置き換え

```bash
# 修正版を元のファイル名にコピー
cp docs/scripts/AutoTitleLLMGemini-fixed.js docs/scripts/AutoTitleLLMGemini.js
cp docs/scripts/AutoTagLLMGemini-fixed.js docs/scripts/AutoTagLLMGemini.js
```

### ステップ3: .env.localを更新

```bash
# .env.localファイルを編集
nano 99_others/scripts/AutoTitleCreater/.env.local
```

以下を追加：

```bash
GEMINI_API_KEY=your-actual-api-key
GEMINI_MODEL=gemini-2.5-flash
```

### ステップ4: テスト

1. Obsidianでノートを開く
2. スクリプトを実行
3. コンソールログで使用モデルを確認：
   ```
   使用モデル: gemini-2.5-flash (リーズニング: true)
   ```
4. 正常に動作することを確認

## トラブルシューティング

### 問題1: まだトークン制限エラーが発生する

**原因**: フォールバック機能が正しく動作していない

**解決策**:
1. スクリプト内の `maxOutputTokens: undefined` を確認
2. または大きな値（例: `8192`）を試す

```javascript
reasoning: {
  temperature: 0.2,
  topK: 1,
  topP: 1,
  maxOutputTokens: 8192, // undefinedの代わりに具体的な値
},
```

### 問題2: API認証エラー

**原因**: Vertex AI認証で問題が発生している可能性

**解決策**:
- Google AI Studio APIキーを使用
- `.env.local` または環境変数で設定

### 問題3: モデルが切り替わらない

**原因**: 環境変数が正しく読み込まれていない

**解決策**:
1. Obsidianを再起動
2. `.env.local` のパスが正しいか確認（CONFIG.envPath）
3. コンソールログでモデル名を確認

## パフォーマンスとコスト

### トークン使用量の比較

| モデル | Thinking Tokens | Output Tokens | 合計（概算） | コスト比 |
|--------|-----------------|---------------|--------------|----------|
| flash-lite | 0 | 50-100 | 50-100 | 1x（最安） |
| flash | 2,000-6,000 | 50-100 | 2,050-6,100 | 20-60x |
| pro | 2,000-8,000 | 50-100 | 2,050-8,100 | 40-160x |

**注意**: リーズニングモデルは思考トークンが課金対象です！

### コスト最適化のヒント

1. **タスクに応じてモデルを使い分ける**
   - 単純なタイトル生成: Flash Lite
   - 複雑な分析: Flash または Pro

2. **maxContentLengthを調整**
   ```javascript
   maxContentLength: 100, // プロンプトのコンテンツを制限
   ```

3. **バッチ処理を避ける**
   - 必要な時だけスクリプトを実行

## 詳細情報

詳しい技術情報は以下のドキュメントを参照してください：

- [Geminiリーズニングモデルのトークン制限問題と解決策](./gemini-reasoning-token-limit-solution.md)
- [Thinking | Generative AI on Vertex AI | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/thinking)
- [Gemini thinking | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/thinking)

## まとめ

修正版スクリプトの主な利点：

✅ **自動モデル検出** - リーズニングモデルを自動判別
✅ **適切なトークン設定** - モデルに応じて最適な設定を適用
✅ **フォールバック機能** - エラー時に自動リトライ
✅ **柔軟な設定** - 環境変数で簡単にモデル切り替え
✅ **エラー通知** - 問題発生時にユーザーへ通知

これにより、Flash Lite、Flash、Pro すべてのモデルで安定動作します！
