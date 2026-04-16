/* ================================================================
   DPC EVIDENCE HUB — tags.js
   Three-tier branching tag taxonomy.
   Tags are stored as arrays of IDs on each entry:
     entry.tags = {
       themes:         ['th-access', ...],   // macro theme IDs selected
       subtags:        ['st-wcag', ...],     // sub-tag IDs
       ofsted:         ['of-qe', ...],
       dtpf:           ['dtpf-ld', ...],
       kpi:            ['kpi1', ...],
       accountability: ['ac4', ...],
       hyperThemes:    ['ht-dd-2', ...],     // Hyper platform themes
       custom:         ['custom-xyz', ...],
     }
   ================================================================ */

'use strict';

// Currently selected tags state (for active form)
let _selectedTags = {
  themes:         [],
  subtags:        [],
  ofsted:         [],
  dtpf:           [],
  kpi:            [],
  accountability: [],
  hyperThemes:    [],
  custom:         [],
};

function resetSelectedTags() {
  _selectedTags = {
    themes: [], subtags: [], ofsted: [], dtpf: [],
    kpi: [], accountability: [], hyperThemes: [], custom: [],
  };
}

function getSelectedTags() {
  return JSON.parse(JSON.stringify(_selectedTags));
}

function setSelectedTags(tags) {
  if (!tags) return;
  _selectedTags = {
    themes:         tags.themes         || [],
    subtags:        tags.subtags        || [],
    ofsted:         tags.ofsted         || [],
    dtpf:           tags.dtpf           || [],
    kpi:            tags.kpi            || [],
    accountability: tags.accountability || [],
    hyperThemes:    tags.hyperThemes    || [],
    custom:         tags.custom         || [],
  };
}

/* ── QUICK TAG CHIPS (compact, shown on entries) ──────────────── */

function renderTagChips(tags, opts) {
  if (!tags) return '';
  const { showAll = false } = opts || {};
  const chips = [];

  // Subtags (show first — most specific)
  (tags.subtags || []).forEach(id => {
    const label = getSubtagLabel(id);
    const cat   = getSubtagCat(id);
    if (label) chips.push(`<span class="badge badge-navy ${cat}" title="${esc(label)}">${esc(truncate(label,22))}</span>`);
  });

  // Ofsted
  (tags.ofsted || []).forEach(id => {
    const t = DB.tags.ofsted.find(x => x.id === id);
    if (t) chips.push(`<span class="badge badge-red" title="${esc(t.label)}">${esc(truncate(t.label,18))}</span>`);
  });

  // DTPF
  (tags.dtpf || []).forEach(id => {
    const t = DB.tags.dtpf.find(x => x.id === id);
    if (t) chips.push(`<span class="badge badge-purple" title="DTPF: ${esc(t.label)}">${esc(truncate(t.label,18))}</span>`);
  });

  // KPI
  (tags.kpi || []).forEach(id => {
    const t = DB.tags.kpi.find(x => x.id === id);
    if (t) chips.push(`<span class="badge badge-teal" title="${esc(t.label)}">${esc(truncate(t.label,18))}</span>`);
  });

  // Accountability
  (tags.accountability || []).forEach(id => {
    const t = DB.tags.accountability.find(x => x.id === id);
    if (t) chips.push(`<span class="badge" title="${esc(t.label)}">${esc(truncate(t.label,22))}</span>`);
  });

  // Hyper themes
  (tags.hyperThemes || []).forEach(id => {
    const label = getHyperThemeLabel(id);
    if (label) chips.push(`<span class="badge badge-amber" title="Hyper: ${esc(label)}">${esc(truncate(label,20))}</span>`);
  });

  // Custom
  (tags.custom || []).forEach(id => {
    const t = DB.tags.custom.find(x => x.id === id);
    if (t) chips.push(`<span class="badge" title="${esc(t.label)}">${esc(truncate(t.label,18))}</span>`);
  });

  if (!chips.length) return '';
  const visible = showAll ? chips : chips.slice(0, 4);
  const more    = chips.length - visible.length;
  return visible.join('') + (more > 0 ? `<span class="badge">+${more}</span>` : '');
}

