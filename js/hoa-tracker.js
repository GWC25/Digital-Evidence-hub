/* ================================================================
   DPC EVIDENCE HUB — hoa-tracker.js
   Head of Area Digital Tracker with RAG overview, priority view,
   full area detail editing, snapshot/restore history.
   ================================================================ */

'use strict';

function initHoATracker() {
  // Populate detail and history selects
  const sels = ['hoa-detail-select','hoa-history-select'];
  sels.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    while (el.options.length > 1) el.remove(1);
    DB.hoaTracker
      .sort((a,b) => a.code.localeCompare(b.code))
      .forEach(a => el.add(new Option(`${a.code} · ${a.dept}`, a.code)));
  });

  renderHoAOverview();
  renderHoAPrioritySummary();
}

/* ── OVERVIEW GRID ───────────────────────────────────────────── */

function renderHoAOverview() {
  const grid    = document.getElementById('hoa-overview-grid');
  if (!grid) return;

  const ragFilter = document.getElementById('hoa-filter-rag')?.value  || '';
  const metFilter = document.getElementById('hoa-filter-met')?.value  || '';
  const sortMode  = document.getElementById('hoa-filter-sort')?.value || 'urgency';

  let data = [...DB.hoaTracker];

  if (ragFilter === 'tbc') data = data.filter(a => !a.rag);
  else if (ragFilter)      data = data.filter(a => String(a.rag) === ragFilter);
  if (metFilter)           data = data.filter(a => a.metM1 === metFilter);

  if (sortMode === 'urgency') {
    data.sort((a,b) => {
      const ra = a.rag || 6, rb = b.rag || 6;
      if (ra !== rb) return rb - ra;       // higher RAG = more urgent = first
      if (a.metM1 === 'N' && b.metM1 === 'Y') return -1;
      if (a.metM1 === 'Y' && b.metM1 === 'N') return 1;
      return a.code.localeCompare(b.code);
    });
  } else {
    data.sort((a,b) => a.code.localeCompare(b.code));
  }

  if (!data.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>No areas match these filters.</p></div>`;
    return;
  }

  grid.innerHTML = data.map(a => {
    const ragColour = ['','--green-700','--teal-700','--amber-700','--red-700','--red-700'];
    const borderCol = a.rag ? `var(${ragColour[a.rag]})` : 'var(--border-strong)';
    const entryCount = DB.entries.filter(e => e.area === a.code).length;

    return `<article class="card" style="border-top:4px solid ${borderCol};cursor:pointer"
      onclick="openHoACardModal('${a.code}')"
      onkeydown="if(event.key==='Enter'||event.key===' ')openHoACardModal('${a.code}')"
      tabindex="0" role="button"
      aria-label="${esc(a.code)} — ${esc(a.dept)}, RAG ${a.rag||'TBC'}">
      <div class="flex-between mb-6">
        <span class="badge badge-navy" style="font-family:var(--font-mono);font-size:.75rem">${esc(a.code)}</span>
        <div class="flex gap-4" onclick="event.stopPropagation()">
          <button class="badge ${a.rag ? ['','badge-green','badge-teal','badge-amber','badge-red','badge-red'][a.rag]||'' : ''}"
            style="cursor:pointer;border:none;font-family:var(--font-body)"
            onclick="filterHoAByRag('${a.rag||'tbc'}')"
            aria-label="Filter to RAG ${a.rag||'TBC'} areas">${a.rag ? hoaRagLabel(a.rag) + ' (' + a.rag + ')' : 'TBC'}</button>
          ${hoaMetBadge(a.metM1)}
        </div>
      </div>
      <div class="fw-600 text-sm mb-4" style="line-height:1.3">${esc(a.dept)}</div>
      ${a.hoaName ? `<div class="text-xs text-muted">${esc(a.hoaName)}</div>` : ''}
      ${a.digitalLead ? `<div class="text-xs text-teal mt-4">🎯 Lead: ${esc(a.digitalLead)}</div>` : ''}
      ${entryCount ? `<div class="text-xs text-muted mt-4">${entryCount} entr${entryCount===1?'y':'ies'}</div>` : ''}
      ${a.nextAction ? `<div class="text-xs mt-6" style="color:var(--amber-700)">▶ ${esc(a.nextAction.substring(0,60))}${a.nextAction.length>60?'…':''}</div>` : ''}
    </article>`;
  }).join('');
}

function filterHoAByRag(val) {
  // Switch to RAG Overview tab and apply filter
  const ragSel = document.getElementById('hoa-filter-rag');
  if (ragSel) ragSel.value = val;
  // Switch to overview tab
  document.querySelectorAll('[id^="hoa-tab-"]').forEach(p => p.classList.remove('active'));
  const ov = document.getElementById('hoa-tab-overview');
  if (ov) ov.classList.add('active');
  // Update tab buttons
  const bar = document.querySelector('#section-hoa-tracker .tab-bar');
  if (bar) {
    bar.querySelectorAll('.tab-btn').forEach((b, i) => {
      b.classList.toggle('active', i === 0);
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    });
  }
  renderHoAOverview();
  // Scroll to overview
  document.getElementById('hoa-overview-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetHoAFilters() {
  ['hoa-filter-rag','hoa-filter-met','hoa-filter-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id==='hoa-filter-sort'?'urgency':'';
  });
  renderHoAOverview();
}

/* ── PRIORITY SUMMARY ────────────────────────────────────────── */

function renderHoAPrioritySummary() {
  const summary = document.getElementById('hoa-priority-summary');
  const table   = document.getElementById('hoa-priority-table');
  if (!summary || !table) return;

  const counts = [0,0,0,0,0,0]; // index = RAG 0-5
  DB.hoaTracker.forEach(a => { if (a.rag) counts[a.rag]++; });
  const tbc = DB.hoaTracker.filter(a => !a.rag).length;

  summary.innerHTML = [
    { label:'Confident (1)',  n:counts[1], cls:'badge-green', val:'1' },
    { label:'Developing (2)', n:counts[2], cls:'badge-teal',  val:'2' },
    { label:'Acceptable (3)', n:counts[3], cls:'badge-amber', val:'3' },
    { label:'Concern (4)',    n:counts[4], cls:'badge-red',   val:'4' },
    { label:'Urgent (5)',     n:counts[5], cls:'badge-red',   val:'5' },
    { label:'TBC',            n:tbc,        cls:'',            val:'tbc' },
  ].map(r => `<button class="badge ${r.cls}"
    style="cursor:pointer;border:none;font-family:var(--font-body)"
    onclick="filterHoAByRag('${r.val}')"
    aria-label="Filter to ${r.label} areas">${r.label}: ${r.n}</button>`).join('');

  const priority = DB.hoaTracker.filter(a => a.rag >= 4)
    .sort((a,b) => b.rag - a.rag || a.code.localeCompare(b.code));

  if (!priority.length) {
    table.innerHTML = `<div class="empty-state"><p>No RAG 4–5 areas.</p></div>`;
    return;
  }

  table.innerHTML = `<table class="data-table" aria-label="Priority areas RAG 4 and 5">
    <caption class="sr-only">Head of Areas with RAG rating 4 or 5 — highest priority for coaching</caption>
    <thead><tr>
      <th scope="col">Code</th>
      <th scope="col">Department</th>
      <th scope="col">HoA</th>
      <th scope="col">RAG</th>
      <th scope="col">Digital Lead</th>
      <th scope="col">Priority action</th>
      <th scope="col"><span class="sr-only">Open</span></th>
    </tr></thead>
    <tbody>
      ${priority.map(a => `<tr>
        <td><code>${esc(a.code)}</code></td>
        <td class="fw-600">${esc(a.dept)}</td>
        <td>${esc(a.hoaName||'—')}</td>
        <td>${hoaRagBadge(a.rag)}</td>
        <td>${a.digitalLead ? esc(a.digitalLead) : '<span class="text-muted">None yet</span>'}</td>
        <td class="text-sm">${esc((a.priorityActions||a.nextAction||'').substring(0,80))}</td>
        <td><button class="btn btn-sm btn-primary" onclick="openHoACardModal('${a.code}')">Open</button></td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

/* ── AREA CARD MODAL ─────────────────────────────────────────── */

function openHoACardModal(code) {
  const a = DB.hoaTracker.find(x => x.code === code);
  if (!a) return;
  const entries = DB.entries.filter(e => e.area === code)
    .sort((x,y) => y.date > x.date ? 1 : -1)
    .slice(0, 5);

  openModal(`${esc(a.code)} — ${esc(a.dept)}`, `
    <div class="grid-2 mb-12">
      <div>
        <div class="text-xs text-muted mb-4">HoA</div>
        <div class="fw-600">${esc(a.hoaName||'—')}</div>
        <div class="text-xs text-muted mt-8 mb-4">Campus</div>
        <div>${esc(a.campus||'—')}</div>
      </div>
      <div>
        <div class="flex gap-6 mb-8">
          ${hoaRagBadge(a.rag)}
          <span class="badge">${hoaRagLabel(a.rag)}</span>
          ${hoaMetBadge(a.metM1)}
        </div>
        ${a.digitalLead ? `<div class="text-xs text-teal">🎯 Digital Lead: ${esc(a.digitalLead)}</div>` : ''}
      </div>
    </div>
    ${a.strengths ? `<div class="log-entry status-complete mb-8">
      <div class="log-meta">Strengths</div>
      <p class="text-sm">${esc(a.strengths.substring(0,300))}${a.strengths.length>300?'…':''}</p>
    </div>` : ''}
    ${a.afis ? `<div class="log-entry status-waiting mb-8">
      <div class="log-meta">AFIs / areas for development</div>
      <p class="text-sm">${esc(a.afis.substring(0,300))}${a.afis.length>300?'…':''}</p>
    </div>` : ''}
    ${a.priorityActions ? `<div class="log-entry status-active mb-8">
      <div class="log-meta">Priority actions</div>
      <p class="text-sm">${esc(a.priorityActions.substring(0,300))}${a.priorityActions.length>300?'…':''}</p>
    </div>` : ''}
    ${a.nextAction ? `<div class="text-sm mt-8"><strong>Next action:</strong> ${esc(a.nextAction)}</div>` : ''}
    ${entries.length ? `<div class="mt-16">
      <div class="card-title">Recent entries</div>
      ${entries.map(e => `<div class="log-entry status-active mt-4">
        <div class="log-meta">${e.date} · ${esc(e.subtype||e.type)}</div>
        <div class="fw-600 text-sm">${esc(e.title)}</div>
      </div>`).join('')}
    </div>` : ''}
  `, [
    { label:'Edit detail', cls:'btn-primary', action:() => {
      closeModal();
      const sel = document.getElementById('hoa-detail-select');
      if (sel) { sel.value = code; renderHoADetail(); }
      navigateTo('hoa-tracker');
      // Switch to detail tab
      const detBtn = document.querySelector('[onclick*="hoa-tab-,\'detail\'"]') ||
                     document.querySelectorAll('[role="tab"]')[2];
      setTimeout(() => {
        const tabPanel = document.getElementById('hoa-tab-detail');
        document.querySelectorAll('[id^="hoa-tab-"]').forEach(p => p.classList.remove('active'));
        if (tabPanel) tabPanel.classList.add('active');
      }, 50);
    }},
    { label:'+ Add entry', cls:'btn-secondary', action:() => {
      closeModal();
      navigateTo('quick-capture', { subtype:'Meeting' });
      setTimeout(() => {
        const areaEl = document.getElementById('qc-area');
        if (areaEl) { areaEl.value = code; toggleHoAOption(); }
      }, 100);
    }},
    { label:'Close', cls:'btn-ghost', action:closeModal },
  ]);
}

/* ── AREA DETAIL ─────────────────────────────────────────────── */

function renderHoADetail() {
  const code = document.getElementById('hoa-detail-select')?.value;
  const el   = document.getElementById('hoa-detail-content');
  if (!el) return;
  if (!code) { el.innerHTML = `<div class="empty-state"><p>Select an area above.</p></div>`; return; }

  const a = DB.hoaTracker.find(x => x.code === code);
  if (!a) return;

  el.innerHTML = `
    <div class="card">
      <div class="card-title">${esc(a.code)} — ${esc(a.dept)}</div>
      <div class="form-row">
        <div class="form-group">
          <label for="hd-hoa">HoA name</label>
          <input type="text" id="hd-hoa" value="${esc(a.hoaName||'')}">
        </div>
        <div class="form-group">
          <label for="hd-campus">Campus</label>
          <input type="text" id="hd-campus" value="${esc(a.campus||'')}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="hd-met">Meeting held (M1)?</label>
          <select id="hd-met">
            <option value="N" ${a.metM1!=='Y'?'selected':''}>Not yet</option>
            <option value="Y" ${a.metM1==='Y'?'selected':''}>Yes</option>
          </select>
        </div>
        <div class="form-group">
          <label for="hd-form">Form submitted?</label>
          <select id="hd-form">
            <option value="N" ${a.formM1!=='Y'?'selected':''}>Not yet</option>
            <option value="Y" ${a.formM1==='Y'?'selected':''}>Yes</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="hd-rag">RAG rating</label>
        <select id="hd-rag">
          <option value="">— TBC —</option>
          <option value="1" ${a.rag===1?'selected':''}>1 — Confident</option>
          <option value="2" ${a.rag===2?'selected':''}>2 — Developing</option>
          <option value="3" ${a.rag===3?'selected':''}>3 — Acceptable</option>
          <option value="4" ${a.rag===4?'selected':''}>4 — Concern</option>
          <option value="5" ${a.rag===5?'selected':''}>5 — Urgent</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="hd-lead">Digital Lead</label>
          <input type="text" id="hd-lead" value="${esc(a.digitalLead||'')}">
        </div>
        <div class="form-group">
          <label for="hd-future-lead">Future Digital Lead</label>
          <input type="text" id="hd-future-lead" value="${esc(a.futureDigitalLead||'')}">
        </div>
      </div>
      <div class="divider"></div>
      <div class="form-group">
        <label for="hd-summary">Meeting summary</label>
        <div class="input-with-mic" style="align-items:flex-start">
          <textarea id="hd-summary" rows="4">${esc(a.meeting1Summary||'')}</textarea>
          <button class="mic-btn" onclick="startDictation('hd-summary')" aria-label="Dictate" style="margin-top:2px">🎤</button>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="hd-strengths">Strengths</label>
          <div class="input-with-mic" style="align-items:flex-start">
            <textarea id="hd-strengths" rows="3">${esc(a.strengths||'')}</textarea>
            <button class="mic-btn" onclick="startDictation('hd-strengths')" aria-label="Dictate" style="margin-top:2px">🎤</button>
          </div>
        </div>
        <div class="form-group">
          <label for="hd-afis">AFIs</label>
          <div class="input-with-mic" style="align-items:flex-start">
            <textarea id="hd-afis" rows="3">${esc(a.afis||'')}</textarea>
            <button class="mic-btn" onclick="startDictation('hd-afis')" aria-label="Dictate" style="margin-top:2px">🎤</button>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="hd-priority">Priority actions</label>
        <div class="input-with-mic" style="align-items:flex-start">
          <textarea id="hd-priority" rows="3">${esc(a.priorityActions||'')}</textarea>
          <button class="mic-btn" onclick="startDictation('hd-priority')" aria-label="Dictate" style="margin-top:2px">🎤</button>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="hd-teach">Teach-Meets delivered</label>
          <textarea id="hd-teach" rows="2">${esc(a.teachMeets||'')}</textarea>
        </div>
        <div class="form-group">
          <label for="hd-coaching">1:1 Coaching</label>
          <textarea id="hd-coaching" rows="2">${esc(a.coaching1to1||'')}</textarea>
        </div>
      </div>
      <div class="form-group">
        <label for="hd-next">Next action</label>
        <input type="text" id="hd-next" value="${esc(a.nextAction||'')}">
      </div>
    </div>
  `;
}

function saveHoADetail() {
  const code = document.getElementById('hoa-detail-select')?.value;
  if (!code) { toast('Select an area first', 'error'); return; }
  const a = DB.hoaTracker.find(x => x.code === code);
  if (!a) return;
  snapshotHoA(a, 'Manual save');
  a.hoaName        = document.getElementById('hd-hoa')?.value?.trim()      || a.hoaName;
  a.campus         = document.getElementById('hd-campus')?.value?.trim()    || a.campus;
  a.metM1          = document.getElementById('hd-met')?.value               || a.metM1;
  a.formM1         = document.getElementById('hd-form')?.value              || a.formM1;
  const ragVal     = document.getElementById('hd-rag')?.value;
  a.rag            = ragVal ? parseInt(ragVal) : null;
  a.digitalLead    = document.getElementById('hd-lead')?.value?.trim()      || a.digitalLead;
  a.futureDigitalLead = document.getElementById('hd-future-lead')?.value?.trim() || a.futureDigitalLead;
  a.meeting1Summary= document.getElementById('hd-summary')?.value?.trim()   || a.meeting1Summary;
  a.strengths      = document.getElementById('hd-strengths')?.value?.trim() || a.strengths;
  a.afis           = document.getElementById('hd-afis')?.value?.trim()      || a.afis;
  a.priorityActions= document.getElementById('hd-priority')?.value?.trim()  || a.priorityActions;
  a.teachMeets     = document.getElementById('hd-teach')?.value?.trim()     || a.teachMeets;
  a.coaching1to1   = document.getElementById('hd-coaching')?.value?.trim()  || a.coaching1to1;
  a.nextAction     = document.getElementById('hd-next')?.value?.trim()      || a.nextAction;
  renderHoAOverview();
  renderHoAPrioritySummary();
  renderDashboard();
  toast(`${code} saved`, 'success');
}

function takeHoASnapshot() {
  const code = document.getElementById('hoa-detail-select')?.value;
  if (!code) { toast('Select an area first', 'error'); return; }
  const a = DB.hoaTracker.find(x => x.code === code);
  if (!a) return;
  snapshotHoA(a, 'Manual snapshot');
  toast('Snapshot taken for ' + code, 'success');
}

/* ── HISTORY ─────────────────────────────────────────────────── */

function renderHoAHistory() {
  const code = document.getElementById('hoa-history-select')?.value;
  const el   = document.getElementById('hoa-history-content');
  if (!el) return;
  if (!code) { el.innerHTML = `<div class="empty-state"><p>Select an area.</p></div>`; return; }

  const a = DB.hoaTracker.find(x => x.code === code);
  if (!a || !a.snapshots?.length) {
    el.innerHTML = `<div class="empty-state"><p>No snapshots for ${code} yet.</p></div>`;
    return;
  }

  const snaps = [...a.snapshots].reverse();
  el.innerHTML = `<p class="text-sm text-muted mb-12">${snaps.length} snapshot${snaps.length===1?'':'s'} for ${code}</p>` +
    snaps.map((s, i) => `
      <div class="section-panel mb-8">
        <button class="section-panel-header" onclick="togglePanel(this,'snap-${i}')"
          aria-expanded="false">
          <span>${fmtDateTime(s.timestamp)} — ${esc(s.reason)}</span>
          <span class="panel-toggle-icon" aria-hidden="true">▾</span>
        </button>
        <div class="section-panel-body" id="snap-${i}">
          <div class="grid-2">
            <div>
              <div class="text-xs text-muted mb-2">RAG</div>
              <div>${hoaRagBadge(s.state.rag)}</div>
            </div>
            <div>
              <div class="text-xs text-muted mb-2">Met M1</div>
              <div>${hoaMetBadge(s.state.metM1)}</div>
            </div>
          </div>
          ${s.state.strengths ? `<div class="log-entry status-complete mt-8">
            <div class="log-meta">Strengths</div>
            <p class="text-sm">${esc(s.state.strengths.substring(0,200))}</p>
          </div>` : ''}
          ${s.state.afis ? `<div class="log-entry status-waiting mt-4">
            <div class="log-meta">AFIs</div>
            <p class="text-sm">${esc(s.state.afis.substring(0,200))}</p>
          </div>` : ''}
          <button class="btn btn-sm btn-secondary mt-8"
            onclick="restoreSnapshot('${code}',${a.snapshots.length - 1 - i})">
            ↩ Restore this snapshot
          </button>
        </div>
      </div>
    `).join('');
}

function restoreSnapshot(code, idx) {
  const a = DB.hoaTracker.find(x => x.code === code);
  if (!a || !a.snapshots[idx]) return;
  if (!confirm('Restore this snapshot? Current data will be snapshotted first.')) return;
  snapshotHoA(a, 'Pre-restore snapshot');
  const s = a.snapshots[idx].state;
  Object.assign(a, s);
  toast('Snapshot restored for ' + code, 'success');
  renderHoAHistory();
  renderHoAOverview();
}

/* ── EXPORT ───────────────────────────────────────────────────── */

function exportHoACSV() {
  const headers = ['Code','Department','HoA','Campus','Met M1','Form M1',
                   'RAG','Digital Lead','Future Lead','Teach-Meets','Coaching 1:1',
                   'Next Action','Strengths','AFIs','Priority Actions'];
  const rows = DB.hoaTracker.map(a => [
    a.code, a.dept, a.hoaName||'', a.campus||'',
    a.metM1||'N', a.formM1||'N', a.rag||'',
    a.digitalLead||'', a.futureDigitalLead||'',
    a.teachMeets||'', a.coaching1to1||'',
    a.nextAction||'', a.strengths||'', a.afis||'', a.priorityActions||''
  ].map(v => '"' + String(v).replace(/"/g,'""') + '"').join(','));

  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'hoa-tracker-' + today() + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('HoA Tracker exported as CSV', 'success');
}

function renderRatingFields() {
  const el = document.getElementById('rating-fields-list');
  if (!el) return;
  el.innerHTML = DB.ratingFields.map((f,i) => `
    <div class="flex-between gap-8 mb-8 text-sm" style="padding:.4rem .6rem;background:var(--bg);border-radius:var(--radius)">
      <span>${esc(f.name)}</span>
      <div class="flex gap-6 align-items-center">
        <label class="toggle-switch" aria-label="${esc(f.name)} enabled">
          <input type="checkbox" ${f.enabled?'checked':''} onchange="toggleRatingField(${i})">
          <span class="toggle-slider"></span>
        </label>
        <button class="btn btn-sm btn-danger" onclick="removeRatingField(${i})"
          aria-label="Remove ${esc(f.name)}">Remove</button>
      </div>
    </div>
  `).join('');
}

function toggleRatingField(i) {
  DB.ratingFields[i].enabled = !DB.ratingFields[i].enabled;
}

function removeRatingField(i) {
  if (!confirm('Remove this rating field?')) return;
  DB.ratingFields.splice(i,1);
  renderRatingFields();
}

function addRatingField() {
  const inp = document.getElementById('new-rating-field');
  const val = inp?.value?.trim();
  if (!val) return;
  DB.ratingFields.push({ id:'rf'+Date.now(), name:val, enabled:true });
  inp.value = '';
  renderRatingFields();
  toast('Rating field added', 'success');
}
