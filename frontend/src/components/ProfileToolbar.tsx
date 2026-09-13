import { type FileFormat } from '../persistence';
import { type CatalogController } from '../useCatalog';

type Props = Pick<
  CatalogController,
  | 'userName'
  | 'filePath'
  | 'dirty'
  | 'saving'
  | 'changeUserName'
  | 'newFile'
  | 'openFile'
  | 'saveFile'
> & { fileFormat: FileFormat; setFileFormat: (format: FileFormat) => void };

/** プロフィール操作の入口。形式選択は新規・別名保存に使い、通常保存の判断は保存層に任せる。 */
export default function ProfileToolbar({
  userName,
  filePath,
  dirty,
  saving,
  changeUserName,
  newFile,
  openFile,
  saveFile,
  fileFormat,
  setFileFormat,
}: Props) {
  return (
    <section className="profile-toolbar panel" aria-label="プロフィールファイル">
      <div className="profile-identity">
        <label>
          ユーザー名
          <input
            aria-label="ユーザー名"
            maxLength={80}
            value={userName}
            disabled={saving}
            onChange={(e) => changeUserName(e.target.value)}
          />
        </label>
        <span className="profile-path" title={filePath ?? '保存先を選んでください'}>
          {filePath ?? '新規プロフィール — 保存先未設定'}
          {dirty ? ' ● 未保存' : filePath ? ' ✓ 保存済み' : ''}
        </span>
      </div>
      <div className="file-actions">
        <label className="file-format">
          新規・別名保存の形式
          <select
            aria-label="保存形式"
            disabled={saving}
            value={fileFormat}
            onChange={(e) => setFileFormat(e.target.value as FileFormat)}
          >
            <option value="binary">SkillTopo バイナリ (.skilltopo)</option>
            <option value="json">JSON (.json)</option>
          </select>
        </label>
        <button disabled={saving} onClick={newFile}>
          新規
        </button>
        <button disabled={saving} onClick={() => openFile()}>
          ファイルを開く
        </button>
        <button className="file-save" disabled={saving} onClick={() => saveFile(false, fileFormat)}>
          保存
        </button>
        <button disabled={saving} onClick={() => saveFile(true, fileFormat)}>
          名前を付けて保存
        </button>
      </div>
    </section>
  );
}
