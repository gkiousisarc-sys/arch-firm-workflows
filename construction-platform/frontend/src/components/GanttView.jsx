import { useState, useEffect, useCallback } from 'react';
import {
  getSubcontractors, getProject, getHolidays,
  getPhases, createPhase, updatePhase, deletePhase, generatePhases,
  getPhaseLogs, createPhaseLog, deletePhaseLog,
  getPhaseZones, setPhaseZones,
} from '../api';
import PhaseDetailPanel from './PhaseDetailPanel';

// ── Constants ────────────────────────────────────────────────────────────
const TRADE_COLORS = {
  'Concrete & Formwork':'#d97706','Steel Reinforcement':'#9ca3af','Masonry':'#92400e',
  'Plumbing':'#0284c7','Electrical':'#ca8a04','Plastering':'#64748b',
  'Tiling':'#7c3aed','Carpentry':'#78350f','Aluminum Works':'#475569',
  'Marble & Stone':'#8b5cf6','Waterproofing':'#1e40af','Elevator':'#047857',
  'Painting':'#dc2626','Insulation':'#ea580c','Other':'#4b5563',
};
const STATUS_COLOR = { not_started:'#475569', in_progress:'#0284c7', complete:'#059669', delayed:'#dc2626' };
const STATUS_LABEL = { not_started:'Not started', in_progress:'In progress', complete:'Complete', delayed:'Delayed' };

const ALL_ZONES = ['B0','L1','L2','L3','L4','STAIR','LIFT','ROOF','EXTERIOR-FRONT','EXTERIOR-BACK'];

const PX   = 14;
const HEAD = 52;
const SUB_ROW   = 48;
const PHASE_ROW = 42;
const ADD_ROW   = 34;
const LEFT = 240;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const todayStr = () => new Date().toISOString().slice(0, 10);
const EMPTY_PHASE = { name:'', zone:'', planned_start:'', planned_end:'', status:'not_started', progress:0, sort_order:0 };
const EMPTY_LOG   = { log_date: todayStr(), progress:0, notes:'', workers:0 };

function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

function workDays(start, end, hSet) {
  let n = 0; const d = new Date(start); const e = new Date(end);
  while (d <= e) { const s = d.getDay(); if (s!==0&&s!==6&&!hSet.has(d.toISOString().slice(0,10))) n++; d.setDate(d.getDate()+1); }
  return n;
}

function computeStatus(phase) {
  if (phase.progress >= 100) return 'complete';
  const today = todayStr();
  if (phase.planned_end && today > phase.planned_end) return 'delayed';
  if (phase.progress > 0 || phase.status === 'in_progress') return 'in_progress';
  return 'not_started';
}

