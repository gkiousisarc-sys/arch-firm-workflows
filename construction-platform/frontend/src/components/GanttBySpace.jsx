import { useState, useEffect, useCallback } from 'react';
import { getAllPhaseZones, getHolidays, getPhases } from '../api';
import PhaseDetailPanel from './PhaseDetailPanel';

const PX   = 14;
const HEAD = 52;
const ZONE_ROW  = 44;
const PHASE_ROW = 36;
const LEFT = 260;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ZONE_ORDER = ['B0','L1','L2','L3','L4','STAIR','LIFT','ROOF','EXTERIOR-FRONT','EXTERIOR-BACK'];

const STATUS_COLOR = { not_started:'#475569', in_progress:'#0284c7', complete:'#059669', delayed:'#dc2626' };
const STATUS_LABEL = { not_started:'Not started', in_progress:'In progress', complete:'Complete', delayed:'Delayed' };
const TRADE_COLORS = {
  'Concrete & Formwork':'#d97706','Steel Reinforcement':'#9ca3af','Masonry':'#92400e',
  'Plumbing':'#0284c7','Electrical':'#ca8a04','Plastering':'#64748b',
  'Tiling':'#7c3aed','Carpentry':'#78350f','Aluminum Works':'#475569',
  'Marble & Stone':'#8b5cf6','Waterproofing':'#1e40af','Elevator':'#047857',
  'Painting':'#dc2626','Insulation':'#ea580c','Other':'#4b5563',
};

function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

