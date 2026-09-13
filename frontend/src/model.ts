import catalog from './catalog.json';
import categoryDefinitions from './categories.json';
import profileItems from './profile-items.json';

/** プロフィールに保存するスキル。種類・検索別名はIDに紐づく補助情報なので含めない。 */
export type Skill = {
  id: string;
  name: string;
  category: string;
  description: string;
  // null（未評価）と0（評価済み）を混同しない。
  level: number | null;
  interest: number;
  lastUsed: string;
  pinned: boolean;
  related: string[];
  notes: string;
};
// 追加データは [id, name, category, kind, aliases, description, related] の7列。
// この並びを変更する場合はRustの catalog.rs も更新する。
export const seed: Skill[] = [
  ...catalog,
  ...profileItems.map(([id, name, category, , , description, related]) => ({
    id,
    name,
    category,
    description,
    related: related.split('|'),
    level: null,
    interest: 0,
    lastUsed: '',
    pinned: false,
    notes: '',
  })),
];
export const categories = categoryDefinitions;
export const categoryGroups = [
  { id: 'engineering', name: 'エンジニアリング' },
  { id: 'web', name: 'Web・AI' },
  { id: 'creative', name: 'クリエイティブ' },
  { id: 'business', name: '集客・業務' },
  { id: 'specialty', name: '専門・サポート' },
];
const profileMetadata = new Map(
  profileItems.map((row) => [row[0], { kind: row[3], aliases: row[4] }]),
);
export const kindOf = (s: Skill) =>
  profileMetadata.get(s.id)?.kind ??
  {
    python: 'language',
    c: 'language',
    cpp: 'language',
    rust: 'language',
    freertos: 'tool',
    zephyr: 'tool',
    esp32: 'tool',
    plc: 'tool',
  }[s.id] ??
  'skill';
export const kindLabel = (s: Skill) =>
  ({ skill: 'スキル', tool: 'ツール', language: '言語' })[kindOf(s)] ?? 'スキル';
/** 全角英数などをNFKCで揃え、空白で分けた全語をAND検索する。メモ・説明は対象外。 */
export function matchesQuery(s: Skill, query: string) {
  const text = `${s.name} ${categoryOf(s).name} ${profileMetadata.get(s.id)?.aliases ?? ''}`
    .normalize('NFKC')
    .toLowerCase();
  return query
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .every((word) => text.includes(word));
}
export const colors = ['#ed617a', '#e9c643', '#45d393', '#339bfa', '#a16afa'];
export const colorOf = (s: Skill) => (s.level === null ? '#858b97' : colors[s.level]);
export const relationColor = (s: Skill) =>
  ({ c: colors[0], concurrency: colors[1], esp32: colors[3], zephyr: colors[4] })[s.id] ??
  categoryOf(s).color;
export const categoryOf = (s: Skill) => categories.find((c) => c.id === s.category)!;
// 既存の呼び出し元との互換export。描画計算の実装は graph/ に集約する。
export { point, sector } from './graph/geometry';
export const storageKey = 'skilltopo-react-sample-v1';
/** 旧ブラウザ版との互換用。現在の useCatalog からは呼ばれない。 */
export function loadSkills(): Skill[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (!Array.isArray(saved)) return structuredClone(seed);
    return seed.map((s) => {
      const row = saved.find((v) => v && v.id === s.id);
      if (!row) return { ...s };
      return {
        ...s,
        level:
          row.level === null || (Number.isInteger(row.level) && row.level >= 0 && row.level <= 4)
            ? row.level
            : s.level,
        interest:
          Number.isInteger(row.interest) && row.interest >= 0 && row.interest <= 4
            ? row.interest
            : s.interest,
        pinned: typeof row.pinned === 'boolean' ? row.pinned : s.pinned,
        notes: typeof row.notes === 'string' ? row.notes : s.notes,
        lastUsed: typeof row.lastUsed === 'string' ? row.lastUsed : s.lastUsed,
      };
    });
  } catch {
    return structuredClone(seed);
  }
}
