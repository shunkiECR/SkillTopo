import { ChevronRight } from 'lucide-react';
import { categories, categoryOf, colorOf, kindOf, kindLabel, type Skill } from '../model';

type Props = {
  skills: Skill[];
  matches: Skill[];
  selectedId: string;
  select: (skill: Skill) => void;
  catalogCategory: string;
  setCatalogCategory: (category: string) => void;
  kindFilter: string;
  setKindFilter: (kind: string) => void;
};

/** catalog 画面。プロフィールの変更と画面間の選択は親へ通知する。 */
export default function Catalog({
  skills,
  matches,
  selectedId,
  select,
  catalogCategory,
  setCatalogCategory,
  kindFilter,
  setKindFilter,
}: Props) {
  const catalogMatches = matches.filter(
    (s) =>
      (!catalogCategory || s.category === catalogCategory) &&
      (!kindFilter || kindOf(s) === kindFilter),
  );
  return (
    <section className="panel page-panel">
      <small>SKILL CATALOG</small>
      <h1>
        カタログ編集{' '}
        <span className="count">
          {catalogMatches.length} / {skills.length}
        </span>
      </h1>
      <p>スキルを選び、右側の詳細パネルで習熟度・興味度を編集できます。</p>
      <div className="catalog-filters">
        <label>
          カテゴリ
          <select
            aria-label="カタログのカテゴリ"
            value={catalogCategory}
            onChange={(e) => setCatalogCategory(e.target.value)}
          >
            <option value="">すべてのカテゴリ</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          種類
          <select
            aria-label="スキルの種類"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
          >
            <option value="">すべて</option>
            <option value="skill">スキル</option>
            <option value="tool">ツール</option>
            <option value="language">言語</option>
          </select>
        </label>
      </div>
      <div className="catalog-list">
        {catalogMatches.map((s) => (
          <button
            key={s.id}
            className={s.id === selectedId ? 'active' : ''}
            onClick={() => select(s)}
          >
            <i style={{ background: categoryOf(s).color }} />
            <strong>{s.name}</strong>
            <span>{kindLabel(s)}</span>
            <span>{categoryOf(s).name}</span>
            <span className="level-badge" style={{ color: colorOf(s) }}>
              {s.level === null ? '未評価' : `Lv. ${s.level}`}
            </span>
            <ChevronRight size={16} />
          </button>
        ))}
        {!catalogMatches.length && (
          <p>一致するスキルがありません。検索・カテゴリ・種類を変更してください。</p>
        )}
      </div>
    </section>
  );
}
