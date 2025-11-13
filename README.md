# TitleForge

Obsidianプラグイン：Gemini AIを使ってノートのタイトル自動生成とタグ自動追加を行います。
完璧なタイトルとタグを鍛え上げ、あなたのノートを整理します。

## 機能

- **タイトル自動生成**: ノート本文からAIが適切なタイトルを生成し、ファイル名をリネーム
- **タグ自動生成**: ノート本文からキーワードを抽出し、Frontmatterにタグを自動追加
- **Gemini API統合**: Google Gemini APIによる高精度な日本語処理

## インストール

### 手動インストール

1. リポジトリをクローン
   ```bash
   git clone https://github.com/shin902/title-forge-obsidian.git
   cd title-forge-obsidian
   ```

2. 依存関係をインストール
   ```bash
   npm install
   ```

3. ビルド
   ```bash
   npm run build
   ```

4. プラグインファイルをObsidian Vaultにコピー
   ```bash
   # YourVault/.obsidian/plugins/title-forge/ に以下をコピー
   - main.js
   - manifest.json
   ```

5. Obsidianでプラグインを有効化

## 使い方

### 初期設定

1. Obsidianの設定を開く
2. 「Community plugins」→「TitleForge」を選択
3. Gemini APIキーを入力
   - APIキーは[Google AI Studio](https://aistudio.google.com/app/apikey)から取得

### タイトル生成

1. ノートを開く
2. コマンドパレット（Ctrl/Cmd+P）を開く
3. 「Generate title with AI」を実行

### タグ生成

1. ノートを開く
2. コマンドパレット（Ctrl/Cmd+P）を開く
3. 「Generate tags with AI」を実行

## 設定項目

### API設定
- **Gemini API Key**: Gemini APIキー
- **モデル**: 使用するGeminiモデル: gemini-2.5-flash-lite（固定）

### タイトル生成設定
- **最大タイトル長**: タイトルの最大文字数（10-100）
- **Temperature**: 生成の創造性（0.0-1.0）

### タグ生成設定
- **Temperature**: 生成の創造性（0.0-1.0）
- **最大コンテンツ長**: タグ生成に使用する本文の最大文字数（50-500）

### 表示設定
- **リボンアイコンを表示**: 左サイドバーにアイコンを表示
- **通知を表示**: 操作完了時に通知を表示

## 開発

### 開発環境のセットアップ

```bash
npm install
```

### 開発ビルド（ファイル監視）

```bash
npm run dev
```

### プロダクションビルド

```bash
npm run build
```

## ライセンス

MIT

## プライバシーについて

このプラグインは、ノートの内容をGoogle Gemini APIに送信します。機密情報を含むノートでの使用にはご注意ください。

## ドキュメント

- [プラグイン仕様書](./docs/plugin-specification.md)
- [開発ガイド](./docs/obsidian-plugin-development-guide.md)
