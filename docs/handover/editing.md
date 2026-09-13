# コード編集の入口

[引継ぎ資料の一覧](README.md) → このページ → 必要に応じて [詳細設計](design.md) / [データ仕様](data.md)

このページは、初めてコードを修正する人向けの案内です。2026-09-13のモジュール分割後の構成を対象とします。

## 1. 変更したい場所から探す

以下のフロントエンドのパスは `frontend/src/` からの相対パスです。

| 変更したい内容 | 編集するファイル | 役割・注意点 |
| --- | --- | --- |
| メニュー名・アイコン・順序 | [components/Sidebar.tsx](../../frontend/src/components/Sidebar.tsx) | `navigation` と画面識別子 `View` |
| 画面の追加・共通状態・通知 | [App.tsx](../../frontend/src/App.tsx) | `view` による切替と部品の組み立て |
| 検索欄・検索結果の表示 | [components/AppHeader.tsx](../../frontend/src/components/AppHeader.tsx) | 検索ロジック自体は `model.ts` |
| ユーザー名・保存形式・ファイルボタン | [components/ProfileToolbar.tsx](../../frontend/src/components/ProfileToolbar.tsx) | 操作を `useCatalog` に渡す |
| 評価率・カバー率・平均習熟度 | [components/Metrics.tsx](../../frontend/src/components/Metrics.tsx) | `assessed` と `metrics` の計算 |
| カテゴリ進捗・ピン留め一覧 | [components/Dashboard.tsx](../../frontend/src/components/Dashboard.tsx) | ダッシュボードの内容 |
| カタログの一覧・絞り込み | [components/Catalog.tsx](../../frontend/src/components/Catalog.tsx) | 検索結果をカテゴリ・種類で絞る |
| 設定の説明・リセット | [components/Preferences.tsx](../../frontend/src/components/Preferences.tsx) | リセット対象は評価・興味度・ピンのみ |
| 右側の詳細・メモ・最終使用月 | [components/SkillDetails.tsx](../../frontend/src/components/SkillDetails.tsx) | `update({ フィールド: 値 })` で親へ変更を通知 |
| 評価バーの描画 | [components/Rating.tsx](../../frontend/src/components/Rating.tsx) | 習熟度・興味度の両方で使用 |
| 隣接スキルのページ | [components/RelatedSkills.tsx](../../frontend/src/components/RelatedSkills.tsx) | 登録済みの出方向の関連を全件表示 |
| 小さい隣接グラフ | [components/RelatedGraph.tsx](../../frontend/src/components/RelatedGraph.tsx) | ページと詳細で共有。関連先は最大4件 |
| 放射状のスキルマップ | [MapExplorer.tsx](../../frontend/src/MapExplorer.tsx) | グループ・カテゴリ・ページの切替 |
| 全体グラフ | [AllSkillsGraph.tsx](../../frontend/src/AllSkillsGraph.tsx) | 固定配置・拡大・関連先の絞り込み |
| 円弧・文字の折返し・関連線 | [graph/](../../frontend/src/graph) | `geometry.ts` / `labels.ts` / `relations.ts` |
| 色・検索・スキル型・標準データ合成 | [model.ts](../../frontend/src/model.ts) | データの意味と表示に使う共通関数 |
| 余白・サイズ・レスポンシブ表示 | [styles.css](../../frontend/src/styles.css) | セクションコメントから探す。後続ルールにも注意 |

保存関連は、変更の種類によって担当が異なります。

| 変更の種類 | TypeScript | Rust |
| --- | --- | --- |
| プロフィールの型・サイズ上限 | [profile/types.ts](../../frontend/src/profile/types.ts) | [profile/format.rs](../../src-tauri/src/profile/format.rs) |
| 初期値・入力検証・不足項目補完 | [profile/validation.ts](../../frontend/src/profile/validation.ts) | [profile/format.rs](../../src-tauri/src/profile/format.rs)、[catalog.rs](../../src-tauri/src/catalog.rs) |
| JSON / バイナリ変換 | [profile/codec.ts](../../frontend/src/profile/codec.ts) | [profile/format.rs](../../src-tauri/src/profile/format.rs) |
| 未保存状態・操作の二重起動防止 | [useCatalog.ts](../../frontend/src/useCatalog.ts) | [profile.rs](../../src-tauri/src/profile.rs) の `Session` |
| ファイル選択・保存操作 | [persistence.ts](../../frontend/src/persistence.ts) | [profile.rs](../../src-tauri/src/profile.rs) のコマンド |
| 外部更新検出・一時ファイル保存 | ブラウザには該当処理なし | [profile/storage.rs](../../src-tauri/src/profile/storage.rs) |
| アプリ起動・終了確認・IPC登録 | [main.tsx](../../frontend/src/main.tsx) はReact起動のみ | [main.rs](../../src-tauri/src/main.rs) |

## 2. 分割の考え方

`App.tsx` は画面部品を並べ、共有する選択・検索・画面切替を管理します。カタログの絞り込みやリセット確認の状態もここに残しているため、画面を切り替えて戻っても状態が維持されます。

`components/` は表示とイベント通知を担当します。保存対象のプロフィールを直接変更せず、親から渡された `update`、`changeSkills` などを呼びます。保存対象の変更は `useCatalog` がまとめて受け持ちます。

`graph/` とプロフィールの検証・変換は、画面やファイル選択なしで呼べる処理です。見た目の修正で保存処理まで読む必要がなく、保存形式の修正では変換処理だけを追えます。

