import { ChevronRight } from 'lucide-react';
import { categoryOf, type Skill } from '../model';
import RelatedGraph from './RelatedGraph';

type Props = { selected: Skill; skills: Skill[]; select: (skill: Skill) => void };

/** related 画面。プロフィールの変更と画面間の選択は親へ通知する。 */
export default function RelatedSkills({ selected, skills, select }: Props) {
  return (
    <section className="panel page-panel">
      <small>CONNECTED KNOWLEDGE</small>
      <h1>隣接スキルを探索</h1>
      <p>ノードを選択すると、そのスキルにつながる知識を表示します。</p>
      <RelatedGraph skill={selected} skills={skills} select={select} />
      <h2>{selected.name} から広がるスキル</h2>
      <div className="related-list">
        {selected.related
          .map((id) => skills.find((s) => s.id === id))
          .filter((s): s is Skill => !!s)
          .map((s) => (
            <button key={s.id} onClick={() => select(s)}>
              <i style={{ background: categoryOf(s).color }} />
              <div>
                <strong>{s.name}</strong>
                <p>{s.description}</p>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
      </div>
    </section>
  );
}
