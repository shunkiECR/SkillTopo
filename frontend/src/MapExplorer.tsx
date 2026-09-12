import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { categories, categoryGroups, categoryOf, colorOf, matchesQuery, point, sector, type Skill } from './model';

const overviewLimit = 4;
const pageSize = 16;
const shortLines = (name: string, limit = 10) => {
  const lines = [''];
  let width = 0;
  for (const char of name) {
    const size = /[\x00-\x7f]/.test(char) ? 1 : 2;
    if (width + size > limit) {
      if (lines.length === 2) { lines[1] += '…'; break; }
      lines.push(''); width = 0;
    }
    lines[lines.length - 1] += char; width += size;
  }
  return lines;
};

export default function MapExplorer({ skills, selected, select, query, levelFilter }: {
  skills: Skill[]; selected: Skill; select: (s: Skill) => void; query: string; levelFilter: number | null | undefined;
}) {
  const [group, setGroup] = useState('engineering');
  const [focused, setFocused] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => {
    const category = categoryOf(selected);
    setGroup(category.group);
    const index = skills.filter(s => s.category === selected.category).findIndex(s => s.id === selected.id);
    setFocused(previous => previous || index >= overviewLimit ? category.id : '');
    setPage(Math.floor(index / pageSize));
  }, [selected.id, selected.category]);
  const groupCategories = categories.filter(c => c.group === group);
  const shownCategories = focused ? categories.filter(c => c.id === focused) : groupCategories;
  const focusedSkills = skills.filter(s => s.category === focused);
  const pages = Math.max(1, Math.ceil(focusedSkills.length / pageSize));
  const categorySlots = shownCategories.map(cat => {
    const count = skills.filter(s => s.category === cat.id).length;
    return Math.min(count, overviewLimit) + (count > overviewLimit ? 1 : 0);
  });
  const totalSlots = categorySlots.reduce((sum, count) => sum + count, 0);
  const openCategory = (id: string) => { setFocused(id); setPage(0); };
  return <section className="map-explorer" aria-label="スキルマップのカテゴリ選択">
    <div className="map-groups" role="group" aria-label="分野グループ">{categoryGroups.map(item => <button key={item.id} aria-pressed={group === item.id} className={group === item.id ? 'active' : ''} onClick={() => { setGroup(item.id); setFocused(''); setPage(0); }}>{item.name}</button>)}</div>
    <div className="map-toolbar">
      <label>カテゴリ <select aria-label="マップのカテゴリ" value={focused} onChange={e => openCategory(e.target.value)}><option value="">グループ全体</option>{groupCategories.map(c => <option key={c.id} value={c.id}>{c.name}（{skills.filter(s => s.category === c.id).length}）</option>)}</select></label>
      {focused ? <><button className="text-button" onClick={() => openCategory('')}><ArrowLeft size={14}/>全体へ</button><div className="map-pagination"><button aria-label="前のスキル" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={18}/></button><span>{page + 1} / {pages}</span><button aria-label="次のスキル" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={18}/></button></div></> : <small>分野を選ぶと全項目を表示</small>}
    </div>
    <div className="map-container"><svg className="skill-map" viewBox="0 0 720 720" aria-label="分野別スキルマップ">
      <defs><radialGradient id="surface"><stop stopColor="#fff" stopOpacity=".04"/><stop offset="1" stopColor="#fff" stopOpacity=".23"/></radialGradient><filter id="glow" x="-70%" y="-30%" width="240%" height="160%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {shownCategories.map((cat, catIndex) => {
        const all = skills.filter(s => s.category === cat.id);
        const visible = focused ? all.slice(page * pageSize, (page + 1) * pageSize) : all.slice(0, overviewLimit);
        const remainder = !focused ? all.length - visible.length : 0;
        const slots = visible.length + (remainder > 0 ? 1 : 0);
        const startAngle = 360 * categorySlots.slice(0, catIndex).reduce((sum, count) => sum + count, 0) / totalSlots;
        const endAngle = startAngle + 360 * categorySlots[catIndex] / totalSlots;
        const categoryLines = shortLines(cat.shortName, focused ? 24 : 12);
        const [cx, cy] = point(169, (startAngle + endAngle) / 2);
        return <g key={cat.id}>
          <g className="map-category" role="button" tabIndex={0} aria-label={`${cat.name}の${all.length}項目を表示`} onClick={() => openCategory(cat.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCategory(cat.id); } }}>
            <path d={sector(112, 226, startAngle + .5, endAngle - .5)} fill={cat.color} fillOpacity=".69" stroke={cat.color} strokeWidth="1.5"/><path d={sector(112, 226, startAngle + .5, endAngle - .5)} fill="url(#surface)"/>
            <text className="category-label" x={cx} y={cy - (categoryLines.length - 1) * 12}>{categoryLines.map((line, i) => <tspan key={i} x={cx} dy={i ? 25 : 0}>{line}</tspan>)}</text>
          </g>
          {visible.map((skill, index) => {
            const start = startAngle + (endAngle - startAngle) * index / slots + .16;
            const end = startAngle + (endAngle - startAngle) * (index + 1) / slots - .16;
            const [x, y] = point(284, (start + end) / 2);
            const active = selected.id === skill.id;
            const dim = !matchesQuery(skill, query) || (levelFilter !== undefined && skill.level !== levelFilter);
            const displayName = skill.name.replace(/^Adobe /, '').replace(/^Microsoft /, '').replace(/^Google /, '').replace('CLIP STUDIO PAINT', 'CLIP STUDIO');
            const lines = shortLines(displayName, focused ? 20 : 12);
            return <g key={skill.id} className={`map-skill ${active ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`${skill.name}、${skill.level === null ? '未評価' : `レベル${skill.level}`}`} aria-pressed={active} style={{ opacity: dim ? .2 : 1 }} onClick={() => select(skill)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(skill); } }}>
              <title>{`${skill.name} — ${skill.level === null ? '未評価' : `習熟度 ${skill.level} / 4`}`}</title>
              <path d={sector(231, active ? 346 : 343, start, end)} fill={active ? '#4554d4' : colorOf(skill)} fillOpacity={active ? .96 : .7} stroke={active ? '#d7d8ff' : colorOf(skill)} strokeWidth={active ? 2.3 : 1.3} filter={active ? 'url(#glow)' : undefined}/><path d={sector(231, active ? 346 : 343, start, end)} fill="url(#surface)"/>
              <text x={x} y={y - (lines.length - 1) * 8} fill={skill.level === 1 || skill.level === 2 ? '#08251f' : '#f6f5ff'} style={{ fontSize: 14 }}>{lines.map((line, i) => <tspan key={i} x={x} dy={i ? 16 : 0}>{line}</tspan>)}</text>
            </g>;
          })}
          {remainder > 0 && <g role="button" tabIndex={0} className="map-skill" aria-label={`${cat.name}の残り${remainder}項目を表示`} onClick={() => openCategory(cat.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCategory(cat.id); } }}><path d={sector(231, 343, startAngle + (endAngle - startAngle) * visible.length / slots + .16, endAngle - .16)} fill="#203b55" stroke={cat.color}/><text x={point(284, endAngle - (endAngle - startAngle) / slots / 2)[0]} y={point(284, endAngle - (endAngle - startAngle) / slots / 2)[1]} fill="#cce5ff">他 {remainder} 件 →</text></g>}
        </g>;
      })}
      <circle cx="360" cy="360" r="106" fill="#0b1928" stroke="#274665"/>
      {Array.from({ length: 7 }, (_, i) => <path key={i} d="M360 273 C384 260 379 309 418 311 S407 357 447 382 391 412 369 447 342 391 295 409 327 369 278 352 326 326 332 299Z" fill="none" stroke="#174167" strokeWidth=".8" transform={`translate(360 360) scale(${1 - i * .115}) translate(-360 -360)`}/>)}
      <text x="360" y="346" className="center-title">SkillTopo</text><text x="360" y="376" className="center-caption">{focused ? `${focusedSkills.length} スキル・ツール` : categoryGroups.find(g => g.id === group)?.name}</text><text x="360" y="398" className="center-caption">スキルで広がる可能性</text>
    </svg></div>
  </section>;
}
