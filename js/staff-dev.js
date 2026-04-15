/* ================================================================
   DPC EVIDENCE HUB — staff-dev.js
   Individual staff digital development records.
   ================================================================ */

'use strict';

function renderStaffRecords() {
  const el = document.getElementById('staff-records-list');
  if (!el) return;
  const records = DB.staffRecords.sort((a,b) => a.name > b.name ? 1 : -1);
  if (!records.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">◎</div>
      <p>No staff records yet. Records are created when you log coaching or CPD against a named person.</p>
      <button class="btn btn-primary mt-12" onclick="openAddStaffRecordModal()">+ Add staff record</button>
    </div>`;
    return;
  }
  el.innerHTML = `<table class="data-table" aria-label="Staff development records">
    <caption class="sr-only">Individual staff digital development records</caption>
    <thead><tr>
      <th scope="col">Name</th>
      <th scope="col">Area</th>
      <th scope="col">Role</th>
      <th scope="col">Entries</th>
      <th scope="col">Last activity</th>
      <th scope="col"><span class="sr-only">Actions</span></th>
    </tr></thead>
    <tbody>
      ${records.map(r => {
        const entries = DB.entries.filter(e => e.staffId === r.id);
        const last    = entries.sort((a,b)=>b.date>a.date?1:-1)[0];
        return `<tr>
          <td class="fw-600">${esc(r.name)}</td>
          <td>${esc(r.area||'—')}</td>
          <td>${esc(r.role||'—')}</td>
          <td class="text-mono text-xs">${entries.length}</td>
          <td class="text-xs text-muted">${last ? fmtDate(last.date) : '—'}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="openStaffDetail('${r.id}')">Detail</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function openAddStaffRecordModal() {
  const areaOpts = DB.areas.map(a =>
    `<option value="${esc(a.code)}">${esc(a.code)} · ${esc(a.name)}</option>`
  ).join('');
  openModal('Add Staff Record', `
    <div class="form-row">
      <div class="form-group">
        <label for="sr-name">Name or identifier <span class="req" aria-hidden="true">*</span></label>
        <input type="text" id="sr-name" required aria-required="true"
          placeholder="Full name, or anonymous ref (e.g. EGL-01)">
      </div>
      <div class="form-group">
        <label for="sr-area">Area</label>
        <select id="sr-area"><option value="">—</option>${areaOpts}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="sr-role">Role</label>
        <input type="text" id="sr-role" placeholder="e.g. Lecturer, TLAM, Head of Area">
      </div>
      <div class="form-group">
        <label for="sr-contract">Contract type</label>
        <select id="sr-contract">
          <option>Full-time</option><option>Part-time</option>
          <option>Sessional</option><option>Manager</option><option>Support</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="sr-notes">Starting notes</label>
      <textarea id="sr-notes" rows="3" placeholder="Digital skills baseline, any prior knowledge…"></textarea>
    </div>
  `, [
    { label:'Add', cls:'btn-primary', action:() => {
      const name = document.getElementById('sr-name')?.value?.trim();
      if (!name) { toast('Name required','error'); return; }
      DB.staffRecords.push({
        id:       genId('staff'),
        name,
        area:     document.getElementById('sr-area')?.value     || '',
        role:     document.getElementById('sr-role')?.value?.trim()     || '',
        contract: document.getElementById('sr-contract')?.value || '',
        notes:    document.getElementById('sr-notes')?.value?.trim()    || '',
        created:  new Date().toISOString(),
      });
      closeModal(); renderStaffRecords(); toast('Staff record added','success');
    }},
    { label:'Cancel', cls:'btn-secondary', action:closeModal },
  ]);
}

function openStaffDetail(id) {
  const r = DB.staffRecords.find(x => x.id === id);
  if (!r) return;
  const entries = DB.entries.filter(e => e.staffId === id)
    .sort((a,b) => b.date > a.date ? 1 : -1);
  openModal(esc(r.name), `
    <div class="flex gap-8 mb-12">
      <span class="badge">${esc(r.area||'No area')}</span>
      <span class="badge">${esc(r.role||'No role')}</span>
      <span class="badge">${esc(r.contract||'')}</span>
    </div>
    ${r.notes ? `<p class="text-sm mb-12">${esc(r.notes)}</p>` : ''}
    <div class="card-title mb-8">Activity log (${entries.length})</div>
    ${entries.length ? entries.map(e=>`
      <div class="log-entry status-active mt-4">
        <div class="log-meta">${e.date} · ${esc(e.subtype||e.type)}</div>
        <div class="fw-600 text-sm">${esc(e.title)}</div>
        ${e.notes?`<p class="text-xs mt-4 text-muted">${esc(e.notes.substring(0,100))}</p>`:''}
      </div>`).join('') : '<div class="empty-state"><p>No entries yet.</p></div>'}
  `, [
    { label:'+ Add entry', cls:'btn-primary', action:() => {
      closeModal();
      navigateTo('quick-capture', { staffId: id });
    }},
    { label:'Close', cls:'btn-secondary', action:closeModal },
  ]);
}
