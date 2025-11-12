# Geminiリーズニングモデルのトークン制限問題と解決策

## 問題の概要

Gemini 2.5 Flash Liteでは正常に動作するが、Gemini 2.5 ProやGemini 2.5 Flashなどのリーズニング（推論）機能を持つモデルで実行時にトークン制限に達してしまう問題が発生することがあります。これはリーズニング段階で大量のトークンが消費されるためです。

## 各モデルのThinking Budget仕様

### トークン制限範囲

| モデル | 最小トークン | 最大トークン | デフォルト動作 |
|--------|--------------|--------------|----------------|
| Gemini 2.5 Pro | 128 | 32,768 | 動的思考（最大8,192まで自動制御） |
| Gemini 2.5 Flash | 0 | 24,576 | 動的思考（最大8,192まで自動制御） |
| Gemini 2.5 Flash Lite | 512 | 24,576 | 思考機能無効 |

### 出力トークン制限

- **入力トークン**: 最大1,048,576トークン
- **出力トークン**: 最大65,535トークン（thinking tokens + response tokensの合計）

## 既知の問題

### 1. thinking_budgetパラメータが無視される問題

**現象:**
- `thinking_budget=0`を設定しても、実際には2,000トークン以上のthinking tokensが生成される
- 特にVertex AI認証（サービスアカウント）使用時に発生しやすい
- APIキー認証では正常に動作するケースが報告されている

**GitHub Issue:** [googleapis/python-genai#782](https://github.com/googleapis/python-genai/issues/782)

### 2. MAX_TOKENS finish reason問題

**現象:**
```
thoughts_token_count + output_token_count > max_output_tokens
```
上記の条件でMAX_TOKENSエラーが発生し、thinking tokensの制御ができないため出力が途中で打ち切られる

### 3. 構造化出力（Structured Output）使用時の問題

JSON response schemaを使用する構造化出力時に、thinking tokensが予想以上に増加する傾向がある（単純なタスクでも約6,000トークンに達することがある）

## 解決策とワークアラウンド

### 方法1: max_output_tokensをNoneに設定【推奨】

```python
from google import genai
from google.genai import types

client = genai.Client(api_key='YOUR_API_KEY')

response = client.models.generate_content(
    model='gemini-2.5-pro',
    contents='あなたの質問やタスク',
    config=types.GenerateContentConfig(
        max_output_tokens=None,  # トークン制限を解除
        thinking_config=types.ThinkingConfig(
            thinking_budget=-1  # 動的思考を有効化
        )
    )
)
```

**利点:**
- トークン制限による途中終了を回避できる
- 複雑なタスクに対応可能

**注意点:**
- thinking tokensが予想以上に増加する可能性がある（約6,000トークンに達することもある）
- コストが増加する可能性がある

### 方法2: thinking_budgetを手動設定

タスクの複雑度に応じて適切な値を設定します。

```python
config=types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
        thinking_budget=1024  # 1,024トークンに制限
    )
)
```

**設定値のガイドライン:**
- **簡単なタスク**（事実検索、簡単な質問応答）: `0`（思考不要）または`512-1024`
- **中程度のタスク**（要約、分析）: `2048-4096`
- **複雑なタスク**（数学問題、複雑なコーディング）: `8192-24576`（Flashの場合）

### 方法3: 思考機能を完全に無効化

単純なタスクで思考が不要な場合：

```python
config=types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
        thinking_budget=0  # 思考を無効化（Flashのみ）
    )
)
```

**注意:** Gemini 2.5 Proでは最小値が128トークンのため、完全に無効化できません。

### 方法4: 動的思考を活用

```python
config=types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(
        thinking_budget=-1  # モデルが自動的に思考量を調整
    )
)
```

デフォルト設定では最大8,192トークンまで自動制御されます。

### 方法5: APIキー認証を使用

Vertex AI認証で問題が発生する場合は、Google AI Studio APIキーを使用することで改善される可能性があります。

```python
# Vertex AI認証の代わりにAPIキーを使用
client = genai.Client(api_key='YOUR_API_KEY')
```

## ベストプラクティス

### 1. タスクの複雑度に応じた設定

```python
def get_thinking_config(task_complexity: str) -> types.ThinkingConfig:
    """タスクの複雑度に基づいて適切なthinking設定を返す"""
    if task_complexity == "simple":
        return types.ThinkingConfig(thinking_budget=0)
    elif task_complexity == "medium":
        return types.ThinkingConfig(thinking_budget=2048)
    elif task_complexity == "complex":
        return types.ThinkingConfig(thinking_budget=8192)
    else:
        return types.ThinkingConfig(thinking_budget=-1)  # 動的
```

### 2. エラーハンドリングとリトライ

```python
def generate_with_fallback(client, model, contents):
    """トークン制限エラー時に設定を調整してリトライ"""
    configs = [
        # 最初は通常設定で試行
        types.GenerateContentConfig(
            max_output_tokens=8192,
            thinking_config=types.ThinkingConfig(thinking_budget=2048)
        ),
        # 失敗したら制限を緩和
        types.GenerateContentConfig(
            max_output_tokens=None,
            thinking_config=types.ThinkingConfig(thinking_budget=-1)
        ),
    ]

    for config in configs:
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=config
            )
            return response
        except Exception as e:
            if "MAX_TOKENS" in str(e):
                continue  # 次の設定で試行
            raise

    raise RuntimeError("すべての設定で失敗しました")
```

### 3. コストとパフォーマンスのバランス

```python
# コスト重視：思考を最小限に
cost_optimized_config = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(thinking_budget=512)
)

# 品質重視：十分な思考時間を確保
quality_optimized_config = types.GenerateContentConfig(
    max_output_tokens=None,
    thinking_config=types.ThinkingConfig(thinking_budget=-1)
)

# バランス型：動的思考
balanced_config = types.GenerateContentConfig(
    max_output_tokens=32768,
    thinking_config=types.ThinkingConfig(thinking_budget=-1)
)
```

### 4. トークン使用量のモニタリング

```python
response = client.models.generate_content(...)

# トークン使用量を確認
if hasattr(response, 'usage_metadata'):
    print(f"Thinking tokens: {response.usage_metadata.thinking_tokens}")
    print(f"Output tokens: {response.usage_metadata.candidates_token_count}")
    print(f"Total tokens: {response.usage_metadata.total_token_count}")
```

## Node.js/TypeScriptでの実装例

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function generateWithThinkingConfig(prompt: string) {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro",
    });

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            maxOutputTokens: undefined, // 制限なし
            // Note: Node.js SDKではthinkingConfigのサポートが限定的
            // 最新のSDKバージョンを確認してください
        },
    });

    const response = result.response;
    console.log(`Usage: ${JSON.stringify(response.usageMetadata)}`);
    return response.text();
}
```

## 推奨される実装方法（本プロジェクト向け）

Obsidianプラグインでの実装例：

```typescript
// src/GeminiService.ts
export class GeminiService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateNoteName(content: string, model: string): Promise<string> {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const geminiModel = genAI.getGenerativeModel({ model });

