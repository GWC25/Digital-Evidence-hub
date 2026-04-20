/* ================================================================
   DPC EVIDENCE HUB — staff-dev.js
   Individual staff digital development records.
   Joined to: Evidence entries (staffId), Threads (staffId on entries),
   Referrals (staffInvolved field), and Areas (area code).
   ================================================================ */

'use strict';

function renderStaffRecords() {
  const el = document.getElementById('staff-records-list');
  if (!el) return;
  const records = [...DB.staffRecords].sort((a,b) => a.name > b.name ? 1 : -1);
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
      <th scope="col">Threads</th>
      <th scope="col">Referrals</th>
      <th scope="col">Last activity</th>
      <th scope="col"><span class="sr-only">Actions</span></th>
    </tr></thead>
    <tbody>
      ${records.map(r => {
        const entries   = DB.entries.filter(e => e.staffId === r.id);
        const threads   = DB.threads.filter(t => t.staffIds && t.staffIds.includes(r.id));
        const referrals = DB.referrals.filter(ref => ref.staffInvolved &&
          ref.staffInvolved.toLowerCase().includes(r.name.toLowerCase()));
        const last      = [...entries].sort((a,b)=>b.date>a.date?1:-1)[0];
        return `<tr>
          <td class="fw-600">${esc(r.name)}</td>
          <td>${esc(r.area||'—')}</td>
          <td>${esc(r.role||'—')}</td>
          <td class="text-mono text-xs">${entries.length}</td>
          <td class="text-mono text-xs">${threads.length||'—'}</td>
          <td class="text-mono text-xs">${referrals.length||'—'}</td>
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
      <textarea id="sr-notes" rows="3" placeholder="Digital skills baseline, Jisc Discovery Tool level, any prior knowledge…"></textarea>
    </div>
    <div class="form-group">
      <label for="sr-jisc">Jisc Discovery Tool level <span class="hint">(self-assessed)</span></label>
      <select id="sr-jisc">
        <option value="">— not yet assessed —</option>
        <option>Stage 1 · Exploring</option>
        <option>Stage 2A · Adopting: Developing</option>
        <option>Stage 2B · Adopting: Embedding</option>
        <option>Stage 3 · Leading</option>
      </select>
    </div>
    <div class="form-group">
      <label for="sr-pyramid">Digital Learning Pyramid level</label>
      <select id="sr-pyramid">
        <option value="">— not assessed —</option>
        <option>Digital Foundations</option>
        <option>Digital Inclusion</option>
        <option>Digital Innovation</option>
      </select>
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
        jiscLevel:document.getElementById('sr-jisc')?.value     || '',
        pyramid:  document.getElementById('sr-pyramid')?.value  || '',
        created:  new Date().toISOString(),
      });
      markDirty();
      closeModal(); renderStaffRecords(); toast('Staff record added','success');
    }},
    { label:'Cancel', cls:'btn-secondary', action:closeModal },
  ]);
}

function openStaffDetail(id) {
  const r = DB.staffRecords.find(x => x.id === id);
  if (!r) return;

  const entries   = DB.entries.filter(e => e.staffId === id)
    .sort((a,b) => b.date > a.date ? 1 : -1);
  const threads   = DB.threads.filter(t => t.staffIds && t.staffIds.includes(id));
  const referrals = DB.referrals.filter(ref => ref.staffInvolved &&
    ref.staffInvolved.toLowerCase().includes(r.name.toLowerCase()));

  const threadsHtml = threads.length ? `
    <div class="card-title mt-16 mb-8">Linked threads (${threads.length})</div>
    ${threads.map(t => `
      <div class="log-entry status-active mt-4" style="cursor:pointer" onclick="closeModal();openThreadDetail('${t.id}')">
        <div class="log-meta">${fmtDate(t.created)} · <span class="badge ${t.status==='active'?'badge-teal':'badge-green'}">${t.status}</span></div>
        <div class="fw-600 text-sm">${esc(t.name)}</div>
      </div>`).join('')}
  ` : '';

  const referralsHtml = referrals.length ? `
    <div class="card-title mt-16 mb-8">Referrals involving this person (${referrals.length})</div>
    ${referrals.map(ref => `
      <div class="log-entry status-active mt-4" style="cursor:pointer" onclick="closeModal();openReferralDetail('${ref.id}')">
        <div class="log-meta">${fmtDate(ref.date)} · From ${esc(ref.requestedBy)}</div>
        <div class="fw-600 text-sm">${esc(ref.actionType)}${ref.regarding?' — '+esc(ref.regarding):''}</div>
      </div>`).join('')}
  ` : '';

  openModal(esc(r.name), `
    <div class="flex gap-8 mb-12 flex-wrap">
      ${r.area ? `<span class="badge">${esc(r.area)}</span>` : ''}
      ${r.role ? `<span class="badge">${esc(r.role)}</span>` : ''}
      ${r.contract ? `<span class="badge">${esc(r.contract)}</span>` : ''}
      ${r.jiscLevel ? `<span class="badge badge-navy" title="Jisc DTPF level">Jisc: ${esc(r.jiscLevel.split('·')[0].trim())}</span>` : ''}
      ${r.pyramid ? `<span class="badge badge-teal">${esc(r.pyramid)}</span>` : ''}
    </div>
    ${r.notes ? `<p class="text-sm mb-12">${esc(r.notes)}</p>` : ''}

    <div class="flex gap-8 mb-12" style="flex-wrap:wrap">
      <div class="stat-card" style="flex:1;min-width:100px;padding:.6rem .8rem">
        <div class="stat-n" style="font-size:1.4rem">${entries.length}</div>
        <div class="stat-l">Entries</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:100px;padding:.6rem .8rem">
        <div class="stat-n" style="font-size:1.4rem">${threads.length}</div>
        <div class="stat-l">Threads</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:100px;padding:.6rem .8rem">
        <div class="stat-n" style="font-size:1.4rem">${referrals.length}</div>
        <div class="stat-l">Referrals</div>
      </div>
    </div>

    <div class="card-title mb-8">Activity log (${entries.length})</div>
    ${entries.length ? entries.map(e=>`
      <div class="log-entry status-active mt-4">
        <div class="log-meta">${e.date} · ${esc(e.subtype||e.type)}</div>
        <div class="fw-600 text-sm">${esc(e.title)}</div>
        ${e.notes?`<p class="text-xs mt-4 text-muted">${esc(e.notes.substring(0,100))}</p>`:''}`
      ).join('') : '<div class="empty-state"><p>No entries yet.</p></div>'}

    ${threadsHtml}
    ${referralsHtml}
  `, [
    { label:'+ Add entry', cls:'btn-primary', action:() => {
      closeModal();
      navigateTo('quick-capture', { staffId: id });
    }},
    { label:'Edit record', cls:'btn-secondary', action:() => { closeModal(); editStaffRecord(id); }},
    { label:'Close', cls:'btn-ghost', action:closeModal },
  ]);
}

function editStaffRecord(id) {
  const r = DB.staffRecords.find(x => x.id === id);
  if (!r) return;
  const areaOpts = DB.areas.map(a =>
    `<option value="${esc(a.code)}" ${r.area===a.code?'selected':''}>${esc(a.code)} · ${esc(a.name)}</option>`
  ).join('');
  openModal('Edit Staff Record', `
    <div class="form-row">
      <div class="form-group">
        <label for="esr-name">Name</label>
        <input type="text" id="esr-name" value="${esc(r.name)}">
      </div>
      <div class="form-group">
        <label for="esr-area">Area</label>
        <select id="esr-area"><option value="">—</option>${areaOpts}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="esr-role">Role</label>
        <input type="text" id="esr-role" value="${esc(r.role||'')}">
      </div>
      <div class="form-group">
        <label for="esr-jisc">Jisc level</label>
        <select id="esr-jisc">
          <option value="">— not assessed —</option>
          ${['Stage 1 · Exploring','Stage 2A · Adopting: Developing','Stage 2B · Adopting: Embedding','Stage 3 · Leading']
            .map(l=>`<option ${r.jiscLevel===l?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="esr-pyramid">Digital Learning Pyramid level</label>
      <select id="esr-pyramid">
        <option value="">—</option>
        ${['Digital Foundations','Digital Inclusion','Digital Innovation']
          .map(l=>`<option ${r.pyramid===l?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label for="esr-notes">Notes</label>
      <textarea id="esr-notes" rows="3">${esc(r.notes||'')}</textarea>
    </div>
  `, [
    { label:'Save', cls:'btn-primary', action:() => {
      r.name    = document.getElementById('esr-name')?.value?.trim() || r.name;
      r.area    = document.getElementById('esr-area')?.value     || '';
      r.role    = document.getElementById('esr-role')?.value?.trim()  || '';
      r.jiscLevel=document.getElementById('esr-jisc')?.value    || '';
      r.pyramid = document.getElementById('esr-pyramid')?.value || '';
      r.notes   = document.getElementById('esr-notes')?.value?.trim() || '';
      markDirty();
      closeModal(); renderStaffRecords(); toast('Record updated','success');
    }},
    { label:'Cancel', cls:'btn-ghost', action:closeModal },
  ]);
}
