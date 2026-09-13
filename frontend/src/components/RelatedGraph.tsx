import { shortLines } from '../graph/labels';
import { relationColor, type Skill } from '../model';

function GraphLabel({
  name,
  x,
  y,
  main = false,
}: {
  name: string;
  x: number;
  y: number;
  main?: boolean;
}) {
  const displayName = name
    .replace(/^Adobe /, '')
    .replace(/^Microsoft /, '')
    .replace(/^Google /, '');
  const lines = shortLines(displayName, 16);
  return (
    <text
      x={x}
      y={y - (lines.length - 1) * 8}
      className={main ? 'node-title' : ''}
      style={{ fontSize: 13 }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i ? 16 : 0}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/** 出方向の関連だけを登録順に最大4件表示する。全体グラフの無向エッジとは異なる。 */
export default function RelatedGraph({
  skill,
  skills,
  select,
}: {
  skill: Skill;
  skills: Skill[];
  select: (s: Skill) => void;
}) {
  const related = skill.related
    .map((id) => skills.find((s) => s.id === id))
    .filter((s): s is Skill => !!s)
    .slice(0, 4);
  const spots = [
    [250, 47],
    [74, 145],
    [426, 145],
    [250, 247],
  ];
  return (
    <svg className="related-graph" viewBox="0 0 500 300" aria-label={`${skill.name}の関連スキル`}>
      <defs>
        <radialGradient id="node-fill">
          <stop stopColor="#482b9c" />
          <stop offset="1" stopColor="#27205a" />
        </radialGradient>
      </defs>
      {related.map((s, i) => {
        const [x, y] = spots[i];
        return (
          <g key={s.id}>
            <path d={`M250 145 L${x} ${y}`} stroke="#ba90f5" strokeWidth="1.5" />
            <circle
              cx={i === 1 ? 177 : i === 2 ? 323 : 250}
              cy={i === 0 ? 109 : i === 3 ? 181 : 145}
              r="3.5"
              fill="#b48bfa"
            />
            <g
              role="button"
              tabIndex={0}
              aria-label={`${s.name}の詳細を表示`}
              className="graph-node"
              onClick={() => select(s)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  select(s);
                }
              }}
            >
              <rect
                x={x - 61}
                y={y - 23}
                width="122"
                height="46"
                rx="23"
                fill={relationColor(s)}
                fillOpacity=".15"
                stroke={relationColor(s)}
                strokeWidth="1.5"
              />
              <GraphLabel name={s.name} x={x} y={y + 1} />
            </g>
          </g>
        );
      })}
      <rect
        x="182"
        y="117"
        width="136"
        height="56"
        rx="28"
        fill="url(#node-fill)"
        stroke="#a87aff"
        strokeWidth="1.8"
        className="central-node"
      />
      <GraphLabel name={skill.name} x={250} y={146} main />
      {!related.length && (
        <text x="250" y="240">
          関連スキルはありません
        </text>
      )}
    </svg>
  );
}
