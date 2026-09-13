import { isDesktop } from '../persistence';
import { type CatalogController } from '../useCatalog';

type Props = Pick<CatalogController, 'changeSkills' | 'openFile'> & {
  confirmReset: boolean;
  setConfirmReset: (confirm: boolean) => void;
  setNotice: (notice: string) => void;
};

/** settings 画面。プロフィールの変更と画面間の選択は親へ通知する。 */
export default function Preferences({
  changeSkills,
  openFile,
  confirmReset,
  setConfirmReset,
  setNotice,
}: Props) {
  return (
    <section className="panel page-panel">
      <small>PREFERENCES</small>
      <h1>設定</h1>
      <h2>データの保存</h2>
      <p>
        {isDesktop()
          ? 'ユーザー名とスキルを .skilltopo（圧縮バイナリ）または JSON ファイルに保存します。通常の「保存」は開いているファイルの形式を維持します。形式を変更する場合は上部で形式を選び、「名前を付けて保存」を使ってください。編集後は上部の「保存」を押してください。別の人を見るときは exe をもう一度起動し、その人のファイルを開いてください。'
          : '.skilltopo と JSON を開いて確認できます。「保存」は選択した形式でのダウンロードになります。'}
      </p>
      <p>
        自動保存は行いません。旧版のデータは次のボタンで取り込み、別のプロフィールとして保存できます。
      </p>
      {isDesktop() && (
        <button className="outline-button" onClick={() => openFile(true)}>
          旧データを読み込む
        </button>
      )}
      <h2>評価をリセット</h2>
      <p>
        この人の評価・興味度・ピン留めをクリアします。ユーザー名・メモ・最終使用月は保持します。
      </p>
      {confirmReset ? (
        <div className="reset-confirm">
          <p>すべてのスキルを初期状態に戻しますか？</p>
          <button
            className="primary-button"
            onClick={() => {
              changeSkills((all) =>
                all.map((s) => ({ ...s, level: null, interest: 0, pinned: false })),
              );
              setConfirmReset(false);
              setNotice('評価をリセットしました');
            }}
          >
            リセットする
          </button>
          <button className="text-button" onClick={() => setConfirmReset(false)}>
            キャンセル
          </button>
        </div>
      ) : (
        <button className="outline-button" onClick={() => setConfirmReset(true)}>
          初期状態に戻す
        </button>
      )}
      <div className="about">
        <img src="/mark.svg" alt="" />
        <div>
          <strong>SkillTopo</strong>
          <p>Tauri + React + TypeScript</p>
        </div>
      </div>
    </section>
  );
}
