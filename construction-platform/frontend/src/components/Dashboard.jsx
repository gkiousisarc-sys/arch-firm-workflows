import { useState, useEffect, useCallback } from 'react';
import { getSubcontractors, getProject, getPhases, getOrders, getHolidays, getPendingTasks, setPhaseTask, getOrderPendingTasks, setOrderTask } from '../api';

const STATUS_COLOR = { not_started:'#475569', in_progress:'#0284c7', complete:'#059669', delayed:'#dc2626' };
const STATUS_BG    = { not_started:'bg-slate-500/20 text-slate-400', in_progress:'bg-sky-500/20 text-sky-400', complete:'bg-emerald-500/20 text-emerald-400', delayed:'bg-red-500/20 text-red-400' };
const TRADE_COLORS = {
  'Concrete & Formwork':'#d97706','Steel Reinforcement':'#9ca3af','Masonry':'#92400e',
  'Plumbing':'#0284c7','Electrical':'#ca8a04','Plastering':'#64748b',
  'Tiling':'#7c3aed','Carpentry':'#78350f','Aluminum Works':'#475569',
  'Marble & Stone':'#8b5cf6','Waterproofing':'#1e40af','Elevator':'#047857',
  'Painting':'#dc2626','Insulation':'#ea580c','Other':'#4b5563',
};

function todayStr() { return new Date().toISOString().slice(0,10); }
function addDays(n) { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }

function computeStatus(phase) {
  if (phase.progress >= 100) return 'complete';
  const today = todayStr();
  if (phase.planned_end && today > phase.planned_end) return 'delayed';
  if (phase.progress > 0 || phase.status === 'in_progress') return 'in_progress';
  return 'not_started';
}

function dateOverlap(s1, e1, s2, e2) {
  if (!s1||!e1||!s2||!e2) return false;
  return s1 <= e2 && s2 <= e1;
}

// ── KPI card ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color='text-amber-400' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-bold ${color} leading-none`}>{value}</div>
      {sub&&<div className="text-xs text-slate-500 mt-2">{sub}</div>}
    </div>
  );
}

// ── Red flag item ─────────────────────────────────────────────────────────
function RedFlag({ icon, title, detail }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-800 last:border-0">
      <span className="text-red-400 flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <div className="text-sm text-slate-200">{title}</div>
        {detail&&<div className="text-xs text-slate-500 mt-0.5">{detail}</div>}
      </div>
    </div>
  );
}

const IconAlert = <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z"/></svg>;
const IconTruck = <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M1 3.5A1.5 1.5 0 012.5 2h8A1.5 1.5 0 0112 3.5v.5h1.5a.5.5 0 01.4.2l1.5 2a.5.5 0 01.1.3V10a.5.5 0 01-.5.5H14a2 2 0 01-4 0H6a2 2 0 01-4 0H1.5A.5.5 0 011 10V3.5zM4 11a1 1 0 102 0 1 1 0 00-2 0zm7 0a1 1 0 102 0 1 1 0 00-2 0z"/></svg>;
const IconPeople = <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M2 5a3 3 0 116 0 3 3 0 01-6 0zm7 0a2 2 0 114 0 2 2 0 01-4 0zm-7 7c0-2.21 1.343-4 3-4h2c1.657 0 3 1.79 3 4v.5H2V12zm8.5-.5c0-1.43.675-2.7 1.698-3.484A5.03 5.03 0 0116 12v.5h-3.5V11.5z"/></svg>;
const IconClock = <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 3.75a.75.75 0 00-1.5 0V8c0 .199.079.39.22.53l2.5 2.5a.75.75 0 101.06-1.06L8.75 7.689V4.75z"/></svg>;

// ── Task label maps ───────────────────────────────────────────────────────
const PHASE_TASK_LABELS = {
  blueprint:      'Blueprint',
  approval:       'Approval',
  order_delivery: 'Order / Delivery',
  deal:           'Deal',
  contract:       'Contract',
};
const ORDER_TASK_LABELS = {
  order:     'Order',
  resources: 'Resources',
  payment:   'Payment',
  delivery:  'Delivery',
};

