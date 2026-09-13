import { ArrowRight, Network, Pin } from 'lucide-react';
import { categories, type Skill } from '../model';
import { type View } from './Sidebar';

type Props = { skills: Skill[]; select: (skill: Skill) => void; setView: (view: View) => void };

/** dashboard 画面。プロフィールの変更と画面間の選択は親へ通知する。 */
export default function Dashboard({ skills, select, setView }: Props) {
  return (
    <section className="panel page-panel">
      <div className="page-heading">
        <div>
          <small>YOUR SKILL LANDSCAPE</small>
          <h1>スキルの現在地</h1>
        </div>
        <Network className="blue" />
      </div>
      <p>分野ごとの評価状況から、次の一歩を見つけましょう。</p>
      {categories.map((c) => {
        const items = skills.filter((s) => s.category === c.id);
        const count = items.filter((s) => s.level !== null).length;
        return (
          <div className="category-progress" key={c.id}>
            <div>
              <span>{c.name}</span>
              <span>
                {count} / {items.length} スキルを評価
              </span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${(count / items.length) * 100}%`, background: c.color }} />
            </div>
          </div>
        );
      })}
      <h2>ピン留めしたスキル</h2>
      <div className="pinned-list">
        {skills
          .filter((s) => s.pinned)
          .map((s) => (
            <button
              key={s.id}
              onClick={() => {
                select(s);
                setView('map');
              }}
            >
              <Pin size={16} />
              {s.name}
              <ArrowRight size={16} />
            </button>
          ))}
        {!skills.some((s) => s.pinned) && <p>詳細パネルのピンから追加できます。</p>}
      </div>
    </section>
  );
}
