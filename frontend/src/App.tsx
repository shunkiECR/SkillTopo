import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, CirclePower, House, Network, Pin, Search, Settings, Share2, Users, X, ChartPie, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { categories, categoryOf, colors, colorOf, kindOf, kindLabel, matchesQuery, relationColor, type Skill } from './model';

import { isDesktop } from './persistence';
import { useCatalog } from './useCatalog';
import MapExplorer from './MapExplorer';

type View = 'dashboard' | 'map' | 'related' | 'catalog' | 'settings';
const navigation = [
  { id: 'dashboard', name: 'ダッシュボード', icon: House },
  { id: 'map', name: 'スキルマップ', icon: Network },
  { id: 'related', name: '隣接スキル', icon: Share2 },
  { id: 'catalog', name: 'カタログ編集', icon: BookOpen },
  { id: 'settings', name: '設定', icon: Settings },
] as const;
function Contours({ className = '' }: { className?: string }) {
  return <svg className={`contours ${className}`} viewBox="0 0 300 300" aria-hidden="true">{Array.from({ length: 11 }, (_, i) => <path key={i} d={`M-20 ${65 + i * 19} C70 ${-35 + i * 20} 64 ${140 + i * 11} 137 ${82 + i * 16} S218 ${105 + i * 17} 227 ${145 + i * 18} S290 ${195 + i * 10} 330 ${140 + i * 17}`} />)}</svg>;
}

function Rating({ label, value, onChange, green = false }: { label: string; value: number | null; onChange: (n: number) => void; green?: boolean }) {
  return <div className={`rating ${green ? 'green' : ''}`}><span>{label}</span><div className="rating-bars" role="group" aria-label={label}>{[0, 1, 2, 3, 4].map(n => <button key={n} aria-label={`${label}を${n}に設定`} aria-pressed={value === n} className={value !== null && n <= value ? 'filled' : ''} onClick={() => onChange(n)}/>)}</div><strong>{value ?? '—'} <small>/ 4</small></strong></div>;
}

function GraphLabel({ name, x, y, main = false }: { name: string; x: number; y: number; main?: boolean }) {
  const displayName = name.replace(/^Adobe /, '').replace(/^Microsoft /, '').replace(/^Google /, '');
  const lines = [''];
  let width = 0;
  for (const char of displayName) {
    const size = /[\x00-\x7f]/.test(char) ? 1 : 2;
    if (width + size > 16) {
      if (lines.length === 2) { lines[1] += '…'; break; }
      lines.push(''); width = 0;
    }
    lines[lines.length - 1] += char; width += size;
  }
  return <text x={x} y={y - (lines.length - 1) * 8} className={main ? 'node-title' : ''} style={{ fontSize: 13 }}>{lines.map((line, i) => <tspan key={i} x={x} dy={i ? 16 : 0}>{line}</tspan>)}</text>;
}

function RelatedGraph({ skill, skills, select }: { skill: Skill; skills: Skill[]; select: (s: Skill) => void }) {
  const related = skill.related.map(id => skills.find(s => s.id === id)).filter((s): s is Skill => !!s).slice(0, 4);
  const spots = [[250, 47], [74, 145], [426, 145], [250, 247]];
  return <svg className="related-graph" viewBox="0 0 500 300" aria-label={`${skill.name}の関連スキル`}>
    <defs><radialGradient id="node-fill"><stop stopColor="#482b9c"/><stop offset="1" stopColor="#27205a"/></radialGradient></defs>
    {related.map((s, i) => { const [x, y] = spots[i]; return <g key={s.id}>
      <path d={`M250 145 L${x} ${y}`} stroke="#ba90f5" strokeWidth="1.5"/>
      <circle cx={i === 1 ? 177 : i === 2 ? 323 : 250} cy={i === 0 ? 109 : i === 3 ? 181 : 145} r="3.5" fill="#b48bfa"/>
      <g role="button" tabIndex={0} aria-label={`${s.name}の詳細を表示`} className="graph-node" onClick={() => select(s)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(s); } }}>
        <rect x={x - 61} y={y - 23} width="122" height="46" rx="23" fill={relationColor(s)} fillOpacity=".15" stroke={relationColor(s)} strokeWidth="1.5"/>
        <GraphLabel name={s.name} x={x} y={y + 1}/>
      </g>
    </g>; })}
    <rect x="182" y="117" width="136" height="56" rx="28" fill="url(#node-fill)" stroke="#a87aff" strokeWidth="1.8" className="central-node"/>
    <GraphLabel name={skill.name} x={250} y={146} main/>
    {!related.length && <text x="250" y="240">関連スキルはありません</text>}
  </svg>;
}

