/* ================================================================
   DPC EVIDENCE HUB — activities.js
   All activity types: coaching, meetings, teach-meets, LWs,
   Digital Health Checks, resources, external CPD, own CPD, VFM.
   Every type supports referral + thread linking.
   ================================================================ */

'use strict';

// Activity subtypes — each maps to a form variant
const ACTIVITY_TYPES = {
  coaching:     { label:'1:1 Coaching',              icon:'🎯', evidenceId:'et14' },
  workshop:     { label:'Workshop / Team Session',   icon:'👥', evidenceId:'et2'  },
  teachmeet:    { label:'Teach-Meet',                icon:'📢', evidenceId:'et13' },
  lw:           { label:'Learning Walk',             icon:'🚶', evidenceId:'et15' },
  hc:           { label:'Digital Health Check',      icon:'🩺', evidenceId:'et16' },
  meeting:      { label:'Meeting',                   icon:'📅', evidenceId:'et3'  },
  devobs:       { label:'Developmental Observation', icon:'👁',  evidenceId:'et17' },
  resource:     { label:'Resource / Output created', icon:'📄', evidenceId:'et6'  },
  external:     { label:'External Event / CPD',      icon:'🌐', evidenceId:'et8'  },
  owncpd:       { label:'Own CPD / Professional Dev',icon:'📚', evidenceId:'et7'  },
  vfm:          { label:'Value for Money case',      icon:'💰', evidenceId:null   },
};

/* ── EVIDENCE LINKS (shared pattern) ─────────────────────────── */

let _qcLinkCount = 0;

function addQCEvidenceLink() {
  const list = document.getElementById('qc-evidence-links-list');
  if (!list) return;
  _qcLinkCount++;
  const n   = _qcLinkCount;
  const div = document.createElement('div');
  div.id    = 'qc-link-row-' + n;
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:.5rem;margin-bottom:.5rem;align-items:center';
  div.innerHTML = `
    <input type="url" id="qc-link-url-${n}" placeholder="https://…" aria-label="Link URL ${n}">
    <input type="text" id="qc-link-label-${n}" placeholder="Description" aria-label="Link description ${n}">
    <button class="btn btn-sm btn-danger" onclick="document.getElementById('qc-link-row-${n}').remove()"
      aria-label="Remove link">✕</button>
  `;
  list.appendChild(div);
}

function getQCEvidenceLinks() {
  const links = [];
  for (let i = 1; i <= _qcLinkCount; i++) {
    const url   = document.getElementById('qc-link-url-'+i)?.value?.trim();
    const label = document.getElementById('qc-link-label-'+i)?.value?.trim();
    if (url) links.push({ url, label: label || url });
  }
  return links;
}

/* ── QUICK CAPTURE ────────────────────────────────────────────── */

let _qcTags = {};
let _qcReferralId = '';
let _qcThreadId   = '';

function initQuickCapture(ctx) {
  _qcTags      = {};
  _qcReferralId = ctx?.referralId || '';
  _qcThreadId   = ctx?.threadId   || '';

  // Set defaults
  const dateEl = document.getElementById('qc-date');
  if (dateEl && !dateEl.value) dateEl.value = today();

  // Pre-fill subtype if coming from referral
  const subtypeEl = document.getElementById('qc-subtype');
  if (subtypeEl && ctx?.subtype) subtypeEl.value = ctx.subtype;

  // Show referral context if linked
  const refBanner = document.getElementById('qc-referral-banner');
  if (refBanner) {
    if (_qcReferralId) {
      const r = DB.referrals.find(x => x.id === _qcReferralId);
      refBanner.style.display = 'block';
      refBanner.innerHTML = r
        ? `<div class="notice info">
            <h3>📎 Responding to referral</h3>
            <p><strong>${esc(r.actionType)}</strong> requested by <strong>${esc(r.requestedBy)}</strong>${r.regarding?' re: '+esc(r.regarding):''}${r.context?'<br><em>'+esc(r.context)+'</em>':''}</p>
          </div>`
        : '';
    } else {
      refBanner.style.display = 'none';
    }
  }

  // Show thread context if linked — prominent banner
  const threadBanner = document.getElementById('qc-thread-banner');
  if (threadBanner) {
    if (_qcThreadId) {
      const t = DB.threads.find(x => x.id === _qcThreadId);
      threadBanner.style.display = 'block';
      threadBanner.innerHTML = t
        ? `<div style="background:var(--navy-800);color:#fff;padding:.65rem 1rem;border-radius:var(--radius-lg);margin-bottom:1rem;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
            <span style="font-size:1rem" aria-hidden="true">🔗</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:.7rem;opacity:.7;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em">Adding to thread</div>
              <div style="font-weight:600;font-size:.9rem">${esc(t.name)}</div>
              ${t.initiatedBy?`<div style="font-size:.72rem;opacity:.7">Requested by: ${esc(t.initiatedBy)}</div>`:''}
            </div>
            <button onclick="_qcThreadId='';initQuickCapture({})"
              style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;padding:.3rem .65rem;border-radius:var(--radius);font-size:.75rem;cursor:pointer;white-space:nowrap"
              aria-label="Unlink from this thread">Unlink</button>
          </div>`
        : '';
    } else {
      threadBanner.style.display = 'none';
    }
  }

  updateQCTagButton();

  // Populate the existing-thread selector
  const threadSel = document.getElementById('qc-link-thread-sel');
  if (threadSel) {
    while (threadSel.options.length > 1) threadSel.remove(1);
    DB.threads
      .filter(t => t.status === 'active' || t.status === 'awaiting-follow-up')
      .sort((a, b) => b.updated > a.updated ? 1 : -1)
      .forEach(t => threadSel.add(new Option(
        t.name + (t.area ? ' [' + t.area + ']' : ''), t.id
      )));
    if (_qcThreadId) threadSel.value = _qcThreadId;
  }
}