/* ── TAG PICKER MODAL ─────────────────────────────────────────── */

function openTagPicker(onSave, currentTags, context) {
  // context: 'standard' | 'lra' | 'devobs' (controls which sections show)
  const ctx = context || 'standard';
  setSelectedTags(currentTags);

  const html = `
    <div class="tab-bar" role="tablist" id="tag-picker-tabs">
      <button class="tab-btn active" role="tab" aria-selected="true" onclick="switchTagPickerTab('themes')">Themes</button>
      <button class="tab-btn" role="tab" aria-selected="false" onclick="switchTagPickerTab('frameworks')">Frameworks</button>
      <button class="tab-btn" role="tab" aria-selected="false" onclick="switchTagPickerTab('quality')">Quality</button>
      ${ctx === 'lra' || ctx === 'devobs' ? `<button class="tab-btn" role="tab" aria-selected="false" onclick="switchTagPickerTab('hyper')">Hyper Themes</button>` : ''}
      <button class="tab-btn" role="tab" aria-selected="false" onclick="switchTagPickerTab('custom')">Custom</button>
    </div>

    <!-- THEMES TAB -->
    <div id="tag-picker-panel-themes" class="tag-picker-panel">
      <p class="text-xs text-muted mb-12">Select macro themes then their sub-categories. You can select across multiple themes.</p>
      ${DB.tags.themes.map(theme => `
        <div class="section-panel mb-8">
          <button class="section-panel-header"
            onclick="toggleTagGroup(this,'tag-grp-${theme.id}')"
            aria-expanded="${(_selectedTags.themes.includes(theme.id)||_selectedTags.subtags.some(id=>theme.subtags.some(s=>s.id===id)))?'true':'false'}"
            id="theme-hdr-${theme.id}">
            <span>
              <span aria-hidden="true">${theme.icon}</span>
              ${esc(theme.label)}
              <span class="badge" id="theme-count-${theme.id}" style="margin-left:.4rem">
                ${_selectedTags.subtags.filter(id=>theme.subtags.some(s=>s.id===id)).length || ''}
              </span>
            </span>
            <span class="panel-toggle-icon" aria-hidden="true">▾</span>
          </button>
          <div class="section-panel-body ${(_selectedTags.themes.includes(theme.id)||_selectedTags.subtags.some(id=>theme.subtags.some(s=>s.id===id)))?'open':''}"
            id="tag-grp-${theme.id}">
            <div class="tag-group-body">
              ${theme.subtags.map(st => `
                <label class="tag-checkbox-row">
                  <input type="checkbox" value="${st.id}"
                    class="subtag-cb" data-theme="${theme.id}"
                    ${_selectedTags.subtags.includes(st.id) ? 'checked' : ''}
                    onchange="toggleSubtag('${st.id}','${theme.id}')">
                  ${esc(st.label)}
                </label>
              `).join('')}
              <div class="tag-add-row">
                <input type="text" id="add-subtag-${theme.id}" placeholder="Add new sub-tag…" class="tag-add-input"
                  aria-label="Add new sub-tag to ${esc(theme.label)}">
                <button class="btn btn-sm btn-secondary" onclick="addSubtag('${theme.id}')">+ Add</button>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- FRAMEWORKS TAB -->
    <div id="tag-picker-panel-frameworks" class="tag-picker-panel" style="display:none">
      <div class="tag-picker-grid">
        <div class="tag-group">
          <div class="tag-group-header">
            Ofsted EIF
            <span class="text-xs text-muted">Select applicable report card area(s)</span>
          </div>
          <div class="tag-group-body">
            ${DB.tags.ofsted.map(t => `
              <label class="tag-checkbox-row">
                <input type="checkbox" value="${t.id}"
                  ${_selectedTags.ofsted.includes(t.id) ? 'checked' : ''}
                  onchange="toggleSimpleTag('ofsted','${t.id}')">
                <div>
                  <div>${esc(t.label)}</div>
                  <div class="text-xs text-muted">${esc(t.desc)}</div>
                </div>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="tag-group">
          <div class="tag-group-header">
            ETF DTPF Domains
            <span class="text-xs text-muted">Which competence domain?</span>
          </div>
          <div class="tag-group-body">
            ${DB.tags.dtpf.map(t => `
              <label class="tag-checkbox-row">
                <input type="checkbox" value="${t.id}"
                  ${_selectedTags.dtpf.includes(t.id) ? 'checked' : ''}
                  onchange="toggleSimpleTag('dtpf','${t.id}')">
                <div>
                  <div>${esc(t.label)}</div>
                  <div class="text-xs text-muted">${esc(t.desc)}</div>
                </div>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- QUALITY TAB -->
    <div id="tag-picker-panel-quality" class="tag-picker-panel" style="display:none">
      <div class="tag-picker-grid">
        <div class="tag-group">
          <div class="tag-group-header">KPI Areas</div>
          <div class="tag-group-body">
            ${DB.tags.kpi.map(t => `
              <label class="tag-checkbox-row">
                <input type="checkbox" value="${t.id}"
                  ${_selectedTags.kpi.includes(t.id) ? 'checked' : ''}
                  onchange="toggleSimpleTag('kpi','${t.id}')">
                ${esc(t.label)}
              </label>
            `).join('')}
          </div>
        </div>
        <div class="tag-group">
          <div class="tag-group-header">Accountabilities</div>
          <div class="tag-group-body">
            ${DB.tags.accountability.map(t => `
              <label class="tag-checkbox-row">
                <input type="checkbox" value="${t.id}"
                  ${_selectedTags.accountability.includes(t.id) ? 'checked' : ''}
                  onchange="toggleSimpleTag('accountability','${t.id}')">
                ${esc(t.label)}
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- HYPER THEMES TAB (LRA / Dev Obs only) -->
    <div id="tag-picker-panel-hyper" class="tag-picker-panel" style="display:none">
      <div class="notice info mb-12">
        <h3>Hyper Platform Themes</h3>
        <p>These mirror the Weston Hyper College Platform theme taxonomy (current as of April 2026 — editable in Settings before September update).</p>
      </div>
      <div class="tag-picker-grid">
        ${DB.tags.hyperThemes.map(ht => `
          <div class="tag-group">
            <div class="tag-group-header">${esc(ht.label)}</div>
            <div class="tag-group-body">
              ${ht.items.map(item => `
                <label class="tag-checkbox-row">
                  <input type="checkbox" value="${item.id}"
                    ${_selectedTags.hyperThemes.includes(item.id) ? 'checked' : ''}
                    onchange="toggleSimpleTag('hyperThemes','${item.id}')">
                  ${esc(item.label)}
                </label>
              `).join('')}
              <div class="tag-add-row">
                <input type="text" id="add-hyper-${ht.id}" placeholder="Add…"
                  aria-label="Add item to ${esc(ht.label)}">
                <button class="btn btn-sm btn-secondary" onclick="addHyperThemeItem('${ht.id}')">+</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- CUSTOM TAGS TAB -->
    <div id="tag-picker-panel-custom" class="tag-picker-panel" style="display:none">
      <div class="tag-group-body">
        ${DB.tags.custom.length ? DB.tags.custom.map(t => `
          <label class="tag-checkbox-row">
            <input type="checkbox" value="${t.id}"
              ${_selectedTags.custom.includes(t.id) ? 'checked' : ''}
              onchange="toggleSimpleTag('custom','${t.id}')">
            ${esc(t.label)}
          </label>
        `).join('') : '<p class="text-sm text-muted">No custom tags yet.</p>'}
        <div class="tag-add-row mt-12">
          <input type="text" id="add-custom-tag" placeholder="New custom tag label…"
            aria-label="New custom tag">
          <button class="btn btn-sm btn-secondary" onclick="addCustomTag()">+ Add</button>
        </div>
      </div>
    </div>
  `;

  openModal('Select Tags', html, [
    { label: 'Apply tags', cls: 'btn-primary', action: () => {
      if (onSave) onSave(getSelectedTags());
      closeModal();
    }},
    { label: 'Clear all', cls: 'btn-secondary', action: () => {
      resetSelectedTags();
      closeModal();
      if (onSave) onSave(getSelectedTags());
    }},
    { label: 'Cancel', cls: 'btn-ghost', action: closeModal },
  ]);
}

/* ── TAG PICKER INTERACTIONS ──────────────────────────────────── */

function switchTagPickerTab(name) {
  document.querySelectorAll('.tab-btn[onclick*="switchTagPickerTab"]').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected','false');
  });
  const activeBtn = Array.from(document.querySelectorAll('.tab-btn'))
    .find(b => b.getAttribute('onclick')?.includes(`'${name}'`));
  if (activeBtn) { activeBtn.classList.add('active'); activeBtn.setAttribute('aria-selected','true'); }

  document.querySelectorAll('.tag-picker-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('tag-picker-panel-' + name);
  if (panel) panel.style.display = 'block';
}

function toggleTagGroup(btn, id) {
  const body = document.getElementById(id);
  if (!body) return;
  const open = body.classList.toggle('open');
  btn.setAttribute('aria-expanded', String(open));
}

function toggleSubtag(subId, themeId) {
  const arr = _selectedTags.subtags;
  const idx = arr.indexOf(subId);
  if (idx === -1) arr.push(subId);
  else arr.splice(idx, 1);

  // Add/remove parent theme
  const theme = DB.tags.themes.find(t => t.id === themeId);
  if (theme) {
    const hasAny = theme.subtags.some(s => arr.includes(s.id));
    const tIdx = _selectedTags.themes.indexOf(themeId);
    if (hasAny && tIdx === -1) _selectedTags.themes.push(themeId);
    if (!hasAny && tIdx !== -1) _selectedTags.themes.splice(tIdx, 1);
  }

  // Update count badge
  const countEl = document.getElementById('theme-count-' + themeId);
  if (countEl && theme) {
    const n = theme.subtags.filter(s => arr.includes(s.id)).length;
    countEl.textContent = n || '';
  }
}

function toggleSimpleTag(layer, id) {
  const arr = _selectedTags[layer];
  if (!arr) return;
  const idx = arr.indexOf(id);
  if (idx === -1) arr.push(id);
  else arr.splice(idx, 1);
}

function addSubtag(themeId) {
  const inp = document.getElementById('add-subtag-' + themeId);
  const val = inp?.value?.trim();
  if (!val) return;
  const theme = DB.tags.themes.find(t => t.id === themeId);
  if (!theme) return;
  const id = 'st-custom-' + Date.now();
  theme.subtags.push({ id, label: val });
  _selectedTags.subtags.push(id);
  inp.value = '';
  toast('Sub-tag added', 'success');
  // Refresh the group
  const groupBody = document.getElementById('tag-grp-' + themeId)?.querySelector('.tag-group-body');
  if (groupBody) {
    const label = document.createElement('label');
    label.className = 'tag-checkbox-row';
    label.innerHTML = `<input type="checkbox" value="${id}" checked
      onchange="toggleSubtag('${id}','${themeId}')">${esc(val)}`;
    groupBody.insertBefore(label, groupBody.querySelector('.tag-add-row'));
  }
}

function addHyperThemeItem(groupId) {
  const inp = document.getElementById('add-hyper-' + groupId);
  const val = inp?.value?.trim();
  if (!val) return;
  const group = DB.tags.hyperThemes.find(g => g.id === groupId);
  if (!group) return;
  const id = 'ht-custom-' + Date.now();
  group.items.push({ id, label: val });
  _selectedTags.hyperThemes.push(id);
  inp.value = '';
  toast('Hyper theme item added', 'success');
}

function addCustomTag() {
  const inp = document.getElementById('add-custom-tag');
  const val = inp?.value?.trim();
  if (!val) return;
  const id = 'custom-' + Date.now();
  DB.tags.custom.push({ id, label: val });
  _selectedTags.custom.push(id);
  inp.value = '';
  // Add to list
  const body = inp.closest('.tag-group-body');
  if (body) {
    const label = document.createElement('label');
    label.className = 'tag-checkbox-row';
    label.innerHTML = `<input type="checkbox" value="${id}" checked
      onchange="toggleSimpleTag('custom','${id}')">${esc(val)}`;
    body.insertBefore(label, inp.parentElement);
  }
  toast('Custom tag added', 'success');
}

/* ── COMPACT INLINE TAG DISPLAY ──────────────────────────────── */

function renderTagButton(currentTags, onSave, context) {
  const count = countTags(currentTags);
  return `<button class="btn btn-sm btn-secondary" onclick="openTagPicker(${onSave},${JSON.stringify(currentTags)},'${context||'standard'}')"
    aria-label="${count} tags selected — click to edit">
    🏷 Tags ${count ? `<span class="badge badge-navy">${count}</span>` : ''}
  </button>`;
}

function countTags(tags) {
  if (!tags) return 0;
  return (tags.subtags?.length||0) + (tags.ofsted?.length||0) +
         (tags.dtpf?.length||0) + (tags.kpi?.length||0) +
         (tags.accountability?.length||0) + (tags.hyperThemes?.length||0) +
         (tags.custom?.length||0);
}

/* ── HELPERS ─────────────────────────────────────────────────── */

function getSubtagLabel(id) {
  for (const theme of DB.tags.themes) {
    const st = theme.subtags.find(s => s.id === id);
    if (st) return st.label;
  }
  return id;
}

function getSubtagCat(id) {
  for (const theme of DB.tags.themes) {
    if (theme.subtags.some(s => s.id === id)) return theme.cat;
  }
  return '';
}

function getHyperThemeLabel(id) {
  for (const g of DB.tags.hyperThemes) {
    const item = g.items.find(i => i.id === id);
    if (item) return item.label;
  }
  return id;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len-1) + '…' : str;
}

/* ── POPULATE DROPDOWNS ──────────────────────────────────────── */

// Populate all filter/select dropdowns that reference areas
function renderAreaDropdowns() {
  const selectors = ['#qc-area','#filter-area','#lra-area','#devobs-area',
                     '#cl-filter-area','#mt-filter-area','#ref-area','#res-filter-area'];
  selectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (!el) return;
    const cur = el.value;
    while (el.options.length > 1) el.remove(1);
    DB.areas.forEach(a => {
      el.add(new Option(`${a.code} · ${a.name}`, a.code));
    });
    el.value = cur;
  });
}

// Populate filter dropdowns
function populateFilterDropdowns() {
  // Accountability filter
  ['#filter-accountability','#report-accountability'].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el || el.options.length > 1) return;
    DB.tags.accountability.forEach(t => el.add(new Option(t.label, t.id)));
  });
  // KPI filter
  ['#filter-kpi','#report-kpi'].forEach(sel => {
    const el = document.querySelector(sel);
    if (!el || el.options.length > 1) return;
    DB.tags.kpi.forEach(t => el.add(new Option(t.label, t.id)));
  });
  renderAreaDropdowns();
}

/* ── TAG MANAGEMENT (Settings) ─────────────────────────────────── */

function renderTagManagement() {
  const el = document.getElementById('tag-management-content');
  if (!el) return;

  // Macro themes + subtags
  const themesHtml = DB.tags.themes.map(theme => `
    <div class="section-panel mb-12">
      <button class="section-panel-header" onclick="toggleTagGroup(this,'tm-grp-${theme.id}')"
        aria-expanded="false" style="display:flex;align-items:center;gap:.5rem">
        <span aria-hidden="true">${theme.icon}</span>
        <span>${esc(theme.label)}</span>
        <span class="badge" style="margin-left:auto">${theme.subtags.length} sub-tags</span>
        <span class="panel-toggle-icon" aria-hidden="true">▾</span>
      </button>
      <div class="section-panel-body" id="tm-grp-${theme.id}">
        ${theme.subtags.map((st, i) => `
          <div class="flex-between gap-8 mb-6 text-sm" style="padding:.3rem .5rem;background:var(--bg);border-radius:var(--radius)">
            <span>${esc(st.label)}</span>
            <div class="flex gap-4">
              <code class="text-xs text-muted">${st.id}</code>
              <button class="btn btn-sm btn-danger" onclick="removeSubtag('${theme.id}',${i})"
                aria-label="Remove ${esc(st.label)}">Remove</button>
            </div>
          </div>
        `).join('')}
        <div class="flex gap-6 mt-8">
          <input type="text" id="settings-add-st-${theme.id}" placeholder="New sub-tag…" style="max-width:280px"
            aria-label="New sub-tag for ${esc(theme.label)}">
          <button class="btn btn-sm btn-primary" onclick="settingsAddSubtag('${theme.id}')">+ Add</button>
        </div>
      </div>
    </div>
  `).join('');

  // Hyper themes
  const hyperHtml = DB.tags.hyperThemes.map(ht => `
    <div class="section-panel mb-8">
      <button class="section-panel-header" onclick="toggleTagGroup(this,'ht-grp-${ht.id}')"
        aria-expanded="false">
        ${esc(ht.label)}
        <span class="panel-toggle-icon" aria-hidden="true">▾</span>
      </button>
      <div class="section-panel-body" id="ht-grp-${ht.id}">
        ${ht.items.map((item, i) => `
          <div class="flex-between gap-8 mb-4 text-sm" style="padding:.3rem .5rem;background:var(--bg);border-radius:var(--radius)">
            <span>${esc(item.label)}</span>
            <button class="btn btn-sm btn-danger" onclick="removeHyperItem('${ht.id}',${i})"
              aria-label="Remove ${esc(item.label)}">Remove</button>
          </div>
        `).join('')}
        <div class="flex gap-6 mt-8">
          <input type="text" id="settings-add-ht-${ht.id}" placeholder="New item…" style="max-width:280px"
            aria-label="New item for ${esc(ht.label)}">
          <button class="btn btn-sm btn-secondary" onclick="settingsAddHyperItem('${ht.id}')">+ Add</button>
        </div>
      </div>
    </div>
  `).join('');

  // Custom tags
  const customHtml = DB.tags.custom.length ? DB.tags.custom.map((t, i) => `
    <div class="flex-between gap-8 mb-6 text-sm" style="padding:.3rem .5rem;background:var(--bg);border-radius:var(--radius)">
      <span>${esc(t.label)}</span>
      <button class="btn btn-sm btn-danger" onclick="removeCustomTagByIndex(${i})"
        aria-label="Remove ${esc(t.label)}">Remove</button>
    </div>
  `).join('') : '<p class="text-sm text-muted mb-8">No custom tags yet.</p>';

  el.innerHTML = `
    <div class="tab-bar" role="tablist">
      <button class="tab-btn active" role="tab" onclick="switchTab(this,'tm-panel-','themes')">Themes & Sub-tags</button>
      <button class="tab-btn" role="tab" onclick="switchTab(this,'tm-panel-','hyper')">Hyper Themes</button>
      <button class="tab-btn" role="tab" onclick="switchTab(this,'tm-panel-','custom')">Custom Tags</button>
      <button class="tab-btn" role="tab" onclick="switchTab(this,'tm-panel-','requested-by')">Requested By</button>
    </div>
    <div class="tab-panel active" id="tm-panel-themes">${themesHtml}</div>
    <div class="tab-panel" id="tm-panel-hyper">
      <div class="notice info mb-12">
        <h3>⚠ September 2026 update</h3>
        <p>These themes will change when Hyper is updated. Edit them here before your first LRA/Dev Obs of the new academic year.</p>
      </div>
      ${hyperHtml}
    </div>
    <div class="tab-panel" id="tm-panel-custom">
      ${customHtml}
      <div class="flex gap-6 mt-12">
        <input type="text" id="settings-add-custom" placeholder="New custom tag…" style="max-width:280px"
          aria-label="New custom tag">
        <button class="btn btn-primary" onclick="settingsAddCustomTag()">+ Add</button>
      </div>
    </div>
    <div class="tab-panel" id="tm-panel-requested-by">
      ${renderRequestedByManagement()}
    </div>
  `;
}

function renderRequestedByManagement() {
  const builtin = DB.requestedByOptions.map(o => `
    <div class="flex-between gap-8 mb-6 text-sm" style="padding:.3rem .5rem;background:var(--bg);border-radius:var(--radius)">
      <span>${esc(o)}</span>
      <span class="badge">Built-in</span>
    </div>
  `).join('');
  const custom = DB.requestedByCustom.map((o, i) => `
    <div class="flex-between gap-8 mb-6 text-sm" style="padding:.3rem .5rem;background:var(--bg);border-radius:var(--radius)">
      <span>${esc(o)}</span>
      <button class="btn btn-sm btn-danger" onclick="removeRequestedByCustom(${i})"
        aria-label="Remove ${esc(o)}">Remove</button>
    </div>
  `).join('');
  return `
    <div class="card-title mb-8">Built-in options</div>
    ${builtin}
    <div class="card-title mt-16 mb-8">Custom additions</div>
    ${custom || '<p class="text-sm text-muted mb-8">No custom entries yet.</p>'}
    <div class="flex gap-6 mt-8">
      <input type="text" id="settings-add-reqby" placeholder="Add person / role…" style="max-width:280px"
        aria-label="Add person to Requested By list">
      <button class="btn btn-primary" onclick="settingsAddRequestedBy()">+ Add</button>
    </div>
  `;
}

// Settings tag management actions
function removeSubtag(themeId, idx) {
  const theme = DB.tags.themes.find(t => t.id === themeId);
  if (!theme || !confirm('Remove this sub-tag?')) return;
  theme.subtags.splice(idx, 1);
  renderTagManagement();
  toast('Sub-tag removed');
}
function settingsAddSubtag(themeId) {
  const inp = document.getElementById('settings-add-st-' + themeId);
  const val = inp?.value?.trim();
  if (!val) return;
  const theme = DB.tags.themes.find(t => t.id === themeId);
  if (!theme) return;
  theme.subtags.push({ id: 'st-custom-' + Date.now(), label: val });
  inp.value = '';
  renderTagManagement();
  toast('Sub-tag added', 'success');
}
function removeHyperItem(groupId, idx) {
  const g = DB.tags.hyperThemes.find(x => x.id === groupId);
  if (!g || !confirm('Remove this theme item?')) return;
  g.items.splice(idx, 1);
  renderTagManagement();
  toast('Theme item removed');
}
function settingsAddHyperItem(groupId) {
  const inp = document.getElementById('settings-add-ht-' + groupId);
  const val = inp?.value?.trim();
  if (!val) return;
  const g = DB.tags.hyperThemes.find(x => x.id === groupId);
  if (!g) return;
  g.items.push({ id: 'ht-custom-' + Date.now(), label: val });
  inp.value = '';
  renderTagManagement();
  toast('Theme item added', 'success');
}
function removeCustomTagByIndex(idx) {
  if (!confirm('Remove this tag?')) return;
  DB.tags.custom.splice(idx, 1);
  renderTagManagement();
  toast('Custom tag removed');
}
function settingsAddCustomTag() {
  const inp = document.getElementById('settings-add-custom');
  const val = inp?.value?.trim();
  if (!val) return;
  DB.tags.custom.push({ id: 'custom-' + Date.now(), label: val });
  inp.value = '';
  renderTagManagement();
  toast('Custom tag added', 'success');
}
function removeRequestedByCustom(idx) {
  if (!confirm('Remove this person?')) return;
  DB.requestedByCustom.splice(idx, 1);
  renderTagManagement();
  toast('Removed');
}
function settingsAddRequestedBy() {
  const inp = document.getElementById('settings-add-reqby');
  const val = inp?.value?.trim();
  if (!val) return;
  addRequestedByOption(val);
  inp.value = '';
  renderTagManagement();
  toast('Added to Requested By list', 'success');
}
