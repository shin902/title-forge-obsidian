# Obsidianプラグイン開発ガイド

## 目次

1. [はじめに](#はじめに)
2. [開発環境のセットアップ](#開発環境のセットアップ)
3. [プラグインの基本構造](#プラグインの基本構造)
4. [主要APIリファレンス](#主要apiリファレンス)
5. [開発ワークフロー](#開発ワークフロー)
6. [デバッグとテスト](#デバッグとテスト)
7. [リリース手順](#リリース手順)
8. [ベストプラクティス](#ベストプラクティス)
9. [参考リソース](#参考リソース)

## はじめに

Obsidianプラグインは、TypeScriptを使用して開発されます。Obsidian APIを利用することで、エディタの機能拡張、カスタムコマンドの追加、UIのカスタマイズなど、様々な機能を実装できます。

### 前提知識

- TypeScriptの基本的な知識
- Node.jsとnpmの使用経験
- Obsidianの基本的な使い方

## 開発環境のセットアップ

### 必要なツール

- **Node.js**: v16以上
- **npm**: Node.jsに付属
- **Git**: バージョン管理用
- **テキストエディタ**: VS Code推奨

### プロジェクトの作成

1. **公式サンプルプラグインのテンプレートを使用**

   GitHubの[obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)にアクセスし、「Use this template」ボタンをクリックして新しいリポジトリを作成します。

2. **リポジトリをクローン**

   ```bash
   git clone https://github.com/your-username/your-plugin-name.git
   cd your-plugin-name
   ```

3. **依存関係のインストール**

   ```bash
   npm install
   ```

4. **開発ビルドの実行**

   ```bash
   npm run dev
   ```

   このコマンドにより、`main.ts`が`main.js`にコンパイルされ、ファイルの変更が自動的に監視されます。

### テスト用Vaultの準備

開発とテストは、**必ずテスト用のVaultで行ってください**。プラグインはノートやフォルダを変更・削除する可能性があるため、本番のVaultで開発しないよう注意が必要です。

プラグインファイルを以下のディレクトリに配置します：

```
YourTestVault/.obsidian/plugins/your-plugin-id/
├── main.js
├── manifest.json
└── styles.css (オプション)
```

## プラグインの基本構造

### ファイル構成

| ファイル | 説明 |
|---------|------|
| `main.ts` | プラグインのメインロジックを記述するTypeScriptファイル |
| `manifest.json` | プラグインのメタデータ（名前、バージョン、説明など）を定義 |
| `styles.css` | プラグインのカスタムスタイル（オプション） |
| `package.json` | npm依存関係とスクリプトの定義 |
| `esbuild.config.mjs` | ビルド設定ファイル |
| `versions.json` | プラグインバージョンとObsidianの互換性情報 |

### manifest.json

プラグインの基本情報を定義します：

```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "プラグインの説明",
  "author": "Your Name",
  "authorUrl": "https://your-website.com",
  "fundingUrl": "https://buymeacoffee.com/yourname",
  "isDesktopOnly": false
}
```

### main.ts の基本構造

```typescript
import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

// 設定のインターフェース
interface MyPluginSettings {
  mySetting: string;
}

// デフォルト設定
const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: 'default'
}

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    // プラグインが読み込まれた時に実行される
    await this.loadSettings();

    // ここに機能を追加
    this.addCommand({
      id: 'example-command',
      name: 'Example Command',
      callback: () => {
        console.log('Command executed!');
      }
    });

    // 設定タブを追加
    this.addSettingTab(new MySettingTab(this.app, this));
  }

  onunload() {
    // プラグインがアンロードされた時のクリーンアップ処理
    console.log('Unloading plugin');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// 設定タブのクラス
class MySettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Setting name')
      .setDesc('Setting description')
      .addText(text => text
        .setPlaceholder('Enter your setting')
        .setValue(this.plugin.settings.mySetting)
        .onChange(async (value) => {
          this.plugin.settings.mySetting = value;
          await this.plugin.saveSettings();
        }));
  }
}
```

## 主要APIリファレンス

### ライフサイクルメソッド

#### `onload()`

プラグインが有効化された時に呼び出されます。すべての機能登録はここで行います。

```typescript
async onload() {
  // コマンド、リボンアイコン、設定などを登録
}
```

#### `onunload()`

プラグインが無効化された時に呼び出されます。リソースのクリーンアップを行います。

```typescript
onunload() {
  // イベントリスナーの削除など
}
```

### コマンドの追加

#### `addCommand()`

コマンドパレットに新しいコマンドを追加します。

```typescript
this.addCommand({
  id: 'open-sample-modal',
  name: 'Open sample modal',
  callback: () => {
    new SampleModal(this.app).open();
  }
});
```

エディタでのみ実行可能なコマンド：

```typescript
this.addCommand({
  id: 'editor-command',
  name: 'Editor Command',
  editorCallback: (editor: Editor, view: MarkdownView) => {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    editor.replaceSelection('Inserted text');
  }
});
```

条件付きコマンド：

```typescript
this.addCommand({
  id: 'conditional-command',
  name: 'Conditional Command',
  checkCallback: (checking: boolean) => {
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (markdownView) {
      if (!checking) {
        // 実際の処理
      }
      return true;
    }
    return false;
  }
});
```

### リボンアイコンの追加

#### `addRibbonIcon()`

左サイドバーにアイコンを追加します。

```typescript
const ribbonIconEl = this.addRibbonIcon(
  'dice',  // アイコン名
  'Sample Plugin',  // ツールチップ
  (evt: MouseEvent) => {
    // クリック時の処理
    new Notice('Icon clicked!');
  }
);

// さらにクラスを追加することも可能
ribbonIconEl.addClass('my-plugin-ribbon-class');
```

### 設定タブの追加

#### `addSettingTab()`

設定画面にタブを追加します。

```typescript
this.addSettingTab(new MySettingTab(this.app, this));
```

### データの永続化

#### `loadData()` / `saveData()`

プラグインの設定をJSON形式で保存・読み込みします。

```typescript
async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

async saveSettings() {
  await this.saveData(this.settings);
}
```

### モーダルの作成

```typescript
import { Modal, App } from 'obsidian';

class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const {contentEl} = this;
    contentEl.setText('This is a modal!');
  }

  onClose() {
    const {contentEl} = this;
    contentEl.empty();
  }
}

// モーダルを開く
new SampleModal(this.app).open();
```

### エディタ操作

```typescript
// 現在のカーソル位置を取得
const cursor = editor.getCursor();

// 選択範囲のテキストを取得
const selection = editor.getSelection();

// テキストを挿入
editor.replaceSelection('Inserted text');

// 特定の行を取得
const line = editor.getLine(cursor.line);

// テキストを置換
editor.replaceRange('New text', from, to);
```

### ファイル操作

```typescript
// アクティブなファイルを取得
const file = this.app.workspace.getActiveFile();

// ファイルの内容を読み込む
const content = await this.app.vault.read(file);

// ファイルに書き込む
await this.app.vault.modify(file, newContent);

// 新しいファイルを作成
await this.app.vault.create('path/to/file.md', 'content');

// ファイルを削除
await this.app.vault.delete(file);
```

## 開発ワークフロー

### 1. 開発モードでのビルド

```bash
npm run dev
```

ファイルの変更を監視し、自動的に再ビルドします。

### 2. Hot Reload プラグインの使用

開発効率を上げるため、[Hot Reload plugin](https://github.com/pjeby/hot-reload)の使用を推奨します。

**インストール方法：**

1. Hot Reloadプラグインのリポジトリをクローン
2. テストVaultの`.obsidian/plugins/hot-reload/`に配置
3. Obsidianでプラグインを有効化

**使い方：**

開発中のプラグインディレクトリに`.hotreload`ファイルを作成するか、`.git`ディレクトリが存在すれば、`main.js`や`styles.css`の変更を自動検知してプラグインをリロードします。

### 3. プロダクションビルド

```bash
npm run build
```

最適化されたビルドを生成します。

## デバッグとテスト

### デベロッパーツールの使用

Obsidianは Electron アプリケーションのため、Chromeのデベロッパーツールが使用できます。

**開き方：** `Ctrl + Shift + I` (Windows/Linux) または `Cmd + Option + I` (Mac)

### コンソールログ

```typescript
console.log('Debug message');
console.error('Error message');
console.warn('Warning message');
```

### 手動でのプラグインリロード

デベロッパーツールのコンソールで以下のコマンドを実行：

```javascript
// プラグインを無効化
await app.plugins.disablePlugin("your-plugin-id");

// プラグインを有効化
await app.plugins.enablePlugin("your-plugin-id");
```

### ブレークポイントの設定

`npm run dev`でソースマップが生成されるため、デベロッパーツールでTypeScriptファイルにブレークポイントを設定できます。

### テスト用Vaultの使用

**重要：** 本番のVaultでプラグイン開発を行わないでください。プラグインはファイルを変更・削除する可能性があります。

## リリース手順

### 1. バージョン番号の更新

#### 方法1: npm コマンドを使用

```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

#### 方法2: 手動更新

`manifest.json`:
```json
{
  "version": "1.1.0",
  "minAppVersion": "0.15.0"
}
```

`versions.json`:
```json
{
  "1.0.0": "0.15.0",
  "1.1.0": "0.15.0"
}
```

`package.json`:
```json
{
  "version": "1.1.0"
}
```

### 2. プロダクションビルド

```bash
npm run build
```

### 3. GitHubリリースの作成

1. GitHubリポジトリの「Releases」セクションへ移動
2. 「Create a new release」をクリック
3. タグを作成（例：`1.1.0`）
4. リリースノートを記述
5. 以下のファイルを添付：
   - `main.js`
   - `manifest.json`
   - `styles.css` (使用している場合)

### 4. コミュニティプラグインへの登録

初回リリース時のみ、[obsidian-releases](https://github.com/obsidianmd/obsidian-releases)リポジトリにプルリクエストを作成します。

## ベストプラクティス

### 1. コード品質

- **ESLintの使用**: コード品質を保つためにESLintを設定
- **TypeScriptの型定義**: `any`の使用を避け、適切な型を定義
- **コメントの記述**: 複雑なロジックには説明を追加

### 2. パフォーマンス

- **デバウンス処理**: 頻繁に実行される処理には debounce を実装
- **非同期処理**: 重い処理は async/await で非同期化
- **メモリリーク防止**: `onunload()`で適切にクリーンアップ

### 3. ユーザー体験

- **エラーハンドリング**: 適切なエラーメッセージを表示
- **通知の使用**: `Notice`クラスで操作のフィードバックを提供
- **設定の提供**: ユーザーがカスタマイズできるようにする

### 4. セキュリティ

- **公式APIの使用**: 非公式な内部APIへのアクセスは避ける
  - 理由: 将来のバージョンで動作しなくなる可能性
- **入力のバリデーション**: ユーザー入力を適切に検証
- **機密情報の扱い**: API keyなどは設定で管理し、コードに埋め込まない

### 5. データの永続化

```typescript
// デバウンス処理の例
private saveTimeout: NodeJS.Timeout | null = null;

async saveSettingsDebounced() {
  if (this.saveTimeout) {
    clearTimeout(this.saveTimeout);
  }

  this.saveTimeout = setTimeout(async () => {
    await this.saveSettings();
    this.saveTimeout = null;
  }, 1000);
}
```

### 6. プラグインガイドラインの遵守

Obsidianの[プラグインガイドライン](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)に従ってください：

- データ収集は最小限に
- ユーザーの同意なしにネットワークリクエストを送信しない
- Vaultデータのプライバシーを尊重

## 参考リソース

### 公式リソース

- **Obsidian Developer Docs**: https://docs.obsidian.md/
- **Obsidian API**: https://github.com/obsidianmd/obsidian-api
- **Sample Plugin**: https://github.com/obsidianmd/obsidian-sample-plugin
- **Plugin Guidelines**: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines

### コミュニティリソース

- **Obsidian Forum - Plugin Development**: https://forum.obsidian.md/c/developers-api/
- **Obsidian Discord**: 開発者向けチャンネルあり

### 便利なツール

- **Hot Reload Plugin**: https://github.com/pjeby/hot-reload
- **Obsidian Plugin Template**: https://github.com/obsidianmd/obsidian-sample-plugin

### チュートリアル・記事

- 公式ドキュメントの Build a Plugin ガイド
- コミュニティメンバーによる様々なブログ記事やチュートリアル

## まとめ

Obsidianプラグイン開発は、TypeScriptの知識があれば比較的容易に始められます。公式のサンプルプラグインをベースに、必要な機能を段階的に追加していくことで、強力な拡張機能を作成できます。

開発時のポイント：
- テスト用Vaultで開発する
- Hot Reloadプラグインで効率化
- 公式APIを使用し、非公式APIは避ける
- ユーザー体験とセキュリティを重視
- コミュニティガイドラインを遵守

Happy coding!
