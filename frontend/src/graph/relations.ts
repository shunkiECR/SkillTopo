import { type Skill } from '../model';

/** A→B と B→A を同じ無向の線として扱う。プロフィール内の関連配列自体は変更しない。 */
export function relationEdges(skills: Skill[]) {
  const ids = new Set(skills.map((s) => s.id));
  const edges = new Map<string, [string, string]>();
  for (const skill of skills)
    for (const id of skill.related) {
      if (id === skill.id || !ids.has(id)) continue;
      const pair = [skill.id, id].sort() as [string, string];
      edges.set(JSON.stringify(pair), pair);
    }
  return [...edges.values()];
}
