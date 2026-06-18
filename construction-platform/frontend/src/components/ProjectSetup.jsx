import { useState, useEffect } from 'react';
import { getProject, updateProject, updateZones } from '../api';

const inputCls = 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500 transition-colors';
const labelCls = 'block text-sm font-medium text-slate-300 mb-1.5';

export default function ProjectSetup({ onSaved }) {
  const [info, setInfo]       = useState({ name: '', address: '', start_date: '', budget: '' });
  const [zones, setZones]     = useState([]);
  const [saving, setSaving]   = useState(null); // 'info' | 'zones' | null
  const [flash, setFlash]     = useState(null); // 'info' | 'zones' | null

  useEffect(() => {
    getProject().then(p => {
      setInfo({ name: p.name || '', address: p.address || '', start_date: p.start_date || '', budget: p.budget || '' });
      setZones(p.zones || []);
    });
  }, []);

  function showFlash(key) {
    setFlash(key);
    setTimeout(() => setFlash(null), 2500);
  }

  async function handleSaveInfo(e) {
    e.preventDefault();
    setSaving('info');
    try {
      await updateProject({ ...info, budget: parseFloat(info.budget) || 0 });
      onSaved(info.name);
      showFlash('info');
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveZones(e) {
    e.preventDefault();
    setSaving('zones');
    try {
      await updateZones(zones);
      showFlash('zones');
    } finally {
      setSaving(null);
    }
  }

  function setZoneField(id, field, value) {
    setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z));
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Project Setup</h1>
          <p className="text-slate-400 text-sm mt-1">Configure the project details and building zone areas.</p>
        </div>

        {/* Project information */}
        <form onSubmit={handleSaveInfo} className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-slate-100">Project Information</h2>
            {flash === 'info' && <span className="text-xs text-emerald-400 font-medium">✓ Saved</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Project Name</label>
              <input
                className={inputCls}
                placeholder="e.g. Kifissia Residential"
                value={info.name}
                onChange={e => setInfo(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Site Address</label>
              <input
                className={inputCls}
                placeholder="Street, City"
                value={info.address}
                onChange={e => setInfo(p => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Construction Start Date</label>
              <input
                type="date"
                className={inputCls}
                value={info.start_date}
                onChange={e => setInfo(p => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Total Project Budget (€)</label>
              <input
                type="number"
                min="0"
                step="1000"
                className={inputCls}
                placeholder="0"
                value={info.budget}
                onChange={e => setInfo(p => ({ ...p, budget: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving === 'info'}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              {saving === 'info' ? 'Saving…' : 'Save Project Info'}
            </button>
          </div>
        </form>

        {/* Building zones */}
        <form onSubmit={handleSaveZones} className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Building Zones</h2>
              <p className="text-xs text-slate-500 mt-0.5">Enter the dimensions for each zone of the building.</p>
            </div>
            {flash === 'zones' && <span className="text-xs text-emerald-400 font-medium">✓ Saved</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Zone', 'Description', 'Floor Area (m²)', 'Ceiling Height (m)', 'Slab Area (m²)', 'Materials Notes'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide pb-3 pr-4 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {zones.map(z => (
                  <tr key={z.id}>
                    <td className="py-3 pr-4">
                      <span className="bg-amber-500/15 text-amber-400 text-xs font-bold px-2 py-1 rounded">{z.code}</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{z.label}</td>
                    <td className="py-3 pr-4">
                      <input
                        type="number" min="0" step="0.1"
                        className="w-28 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                        value={z.floor_area || ''}
                        placeholder="0"
                        onChange={e => setZoneField(z.id, 'floor_area', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number" min="0" step="0.05"
                        className="w-28 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                        value={z.ceiling_height || ''}
                        placeholder="0"
                        onChange={e => setZoneField(z.id, 'ceiling_height', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number" min="0" step="0.1"
                        className="w-28 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                        value={z.slab_area || ''}
                        placeholder="0"
                        onChange={e => setZoneField(z.id, 'slab_area', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="text"
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                        value={z.materials_notes || ''}
                        placeholder="—"
                        onChange={e => setZoneField(z.id, 'materials_notes', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-5">
            <button
              type="submit"
              disabled={saving === 'zones'}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              {saving === 'zones' ? 'Saving…' : 'Save Zone Areas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
