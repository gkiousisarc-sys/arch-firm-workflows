import { useState, useEffect, useCallback } from 'react';
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getOrders, createOrder, updateOrder, deleteOrder,
  getSubcontractors,
} from '../api';
import OrderDetailPanel from './OrderDetailPanel';

// ── Constants ────────────────────────────────────────────────────────────
const SUPPLIER_CATEGORIES = ['Materials','Equipment','Finishing','MEP','Other'];
const PAYMENT_TERMS       = ['30 days','45 days','60 days','On delivery','Prepaid'];
const ORDER_STATUSES      = ['Ordered','Confirmed','In Transit','Delivered','Installed','Cancelled'];

const EMPTY_SUPPLIER = { name:'', category:'', contact_person:'', phone:'', email:'', payment_terms:'30 days', notes:'' };
const EMPTY_ORDER    = { supplier_id:'', subcontractor_id:'', material:'', quantity:'', unit:'', unit_price:'', order_date:'', confirmed_delivery:'', actual_delivery:'', installation_start:'', status:'Ordered', notes:'' };

const inputCls = 'bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500 w-full';
const labelCls = 'block text-xs text-slate-400 mb-1';

// ── Helpers ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const colors = {
    'Ordered'    :'bg-slate-500/25 text-slate-400',
    'Confirmed'  :'bg-sky-500/25 text-sky-400',
    'In Transit' :'bg-amber-500/25 text-amber-400',
    'Delivered'  :'bg-emerald-500/25 text-emerald-400',
    'Installed'  :'bg-teal-500/25 text-teal-400',
    'Cancelled'  :'bg-red-500/25 text-red-400',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status]||'bg-slate-500/25 text-slate-400'}`}>{status}</span>;
}

// ── Modal ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, onSubmit, saving, onDelete, deleteLabel='Delete' }) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg flex flex-col shadow-2xl max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between flex-shrink-0">
          <div>{onDelete && <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 transition-colors">{deleteLabel}</button>}</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-1.5 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={onSubmit} disabled={saving} className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Suppliers tab ─────────────────────────────────────────────────────────
function SuppliersTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [modal, setModal]         = useState(null); // { data, isNew }
  const [saving, setSaving]       = useState(false);

  const load = useCallback(() => getSuppliers().then(setSuppliers), []);
  useEffect(() => { load(); }, [load]);

  function openNew()         { setModal({ data: { ...EMPTY_SUPPLIER }, isNew: true }); }
  function openEdit(s)       { setModal({ data: { ...s }, isNew: false }); }
  function set(key, val)     { setModal(m => ({ ...m, data: { ...m.data, [key]: val } })); }

  async function handleSave() {
    setSaving(true);
    try {
      if (modal.isNew) await createSupplier(modal.data);
      else             await updateSupplier(modal.data.id, modal.data);
      await load();
      setModal(null);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this supplier?')) return;
    await deleteSupplier(modal.data.id);
    await load();
    setModal(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{suppliers.length} supplier{suppliers.length!==1?'s':''}</p>
        <button onClick={openNew} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors">+ Add Supplier</button>
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">No suppliers yet. Add your first supplier.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Category</th>
                <th className="pb-2 pr-4 font-medium">Contact</th>
                <th className="pb-2 pr-4 font-medium">Phone</th>
                <th className="pb-2 pr-4 font-medium">Payment</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-200">{s.name}</div>
                    {s.email && <div className="text-xs text-slate-500">{s.email}</div>}
                  </td>
                  <td className="py-3 pr-4 text-slate-400">{s.category||'—'}</td>
                  <td className="py-3 pr-4 text-slate-400">{s.contact_person||'—'}</td>
                  <td className="py-3 pr-4 text-slate-400">{s.phone||'—'}</td>
                  <td className="py-3 pr-4 text-slate-400">{s.payment_terms||'—'}</td>
                  <td className="py-3">
                    <button onClick={() => openEdit(s)} className="text-xs text-slate-500 hover:text-amber-400 transition-colors">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.isNew ? 'Add Supplier' : 'Edit Supplier'} onClose={() => setModal(null)} onSubmit={handleSave} saving={saving} onDelete={modal.isNew ? null : handleDelete} deleteLabel="Delete supplier">
          <div className="space-y-3">
            <div><label className={labelCls}>Supplier name *</label><input required className={inputCls} value={modal.data.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Titan Cement SA"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Category</label>
                <select className={inputCls} value={modal.data.category} onChange={e=>set('category',e.target.value)}>
                  <option value="">— select —</option>
                  {SUPPLIER_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Payment terms</label>
                <select className={inputCls} value={modal.data.payment_terms} onChange={e=>set('payment_terms',e.target.value)}>
                  {PAYMENT_TERMS.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Contact name</label><input className={inputCls} value={modal.data.contact_person} onChange={e=>set('contact_person',e.target.value)}/></div>
              <div><label className={labelCls}>Phone</label><input className={inputCls} value={modal.data.phone} onChange={e=>set('phone',e.target.value)}/></div>
              <div className="col-span-2"><label className={labelCls}>Email</label><input type="email" className={inputCls} value={modal.data.email} onChange={e=>set('email',e.target.value)}/></div>
            </div>
            <div><label className={labelCls}>Notes</label><textarea rows={2} className={`${inputCls} resize-none`} value={modal.data.notes} onChange={e=>set('notes',e.target.value)}/></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Orders tab ────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders]       = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [subs, setSubs]           = useState([]);
  const [modal, setModal]         = useState(null);
  const [panel, setPanel]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [filter, setFilter]       = useState('');

  const load = useCallback(() =>
    Promise.all([getOrders(), getSuppliers(), getSubcontractors()])
      .then(([o, s, sc]) => { setOrders(o); setSuppliers(s); setSubs(sc); })
  , []);

  useEffect(() => { load(); }, [load]);

  function openNew()     { setModal({ data: { ...EMPTY_ORDER }, isNew: true }); }
  function openEdit(o)   { setModal({ data: { ...o, supplier_id: String(o.supplier_id||''), subcontractor_id: String(o.subcontractor_id||'') }, isNew: false }); }
  function set(key, val) { setModal(m => ({ ...m, data: { ...m.data, [key]: val } })); }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...modal.data,
        supplier_id: modal.data.supplier_id ? Number(modal.data.supplier_id) : null,
        subcontractor_id: modal.data.subcontractor_id ? Number(modal.data.subcontractor_id) : null,
        unit_price: modal.data.unit_price ? Number(modal.data.unit_price) : null,
      };
      if (modal.isNew) await createOrder(payload);
      else             await updateOrder(modal.data.id, payload);
      await load();
      setModal(null);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this order?')) return;
    await deleteOrder(modal.data.id);
    await load();
    setModal(null);
  }

  const filtered = orders.filter(o =>
    !filter ||
    o.material?.toLowerCase().includes(filter.toLowerCase()) ||
    o.supplier_name?.toLowerCase().includes(filter.toLowerCase()) ||
    o.status?.toLowerCase().includes(filter.toLowerCase())
  );

  const alerts     = orders.filter(o => o.delivery_alert || o.days_late > 0).length;
  const inTransit  = orders.filter(o => o.status === 'In Transit').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-400">{orders.length} order{orders.length!==1?'s':''}</p>
          {alerts > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">{alerts} alert{alerts!==1?'s':''}</span>}
          {inTransit > 0 && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">{inTransit} in transit</span>}
        </div>
        <div className="flex items-center gap-3">
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-48"
            placeholder="Search…" value={filter} onChange={e=>setFilter(e.target.value)}
          />
          <button onClick={openNew} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap">+ Add Order</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">{orders.length===0 ? 'No orders yet.' : 'No results.'}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                <th className="pb-2 pr-3 font-medium">Material</th>
                <th className="pb-2 pr-3 font-medium">Supplier</th>
                <th className="pb-2 pr-3 font-medium">For Sub</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Delivery</th>
                <th className="pb-2 pr-3 font-medium">Install start</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(o => (
                <tr key={o.id} onClick={() => setPanel(o)} className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${(o.delivery_alert||o.days_late>0)?'bg-red-900/10':''}`}>
                  <td className="py-3 pr-3">
                    <div className="font-medium text-slate-200 flex items-center gap-1.5">
                      {o.material}
                      {o.delivery_alert && <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-red-400 flex-shrink-0" title="Delivery after installation start"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z"/></svg>}
                    </div>
                    {o.quantity && <div className="text-xs text-slate-500">{o.quantity} {o.unit}</div>}
                  </td>
                  <td className="py-3 pr-3 text-slate-400">{o.supplier_name||'—'}</td>
                  <td className="py-3 pr-3 text-slate-400 text-xs">{o.subcontractor_name||'—'}</td>
                  <td className="py-3 pr-3"><StatusBadge status={o.status}/></td>
                  <td className="py-3 pr-3">
                    <div className="text-slate-400">{o.confirmed_delivery||'—'}</div>
                    {o.days_late > 0 && <div className="text-xs text-red-400 font-medium">{o.days_late}d late</div>}
                  </td>
                  <td className="py-3 pr-3 text-slate-400">{o.installation_start||'—'}</td>
                  <td className="py-3">
                    <button onClick={e => { e.stopPropagation(); openEdit(o); }} className="text-xs text-slate-500 hover:text-amber-400 transition-colors">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panel && (
        <OrderDetailPanel
          order={panel}
          onClose={() => setPanel(null)}
          onChanged={load}
        />
      )}

      {modal && (
        <Modal title={modal.isNew ? 'Add Order' : 'Edit Order'} onClose={() => setModal(null)} onSubmit={handleSave} saving={saving} onDelete={modal.isNew ? null : handleDelete} deleteLabel="Delete order">
          <div className="space-y-3">
            <div><label className={labelCls}>Material / item *</label><input required className={inputCls} value={modal.data.material} onChange={e=>set('material',e.target.value)} placeholder="e.g. Portland cement 42.5N"/></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><label className={labelCls}>Supplier</label>
                <select className={inputCls} value={modal.data.supplier_id} onChange={e=>set('supplier_id',e.target.value)}>
                  <option value="">— none —</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Status</label>
                <select className={inputCls} value={modal.data.status} onChange={e=>set('status',e.target.value)}>
                  {ORDER_STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div><label className={labelCls}>For subcontractor</label>
              <select className={inputCls} value={modal.data.subcontractor_id} onChange={e=>set('subcontractor_id',e.target.value)}>
                <option value="">— none —</option>
                {subs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelCls}>Quantity</label><input className={inputCls} value={modal.data.quantity} onChange={e=>set('quantity',e.target.value)}/></div>
              <div><label className={labelCls}>Unit</label><input className={inputCls} value={modal.data.unit} onChange={e=>set('unit',e.target.value)} placeholder="m³, kg, pcs"/></div>
              <div><label className={labelCls}>Unit price (€)</label><input type="number" min="0" step="0.01" className={inputCls} value={modal.data.unit_price} onChange={e=>set('unit_price',e.target.value)}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Order date</label><input type="date" className={inputCls} value={modal.data.order_date} onChange={e=>set('order_date',e.target.value)}/></div>
              <div><label className={labelCls}>Confirmed delivery</label><input type="date" className={inputCls} value={modal.data.confirmed_delivery} onChange={e=>set('confirmed_delivery',e.target.value)}/></div>
              <div><label className={labelCls}>Actual delivery</label><input type="date" className={inputCls} value={modal.data.actual_delivery} onChange={e=>set('actual_delivery',e.target.value)}/></div>
              <div><label className={labelCls}>Installation start</label><input type="date" className={inputCls} value={modal.data.installation_start} onChange={e=>set('installation_start',e.target.value)}/></div>
            </div>
            <div><label className={labelCls}>Notes</label><textarea rows={2} className={`${inputCls} resize-none`} value={modal.data.notes} onChange={e=>set('notes',e.target.value)}/></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function OrdersSuppliers() {
  const [tab, setTab] = useState('orders');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-5 border-b border-slate-800 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-100">Orders &amp; Suppliers</h1>
        <div className="flex gap-1 mt-4">
          {[['orders','Orders'],['suppliers','Suppliers']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab===id ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-8 py-6">
        {tab === 'suppliers' ? <SuppliersTab/> : <OrdersTab/>}
      </div>
    </div>
  );
}
