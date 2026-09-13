import { Search, X } from 'lucide-react';
import { categoryOf, type Skill } from '../model';
import { isDesktop } from '../persistence';
import { type View } from './Sidebar';

type Props = {
  query: string;
  setQuery: (query: string) => void;
  matches: Skill[];
  select: (skill: Skill) => void;
  setView: (view: View) => void;
  saving: boolean;
  dirty: boolean;
};

/** 検索入力と結果一覧。Enter と結果クリックの画面遷移の違いを維持する。 */
export default function AppHeader({
  query,
  setQuery,
  matches,
  select,
  setView,
  saving,
  dirty,
}: Props) {
  return (
    <header className="topbar">
      <a
        className="brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setView('map');
        }}
      >
        <img src="/mark.svg" alt="" />
        <span>SkillTopo</span>
      </a>
      <span className="tagline">スキルの地形を描き、可能性を見つける</span>
      <div className="search-wrap">
        <Search size={21} />
        <input
          aria-label="スキルを検索"
          placeholder="スキルを検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQuery('');
            if (e.key === 'Enter' && matches[0]) {
              select(matches[0]);
              setQuery('');
            }
          }}
        />
        {query && (
          <button className="icon-button" aria-label="検索をクリア" onClick={() => setQuery('')}>
            <X size={17} />
          </button>
        )}
        {query && (
          <div className="search-results">
            {matches.length ? (
              matches.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    select(s);
                    setQuery('');
                    setView('map');
                  }}
                >
                  <i style={{ background: categoryOf(s).color }} />
                  {s.name}
                  <small>{categoryOf(s).name}</small>
                </button>
              ))
            ) : (
              <p>一致するスキルがありません</p>
            )}
          </div>
        )}
      </div>
      <span className="sample-badge">
        {isDesktop() ? (saving ? '処理中…' : dirty ? '未保存' : 'DESKTOP') : 'BROWSER PREVIEW'}
      </span>
    </header>
  );
}
