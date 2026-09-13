import { type CSSProperties } from 'react';
import { ArrowRight, CalendarDays, CirclePower, Pin, Share2 } from 'lucide-react';
import { categoryOf, kindLabel, type Skill } from '../model';
import { type View } from './Sidebar';
import Rating from './Rating';
import RelatedGraph from './RelatedGraph';

type Props = {
  selected: Skill;
  skills: Skill[];
  saving: boolean;
  select: (skill: Skill) => void;
  update: (patch: Partial<Skill>) => void;
  setView: (view: View) => void;
};

/** 選択スキルの編集欄。部分更新を親に渡し、ここでは保存済み状態を変更しない。 */
export default function SkillDetails({ selected, skills, saving, select, update, setView }: Props) {
  return (
    <aside className="detail-column" inert={saving} aria-label="選択したスキルの詳細">
      <section className="panel detail-panel">
        <div className="panel-heading">
          <span>
            <CirclePower size={20} />
            スキル詳細
          </span>
          <button onClick={() => setView('catalog')}>
            カタログで表示 <ArrowRight size={16} />
          </button>
        </div>
        <div className="detail-body">
          <div className="skill-title">
            <h1>{selected.name}</h1>
            <button
              className={`icon-button pin ${selected.pinned ? 'pinned' : ''}`}
              aria-label={selected.pinned ? 'ピン留めを解除' : 'ピン留めする'}
              aria-pressed={selected.pinned}
              onClick={() => update({ pinned: !selected.pinned })}
            >
              <Pin size={21} fill={selected.pinned ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className="category-tag">
            <i style={{ background: categoryOf(selected).color }} />
            {categoryOf(selected).name}
            <span className="kind-tag">{kindLabel(selected)}</span>
          </div>
          <p className="description">{selected.description}</p>
          <div className="ratings">
            <Rating label="習熟度" value={selected.level} onChange={(level) => update({ level })} />
            <Rating
              label="興味度"
              value={selected.interest}
              onChange={(interest) => update({ interest })}
              green
            />
            <div className="last-used">
              <span>最終使用</span>
              <strong>
                <CalendarDays size={23} />
                {selected.lastUsed
                  ? `${selected.lastUsed.slice(0, 4)}年${Number(selected.lastUsed.slice(5))}月`
                  : '未記録'}
              </strong>
            </div>
          </div>
          {selected.level !== null && (
            <button className="clear-rating" onClick={() => update({ level: null })}>
              習熟度を未評価に戻す
            </button>
          )}
          <div className="profile-skill-fields">
            <label>
              最終使用月
              <input
                aria-label="最終使用月"
                type="month"
                value={selected.lastUsed}
                onChange={(e) => update({ lastUsed: e.target.value })}
              />
            </label>
            <label>
              スキルのメモ
              <textarea
                aria-label="スキルのメモ"
                maxLength={6000}
                rows={2}
                placeholder="経験・実績など"
                value={selected.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </label>
          </div>
          <h2>関連スキル</h2>
          <div className="related-chips">
            {selected.related.map((id) => {
              const s = skills.find((item) => item.id === id);
              return (
                s && (
                  <button
                    key={id}
                    style={{ '--chip-color': categoryOf(s).color } as CSSProperties}
                    onClick={() => select(s)}
                  >
                    {s.name}
                  </button>
                )
              );
            })}
          </div>
        </div>
      </section>
      <section className="panel graph-panel">
        <div className="panel-heading">
          <span>
            <Share2 size={21} />
            隣接スキル
          </span>
          <button onClick={() => setView('related')}>
            すべて表示 <ArrowRight size={16} />
          </button>
        </div>
        <RelatedGraph skill={selected} skills={skills} select={select} />
      </section>
    </aside>
  );
}
