/* ================================================================
   DPC EVIDENCE HUB — nav.js
   Navigation, routing, modal, toast, shared UI utilities
   ================================================================ */

'use strict';

// Pending context passed to the next navigateTo call
// (e.g. pre-filling referralId, threadId, subtype)
let _navContext = null;

function navigateTo(page, context) {
  _navContext = context || null;

  // Hide all sections
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  // Deactivate all nav items
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.removeAttribute('aria-current');
  });

  // Show target section
  const section = document.getElementById('section-' + page);
  if (section) {
    section.classList.add('active');
    // Move focus to section heading for screen readers
    const heading = section.querySelector('h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus(); }
  }

  // Activate nav item
  const navMap = {
    'weekly':           'Weekly View',
    'referrals':        'Referrals',
    'threads':          'Threads',
    'quick-capture':    'Quick Capture',
    'lra':              'LRA',
    'devobs':           'Dev Obs',
    'evidence-log':     'Evidence Log',
    'hoa-tracker':      'HoA Tracker',
    'curriculum-areas': 'Curriculum',
    'staff-dev':        'Staff',
    'own-cpd':          'CPD',
    'dl-dashboard':     'Digital Leads',
    'report-builder':   'Report',
    'settings':         'Settings',
  };
  const label = navMap[page];
  if (label) {
    document.querySelectorAll('.nav-item').forEach(btn => {
      if (btn.textContent.trim().includes(label)) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');
      }
    });
  }

  // Page-specific init
  if (page === 'weekly')           renderWeeklyView();
  if (page === 'referrals')        renderReferralInbox();
  if (page === 'threads')          renderThreads();
  if (page === 'quick-capture')    initQuickCapture(_navContext);
  if (page === 'lra')              initLRA(_navContext);
  if (page === 'devobs')           initDevObs(_navContext);
  if (page === 'evidence-log')     renderEvidenceLog();
  if (page === 'dashboard')        renderDashboard();
  if (page === 'hoa-tracker')      initHoATracker();
  if (page === 'curriculum-areas') renderAreas();
  if (page === 'staff-dev')        renderStaffRecords();
  if (page === 'own-cpd')          renderOwnCPD();
  if (page === 'dl-dashboard')     initDLDashboard();
  if (page === 'report-builder')   initReportBuilder();
  if (page === 'settings')         { renderTagManagement(); renderRatingFields(); renderSettingsData(); }

  // Update referral badge on nav
  updateReferralBadge();
}

function switchTab(btn, prefix, name) {
  const bar = btn.closest('[role="tablist"]') || btn.closest('.tab-bar');
  if (bar) {
    bar.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
  }
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  document.querySelectorAll('[id^="' + prefix + '"]').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(prefix + name);
  if (panel) panel.classList.add('active');
}

function updateReferralBadge() {
  const open = DB.referrals.filter(r => r.status !== 'complete').length;
  const badge = document.getElementById('referral-nav-badge');
  if (badge) {
    badge.textContent = open || '';
    badge.style.display = open ? 'inline' : 'none';
  }
  const tasks = DB.tasks.filter(t => t.status !== 'done').length;
  const taskBadge = document.getElementById('weekly-nav-badge');
  if (taskBadge) {
    taskBadge.textContent = tasks || '';
    taskBadge.style.display = tasks ? 'inline' : 'none';
  }
}

/* ── MODAL ────────────────────────────────────────────────────── */
let _modalStack = [];

