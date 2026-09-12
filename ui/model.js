export const categories = [
  { id: 'electrical', name: '電気・電子', color: '#e6c344', start: 0, end: 73 },
  { id: 'control', name: '制御', color: '#3496ef', start: 73, end: 137 },
  { id: 'embedded', name: '組み込み', color: '#a071ee', start: 137, end: 223 },
  { id: 'software', name: 'ソフトウェア', color: '#e76c80', start: 223, end: 301 },
  { id: 'mechanical', name: '機械', color: '#4ac49a', start: 301, end: 360 },
];
export const levelColors = ['#e36077', '#e6c344', '#48cb94', '#3399f7', '#a270f1'];
export const levelNames = ['入門', '基礎', '実践', '応用', '熟達'];
export const categoryOf = (skill) => categories.find(c => c.id === skill.category);
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function metrics(skills) {
  const assessed = skills.filter(s => s.level !== null);
  return {
    assessed: Math.round(assessed.length / skills.length * 100) || 0,
    covered: Math.round(skills.filter(s => s.level >= 2).length / skills.length * 100) || 0,
    average: assessed.length ? (assessed.reduce((sum, s) => sum + s.level, 0) / assessed.length).toFixed(1) : '—',
  };
}
export function point(radius, angle) {
  const radians = (angle - 90) * Math.PI / 180;
  return [360 + radius * Math.cos(radians), 360 + radius * Math.sin(radians)];
}
export function sector(inner, outer, start, end) {
  const a = point(outer, start), b = point(outer, end), c = point(inner, end), d = point(inner, start);
  const large = end - start > 180 ? 1 : 0;
  return `M${a} A${outer},${outer} 0 ${large} 1 ${b} L${c} A${inner},${inner} 0 ${large} 0 ${d} Z`;
}
export function validateCatalog(skills) {
  if (!Array.isArray(skills) || !skills.length || skills.length > 500) throw new Error('スキル数は1〜500件にしてください。');
  const ids = new Set();
  for (const s of skills) {
    if (typeof s.id !== 'string' || !s.id || ids.has(s.id)) throw new Error('スキルIDが不正です。');
    ids.add(s.id);
    if (typeof s.name !== 'string' || !s.name.trim() || [...s.name].length > 40 || !categories.some(c => c.id === s.category)) throw new Error('スキル名または分野が不正です。');
    if (!(s.level === null || Number.isInteger(s.level) && s.level >= 0 && s.level <= 4) || !Number.isInteger(s.interest) || s.interest < 0 || s.interest > 4) throw new Error('評価値は0〜4にしてください。');
    if (typeof s.description !== 'string' || typeof s.notes !== 'string' || new TextEncoder().encode(s.description).length > 12000 || new TextEncoder().encode(s.notes).length > 24000 || typeof s.pinned !== 'boolean' || !Array.isArray(s.related)) throw new Error('スキルデータの形式が不正です。');
    if (typeof s.lastUsed !== 'string' || s.lastUsed && !/^\d{4}-(0[1-9]|1[0-2])$/.test(s.lastUsed)) throw new Error('最終使用月が不正です。');
  }
  if (skills.some(s => s.related.some(id => !ids.has(id) || id === s.id))) throw new Error('関連スキルの参照が不正です。');
  return skills.map(({id,name,category,description,level,interest,lastUsed,pinned,related,notes}) => ({id,name,category,description,level,interest,lastUsed,pinned,related,notes}));
}
