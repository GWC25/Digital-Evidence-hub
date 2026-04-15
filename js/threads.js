/* ================================================================
   DPC EVIDENCE HUB — threads.js
   Referral inbox, workflow threads, task/actionable list
   ================================================================ */

'use strict';

/* ── REFERRAL CAPTURE ────────────────────────────────────────── */

function openNewReferralModal() {
  const reqOpts = getRequestedByOptions()
    .map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
  const actionOpts = DB.referralActionTypes
    .map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
  const areaOpts = DB.areas
    .map(a => `<option value="${esc(a.code)}">${esc(a.code)} · ${esc(a.name)}</option>`).join('');

  openModal('New Referral / Assignment', `
    <p class="text-sm text-muted mb-12">Capture something that has been requested or assigned to you — or that you've identified yourself.</p>
    <div class="form-row">
      <div class="form-group">
        <label for="ref-date">Date received <span class="req" aria-hidden="true">*</span></label>
        <input type="date" id="ref-date" value="${today()}" required aria-required="true">
      </div>
      <div class="form-group">
        <label for="ref-deadline">Deadline / target date</label>
        <input type="date" id="ref-deadline">
      </div>
    </div>

    <div class="form-group">
      <label for="ref-by">Requested by <span class="req" aria-hidden="true">*</span></label>
      <div class="flex gap-8" style="align-items:flex-start">
        <select id="ref-by" aria-required="true" style="flex:1">
          <option value="">— select —</option>
          ${reqOpts}
          <option value="__other__">Other (enter name below)</option>
        </select>
      </div>
      <div id="ref-by-other-row" style="display:none;margin-top:.4rem">
        <input type="text" id="ref-by-other" placeholder="Enter name / role">
        <div class="text-xs text-muted mt-4">This name will be saved for future use.</div>
      </div>
    </div>

    <div class="form-group">
      <label for="ref-action">Action requested <span class="req" aria-hidden="true">*</span></label>
      <select id="ref-action" aria-required="true" onchange="handleReferralActionChange()">
        <option value="">— select type —</option>
        ${actionOpts}
      </select>
    </div>

    <div class="form-group">
      <label for="ref-re">Regarding (person / subject)</label>
      <input type="text" id="ref-re" placeholder="e.g. Owen Readon — ENG, or Digital Health Check for HAC team">
    </div>

    <div class="form-group">
      <label for="ref-area">Area</label>
      <select id="ref-area">
        <option value="">— not area-specific —</option>
        ${areaOpts}
      </select>
    </div>

    <div class="form-group">
      <label for="ref-context">Context / brief</label>
      <textarea id="ref-context" rows="3" placeholder="What do they want? Why? Any background?"></textarea>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="ref-priority">Priority</label>
        <select id="ref-priority">
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div class="form-group">
        <label for="ref-thread">Link to existing thread</label>
        <select id="ref-thread">
          <option value="">— start new thread —</option>
          ${DB.threads.filter(t=>t.status!=='closed').map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}
        </select>
      </div>
    </div>

    <div id="new-thread-name-row">
      <div class="form-group">
        <label for="ref-thread-name">New thread name <span class="hint">(system suggestion — override if needed)</span></label>
        <input type="text" id="ref-thread-name" placeholder="Will be suggested when you fill in the form above">
      </div>
    </div>
  `, [
    { label: 'Save referral', cls: 'btn-primary', action: saveReferral },
    { label: 'Cancel', cls: 'btn-secondary', action: closeModal }
  ]);

  // Wire up the "Other" toggle
  document.getElementById('ref-by').addEventListener('change', function() {
    const row = document.getElementById('ref-by-other-row');
    row.style.display = this.value === '__other__' ? 'block' : 'none';
  });

  // Auto-suggest thread name as fields are filled
  ['ref-by','ref-action','ref-area','ref-re'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', suggestThreadName);
  });
}

function handleReferralActionChange() {
  const action = document.getElementById('ref-action')?.value;
  const nameRow = document.getElementById('new-thread-name-row');
  const threadSel = document.getElementById('ref-thread');
  if (nameRow && threadSel) {
    nameRow.style.display = threadSel.value ? 'none' : 'block';
  }
  suggestThreadName();
}