既存コードの呼び出し先を壊さないため、次の公開入口は維持しています。処理を直す際は実装元を編集してください。

| 公開入口 | 実装元 |
| --- | --- |
| `persistence.ts` の型・`blankProfile`・`parseProfile`・バイト変換 | `profile/types.ts` / `validation.ts` / `codec.ts` |
| `model.ts` の `point`・`sector` | `graph/geometry.ts` |
| `AllSkillsGraph.tsx` の `relationEdges` | `graph/relations.ts` |
| Rust `profile::Profile` | `profile/format.rs` |

## 3. 編集例

### メニューの「カタログ編集」を変える

1. `components/Sidebar.tsx` の `navigation` で、`id: 'catalog'` の `name` を変更します。
2. ページ見出しも変える場合は `components/Catalog.tsx` の `<h1>` を変更します。
3. `npm run format`、`npm run build` を実行します。
4. プレビューでメニューと見出しを確認します。

`id` は画面の切替に使うので、文言だけを変える場合はそのままにします。

### メモ欄の案内文を変える

`components/SkillDetails.tsx` の `textarea` の `placeholder` を編集します。`value={selected.notes}` と `onChange` は入力値を保存対象へ渡すための接続です。

```tsx
<textarea
  aria-label="スキルのメモ"
  placeholder="担当した案件・成果・学んだこと"
  value={selected.notes}
  onChange={(event) => update({ notes: event.target.value })}
/>
```

これは接続を説明する抜粋です。実際の入力欄にある `maxLength`、`rows` などの属性は残します。`selected.notes = ...` と直接代入すると、Reactの再描画や未保存通知を通らないため、必ず更新関数を使います。

文字数制限も変える場合はUIだけでなく、TSの `profile/validation.ts` とRustの `catalog.rs`、[データ仕様](data.md) も確認します。UIはUTF-16単位、保存検証のメモ上限はUTF-8バイト単位です。

### 標準スキルを追加する

`profile-items.json` の行は次の順です。

```text
[id, name, category, kind, aliases, description, related]
```

例えば既存IDと重複しないIDを決め、`category` は `categories.json` のID、`kind` は `skill` / `tool` / `language`、関連は既存スキルIDの `|` 区切りにします。合成処理はTSの `model.ts` とRustの `catalog.rs` の両方にあります。

具体的な追加・互換性確認の手順は [修正ガイド](maintenance.md#4-典型的な修正手順) を参照してください。標準項目は起動時と読み込み時に使われますが、既存プロフィールにある同じIDの名前・説明・評価は自動で上書きされません。

## 4. コメントを残す基準

関数名だけで分かる処理の説明を繰り返すより、変更時に判断が必要な理由を残します。今回のコードには、次の点を日本語コメントで記載しています。

- `level = null` は未評価、`level = 0` は評価済み。平均や評価率では区別する。
- 習熟度フィルタの `undefined` は全件、`null` は未評価のみ。
- ファイル操作の前にRustへの未保存通知を待つ。キャンセルの `null` では文書を更新しない。
- 不足する標準項目は未評価で補完し、既存IDの内容は保持する。
- 関連先の検証は標準項目を補完した後に行う。
- 圧縮ファイルは読込サイズに加え、展開中にも上限を設ける。
- 元ファイルとの比較は外部更新検出であり、完全な同時書込ロックではない。
- 全体グラフは無向の関連線、小さい隣接グラフは出方向の関連を使う。

仕様を変えたら対応するコメントと資料も同時に更新します。判断の前提や制約はコメントに、操作手順や全体像は引継ぎ資料に置きます。

## 5. 整形・確認手順

リポジトリ直下から実行します。NodeがPATHにない場合は [開発環境の案内](maintenance.md#1-開発環境) に従って準備してください。依存を導入済みの環境でも、今回追加したPrettierを使うには更新後の `package-lock.json` に合わせて `npm ci` が必要です。

```powershell
Push-Location frontend
# 初回・依存更新時
npm.cmd ci

# TS / TSX / CSS / テストを整形
npm.cmd run format
npm.cmd run format:check
npm.cmd test
npm.cmd run build
Pop-Location

cargo fmt --all
cargo fmt --all -- --check
cargo test -p skilltopo --locked
git diff --check
```

各コマンドが成功したことを確認してから次へ進んでください。この手動例はエラー時に後続処理を自動停止するスクリプトではありません。

整形ルールは `frontend/.prettierrc.json` とルートの `.editorconfig` にあります。Prettierは `src/` と `scripts/` を対象とし、カタログJSONは `.prettierignore` で除外しています。JSONの行構造と大きなデータ差分を不要に変えないためです。Rustは標準のrustfmtを使います。

CSSは宣言を改行して読みやすくしましたが、後半に同じセレクタを上書きするルールが残っています。位置を動かす前に、同じセレクタやメディアクエリを検索してください。

検索例:

```powershell
rg -n 'スキルのメモ|notes' frontend/src src-tauri/src
rg -n 'profile-toolbar|file-actions' frontend/src/styles.css
```

画面を変えたらプレビューでも確認し、ファイル操作を変えたらデスクトップでも確認します。自動テストはネイティブダイアログやレイアウトのすべてを保証するものではありません。配布前の操作一覧は [修正ガイド](maintenance.md#配布前の手動確認) を使用してください。