function linkQCToThread(threadId) {
  _qcThreadId = threadId;
  if (threadId) {
    const cb = document.getElementById('qc-new-thread');
    if (cb) { cb.checked = false; document.getElementById('qc-thread-row').style.display = 'none'; }
  }
  const threadBanner = document.getElementById('qc-thread-banner');
  if (!threadBanner) return;
  if (threadId) {
    const t = DB.threads.find(x => x.id === threadId);
    threadBanner.style.display = 'block';
    threadBanner.innerHTML = t
      ? `<div style="background:var(--navy-800);color:#fff;padding:.65rem 1rem;border-radius:var(--radius-lg);margin-bottom:1rem;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
          <span aria-hidden="true">🔗</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.7rem;opacity:.7;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.06em">Linked to thread</div>
            <div style="font-weight:600;font-size:.9rem">${esc(t.name)}</div>
            ${t.initiatedBy ? `<div style="font-size:.72rem;opacity:.7">Requested by: ${esc(t.initiatedBy)}</div>` : ''}
          </div>
          <button onclick="linkQCToThread('');document.getElementById('qc-link-thread-sel').value=''"
            style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;padding:.3rem .65rem;border-radius:var(--radius);font-size:.75rem;cursor:pointer"
            aria-label="Unlink from thread">Unlink</button>
        </div>`
      : '';
  } else {
    threadBanner.style.display = 'none';
    threadBanner.innerHTML = '';
  }
}

function updateQCTagButton() {
  const btn = document.getElementById('qc-tag-btn');
  if (!btn) return;
  const count = countTags(_qcTags);
  btn.innerHTML = `🏷 Tags${count ? ` <span class="badge badge-navy">${count}</span>` : ''}`;
  // Update display chips
  const chips = document.getElementById('qc-tag-chips');
  if (chips) chips.innerHTML = renderTagChips(_qcTags);
}

function openQCTagPicker() {
  openTagPicker(tags => {
    _qcTags = tags;
    updateQCTagButton();
  }, _qcTags, 'standard');
}

function toggleQCAdvanced() {
  const panel = document.getElementById('qc-advanced');
  const btn   = document.getElementById('qc-advanced-btn');
  if (!panel) return;
  const open = panel.style.display === 'none' || panel.style.display === '';
  panel.style.display = open ? 'block' : 'none';
  panel.setAttribute('aria-hidden', String(!open));
  btn.textContent = open ? '− Hide structured fields' : '+ Add structured fields';
  btn.setAttribute('aria-expanded', String(open));
}

function toggleHoAOption() {
  const area = document.getElementById('qc-area')?.value;
  const row  = document.getElementById('hoa-toggle-row');
  if (row) row.style.display = area ? 'flex' : 'none';
  if (!area) {
    const cb = document.getElementById('qc-update-hoa');
    if (cb) cb.checked = false;
    const preview = document.getElementById('qc-hoa-preview');
    if (preview) preview.style.display = 'none';
  }
}

function toggleHoAPreview() {
  const checked = document.getElementById('qc-update-hoa')?.checked;
  const preview = document.getElementById('qc-hoa-preview');
  if (preview) preview.style.display = checked ? 'block' : 'none';
  if (checked) {
    const adv = document.getElementById('qc-advanced');
    if (adv && !adv.classList.contains('open')) toggleQCAdvanced();
  }
}

