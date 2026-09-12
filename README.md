# SkillTopo

React / TypeScript の画面を Tauri 2 で動かす Windows デスクトップアプリです。

## 起動

`dist/SkillTopo.exe` をダブルクリックします。アプリの実行に Node.js、Rust、開発サーバーは不要です。画面と初期データは exe に埋め込まれています。

Windows 10 / 11（x64）と Microsoft Edge WebView2 Runtime が必要です。別の PC で起動しない場合は [Microsoft の WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) をインストールしてください。この exe はインストーラーではありません。

## ビルド

開発時は Node.js 22.12 以降、Rust の MSVC ツールチェーン、Visual Studio C++ Build Tools が必要です。
この作業環境の `.tools` に Node.js がある場合、スクリプトが自動的に利用します。

```powershell
cd D:\git\SkillTopo
powershell -ExecutionPolicy Bypass -File scripts/build-app.ps1
```

React の型チェック・本番ビルド、Rust のリリースビルドの順に実行し、`dist/SkillTopo.exe` を生成します。

デバッグ版をビルドして起動する場合：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-app.ps1 -DebugBuild -Run
```

React をビルド済みなら `cargo run -p skilltopo` でも起動できます。React の変更を取り込むには再ビルドが必要です。VS Code の F5 ではビルドタスクが React を更新してから CodeLLDB で起動します。

画面のみを素早く確認する場合は `scripts/start-frontend.ps1` を実行します。このブラウザプレビューだけはローカルストレージを使用し、デスクトップ版のデータとは分離しています。

## 保存

評価・興味度・ピン留めは Rust の `save_catalog` コマンドで `%APPDATA%\com.skilltopo.desktop\catalog.json` に自動保存します。exe を更新しても保存データは保持されます。ブラウザ版で編集したデータの自動移行は行いません。

初回は `frontend/src/catalog.json` と `frontend/src/profile-items.json` を合成した186件を使います。更新時は保存データにないIDだけを追加し、既存の評価やメモを維持します。読み込み失敗時は保存データを上書きせず、エラーを表示します。保存失敗時は再試行ボタンを表示します。保存中や未保存の表示がある場合は、保存完了を待ってから終了してください。

## スキル・ツールの探し方

20カテゴリを5つの分野グループにまとめています。マップ上部のグループ・カテゴリを選択してください。「他 n 件」からもカテゴリの全項目を開けます。カテゴリ内は16件ずつ表示します。

カタログではカテゴリと「スキル / ツール / 言語」で絞り込めます。検索は「フォトショ」「スプシ」「GAS」などの別名にも対応します。追加内容と参照元は [カタログの出典](docs/catalog-sources.md) に記載しています。

## 構成

- `frontend/src/`: React の画面、SVG マップ、データモデル
- `frontend/src/persistence.ts`: Tauri IPC / ブラウザプレビューの保存先切り替え
- `frontend/src/useCatalog.ts`: 初期読み込み、編集、保存状態の管理
- `src-tauri/src/main.rs`: データ検証、ファイル保存、Tauri 起動
- `src-tauri/tauri.conf.json`: 埋め込む画面、ウィンドウ、セキュリティ設定
- `scripts/build-app.ps1`: exe 生成

外部のフォントや CDN は使わず、オフラインで画面を表示します。ウィンドウの移動・最小化・最大化・終了には Windows の標準タイトルバーを使います。

## 検証

```powershell
cd frontend
npm test
npm run build
cd ..
cargo test -p skilltopo --locked
```

フロントエンドではデータ整合性と保存処理、Rust では入力検証とファイル保存を検証します。
