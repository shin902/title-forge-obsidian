# Security Policy

## サポートバージョン

現在サポートされているバージョン：

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## 脆弱性の報告

セキュリティ脆弱性を発見された場合は、以下の方法で報告してください。

### 報告方法

**推奨：GitHub Security Advisory**

[Security Advisories](https://github.com/shin902/title-forge-obsidian/security/advisories/new) から非公開で報告できます。

**または：GitHub Issue**

重大な脆弱性でない場合は、[Issues](https://github.com/shin902/title-forge-obsidian/issues/new) で報告していただいても構いません。

### 報告に含めていただきたい情報

- 脆弱性の種類と影響範囲
- 再現手順
- 影響を受けるバージョン
- 可能であれば、修正案や回避策

### 対応プロセス

- 報告を受け取り次第、できるだけ早く確認します
- 重大な脆弱性の場合は、修正版をリリースし、アドバイザリを公開します

## APIキーのセキュリティ

このプラグインはGemini APIキーを使用します。APIキーの安全な管理方法については、[README.md](./README.md#プライバシーとセキュリティ)を参照してください。

### APIキーが漏洩した場合

1. すぐに[Google AI Studio](https://aistudio.google.com/app/apikey)で該当キーを無効化
2. 新しいキーを生成して設定を更新
3. 必要に応じてGoogle Cloudコンソールで使用状況を確認

## セキュリティのベストプラクティス

- `.obsidian/plugins/title-forge/data.json`をgitリポジトリにコミットしない
- Vaultを公開リポジトリに同期しない
- APIキーを定期的にローテーションする
- クラウド同期を使用する場合は、共有相手を信頼できる人に限定する
