import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getSubcontractors, getProject, getHolidays,
  getPhases, createPhase, updatePhase, deletePhase,
  getPhaseLogs, createPhaseLog, deletePhaseLog,
  getPhaseZones, setPhaseZones, getAllPhaseZones,
} from '../api';
import PhaseDetailPanel from './PhaseDetailPanel';

// ── Constants ────────────────────────────────────────────────────────────
const STATUS_COLOR = { not_started:'#475569', in_progress:'#0284c7', complete:'#059669', delayed:'#dc2626' };
const STATUS_LABEL = { not_started:'Not started', in_progress:'In progress', complete:'Complete', delayed:'Delayed' };

const ALL_ZONES = ['B0','L1','L2','L3','L4','STAIR','LIFT','ROOF','EXTERIOR-FRONT','EXTERIOR-BACK','FACADE','BALCONIES'];

const PX   = 14;
const HEAD = 52;
const SUB_ROW   = 50;
const PHASE_ROW = 38;
const LEFT = 280;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const todayStr  = () => new Date().toISOString().slice(0, 10);
const EMPTY_PHASE = { name:'', planned_start:'', planned_end:'', status:'not_started', progress:0, sort_order:0, notes:'', critical:0 };
const EMPTY_LOG   = { log_date: todayStr(), progress:0, notes:'', workers:0 };

// ── Helpers ───────────────────────────────────────────────────────────────
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

function computeStatus(phase) {
  if (!phase) return 'not_started';
  if (phase.progress >= 100) return 'complete';
  const today = todayStr();
  if (phase.planned_end && today > phase.planned_end) return 'delayed';
  if (phase.progress > 0 || phase.status === 'in_progress') return 'in_progress';
  return 'not_started';
}

// Count distinct calendar days across a set of date ranges (union, no double-counting)
function distinctCalendarDays(phases) {
  const withDates = phases.filter(p => p.planned_start && p.planned_end);
  if (!withDates.length) return 0;
  const ranges = withDates
    .map(p => [new Date(p.planned_start).getTime(), new Date(p.planned_end).getTime()])
    .sort((a, b) => a[0] - b[0]);
  const merged = [[...ranges[0]]];
  for (let i = 1; i < ranges.length; i++) {
    const [s, e] = ranges[i];
    const last = merged[merged.length - 1];
    if (s <= last[1] + 86400000) { if (e > last[1]) last[1] = e; }
    else merged.push([s, e]);
  }
  return merged.reduce((sum, [s, e]) => sum + Math.round((e - s) / 86400000) + 1, 0);
}

