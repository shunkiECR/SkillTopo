# SkillTopo

React / TypeScript の画面を Tauri 2 で動かす Windows デスクトップアプリです。

ソフトウェアを直接修正する方向けの資料は [開発引継ぎ資料](docs/handover/README.md) を参照してください。最初は [コード編集の入口](docs/handover/editing.md) から、変更したい機能の担当ファイルを探せます。設計・仕様、保存形式、変更手順、PlantUML 図もまとめています。

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

画面のみを素早く確認する場合は `scripts/start-frontend.ps1` を実行します。ブラウザプレビューの保存はファイルのダウンロードになります。

## 保存

ユーザー名・評価・興味度・ピン留め・メモ・関連情報は、上部の「保存」でプロフィールファイルに保存します。自動保存は行いません。標準形式は `.skilltopo`（圧縮バイナリ）です。JSON が必要な場合は「新規・別名保存の形式」で JSON を選び、「名前を付けて保存」を押してください。通常の「保存」は現在のファイルの形式を維持します。

他の人には `dist/SkillTopo.exe` と保存した `.skilltopo` ファイルを渡してください。受け取った人はアプリを起動して「ファイルを開く」から読み込みます。ファイルをダブルクリックするための関連付けは行いません。サンプルは `dist/examples/` に JSON とバイナリの両形式で入っています。旧バージョンの exe はバイナリ非対応のため、今回の exe を一緒に渡してください。

新規プロフィールは186項目を未評価で開始します。読み込み時は不足する標準項目だけを未評価で追加し、既存の評価やメモを維持します。読み込み・保存失敗時はエラーを表示し、編集中の内容を維持します。旧版の自動保存データは「設定」の「旧データを読み込む」から取り込めます。

バイナリ形式の仕様は [プロフィール形式](docs/profile-format.md) を参照してください。

## スキル・ツールの探し方

20カテゴリを5つの分野グループにまとめています。マップ上部のグループ・カテゴリを選択してください。「他 n 件」からもカテゴリの全項目を開けます。カテゴリ内は16件ずつ表示します。

カタログではカテゴリと「スキル / ツール / 言語」で絞り込めます。検索は「フォトショ」「スプシ」「GAS」などの別名にも対応します。追加内容と参照元は [カタログの出典](docs/catalog-sources.md) に記載しています。

## 構成

- `frontend/src/App.tsx`: 画面の組み立てと共有UI状態
- `frontend/src/components/`: 検索、ナビ、各ページ、詳細と評価
- `frontend/src/graph/`: SVG座標、ラベル、関連線の計算
- `frontend/src/model.ts`: スキル型、標準カタログ、検索と色
- `frontend/src/profile/`: プロフィール型、検証と補完、JSON/バイナリ変換
- `frontend/src/persistence.ts`: Tauri IPC / ブラウザプレビューの保存先切り替え
- `frontend/src/useCatalog.ts`: 初期読み込み、編集、保存状態の管理
- `src-tauri/src/main.rs`: Tauri起動、コマンド登録、終了確認
- `src-tauri/src/catalog.rs`: スキル型、標準カタログ、検証、旧版移行
- `src-tauri/src/profile.rs`: IPCとファイル操作の調停
- `src-tauri/src/profile/`: 形式変換、ファイルI/O、テスト
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

## 全体のスキル関係グラフ

左メニューの「全体グラフ」で、全186項目と登録済みの関連を表示します。カテゴリ別に色分けし、同じ2項目間の関連は1本の線にまとめます。線は前提条件や学習順序を表しません。

ノードを選択すると詳細パネルが更新され、つながる線が強調されます。「選択スキルと関連先のみ」で絞り込み、拡大率を上げて縦横にスクロールできます。上部の検索に一致するノードも強調されます。
