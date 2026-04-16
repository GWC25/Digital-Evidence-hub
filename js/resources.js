/* ================================================================
   DPC EVIDENCE HUB — resources.js
   Resource Library — reusable links, video tutorials, webinars,
   PDFs, SharePoint resources, templates, case studies.
   These exist outside individual activity entries — they are
   "to use again and share" assets for ongoing coaching and meetings.
   ================================================================ */

'use strict';

// Resource categories with icons
const RES_CATS = {
  'Video tutorial':       { icon: '🎬', colour: 'badge-red'    },
  'Webinar / recording':  { icon: '📹', colour: 'badge-navy'   },
  'PDF / document':       { icon: '📄', colour: 'badge-amber'  },
  'SharePoint resource':  { icon: '📁', colour: 'badge-teal'   },
  'External tool / site': { icon: '🌐', colour: 'badge-purple' },
  'Template':             { icon: '📋', colour: 'badge-green'  },
  'Case study':           { icon: '📖', colour: 'badge-navy'   },
  'Policy / framework':   { icon: '⚖',  colour: 'badge-amber'  },
  'Other':                { icon: '🔗', colour: ''             },
};

/* ── QUICK ADD ───────────────────────────────────────────────── */

function quickAddResource() {
  const url   = document.getElementById('res-quick-url')?.value?.trim();
  const title = document.getElementById('res-quick-title')?.value?.trim();
  const cat   = document.getElementById('res-quick-cat')?.value || 'Other';

  if (!url) { toast('URL is required', 'error'); document.getElementById('res-quick-url')?.focus(); return; }

  // Auto-generate title from URL if blank
  const finalTitle = title || (() => {
    try { return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || url); }
    catch { return url.length > 60 ? url.substring(0,57)+'…' : url; }
  })();

  const res = {
    id:          genId('res'),
    title:       finalTitle,
    url,
    category:    cat,
    description: '',
    area:        '',
    tags:        [],
    customTags:  [],
    pinned:      false,
    usageCount:  0,
    created:     new Date().toISOString(),
    lastUsed:    '',
  };

  DB.resources.unshift(res);

  // Clear quick-add fields
  ['res-quick-url','res-quick-title'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });

  renderResourceLibrary();
  toast(`"${finalTitle}" added to library`, 'success');
}

/* ── FULL ADD MODAL ──────────────────────────────────────────── */