export default function App() {
  const { skills, userName, filePath, dirty, ready, loadError, saveError, saving, changeSkills, changeUserName, newFile, openFile, saveFile, clearError } = useCatalog();
  const [selectedId, setSelectedId] = useState('freertos');
  const [view, setView] = useState<View>('map');
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null | undefined>(undefined);
  const [notice, setNotice] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const selected = skills.find(s => s.id === selectedId) ?? skills[0];
  const assessed = skills.filter(s => s.level !== null);
  const metrics = [
    { label: '評価率', value: `${Math.round(assessed.length / skills.length * 100)}%`, icon: ChartPie, className: 'blue' },
    { label: 'カバー率', value: `${Math.round(skills.filter(s => s.level !== null && s.level >= 2).length / skills.length * 100)}%`, icon: ChartNoAxesColumnIncreasing, className: 'green' },
    { label: '平均習熟度', value: assessed.length ? (assessed.reduce((a, s) => a + s.level!, 0) / assessed.length).toFixed(1) : '—', icon: Users, className: 'blue' },
  ];
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);
  const update = (patch: Partial<Skill>) => changeSkills(all => all.map(s => s.id === selected.id ? { ...s, ...patch } : s));
  const select = (s: Skill) => setSelectedId(s.id);
  const matches = skills.filter(s => matchesQuery(s, query));
  const catalogMatches = matches.filter(s => (!catalogCategory || s.category === catalogCategory) && (!kindFilter || kindOf(s) === kindFilter));
  if (!ready) return <main className="startup"><img src="/mark.svg" alt=""/><h1>SkillTopo</h1>{loadError ? <><p role="alert">カタログを読み込めませんでした。{loadError}</p><p>保存データは変更していません。</p><button className="outline-button" onClick={() => window.location.reload()}>再読み込み</button></> : <p role="status">スキルを読み込んでいます…</p>}</main>;
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setView('map'); }}><img src="/mark.svg" alt=""/><span>SkillTopo</span></a><span className="tagline">スキルの地形を描き、可能性を見つける</span><div className="search-wrap"><Search size={21}/><input aria-label="スキルを検索" placeholder="スキルを検索..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setQuery(''); if (e.key === 'Enter' && matches[0]) { select(matches[0]); setQuery(''); } }}/>{query && <button className="icon-button" aria-label="検索をクリア" onClick={() => setQuery('')}><X size={17}/></button>}{query && <div className="search-results">{matches.length ? matches.map(s => <button key={s.id} onClick={() => { select(s); setQuery(''); setView('map'); }}><i style={{ background: categoryOf(s).color }}/>{s.name}<small>{categoryOf(s).name}</small></button>) : <p>一致するスキルがありません</p>}</div>}</div><span className="sample-badge">{isDesktop() ? (saving ? '処理中…' : dirty ? '未保存' : 'DESKTOP') : 'BROWSER PREVIEW'}</span></header>
    <aside className="sidebar"><nav aria-label="メインナビゲーション">{navigation.map(({ id, name, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}><Icon size={27} strokeWidth={1.6}/><span>{name}</span></button>)}</nav><Contours/><div className="sidebar-footer"><span>SkillTopo<br/>v1.0.0 (Phase 1)</span><span>技術のつながりから<br/>次の一歩を</span></div></aside>
    <main className="workspace"><section className="profile-toolbar panel" aria-label="プロフィールファイル"><div className="profile-identity"><label>ユーザー名<input aria-label="ユーザー名" maxLength={80} value={userName} disabled={saving} onChange={e => changeUserName(e.target.value)}/></label><span className="profile-path" title={filePath ?? '保存先を選んでください'}>{filePath ?? '新規プロフィール — 保存先未設定'}{dirty ? ' ● 未保存' : filePath ? ' ✓ 保存済み' : ''}</span></div><div className="file-actions"><button disabled={saving} onClick={newFile}>新規</button><button disabled={saving} onClick={() => openFile()}>ファイルを開く</button><button className="file-save" disabled={saving} onClick={() => saveFile()}>保存</button><button disabled={saving} onClick={() => saveFile(true)}>名前を付けて保存</button></div></section><section className="main-column" inert={saving}>
      <div className="metrics">{metrics.map(({ label, value, icon: Icon, className }) => <button className="metric panel" key={label} onClick={() => setView('dashboard')}><Icon size={39} className={className}/><div><span>{label}</span><strong>{value}</strong></div><ChevronRight size={19}/></button>)}</div>
      {view === 'map' && <><MapExplorer skills={skills} selected={selected} select={select} query={query.trim()} levelFilter={levelFilter}/><div className="legend panel"><span>習熟度の色：</span>{[null, 0, 1, 2, 3, 4].map(n => <button key={String(n)} className={levelFilter === n ? 'active' : ''} aria-pressed={levelFilter === n} onClick={() => setLevelFilter(levelFilter === n ? undefined : n)}><i style={{ background: n === null ? '#858b97' : colors[n] }}/>{n === null ? '未評価' : `レベル ${n}`}</button>)}</div></>}
      {view === 'dashboard' && <section className="panel page-panel"><div className="page-heading"><div><small>YOUR SKILL LANDSCAPE</small><h1>スキルの現在地</h1></div><Network className="blue"/></div><p>分野ごとの評価状況から、次の一歩を見つけましょう。</p>{categories.map(c => { const items = skills.filter(s => s.category === c.id); const count = items.filter(s => s.level !== null).length; return <div className="category-progress" key={c.id}><div><span>{c.name}</span><span>{count} / {items.length} スキルを評価</span></div><div className="progress-track"><span style={{ width: `${count / items.length * 100}%`, background: c.color }}/></div></div>; })}<h2>ピン留めしたスキル</h2><div className="pinned-list">{skills.filter(s => s.pinned).map(s => <button key={s.id} onClick={() => { select(s); setView('map'); }}><Pin size={16}/>{s.name}<ArrowRight size={16}/></button>)}{!skills.some(s => s.pinned) && <p>詳細パネルのピンから追加できます。</p>}</div></section>}
      {view === 'related' && <section className="panel page-panel"><small>CONNECTED KNOWLEDGE</small><h1>隣接スキルを探索</h1><p>ノードを選択すると、そのスキルにつながる知識を表示します。</p><RelatedGraph skill={selected} skills={skills} select={select}/><h2>{selected.name} から広がるスキル</h2><div className="related-list">{selected.related.map(id => skills.find(s => s.id === id)).filter((s): s is Skill => !!s).map(s => <button key={s.id} onClick={() => select(s)}><i style={{ background: categoryOf(s).color }}/><div><strong>{s.name}</strong><p>{s.description}</p></div><ChevronRight size={18}/></button>)}</div></section>}
      {view === 'catalog' && <section className="panel page-panel"><small>SKILL CATALOG</small><h1>カタログ編集 <span className="count">{catalogMatches.length} / {skills.length}</span></h1><p>スキルを選び、右側の詳細パネルで習熟度・興味度を編集できます。</p><div className="catalog-filters"><label>カテゴリ<select aria-label="カタログのカテゴリ" value={catalogCategory} onChange={e => setCatalogCategory(e.target.value)}><option value="">すべてのカテゴリ</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>種類<select aria-label="スキルの種類" value={kindFilter} onChange={e => setKindFilter(e.target.value)}><option value="">すべて</option><option value="skill">スキル</option><option value="tool">ツール</option><option value="language">言語</option></select></label></div><div className="catalog-list">{catalogMatches.map(s => <button key={s.id} className={s.id === selectedId ? 'active' : ''} onClick={() => select(s)}><i style={{ background: categoryOf(s).color }}/><strong>{s.name}</strong><span>{kindLabel(s)}</span><span>{categoryOf(s).name}</span><span className="level-badge" style={{ color: colorOf(s) }}>{s.level === null ? '未評価' : `Lv. ${s.level}`}</span><ChevronRight size={16}/></button>)}{!catalogMatches.length && <p>一致するスキルがありません。検索・カテゴリ・種類を変更してください。</p>}</div></section>}
      {view === 'settings' && <section className="panel page-panel"><small>PREFERENCES</small><h1>設定</h1><h2>データの保存</h2><p>{isDesktop() ? 'ユーザー名とスキルを JSON ファイルに保存します。編集後は上部の「保存」を押してください。別の人を見るときは exe をもう一度起動し、その人のファイルを開いてください。' : 'JSON を開いて確認できます。「保存」は JSON のダウンロードになります。'}</p><p>自動保存は行いません。旧版のデータは次のボタンで取り込み、別のプロフィールとして保存できます。</p>{isDesktop() && <button className="outline-button" onClick={() => openFile(true)}>旧データを読み込む</button>}<h2>評価をリセット</h2><p>この人の評価・興味度・ピン留めをクリアします。ユーザー名・メモ・最終使用月は保持します。</p>{confirmReset ? <div className="reset-confirm"><p>すべてのスキルを初期状態に戻しますか？</p><button className="primary-button" onClick={() => { changeSkills(all => all.map(s => ({ ...s, level: null, interest: 0, pinned: false }))); setConfirmReset(false); setNotice('評価をリセットしました'); }}>リセットする</button><button className="text-button" onClick={() => setConfirmReset(false)}>キャンセル</button></div> : <button className="outline-button" onClick={() => setConfirmReset(true)}>初期状態に戻す</button>}<div className="about"><img src="/mark.svg" alt=""/><div><strong>SkillTopo</strong><p>Tauri + React + TypeScript</p></div></div></section>}
    </section><aside className="detail-column" inert={saving} aria-label="選択したスキルの詳細"><section className="panel detail-panel"><div className="panel-heading"><span><CirclePower size={20}/>スキル詳細</span><button onClick={() => setView('catalog')}>カタログで表示 <ArrowRight size={16}/></button></div><div className="detail-body"><div className="skill-title"><h1>{selected.name}</h1><button className={`icon-button pin ${selected.pinned ? 'pinned' : ''}`} aria-label={selected.pinned ? 'ピン留めを解除' : 'ピン留めする'} aria-pressed={selected.pinned} onClick={() => update({ pinned: !selected.pinned })}><Pin size={21} fill={selected.pinned ? 'currentColor' : 'none'}/></button></div><div className="category-tag"><i style={{ background: categoryOf(selected).color }}/>{categoryOf(selected).name}<span className="kind-tag">{kindLabel(selected)}</span></div><p className="description">{selected.description}</p><div className="ratings"><Rating label="習熟度" value={selected.level} onChange={level => update({ level })}/><Rating label="興味度" value={selected.interest} onChange={interest => update({ interest })} green/><div className="last-used"><span>最終使用</span><strong><CalendarDays size={23}/>{selected.lastUsed ? `${selected.lastUsed.slice(0, 4)}年${Number(selected.lastUsed.slice(5))}月` : '未記録'}</strong></div></div>{selected.level !== null && <button className="clear-rating" onClick={() => update({ level: null })}>習熟度を未評価に戻す</button>}<div className="profile-skill-fields"><label>最終使用月<input aria-label="最終使用月" type="month" value={selected.lastUsed} onChange={e => update({ lastUsed: e.target.value })}/></label><label>スキルのメモ<textarea aria-label="スキルのメモ" maxLength={6000} rows={2} placeholder="経験・実績など" value={selected.notes} onChange={e => update({ notes: e.target.value })}/></label></div><h2>関連スキル</h2><div className="related-chips">{selected.related.map((id) => { const s = skills.find(item => item.id === id); return s && <button key={id} style={{ '--chip-color': categoryOf(s).color } as CSSProperties} onClick={() => select(s)}>{s.name}</button>; })}</div></div></section><section className="panel graph-panel"><div className="panel-heading"><span><Share2 size={21}/>隣接スキル</span><button onClick={() => setView('related')}>すべて表示 <ArrowRight size={16}/></button></div><RelatedGraph skill={selected} skills={skills} select={select}/></section></aside></main>
    {saveError && <div className="save-error" role="alert"><span>{saveError}</span><button onClick={clearError}>閉じる</button></div>}
    {notice && <div className="toast" role="status"><Check size={18}/>{notice}<button className="icon-button" aria-label="通知を閉じる" onClick={() => setNotice('')}><X size={16}/></button></div>}
  </div>;
}
