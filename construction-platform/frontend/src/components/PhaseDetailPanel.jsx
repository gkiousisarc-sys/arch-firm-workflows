import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPhaseZones, setPhaseZones, patchPhaseZone,
  getPhaseTasks, setPhaseTask,
  updatePhaseNotes,
} from '../api';

const ALL_ZONES = ['B0','L1','L2','L3','L4','STAIR','LIFT','ROOF','EXTERIOR-FRONT','EXTERIOR-BACK'];
const STATUS_COLOR = { not_started:'#475569', in_progress:'#0284c7', complete:'#059669', delayed:'#dc2626' };
const STATUS_LABEL = { not_started:'Not started', in_progress:'In progress', complete:'Complete', delayed:'Delayed' };

const TASKS = [
  { key:'blueprint',      label:'Blueprint' },
  { key:'approval',       label:'Approval' },
  { key:'order_delivery', label:'Order / Delivery' },
  { key:'deal',           label:'Deal' },
  { key:'contract',       label:'Contract' },
];

function computeStatus(phase) {
  if (!phase) return 'not_started';
  if (phase.progress >= 100) return 'complete';
  const today = new Date().toISOString().slice(0, 10);
  if (phase.planned_end && today > phase.planned_end) return 'delayed';
  if (phase.progress > 0 || phase.status === 'in_progress') return 'in_progress';
  return 'not_started';
}

const inputCls = 'bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500';

// ── Main component ────────────────────────────────────────────────────────
export default function PhaseDetailPanel({ phase, sub, onClose, onEdit, onChanged }) {
  const [zones, setZones]     = useState([]); // [{ zone, status }]
  const [tasks, setTasks]     = useState([]); // [{ task_type, done }]
  const [notes, setNotes]     = useState('');
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [saving, setSaving]   = useState(false);
  const notesRef              = useRef('');

  const open = !!phase;

  const load = useCallback(() => {
    if (!phase) return;
    Promise.all([getPhaseZones(phase.id), getPhaseTasks(phase.id)]).then(([z, t]) => {
      setZones(z);
      setTasks(t);
    });
    const n = phase.notes || '';
    setNotes(n);
    notesRef.current = n;
    setNotesLoaded(true);
  }, [phase]);

  useEffect(() => { load(); }, [load]);

  // ── Zone assignment ─────────────────────────────────────────────────────
  async function toggleZone(zone) {
    const exists = zones.find(z => z.zone === zone);
    let next;
    if (exists) {
      next = zones.filter(z => z.zone !== zone);
    } else {
      next = [...zones, { zone, status: 'not_started' }];
    }
    setZones(next);
    await setPhaseZones(phase.id, next);
    onChanged?.();
  }

  async function changeZoneStatus(zone, status) {
    setZones(prev => prev.map(z => z.zone === zone ? { ...z, status } : z));
    await patchPhaseZone(phase.id, zone, status);
    onChanged?.();
  }

  // ── Tasks ───────────────────────────────────────────────────────────────
  async function toggleTask(type) {
    const current = tasks.find(t => t.task_type === type);
    const newDone = current ? !current.done : true;
    setTasks(prev => prev.map(t => t.task_type === type ? { ...t, done: newDone ? 1 : 0 } : t));
    await setPhaseTask(phase.id, type, newDone);
    onChanged?.();
  }

  // ── Notes ───────────────────────────────────────────────────────────────
  async function saveNotes() {
    if (!notesLoaded) return;
    if (notes === notesRef.current) return;
    notesRef.current = notes;
    setSaving(true);
    try { await updatePhaseNotes(phase.id, notes); }
    finally { setSaving(false); }
  }

  if (!phase) return null;

  const st    = computeStatus(phase);
  const stCol = STATUS_COLOR[st];
  const assignedSet = new Set(zones.map(z => z.zone));
  const doneTasks   = tasks.filter(t => t.done).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose}/>

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-96 bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stCol }}/>
                <h2 className="text-base font-semibold text-slate-100 truncate">{phase.name}</h2>
              </div>
              <div className="text-xs text-slate-500 mt-1 pl-4">
                {sub?.name} · {sub?.trade}
              </div>
              {(phase.planned_start || phase.planned_end) && (
                <div className="text-xs text-slate-500 mt-0.5 pl-4">
                  {phase.planned_start} → {phase.planned_end}
                </div>
              )}
              <div className="mt-2 pl-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${stCol}22`, color: stCol }}>
                  {STATUS_LABEL[st]}
                </span>
                {phase.progress > 0 && (
                  <span className="text-xs text-amber-400">{phase.progress}%</span>
                )}
                {doneTasks > 0 && (
                  <span className="text-xs text-slate-500">{doneTasks}/{TASKS.length} tasks done</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => onEdit(sub?.id, phase)}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-lg transition-colors"
              >Edit</button>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Zone assignments */}
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Zone Assignments</h3>

            {/* Zone pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ALL_ZONES.map(zone => {
                const assigned = assignedSet.has(zone);
                return (
                  <button
                    key={zone}
                    onClick={() => toggleZone(zone)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors border ${
                      assigned
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                    }`}
                  >{zone}</button>
                );
              })}
            </div>

            {/* Per-zone status dropdowns */}
            {zones.length > 0 && (
              <div className="space-y-2">
                {zones.sort((a, b) => a.zone.localeCompare(b.zone)).map(({ zone, status }) => (
                  <div key={zone} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-24 flex-shrink-0">{zone}</span>
                    <select
                      value={status}
                      onChange={e => changeZoneStatus(zone, e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      style={{ color: STATUS_COLOR[status] }}
                    >
                      {Object.entries(STATUS_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLOR[status] }}/>
                  </div>
                ))}
              </div>
            )}

            {zones.length === 0 && (
              <p className="text-xs text-slate-600 italic">No zones assigned. Click a zone above to assign.</p>
            )}
          </div>

          {/* Notes */}
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes</h3>
              {saving && <span className="text-xs text-slate-600">Saving…</span>}
            </div>
            <textarea
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
              placeholder="Add notes, instructions, or observations visible to all team members…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
            />
          </div>

          {/* Pending task checkboxes */}
          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Checklist</h3>
            <div className="space-y-2">
              {TASKS.map(({ key, label }) => {
                const taskState = tasks.find(t => t.task_type === key);
                const done = taskState?.done === 1;
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 cursor-pointer group py-1 rounded-lg px-2 -mx-2 hover:bg-slate-800/60 transition-colors"
                  >
                    <div
                      onClick={() => toggleTask(key)}
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        done
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-slate-600 hover:border-slate-400 bg-slate-800'
                      }`}
                    >
                      {done && (
                        <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span
                      onClick={() => toggleTask(key)}
                      className={`text-sm transition-colors ${done ? 'line-through text-slate-600' : 'text-slate-300 group-hover:text-slate-200'}`}
                    >{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
