import catalog from './catalog.json';
import categoryDefinitions from './categories.json';
import profileItems from './profile-items.json';

export type Skill = {
  id: string; name: string; category: string; description: string;
  level: number | null; interest: number; lastUsed: string;
  pinned: boolean; related: string[]; notes: string;
};
export const seed: Skill[] = [...catalog, ...profileItems.map(([id, name, category, , , description, related]) => ({
  id, name, category, description, related: related.split('|'), level: null, interest: 0,
  lastUsed: '', pinned: false, notes: '',
}))];
export const categories = categoryDefinitions;
export const categoryGroups = [
  { id: 'engineering', name: 'エンジニアリング' },
  { id: 'web', name: 'Web・AI' },
  { id: 'creative', name: 'クリエイティブ' },
  { id: 'business', name: '集客・業務' },
  { id: 'specialty', name: '専門・サポート' },
];
const profileMetadata = new Map(profileItems.map(row => [row[0], { kind: row[3], aliases: row[4] }]));
export const kindOf = (s: Skill) => profileMetadata.get(s.id)?.kind ?? ({ python: 'language', c: 'language', cpp: 'language', rust: 'language', freertos: 'tool', zephyr: 'tool', esp32: 'tool', plc: 'tool' }[s.id] ?? 'skill');
export const kindLabel = (s: Skill) => ({ skill: 'スキル', tool: 'ツール', language: '言語' }[kindOf(s)] ?? 'スキル');
export function matchesQuery(s: Skill, query: string) {
  const text = `${s.name} ${categoryOf(s).name} ${profileMetadata.get(s.id)?.aliases ?? ''}`.normalize('NFKC').toLowerCase();
  return query.normalize('NFKC').toLowerCase().trim().split(/\s+/).every(word => text.includes(word));
}
export const colors = ['#ed617a', '#e9c643', '#45d393', '#339bfa', '#a16afa'];
export const colorOf = (s: Skill) => s.level === null ? '#858b97' : colors[s.level];
export const relationColor = (s: Skill) => ({ c: colors[0], concurrency: colors[1], esp32: colors[3], zephyr: colors[4] }[s.id] ?? categoryOf(s).color);
export const categoryOf = (s: Skill) => categories.find(c => c.id === s.category)!;
export function point(r: number, angle: number): [number, number] {
  const a = (angle - 90) * Math.PI / 180;
  return [360 + r * Math.cos(a), 360 + r * Math.sin(a)];
}
export function sector(inner: number, outer: number, start: number, end: number) {
  const large = end - start > 180 ? 1 : 0;
  return `M${point(outer, start)} A${outer},${outer} 0 ${large} 1 ${point(outer, end)} L${point(inner, end)} A${inner},${inner} 0 ${large} 0 ${point(inner, start)} Z`;
}
export const storageKey = 'skilltopo-react-sample-v1';
export function loadSkills(): Skill[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (!Array.isArray(saved)) return structuredClone(seed);
    return seed.map(s => {
      const row = saved.find(v => v && v.id === s.id);
      if (!row) return { ...s };
      return { ...s,
        level: row.level === null || (Number.isInteger(row.level) && row.level >= 0 && row.level <= 4) ? row.level : s.level,
        interest: Number.isInteger(row.interest) && row.interest >= 0 && row.interest <= 4 ? row.interest : s.interest,
        pinned: typeof row.pinned === 'boolean' ? row.pinned : s.pinned,
        notes: typeof row.notes === 'string' ? row.notes : s.notes,
        lastUsed: typeof row.lastUsed === 'string' ? row.lastUsed : s.lastUsed,
      };
    });
  } catch { return structuredClone(seed); }
}
