import { useState, useEffect } from 'react';
import { getSubcontractors, createSubcontractor, updateSubcontractor, deleteSubcontractor } from '../api';

const TRADES = [
  'Concrete & Formwork', 'Steel Reinforcement', 'Masonry', 'Plumbing', 'Electrical',
  'Plastering', 'Tiling', 'Carpentry', 'Aluminum Works', 'Marble & Stone',
  'Waterproofing', 'Elevator', 'Painting', 'Insulation', 'Other',
];

const CONTRACT_TYPES = ['Daily Rate', 'Fixed Price', 'm² Rate'];

const ZONES = ['B0', 'L1', 'L2', 'L3', 'L4', 'STAIR', 'LIFT', 'ROOF'];

const TRADE_COLORS = {
  'Concrete & Formwork': '#d97706', 'Steel Reinforcement': '#9ca3af', 'Masonry': '#92400e',
  'Plumbing': '#0284c7', 'Electrical': '#ca8a04', 'Plastering': '#64748b',
  'Tiling': '#7c3aed', 'Carpentry': '#78350f', 'Aluminum Works': '#475569',
  'Marble & Stone': '#8b5cf6', 'Waterproofing': '#1e40af', 'Elevator': '#047857',
  'Painting': '#dc2626', 'Insulation': '#ea580c', 'Other': '#4b5563',
};

const EMPTY_FORM = {
  name: '', trade: TRADES[0], contact_person: '', phone: '',
  contract_type: CONTRACT_TYPES[0], rate: '', assigned_zones: [],
  planned_start: '', planned_end: '', delay_buffer: 10,
};

const inputCls = 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500 transition-colors';
const labelCls = 'block text-sm font-medium text-slate-300 mb-1.5';

export default function SubcontractorRegistry() {
  const [subs, setSubs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  const reload = () => getSubcontractors().then(setSubs).finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(sub) {
    setForm({
      name: sub.name, trade: sub.trade, contact_person: sub.contact_person,
      phone: sub.phone, contract_type: sub.contract_type, rate: sub.rate,
      assigned_zones: sub.assigned_zones || [], planned_start: sub.planned_start,
      planned_end: sub.planned_end, delay_buffer: sub.delay_buffer,
    });
    setEditingId(sub.id);
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditingId(null); }

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function toggleZone(code) {
    setForm(p => ({
      ...p,
      assigned_zones: p.assigned_zones.includes(code)
        ? p.assigned_zones.filter(z => z !== code)
        : [...p.assigned_zones, code],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, rate: parseFloat(form.rate) || 0, delay_buffer: parseFloat(form.delay_buffer) || 10 };
      if (editingId) await updateSubcontractor(editingId, payload);
      else await createSubcontractor(payload);
      closeForm();
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this subcontractor?')) return;
    await deleteSubcontractor(id);
    await reload();
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Subcontractors</h1>
            <p className="text-slate-400 text-sm mt-1">{subs.length} registered</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/></svg>
            Add Subcontractor
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-slate-500 text-sm py-12 text-center">Loading…</div>
        ) : subs.length === 0 ? (
          <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-16 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-slate-600 mx-auto mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
            </svg>
            <p className="text-slate-400 font-medium mb-1">No subcontractors yet</p>
            <p className="text-slate-600 text-sm">Click "Add Subcontractor" to start building your registry.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  {['Trade', 'Name', 'Contract', 'Rate', 'Zones', 'Schedule', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {subs.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: TRADE_COLORS[s.trade] || '#4b5563' }}
                        />
                        <span className="text-slate-300 text-xs">{s.trade}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{s.name}</div>
                      {s.contact_person && <div className="text-xs text-slate-500 mt-0.5">{s.contact_person}{s.phone ? ` · ${s.phone}` : ''}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{s.contract_type}</td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">
                      {s.rate ? `€${Number(s.rate).toLocaleString('el-GR')}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.assigned_zones || []).map(z => (
                          <span key={z} className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded">{z}</span>
                        ))}
                        {!s.assigned_zones?.length && <span className="text-slate-600">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {s.planned_start && s.planned_end ? (
                        <div className="text-slate-400">
                          <div>{s.planned_start}</div>
                          <div className="text-slate-600">→ {s.planned_end}</div>
                        </div>
                      ) : (
                        <span className="text-slate-600">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(s)}
                          className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1.5 rounded transition-colors"
                          title="Edit"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z"/>
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-slate-500 hover:text-red-400 hover:bg-red-900/20 p-1.5 rounded transition-colors"
                          title="Remove"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">
                {editingId ? 'Edit Subcontractor' : 'Add Subcontractor'}
              </h2>
              <button onClick={closeForm} className="text-slate-500 hover:text-slate-300 transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Name / Company *</label>
                  <input required className={inputCls} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Dimitriou Construction" />
                </div>
                <div>
                  <label className={labelCls}>Trade</label>
                  <select className={inputCls} value={form.trade} onChange={e => setField('trade', e.target.value)}>
                    {TRADES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Contract Type</label>
                  <select className={inputCls} value={form.contract_type} onChange={e => setField('contract_type', e.target.value)}>
                    {CONTRACT_TYPES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Contact Person</label>
                  <input className={inputCls} value={form.contact_person} onChange={e => setField('contact_person', e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+30 6900 000000" />
                </div>
                <div>
                  <label className={labelCls}>Rate / Price (€)</label>
                  <input type="number" min="0" step="0.01" className={inputCls} value={form.rate} onChange={e => setField('rate', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Delay Buffer (%)</label>
                  <input type="number" min="0" max="100" step="1" className={inputCls} value={form.delay_buffer} onChange={e => setField('delay_buffer', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Planned Start</label>
                  <input type="date" className={inputCls} value={form.planned_start} onChange={e => setField('planned_start', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Planned End</label>
                  <input type="date" className={inputCls} value={form.planned_end} onChange={e => setField('planned_end', e.target.value)} />
                </div>
              </div>

              {/* Zone assignment */}
              <div>
                <label className={labelCls}>Assigned Zones</label>
                <div className="flex flex-wrap gap-2">
                  {ZONES.map(code => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleZone(code)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                        form.assigned_zones.includes(code)
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                <button type="button" onClick={closeForm} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
                >
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Add Subcontractor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