        // モデルに応じた設定を選択
        const config = this.getModelConfig(model);

        try {
            const result = await geminiModel.generateContent({
                contents: [{
                    role: "user",
                    parts: [{ text: content }]
                }],
                generationConfig: config,
            });

            return result.response.text();
        } catch (error) {
            // MAX_TOKENSエラーの場合はフォールバック
            if (error.message.includes("MAX_TOKENS")) {
                return this.generateWithFallback(content, model);
            }
            throw error;
        }
    }

    private getModelConfig(model: string): GenerationConfig {
        if (model.includes("flash-lite")) {
            // Flash Liteは思考機能なし
            return {
                maxOutputTokens: 8192,
            };
        } else if (model.includes("flash") || model.includes("pro")) {
            // リーズニングモデルは制限を緩和
            return {
                maxOutputTokens: undefined, // 制限なし
                // thinkingBudget: -1 (動的思考) ※SDKサポート確認
            };
        }

        return {
            maxOutputTokens: 8192,
        };
    }

    private async generateWithFallback(
        content: string,
        model: string
    ): Promise<string> {
        // フォールバック：より緩い制限で再試行
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const geminiModel = genAI.getGenerativeModel({ model });

        const result = await geminiModel.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: content }]
            }],
            generationConfig: {
                maxOutputTokens: undefined,
            },
        });

        return result.response.text();
    }
}
```

## まとめ

### 即座に試すべき解決策

1. **`max_output_tokens=None`に設定**（最も効果的）
2. **モデルに応じて`thinking_budget`を調整**
   - Flash: 0-24,576
   - Pro: 128-32,768
3. **Vertex AI認証で問題がある場合はAPIキー認証を試す**

### 長期的な対応

- Google AI チームによるバグ修正を待つ（Issue #782の追跡）
- SDKのアップデートを定期的に確認
- トークン使用量をモニタリングしてコストを管理

### コスト最適化

- 簡単なタスクには思考機能を無効化
- 動的思考（`-1`）を活用して自動最適化
- 必要に応じてFlash Liteにフォールバック

## 参考リンク

- [Thinking | Generative AI on Vertex AI | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/thinking)
- [Gemini thinking | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/thinking)
- [Issue #782: Thinking models are unreliable when max_output_tokens set](https://github.com/googleapis/python-genai/issues/782)
- [Gemini Models Documentation](https://ai.google.dev/gemini-api/docs/models)
- [Start building with Gemini 2.5 Flash](https://developers.googleblog.com/en/start-building-with-gemini-25-flash/)

## 更新履歴

- 2025-11-11: 初版作成 - Geminiリーズニングモデルのトークン制限問題と解決策をまとめる
