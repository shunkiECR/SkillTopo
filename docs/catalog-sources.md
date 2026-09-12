# プロフィール向けスキル・ツールの拡張

確認日: 2026-09-13

既存29件に157件を加え、20カテゴリ・186件に拡張しました。3サービスの公式カテゴリ・スキル検索・公開プロフィールを参考に、SkillTopo用に重複を整理した代表的なカタログです。各サービスの全登録候補を取得した公式辞書ではありません。自由入力や呼称の違いがあるため、登録画面との完全一致や3サービスすべてでの選択可否を保証するものではありません。

他者の経験年数・評価・プロフィール本文は取り込んでいません。説明文と関連スキルはこのアプリ向けに作成したものです。新規項目の習熟度は未評価、興味度は0、最終使用は未記録で始まります。

## 参考にした公開情報

| 参照先 | カタログへの反映 |
|---|---|
| [ランサーズ：スキル登録方法](https://www.lancers.jp/faq/A1028/760) | スキル名の選択と任意入力があることを確認 |
| [ランサーズ：AI・エンジニアのスキル検索](https://www.lancers.jp/profile/search/system) | Web言語、フレームワーク、クラウド、オフィス系の項目 |
| [ランサーズ：Canvaのスキル検索](https://www.lancers.jp/profile/search?refinement_skill%5B%5D=Canva) | Canva、CapCut、WordPress、AI・SNSなどの公開登録例 |
| [ランサーズ：デザイン分野の検索](https://www.lancers.jp/profile/search/design?refinement_skill%5B%5D=Canva) | 資料・グラフィック制作ツールの例 |
| [クラウドワークス：職種・スキルの公開例](https://crowdworks.jp/public/employees/2749834/occupations) | Photoshop、Illustrator、AutoCAD、Premiereなどの登録名 |
| [クラウドワークス：EC・業務支援の公開例](https://crowdworks.jp/public/employees/6992472) | Shopify、Notion、EC運営、QAなどの例 |
| [クラウドワークス：業務自動化の公開例](https://crowdworks.jp/public/employees/2435409) | GASや業務支援ツールの例 |
| [ココナラ：プロフィールページ機能](https://help.coconala.com/hc/ja/articles/360011290814) | ツール、言語・フレームワーク、得意分野を分ける構成 |
| [ココナラ：カテゴリ一覧](https://coconala.com/categories) | 制作、文章、音楽、事務、翻訳、相談、レッスンなどの分野 |
| [ココナラ：制作ツールの公開例](https://coconala.com/users/3281432) | CLIP STUDIO PAINT、Procreate、Live2Dの例 |
| [ココナラ：会計ツールの公開例](https://coconala.com/users/4348092) | freee会計、マネーフォワードの例 |
| [ココナラ：業務・AIツールの公開例](https://coconala.com/users/2119573) | オフィスツール、GAS、AI活用の例 |

カテゴリは3サービスの名称をそのまま並べず、用途が重なるものを統合しました。プロフィールの登録例としての参照であり、特定の出品者の実績や能力を評価するものではありません。

## データ構造と追加方法

- `frontend/src/catalog.json`: 既存エンジニアリング29件。既存IDは維持。
- `frontend/src/categories.json`: 全カテゴリのID、表示名、短縮名、色、分野グループ。RustとReactの両方から使用。
- `frontend/src/profile-items.json`: 追加項目。各行は `[id, 名前, categoryId, 種類, 検索別名, 説明, 関連ID]` の7要素。
- 種類は `skill`（スキル）、`tool`（ツール）、`language`（言語）。検索別名と関連IDは `|` 区切り。
- 起動時に両カタログを合成するため、追加分を重複して別の生成ファイルに保管しません。
- Rustは保存済みカタログに存在しないIDだけを追加します。既存の評価・興味度・メモ・最終使用・関連IDは維持し、読み込みだけではファイルを書き換えません。

## 画面

マップは5グループで切り替えます。全体表示はカテゴリごとに最大4項目と「他 n 件」。カテゴリ選択後は16項目ずつページ切り替えで全件を確認できます。円内ではメーカー名を省略する場合がありますが、詳細と検索では正式な項目名を表示します。上部検索はカテゴリと別名にも対応し、カタログ一覧はカテゴリ・スキル/ツール/言語で絞り込めます。

評価率・カバー率の分母は全186件です。追加直後に率が下がるのは未評価項目が増えたためで、既存の評価を変更したためではありません。