export default function GanttBySpace() {
  const [zoneRows, setZoneRows] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [phases, setPhases]     = useState([]);
  const [panel, setPanel]       = useState(null);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(() =>
    Promise.all([getAllPhaseZones(), getHolidays(), getPhases()])
      .then(([zr, h, ph]) => { setZoneRows(zr); setHolidays(h); setPhases(ph); })
      .finally(() => setLoading(false))
  , []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading…</div>;

  if (zoneRows.length === 0) return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Gantt by Zone</h1>
      <p className="text-slate-400 text-sm">Assign zones to phases in the Gantt by Sub view (click a phase bar → Zone Assignments).</p>
    </div>
  );

  // Build zone → zoneRows map
  const zoneMap = {};
  for (const row of zoneRows) {
    if (!zoneMap[row.zone]) zoneMap[row.zone] = [];
    zoneMap[row.zone].push(row);
  }

  // Order zones
  const orderedZones = [
    ...ZONE_ORDER.filter(z => zoneMap[z]),
    ...Object.keys(zoneMap).filter(z => !ZONE_ORDER.includes(z)),
  ];

  // Timeline range from all rows
  const withDates = zoneRows.filter(r => r.planned_start && r.planned_end);
  if (withDates.length === 0) return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Gantt by Zone</h1>
      <p className="text-slate-400 text-sm">Phases need planned dates to appear on the chart.</p>
    </div>
  );

  const allD = withDates.flatMap(r => [new Date(r.planned_start), new Date(r.planned_end)]);
  const rawStart   = new Date(Math.min(...allD));
  const rawEnd     = new Date(Math.max(...allD));
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

  const hMarkers = holidays.map(h => ({ ...h, left: daysBetween(rangeStart,new Date(h.date))*PX })).filter(h => h.left>=0&&h.left<=timelineW);
  const today    = new Date();
  const todayLeft = today>=rangeStart&&today<=rangeEnd ? daysBetween(rangeStart,today)*PX : null;

  function barFor(r) {
    const left  = daysBetween(rangeStart, new Date(r.planned_start)) * PX;
    const width = Math.max(daysBetween(new Date(r.planned_start), new Date(r.planned_end)) * PX, 4);
    return { left, width };
  }

  function TimelineBg() {
    return <>
      {months.map((m,i) => <div key={i} className="absolute top-0 bottom-0 border-l border-slate-800/80" style={{left:m.left}}/>)}
      {hMarkers.map(h => <div key={h.date} className="absolute top-0 bottom-0 w-px" style={{left:h.left,backgroundColor:'rgba(245,158,11,0.18)'}} title={`${h.name} (${h.date})`}/>)}
      {todayLeft!==null && <div className="absolute top-0 bottom-0 w-px bg-red-500/40 z-10" style={{left:todayLeft}}/>}
    </>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-5 border-b border-slate-800 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-100">Gantt by Zone</h1>
        <p className="text-slate-400 text-sm mt-1">
          {orderedZones.length} zone{orderedZones.length!==1?'s':''} · {zoneRows.length} assignment{zoneRows.length!==1?'s':''} · bars colored by per-zone status
        </p>
      </div>

      <div className="flex-1 overflow-auto px-8 pb-6">
        <div style={{ display:'grid', gridTemplateColumns:`${LEFT}px 1fr`, minWidth:LEFT+timelineW }}>

          {/* Header */}
          <div className="sticky left-0 z-20 bg-slate-950 border-b border-r border-slate-700 flex items-end px-4 pb-2" style={{height:HEAD}}>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Zone / Phase</span>
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

          {orderedZones.map(zone => {
            const rows = zoneMap[zone];
            const rowsWithDates = rows.filter(r => r.planned_start && r.planned_end);
            // Zone extent
            const zStarts = rowsWithDates.map(r => r.planned_start).sort();
            const zEnds   = rowsWithDates.map(r => r.planned_end).sort().reverse();
            const zExtLeft  = zStarts[0] ? daysBetween(rangeStart, new Date(zStarts[0])) * PX : null;
            const zExtWidth = zStarts[0] && zEnds[0] ? Math.max(daysBetween(new Date(zStarts[0]), new Date(zEnds[0])) * PX, 4) : null;
            const avgPct = rows.length ? Math.round(rows.reduce((s, r) => s + (r.progress||0), 0) / rows.length) : 0;

            return [
              // Zone header label
              <div key={`zh-lbl-${zone}`} className="sticky left-0 z-10 bg-slate-900/90 border-b border-r border-slate-700 flex items-center gap-3 px-4" style={{height:ZONE_ROW}}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-100">{zone}</div>
                  <div className="text-xs text-slate-500">{rows.length} phase{rows.length!==1?'s':''} · {avgPct}% avg</div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{
                  backgroundColor: avgPct>=100?'#05966922':avgPct>=60?'#0284c722':avgPct>0?'#d9770622':'#47556922',
                  color: avgPct>=100?'#059669':avgPct>=60?'#0284c7':avgPct>0?'#d97706':'#475569',
                }}>{avgPct}%</div>
              </div>,
              // Zone header timeline
              <div key={`zh-row-${zone}`} className="border-b border-slate-700 relative bg-slate-900/40" style={{height:ZONE_ROW,width:timelineW}}>
                <TimelineBg/>
                {zExtLeft!==null && <div className="absolute rounded-sm" style={{left:zExtLeft,width:zExtWidth,height:20,top:(ZONE_ROW-20)/2,backgroundColor:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}/>}
              </div>,

              // Phase rows
              ...rows.map(r => {
                const stCol = STATUS_COLOR[r.status] || '#475569';
                const tradeColor = TRADE_COLORS[r.trade] || '#4b5563';
                const hasBar = r.planned_start && r.planned_end;
                const b = hasBar ? barFor(r) : null;
                const pct = r.progress || 0;
                const fullPhase = phases.find(p => p.id === r.phase_id);

                return [
                  <div key={`pl-${r.id}`} className="sticky left-0 z-10 bg-slate-950 border-b border-r border-slate-800 flex items-center gap-2 px-4 pl-10 group" style={{height:PHASE_ROW}}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{backgroundColor:stCol}}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-300 truncate">{r.phase_name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1 h-1 rounded-full" style={{backgroundColor:tradeColor}}/>
                        <span className="text-xs text-slate-600 truncate">{r.sub_name}</span>
                      </div>
                    </div>
                    {pct>0 && <span className="text-xs text-slate-500 flex-shrink-0">{pct}%</span>}
                    <button
                      onClick={() => setPanel({ phase: fullPhase || r, sub: { id: r.subcontractor_id, name: r.sub_name, trade: r.trade } })}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-slate-300 p-0.5 rounded transition-all ml-1"
                      title="Details"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z"/></svg>
                    </button>
                  </div>,
                  <div key={`pr-${r.id}`} className="border-b border-slate-800/60 relative" style={{height:PHASE_ROW,width:timelineW,backgroundColor:'rgba(15,23,42,0.5)'}}>
                    <TimelineBg/>
                    {b && <>
                      {/* track */}
                      <div className="absolute rounded-sm cursor-pointer" onClick={() => setPanel({ phase: fullPhase || r, sub: { id: r.subcontractor_id, name: r.sub_name, trade: r.trade } })} style={{left:b.left,width:b.width,height:26,top:(PHASE_ROW-26)/2,backgroundColor:stCol,opacity:0.18}}/>
                      {/* progress fill */}
                      {pct>0 && <div className="absolute rounded-sm pointer-events-none" style={{left:b.left,width:b.width*(pct/100),height:26,top:(PHASE_ROW-26)/2,backgroundColor:stCol,opacity:0.85}}/>}
                      {/* full clickable bar */}
                      <div className="absolute rounded-sm cursor-pointer flex items-center px-2" onClick={() => setPanel({ phase: fullPhase || r, sub: { id: r.subcontractor_id, name: r.sub_name, trade: r.trade } })} style={{left:b.left,width:b.width,height:26,top:(PHASE_ROW-26)/2}}>
                        {b.width>50 && <span className="text-xs text-white/75 select-none truncate">{STATUS_LABEL[r.status]}</span>}
                      </div>
                    </>}
                    {!b && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600 italic">No dates</div>}
                  </div>,
                ];
              }),
            ];
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-4 text-xs text-slate-500 flex-wrap">
          {Object.entries(STATUS_COLOR).map(([st,c]) => (
            <div key={st} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:c}}/>{STATUS_LABEL[st]}</div>
          ))}
          <div className="flex items-center gap-1.5"><div className="w-4 h-2 rounded-sm bg-amber-500/25"/>Holiday</div>
          {todayLeft!==null&&<div className="flex items-center gap-1.5"><div className="w-px h-3 bg-red-500/60"/>Today</div>}
          <div className="ml-auto text-slate-600">Click bar → details panel · Status = per-zone assignment status</div>
        </div>
      </div>

      {/* Phase detail panel */}
      {panel && (
        <PhaseDetailPanel
          phase={panel.phase}
          sub={panel.sub}
          onClose={() => setPanel(null)}
          onEdit={() => setPanel(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
