# Contributing to TitleForge

TitleForgeへのコントリビューションをご検討いただき、ありがとうございます！

## 開発環境のセットアップ

### 必要な環境

- Node.js 16.x 以上
- npm 7.x 以上
- Obsidian（テスト用）

### セットアップ手順

1. リポジトリをフォーク

2. クローン
```bash
git clone https://github.com/your-username/title-forge-obsidian.git
cd title-forge-obsidian
```

3. 依存関係のインストール
```bash
npm install
```

4. 開発ビルド（ファイル監視）
```bash
npm run dev
```

5. テストVaultでの動作確認
```bash
# ビルド成果物をObsidian Vaultにコピー
cp main.js manifest.json /path/to/your/vault/.obsidian/plugins/title-forge/
```

## 開発ワークフロー

### ブランチ戦略

- `main`: 安定版
- `feature/*`: 新機能開発
- `fix/*`: バグ修正

### コミットメッセージ

以下の形式を推奨します：

```
<type>: <subject>

<body>
```

**Type:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: その他の変更

**例:**
```
feat: add custom prompt template support

ユーザーがタイトル生成のプロンプトをカスタマイズできる機能を追加
```

## Pull Requestの作成

1. 作業ブランチを作成
```bash
git checkout -b feature/your-feature-name
```

2. 変更をコミット
```bash
git add .
git commit -m "feat: your feature description"
```

3. Push
```bash
git push origin feature/your-feature-name
```

4. GitHubでPull Requestを作成

### Pull Requestのガイドライン

- PRのタイトルは明確で簡潔に
- 変更内容の説明を含める
- 関連するIssueがあれば参照する
- テストが通ることを確認
- コードスタイルを統一する

## テスト

```bash
# テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage

# ウォッチモード
npm run test:watch
```

新機能を追加する場合は、適切なテストも追加してください。

## ビルド

```bash
# プロダクションビルド
npm run build

# 型チェック
npm run build  # tsc -noEmit が含まれます
```

## コードスタイル

- TypeScriptを使用
- インデントはタブ
- セミコロンを使用
- 既存コードのスタイルに合わせる

## 報告とフィードバック

### バグ報告

[Issues](https://github.com/shin902/title-forge-obsidian/issues/new)から報告してください。以下の情報を含めると対応がスムーズです：

- Obsidianのバージョン
- プラグインのバージョン
- 再現手順
- 期待される動作
- 実際の動作
- エラーメッセージ（あれば）

### 機能リクエスト

新機能の提案も歓迎します！[Issues](https://github.com/shin902/title-forge-obsidian/issues/new)から提案してください。

### セキュリティ問題

セキュリティに関する問題は、[SECURITY.md](./SECURITY.md)を参照してください。

## コミュニティ

- 質問や議論は[Issues](https://github.com/shin902/title-forge-obsidian/issues)で
- 日本語・英語どちらでも歓迎します

## ライセンス

コントリビューションは[MITライセンス](./LICENSE)の下で提供されます。