function saveQuickCapture() {
  const date     = document.getElementById('qc-date')?.value;
  const title    = document.getElementById('qc-title')?.value?.trim();
  const notes    = document.getElementById('qc-notes')?.value?.trim();
  const area     = document.getElementById('qc-area')?.value;
  const subtype  = document.getElementById('qc-subtype')?.value || 'Quick Capture';
  const summary  = document.getElementById('qc-summary')?.value?.trim();
  const strengths= document.getElementById('qc-strengths')?.value?.trim();
  const afis     = document.getElementById('qc-afis')?.value?.trim();
  const actions  = document.getElementById('qc-actions')?.value?.trim();
  const updateHoA= document.getElementById('qc-update-hoa')?.checked;

  // Validate
  if (!title) { markInvalid('qc-title','Title is required'); return; }
  if (!date)  { markInvalid('qc-date','Date is required');  return; }

  // Determine thread
  let threadId = _qcThreadId;
  const newThread = document.getElementById('qc-new-thread')?.checked;
  if (newThread && !threadId) {
    const threadName = document.getElementById('qc-thread-name')?.value?.trim()
      || [area||'', subtype, fmtDate(date)].filter(Boolean).join(' · ');
    threadId = createThread(threadName, 'Self-initiated');
  }

  const entry = {
    id:          genId('entry'),
    type:        mapSubtypeToType(subtype),
    subtype:     subtype,
    date,
    title,
    notes:       notes || '',
    area:        area  || '',
    summary:     summary   || '',
    strengths:   strengths || '',
    afis:        afis      || '',
    actions:     actions   || '',
    tags:        _qcTags,
    evidenceLinks: getQCEvidenceLinks(),
    referralId:  _qcReferralId || '',
    threadId:    threadId  || '',
    requestedBy: _qcReferralId ? (DB.referrals.find(r=>r.id===_qcReferralId)?.requestedBy||'') : '',
    created:     new Date().toISOString(),
  };

  DB.entries.unshift(entry);
  markDirty();

  // Link to thread
  if (threadId) linkEntryToThread(entry.id, threadId);

  // Update referral status
  if (_qcReferralId) {
    const ref = DB.referrals.find(r => r.id === _qcReferralId);
    if (ref) ref.status = 'in-progress';
  }

  // Complete linked task if any
  const linkedTask = DB.tasks.find(t => t.referralId === _qcReferralId && t.status !== 'done');
  if (linkedTask) { linkedTask.status = 'done'; linkedTask.entryId = entry.id; }

  // Push to HoA Tracker if requested
  if (updateHoA && area) pushToHoATracker(area, entry, date);

  toast('Entry saved', 'success');
  clearQuickCapture();
  renderDashboard();
  updateReferralBadge();
}

function clearQuickCapture() {
  const t = today();
  ['qc-title','qc-notes','qc-summary','qc-strengths','qc-afis','qc-actions']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const dateEl = document.getElementById('qc-date');
  if (dateEl) dateEl.value = t;
  const areaEl = document.getElementById('qc-area');
  if (areaEl) areaEl.value = '';
  const subtypeEl = document.getElementById('qc-subtype');
  if (subtypeEl) subtypeEl.value = '';
  const hoaCb = document.getElementById('qc-update-hoa');
  if (hoaCb) hoaCb.checked = false;
  const hoaRow = document.getElementById('hoa-toggle-row');
  if (hoaRow) hoaRow.style.display = 'none';
  const hoaPreview = document.getElementById('qc-hoa-preview');
  if (hoaPreview) hoaPreview.style.display = 'none';
  const adv = document.getElementById('qc-advanced');
  if (adv && adv.classList.contains('open')) toggleQCAdvanced();
  const newThread = document.getElementById('qc-new-thread');
  if (newThread) newThread.checked = false;
  const threadName = document.getElementById('qc-thread-name');
  if (threadName) threadName.value = '';
  const threadRow = document.getElementById('qc-thread-row');
  if (threadRow) threadRow.style.display = 'none';

  _qcTags       = {};
  _qcReferralId = '';
  _qcThreadId   = '';
  _qcLinkCount  = 0;
  const linkList = document.getElementById('qc-evidence-links-list');
  if (linkList) linkList.innerHTML = '';

  // Clear validation states
  document.querySelectorAll('[aria-invalid="true"]').forEach(el => {
    el.removeAttribute('aria-invalid');
    el.nextElementSibling?.classList?.remove('field-error');
  });

  updateQCTagButton();
}

function mapSubtypeToType(subtype) {
  const map = {
    'Learning Walk':'lw', 'Digital Health Check':'hc',
    '1:1 Coaching':'coaching', 'Workshop / Team Session':'coaching',
    'Teach-Meet':'teachmeet', 'Meeting':'meeting',
    'Resource / Output created':'resource',
    'External Event / CPD':'external',
    'Own CPD / Professional Dev':'owncpd',
  };
  return map[subtype] || 'quick-capture';
}

/* ── HoA TRACKER PUSH ─────────────────────────────────────────── */

function pushToHoATracker(areaCode, entry, date) {
  const tracker = DB.hoaTracker.find(a => a.code === areaCode);
  if (!tracker) return;
  snapshotHoA(tracker, 'Auto — Quick Capture push');
  const pfx = '[' + date + '] ';
  const app = (existing, newVal) => {
    if (!newVal) return existing || '';
    return existing ? (existing + '\n' + pfx + newVal) : (pfx + newVal);
  };
  if (entry.summary)  tracker.meeting1Summary = app(tracker.meeting1Summary, entry.summary);
  if (entry.strengths)tracker.strengths       = app(tracker.strengths, entry.strengths);
  if (entry.afis)     tracker.afis            = app(tracker.afis, entry.afis);
  if (entry.actions)  tracker.priorityActions = app(tracker.priorityActions, entry.actions);
  if (['Teach-Meet'].includes(entry.subtype))
    tracker.teachMeets = app(tracker.teachMeets, entry.title);
  if (['1:1 Coaching','coaching'].includes(entry.subtype))
    tracker.coaching1to1 = app(tracker.coaching1to1, entry.title);
  if (entry.actions) tracker.nextAction = date + ': ' + entry.actions;
  if (entry.subtype === 'Meeting' && tracker.metM1 !== 'Y') tracker.metM1 = 'Y';
  toast('HoA Tracker updated for ' + areaCode, 'success');
}

/* ── EVIDENCE LOG ─────────────────────────────────────────────── */