// ── Sub-components ────────────────────────────────────────────────────────
function LevelBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
        active ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >{children}</button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function GanttView() {
  const [level, setLevel]       = useState(1);
  const [subs, setSubs]         = useState([]);
  const [project, setProject]   = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [phases, setPhases]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [generatingIds, setGeneratingIds] = useState(new Set());

  // Side panel
  const [panel, setPanel]         = useState(null); // { phase, sub }

  // Phase modal
  const [modal, setModal]         = useState(null); // { subId, phase|null }
  const [phaseForm, setPhaseForm] = useState(EMPTY_PHASE);
  const [phaseLogs, setPhaseLogs] = useState([]);
  const [logForm, setLogForm]     = useState(EMPTY_LOG);
  const [modalZones, setModalZones] = useState([]); // [{ zone, status }]
  const [saving, setSaving]         = useState(false);
  const [savingLog, setSavingLog]   = useState(false);

  const loadBase = useCallback(() =>
    Promise.all([getSubcontractors(), getProject(), getHolidays()])
      .then(([s, p, h]) => { setSubs(s); setProject(p); setHolidays(h); })
      .finally(() => setLoading(false))
  , []);

  const loadPhases = useCallback(() =>
    getPhases().then(setPhases)
  , []);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => { if (level > 1) loadPhases(); }, [level, loadPhases]);

  // ── Modal helpers ────────────────────────────────────────────────────────
  async function openModal(subId, phase = null) {
    setPhaseForm(phase ? { name:phase.name, zone:phase.zone, planned_start:phase.planned_start,
      planned_end:phase.planned_end, status:phase.status, progress:phase.progress, sort_order:phase.sort_order }
      : EMPTY_PHASE);
    setPhaseLogs([]);
    setLogForm(EMPTY_LOG);
    setModalZones([]);
    setModal({ subId, phase });
    if (phase) {
      getPhaseLogs(phase.id).then(setPhaseLogs);
      getPhaseZones(phase.id).then(setModalZones);
    }
  }
  const closeModal = () => setModal(null);

  async function handleSavePhase(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...phaseForm, progress: Number(phaseForm.progress) };
      let phaseId;
      if (modal.phase) {
        await updatePhase(modal.phase.id, payload);
        phaseId = modal.phase.id;
      } else {
        const r = await createPhase({ ...payload, subcontractor_id: modal.subId });
        phaseId = r.id;
      }
      await setPhaseZones(phaseId, modalZones);
      await loadPhases();
      closeModal();
    } finally { setSaving(false); }
  }

  async function handleDeletePhase() {
    if (!confirm('Delete this phase and all its log entries?')) return;
    await deletePhase(modal.phase.id);
    await loadPhases();
    closeModal();
  }

  async function handleGenerate(subId) {
    setGeneratingIds(s => new Set(s).add(subId));
    try { await generatePhases(subId); await loadPhases(); }
    finally { setGeneratingIds(s => { const n = new Set(s); n.delete(subId); return n; }); }
  }

  async function handleAddLog(e) {
    e.preventDefault();
    setSavingLog(true);
    try {
      await createPhaseLog(modal.phase.id, { ...logForm, progress: Number(logForm.progress), workers: Number(logForm.workers) });
      const [updatedLogs, updatedPhases] = await Promise.all([getPhaseLogs(modal.phase.id), getPhases()]);
      setPhaseLogs(updatedLogs);
      setPhases(updatedPhases);
      const updatedPhase = updatedPhases.find(p => p.id === modal.phase.id);
      if (updatedPhase) setModal(m => ({ ...m, phase: updatedPhase }));
      setLogForm(EMPTY_LOG);
    } finally { setSavingLog(false); }
  }

  async function handleDeleteLog(logId) {
    await deletePhaseLog(logId);
    setPhaseLogs(prev => prev.filter(l => l.id !== logId));
  }

  // ── Render guards ────────────────────────────────────────────────────────
  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading…</div>;
  if (!project) return null;

  const withDates = subs.filter(s => s.planned_start && s.planned_end);
  if (withDates.length === 0) return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Gantt Schedule</h1>
      <p className="text-slate-400 text-sm">Add subcontractors with planned dates to see the chart.</p>
    </div>
  );

  // ── Timeline range ───────────────────────────────────────────────────────
  const allD = withDates.flatMap(s => [new Date(s.planned_start), new Date(s.planned_end)]);
  if (project.start_date) allD.push(new Date(project.start_date));
  if (level > 1) phases.filter(p => p.planned_start && p.planned_end)
    .forEach(p => { allD.push(new Date(p.planned_start)); allD.push(new Date(p.planned_end)); });

  const rawStart = new Date(Math.min(...allD));
  const rawEnd   = new Date(Math.max(...allD));
  const rangeStart = new Date(rawStart.getFullYear(), rawStart.getMonth(), 1);
  const rangeEnd   = new Date(rawEnd.getFullYear(), rawEnd.getMonth() + 2, 0);
  const totalDays  = daysBetween(rangeStart, rangeEnd);
  const timelineW  = totalDays * PX;

  const months = [];
  let cur = new Date(rangeStart);
  while (cur <= rangeEnd) {
    months.push({ label:`${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`, left: daysBetween(rangeStart,cur)*PX, widthDays: new Date(cur.getFullYear(),cur.getMonth()+1,0).getDate() });
    cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
  }

  const holidaySet  = new Set(holidays.map(h => h.date));
  const hMarkers    = holidays.map(h => ({ ...h, left: daysBetween(rangeStart,new Date(h.date))*PX })).filter(h => h.left>=0 && h.left<=timelineW);
  const today       = new Date();
  const todayLeft   = today>=rangeStart && today<=rangeEnd ? daysBetween(rangeStart,today)*PX : null;

  function bar(startDate, endDate, height, top) {
    const left  = daysBetween(rangeStart, new Date(startDate)) * PX;
    const width = Math.max(daysBetween(new Date(startDate), new Date(endDate)) * PX, 4);
    return { left, width, height, top };
  }

  // ── Row building (Level 2/3) ─────────────────────────────────────────────
  const rows = []; // { type, sub?, phase? }
  if (level === 1) {
    withDates.forEach(s => rows.push({ type:'sub1', sub:s }));
  } else {
    withDates.forEach(s => {
      const sp = phases.filter(p => p.subcontractor_id === s.id).sort((a,b) => a.sort_order-b.sort_order || a.id-b.id);
      rows.push({ type:'sub_hdr', sub:s });
      if (sp.length === 0) { rows.push({ type:'no_phases', sub:s }); }
      else { sp.forEach(phase => rows.push({ type:'phase', sub:s, phase })); rows.push({ type:'add_phase', sub:s }); }
    });
  }

  // ── Shared timeline cell background ─────────────────────────────────────
  function TimelineBg() {
    return <>
      {months.map((m,i) => <div key={i} className="absolute top-0 bottom-0 border-l border-slate-800/80" style={{left:m.left}}/>)}
      {hMarkers.map(h => <div key={h.date} className="absolute top-0 bottom-0 w-px" style={{left:h.left,backgroundColor:'rgba(245,158,11,0.18)'}} title={`${h.name} (${h.date})`}/>)}
      {todayLeft!==null && <div className="absolute top-0 bottom-0 w-px bg-red-500/40 z-10" style={{left:todayLeft}}/>}
    </>;
  }

  const inputCls = 'bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500';

  function toggleModalZone(zone) {
    setModalZones(prev => prev.find(z => z.zone === zone)
      ? prev.filter(z => z.zone !== zone)
      : [...prev, { zone, status: 'not_started' }]);
  }
  function changeModalZoneStatus(zone, status) {
    setModalZones(prev => prev.map(z => z.zone === zone ? { ...z, status } : z));
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-8 py-5 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Gantt Schedule</h1>
            <p className="text-slate-400 text-sm mt-1">
              {withDates.length} subcontractor{withDates.length!==1?'s':''} ·{' '}
              {rangeStart.toLocaleDateString('en-GB',{month:'short',year:'numeric'})} – {rangeEnd.toLocaleDateString('en-GB',{month:'short',year:'numeric'})}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-2">Level</span>
            <LevelBtn active={level===1} onClick={() => setLevel(1)}>1 · Overview</LevelBtn>
            <LevelBtn active={level===2} onClick={() => setLevel(2)}>2 · Phases</LevelBtn>
            <LevelBtn active={level===3} onClick={() => setLevel(3)}>3 · Progress</LevelBtn>
          </div>
        </div>
      </div>

      {/* ── Gantt grid ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-8 pb-6">
        <div style={{ display:'grid', gridTemplateColumns:`${LEFT}px 1fr`, minWidth:LEFT+timelineW }}>

          {/* Header */}
          <div className="sticky left-0 z-20 bg-slate-950 border-b border-r border-slate-700 flex items-end px-4 pb-2" style={{height:HEAD}}>
            <span className="text-xs text-slate-500 uppercase tracking-wider">{level===1 ? 'Subcontractor' : 'Subcontractor / Phase'}</span>
          </div>
          <div className="relative border-b border-slate-700 bg-slate-950" style={{height:HEAD,width:timelineW}}>
            {months.map((m,i) => (
              <div key={i} className="absolute top-0 h-full flex items-end pb-2 pl-2 border-l border-slate-700/60" style={{left:m.left,width:m.widthDays*PX}}>
                <span className="text-xs text-slate-400 select-none whitespace-nowrap">{m.label}</span>
              </div>
            ))}
            {todayLeft!==null && (
              <div className="absolute top-0 bottom-0 flex flex-col items-center z-10" style={{left:todayLeft}}>
                <span className="text-xs text-red-400 mt-1 px-1 bg-slate-950 select-none whitespace-nowrap">Today</span>
                <div className="flex-1 w-px bg-red-500/70 mt-1"/>
              </div>
            )}
          </div>

          {/* Rows */}
          {rows.map((row, ri) => {
            const key = `${row.type}-${row.sub?.id}-${row.phase?.id ?? ri}`;

            // ── Level 1: single sub row ──────────────────────────────────
            if (row.type === 'sub1') {
              const s = row.sub;
              const color = TRADE_COLORS[s.trade] || '#4b5563';
              const b = bar(s.planned_start, s.planned_end, 32, (SUB_ROW-32)/2);
              const wd = workDays(s.planned_start, s.planned_end, holidaySet);
              const buf = Math.round(wd * (1+(s.delay_buffer||0)/100));
              return [
                <div key={`lbl-${key}`} className="sticky left-0 z-10 bg-slate-950 border-b border-r border-slate-700 flex flex-col justify-center px-4" style={{height:SUB_ROW}}>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-sm" style={{backgroundColor:color}}/><span className="text-sm font-medium text-slate-100 truncate">{s.name}</span></div>
                  <div className="flex gap-2 mt-0.5 pl-4"><span className="text-xs text-slate-500">{s.trade}</span>{s.assigned_zones?.length>0&&<span className="text-xs text-slate-600">{s.assigned_zones.join(', ')}</span>}</div>
                </div>,
                <div key={`row-${key}`} className="border-b border-slate-800 relative" style={{height:SUB_ROW,width:timelineW,backgroundColor:'rgba(15,23,42,0.6)'}}>
                  <TimelineBg/>
                  <div className="absolute rounded flex items-center px-2 cursor-default" style={{left:b.left,width:b.width,height:b.height,top:b.top,backgroundColor:color,opacity:0.88}} title={`${s.name}\n${s.planned_start} → ${s.planned_end}\n${wd} work days (${buf}d buffered)`}>
                    {b.width>56&&<span className="text-xs font-semibold text-white/90 select-none">{wd}d</span>}
                  </div>
                  {s.delay_buffer>0&&<div className="absolute rounded-r" style={{left:b.left+b.width,width:Math.round(wd*(s.delay_buffer/100))*PX,height:b.height,top:b.top,backgroundColor:color,opacity:0.22}} title={`+${s.delay_buffer}% buffer`}/>}
                </div>,
              ];
            }

            // ── Sub header (Level 2/3) ───────────────────────────────────
            if (row.type === 'sub_hdr') {
              const s = row.sub;
              const color = TRADE_COLORS[s.trade] || '#4b5563';
              const b = s.planned_start && s.planned_end ? bar(s.planned_start, s.planned_end, 24, (SUB_ROW-24)/2) : null;
              return [
                <div key={`lbl-${key}`} className="sticky left-0 z-10 bg-slate-900/90 border-b border-r border-slate-700 flex items-center gap-2 px-4" style={{height:SUB_ROW}}>
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{backgroundColor:color}}/>
                  <div>
                    <div className="text-sm font-semibold text-slate-100 leading-tight">{s.name}</div>
                    <div className="text-xs text-slate-500 leading-tight">{s.trade}</div>
                  </div>
                  <button onClick={() => openModal(s.id, null)} className="ml-auto text-slate-500 hover:text-amber-400 hover:bg-slate-700 rounded p-1 transition-colors flex-shrink-0" title="Add phase">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z"/></svg>
                  </button>
                </div>,
                <div key={`row-${key}`} className="border-b border-slate-700 relative bg-slate-900/40" style={{height:SUB_ROW,width:timelineW}}>
                  <TimelineBg/>
                  {b&&<div className="absolute rounded" style={{left:b.left,width:b.width,height:b.height,top:b.top,backgroundColor:color,opacity:0.18}}/>}
                </div>,
              ];
            }

            // ── Phase row ────────────────────────────────────────────────
            if (row.type === 'phase') {
              const { sub, phase } = row;
              const st = computeStatus(phase);
              const color = STATUS_COLOR[st];
              const hasBar = phase.planned_start && phase.planned_end;
              const b = hasBar ? bar(phase.planned_start, phase.planned_end, 28, (PHASE_ROW-28)/2) : null;
              const pct = phase.progress;
              return [
                <div key={`lbl-${key}`} className="sticky left-0 z-10 bg-slate-950 border-b border-r border-slate-700 flex items-center gap-2 px-4 pl-8 group" style={{height:PHASE_ROW}}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{backgroundColor:color}}/>
                  <span className="text-xs text-slate-300 truncate flex-1">{phase.name}</span>
                  {phase.zone&&<span className="text-xs text-slate-600 hidden group-hover:inline">{phase.zone}</span>}
                  <button onClick={() => openModal(sub.id, phase)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 p-0.5 rounded transition-all ml-1" title="Edit phase">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M11.013 1.427a1.75 1.75 0 012.474 2.474L5.648 11.74a.75.75 0 01-.364.201l-3.498.873a.75.75 0 01-.909-.909l.873-3.498a.75.75 0 01.201-.364L11.013 1.427z"/></svg>
                  </button>
                </div>,
                <div key={`row-${key}`} className="border-b border-slate-800/60 relative" style={{height:PHASE_ROW,width:timelineW,backgroundColor:'rgba(15,23,42,0.5)'}}>
                  <TimelineBg/>
                  {b && <>
                    {/* background track */}
                    <div className="absolute rounded cursor-pointer" onClick={() => setPanel({ phase, sub })} style={{left:b.left,width:b.width,height:b.height,top:b.top,backgroundColor:color,opacity:0.2}}/>
                    {/* progress fill (level 3 only) */}
                    {level===3&&pct>0&&<div className="absolute rounded pointer-events-none" style={{left:b.left,width:b.width*(pct/100),height:b.height,top:b.top,backgroundColor:color,opacity:0.85}}/>}
                    {/* full bar (level 2) */}
                    {level===2&&<div className="absolute rounded cursor-pointer flex items-center px-2" onClick={() => setPanel({ phase, sub })} style={{left:b.left,width:b.width,height:b.height,top:b.top,backgroundColor:color,opacity:0.78}}>
                      {b.width>50&&<span className="text-xs text-white/90 select-none truncate">{STATUS_LABEL[st]}</span>}
                    </div>}
                    {/* level 3 label */}
                    {level===3&&<div className="absolute flex items-center px-2 cursor-pointer" onClick={() => setPanel({ phase, sub })} style={{left:b.left,width:b.width,height:b.height,top:b.top}}>
                      {b.width>50&&<span className="text-xs text-white font-semibold select-none">{pct}%</span>}
                    </div>}
                  </>}
                  {!b&&<div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600 italic">No dates</div>}
                </div>,
              ];
            }

            // ── No phases row ────────────────────────────────────────────
            if (row.type === 'no_phases') {
              const s = row.sub;
              const generating = generatingIds.has(s.id);
              return [
                <div key={`lbl-${key}`} className="sticky left-0 z-10 bg-slate-950 border-b border-r border-slate-700 flex items-center px-4 pl-8" style={{height:ADD_ROW}}>
                  <span className="text-xs text-slate-600 italic">No phases</span>
                </div>,
                <div key={`row-${key}`} className="border-b border-slate-800/60 relative flex items-center px-4 gap-3" style={{height:ADD_ROW,width:timelineW,backgroundColor:'rgba(15,23,42,0.4)'}}>
                  <button disabled={generating} onClick={() => handleGenerate(s.id)}
                    className="text-xs px-3 py-1 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors disabled:opacity-50">
                    {generating ? 'Generating…' : '⚡ Generate defaults'}
                  </button>
                  <button onClick={() => openModal(s.id, null)} className="text-xs px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                    + Add manually
                  </button>
                </div>,
              ];
            }

            // ── Add phase button row ─────────────────────────────────────
            if (row.type === 'add_phase') {
              return [
                <div key={`lbl-${key}`} className="sticky left-0 z-10 bg-slate-950 border-b border-r border-slate-700 flex items-center px-4 pl-8" style={{height:ADD_ROW}}>
                  <button onClick={() => openModal(row.sub.id, null)} className="text-xs text-slate-600 hover:text-amber-400 transition-colors">+ phase</button>
                </div>,
                <div key={`row-${key}`} className="border-b border-slate-800/40 relative" style={{height:ADD_ROW,width:timelineW,backgroundColor:'rgba(15,23,42,0.3)'}}/>,
              ];
            }

            return null;
          })}
        </div>

        {/* Footer legend */}
        <div className="flex items-center gap-5 mt-4 text-xs text-slate-500 flex-wrap">
          {level>1&&Object.entries(STATUS_COLOR).map(([st,c]) => (
            <div key={st} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:c}}/>{STATUS_LABEL[st]}</div>
          ))}
          <div className="flex items-center gap-1.5"><div className="w-4 h-2 rounded-sm bg-amber-500/25"/>Holiday</div>
          {todayLeft!==null&&<div className="flex items-center gap-1.5"><div className="w-px h-3 bg-red-500/60"/>Today</div>}
          {level>1&&<div className="ml-auto text-slate-600">Click bar → details panel · Pencil → edit dates · + → add phase</div>}
        </div>
      </div>

      {/* ── Phase Detail Panel ──────────────────────────────────────────── */}
      {panel && (
        <PhaseDetailPanel
          phase={panel.phase}
          sub={panel.sub}
          onClose={() => setPanel(null)}
          onEdit={(subId, ph) => { setPanel(null); openModal(subId, ph); }}
          onChanged={loadPhases}
        />
      )}

      {/* ── Phase Modal ─────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-100">{modal.phase ? 'Edit Phase' : 'Add Phase'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{subs.find(s=>s.id===modal.subId)?.name}</p>
              </div>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300"><svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {/* Phase fields */}
              <form onSubmit={handleSavePhase} id="phaseForm" className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phase name *</label>
                  <input required className={`w-full ${inputCls}`} value={phaseForm.name} onChange={e=>setPhaseForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Rough-in wiring"/>
                </div>
                {/* Zones — multi-select pills */}
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Zones</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {ALL_ZONES.map(z => {
                      const selected = modalZones.find(mz => mz.zone === z);
                      return (
                        <button type="button" key={z} onClick={() => toggleModalZone(z)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors border ${
                            selected
                              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                              : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                          }`}
                        >{z}</button>
                      );
                    })}
                  </div>
                  {modalZones.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {modalZones.map(({ zone, status }) => (
                        <div key={zone} className="flex items-center gap-2">
                          <span className="text-xs text-amber-400 w-28 flex-shrink-0">{zone}</span>
                          <select value={status} onChange={e => changeModalZoneStatus(zone, e.target.value)}
                            className={`flex-1 ${inputCls} text-xs py-1`}>
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="complete">Complete</option>
                            <option value="delayed">Delayed</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Status</label>
                    <select className={`w-full ${inputCls}`} value={phaseForm.status} onChange={e=>setPhaseForm(p=>({...p,status:e.target.value}))}>
                      {Object.entries(STATUS_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div/>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Planned start</label>
                    <input type="date" className={`w-full ${inputCls}`} value={phaseForm.planned_start} onChange={e=>setPhaseForm(p=>({...p,planned_start:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Planned end</label>
                    <input type="date" className={`w-full ${inputCls}`} value={phaseForm.planned_end} onChange={e=>setPhaseForm(p=>({...p,planned_end:e.target.value}))}/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Progress: {phaseForm.progress}%</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="100" step="5" className="flex-1 accent-amber-500" value={phaseForm.progress} onChange={e=>setPhaseForm(p=>({...p,progress:Number(e.target.value)}))}/>
                    <input type="number" min="0" max="100" className={`w-16 ${inputCls} text-center`} value={phaseForm.progress} onChange={e=>setPhaseForm(p=>({...p,progress:Math.min(100,Math.max(0,Number(e.target.value)))}))}/>
                  </div>
                </div>
              </form>

              {/* Log section (existing phases only) */}
              {modal.phase && (
                <div className="border-t border-slate-700 pt-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Activity Log</h3>

                  {phaseLogs.length === 0 ? (
                    <p className="text-xs text-slate-600 mb-3">No entries yet.</p>
                  ) : (
                    <div className="space-y-2 mb-4 max-h-36 overflow-y-auto">
                      {phaseLogs.map(l => (
                        <div key={l.id} className="bg-slate-800 rounded-lg px-3 py-2 flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-slate-300">{l.log_date}</span>
                              <span className="text-xs text-amber-400 font-semibold">{l.progress}%</span>
                              {l.workers>0&&<span className="text-xs text-slate-500">{l.workers} workers</span>}
                            </div>
                            {l.notes&&<p className="text-xs text-slate-500 mt-0.5 truncate">{l.notes}</p>}
                          </div>
                          <button onClick={() => handleDeleteLog(l.id)} className="text-slate-600 hover:text-red-400 flex-shrink-0">
                            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10H3z"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add log form */}
                  <form onSubmit={handleAddLog} className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-slate-500 font-medium">Add entry</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <label className="block text-xs text-slate-500 mb-1">Date</label>
                        <input type="date" required className={`w-full ${inputCls} text-xs`} value={logForm.log_date} onChange={e=>setLogForm(p=>({...p,log_date:e.target.value}))}/>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Progress %</label>
                        <input type="number" min="0" max="100" className={`w-full ${inputCls} text-xs`} value={logForm.progress} onChange={e=>setLogForm(p=>({...p,progress:e.target.value}))}/>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Workers</label>
                        <input type="number" min="0" className={`w-full ${inputCls} text-xs`} value={logForm.workers} onChange={e=>setLogForm(p=>({...p,workers:e.target.value}))}/>
                      </div>
                    </div>
                    <input className={`w-full ${inputCls} text-xs`} placeholder="Notes (optional)" value={logForm.notes} onChange={e=>setLogForm(p=>({...p,notes:e.target.value}))}/>
                    <button type="submit" disabled={savingLog} className="text-xs bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded transition-colors">
                      {savingLog ? 'Adding…' : 'Add Entry'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between flex-shrink-0">
              <div>
                {modal.phase && (
                  <button onClick={handleDeletePhase} className="text-xs text-red-400 hover:text-red-300 transition-colors">Delete phase</button>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={closeModal} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-1.5 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" form="phaseForm" disabled={saving} className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors">
                  {saving ? 'Saving…' : modal.phase ? 'Update' : 'Add Phase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
