import { useState, useEffect, useCallback, useRef } from 'react';
import { getOrderTasks, setOrderTask, updateOrderNotes } from '../api';

const ORDER_TASKS = [
  { key:'order',     label:'Order',     desc:'Placed with supplier' },
  { key:'resources', label:'Resources', desc:'Materials confirmed available' },
  { key:'payment',   label:'Payment',   desc:'Payment made or scheduled' },
  { key:'delivery',  label:'Delivery',  desc:'Delivered to site' },
];

const STATUS_STYLE = {
  'Ordered':    'bg-slate-500/25 text-slate-400',
  'Confirmed':  'bg-sky-500/25 text-sky-400',
  'In Transit': 'bg-amber-500/25 text-amber-400',
  'Delivered':  'bg-emerald-500/25 text-emerald-400',
  'Installed':  'bg-teal-500/25 text-teal-400',
  'Cancelled':  'bg-red-500/25 text-red-400',
};

export default function OrderDetailPanel({ order, onClose, onChanged }) {
  const [tasks, setTasks]         = useState([]);
  const [notes, setNotes]         = useState('');
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [saving, setSaving]       = useState(false);
  const notesRef                  = useRef('');

  const load = useCallback(() => {
    if (!order) return;
    getOrderTasks(order.id).then(setTasks);
    const n = order.notes || '';
    setNotes(n);
    notesRef.current = n;
    setNotesLoaded(true);
  }, [order]);

  useEffect(() => { load(); }, [load]);

  async function toggleTask(type) {
    const cur    = tasks.find(t => t.task_type === type);
    const newDone = cur ? !cur.done : true;
    setTasks(prev => prev.map(t => t.task_type === type ? { ...t, done: newDone ? 1 : 0 } : t));
    await setOrderTask(order.id, type, newDone);
    onChanged?.();
  }

  async function saveNotes() {
    if (!notesLoaded || notes === notesRef.current) return;
    notesRef.current = notes;
    setSaving(true);
    try { await updateOrderNotes(order.id, notes); }
    finally { setSaving(false); }
  }

  if (!order) return null;

  const badge    = STATUS_STYLE[order.status] || STATUS_STYLE['Ordered'];
  const doneCnt  = tasks.filter(t => t.done).length;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}/>
      <div className="fixed top-0 right-0 bottom-0 z-50 w-96 bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm flex-shrink-0 bg-emerald-500/60"/>
                <h2 className="text-base font-semibold text-slate-100 truncate">{order.material}</h2>
              </div>
              <div className="text-xs text-slate-500 mt-1 pl-4">
                {order.supplier_name || 'No supplier assigned'}
                {order.subcontractor_name ? ` · for ${order.subcontractor_name}` : ''}
              </div>
              <div className="mt-2 pl-4 flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>{order.status}</span>
                {doneCnt > 0 && <span className="text-xs text-slate-500">{doneCnt}/{ORDER_TASKS.length} tasks done</span>}
                {order.delivery_alert && <span className="text-xs text-red-400 font-medium">⚠ delivery conflict</span>}
                {order.days_late > 0 && <span className="text-xs text-red-400 font-medium">{order.days_late}d late</span>}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Order details */}
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Details</h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              {order.quantity && <>
                <div className="text-slate-500">Quantity</div>
                <div className="text-slate-300">{order.quantity}{order.unit ? ` ${order.unit}` : ''}</div>
              </>}
              {order.unit_price > 0 && <>
                <div className="text-slate-500">Unit price</div>
                <div className="text-slate-300">€{Number(order.unit_price).toLocaleString('en-GR', {minimumFractionDigits:2})}</div>
              </>}
              {order.order_date && <>
                <div className="text-slate-500">Ordered</div>
                <div className="text-slate-300">{order.order_date}</div>
              </>}
              {order.confirmed_delivery && <>
                <div className="text-slate-500">Confirmed delivery</div>
                <div className={order.delivery_alert ? 'text-red-400 font-medium' : 'text-slate-300'}>{order.confirmed_delivery}</div>
              </>}
              {order.actual_delivery && <>
                <div className="text-slate-500">Arrived</div>
                <div className={order.days_late > 0 ? 'text-red-400 font-medium' : 'text-emerald-400'}>
                  {order.actual_delivery}{order.days_late > 0 ? ` (+${order.days_late}d)` : ''}
                </div>
              </>}
              {order.installation_start && <>
                <div className="text-slate-500">Installation start</div>
                <div className="text-slate-300">{order.installation_start}</div>
              </>}
            </div>
          </div>

          {/* Checklist */}
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Checklist</h3>
            <div className="space-y-1.5">
              {ORDER_TASKS.map(({ key, label, desc }) => {
                const taskState = tasks.find(t => t.task_type === key);
                const done      = taskState?.done === 1;
                return (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-800/60 transition-colors">
                    <div
                      onClick={() => toggleTask(key)}
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-slate-400 bg-slate-800'
                      }`}
                    >
                      {done && <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div className="flex-1" onClick={() => toggleTask(key)}>
                      <div className={`text-sm transition-colors ${done ? 'line-through text-slate-600' : 'text-slate-300 group-hover:text-slate-200'}`}>{label}</div>
                      <div className={`text-xs transition-colors ${done ? 'text-slate-700' : 'text-slate-600'}`}>{desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes</h3>
              {saving && <span className="text-xs text-slate-600">Saving…</span>}
            </div>
            <textarea
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
              placeholder="Notes about this order, delivery instructions, contact info…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
            />
          </div>
        </div>
      </div>
    </>
  );
}