// ── Main Component ────────────────────────────────────────────────────────
export default function GanttView() {
  const [subs, setSubs]         = useState([]);
  const [phases, setPhases]     = useState([]);
  const [allPZ, setAllPZ]       = useState([]); // all phase-zone rows from /phase-zones
  const [holidays, setHolidays] = useState([]);
  const [zoneLabels, setZoneLabels] = useState({});
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(new Set()); // sub IDs that are open

  // Side panel
  const [panel, setPanel] = useState(null);

  // Edit modal
  const [modal, setModal]         = useState(null);
  const [phaseForm, setPhaseForm] = useState(EMPTY_PHASE);
  const [modalZones, setModalZones] = useState([]);
  const [phaseLogs, setPhaseLogs] = useState([]);
  const [logForm, setLogForm]     = useState(EMPTY_LOG);
  const [saving, setSaving]       = useState(false);
  const [savingLog, setSavingLog] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────
  const load = useCallback(() =>
    Promise.all([getSubcontractors(), getPhases(), getAllPhaseZones(), getHolidays(), getProject()])
      .then(([s, p, pz, h, proj]) => {
        setSubs(s);
        setPhases(p);
        setAllPZ(pz);
        setHolidays(h);
        const labels = {};
        for (const z of (proj.zones || [])) labels[z.code] = z.label;
        setZoneLabels(labels);
      })
      .finally(() => setLoading(false))
  , []);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ─────────────────────────────────────────────────────────
  // phase_id -> [zone codes]
  const phaseZoneMap = useMemo(() => {
    const map = {};
    for (const pz of allPZ) {
      if (!map[pz.phase_id]) map[pz.phase_id] = [];
      map[pz.phase_id].push(pz.zone);
    }
    return map;
  }, [allPZ]);

  // sub_id -> sorted phases with zoneList attached
  const subPhasesMap = useMemo(() => {
    const map = {};
    for (const p of phases) {
      if (!map[p.subcontractor_id]) map[p.subcontractor_id] = [];
      map[p.subcontractor_id].push({ ...p, zoneList: phaseZoneMap[p.id] || [] });
    }
    for (const subId in map) {
      map[subId].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    }
    return map;
  }, [phases, phaseZoneMap]);

  // sub_id -> { earliest, latest, totalDays, phaseCount }
  const subSummaries = useMemo(() => {
    const result = {};
    for (const sub of subs) {
      const sp = subPhasesMap[sub.id] || [];
      const withDates = sp.filter(p => p.planned_start && p.planned_end);
      if (!withDates.length) { result[sub.id] = null; continue; }
      const starts = withDates.map(p => p.planned_start).sort();
      const ends   = withDates.map(p => p.planned_end).sort().reverse();
      result[sub.id] = {
        earliest:   starts[0],
        latest:     ends[0],
        totalDays:  distinctCalendarDays(withDates),
        phaseCount: withDates.length,
      };
    }
    return result;
  }, [subs, subPhasesMap]);

  // Subs with at least one dated phase
  const activeSubs = useMemo(() =>
    subs.filter(s => subSummaries[s.id] !== null)
  , [subs, subSummaries]);

  // Timeline range from all phases
  const { rangeStart, rangeEnd, timelineW, months, holidaySet, hMarkers, todayLeft } = useMemo(() => {
    const allDates = phases
      .filter(p => p.planned_start && p.planned_end)
      .flatMap(p => [new Date(p.planned_start), new Date(p.planned_end)]);
    if (!allDates.length) return { rangeStart:new Date(), rangeEnd:new Date(), timelineW:0, months:[], holidaySet:new Set(), hMarkers:[], todayLeft:null };

    const rawStart = new Date(Math.min(...allDates));
    const rawEnd   = new Date(Math.max(...allDates));
    const rs = new Date(rawStart.getFullYear(), rawStart.getMonth(), 1);
    const re = new Date(rawEnd.getFullYear(), rawEnd.getMonth() + 2, 0);
    const totalDays = daysBetween(rs, re);
    const tw = totalDays * PX;

    const mons = [];
    let cur = new Date(rs);
    while (cur <= re) {
      mons.push({ label:`${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`, left: daysBetween(rs, cur)*PX, widthDays: new Date(cur.getFullYear(),cur.getMonth()+1,0).getDate() });
      cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
    }

    const hSet = new Set(holidays.map(h => h.date));
    const hm = holidays.map(h => ({ ...h, left: daysBetween(rs, new Date(h.date))*PX })).filter(h => h.left>=0 && h.left<=tw);
    const today = new Date();
    const tl = today>=rs && today<=re ? daysBetween(rs, today)*PX : null;

    return { rangeStart:rs, rangeEnd:re, timelineW:tw, months:mons, holidaySet:hSet, hMarkers:hm, todayLeft:tl };
  }, [phases, holidays]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function barFor(start, end, height, rowH) {
    const left  = daysBetween(rangeStart, new Date(start)) * PX;
    const width = Math.max(daysBetween(new Date(start), new Date(end)) * PX, 4);
    return { left, width, height, top: (rowH - height) / 2 };
  }

  function toggleExpand(subId) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(subId) ? next.delete(subId) : next.add(subId);
      return next;
    });
  }

  // ── Modal helpers ────────────────────────────────────────────────────────
  async function openModal(subId, phase = null) {
    setPhaseForm(phase
      ? { name:phase.name, planned_start:phase.planned_start, planned_end:phase.planned_end,
          status:phase.status, progress:phase.progress, sort_order:phase.sort_order,
          notes:phase.notes || '', critical: phase.critical || 0 }
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
      const payload = {
        ...phaseForm,
        progress: Number(phaseForm.progress),
        critical: phaseForm.critical ? 1 : 0,
      };
      let phaseId;
      if (modal.phase) {
        await updatePhase(modal.phase.id, payload);
        phaseId = modal.phase.id;
      } else {
        const r = await createPhase({ ...payload, subcontractor_id: modal.subId });
        phaseId = r.id;
      }
      await setPhaseZones(phaseId, modalZones);
      await load();
      closeModal();
    } finally { setSaving(false); }
  }

  async function handleDeletePhase() {
    if (!confirm('Delete this phase and all its log entries?')) return;
    await deletePhase(modal.phase.id);
    await load();
    closeModal();
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

  function toggleModalZone(zone) {
    setModalZones(prev => prev.find(z => z.zone === zone)
      ? prev.filter(z => z.zone !== zone)
      : [...prev, { zone, status: 'not_started' }]);
  }
  function changeModalZoneStatus(zone, status) {
    setModalZones(prev => prev.map(z => z.zone === zone ? { ...z, status } : z));
  }

  // ── Shared timeline background ────────────────────────────────────────────
  function TimelineBg() {
    return <>
      {months.map((m,i) => <div key={i} className="absolute top-0 bottom-0 border-l border-slate-800/80" style={{left:m.left}}/>)}
      {hMarkers.map(h => <div key={h.date} className="absolute top-0 bottom-0 w-px" style={{left:h.left,backgroundColor:'rgba(245,158,11,0.18)'}} title={`${h.name} (${h.date})`}/>)}
      {todayLeft!==null && <div className="absolute top-0 bottom-0 w-px bg-red-500/40 z-10" style={{left:todayLeft}}/>}
    </>;
  }

  const inputCls = 'bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500';

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading…</div>;

  if (activeSubs.length === 0) return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Gantt by Subcontractor</h1>
      <p className="text-slate-400 text-sm">No phases with dates found. Import data or add phases to see the chart.</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-8 py-5 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Gantt by Subcontractor</h1>
            <p className="text-slate-400 text-sm mt-1">
              {activeSubs.length} subcontractor{activeSubs.length!==1?'s':''} ·{' '}
              {phases.filter(p=>p.planned_start&&p.planned_end).length} phases · click row to expand
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500/60"/>Critical</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-2 rounded-sm bg-amber-500/25"/>Holiday</div>
            {todayLeft!==null&&<div className="flex items-center gap-1.5"><div className="w-px h-3 bg-red-500/60"/>Today</div>}
          </div>
        </div>
      </div>

      {/* ── Gantt grid ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-8 pb-6">
        <div style={{ display:'grid', gridTemplateColumns:`${LEFT}px 1fr`, minWidth:LEFT+timelineW }}>

          {/* Month header */}
          <div className="sticky left-0 z-20 bg-slate-950 border-b border-r border-slate-700 flex items-end px-4 pb-2" style={{height:HEAD}}>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Subcontractor</span>
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

          {/* Subcontractor rows */}
          {activeSubs.map(sub => {
            const summary = subSummaries[sub.id];
            const isOpen  = expanded.has(sub.id);
            const subPhases = subPhasesMap[sub.id] || [];
            const b = summary ? barFor(summary.earliest, summary.latest, 30, SUB_ROW) : null;
            const hasCritical = subPhases.some(p => p.critical);

            return [
              // ── Sub summary row ──────────────────────────────────────
              <div
                key={`sub-lbl-${sub.id}`}
                className="sticky left-0 z-10 bg-slate-900 border-b border-r border-slate-700 flex items-center gap-3 px-4 cursor-pointer hover:bg-slate-800/60 transition-colors select-none"
                style={{height:SUB_ROW}}
                onClick={() => toggleExpand(sub.id)}
              >
                <span className={`text-slate-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M6 3l5 5-5 5V3z"/></svg>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {hasCritical && <span className="text-red-400 text-xs">★</span>}
                    <span className="text-sm font-semibold text-slate-100 truncate">{sub.name}</span>
                  </div>
                  {summary && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {summary.phaseCount} phase{summary.phaseCount!==1?'s':''} · <span className="text-amber-400 font-semibold">{summary.totalDays}d</span> on site
                    </div>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); openModal(sub.id, null); }}
                  className="text-slate-600 hover:text-amber-400 hover:bg-slate-700 rounded p-1 transition-colors flex-shrink-0"
                  title="Add phase"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z"/></svg>
                </button>
              </div>,
              <div
                key={`sub-row-${sub.id}`}
                className="border-b border-slate-700 relative bg-slate-900/40 cursor-pointer"
                style={{height:SUB_ROW,width:timelineW}}
                onClick={() => toggleExpand(sub.id)}
              >
                <TimelineBg/>
                {b && (
                  <div
                    className="absolute rounded"
                    style={{left:b.left,width:b.width,height:b.height,top:b.top,
                      backgroundColor: hasCritical ? '#dc2626' : '#d97706',opacity:0.55}}
                    title={`${summary.earliest} → ${summary.latest} · ${summary.totalDays} distinct days`}
                  >
                    {b.width > 60 && (
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-bold text-white/90 select-none">
                        {summary.totalDays}d
                      </span>
                    )}
                  </div>
                )}
              </div>,

              // ── Phase rows (visible when expanded) ────────────────────
              ...(isOpen ? subPhases.map(phase => {
                const st  = computeStatus(phase);
                const stCol = STATUS_COLOR[st];
                const hasBar = phase.planned_start && phase.planned_end;
                const pb = hasBar ? barFor(phase.planned_start, phase.planned_end, 24, PHASE_ROW) : null;
                const zones = phase.zoneList || [];

                return [
                  <div key={`ph-lbl-${phase.id}`} className="sticky left-0 z-10 bg-slate-950 border-b border-r border-slate-800 flex items-center gap-2 px-4 pl-10 group" style={{height:PHASE_ROW}}>
                    {phase.critical ? <span className="text-red-400 text-xs flex-shrink-0">★</span> : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{backgroundColor:stCol}}/>}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-200 truncate">{phase.name}</div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {zones.slice(0,4).map(z => (
                          <span key={z} className="text-xs px-1 rounded bg-slate-800 text-slate-500" title={zoneLabels[z] || z}>{z}</span>
                        ))}
                        {zones.length > 4 && <span className="text-xs text-slate-600">+{zones.length-4}</span>}
                        {phase.planned_start && <span className="text-xs text-slate-600">{phase.planned_start.slice(5)} → {(phase.planned_end||'').slice(5)}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => openModal(sub.id, phase)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 p-0.5 rounded transition-all flex-shrink-0"
                      title="Edit phase"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M11.013 1.427a1.75 1.75 0 012.474 2.474L5.648 11.74a.75.75 0 01-.364.201l-3.498.873a.75.75 0 01-.909-.909l.873-3.498a.75.75 0 01.201-.364L11.013 1.427z"/></svg>
                    </button>
                  </div>,
                  <div key={`ph-row-${phase.id}`} className="border-b border-slate-800/60 relative" style={{height:PHASE_ROW,width:timelineW,backgroundColor:'rgba(15,23,42,0.5)'}}>
                    <TimelineBg/>
                    {pb && <>
                      <div className="absolute rounded-sm cursor-pointer" onClick={() => setPanel({ phase, sub })}
                        style={{left:pb.left,width:pb.width,height:pb.height,top:pb.top,backgroundColor:phase.critical?'#dc2626':stCol,opacity:0.18}}/>
                      <div className="absolute rounded-sm cursor-pointer flex items-center px-2" onClick={() => setPanel({ phase, sub })}
                        style={{left:pb.left,width:pb.width,height:pb.height,top:pb.top,backgroundColor:phase.critical?'#dc2626':stCol,opacity:0.78}}>
                        {pb.width>56 && <span className="text-xs text-white/90 select-none truncate">{STATUS_LABEL[st]}</span>}
                      </div>
                    </>}
                    {!pb && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600 italic">No dates</div>}
                  </div>,
                ];
              }) : []),
            ];
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-4 text-xs text-slate-500 flex-wrap">
          {Object.entries(STATUS_COLOR).map(([st,c]) => (
            <div key={st} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:c}}/>{STATUS_LABEL[st]}</div>
          ))}
          <div className="flex items-center gap-1.5"><span className="text-red-400">★</span> Critical path</div>
          <div className="ml-auto text-slate-600">Click subcontractor row to expand · bar click → details</div>
        </div>
      </div>

      {/* ── Phase Detail Panel ──────────────────────────────────────────── */}
      {panel && (
        <PhaseDetailPanel
          phase={panel.phase}
          sub={panel.sub}
          onClose={() => setPanel(null)}
          onEdit={(subId, ph) => { setPanel(null); openModal(subId, ph); }}
          onChanged={load}
        />
      )}

      {/* ── Edit / Add Phase Modal ──────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">

            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-100">{modal.phase ? 'Edit Phase' : 'Add Phase'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{subs.find(s=>s.id===modal.subId)?.name}</p>
              </div>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <form onSubmit={handleSavePhase} id="phaseForm" className="space-y-3">

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phase name *</label>
                  <input required className={`w-full ${inputCls}`} value={phaseForm.name}
                    onChange={e=>setPhaseForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Σοβάς Α ορόφου"/>
                </div>

                {/* Zones multi-select */}
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Zones</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {ALL_ZONES.map(z => {
                      const selected = modalZones.find(mz => mz.zone === z);
                      return (
                        <button type="button" key={z} onClick={() => toggleModalZone(z)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors border ${
                            selected ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                                     : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                          }`}
                          title={zoneLabels[z] || z}
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
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!phaseForm.critical} onChange={e=>setPhaseForm(p=>({...p,critical:e.target.checked?1:0}))}
                        className="accent-red-500 w-4 h-4"/>
                      <span className="text-xs text-slate-400">Critical path ★</span>
                    </label>
                  </div>
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

                {/* Notes — fixes Task 2: notes were missing from modal, causing saves to erase them */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Notes</label>
                  <textarea rows={3}
                    className={`w-full ${inputCls} resize-none`}
                    placeholder="Construction notes, constraints, hold points…"
                    value={phaseForm.notes}
                    onChange={e=>setPhaseForm(p=>({...p,notes:e.target.value}))}
                  />
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
                  {saving ? 'Saving…' : modal.phase ? 'Save changes' : 'Add Phase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