function suggestThreadName() {
  const byEl     = document.getElementById('ref-by');
  const actionEl = document.getElementById('ref-action');
  const areaEl   = document.getElementById('ref-area');
  const reEl     = document.getElementById('ref-re');
  const nameEl   = document.getElementById('ref-thread-name');
  if (!nameEl) return;

  const byRaw    = byEl?.value === '__other__'
    ? (document.getElementById('ref-by-other')?.value || '')
    : (byEl?.value || '');
  const by       = byRaw.split(' ')[0] || '';
  const action   = actionEl?.value || '';
  const areaCode = areaEl?.value || '';
  const re       = reEl?.value?.trim() || '';
  const month    = new Date().toLocaleDateString('en-GB', { month:'short', year:'numeric' });

  const parts = [];
  if (areaCode) parts.push(areaCode);
  if (re)       parts.push(re);
  if (action)   parts.push(action);
  if (by)       parts.push('ref: ' + by);
  parts.push(month);

  if (parts.length > 1) {
    nameEl.value = parts.join(' · ');
  }
}

function saveReferral() {
  const dateEl    = document.getElementById('ref-date');
  const byEl      = document.getElementById('ref-by');
  const actionEl  = document.getElementById('ref-action');
  const nameEl    = document.getElementById('ref-thread-name');
  const threadSel = document.getElementById('ref-thread');

  if (!dateEl?.value)   { toast('Date required', 'error'); return; }
  if (!byEl?.value)     { toast('Requested by required', 'error'); return; }
  if (!actionEl?.value) { toast('Action type required', 'error'); return; }

  // Handle custom "requested by"
  let requestedBy = byEl.value;
  if (requestedBy === '__other__') {
    requestedBy = document.getElementById('ref-by-other')?.value?.trim() || 'Other';
    addRequestedByOption(requestedBy);
    // Refresh the select in Settings if visible
  }

  // Create or link thread
  let threadId = threadSel?.value || '';
  if (!threadId) {
    const threadName = nameEl?.value?.trim() || buildDefaultThreadName();
    threadId = createThread(threadName, requestedBy);
  }

  const referral = {
    id:          genId('ref'),
    date:        dateEl.value,
    deadline:    document.getElementById('ref-deadline')?.value || '',
    requestedBy: requestedBy,
    actionType:  actionEl.value,
    regarding:   document.getElementById('ref-re')?.value?.trim() || '',
    area:        document.getElementById('ref-area')?.value || '',
    context:     document.getElementById('ref-context')?.value?.trim() || '',
    priority:    document.getElementById('ref-priority')?.value || 'normal',
    threadId:    threadId,
    status:      'open',    // open | in-progress | complete
    created:     new Date().toISOString(),
    tasks:       [],
  };

  DB.referrals.unshift(referral);

  // Auto-create a task from this referral
  createTaskFromReferral(referral);

  closeModal();
  renderReferralInbox();
  renderWeeklyView();
  renderThreads();
  toast('Referral saved', 'success');
}

