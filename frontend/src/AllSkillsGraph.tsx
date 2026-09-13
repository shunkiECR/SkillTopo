import { useMemo, useState } from 'react';
import { categories, categoryOf, matchesQuery, type Skill } from './model';

import { relationEdges } from './graph/relations';
export { relationEdges } from './graph/relations';

export default function AllSkillsGraph({
  skills,
  selected,
  select,
  query,
}: {
  skills: Skill[];
  selected: Skill;
  select: (skill: Skill) => void;
  query: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [onlyConnected, setOnlyConnected] = useState(false);
  const edges = useMemo(() => relationEdges(skills), [skills]);
  const neighbors = new Set(edges.filter((e) => e.includes(selected.id)).flat());
  neighbors.add(selected.id);
  // 固定4列のカテゴリ配置。カテゴリ数を増やす場合はSVGのviewBoxも確認する。
  const clusters = categories.map((category, index) => ({
    category,
    x: 210 + (index % 4) * 440,
    y: 200 + Math.floor(index / 4) * 430,
    items: skills.filter((s) => s.category === category.id),
  }));
  const positions = new Map<string, { x: number; y: number }>();
  for (const cluster of clusters)
    cluster.items.forEach((skill, index) => {
      const angle = (2 * Math.PI * index) / cluster.items.length - Math.PI / 2;
      positions.set(skill.id, {
        x: cluster.x + 150 * Math.cos(angle),
        y: cluster.y + 150 * Math.sin(angle),
      });
    });
  const visible = (id: string) => !onlyConnected || neighbors.has(id);
  return (
    <section className="panel page-panel all-skills-panel">
      <small>CONNECTED KNOWLEDGE</small>
      <h1>全体のスキル関係</h1>
      <p>
        {skills.length} 項目・{edges.length}{' '}
        関係。線は登録済みの関連を表します（前提条件や学習順序ではありません）。色はカテゴリ別です。
      </p>
      <div className="all-graph-controls">
        <label>
          拡大率{' '}
          <input
            aria-label="全体グラフの拡大率"
            type="range"
            min="1"
            max="4"
            step="0.25"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          {Math.round(zoom * 100)}%
        </label>
        <button className="outline-button" onClick={() => setZoom(1)}>
          全体表示
        </button>
        <label>
          <input
            type="checkbox"
            checked={onlyConnected}
            onChange={(e) => setOnlyConnected(e.target.checked)}
          />
          選択スキルと関連先のみ
        </label>
      </div>
      <p className="all-graph-hint">
        ノードを選択して詳細を表示。拡大後は縦・横にスクロールできます。検索に一致する項目は明るく表示されます。
      </p>
      <div
        className="all-graph-scroll"
        tabIndex={0}
        role="region"
        aria-label="全スキルの関係グラフ・スクロール領域"
      >
        <svg
          viewBox="0 0 1760 2150"
          style={{ width: `${zoom * 100}%` }}
          aria-label="全スキルの関連ネットワーク"
        >
          {clusters.map(({ category, x, y }) => (
            <g key={category.id}>
              <circle
                cx={x}
                cy={y}
                r="185"
                fill={category.color}
                fillOpacity=".035"
                stroke={category.color}
                strokeOpacity=".2"
              />
              <text x={x} y={y + 200} textAnchor="middle" fill={category.color} fontSize="19">
                {category.name}
              </text>
            </g>
          ))}
          {[false, true].map((highlight) => (
            <g key={String(highlight)}>
              {edges.map(([a, b]) => {
                const active = a === selected.id || b === selected.id;
                if (active !== highlight || !visible(a) || !visible(b)) return null;
                const start = positions.get(a)!;
                const end = positions.get(b)!;
                return (
                  <line
                    key={JSON.stringify([a, b])}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={active ? '#dcc2ff' : '#64839e'}
                    strokeWidth={active ? 3 : 1}
                    opacity={active ? 0.9 : 0.15}
                  />
                );
              })}
            </g>
          ))}
          {skills
            .filter((s) => visible(s.id))
            .map((skill) => {
              const pos = positions.get(skill.id)!;
              const active = selected.id === skill.id;
              const match = matchesQuery(skill, query);
              return (
                <g
                  key={skill.id}
                  className="all-graph-node"
                  role="button"
                  tabIndex={0}
                  aria-label={`${skill.name}の詳細を表示`}
                  aria-pressed={active}
                  opacity={match ? 1 : 0.2}
                  onClick={() => select(skill)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      select(skill);
                    }
                  }}
                >
                  <title>{`${skill.name} — ${categoryOf(skill).name}`}</title>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={active ? 12 : 8}
                    fill={categoryOf(skill).color}
                    stroke={active ? '#fff' : '#0b1928'}
                    strokeWidth="3"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 25}
                    textAnchor="middle"
                    fill={active || neighbors.has(skill.id) ? '#fff' : '#bfd0e2'}
                    fontSize="14"
                    paintOrder="stroke"
                    stroke="#0b1928"
                    strokeWidth="4"
                  >
                    {skill.name.length > 19 ? `${skill.name.slice(0, 18)}…` : skill.name}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>
      <p>
        選択中：{selected.name} · 関連 {neighbors.size - 1} 件
      </p>
    </section>
  );
}