function openModal(title, bodyHTML, buttons, opts) {
  const { wide = false } = opts || {};
  const modal  = document.getElementById('modal-panel');
  const titleEl= document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const footerEl=document.getElementById('modal-footer');
  if (!modal) return;

  titleEl.textContent = title;
  bodyEl.innerHTML    = bodyHTML;
  footerEl.innerHTML  = '';

  if (wide) modal.style.maxWidth = '900px';
  else       modal.style.maxWidth = '';

  (buttons || []).forEach(b => {
    const btn = document.createElement('button');
    btn.className   = 'btn ' + (b.cls || 'btn-secondary');
    btn.textContent = b.label;
    btn.onclick     = b.action;
    footerEl.appendChild(btn);
  });

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-overlay').setAttribute('aria-hidden', 'false');

  // Focus first focusable element
  setTimeout(() => {
    const first = modal.querySelector('input:not([type="hidden"]), select, textarea, button:not(.modal-close)');
    if (first) first.focus();
    else titleEl.setAttribute('tabindex', '-1'), titleEl.focus();
  }, 50);

  // Trap focus
  modal.addEventListener('keydown', trapFocus);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }
  const modal = document.getElementById('modal-panel');
  if (modal) modal.removeEventListener('keydown', trapFocus);
}

function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const modal     = document.getElementById('modal-panel');
  const focusable = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
  else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
}

/* ── TOAST ────────────────────────────────────────────────────── */

function toast(msg, type, duration) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'toast' + (type ? ' ' + type : '');
  div.textContent = msg;
  div.setAttribute('role', 'status');
  div.setAttribute('aria-live', 'polite');
  container.appendChild(div);
  setTimeout(() => {
    div.style.animation = 'toast-in .2s ease reverse';
    setTimeout(() => div.remove(), 200);
  }, duration || 3500);
}

/* ── ESC HANDLER ─────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ── SHARED UTILITIES ─────────────────────────────────────────── */

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'2-digit',
                                           hour:'2-digit', minute:'2-digit' });
  } catch { return iso; }
}

function hoaRagLabel(r) {
  return ['','Confident','Developing','Acceptable','Concern','Urgent'][r] || 'TBC';
}

function hoaRagBadge(r) {
  if (!r) return '<span class="badge" aria-label="Not yet rated">TBC</span>';
  const colours = ['','badge-green','badge-teal','badge-amber','badge-red','badge-red'];
  return `<span class="badge ${colours[r]||''}" aria-label="RAG ${r}: ${hoaRagLabel(r)}">${r}</span>`;
}

function hoaMetBadge(m) {
  return m === 'Y'
    ? '<span class="badge badge-green">Met ✓</span>'
    : '<span class="badge badge-red">Not yet</span>';
}

// Section panel toggle
function togglePanel(btn, bodyId) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  const open = body.classList.toggle('open');
  btn.setAttribute('aria-expanded', String(open));
  const icon = btn.querySelector('.panel-toggle-icon');
  if (icon) icon.style.transform = open ? 'rotate(180deg)' : '';
}

// Speech recognition
let _recognition = null;
let _activeField  = null;

function startDictation(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SRClass) { toast('Speech recognition not available — use Chrome or Edge', 'error'); return; }
  if (_recognition && _activeField === fieldId) { _recognition.stop(); return; }
  if (_recognition) _recognition.stop();
  _recognition = new SRClass();
  _recognition.continuous     = true;
  _recognition.interimResults = true;
  _recognition.lang           = 'en-GB';
  _activeField = fieldId;
  const btn  = field.closest('.input-with-mic')?.querySelector('.mic-btn');
  if (btn) { btn.classList.add('recording'); btn.setAttribute('aria-label', 'Stop recording'); }
  let base = field.value;
  _recognition.onresult = e => {
    let fin = '', interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) fin += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    base += fin;
    field.value = base + interim;
  };
  _recognition.onerror = ev => { toast('Dictation error: ' + ev.error, 'error'); stopDictation(btn); };
  _recognition.onend   = ()  => stopDictation(btn);
  _recognition.start();
}

function stopDictation(btn) {
  if (btn) { btn.classList.remove('recording'); btn.setAttribute('aria-label', 'Start dictation'); }
  _activeField = null;
  _recognition = null;
}

/* ── INIT ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initDB();
  renderAreaDropdowns();
  populateFilterDropdowns();
  renderDashboard();
  renderWeeklyView();
  updateReferralBadge();

  // Modal close on overlay click
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
  }
});
