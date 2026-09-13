import { BookOpen, House, Network, Settings, Share2 } from 'lucide-react';

export type View = 'graph' | 'dashboard' | 'map' | 'related' | 'catalog' | 'settings';
const navigation = [
  { id: 'dashboard', name: 'ダッシュボード', icon: House },
  { id: 'map', name: 'スキルマップ', icon: Network },
  { id: 'graph', name: '全体グラフ', icon: Share2 },
  { id: 'related', name: '隣接スキル', icon: Share2 },
  { id: 'catalog', name: 'カタログ編集', icon: BookOpen },
  { id: 'settings', name: '設定', icon: Settings },
] as const;
function Contours({ className = '' }: { className?: string }) {
  return (
    <svg className={`contours ${className}`} viewBox="0 0 300 300" aria-hidden="true">
      {Array.from({ length: 11 }, (_, i) => (
        <path
          key={i}
          d={`M-20 ${65 + i * 19} C70 ${-35 + i * 20} 64 ${140 + i * 11} 137 ${82 + i * 16} S218 ${105 + i * 17} 227 ${145 + i * 18} S290 ${195 + i * 10} 330 ${140 + i * 17}`}
        />
      ))}
    </svg>
  );
}

/** ナビゲーション定義とサイドバー。画面の選択状態は App が保持する。 */
export default function Sidebar({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <aside className="sidebar">
      <nav aria-label="メインナビゲーション">
        {navigation.map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            className={view === id ? 'active' : ''}
            aria-current={view === id ? 'page' : undefined}
            onClick={() => setView(id)}
          >
            <Icon size={27} strokeWidth={1.6} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      <Contours />
      <div className="sidebar-footer">
        <span>
          SkillTopo
          <br />
          v1.0.0 (Phase 1)
        </span>
        <span>
          技術のつながりから
          <br />
          次の一歩を
        </span>
      </div>
    </aside>
  );
}
