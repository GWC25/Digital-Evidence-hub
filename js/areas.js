/* ================================================================
   DPC EVIDENCE HUB — areas.js
   Curriculum area cards with digital skills, subject tools,
   ratings, and notes. All 34 areas pre-loaded.
   ================================================================ */

'use strict';

function renderAreas() {
  const search  = (document.getElementById('area-search')?.value || '').toLowerCase();
  const el      = document.getElementById('areas-container');
  if (!el) return;

  const filtered = DB.areas.filter(a =>
    !search ||
    a.code.toLowerCase().includes(search) ||
    a.name.toLowerCase().includes(search) ||
    a.group.toLowerCase().includes(search)
  );

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⊞</div><p>No areas match "${esc(search)}".</p></div>`;
    return;
  }

  // Group by curriculum group
  const groups = {};
  filtered.forEach(a => {
    if (!groups[a.group]) groups[a.group] = [];
    groups[a.group].push(a);
  });

  el.innerHTML = Object.entries(groups).map(([group, areas]) => `
    <div class="mb-24">
      <div class="card-title mb-8" style="font-size:.7rem;letter-spacing:.1em">${esc(group)}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:.75rem">
        ${areas.map(a => areaCard(a)).join('')}
      </div>
    </div>
  `).join('');
}

function areaCard(a) {
  const entryCount = DB.entries.filter(e => e.area === a.code).length;
  const hoa        = DB.hoaTracker.find(x => x.code === a.code);
  const rag        = hoa ? hoaRagBadge(hoa.rag) : '';
  const hasNotes   = a.notes?.trim();

  return `<article class="card" style="padding:.85rem 1rem" id="area-card-${a.code}">
    <div class="flex-between mb-6">
      <div class="flex gap-8 align-items-center">
        <span class="badge badge-navy" style="font-family:var(--font-mono)">${esc(a.code)}</span>
        ${rag}
      </div>
      <div class="flex gap-4">
        ${entryCount ? `<span class="badge badge-teal">${entryCount} entr${entryCount===1?'y':'ies'}</span>` : ''}
        <button class="btn btn-sm btn-secondary" onclick="openAreaDetail('${a.code}')"
          aria-label="Open detail for ${esc(a.name)}">Detail</button>
      </div>
    </div>
    <div class="fw-600 text-sm mb-4">${esc(a.name)}</div>
    ${a.coreSkills?.length ? `
      <div class="text-xs text-muted mb-2">Core digital skills:</div>
      <ul style="margin:0;padding-left:1rem;font-size:.72rem;color:var(--text-600)">
        ${a.coreSkills.slice(0,2).map(s => `<li>${esc(s)}</li>`).join('')}
        ${a.coreSkills.length > 2 ? `<li style="color:var(--text-400)">+${a.coreSkills.length-2} more</li>` : ''}
      </ul>
    ` : ''}
    ${hasNotes ? `<div class="text-xs mt-6 text-muted">${esc(a.notes.substring(0,80))}${a.notes.length>80?'…':''}</div>` : ''}
  </article>`;
}

function openAreaDetail(code) {
  const a   = DB.areas.find(x => x.code === code);
  const hoa = DB.hoaTracker.find(x => x.code === code);
  if (!a) return;

  const ratingFields = DB.ratingFields.filter(f => f.enabled);

  openModal(`${esc(a.code)} — ${a.name}`, `
    <div class="tab-bar" role="tablist">
      <button class="tab-btn active" role="tab" onclick="switchTab(this,'ad-panel-','skills')">Skills &amp; Tools</button>
      <button class="tab-btn" role="tab" onclick="switchTab(this,'ad-panel-','ratings')">Ratings</button>
      <button class="tab-btn" role="tab" onclick="switchTab(this,'ad-panel-','notes')">Notes</button>
      <button class="tab-btn" role="tab" onclick="switchTab(this,'ad-panel-','entries')">Evidence</button>
    </div>

    <!-- SKILLS TAB -->
    <div class="tab-panel active" id="ad-panel-skills">
      <div class="form-group">
        <label for="ad-group">Curriculum group</label>
        <input type="text" id="ad-group" value="${esc(a.group||'')}">
      </div>
      <div class="form-group">
        <label for="ad-core-skills">Core digital skills <span class="hint">(one per line)</span></label>
        <textarea id="ad-core-skills" rows="5">${(a.coreSkills||[]).map(s=>esc(s)).join('\n')}</textarea>
      </div>
      <div class="form-group">
        <label for="ad-subject-tools">Subject-specific tools <span class="hint">(one per line)</span></label>
        <textarea id="ad-subject-tools" rows="4">${(a.subjectTools||[]).map(s=>esc(s)).join('\n')}</textarea>
      </div>
    </div>

    <!-- RATINGS TAB -->
    <div class="tab-panel" id="ad-panel-ratings">
      <p class="text-sm text-muted mb-12">Rate 1–5 per field. 1 = not started, 5 = embedded.</p>
      ${ratingFields.map(f => `
        <div class="form-row" style="grid-template-columns:1fr auto;align-items:center;gap:.75rem;margin-bottom:.75rem">
          <label for="ad-rat-${f.id}" class="fw-600">${esc(f.name)}</label>
          <select id="ad-rat-${f.id}" style="width:120px" aria-label="${esc(f.name)} rating">
            <option value="">—</option>
            <option value="1" ${(a.ratings||{})[f.id]==='1'?'selected':''}>1 — Not started</option>
            <option value="2" ${(a.ratings||{})[f.id]==='2'?'selected':''}>2 — Awareness</option>
            <option value="3" ${(a.ratings||{})[f.id]==='3'?'selected':''}>3 — Developing</option>
            <option value="4" ${(a.ratings||{})[f.id]==='4'?'selected':''}>4 — Established</option>
            <option value="5" ${(a.ratings||{})[f.id]==='5'?'selected':''}>5 — Embedded</option>
          </select>
        </div>
      `).join('')}
      ${hoa ? `<div class="divider"></div>
        <div class="flex-between" style="align-items:center;gap:.75rem">
          <div>
            <div class="text-xs text-muted mb-4">HoA RAG</div>
            ${hoaRagBadge(hoa.rag)}
          </div>
          <div style="flex:1">
            <label for="ad-digital-lead" style="font-size:.75rem;font-weight:600;color:var(--text-900);margin-bottom:.3rem;display:block">
              Digital Lead
              <span class="hint">(syncs with HoA Tracker)</span>
            </label>
            <input type="text" id="ad-digital-lead" value="${esc(hoa.digitalLead||'')}"
              placeholder="Digital Lead name(s)" style="font-size:.82rem">
          </div>
          <div style="flex:1">
            <label for="ad-future-lead" style="font-size:.75rem;font-weight:600;color:var(--text-900);margin-bottom:.3rem;display:block">
              Future Digital Lead
            </label>
            <input type="text" id="ad-future-lead" value="${esc(hoa.futureDigitalLead||'')}"
              placeholder="Potential future lead" style="font-size:.82rem">
          </div>
          <button class="btn btn-sm btn-secondary" style="flex-shrink:0;align-self:flex-end"
            onclick="closeModal();navigateTo('hoa-tracker');setTimeout(()=>{const sel=document.getElementById('hoa-detail-select');if(sel){sel.value='${code}';renderHoADetail();}},100)"
            aria-label="Open full HoA Tracker record for ${esc(code)}">
            ✏ HoA Detail
          </button>
        </div>` : ''}
    </div>

    <!-- NOTES TAB -->
    <div class="tab-panel" id="ad-panel-notes">
      <div class="form-group">
        <label for="ad-notes">Area notes <span class="hint">(free text — context, plans, observations)</span></label>
        <div class="input-with-mic" style="align-items:flex-start">
          <textarea id="ad-notes" rows="10">${esc(a.notes||'')}</textarea>
          <button class="mic-btn" onclick="startDictation('ad-notes')" aria-label="Dictate notes" style="margin-top:2px">🎤</button>
        </div>
      </div>
    </div>

    <!-- EVIDENCE TAB -->
    <div class="tab-panel" id="ad-panel-entries">
      ${renderAreaEntries(code)}
    </div>
  `, [
    { label:'Save', cls:'btn-primary', action:() => {
      a.group       = document.getElementById('ad-group')?.value?.trim() || a.group;
      a.coreSkills  = (document.getElementById('ad-core-skills')?.value  || '').split('\n').map(s=>s.trim()).filter(Boolean);
      a.subjectTools= (document.getElementById('ad-subject-tools')?.value|| '').split('\n').map(s=>s.trim()).filter(Boolean);
      a.notes       = document.getElementById('ad-notes')?.value?.trim() || '';
      if (!a.ratings) a.ratings = {};
      ratingFields.forEach(f => {
        const v = document.getElementById('ad-rat-'+f.id)?.value;
        if (v) a.ratings[f.id] = v;
      });
      // Sync Digital Lead edits back to HoA Tracker
      const hoaRec = DB.hoaTracker.find(x => x.code === code);
      if (hoaRec) {
        const dlVal = document.getElementById('ad-digital-lead')?.value?.trim();
        const flVal = document.getElementById('ad-future-lead')?.value?.trim();
        if (dlVal !== undefined) hoaRec.digitalLead = dlVal;
        if (flVal !== undefined) hoaRec.futureDigitalLead = flVal;
      }
      closeModal();
      renderAreas();
      toast(`${code} saved`, 'success');
    }},
    { label:'Close', cls:'btn-secondary', action:closeModal },
  ], { wide: true });
}

function renderAreaEntries(code) {
  const entries = DB.entries.filter(e => e.area === code)
    .sort((a,b) => b.date > a.date ? 1 : -1);
  if (!entries.length) return `<div class="empty-state"><p>No evidence entries for this area yet.</p></div>`;
  return `<div class="text-sm text-muted mb-8">${entries.length} entr${entries.length===1?'y':'ies'}</div>` +
    entries.map(e => `
      <div class="log-entry status-active mt-6">
        <div class="log-meta">${e.date} · ${esc(e.subtype||e.type||'Entry')}</div>
        <div class="fw-600 text-sm">${esc(e.title)}</div>
        ${e.strengths?`<p class="text-xs mt-4"><strong>Str:</strong> ${esc(e.strengths.substring(0,80))}</p>`:''}
        ${e.afis     ?`<p class="text-xs"><strong>AFI:</strong> ${esc(e.afis.substring(0,80))}</p>`:''}
      </div>
    `).join('');
}

function openAddAreaModal() {
  openModal('Add Curriculum Area', `
    <div class="form-row">
      <div class="form-group">
        <label for="na-code">Code <span class="req" aria-hidden="true">*</span></label>
        <input type="text" id="na-code" required aria-required="true" placeholder="e.g. NEW"
          style="text-transform:uppercase">
      </div>
      <div class="form-group">
        <label for="na-name">Name <span class="req" aria-hidden="true">*</span></label>
        <input type="text" id="na-name" required aria-required="true" placeholder="Full area name">
      </div>
    </div>
    <div class="form-group">
      <label for="na-group">Curriculum group</label>
      <input type="text" id="na-group" placeholder="e.g. Arts, Creative & Media">
    </div>
    <div class="form-group">
      <label for="na-skills">Core digital skills <span class="hint">(one per line)</span></label>
      <textarea id="na-skills" rows="3"></textarea>
    </div>
    <div class="form-group">
      <label for="na-tools">Subject tools <span class="hint">(one per line)</span></label>
      <textarea id="na-tools" rows="2"></textarea>
    </div>
  `, [
    { label:'Add area', cls:'btn-primary', action:() => {
      const code = document.getElementById('na-code')?.value?.trim().toUpperCase();
      const name = document.getElementById('na-name')?.value?.trim();
      if (!code || !name) { toast('Code and name required', 'error'); return; }
      if (DB.areas.find(a => a.code === code)) { toast('Code already exists', 'error'); return; }
      DB.areas.push({
        code, name,
        group:       document.getElementById('na-group')?.value?.trim() || 'Other',
        coreSkills:  (document.getElementById('na-skills')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean),
        subjectTools:(document.getElementById('na-tools')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean),
        ratings:     {}, notes: '',
      });
      closeModal();
      renderAreas();
      renderAreaDropdowns();
      toast(`${code} added`, 'success');
    }},
    { label:'Cancel', cls:'btn-secondary', action:closeModal },
  ]);
}

function exportAreaCSV() {
  const headers = ['Code','Name','Group','Core Skills','Subject Tools','Notes'];
  const rows = DB.areas.map(a => [
    a.code, a.name, a.group||'',
    (a.coreSkills||[]).join('; '),
    (a.subjectTools||[]).join('; '),
    a.notes||'',
  ].map(v => '"' + String(v).replace(/"/g,'""') + '"').join(','));
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'curriculum-areas-' + today() + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('Areas exported as CSV');
}

function exportEvidenceCSV() {
  const headers = ['Date','Type','Title','Area','Notes','Strengths','AFIs','Actions','RequestedBy','ThreadId'];
  const rows = DB.entries.map(e => [
    e.date||'', e.subtype||e.type||'', e.title||'', e.area||'',
    e.notes||'', e.strengths||'', e.afis||'', e.actions||'',
    e.requestedBy||'', e.threadId||'',
  ].map(v => '"' + String(v).replace(/"/g,'""') + '"').join(','));
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'evidence-log-' + today() + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('Evidence log exported as CSV');
}

// Stub called by activities.js renderTagClouds
function renderTagClouds() { /* Tag clouds rendered inline via renderTagChips */ }