function TaskDashboard({ pendingTasks, pendingOrderTasks, onTaskDone }) {
  const today = todayStr();
  const in7   = addDays(7);
  const in21  = addDays(21);

  // Normalise both task streams to a common shape with source + due_date
  const allTasks = [
    ...(pendingTasks || []).map(t => ({ ...t, source:'phase', due_date: t.planned_start })),
    ...(pendingOrderTasks || []).map(t => ({ ...t, source:'order', due_date: t.confirmed_delivery })),
  ].filter(t => t.due_date);

  const urgent   = allTasks.filter(t => t.due_date >= today && t.due_date <= in7).sort((a,b) => a.due_date.localeCompare(b.due_date));
  const upcoming = allTasks.filter(t => t.due_date > in7   && t.due_date <= in21).sort((a,b) => a.due_date.localeCompare(b.due_date));

  if (urgent.length === 0 && upcoming.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Task Checklist</h2>
        <p className="text-xs text-slate-600">No pending tasks due within the next 21 days.</p>
      </div>
    );
  }

  async function markDone(task) {
    if (task.source === 'phase') await setPhaseTask(task.phase_id, task.task_type, true);
    else                         await setOrderTask(task.order_id, task.task_type, true);
    onTaskDone();
  }

  function TaskRow({ task, band }) {
    const isUrgent  = band === 'urgent';
    const isPhase   = task.source === 'phase';
    const taskLabel = isPhase ? (PHASE_TASK_LABELS[task.task_type] || task.task_type) : (ORDER_TASK_LABELS[task.task_type] || task.task_type);
    const title     = isPhase ? task.phase_name : task.material;
    const sub       = isPhase
      ? `${task.sub_name}${task.zones ? ` · ${task.zones}` : ''}`
      : (task.supplier_name || '');

    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${isUrgent ? 'bg-red-950/40 border border-red-900/30' : 'bg-amber-950/30 border border-amber-900/20'}`}>
        <button
          onClick={() => markDone(task)}
          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isUrgent ? 'border-red-600/60 hover:bg-red-600/20' : 'border-amber-600/60 hover:bg-amber-600/20'} bg-transparent`}
          title="Mark done"
        >
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 opacity-30 hover:opacity-70"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span className={`text-xs font-semibold w-24 flex-shrink-0 ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}>{taskLabel}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${isPhase ? 'bg-sky-500/15 text-sky-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
          {isPhase ? 'Phase' : 'Supplier'}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-slate-200 truncate block">{title}</span>
          {sub && <span className="text-xs text-slate-500 truncate block">{sub}</span>}
        </div>
        <span className={`text-xs tabular-nums flex-shrink-0 font-medium ${isUrgent ? 'text-red-400' : 'text-amber-500'}`}>{task.due_date.slice(5)}</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold text-slate-300">Task Checklist</h2>
        {urgent.length > 0 && <span className="bg-red-500/20 text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full">{urgent.length} urgent</span>}
        {upcoming.length > 0 && <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full">{upcoming.length} upcoming</span>}
        <span className="text-xs text-slate-600 ml-auto">Due within 21 days · click checkbox to complete</span>
      </div>

      <div className="space-y-4">
        {urgent.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">Urgent</span>
              <span className="text-xs text-slate-600">— due within 7 days</span>
            </div>
            <div className="space-y-1.5">
              {urgent.map((t, i) => <TaskRow key={`u-${i}`} task={t} band="urgent"/>)}
            </div>
          </div>
        )}
        {upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Upcoming</span>
              <span className="text-xs text-slate-600">— due in 8–21 days</span>
            </div>
            <div className="space-y-1.5">
              {upcoming.map((t, i) => <TaskRow key={`up-${i}`} task={t} band="upcoming"/>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [subs, setSubs]               = useState([]);
  const [project, setProject]         = useState(null);
  const [phases, setPhases]           = useState([]);
  const [orders, setOrders]           = useState([]);
  const [pendingTasks, setPendingTasks]           = useState([]);
  const [orderPendingTasks, setOrderPendingTasks] = useState([]);
  const [loading, setLoading]                     = useState(true);

  const loadPending = useCallback(() =>
    Promise.all([getPendingTasks(), getOrderPendingTasks()])
      .then(([pt, opt]) => { setPendingTasks(pt); setOrderPendingTasks(opt); })
  , []);

  useEffect(() => {
    Promise.all([getSubcontractors(), getProject(), getPhases(), getOrders(), getPendingTasks(), getOrderPendingTasks()])
      .then(([s, p, ph, o, pt, opt]) => { setSubs(s); setProject(p); setPhases(ph); setOrders(o); setPendingTasks(pt); setOrderPendingTasks(opt); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading…</div>;

  const today   = todayStr();
  const in7days = addDays(7);

  // ── Compute stats ─────────────────────────────────────────────────────
  const activeSubs = subs.filter(s => s.planned_start && s.planned_end && s.planned_start <= today && s.planned_end >= today).length;

  const totalPhases    = phases.length;
  const completedPhases = phases.filter(p => computeStatus(p) === 'complete').length;
  const overallPct = totalPhases > 0 ? Math.round(phases.reduce((sum, p) => sum + (p.progress||0), 0) / totalPhases) : 0;

  // Zone completion
  const ALL_ZONES = ['B0','L1','L2','L3','L4','STAIR','LIFT','ROOF','EXTERIOR-FRONT','EXTERIOR-BACK'];
  const zoneStats = ALL_ZONES.map(zone => {
    const zPhases = phases.filter(p => p.zone === zone);
    if (zPhases.length === 0) return null;
    const pct = Math.round(zPhases.reduce((s, p) => s + (p.progress||0), 0) / zPhases.length);
    return { zone, pct, count: zPhases.length };
  }).filter(Boolean);

  // Red flags
  const redFlags = [];

  // Overdue phases
  phases.filter(p => computeStatus(p) === 'delayed').forEach(p => {
    const sub = subs.find(s => s.id === p.subcontractor_id);
    redFlags.push({
      type:'overdue', icon:IconAlert,
      title:`Delayed: ${p.name}`,
      detail:`${sub?.name || 'Unknown'} · ended ${p.planned_end}`,
    });
  });

  // Order delivery alerts
  orders.filter(o => o.delivery_alert).forEach(o => {
    redFlags.push({
      type:'delivery', icon:IconTruck,
      title:`Delivery conflict: ${o.material}`,
      detail:`Delivery ${o.confirmed_delivery} after installation start ${o.installation_start}`,
    });
  });

  // Late deliveries
  orders.filter(o => o.days_late > 0).forEach(o => {
    redFlags.push({
      type:'late', icon:IconClock,
      title:`Late delivery: ${o.material} (${o.days_late}d late)`,
      detail:`${o.supplier_name || ''} · expected ${o.confirmed_delivery}, arrived ${o.actual_delivery}`,
    });
  });

  // Zone conflicts (subs sharing zone with overlapping dates)
  const seen = new Set();
  for (let i = 0; i < subs.length; i++) {
    for (let j = i+1; j < subs.length; j++) {
      const a = subs[i]; const b = subs[j];
      if (!a.assigned_zones?.length || !b.assigned_zones?.length) continue;
      const sharedZones = (a.assigned_zones||[]).filter(z => (b.assigned_zones||[]).includes(z));
      if (sharedZones.length === 0) continue;
      if (!dateOverlap(a.planned_start, a.planned_end, b.planned_start, b.planned_end)) continue;
      const key = [a.id,b.id].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      redFlags.push({
        type:'conflict', icon:IconPeople,
        title:`Zone conflict: ${a.name} & ${b.name}`,
        detail:`Overlap in ${sharedZones.join(', ')} · ${a.planned_start}–${a.planned_end} vs ${b.planned_start}–${b.planned_end}`,
      });
    }
  }

  // ── Next 7 days ───────────────────────────────────────────────────────
  const upcoming = [];

  // Phase starts in next 7 days
  phases.filter(p => p.planned_start && p.planned_start >= today && p.planned_start <= in7days)
    .forEach(p => {
      const sub = subs.find(s => s.id === p.subcontractor_id);
      upcoming.push({ date: p.planned_start, label:`Phase start: ${p.name}`, sub: sub?.name, color:'text-sky-400' });
    });

  // Phase ends in next 7 days
  phases.filter(p => p.planned_end && p.planned_end >= today && p.planned_end <= in7days && computeStatus(p) !== 'complete')
    .forEach(p => {
      const sub = subs.find(s => s.id === p.subcontractor_id);
      upcoming.push({ date: p.planned_end, label:`Phase due: ${p.name}`, sub: sub?.name, color:'text-amber-400' });
    });

  // Order deliveries in next 7 days
  orders.filter(o => o.confirmed_delivery && o.confirmed_delivery >= today && o.confirmed_delivery <= in7days)
    .forEach(o => {
      upcoming.push({ date: o.confirmed_delivery, label:`Delivery: ${o.material}`, sub: o.supplier_name, color:'text-emerald-400' });
    });

  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="px-8 py-5 border-b border-slate-800 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        {project?.name && <p className="text-slate-400 text-sm mt-1">{project.name} · {project.address}</p>}
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-6">

        {/* ── Task Dashboard ──────────────────────────────────────────────── */}
        <TaskDashboard pendingTasks={pendingTasks} pendingOrderTasks={orderPendingTasks} onTaskDone={loadPending}/>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Overall completion" value={`${overallPct}%`} sub={`${completedPhases}/${totalPhases} phases done`}/>
          <KpiCard label="Active subcontractors" value={activeSubs} sub={`of ${subs.length} total`} color="text-sky-400"/>
          <KpiCard label="Phases complete" value={completedPhases} sub={totalPhases>0?`${Math.round(completedPhases/totalPhases*100)}% of total`:'No phases yet'} color="text-emerald-400"/>
          <KpiCard label="Open flags" value={redFlags.length} sub={redFlags.length===0 ? 'No issues' : 'Need attention'} color={redFlags.length>0?'text-red-400':'text-emerald-400'}/>
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Zone completion */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Zone Completion</h2>
            {zoneStats.length === 0 ? (
              <p className="text-xs text-slate-600">No phases assigned to zones yet.</p>
            ) : (
              <div className="space-y-3">
                {zoneStats.map(({ zone, pct, count }) => (
                  <div key={zone}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">{zone}</span>
                      <span className="text-xs text-slate-500">{pct}% · {count} phase{count!==1?'s':''}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width:`${pct}%`,
                        backgroundColor: pct>=100 ? '#059669' : pct>=60 ? '#0284c7' : pct>0 ? '#d97706' : '#475569',
                      }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phase status breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Phase Status Breakdown</h2>
            {totalPhases === 0 ? (
              <p className="text-xs text-slate-600">No phases created yet. Go to Gantt by Sub and add phases.</p>
            ) : (
              <div className="space-y-2">
                {[
                  { key:'complete',    label:'Complete' },
                  { key:'in_progress', label:'In progress' },
                  { key:'delayed',     label:'Delayed' },
                  { key:'not_started', label:'Not started' },
                ].map(({ key, label }) => {
                  const count = phases.filter(p => computeStatus(p) === key).length;
                  const pct   = Math.round(count / totalPhases * 100);
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-28">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:STATUS_COLOR[key]}}/>
                        <span className="text-xs text-slate-400 truncate">{label}</span>
                      </div>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:STATUS_COLOR[key]}}/>
                      </div>
                      <span className="text-xs text-slate-500 w-12 text-right">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Active subs list */}
            {subs.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Subcontractors on site today</div>
                <div className="flex flex-wrap gap-1.5">
                  {subs.filter(s => s.planned_start <= today && s.planned_end >= today).map(s => (
                    <span key={s.id} className="text-xs px-2 py-0.5 rounded-full" style={{backgroundColor:`${TRADE_COLORS[s.trade] || '#4b5563'}22`,color:TRADE_COLORS[s.trade]||'#9ca3af',border:`1px solid ${TRADE_COLORS[s.trade]||'#4b5563'}44`}}>
                      {s.name}
                    </span>
                  ))}
                  {subs.filter(s => s.planned_start <= today && s.planned_end >= today).length === 0 && (
                    <span className="text-xs text-slate-600">None scheduled today</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Red flags */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-slate-300">Red Flags</h2>
              {redFlags.length > 0 && <span className="bg-red-500/20 text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full">{redFlags.length}</span>}
            </div>
            {redFlags.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.28 5.78a.75.75 0 00-1.06-1.06L7 8.94 5.78 7.72a.75.75 0 00-1.06 1.06l1.75 1.75a.75.75 0 001.06 0l3.75-3.75z"/></svg>
                <span className="text-sm">No issues detected</span>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {redFlags.map((f, i) => <RedFlag key={i} icon={f.icon} title={f.title} detail={f.detail}/>)}
              </div>
            )}
          </div>

          {/* Next 7 days */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Next 7 Days</h2>
            {upcoming.length === 0 ? (
              <p className="text-xs text-slate-600">Nothing scheduled in the next 7 days.</p>
            ) : (
              <div className="space-y-0 max-h-64 overflow-y-auto">
                {upcoming.map((u, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-slate-800 last:border-0">
                    <span className={`text-xs font-semibold tabular-nums ${u.color} flex-shrink-0 w-20`}>{u.date.slice(5)}</span>
                    <div>
                      <div className="text-sm text-slate-200">{u.label}</div>
                      {u.sub&&<div className="text-xs text-slate-500">{u.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
