const BASE = '/api';

const json = res => {
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};
const h = { 'Content-Type': 'application/json' };
const post = (url, data) => fetch(url, { method: 'POST',   headers: h, body: JSON.stringify(data) }).then(json);
const put  = (url, data) => fetch(url, { method: 'PUT',    headers: h, body: JSON.stringify(data) }).then(json);
const del  = (url)       => fetch(url, { method: 'DELETE' }).then(json);

// ── Project ──────────────────────────────────────────────────────────────
export const getProject    = ()      => fetch(`${BASE}/project`).then(json);
export const updateProject = data    => put(`${BASE}/project`, data);
export const updateZones   = zones   => put(`${BASE}/project/zones`, { zones });

// ── Subcontractors ────────────────────────────────────────────────────────
export const getSubcontractors   = ()        => fetch(`${BASE}/subcontractors`).then(json);
export const createSubcontractor = data      => post(`${BASE}/subcontractors`, data);
export const updateSubcontractor = (id, d)   => put(`${BASE}/subcontractors/${id}`, d);
export const deleteSubcontractor = id        => del(`${BASE}/subcontractors/${id}`);

// ── Holidays ──────────────────────────────────────────────────────────────
export const getHolidays = () => fetch(`${BASE}/holidays`).then(json);

// ── Phases ────────────────────────────────────────────────────────────────
export const getPhases        = (subId) => fetch(`${BASE}/phases${subId ? `?subcontractor_id=${subId}` : ''}`).then(json);
export const createPhase      = data    => post(`${BASE}/phases`, data);
export const updatePhase      = (id, d) => put(`${BASE}/phases/${id}`, d);
export const deletePhase      = id      => del(`${BASE}/phases/${id}`);
export const generatePhases   = subId  => post(`${BASE}/phases/generate/${subId}`, {});
export const getPhaseLogs     = phaseId => fetch(`${BASE}/phases/${phaseId}/logs`).then(json);
export const createPhaseLog   = (phaseId, data) => post(`${BASE}/phases/${phaseId}/logs`, data);
export const deletePhaseLog   = id      => del(`${BASE}/phase-logs/${id}`);
export const updatePhaseNotes = (id, notes) => fetch(`${BASE}/phases/${id}/notes`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({notes}) }).then(json);

// ── Phase zones ────────────────────────────────────────────────────────────
export const getPhaseZones    = phaseId => fetch(`${BASE}/phases/${phaseId}/zones`).then(json);
export const setPhaseZones    = (phaseId, zones) => post(`${BASE}/phases/${phaseId}/zones`, { zones });
export const patchPhaseZone   = (phaseId, zone, status) => put(`${BASE}/phases/${phaseId}/zones/${zone}`, { status });
export const getAllPhaseZones  = () => fetch(`${BASE}/phase-zones`).then(json);

// ── Phase tasks ────────────────────────────────────────────────────────────
export const getPhaseTasks    = phaseId => fetch(`${BASE}/phases/${phaseId}/tasks`).then(json);
export const setPhaseTask     = (phaseId, type, done) => put(`${BASE}/phases/${phaseId}/tasks/${type}`, { done });
export const getPendingTasks  = () => fetch(`${BASE}/tasks/pending`).then(json);

// ── Order tasks ────────────────────────────────────────────────────────────
export const getOrderTasks         = orderId => fetch(`${BASE}/orders/${orderId}/tasks`).then(json);
export const setOrderTask          = (orderId, type, done) => put(`${BASE}/orders/${orderId}/tasks/${type}`, { done });
export const updateOrderNotes      = (orderId, notes) => fetch(`${BASE}/orders/${orderId}/notes`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({notes}) }).then(json);
export const getOrderPendingTasks  = () => fetch(`${BASE}/orders/tasks/pending`).then(json);

// ── Suppliers ─────────────────────────────────────────────────────────────
export const getSuppliers    = ()      => fetch(`${BASE}/suppliers`).then(json);
export const createSupplier  = data    => post(`${BASE}/suppliers`, data);
export const updateSupplier  = (id, d) => put(`${BASE}/suppliers/${id}`, d);
export const deleteSupplier  = id      => del(`${BASE}/suppliers/${id}`);

// ── Orders ────────────────────────────────────────────────────────────────
export const getOrders    = ()      => fetch(`${BASE}/orders`).then(json);
export const createOrder  = data    => post(`${BASE}/orders`, data);
export const updateOrder  = (id, d) => put(`${BASE}/orders/${id}`, d);
export const deleteOrder  = id      => del(`${BASE}/orders/${id}`);