function openAddResourceModal(editId) {
  const existing = editId ? DB.resources.find(r => r.id === editId) : null;
  const areaOpts = DB.areas.map(a =>
    `<option value="${esc(a.code)}" ${existing?.area===a.code?'selected':''}>${esc(a.code)} · ${esc(a.name)}</option>`
  ).join('');
  const catOpts  = Object.keys(RES_CATS).map(c =>
    `<option ${existing?.category===c?'selected':''}>${esc(c)}</option>`
  ).join('');

  openModal(existing ? 'Edit resource' : 'Add resource', `
    <div class="form-group">
      <label for="res-url">URL <span class="req" aria-hidden="true">*</span></label>
      <input type="url" id="res-url" value="${esc(existing?.url||'')}"
        required aria-required="true" placeholder="https://…">
    </div>
    <div class="form-group">
      <label for="res-title">Title <span class="req" aria-hidden="true">*</span></label>
      <input type="text" id="res-title" value="${esc(existing?.title||'')}"
        required aria-required="true" placeholder="Short descriptive name">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="res-cat">Category</label>
        <select id="res-cat">${catOpts}</select>
      </div>
      <div class="form-group">
        <label for="res-area">Curriculum area <span class="hint">(if specific to one area)</span></label>
        <select id="res-area">
          <option value="">— all areas / general —</option>
          ${areaOpts}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="res-desc">Description</label>
      <div class="input-with-mic" style="align-items:flex-start">
        <textarea id="res-desc" rows="3"
          placeholder="What is this for? When would you use it? Who is it useful for?">${esc(existing?.description||'')}</textarea>
        <button class="mic-btn" onclick="startDictation('res-desc')" aria-label="Dictate description" style="margin-top:2px">🎤</button>
      </div>
    </div>
    <div class="form-group">
      <label for="res-custom-tags">Tags <span class="hint">(comma-separated)</span></label>
      <input type="text" id="res-custom-tags"
        value="${(existing?.customTags||[]).join(', ')}"
        placeholder="e.g. accessibility, teams, formative assessment">
    </div>
    <div class="toggle-row">
      <span class="toggle-label">📌 Pin this resource (shows at top)</span>
      <label class="toggle-switch" aria-label="Pin resource">
        <input type="checkbox" id="res-pinned" ${existing?.pinned?'checked':''}>
        <span class="toggle-slider"></span>
      </label>
    </div>
  `, [
    { label: existing ? 'Save changes' : 'Add resource', cls: 'btn-primary', action: () => {
      const url   = document.getElementById('res-url')?.value?.trim();
      const title = document.getElementById('res-title')?.value?.trim();
      if (!url)   { markInvalid('res-url','URL required'); return; }
      if (!title) { markInvalid('res-title','Title required'); return; }
      const tagsRaw = document.getElementById('res-custom-tags')?.value || '';
      const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

      if (existing) {
        existing.url         = url;
        existing.title       = title;
        existing.category    = document.getElementById('res-cat')?.value   || 'Other';
        existing.area        = document.getElementById('res-area')?.value  || '';
        existing.description = document.getElementById('res-desc')?.value?.trim() || '';
        existing.customTags  = tags;
        existing.pinned      = document.getElementById('res-pinned')?.checked || false;
      } else {
        DB.resources.unshift({
          id:          genId('res'),
          url, title,
          category:    document.getElementById('res-cat')?.value  || 'Other',
          area:        document.getElementById('res-area')?.value || '',
          description: document.getElementById('res-desc')?.value?.trim() || '',
          customTags:  tags,
          pinned:      document.getElementById('res-pinned')?.checked || false,
          usageCount:  0,
          created:     new Date().toISOString(),
          lastUsed:    '',
        });
      }
      closeModal();
      renderResourceLibrary();
      toast(existing ? 'Resource updated' : 'Resource added', 'success');
    }},
    { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
  ]);
}

/* ── RENDER ──────────────────────────────────────────────────── */

function renderResourceLibrary() {
  const el     = document.getElementById('resource-library-grid');
  if (!el) return;

  const search = (document.getElementById('res-filter-search')?.value || '').toLowerCase();
  const cat    = document.getElementById('res-filter-cat')?.value    || '';
  const area   = document.getElementById('res-filter-area')?.value   || '';

  // Populate area filter if empty
  const areaSel = document.getElementById('res-filter-area');
  if (areaSel && areaSel.options.length <= 1) {
    DB.areas.forEach(a => areaSel.add(new Option(`${a.code} · ${a.name}`, a.code)));
  }

  let resources = [...DB.resources];
  if (search) resources = resources.filter(r =>
    r.title.toLowerCase().includes(search) ||
    (r.description||'').toLowerCase().includes(search) ||
    (r.category||'').toLowerCase().includes(search) ||
    (r.customTags||[]).some(t => t.toLowerCase().includes(search))
  );
  if (cat)  resources = resources.filter(r => r.category === cat);
  if (area) resources = resources.filter(r => r.area === area || !r.area);

  // Pinned first, then by usage count desc, then date
  resources.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return b.created > a.created ? 1 : -1;
  });

  if (!resources.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🔗</div>
      <p>No resources yet. Use the quick-add bar above or the + Add resource button to build your library.</p>
    </div>`;
    return;
  }

  // Group by category
  const groups = {};
  resources.forEach(r => {
    const g = r.pinned ? '📌 Pinned' : (r.category || 'Other');
    if (!groups[g]) groups[g] = [];
    groups[g].push(r);
  });

  // Pinned first, then alphabetical by category
  const groupOrder = Object.keys(groups).sort((a, b) => {
    if (a === '📌 Pinned') return -1;
    if (b === '📌 Pinned') return 1;
    return a.localeCompare(b);
  });

  el.innerHTML = groupOrder.map(groupName => {
    const items = groups[groupName];
    const meta  = RES_CATS[groupName] || RES_CATS['Other'];

    return `<div style="margin-bottom:1.75rem">
      <div class="card-title mb-8" style="display:flex;align-items:center;gap:.5rem">
        <span aria-hidden="true">${meta?.icon || '🔗'}</span>
        ${esc(groupName)}
        <span class="badge" style="margin-left:.25rem">${items.length}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.75rem" role="list">
        ${items.map(r => resourceCard(r)).join('')}
      </div>
    </div>`;
  }).join('');
}

function resourceCard(r) {
  const meta      = RES_CATS[r.category] || RES_CATS['Other'];
  const timeSince = r.lastUsed ? fmtDate(r.lastUsed.split('T')[0]) : null;
  const areaName  = r.area ? DB.areas.find(a => a.code === r.area)?.name || r.area : null;

  return `<article class="card" role="listitem" style="padding:.85rem 1rem;position:relative"
    id="res-card-${r.id}">
    ${r.pinned ? `<span style="position:absolute;top:.6rem;right:.75rem;font-size:.75rem" aria-label="Pinned">📌</span>` : ''}
    <div class="flex-between mb-6" style="padding-right:${r.pinned?'1.5rem':'0'}">
      <span class="badge ${meta?.colour||''}" style="font-size:.65rem">${esc(r.category||'Other')}</span>
      ${areaName ? `<span class="badge" style="font-size:.62rem">${esc(r.area)}</span>` : ''}
    </div>
    <div class="fw-600 text-sm mb-4" style="line-height:1.35">
      <a href="${esc(r.url)}" target="_blank" rel="noopener"
        style="color:var(--navy-800);text-decoration:underline;text-underline-offset:2px"
        onclick="recordResourceUsage('${r.id}')"
        aria-label="${esc(r.title)} (opens in new tab)">
        ${esc(r.title)}
      </a>
    </div>
    ${r.description ? `<p class="text-xs text-muted mb-6" style="line-height:1.5">${esc(r.description.substring(0,120))}${r.description.length>120?'…':''}</p>` : ''}
    ${(r.customTags||[]).length ? `<div class="flex flex-wrap gap-4 mb-6">
      ${r.customTags.map(t => `<span class="badge" style="font-size:.62rem">${esc(t)}</span>`).join('')}
    </div>` : ''}
    <div class="flex-between" style="margin-top:.5rem">
      <div class="text-xs text-muted">
        ${r.usageCount ? `Used ${r.usageCount}×` : 'Not used yet'}
        ${timeSince ? ` · Last: ${timeSince}` : ''}
      </div>
      <div class="flex gap-4">
        <button class="btn btn-sm btn-secondary" style="padding:.2rem .5rem;font-size:.68rem"
          onclick="copyResourceLink('${r.id}')" aria-label="Copy link for ${esc(r.title)}">
          Copy link
        </button>
        <button class="btn btn-sm btn-secondary" style="padding:.2rem .5rem;font-size:.68rem"
          onclick="openAddResourceModal('${r.id}')" aria-label="Edit ${esc(r.title)}">
          Edit
        </button>
        <button class="btn btn-sm btn-ghost" style="padding:.2rem .5rem;font-size:.68rem"
          onclick="deleteResource('${r.id}')" aria-label="Delete ${esc(r.title)}">
          Del
        </button>
      </div>
    </div>
  </article>`;
}

/* ── ACTIONS ─────────────────────────────────────────────────── */

function recordResourceUsage(id) {
  const r = DB.resources.find(x => x.id === id);
  if (!r) return;
  r.usageCount = (r.usageCount || 0) + 1;
  r.lastUsed   = new Date().toISOString();
  // Re-render on a slight delay so click registers first
  setTimeout(renderResourceLibrary, 200);
}

function copyResourceLink(id) {
  const r = DB.resources.find(x => x.id === id);
  if (!r) return;
  navigator.clipboard.writeText(r.url)
    .then(() => toast(`Link copied: ${r.title}`, 'success'))
    .catch(() => toast('Copy failed', 'error'));
}

function deleteResource(id) {
  if (!confirm('Delete this resource from the library?')) return;
  DB.resources = DB.resources.filter(r => r.id !== id);
  renderResourceLibrary();
  toast('Resource deleted');
}

function clearResourceFilters() {
  ['res-filter-search'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  ['res-filter-cat','res-filter-area'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  renderResourceLibrary();
}

/* ── EXPORT RESOURCE LIBRARY ─────────────────────────────────── */

function exportResourceLibraryCSV() {
  const headers = ['Title','Category','URL','Area','Description','Tags','Usage count','Created'];
  const rows = DB.resources.map(r => [
    r.title||'', r.category||'', r.url||'', r.area||'',
    r.description||'', (r.customTags||[]).join('; '),
    r.usageCount||0, (r.created||'').split('T')[0],
  ].map(v => '"' + String(v).replace(/"/g,'""') + '"').join(','));
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'resource-library-' + today() + '.csv';
  a.click(); URL.revokeObjectURL(url);
  toast('Resource library exported', 'success');
}
