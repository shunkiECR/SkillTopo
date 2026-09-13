import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { colors, matchesQuery, type Skill } from './model';
import { type FileFormat } from './persistence';
import { useCatalog } from './useCatalog';
import MapExplorer from './MapExplorer';
import AllSkillsGraph from './AllSkillsGraph';
import Sidebar, { type View } from './components/Sidebar';
import AppHeader from './components/AppHeader';
import ProfileToolbar from './components/ProfileToolbar';
import Metrics from './components/Metrics';
import Dashboard from './components/Dashboard';
import RelatedSkills from './components/RelatedSkills';
import Catalog from './components/Catalog';
import Preferences from './components/Preferences';
import SkillDetails from './components/SkillDetails';

/** 画面の組み立てと共有UI状態。保存対象の状態は useCatalog に集約する。 */
export default function App() {
  const {
    skills,
    userName,
    filePath,
    dirty,
    ready,
    loadError,
    saveError,
    saving,
    changeSkills,
    changeUserName,
    newFile,
    openFile,
    saveFile,
    clearError,
  } = useCatalog();
  // 画面を切り替えても検索条件・確認状態を維持するため、ここで保持する。
  const [selectedId, setSelectedId] = useState('freertos');
  const [view, setView] = useState<View>('map');
  const [query, setQuery] = useState('');
  // undefined: 全レベル、null: 未評価のみ、数値: そのレベルのみ。
  const [levelFilter, setLevelFilter] = useState<number | null | undefined>(undefined);
  const [notice, setNotice] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [fileFormat, setFileFormat] = useState<FileFormat>('binary');
  const [confirmReset, setConfirmReset] = useState(false);
  // 読み込んだファイルに前の選択IDがなければ先頭を使う（検証済みの配列は空でない）。
  const selected = skills.find((s) => s.id === selectedId) ?? skills[0];
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const update = (patch: Partial<Skill>) =>
    changeSkills((all) => all.map((s) => (s.id === selected.id ? { ...s, ...patch } : s)));
  const select = (s: Skill) => setSelectedId(s.id);
  const matches = skills.filter((s) => matchesQuery(s, query));

  if (!ready)
    return (
      <main className="startup">
        <img src="/mark.svg" alt="" />
        <h1>SkillTopo</h1>
        {loadError ? (
          <>
            <p role="alert">カタログを読み込めませんでした。{loadError}</p>
            <p>保存データは変更していません。</p>
            <button className="outline-button" onClick={() => window.location.reload()}>
              再読み込み
            </button>
          </>
        ) : (
          <p role="status">スキルを読み込んでいます…</p>
        )}
      </main>
    );
  return (
    <div className="app-shell">
      <AppHeader
        query={query}
        setQuery={setQuery}
        matches={matches}
        select={select}
        setView={setView}
        saving={saving}
        dirty={dirty}
      />
      <Sidebar view={view} setView={setView} />

      <main className="workspace">
        <ProfileToolbar
          userName={userName}
          filePath={filePath}
          dirty={dirty}
          saving={saving}
          changeUserName={changeUserName}
          newFile={newFile}
          openFile={openFile}
          saveFile={saveFile}
          fileFormat={fileFormat}
          setFileFormat={setFileFormat}
        />
        <section className="main-column" inert={saving}>
          <Metrics skills={skills} onOpenDashboard={() => setView('dashboard')} />

          {view === 'map' && (
            <>
              <MapExplorer
                skills={skills}
                selected={selected}
                select={select}
                query={query.trim()}
                levelFilter={levelFilter}
              />
              <div className="legend panel">
                <span>習熟度の色：</span>
                {[null, 0, 1, 2, 3, 4].map((n) => (
                  <button
                    key={String(n)}
                    className={levelFilter === n ? 'active' : ''}
                    aria-pressed={levelFilter === n}
                    onClick={() => setLevelFilter(levelFilter === n ? undefined : n)}
                  >
                    <i style={{ background: n === null ? '#858b97' : colors[n] }} />
                    {n === null ? '未評価' : `レベル ${n}`}
                  </button>
                ))}
              </div>
            </>
          )}

          {view === 'dashboard' && <Dashboard skills={skills} select={select} setView={setView} />}
          {view === 'graph' && (
            <AllSkillsGraph skills={skills} selected={selected} select={select} query={query} />
          )}

          {view === 'related' && (
            <RelatedSkills selected={selected} skills={skills} select={select} />
          )}
          {view === 'catalog' && (
            <Catalog
              skills={skills}
              matches={matches}
              selectedId={selectedId}
              select={select}
              catalogCategory={catalogCategory}
              setCatalogCategory={setCatalogCategory}
              kindFilter={kindFilter}
              setKindFilter={setKindFilter}
            />
          )}
          {view === 'settings' && (
            <Preferences
              changeSkills={changeSkills}
              openFile={openFile}
              confirmReset={confirmReset}
              setConfirmReset={setConfirmReset}
              setNotice={setNotice}
            />
          )}
        </section>
        <SkillDetails
          selected={selected}
          skills={skills}
          saving={saving}
          select={select}
          update={update}
          setView={setView}
        />
      </main>
      {saveError && (
        <div className="save-error" role="alert">
          <span>{saveError}</span>
          <button onClick={clearError}>閉じる</button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
          <button className="icon-button" aria-label="通知を閉じる" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
