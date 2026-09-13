import { ChartPie, ChartNoAxesColumnIncreasing, Users, ChevronRight } from 'lucide-react';
import { type Skill } from '../model';

type Props = { skills: Skill[]; onOpenDashboard: () => void };

/** 評価済みにはレベル0も含む。カバー率だけはレベル2以上を数える。 */
export default function Metrics({ skills, onOpenDashboard }: Props) {
  const assessed = skills.filter((s) => s.level !== null);
  const metrics = [
    {
      label: '評価率',
      value: `${Math.round((assessed.length / skills.length) * 100)}%`,
      icon: ChartPie,
      className: 'blue',
    },
    {
      label: 'カバー率',
      value: `${Math.round((skills.filter((s) => s.level !== null && s.level >= 2).length / skills.length) * 100)}%`,
      icon: ChartNoAxesColumnIncreasing,
      className: 'green',
    },
    {
      label: '平均習熟度',
      value: assessed.length
        ? (assessed.reduce((a, s) => a + s.level!, 0) / assessed.length).toFixed(1)
        : '—',
      icon: Users,
      className: 'blue',
    },
  ];

  return (
    <div className="metrics">
      {metrics.map(({ label, value, icon: Icon, className }) => (
        <button className="metric panel" key={label} onClick={onOpenDashboard}>
          <Icon size={39} className={className} />
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
          <ChevronRight size={19} />
        </button>
      ))}
    </div>
  );
}