function buildDefaultThreadName() {
  return 'Thread · ' + new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

/* ── THREAD MANAGEMENT ───────────────────────────────────────── */

function createThread(name, initiatedBy) {
  const thread = {
    id:          genId('thread'),
    name:        name,
    initiatedBy: initiatedBy || 'Self-initiated',
    status:      'active',      // active | awaiting-follow-up | closed
    impactSummary: '',
    entryIds:    [],            // linked DB.entries IDs
    referralIds: [],            // linked referral IDs
    taskIds:     [],            // linked task IDs
    created:     new Date().toISOString(),
    updated:     new Date().toISOString(),
    closedDate:  '',
  };
  DB.threads.unshift(thread);
  return thread.id;
}

function linkEntryToThread(entryId, threadId) {
  const thread = DB.threads.find(t => t.id === threadId);
  if (!thread) return;
  if (!thread.entryIds.includes(entryId)) {
    thread.entryIds.push(entryId);
    thread.updated = new Date().toISOString();
  }
}

function closeThread(threadId) {
  const thread = DB.threads.find(t => t.id === threadId);
  if (!thread) return;
  openModal('Close Thread — ' + esc(thread.name), `
    <p class="text-sm text-muted mb-12">Write an impact summary before closing. This becomes your quotable evidence.</p>
    <div class="form-group">
      <label for="close-impact">Impact summary</label>
      <textarea id="close-impact" rows="5"
        placeholder="What changed as a result of this work? What evidence do you have? Who can confirm it?">${esc(thread.impactSummary)}</textarea>
    </div>
    <div class="form-group">
      <label for="close-date">Date closed</label>
      <input type="date" id="close-date" value="${today()}">
    </div>
  `, [
    { label: 'Close thread', cls: 'btn-teal', action: () => {
      thread.impactSummary = document.getElementById('close-impact')?.value?.trim() || '';
      thread.closedDate    = document.getElementById('close-date')?.value || today();
      thread.status        = 'closed';
      thread.updated       = new Date().toISOString();
      // Mark all open tasks in this thread as complete
      DB.tasks.filter(t => t.threadId === threadId && t.status !== 'done')
        .forEach(t => t.status = 'done');
      closeModal();
      renderThreads();
      renderWeeklyView();
      toast('Thread closed — impact recorded', 'success');
    }},
    { label: 'Cancel', cls: 'btn-secondary', action: closeModal }
  ]);
}

/* ── TASK GENERATION ─────────────────────────────────────────── */

function createTaskFromReferral(referral) {
  const task = {
    id:          genId('task'),
    title:       buildTaskTitle(referral),
    type:        referral.actionType,
    referralId:  referral.id,
    threadId:    referral.threadId,
    area:        referral.area,
    requestedBy: referral.requestedBy,
    deadline:    referral.deadline || '',
    priority:    referral.priority || 'normal',
    status:      'todo',    // todo | in-progress | done
    entryId:     '',        // filled in when a form entry is saved for this task
    created:     new Date().toISOString(),
    notes:       '',
  };
  DB.tasks.unshift(task);

  // Link task to thread
  const thread = DB.threads.find(t => t.id === referral.threadId);
  if (thread && !thread.taskIds.includes(task.id)) {
    thread.taskIds.push(task.id);
  }

  return task.id;
}

function buildTaskTitle(referral) {
  const parts = [referral.actionType];
  if (referral.regarding) parts.push(referral.regarding);
  if (referral.area)      parts.push('(' + referral.area + ')');
  return parts.join(' — ');
}

function addManualTask(threadId) {
  const thread = DB.threads.find(t => t.id === threadId);
  const actionOpts = DB.referralActionTypes.map(t => `<option>${esc(t)}</option>`).join('');
  const reqOpts = getRequestedByOptions().map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');

  openModal('Add Task' + (thread ? ' to Thread' : ''), `
    <div class="form-group">
      <label for="mt-title">Task <span class="req" aria-hidden="true">*</span></label>
      <input type="text" id="mt-title" required aria-required="true" placeholder="What needs to happen?">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="mt-type">Type</label>
        <select id="mt-type">
          <option value="">— select —</option>
          ${actionOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="mt-deadline">Deadline</label>
        <input type="date" id="mt-deadline">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="mt-req">Requested by</label>
        <select id="mt-req">
          <option value="">— select —</option>
          ${reqOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="mt-priority">Priority</label>
        <select id="mt-priority">
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="mt-notes">Notes</label>
      <textarea id="mt-notes" rows="2" placeholder="Any context or brief"></textarea>
    </div>
  `, [
    { label: 'Add task', cls: 'btn-primary', action: () => {
      const title = document.getElementById('mt-title')?.value?.trim();
      if (!title) { toast('Task title required', 'error'); return; }
      const task = {
        id: genId('task'),
        title,
        type:        document.getElementById('mt-type')?.value || '',
        referralId:  '',
        threadId:    threadId || '',
        area:        '',
        requestedBy: document.getElementById('mt-req')?.value || '',
        deadline:    document.getElementById('mt-deadline')?.value || '',
        priority:    document.getElementById('mt-priority')?.value || 'normal',
        status:      'todo',
        entryId:     '',
        created:     new Date().toISOString(),
        notes:       document.getElementById('mt-notes')?.value?.trim() || '',
      };
      DB.tasks.unshift(task);
      if (threadId && thread) {
        if (!thread.taskIds.includes(task.id)) thread.taskIds.push(task.id);
      }
      closeModal();
      renderWeeklyView();
      renderThreads();
      toast('Task added', 'success');
    }},
    { label: 'Cancel', cls: 'btn-secondary', action: closeModal }
  ]);
}

function completeTask(taskId) {
  const task = DB.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.status = task.status === 'done' ? 'todo' : 'done';
  task.completedDate = task.status === 'done' ? today() : '';
  renderWeeklyView();
  renderThreads();
}

/* ── RENDER: REFERRAL INBOX ──────────────────────────────────── */

function renderReferralInbox() {
  const el = document.getElementById('referral-inbox-list');
  if (!el) return;

  const open = DB.referrals.filter(r => r.status !== 'complete')
    .sort((a, b) => {
      const pri = { urgent: 0, high: 1, normal: 2 };
      if (pri[a.priority] !== pri[b.priority]) return pri[a.priority] - pri[b.priority];
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

  if (!open.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📥</div>
      <p>No open referrals. When someone assigns work to you, log it here.</p>
    </div>`;
    return;
  }

  el.innerHTML = open.map(r => {
    const thread    = DB.threads.find(t => t.id === r.threadId);
    const overdue   = r.deadline && r.deadline < today();
    const dueToday  = r.deadline === today();
    const taskCount = DB.tasks.filter(t => t.referralId === r.id && t.status !== 'done').length;
    const priClass  = r.priority === 'urgent' ? 'badge-red' : r.priority === 'high' ? 'badge-amber' : '';

    return `<div class="thread-card mb-12" role="article" aria-label="Referral from ${esc(r.requestedBy)}">
      <div class="thread-header">
        <div style="flex:1;min-width:0">
          <div class="thread-title">${esc(r.actionType)}${r.regarding ? ' — ' + esc(r.regarding) : ''}</div>
          <div class="thread-meta">
            <span>From: <strong>${esc(r.requestedBy)}</strong></span>
            ${r.area ? `<span>· ${esc(r.area)}</span>` : ''}
            <span>· Received ${fmtDate(r.date)}</span>
          </div>
        </div>
        <div class="flex gap-6" style="flex-shrink:0;align-items:flex-start;flex-wrap:wrap">
          ${r.priority !== 'normal' ? `<span class="badge ${priClass}">${r.priority.toUpperCase()}</span>` : ''}
          ${r.deadline ? `<span class="task-due ${overdue ? 'overdue' : dueToday ? 'today' : 'soon'}">
            ${overdue ? '⚠ Overdue' : 'Due'} ${fmtDate(r.deadline)}
          </span>` : ''}
        </div>
      </div>
      <div class="thread-body">
        ${r.context ? `<p class="text-sm mb-8">${esc(r.context)}</p>` : ''}
        ${thread ? `<div class="text-xs text-muted mb-8">
          Thread: <strong>${esc(thread.name)}</strong>
          · ${thread.entryIds.length} entr${thread.entryIds.length===1?'y':'ies'}
          · <span class="badge ${thread.status==='active'?'badge-teal':thread.status==='closed'?'badge-green':'badge-amber'}">${thread.status}</span>
        </div>` : ''}
        ${taskCount ? `<div class="text-xs text-amber mb-8">⚡ ${taskCount} task${taskCount>1?'s':''} outstanding</div>` : ''}
        <div class="flex gap-6 flex-wrap">
          <button class="btn btn-sm btn-primary" onclick="openEntryFormForReferral('${r.id}')">
            + Start ${esc(r.actionType)}
          </button>
          ${thread ? `<button class="btn btn-sm btn-secondary" onclick="openThreadDetail('${thread.id}')">View thread</button>` : ''}
          <button class="btn btn-sm btn-secondary" onclick="markReferralComplete('${r.id}')">Mark complete</button>
          <button class="btn btn-sm btn-ghost" onclick="deleteReferral('${r.id}')" aria-label="Delete referral">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function markReferralComplete(id) {
  const r = DB.referrals.find(x => x.id === id);
  if (!r) return;
  r.status = 'complete';
  renderReferralInbox();
  renderWeeklyView();
  toast('Referral marked complete', 'success');
}

function deleteReferral(id) {
  if (!confirm('Delete this referral?')) return;
  DB.referrals = DB.referrals.filter(r => r.id !== id);
  renderReferralInbox();
  renderWeeklyView();
  toast('Referral deleted');
}

/* ── RENDER: ACTIVE THREADS ──────────────────────────────────── */

function renderThreads() {
  const el = document.getElementById('threads-list');
  if (!el) return;

  const filterStatus = document.getElementById('threads-filter-status')?.value || '';
  let threads = [...DB.threads];
  if (filterStatus) threads = threads.filter(t => t.status === filterStatus);
  else threads = threads.filter(t => t.status !== 'closed');

  threads.sort((a, b) => (b.updated > a.updated ? 1 : -1));

  // Summary counts
  const countEl = document.getElementById('threads-count');
  if (countEl) {
    const active  = DB.threads.filter(t => t.status === 'active').length;
    const waiting = DB.threads.filter(t => t.status === 'awaiting-follow-up').length;
    const closed  = DB.threads.filter(t => t.status === 'closed').length;
    countEl.innerHTML = `
      <span class="badge badge-teal">${active} active</span>
      <span class="badge badge-amber">${waiting} waiting</span>
      <span class="badge">${closed} closed</span>
    `;
  }

  if (!threads.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🔗</div>
      <p>No ${filterStatus || 'active'} threads. Threads are created when you log a referral or start a linked chain of activity.</p>
    </div>`;
    return;
  }

  el.innerHTML = threads.map(t => renderThreadCard(t)).join('');
}

function renderThreadCard(t) {
  const entries  = DB.entries.filter(e => t.entryIds.includes(e.id)).sort((a,b) => b.date > a.date ? 1 : -1);
  const tasks    = DB.tasks.filter(tk => t.taskIds.includes(tk.id));
  const openTasks= tasks.filter(tk => tk.status !== 'done');
  const lastEntry= entries[0];
  const nextTask = openTasks.sort((a,b) => (a.deadline||'9999') > (b.deadline||'9999') ? 1 : -1)[0];
  const statusClass = t.status==='active' ? 'badge-teal' : t.status==='closed' ? 'badge-green' : 'badge-amber';
  const overdue = nextTask?.deadline && nextTask.deadline < today();
  const dueToday= nextTask?.deadline === today();

  return `<div class="thread-card mb-12" id="thread-${t.id}" role="article" aria-label="Thread: ${esc(t.name)}">
    <div class="thread-header">
      <div style="flex:1;min-width:0">
        <div class="thread-title">${esc(t.name)}</div>
        <div class="thread-meta">
          Initiated by: ${esc(t.initiatedBy)}
          · Updated ${fmtDate(t.updated)}
          · ${entries.length} entr${entries.length===1?'y':'ies'}
        </div>
      </div>
      <div class="flex gap-6" style="flex-shrink:0">
        <span class="badge ${statusClass}">${t.status.replace('-',' ')}</span>
        ${openTasks.length ? `<span class="badge badge-amber">${openTasks.length} task${openTasks.length>1?'s':''}</span>` : ''}
      </div>
    </div>

    <div class="thread-body">
      ${nextTask ? `<div class="thread-next-action ${overdue?'overdue':dueToday?'today':''}">
        <strong>Next:</strong> ${esc(nextTask.title)}
        ${nextTask.deadline ? `<span class="task-due ${overdue?'overdue':dueToday?'today':'soon'}" style="margin-left:.4rem">
          ${overdue?'⚠ Overdue ':'Due '}${fmtDate(nextTask.deadline)}
        </span>` : ''}
      </div>` : ''}

      ${lastEntry ? `<div class="text-xs text-muted mb-8">
        Last activity: ${fmtDate(lastEntry.date)} · ${esc(lastEntry.subtype||lastEntry.type||'Entry')} · ${esc(lastEntry.title?.substring(0,60)||'')}
      </div>` : ''}

      ${t.impactSummary ? `<div class="log-entry status-complete mb-8">
        <div class="log-meta">Impact summary</div>
        <p class="text-sm">${esc(t.impactSummary)}</p>
      </div>` : ''}

      <div class="flex gap-6 flex-wrap">
        <button class="btn btn-sm btn-primary" onclick="openQuickCaptureForThread('${t.id}')">+ Add entry</button>
        <button class="btn btn-sm btn-secondary" onclick="openThreadDetail('${t.id}')">Full history</button>
        <button class="btn btn-sm btn-secondary" onclick="addManualTask('${t.id}')">+ Task</button>
        ${t.status !== 'closed' ? `
          <button class="btn btn-sm btn-secondary" onclick="setThreadStatus('${t.id}','awaiting-follow-up')">Mark waiting</button>
          <button class="btn btn-sm btn-teal" onclick="closeThread('${t.id}')">Close thread</button>
        ` : `
          <button class="btn btn-sm btn-secondary" onclick="setThreadStatus('${t.id}','active')">Re-open</button>
        `}
        <button class="btn btn-sm btn-ghost" onclick="deleteThread('${t.id}')" aria-label="Delete thread">Delete</button>
      </div>
    </div>
  </div>`;
}

function setThreadStatus(threadId, status) {
  const t = DB.threads.find(x => x.id === threadId);
  if (!t) return;
  t.status  = status;
  t.updated = new Date().toISOString();
  renderThreads();
  renderWeeklyView();
  toast('Thread updated', 'success');
}

function deleteThread(threadId) {
  if (!confirm('Delete this thread? Linked entries will not be deleted.')) return;
  DB.threads = DB.threads.filter(t => t.id !== threadId);
  renderThreads();
  toast('Thread deleted');
}

function openThreadDetail(threadId) {
  const t = DB.threads.find(x => x.id === threadId);
  if (!t) return;
  const entries = DB.entries.filter(e => t.entryIds.includes(e.id))
    .sort((a, b) => a.date > b.date ? 1 : -1);
  const tasks   = DB.tasks.filter(tk => t.taskIds.includes(tk.id))
    .sort((a, b) => (a.deadline||'9999') > (b.deadline||'9999') ? 1 : -1);

  const entriesHtml = entries.length ? entries.map(e => `
    <div class="log-entry status-${e.type === 'devobs' ? 'active' : 'active'}">
      <div class="log-meta">
        <span>${fmtDate(e.date)}</span>
        <span>·</span>
        <span>${esc(e.subtype || e.type || 'Entry')}</span>
        ${e.area ? `<span>·</span><span>${esc(e.area)}</span>` : ''}
      </div>
      <p class="fw-600 text-sm">${esc(e.title)}</p>
      ${e.notes ? `<p class="text-sm text-muted mt-4">${esc(e.notes.substring(0,120))}${e.notes.length>120?'…':''}</p>` : ''}
      ${e.strengths ? `<p class="text-xs mt-4"><strong>Strengths:</strong> ${esc(e.strengths.substring(0,80))}</p>` : ''}
      ${e.afis      ? `<p class="text-xs"><strong>AFIs:</strong> ${esc(e.afis.substring(0,80))}</p>` : ''}
    </div>
  `).join('') : `<div class="empty-state"><p>No entries yet in this thread.</p></div>`;

  const tasksHtml = tasks.length ? `
    <div class="mt-16">
      <div class="card-title">Tasks</div>
      ${tasks.map(tk => `
        <div class="task-item" role="listitem">
          <div class="task-checkbox ${tk.status==='done'?'done':''}" onclick="completeTask('${tk.id}')"
            role="checkbox" aria-checked="${tk.status==='done'}" tabindex="0"
            onkeydown="if(event.key===' '||event.key==='Enter')completeTask('${tk.id}')">
            ${tk.status==='done'?'✓':''}
          </div>
          <div class="task-body">
            <div class="task-title ${tk.status==='done'?'done':''}">${esc(tk.title)}</div>
            <div class="task-meta">${tk.requestedBy ? 'From: '+esc(tk.requestedBy)+' · ' : ''}${tk.type||''}</div>
          </div>
          ${tk.deadline ? `<span class="task-due ${tk.deadline<today()?'overdue':tk.deadline===today()?'today':'soon'}">
            ${fmtDate(tk.deadline)}
          </span>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  openModal(esc(t.name), `
    <div class="flex gap-6 mb-12 flex-wrap">
      <span class="badge ${t.status==='active'?'badge-teal':t.status==='closed'?'badge-green':'badge-amber'}">${t.status.replace('-',' ')}</span>
      <span class="badge">Started ${fmtDate(t.created)}</span>
      <span class="badge">${entries.length} entr${entries.length===1?'y':'ies'}</span>
    </div>
    ${t.impactSummary ? `<div class="log-entry status-complete mb-16">
      <div class="log-meta">Impact summary</div>
      <p class="text-sm">${esc(t.impactSummary)}</p>
    </div>` : ''}
    <div class="card-title">Activity timeline</div>
    ${entriesHtml}
    ${tasksHtml}
  `, [
    { label: '+ Add entry', cls: 'btn-primary', action: () => { closeModal(); openQuickCaptureForThread(threadId); } },
    { label: '+ Task',      cls: 'btn-secondary', action: () => { closeModal(); addManualTask(threadId); } },
    t.status !== 'closed'
      ? { label: 'Close thread', cls: 'btn-teal', action: () => { closeModal(); closeThread(threadId); } }
      : { label: 'Re-open', cls: 'btn-secondary', action: () => { closeModal(); setThreadStatus(threadId, 'active'); } },
    { label: 'Close', cls: 'btn-ghost', action: closeModal },
  ]);
}

/* ── RENDER: WEEKLY VIEW ─────────────────────────────────────── */

function renderWeeklyView() {
  renderWeeklyTasks();
  renderWeeklyThreads();
  renderWeeklyDeadlines();
  renderWeeklyRecent();
}

function renderWeeklyTasks() {
  const el = document.getElementById('weekly-tasks-list');
  if (!el) return;

  const todayStr = today();
  const tasks = DB.tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      // Overdue first, then by deadline, then by priority
      const ao = a.deadline && a.deadline < todayStr;
      const bo = b.deadline && b.deadline < todayStr;
      if (ao && !bo) return -1;
      if (!ao && bo) return 1;
      const pd = { urgent:0, high:1, normal:2 };
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return (pd[a.priority]||2) - (pd[b.priority]||2);
    });

  if (!tasks.length) {
    el.innerHTML = `<div class="empty-state"><p>No outstanding tasks. Inbox is clear ✓</p></div>`;
    return;
  }

  el.innerHTML = tasks.map(t => {
    const overdue  = t.deadline && t.deadline < todayStr;
    const dueToday = t.deadline === todayStr;
    const thread   = t.threadId ? DB.threads.find(th => th.id === t.threadId) : null;
    return `<div class="task-item" role="listitem"
      tabindex="0" onkeydown="if(event.key==='Enter')completeTask('${t.id}')"
      aria-label="${esc(t.title)}${t.deadline ? ', due '+fmtDate(t.deadline) : ''}">
      <div class="task-checkbox" onclick="completeTask('${t.id}')"
        role="checkbox" aria-checked="false" tabindex="-1"
        style="border-color:${overdue?'var(--red-700)':dueToday?'var(--amber-700)':'var(--border-strong)'}">
      </div>
      <div class="task-body">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-meta">
          ${t.requestedBy ? esc(t.requestedBy)+' · ' : ''}
          ${thread ? esc(thread.name.substring(0,40)) : (t.type||'')}
        </div>
      </div>
      <div class="flex flex-column gap-4" style="align-items:flex-end;flex-shrink:0">
        ${t.deadline ? `<span class="task-due ${overdue?'overdue':dueToday?'today':'soon'}">
          ${overdue ? '⚠ Overdue' : dueToday ? 'Today' : fmtDate(t.deadline)}
        </span>` : ''}
        ${t.priority !== 'normal' ? `<span class="badge ${t.priority==='urgent'?'badge-red':'badge-amber'}">${t.priority}</span>` : ''}
        ${t.type ? `<button class="btn btn-sm btn-primary" style="font-size:.65rem;padding:.2rem .5rem"
          onclick="openEntryFormForTask('${t.id}')" aria-label="Start ${esc(t.type)}">Start</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderWeeklyThreads() {
  const el = document.getElementById('weekly-threads-list');
  if (!el) return;

  const active = DB.threads
    .filter(t => t.status === 'active' || t.status === 'awaiting-follow-up')
    .sort((a, b) => (b.updated > a.updated ? 1 : -1))
    .slice(0, 8);

  if (!active.length) {
    el.innerHTML = `<div class="empty-state"><p>No active threads.</p></div>`;
    return;
  }

  el.innerHTML = active.map(t => {
    const openTasks = DB.tasks.filter(tk => t.taskIds.includes(tk.id) && tk.status !== 'done');
    const nextTask  = openTasks.sort((a,b) => (a.deadline||'9999')>(b.deadline||'9999')?1:-1)[0];
    const overdue   = nextTask?.deadline && nextTask.deadline < today();
    return `<div class="thread-next-action ${overdue?'overdue':''} mb-8" style="cursor:pointer"
      onclick="openThreadDetail('${t.id}')" role="button" tabindex="0"
      onkeydown="if(event.key==='Enter')openThreadDetail('${t.id}')"
      aria-label="Thread: ${esc(t.name)}">
      <div class="fw-600 text-sm">${esc(t.name.substring(0,50))}${t.name.length>50?'…':''}</div>
      <div class="text-xs text-muted mt-4">
        ${nextTask ? `Next: ${esc(nextTask.title.substring(0,40))}` : 'No pending tasks'}
        ${nextTask?.deadline ? ` · ${overdue?'⚠ Overdue':'Due'} ${fmtDate(nextTask.deadline)}` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderWeeklyDeadlines() {
  const el = document.getElementById('weekly-deadlines-list');
  if (!el) return;

  const in14 = new Date();
  in14.setDate(in14.getDate() + 14);
  const cutoff = in14.toISOString().split('T')[0];

  const upcoming = DB.tasks
    .filter(t => t.status !== 'done' && t.deadline && t.deadline <= cutoff)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 10);

  if (!upcoming.length) {
    el.innerHTML = `<div class="empty-state"><p>Nothing due in the next 14 days.</p></div>`;
    return;
  }

  el.innerHTML = upcoming.map(t => {
    const overdue  = t.deadline < today();
    const dueToday = t.deadline === today();
    return `<div class="flex-between gap-8 mb-8 text-sm" style="padding:.4rem .5rem;background:var(--bg);border-radius:var(--radius)">
      <div style="min-width:0">
        <div class="fw-600" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title.substring(0,40))}</div>
        <div class="text-xs text-muted">${t.requestedBy ? esc(t.requestedBy) : ''}</div>
      </div>
      <span class="task-due ${overdue?'overdue':dueToday?'today':'soon'}" style="flex-shrink:0">
        ${overdue ? '⚠ ' : ''}${fmtDate(t.deadline)}
      </span>
    </div>`;
  }).join('');
}

function renderWeeklyRecent() {
  const el = document.getElementById('weekly-recent-list');
  if (!el) return;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const cutoff = weekAgo.toISOString().split('T')[0];

  const recent = DB.entries
    .filter(e => e.date >= cutoff)
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 8);

  if (!recent.length) {
    el.innerHTML = `<div class="empty-state"><p>No entries this week yet.</p></div>`;
    return;
  }

  el.innerHTML = recent.map(e => `
    <div class="log-entry status-active mb-6">
      <div class="log-meta">
        <span>${fmtDate(e.date)}</span>
        <span>·</span>
        <span>${esc(e.subtype||e.type||'Entry')}</span>
        ${e.area ? `<span>·</span><span>${esc(e.area)}</span>` : ''}
      </div>
      <p class="text-sm fw-600">${esc(e.title)}</p>
    </div>
  `).join('');
}

/* ── HELPERS ─────────────────────────────────────────────────── */

function openEntryFormForReferral(referralId) {
  const r = DB.referrals.find(x => x.id === referralId);
  if (!r) return;
  // Route to the right form based on action type
  const type = r.actionType;
  if (type === 'Developmental Observation')       navigateTo('devobs',    { referralId, threadId: r.threadId });
  else if (type.startsWith('LRA'))                navigateTo('lra',       { referralId, threadId: r.threadId });
  else if (type === '1:1 Coaching' || type === 'Team coaching / workshop') navigateTo('quick-capture', { referralId, threadId: r.threadId, subtype: type });
  else if (type === 'Digital Health Check')       navigateTo('quick-capture', { referralId, threadId: r.threadId, subtype: 'Health Check' });
  else                                            navigateTo('quick-capture', { referralId, threadId: r.threadId, subtype: type });
}

function openEntryFormForTask(taskId) {
  const task = DB.tasks.find(t => t.id === taskId);
  if (!task) return;
  if (task.referralId) openEntryFormForReferral(task.referralId);
  else navigateTo('quick-capture', { threadId: task.threadId, subtype: task.type });
}

function openQuickCaptureForThread(threadId) {
  navigateTo('quick-capture', { threadId });
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d + 'T00:00:00');
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'2-digit' });
  } catch { return d; }
}
