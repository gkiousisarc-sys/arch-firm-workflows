const NAV = [
  {
    id: 'dashboard', label: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round"/>
      <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round"/>
      <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round"/>
      <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round"/>
    </svg>,
  },
  {
    id: 'project', label: 'Project Setup',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V9l9-6 9 6v12M9 21V15h6v6M9 9h.01M15 9h.01M12 9h.01" />
    </svg>,
  },
  {
    id: 'subcontractors', label: 'Subcontractors',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19a3 3 0 11-6 0m6 0H9m6 0h3a1 1 0 001-1v-1a5 5 0 00-3.9-4.9M9 19H6a1 1 0 01-1-1v-1a5 5 0 013.9-4.9M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>,
  },
  {
    id: 'gantt', label: 'Gantt by Sub',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path strokeLinecap="round" d="M4 6h6M4 10h10M4 14h7M4 18h4"/>
      <rect x="10" y="5" width="5" height="2" rx="1" fill="currentColor" stroke="none"/>
      <rect x="14" y="9" width="5" height="2" rx="1" fill="currentColor" stroke="none"/>
      <rect x="11" y="13" width="5" height="2" rx="1" fill="currentColor" stroke="none"/>
      <rect x="8" y="17" width="6" height="2" rx="1" fill="currentColor" stroke="none"/>
    </svg>,
  },
  {
    id: 'ganttbyspace', label: 'Gantt by Zone',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18"/>
      <rect x="5" y="4.5" width="4" height="3" rx="0.5" fill="currentColor" stroke="none" opacity="0.7"/>
      <rect x="11" y="10.5" width="7" height="3" rx="0.5" fill="currentColor" stroke="none" opacity="0.7"/>
      <rect x="6" y="16.5" width="5" height="3" rx="0.5" fill="currentColor" stroke="none" opacity="0.7"/>
    </svg>,
  },
  {
    id: 'orders', label: 'Orders & Suppliers',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8 4m0 0L4 7"/>
    </svg>,
  },
];

export default function Sidebar({ active, onNavigate, projectName }) {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-700">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-500">
              <path d="M6 21V8.5L12 5l6 3.5V21h-5v-5h-4v5H6z"/>
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-amber-500 tracking-widest leading-none">CONSTRUCTION</div>
            <div className="text-xs text-slate-500 tracking-wide leading-tight mt-0.5">Management</div>
          </div>
        </div>

        {projectName ? (
          <div className="bg-slate-800 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Active Project</div>
            <div className="text-sm font-medium text-slate-200 truncate">{projectName}</div>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 border border-dashed border-slate-700">
            <div className="text-xs text-slate-500">No project configured</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
              active === item.id
                ? 'bg-amber-500/15 text-amber-400 border-l-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-l-2 border-transparent'
            }`}
          >
            <span className={active === item.id ? 'text-amber-400' : 'text-slate-500'}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-700">
        <div className="text-xs text-slate-600">Phase 2 · Athens</div>
      </div>
    </aside>
  );
}
