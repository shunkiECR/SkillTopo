# SkillTopo 開発引継ぎ資料

確認日: 2026-09-13。対象はこの作業ツリーの実装です。全体グラフと `.skilltopo` 入出力を含みます。将来の構想ではなく、現在のコードを基準に記述しています。

## 読む順序

| 資料 | 内容 |
| --- | --- |
| [コード編集の入口](editing.md) | モジュール構成、編集例、コメント・整形の方針 |
| [設計・機能仕様](design.md) | アーキテクチャ、画面、グラフ、状態管理、IPC |
| [データ・ファイル仕様](data.md) | データ型、制約、補完、バイナリ、互換性 |
| [修正・ビルド・検証ガイド](maintenance.md) | 修正対象の早見表、変更手順、テスト、配布、既知の制約 |
| [確認記録](verification.md) | リファクタリング後の検証結果と未確認範囲 |

最初に [コード編集の入口](editing.md) で担当ファイルを探してください。保存の流れは `App.tsx` → `components/SkillDetails.tsx` → `useCatalog.ts` → `persistence.ts` → Rust の `profile.rs` → `profile/storage.rs` / `profile/format.rs` の順で追えます。

## ソフトウェアの概要

Windows 向けのローカル完結型スキル管理アプリです。1ウィンドウで1人分のプロフィールを編集します。別の人を同時に見る場合は exe を別プロセスとして起動します。ログイン・サーバー・データベース・クラウド同期はありません。

UI は React / TypeScript、グラフは SVG、デスクトップホストとファイル操作は Rust / Tauri 2 です。HTML・CSS・JavaScript と標準カタログを exe に埋め込みます。保存は手動で、`.skilltopo` と `.json` に対応します。

標準データは186項目・20カテゴリ・5グループです。画面の数値集計は標準件数を固定で使うのではなく、読み込んだプロフィールの項目数を使います。

## PlantUML 図一覧

図は編集可能な `.puml` を正本とし、描画済み SVG も同梱しています。本文には SVG を埋め込んでいるため、PlantUML 非対応の Markdown ビューアでも図を参照できます。修正後は PlantUML 対応エディタまたはローカルの PlantUML で SVG を再生成してください。

| 図 | ソース |
| --- | --- |
| システム構成 | [architecture.puml](diagrams/architecture.puml) |
| データモデル | [data-model.puml](diagrams/data-model.puml) |
| ファイル読み込み | [open-profile.puml](diagrams/open-profile.puml) |
| 編集と保存 | [save-profile.puml](diagrams/save-profile.puml) |
| ドキュメント状態遷移 | [document-state.puml](diagrams/document-state.puml) |
| ビルドと配布 | [build.puml](diagrams/build.puml) |

PlantUML の jar を用意済みなら、リポジトリ直下で次の形式で変換できます。jar の場所は自分の環境に合わせてください。構成図・クラス図の描画には Graphviz を必要とする構成があります。

```powershell
java -jar C:\tools\plantuml.jar -charset UTF-8 -tsvg "docs/handover/diagrams/*.puml"
```

## ファイル配置

| パス | 責務 |
| --- | --- |
| [frontend/src/main.tsx](../../frontend/src/main.tsx) | React の起動、StrictMode、CSS 読み込み |
| [frontend/src/App.tsx](../../frontend/src/App.tsx) | 画面の組み立て、共有UI状態、子コンポーネントへの受け渡し |
| [frontend/src/components](../../frontend/src/components) | 検索、ナビ、詳細、評価、隣接グラフ、各ページ |
| [frontend/src/MapExplorer.tsx](../../frontend/src/MapExplorer.tsx) | 放射状の分野別マップ |
| [frontend/src/AllSkillsGraph.tsx](../../frontend/src/AllSkillsGraph.tsx) | 全項目の関係グラフ |
| [frontend/src/model.ts](../../frontend/src/model.ts) | Skill 型、カタログ合成、検索、色、旧版互換の公開入口 |
| [frontend/src/graph](../../frontend/src/graph) | SVG座標・ラベル折返し・関連エッジの純粋計算 |
| [frontend/src/useCatalog.ts](../../frontend/src/useCatalog.ts) | 編集中データ、未保存状態、ファイル操作の調停 |
| [frontend/src/persistence.ts](../../frontend/src/persistence.ts) | IPC／ブラウザ分岐とファイル選択・ダウンロード |
| [frontend/src/profile](../../frontend/src/profile) | types.ts: 型・上限、validation.ts: 検証・補完、codec.ts: バイト変換 |
| [frontend/src/styles.css](../../frontend/src/styles.css) | 共通・画面別スタイル。後半の上書きルールに注意 |
| [src-tauri/src/main.rs](../../src-tauri/src/main.rs) | Tauri起動、コマンド登録、終了確認 |
| [src-tauri/src/catalog.rs](../../src-tauri/src/catalog.rs) | Skill型、カタログ合成、共通検証、旧データ読込とテスト |
| [src-tauri/src/profile.rs](../../src-tauri/src/profile.rs) | Document/Session、ダイアログとIPC操作の調停 |
| [src-tauri/src/profile](../../src-tauri/src/profile) | format.rs: 型・検証・変換、storage.rs: ファイル読込・保存、tests.rs: 回帰テスト |
| [src-tauri/tauri.conf.json](../../src-tauri/tauri.conf.json) | ウィンドウ、CSP、埋め込み先 |
| [src-tauri/capabilities/default.json](../../src-tauri/capabilities/default.json) | メインウィンドウの許可設定 |
| [scripts/build-app.ps1](../../scripts/build-app.ps1) | フロントエンド→Rust→配布フォルダのビルド |
| [frontend/scripts/smoke.mjs](../../frontend/scripts/smoke.mjs) | フロントエンド側の自動検証 |
| [examples](../../examples) | JSON とバイナリのサンプル。テストからも参照 |

既存資料: [起動手順](../../README.md)、[カタログの出典](../catalog-sources.md)、[バイナリ形式の概要](../profile-format.md)。