function renderEvidenceLog() {
  const search = (document.getElementById('filter-search')?.value || '').toLowerCase();
  const area   = document.getElementById('filter-area')?.value   || '';
  const type   = document.getElementById('filter-type')?.value   || '';
  const from   = document.getElementById('filter-from')?.value   || '';
  const to     = document.getElementById('filter-to')?.value     || '';
  const thread = document.getElementById('filter-thread')?.value || '';

  const filtered = DB.entries.filter(e => {
    if (search && !e.title?.toLowerCase().includes(search) && !(e.notes||'').toLowerCase().includes(search)) return false;
    if (area   && e.area    !== area)   return false;
    if (type   && e.subtype !== type && e.type !== type)  return false;
    if (from   && e.date    <  from)    return false;
    if (to     && e.date    >  to)      return false;
    if (thread && e.threadId !== thread) return false;
    return true;
  }).sort((a, b) => b.date > a.date ? 1 : -1);

  const wrap = document.getElementById('evidence-log-wrapper');
  if (!wrap) return;

  document.getElementById('evidence-log-count').textContent =
    `${filtered.length} entr${filtered.length===1?'y':'ies'}`;

  if (!filtered.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><p>No entries match these filters.</p></div>`;
    return;
  }

  wrap.innerHTML = `<table class="data-table" aria-label="Evidence entries">
    <caption class="sr-only">Evidence log entries, most recent first</caption>
    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Entry</th>
        <th scope="col">Area</th>
        <th scope="col">Thread</th>
        <th scope="col">Tags</th>
        <th scope="col"><span class="sr-only">Actions</span></th>
      </tr>
    </thead>
    <tbody>
      ${filtered.map(e => {
        const thread = e.threadId ? DB.threads.find(t => t.id === e.threadId) : null;
        const aName  = DB.areas.find(a => a.code === e.area)?.name || e.area || '—';
        return `<tr>
          <td><code class="text-xs text-mono">${e.date}</code></td>
          <td>
            <div class="fw-600 text-sm">${esc(e.title)}</div>
            ${e.subtype ? `<div class="text-xs text-muted">${esc(e.subtype)}</div>` : ''}
            ${e.notes   ? `<div class="text-xs text-muted mt-4">${esc(e.notes.substring(0,80))}${e.notes.length>80?'…':''}</div>` : ''}
            ${e.strengths?`<div class="text-xs mt-4"><strong>Str:</strong> ${esc(e.strengths.substring(0,60))}</div>`:''}
            ${e.afis     ?`<div class="text-xs"><strong>AFI:</strong> ${esc(e.afis.substring(0,60))}</div>`:''}
            ${e.requestedBy?`<div class="text-xs text-muted mt-4">📎 From: ${esc(e.requestedBy)}</div>`:''}
            ${(e.evidenceLinks||[]).length?`<div class="text-xs mt-4">${e.evidenceLinks.map(l=>`<a href="${esc(l.url)}" target="_blank" rel="noopener" class="text-navy" style="margin-right:.4rem">🔗 ${esc(l.label)}</a>`).join('')}</div>`:''}
          </td>
          <td class="text-sm">${esc(aName)}</td>
          <td class="text-xs">
            ${thread ? `<button class="btn btn-sm btn-ghost" onclick="openThreadDetail('${thread.id}')"
              style="text-align:left;white-space:normal">${esc(thread.name.substring(0,30))}${thread.name.length>30?'…':''}</button>` : '—'}
          </td>
          <td><div class="flex flex-wrap gap-4">${renderTagChips(e.tags)}</div></td>
          <td>
            <div class="flex gap-4">
              <button class="btn btn-sm btn-secondary" onclick="editEntry('${e.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteEntry('${e.id}')">Del</button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function deleteEntry(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  DB.entries = DB.entries.filter(e => e.id !== id);
  // Remove from any threads
  DB.threads.forEach(t => {
    t.entryIds = t.entryIds.filter(eid => eid !== id);
  });
  renderEvidenceLog();
  renderDashboard();
  toast('Entry deleted');
}

function editEntry(id) {
  const e = DB.entries.find(x => x.id === id);
  if (!e) return;
  openModal('Edit Entry', `
    <div class="form-row">
      <div class="form-group">
        <label for="ed-date">Date</label>
        <input type="date" id="ed-date" value="${esc(e.date)}">
      </div>
      <div class="form-group">
        <label for="ed-subtype">Type</label>
        <input type="text" id="ed-subtype" value="${esc(e.subtype||'')}">
      </div>
    </div>
    <div class="form-group">
      <label for="ed-title">Title</label>
      <input type="text" id="ed-title" value="${esc(e.title)}">
    </div>
    <div class="form-group">
      <label for="ed-notes">Notes</label>
      <textarea id="ed-notes" rows="4">${esc(e.notes||'')}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="ed-strengths">Strengths</label>
        <textarea id="ed-strengths" rows="3">${esc(e.strengths||'')}</textarea>
      </div>
      <div class="form-group">
        <label for="ed-afis">AFIs</label>
        <textarea id="ed-afis" rows="3">${esc(e.afis||'')}</textarea>
      </div>
    </div>
    <div class="form-group">
      <label for="ed-actions">Priority Actions</label>
      <textarea id="ed-actions" rows="2">${esc(e.actions||'')}</textarea>
    </div>
  `, [
    { label:'Save', cls:'btn-primary', action:() => {
      e.date     = document.getElementById('ed-date')?.value     || e.date;
      e.subtype  = document.getElementById('ed-subtype')?.value  || e.subtype;
      e.title    = document.getElementById('ed-title')?.value    || e.title;
      e.notes    = document.getElementById('ed-notes')?.value    || '';
      e.strengths= document.getElementById('ed-strengths')?.value|| '';
      e.afis     = document.getElementById('ed-afis')?.value     || '';
      e.actions  = document.getElementById('ed-actions')?.value  || '';
      closeModal();
      renderEvidenceLog();
      toast('Entry updated', 'success');
    }},
    { label:'Cancel', cls:'btn-secondary', action: closeModal }
  ]);
}

function clearEvidenceFilters() {
  ['filter-search','filter-from','filter-to'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['filter-area','filter-type','filter-thread'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  renderEvidenceLog();
}

/* ── OWN CPD + EXTERNAL NETWORKING ───────────────────────────── */

function renderOwnCPD() {
  renderOwnCPDList();
  renderExternalCPDList();
}

function addCPDLink(listId, prefix) {
  const list = document.getElementById(listId);
  if (!list) return;
  const n   = list.children.length + 1;
  const div = document.createElement('div');
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:.5rem;margin-bottom:.5rem;align-items:center';
  div.innerHTML = `
    <input type="url" id="${prefix}-url-${n}" placeholder="https://…" aria-label="Link ${n} URL">
    <input type="text" id="${prefix}-label-${n}" placeholder="Description" aria-label="Link ${n} description">
    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()" aria-label="Remove">✕</button>
  `;
  list.appendChild(div);
}

function getCPDLinks(listId, prefix) {
  const list  = document.getElementById(listId);
  if (!list) return [];
  return Array.from(list.children).map((_, i) => {
    const n     = i + 1;
    const url   = document.getElementById(prefix+'-url-'+n)?.value?.trim();
    const label = document.getElementById(prefix+'-label-'+n)?.value?.trim();
    return url ? { url, label: label || url } : null;
  }).filter(Boolean);
}

function openAddOwnCPDModal() {
  openModal('Log Own CPD / Professional Development', `
    <div class="form-row">
      <div class="form-group">
        <label for="cpd-date">Date <span class="req" aria-hidden="true">*</span></label>
        <input type="date" id="cpd-date" value="${today()}" required aria-required="true">
      </div>
      <div class="form-group">
        <label for="cpd-type">Type</label>
        <select id="cpd-type">
          <option>Online course / webinar</option>
          <option>Reading / research</option>
          <option>Conference / event</option>
          <option>Peer learning / observation</option>
          <option>Qualification / accreditation</option>
          <option>Coaching received</option>
          <option>Mentoring received</option>
          <option>Other</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="cpd-title">Title / what you did <span class="req" aria-hidden="true">*</span></label>
      <div class="input-with-mic">
        <input type="text" id="cpd-title" required aria-required="true" placeholder="e.g. Jisc Digital Elevation Tool training">
        <button class="mic-btn" onclick="startDictation('cpd-title')" aria-label="Dictate">🎤</button>
      </div>
    </div>
    <div class="form-group">
      <label for="cpd-provider">Provider / source</label>
      <input type="text" id="cpd-provider" placeholder="e.g. Jisc, ETF, Weston College, Self">
    </div>
    <div class="form-group">
      <label for="cpd-hours">Hours / duration</label>
      <input type="text" id="cpd-hours" placeholder="e.g. 3 hours, half day">
    </div>
    <div class="form-group">
      <label for="cpd-learning">Key learning / takeaways</label>
      <div class="input-with-mic" style="align-items:flex-start">
        <textarea id="cpd-learning" rows="4" placeholder="What did you learn? What will you apply?"></textarea>
        <button class="mic-btn" onclick="startDictation('cpd-learning')" aria-label="Dictate" style="margin-top:2px">🎤</button>
      </div>
    </div>
    <div class="form-group">
      <label for="cpd-impact">Impact / application to practice</label>
      <textarea id="cpd-impact" rows="3" placeholder="How did this change or improve your work?"></textarea>
    </div>
    <div class="form-group">
      <label for="cpd-evidence">Evidence / certificate</label>
      <input type="text" id="cpd-evidence" placeholder="e.g. Certificate saved to SharePoint, Teams recording, URL">
    </div>
    <div class="form-group">
      <label>Evidence links</label>
      <div id="cpd-links-list"></div>
      <button class="btn btn-sm btn-ghost mt-4" onclick="addCPDLink('cpd-links-list','cpd-link')">+ Add link</button>
    </div>
  `, [
    { label:'Save CPD record', cls:'btn-primary', action:() => {
      const title = document.getElementById('cpd-title')?.value?.trim();
      const date  = document.getElementById('cpd-date')?.value;
      if (!title) { markInvalid('cpd-title','Title required'); return; }
      if (!date)  { markInvalid('cpd-date','Date required');  return; }
      const entry = {
        id:       genId('entry'), type:'owncpd', subtype:'Own CPD',
        date,     title,
        notes:    document.getElementById('cpd-learning')?.value?.trim() || '',
        provider: document.getElementById('cpd-provider')?.value?.trim() || '',
        hours:    document.getElementById('cpd-hours')?.value?.trim()    || '',
        impact:   document.getElementById('cpd-impact')?.value?.trim()   || '',
        evidence: document.getElementById('cpd-evidence')?.value?.trim() || '',
        evidenceLinks: getCPDLinks('cpd-links-list','cpd-link'),
        cpdType:  document.getElementById('cpd-type')?.value || '',
        tags:     {},
        created:  new Date().toISOString(),
      };
      DB.entries.unshift(entry);
  markDirty();
      closeModal();
      renderOwnCPDList();
      renderDashboard();
      toast('CPD record saved', 'success');
    }},
    { label:'Cancel', cls:'btn-secondary', action:closeModal }
  ]);
}

function renderOwnCPDList() {
  const el = document.getElementById('own-cpd-list');
  if (!el) return;
  const items = DB.entries.filter(e => e.type === 'owncpd' || e.subtype === 'Own CPD / Professional Dev')
    .sort((a,b) => b.date > a.date ? 1 : -1);
  if (!items.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📚</div><p>No CPD records yet.</p></div>`;
    return;
  }
  el.innerHTML = items.map(e => `
    <div class="log-entry status-active">
      <div class="log-meta">
        <span>${fmtDate(e.date)}</span>
        <span>·</span>
        <span>${esc(e.cpdType||'CPD')}</span>
        ${e.provider ? `<span>·</span><span>${esc(e.provider)}</span>` : ''}
        ${e.hours    ? `<span>·</span><span>${esc(e.hours)}</span>` : ''}
      </div>
      <div class="fw-600 text-sm">${esc(e.title)}</div>
      ${e.notes  ? `<p class="text-sm mt-4">${esc(e.notes)}</p>` : ''}
      ${e.impact ? `<p class="text-sm mt-4"><strong>Impact:</strong> ${esc(e.impact)}</p>` : ''}
      ${e.evidence?`<p class="text-xs text-muted mt-4">📎 ${esc(e.evidence)}</p>` : ''}
      <div class="mt-8">
        <button class="btn btn-sm btn-danger" onclick="deleteEntry('${e.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function openAddExternalModal() {
  openModal('Log External Event / Networking', `
    <div class="form-row">
      <div class="form-group">
        <label for="ext-date">Date <span class="req" aria-hidden="true">*</span></label>
        <input type="date" id="ext-date" value="${today()}" required aria-required="true">
      </div>
      <div class="form-group">
        <label for="ext-type">Type</label>
        <select id="ext-type">
          <option>BETT</option>
          <option>Digifest</option>
          <option>ETF / SET Conference</option>
          <option>Jisc BDC Community of Practice</option>
          <option>Jisc event / webinar</option>
          <option>Local / regional event</option>
          <option>Sector networking</option>
          <option>College visit</option>
          <option>Podcast / video CPD</option>
          <option>Other external event</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="ext-title">Event / activity title <span class="req" aria-hidden="true">*</span></label>
      <div class="input-with-mic">
        <input type="text" id="ext-title" required aria-required="true" placeholder="e.g. Jisc BDC CoP — Autumn 2026">
        <button class="mic-btn" onclick="startDictation('ext-title')" aria-label="Dictate">🎤</button>
      </div>
    </div>
    <div class="form-group">
      <label for="ext-org">Organisation / host</label>
      <input type="text" id="ext-org" placeholder="e.g. Jisc, Weston College, ETF">
    </div>
    <div class="form-group">
      <label for="ext-writeup">Write-up / key learning</label>
      <div class="input-with-mic" style="align-items:flex-start">
        <textarea id="ext-writeup" rows="5" placeholder="Key sessions, speakers, ideas to bring back to Weston…"></textarea>
        <button class="mic-btn" onclick="startDictation('ext-writeup')" aria-label="Dictate" style="margin-top:2px">🎤</button>
      </div>
    </div>
    <div class="form-group">
      <label for="ext-contacts">New contacts / networks made</label>
      <input type="text" id="ext-contacts" placeholder="e.g. Tom (City College) — sharing AT toolkit">
    </div>
    <div class="form-group">
      <label for="ext-actions">Actions / follow-ups</label>
      <textarea id="ext-actions" rows="2" placeholder="What will you do with this learning?"></textarea>
    </div>
    <div class="form-group">
      <label>Event links / resources</label>
      <div id="ext-links-list"></div>
      <button class="btn btn-sm btn-ghost mt-4" onclick="addCPDLink('ext-links-list','ext-link')">+ Add link</button>
    </div>
  `, [
    { label:'Save event', cls:'btn-primary', action:() => {
      const title = document.getElementById('ext-title')?.value?.trim();
      const date  = document.getElementById('ext-date')?.value;
      if (!title) { markInvalid('ext-title','Title required'); return; }
      const entry = {
        id:       genId('entry'), type:'external', subtype:'External Event / CPD',
        date,     title,
        notes:    document.getElementById('ext-writeup')?.value?.trim()  || '',
        org:      document.getElementById('ext-org')?.value?.trim()      || '',
        contacts: document.getElementById('ext-contacts')?.value?.trim() || '',
        actions:  document.getElementById('ext-actions')?.value?.trim()  || '',
        extType:  document.getElementById('ext-type')?.value || '',
        evidenceLinks: getCPDLinks('ext-links-list','ext-link'),
        tags:     {},
        created:  new Date().toISOString(),
      };
      DB.entries.unshift(entry);
  markDirty();
      closeModal();
      renderExternalCPDList();
      renderDashboard();
      toast('Event saved', 'success');
    }},
    { label:'Cancel', cls:'btn-secondary', action:closeModal }
  ]);
}

function renderExternalCPDList() {
  const el = document.getElementById('external-cpd-list');
  if (!el) return;
  const items = DB.entries.filter(e => e.type === 'external')
    .sort((a,b) => b.date > a.date ? 1 : -1);
  if (!items.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🌐</div><p>No external events yet.</p></div>`;
    return;
  }
  el.innerHTML = items.map(e => `
    <div class="log-entry status-active">
      <div class="log-meta">
        <span>${fmtDate(e.date)}</span>
        <span>·</span>
        <span>${esc(e.extType||'External')}</span>
        ${e.org ? `<span>·</span><span>${esc(e.org)}</span>` : ''}
      </div>
      <div class="fw-600 text-sm">${esc(e.title)}</div>
      ${e.notes    ? `<p class="text-sm mt-4">${esc(e.notes)}</p>` : ''}
      ${e.contacts ? `<p class="text-xs mt-4 text-muted">🤝 ${esc(e.contacts)}</p>` : ''}
      ${e.actions  ? `<p class="text-xs mt-4"><strong>Actions:</strong> ${esc(e.actions)}</p>` : ''}
      <div class="mt-8">
        <button class="btn btn-sm btn-danger" onclick="deleteEntry('${e.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

/* ── DASHBOARD ────────────────────────────────────────────────── */

function renderDashboard() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const was = weekAgo.toISOString().split('T')[0];

  const total     = DB.entries.length;
  const thisWeek  = DB.entries.filter(e => e.date >= was).length;
  const areas     = new Set(DB.entries.filter(e=>e.area).map(e=>e.area)).size;
  const openRef   = DB.referrals.filter(r=>r.status!=='complete').length;
  const openTasks = DB.tasks.filter(t=>t.status!=='done').length;

  const stTotal = document.getElementById('stat-total');     if (stTotal) stTotal.textContent = total;
  const stWeek  = document.getElementById('stat-week');       if (stWeek)  stWeek.textContent  = thisWeek;
  const stAreas = document.getElementById('stat-areas');      if (stAreas) stAreas.textContent = areas;
  const stRef   = document.getElementById('stat-referrals');  if (stRef)   stRef.textContent   = openRef;

  // Recent entries
  const recentEl = document.getElementById('dashboard-recent');
  if (recentEl) {
    const recent = DB.entries.slice(0, 5);
    recentEl.innerHTML = recent.length ? recent.map(e => `
      <div class="log-entry status-active">
        <div class="log-meta">${e.date}${e.area?' · '+e.area:''}${e.subtype?' · '+esc(e.subtype):''}</div>
        <div class="fw-600 text-sm">${esc(e.title)}</div>
      </div>
    `).join('') : `<div class="empty-state"><p>No entries yet.</p></div>`;
  }

  renderDashboardHoASummary();
  renderAccountabilityCoverage();
  renderUpcomingAnchors();
}

function renderDashboardHoASummary() {
  const el = document.getElementById('dashboard-hoa');
  if (!el || !DB.hoaTracker.length) return;
  const total    = DB.hoaTracker.length;
  const met      = DB.hoaTracker.filter(a=>a.metM1==='Y').length;
  const rated    = DB.hoaTracker.filter(a=>a.rag);
  const avg      = rated.length ? (rated.reduce((s,a)=>s+a.rag,0)/rated.length).toFixed(1) : '—';
  const priority = DB.hoaTracker.filter(a=>a.rag>=4);
  const leads    = DB.hoaTracker.filter(a=>a.digitalLead?.trim()).length;

  el.innerHTML = `<div class="grid-3 mb-12">
    <div class="stat-card c-teal">
      <div class="stat-n">${met}/${total}</div>
      <div class="stat-l">Meetings held (M1)</div>
    </div>
    <div class="stat-card c-amber">
      <div class="stat-n" style="color:${parseFloat(avg)>=4?'var(--red-700)':parseFloat(avg)>=3?'var(--amber-700)':'var(--green-700)'}">${avg}</div>
      <div class="stat-l">Avg RAG (1=confident · 5=urgent)</div>
    </div>
    <div class="stat-card c-red">
      <div class="stat-n">${priority.length}</div>
      <div class="stat-l">Priority areas (RAG 4–5)</div>
    </div>
  </div>
  ${priority.length ? `<div class="text-sm fw-600 mb-6">Requiring attention:</div>
  <div class="flex flex-wrap gap-4 mb-12">
    ${priority.map(a=>`<span class="badge ${a.rag===5?'badge-red':'badge-amber'}">${a.code}</span>`).join('')}
  </div>` : ''}
  <div class="text-sm text-muted">Digital Leads: <strong>${leads}</strong> of ${total} &nbsp;·&nbsp;
    <button class="btn btn-sm btn-secondary" onclick="navigateTo('hoa-tracker')">Open HoA Tracker →</button>
  </div>`;
}

function renderAccountabilityCoverage() {
  const el = document.getElementById('accountability-coverage');
  if (!el) return;
  el.innerHTML = DB.tags.accountability.map(t => {
    const count = DB.entries.filter(e => (e.tags?.accountability||[]).includes(t.id)).length;
    const pct   = Math.min(100, count * 8);
    return `<div class="mb-8">
      <div class="flex-between text-xs mb-4">
        <span>${esc(t.label.substring(0,44))}${t.label.length>44?'…':''}</span>
        <span class="text-muted">${count}</span>
      </div>
      <div class="progress-bar-wrap" role="progressbar" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="12"
        aria-label="${esc(t.label)}: ${count} entries">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
  }).join('');
}

function renderUpcomingAnchors() {
  const el = document.getElementById('upcoming-anchors');
  if (!el) return;
  const anchors = [
    { date:'2026-05-31', label:'End of Phase 1 — HoA conversations complete; mapping summary shared' },
    { date:'2026-06-30', label:'Named Digital Lead in every area; first accessibility session delivered' },
    { date:'2026-07-31', label:'Phase 2 begins — accessibility videos published to SharePoint' },
    { date:'2026-10-01', label:'3-Month Pilot Review — baseline established, coaching initiated, Jisc deployed' },
    { date:'2027-04-01', label:'9-Month Pilot Review — progress against all 8 KPI areas' },
    { date:'2027-07-31', label:'18-Month Pilot Review — comprehensive evidence portfolio' },
  ];
  const todayStr = today();
  const upcoming = anchors.filter(a => a.date >= todayStr).slice(0, 4);
  el.innerHTML = upcoming.map(a => `
    <div class="flex gap-12 text-sm" style="padding:.5rem 0;border-bottom:1px solid var(--border)">
      <code class="text-mono text-xs" style="min-width:80px;color:var(--text-600)">${a.date}</code>
      <span>${esc(a.label)}</span>
    </div>
  `).join('') || '<p class="text-sm text-muted">All milestones past.</p>';
}

/* ── SETTINGS — DATA TAB ─────────────────────────────────────── */

function renderSettingsData() {
  const el = document.getElementById('settings-data-content');
  if (!el) return;
  el.innerHTML = `
    <div class="card mb-16">
      <div class="card-title">Data file</div>
      <p class="text-sm text-muted mb-12">Load your data file at the start of each session. Save back to the same file when done.</p>
      <div class="flex gap-8 flex-wrap">
        <button class="btn btn-primary" onclick="loadJSON()">📂 Load JSON</button>
        <button class="btn btn-teal" onclick="saveJSON()">💾 Save JSON</button>
        <button class="btn btn-secondary" onclick="exportJSON()">Export copy</button>
      </div>
    </div>
    <div class="card mb-16">
      <div class="card-title">Reset</div>
      <p class="text-sm text-muted mb-12">Clears in-memory data only — does not delete any saved file.</p>
      <button class="btn btn-danger" onclick="resetData()">⚠ Reset in-memory data</button>
    </div>
    <div class="card">
      <div class="card-title">About</div>
      <p class="text-sm" style="line-height:1.8">
        <strong>DPC Evidence Hub v4.0</strong><br>
        Weston College Group · 2026<br><br>
        Built for Graeme Wright, Digital Pedagogy Coach, Quality & Innovation Team.<br><br>
        All data stored in a JSON file you control. AI report generation sends selected entries to the Anthropic API only.<br><br>
        <strong>Accessibility:</strong> WCAG 2.2 AA throughout — all colour pairs programmatically verified.<br>
        <strong>Frameworks:</strong> ETF DTPF · DigCompEdu · Jisc BDC · Ofsted EIF · WCAG 2.2<br>
        <strong>Pilot governance:</strong> Oct 2026 · Apr 2027 · Jul 2027
      </p>
    </div>
  `;
}

function exportJSON() {
  DB.meta.lastSaved = new Date().toISOString();
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'dpc-evidence-store-export-' + today() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Export saved', 'success');
}

function resetData() {
  if (!confirm('Clear all in-memory data? Saved file is not affected.')) return;
  DB.entries = []; DB.referrals = []; DB.threads = []; DB.tasks = [];
  DB.staffRecords = []; DB.resources = []; DB.learnerData = [];
  DB.areas = []; DB.hoaTracker = [];
  DB.requestedByCustom = [];
  initDB();
  updateJSONStatus(false);
  renderDashboard();
  renderWeeklyView();
  toast('Reset complete');
}

/* ── FORM HELPERS ─────────────────────────────────────────────── */

function markInvalid(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.setAttribute('aria-invalid', 'true');
  const errId = fieldId + '-err';
  let errEl   = document.getElementById(errId);
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.id        = errId;
    errEl.className = 'field-error';
    errEl.setAttribute('role', 'alert');
    el.parentNode.insertBefore(errEl, el.nextSibling);
  }
  errEl.textContent = msg;
  el.setAttribute('aria-describedby', errId);
  el.focus();
  el.addEventListener('input', () => {
    el.removeAttribute('aria-invalid');
    errEl.textContent = '';
  }, { once: true });
}
