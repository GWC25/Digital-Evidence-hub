/* ================================================================
   DPC EVIDENCE HUB — threads.js
   Referral inbox, workflow threads, task/actionable list
   ================================================================ */

'use strict';

/* ── NEW THREAD MODAL — full project card ────────────────────── */

function openNewThreadModal() {
  const reqOpts = getRequestedByOptions()
    .map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
  const actionOpts = DB.referralActionTypes
    .map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
  const areaOpts = DB.areas
    .map(a => `<option value="${esc(a.code)}">${esc(a.code)} · ${esc(a.name)}</option>`).join('');

  openModal('New Thread / Project', `
    <p class="text-sm text-muted mb-12">
      A thread is a workflow chain — everything from first contact to evidenced outcome.
      Fill in what you know now; you can add to it as the work unfolds.
    </p>

    <div class="form-group">
      <label for="nt-name">Thread / project name <span class="req" aria-hidden="true">*</span></label>
      <input type="text" id="nt-name" required aria-required="true"
        placeholder="e.g. ENG · Thanos Adamos · Teams coaching · Apr 2026">
      <div class="text-xs text-muted mt-4">Suggested format: [Area] · [Person] · [Focus] · [Month Year]</div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="nt-initiated-by">Initiated by / requested by <span class="req" aria-hidden="true">*</span></label>
        <select id="nt-initiated-by" aria-required="true">
          <option value="">— select —</option>
          ${reqOpts}
          <option value="__other__">Other (enter below)</option>
        </select>
        <div id="nt-other-row" style="display:none;margin-top:.4rem">
          <input type="text" id="nt-other-name" placeholder="Name / role">
        </div>
      </div>
      <div class="form-group">
        <label for="nt-area">Curriculum area</label>
        <select id="nt-area">
          <option value="">— not area-specific —</option>
          ${areaOpts}
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="nt-staff">Staff involved</label>
      <input type="text" id="nt-staff"
        placeholder="e.g. Thanos Adamos, Owen Rearden — or leave blank for team work">
    </div>

    <div class="form-group">
      <label for="nt-trigger">What triggered this thread?</label>
      <div class="input-with-mic" style="align-items:flex-start">
        <textarea id="nt-trigger" rows="3"
          placeholder="Paste the message / email / context you received, or describe what you observed that prompted this…"></textarea>
        <button class="mic-btn" onclick="startDictation('nt-trigger')" aria-label="Dictate" style="margin-top:2px">🎤</button>
      </div>
    </div>

    <div class="form-group">
      <label for="nt-action-type">Action(s) needed</label>
      <select id="nt-action-type">
        <option value="">— select primary action —</option>
        ${actionOpts}
      </select>
    </div>

    <div class="form-group">
      <label for="nt-notes">Notes / brief for self</label>
      <div class="input-with-mic" style="align-items:flex-start">
        <textarea id="nt-notes" rows="3"
          placeholder="What do you need to do? What's the goal? Any context that will help you when you pick this up later…"></textarea>
        <button class="mic-btn" onclick="startDictation('nt-notes')" aria-label="Dictate" style="margin-top:2px">🎤</button>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="nt-deadline">Target / deadline date</label>
        <input type="date" id="nt-deadline">
      </div>
      <div class="form-group">
        <label for="nt-priority">Priority</label>
        <select id="nt-priority">
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>
  `, [
    { label: 'Create thread', cls: 'btn-primary', action: () => {
      const name = document.getElementById('nt-name')?.value?.trim();
      if (!name) { markInvalid('nt-name', 'Thread name required'); return; }

      let initiatedBy = document.getElementById('nt-initiated-by')?.value || 'Self-initiated';
      if (initiatedBy === '__other__') {
        initiatedBy = document.getElementById('nt-other-name')?.value?.trim() || 'Other';
        addRequestedByOption(initiatedBy);
      }

      const thread = {
        id:          genId('thread'),
        name,
        initiatedBy,
        area:        document.getElementById('nt-area')?.value          || '',
        staff:       document.getElementById('nt-staff')?.value?.trim() || '',
        trigger:     document.getElementById('nt-trigger')?.value?.trim() || '',
        actionType:  document.getElementById('nt-action-type')?.value   || '',
        notes:       document.getElementById('nt-notes')?.value?.trim() || '',
        deadline:    document.getElementById('nt-deadline')?.value      || '',
        priority:    document.getElementById('nt-priority')?.value      || 'normal',
        status:      'active',
        impactSummary: '',
        entryIds:    [],
        referralIds: [],
        taskIds:     [],
        created:     new Date().toISOString(),
        updated:     new Date().toISOString(),
        closedDate:  '',
        archivedDate:'',
      };
      DB.threads.unshift(thread);

      // Auto-create a task if action type was set
      if (thread.actionType) {
        const task = {
          id:          genId('task'),
          title:       [thread.actionType, thread.staff || thread.name].filter(Boolean).join(' — '),
          type:        thread.actionType,
          referralId:  '',
          threadId:    thread.id,
          area:        thread.area,
          requestedBy: thread.initiatedBy,
          deadline:    thread.deadline,
          priority:    thread.priority,
          status:      'todo',
          entryId:     '',
          created:     new Date().toISOString(),
          notes:       thread.notes,
        };
        DB.tasks.unshift(task);
        thread.taskIds.push(task.id);
      }

      closeModal();
      renderThreads();
      renderWeeklyView();
      updateReferralBadge();
      toast('Thread created', 'success');
    }},
    { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
  ], { wide: true });

  // Wire "Other" toggle
  document.getElementById('nt-initiated-by')?.addEventListener('change', function() {
    document.getElementById('nt-other-row').style.display = this.value === '__other__' ? 'block' : 'none';
  });
}

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
  markDirty();
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
  const wasDone = task.status === 'done';
  task.status = wasDone ? 'todo' : 'done';
  task.completedDate = task.status === 'done' ? today() : '';
  markDirty();

  // Instant visual update on the checkbox without full re-render
  document.querySelectorAll(`[onclick*="${taskId}"]`).forEach(el => {
    if (el.classList.contains('task-checkbox')) {
      el.classList.toggle('done', task.status === 'done');
      el.setAttribute('aria-checked', String(task.status === 'done'));
      el.textContent = task.status === 'done' ? '✓' : '';
    }
  });

  if (task.status === 'done') {
    launchConfetti();
    toast('Task done! 🎉', 'success');
  }

  // Defer full re-render so confetti fires first
  setTimeout(() => {
    renderWeeklyView();
    renderThreads();
  }, 400);
}

function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colours = ['#1d4e89','#065f46','#92400e','#b45309','#ffffff','#fbbf24','#34d399'];
  const pieces = Array.from({length: 120}, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 80,
    r: 4 + Math.random() * 6,
    d: 1.5 + Math.random() * 2.5,
    colour: colours[Math.floor(Math.random() * colours.length)],
    tilt: Math.random() * 360,
    tiltSpeed: (Math.random() - 0.5) * 4,
    drift: (Math.random() - 0.5) * 1.5,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.beginPath();
      ctx.fillStyle = p.colour;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.tilt * Math.PI / 180);
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();
      p.y += p.d;
      p.x += p.drift;
      p.tilt += p.tiltSpeed;
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
    });
    frame++;
    if (frame < 90) requestAnimationFrame(draw);
    else { canvas.style.opacity = '0'; canvas.style.transition = 'opacity .4s'; setTimeout(() => canvas.remove(), 450); }
  }
  draw();
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
            ${r.staffInvolved ? `<span>· Staff: ${esc(r.staffInvolved)}</span>` : ''}
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
        ${r.notes ? `<p class="text-xs text-muted mb-8">${esc(r.notes.substring(0,140))}${r.notes.length>140?'…':''}</p>` : ''}
        ${thread ? `<div class="text-xs text-muted mb-8">
          Thread: <strong>${esc(thread.name)}</strong>
          · ${thread.entryIds.length} entr${thread.entryIds.length===1?'y':'ies'}
          · <span class="badge ${thread.status==='active'?'badge-teal':thread.status==='closed'?'badge-green':'badge-amber'}">${thread.status}</span>
        </div>` : ''}
        ${taskCount ? `<div class="text-xs text-amber mb-8">⚡ ${taskCount} task${taskCount>1?'s':''} outstanding</div>` : ''}
        <div class="flex gap-6 flex-wrap">
          <button class="btn btn-sm btn-primary" onclick="openNextActionsModal('${r.id}')">
            ➜ Next action
          </button>
          <button class="btn btn-sm btn-secondary" onclick="openReferralDetail('${r.id}')">View details</button>
          <button class="btn btn-sm btn-secondary" onclick="editReferral('${r.id}')">Edit</button>
          ${thread ? `<button class="btn btn-sm btn-secondary" onclick="openThreadDetail('${thread.id}')">Thread</button>` : ''}
          <button class="btn btn-sm btn-ghost" onclick="markReferralComplete('${r.id}')">Complete</button>
          <button class="btn btn-sm btn-ghost" onclick="deleteReferral('${r.id}')" aria-label="Delete referral">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ── REFERRAL DETAIL MODAL (Issue 1) ─────────────────────────── */

function openReferralDetail(referralId) {
  const r = DB.referrals.find(x => x.id === referralId);
  if (!r) return;
  const thread    = r.threadId ? DB.threads.find(t => t.id === r.threadId) : null;
  const tasks     = DB.tasks.filter(t => t.referralId === r.id);
  const entries   = thread ? DB.entries.filter(e => thread.entryIds.includes(e.id))
    .sort((a,b) => b.date.localeCompare(a.date)) : [];

  const taskHtml = tasks.length ? tasks.map(tk => `
    <div class="task-item" role="listitem">
      <div class="task-checkbox ${tk.status==='done'?'done':''}"
        onclick="completeTask('${tk.id}')" role="checkbox" aria-checked="${tk.status==='done'}" tabindex="0"
        onkeydown="if(event.key===' '||event.key==='Enter')completeTask('${tk.id}')">
        ${tk.status==='done'?'✓':''}
      </div>
      <div class="task-body">
        <div class="task-title ${tk.status==='done'?'done':''}">${esc(tk.title)}</div>
        <div class="task-meta">${tk.assignedTo?esc(tk.assignedTo)+' · ':''}${tk.type||''}</div>
      </div>
      ${tk.deadline ? `<span class="task-due ${tk.deadline<today()?'overdue':tk.deadline===today()?'today':'soon'}">${fmtDate(tk.deadline)}</span>` : ''}
    </div>
  `).join('') : '<p class="text-sm text-muted">No tasks yet.</p>';

  const entryHtml = entries.length ? entries.slice(0,5).map(e => `
    <div class="log-entry status-active mb-8">
      <div class="log-meta"><span>${fmtDate(e.date)}</span><span>·</span><span>${esc(e.subtype||e.type||'Entry')}</span></div>
      <p class="fw-600 text-sm">${esc(e.title)}</p>
      ${e.notes ? `<p class="text-sm text-muted mt-4">${esc(e.notes.substring(0,100))}${e.notes.length>100?'…':''}</p>` : ''}
    </div>
  `).join('') : '';

  openModal(`📥 ${esc(r.actionType)}${r.regarding?' — '+esc(r.regarding):''}`, `
    <div class="flex gap-6 mb-12 flex-wrap">
      <span class="badge ${r.status==='open'?'badge-teal':'badge-green'}">${r.status}</span>
      <span class="badge">${r.priority}</span>
      <span class="badge">From ${esc(r.requestedBy)}</span>
      ${r.deadline ? `<span class="task-due ${r.deadline<today()?'overdue':'soon'}">Due ${fmtDate(r.deadline)}</span>` : ''}
    </div>

    <div class="form-row mb-12" style="grid-template-columns:1fr 1fr">
      <div><div class="text-xs text-muted mb-4">Received</div><div class="text-sm fw-600">${fmtDate(r.date)}</div></div>
      ${r.area ? `<div><div class="text-xs text-muted mb-4">Area</div><div class="text-sm fw-600">${esc(r.area)}</div></div>` : ''}
      ${r.staffInvolved ? `<div><div class="text-xs text-muted mb-4">Staff involved</div><div class="text-sm fw-600">${esc(r.staffInvolved)}</div></div>` : ''}
    </div>

    ${r.context ? `<div class="card mb-12" style="background:var(--bg-subtle)">
      <div class="text-xs text-muted mb-4 fw-600">Context / trigger message</div>
      <p class="text-sm">${esc(r.context)}</p>
    </div>` : ''}

    ${r.notes ? `<div class="mb-12"><div class="text-xs text-muted mb-4 fw-600">Notes</div>
      <p class="text-sm">${esc(r.notes)}</p></div>` : ''}

    <div class="card-title mb-8">Tasks (${tasks.length})</div>
    ${taskHtml}

    ${entries.length ? `<div class="card-title mt-16 mb-8">Recent thread activity</div>${entryHtml}` : ''}
  `, [
    { label: '➜ Next action', cls: 'btn-primary', action: () => { closeModal(); openNextActionsModal(r.id); } },
    { label: 'Edit referral', cls: 'btn-secondary', action: () => { closeModal(); editReferral(r.id); } },
    thread ? { label: 'View full thread', cls: 'btn-secondary', action: () => { closeModal(); openThreadDetail(thread.id); } } : null,
    { label: 'Close', cls: 'btn-ghost', action: closeModal },
  ].filter(Boolean));
}

/* ── EDIT REFERRAL (Issue 3) ─────────────────────────────────── */

function editReferral(referralId) {
  const r = DB.referrals.find(x => x.id === referralId);
  if (!r) return;
  const areaOpts = DB.areas.map(a =>
    `<option value="${esc(a.code)}" ${r.area===a.code?'selected':''}>${esc(a.code)} · ${esc(a.name)}</option>`
  ).join('');

  openModal('Edit referral', `
    <div class="form-row">
      <div class="form-group">
        <label for="edit-ref-date">Date received</label>
        <input type="date" id="edit-ref-date" value="${r.date}">
      </div>
      <div class="form-group">
        <label for="edit-ref-deadline">Deadline</label>
        <input type="date" id="edit-ref-deadline" value="${r.deadline||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="edit-ref-by">Requested by</label>
        <input type="text" id="edit-ref-by" value="${esc(r.requestedBy||'')}">
      </div>
      <div class="form-group">
        <label for="edit-ref-priority">Priority</label>
        <select id="edit-ref-priority">
          ${['normal','high','urgent'].map(p=>`<option ${r.priority===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="edit-ref-action">Action type</label>
      <input type="text" id="edit-ref-action" value="${esc(r.actionType||'')}">
    </div>
    <div class="form-group">
      <label for="edit-ref-re">Regarding</label>
      <input type="text" id="edit-ref-re" value="${esc(r.regarding||'')}">
    </div>
    <div class="form-group">
      <label for="edit-ref-area">Curriculum area</label>
      <select id="edit-ref-area">
        <option value="">— select area —</option>
        ${areaOpts}
      </select>
    </div>
    <div class="form-group">
      <label for="edit-ref-staff">Staff involved</label>
      <input type="text" id="edit-ref-staff" value="${esc(r.staffInvolved||'')}" placeholder="Names of staff involved">
    </div>
    <div class="form-group">
      <label for="edit-ref-context">Context / trigger message</label>
      <textarea id="edit-ref-context" rows="3">${esc(r.context||'')}</textarea>
    </div>
    <div class="form-group">
      <label for="edit-ref-notes">Notes</label>
      <textarea id="edit-ref-notes" rows="2">${esc(r.notes||'')}</textarea>
    </div>
  `, [
    { label: 'Save changes', cls: 'btn-primary', action: () => {
      r.date         = document.getElementById('edit-ref-date')?.value || r.date;
      r.deadline     = document.getElementById('edit-ref-deadline')?.value || '';
      r.requestedBy  = document.getElementById('edit-ref-by')?.value?.trim() || r.requestedBy;
      r.priority     = document.getElementById('edit-ref-priority')?.value || 'normal';
      r.actionType   = document.getElementById('edit-ref-action')?.value?.trim() || r.actionType;
      r.regarding    = document.getElementById('edit-ref-re')?.value?.trim() || '';
      r.area         = document.getElementById('edit-ref-area')?.value || '';
      r.staffInvolved= document.getElementById('edit-ref-staff')?.value?.trim() || '';
      r.context      = document.getElementById('edit-ref-context')?.value?.trim() || '';
      r.notes        = document.getElementById('edit-ref-notes')?.value?.trim() || '';
      markDirty();
      closeModal();
      renderReferralInbox();
      renderWeeklyView();
      toast('Referral updated', 'success');
    }},
    { label: 'Cancel', cls: 'btn-ghost', action: closeModal },
  ]);
}

/* ── NEXT ACTIONS (Issue 4) ──────────────────────────────────── */

const NEXT_ACTION_TYPES = [
  { key: 'meeting',     label: 'Meeting',         icon: '🤝' },
  { key: 'coaching',    label: '1:1 Coaching',    icon: '💬' },
  { key: 'email',       label: 'Email / Message', icon: '📧' },
  { key: 'teach-meet',  label: 'Teach-Meet',      icon: '🎤' },
  { key: 'research',    label: 'Research',         icon: '🔍' },
  { key: 'observation', label: 'Learning Walk',    icon: '👁' },
  { key: 'health-check',label: 'Health Check',    icon: '✅' },
  { key: 'resource',    label: 'Create resource',  icon: '📄' },
  { key: 'other',       label: 'Other',            icon: '➕' },
];

function openNextActionsModal(referralId) {
  const r = referralId ? DB.referrals.find(x => x.id === referralId) : null;
  const contextNote = r
    ? `${r.actionType}${r.regarding ? ' — ' + r.regarding : ''} (from ${r.requestedBy})`
    : '';

  const typeButtons = NEXT_ACTION_TYPES.map(t =>
    `<button type="button"
      class="next-action-btn"
      id="nat-${t.key}"
      onclick="selectNextActionType('${t.key}')"
      aria-pressed="false"
      style="display:flex;align-items:center;gap:.4rem;padding:.45rem .8rem;
             border:2px solid var(--border);border-radius:var(--radius);background:var(--surface);
             font-size:.8rem;font-family:var(--font-sans);cursor:pointer;white-space:nowrap;
             transition:border-color .15s,background .15s">
      <span aria-hidden="true">${t.icon}</span>${t.label}
    </button>`
  ).join('');

  openModal('➜ Next action', `
    ${contextNote ? `<div class="card mb-12" style="background:var(--bg-subtle)">
      <div class="text-xs text-muted mb-2">Referral</div>
      <p class="text-sm fw-600">${esc(contextNote)}</p>
    </div>` : ''}

    <div class="form-group mb-12">
      <label>What type of action is this?</label>
      <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.4rem" role="group" aria-label="Action type">
        ${typeButtons}
      </div>
      <input type="hidden" id="next-action-type" value="">
    </div>

    <div class="form-group">
      <label for="next-action-title">Task title <span class="req" aria-hidden="true">*</span></label>
      <input type="text" id="next-action-title"
        placeholder="e.g. Email Richard Hanney to arrange HoA planning session">
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="next-action-person">Involve / assigned to</label>
        <input type="text" id="next-action-person"
          placeholder="Name of person involved" value="${r?.staffInvolved||''}">
      </div>
      <div class="form-group">
        <label for="next-action-deadline">Sub-deadline</label>
        <input type="date" id="next-action-deadline">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="next-action-priority">Priority</label>
        <select id="next-action-priority">
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="next-action-notes">Notes / context for this action</label>
      <textarea id="next-action-notes" rows="2"
        placeholder="Any context useful when you come back to this task">${contextNote ? 'Re: ' + contextNote : ''}</textarea>
    </div>

    <div class="toggle-row mt-8">
      <span class="toggle-label">Open Quick Capture pre-loaded with this context when saving</span>
      <label class="toggle-switch" aria-label="Open quick capture">
        <input type="checkbox" id="next-action-open-qc" checked>
        <span class="toggle-slider"></span>
      </label>
    </div>
  `, [
    { label: 'Create action', cls: 'btn-primary', action: () => saveNextAction(referralId) },
    { label: 'Cancel', cls: 'btn-ghost', action: closeModal },
  ]);
}

function selectNextActionType(key) {
  // Toggle button states
  document.querySelectorAll('.next-action-btn').forEach(btn => {
    const isThis = btn.id === 'nat-' + key;
    btn.style.borderColor    = isThis ? 'var(--navy-800)' : 'var(--border)';
    btn.style.background     = isThis ? 'var(--navy-800)' : 'var(--surface)';
    btn.style.color          = isThis ? '#fff' : '';
    btn.setAttribute('aria-pressed', String(isThis));
  });
  document.getElementById('next-action-type').value = key;

  // Auto-fill title if empty
  const titleEl = document.getElementById('next-action-title');
  if (titleEl && !titleEl.value) {
    const t = NEXT_ACTION_TYPES.find(x => x.key === key);
    if (t) titleEl.value = t.label + ' — ';
    titleEl.focus();
    titleEl.setSelectionRange(titleEl.value.length, titleEl.value.length);
  }
}

function saveNextAction(referralId) {
  const type     = document.getElementById('next-action-type')?.value;
  const title    = document.getElementById('next-action-title')?.value?.trim();
  const person   = document.getElementById('next-action-person')?.value?.trim();
  const deadline = document.getElementById('next-action-deadline')?.value;
  const priority = document.getElementById('next-action-priority')?.value || 'normal';
  const notes    = document.getElementById('next-action-notes')?.value?.trim();
  const openQC   = document.getElementById('next-action-open-qc')?.checked;

  if (!title) { toast('Task title required', 'error'); document.getElementById('next-action-title')?.focus(); return; }

  const r = referralId ? DB.referrals.find(x => x.id === referralId) : null;
  const thread = r?.threadId ? DB.threads.find(t => t.id === r.threadId) : null;

  const task = {
    id:          genId('task'),
    title,
    type:        type || 'other',
    status:      'todo',
    priority,
    deadline:    deadline || '',
    assignedTo:  person || '',
    requestedBy: r?.requestedBy || '',
    referralId:  referralId || '',
    threadId:    thread?.id || '',
    notes,
    created:     new Date().toISOString(),
    completedDate: '',
  };

  DB.tasks.unshift(task);
  if (thread) {
    if (!thread.taskIds) thread.taskIds = [];
    thread.taskIds.push(task.id);
  }
  markDirty();

  closeModal();
  renderWeeklyView();
  renderReferralInbox();
  renderThreads();
  toast('Action created', 'success');

  // Open Quick Capture pre-loaded with context
  if (openQC && r) {
    setTimeout(() => {
      _qcThreadId = thread?.id || '';
      navigateTo('quick-capture');
      // Pre-fill context
      setTimeout(() => {
        const notesEl = document.getElementById('qc-notes');
        if (notesEl && !notesEl.value) {
          const actionType = NEXT_ACTION_TYPES.find(x => x.key === type);
          notesEl.value =
            `${actionType?.label || type || 'Action'} — ${r.actionType}${r.regarding ? ' re: ' + r.regarding : ''}\n` +
            `From: ${r.requestedBy}${person ? ' · Involving: ' + person : ''}\n` +
            (notes ? '\n' + notes : '');
        }
        const titleEl = document.getElementById('qc-title');
        if (titleEl && !titleEl.value) titleEl.value = title;
      }, 300);
    }, 100);
  }
}

function markReferralComplete(id) {
  const r = DB.referrals.find(x => x.id === id);
  if (!r) return;
  r.status = 'complete';
  markDirty();
  renderReferralInbox();
  renderWeeklyView();
  toast('Referral marked complete', 'success');
}

function deleteReferral(id) {
  if (!confirm('Delete this referral?')) return;
  DB.referrals = DB.referrals.filter(r => r.id !== id);
  markDirty();
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
  if (filterStatus === 'archived') {
    threads = threads.filter(t => t.status === 'archived');
  } else if (filterStatus) {
    threads = threads.filter(t => t.status === filterStatus);
  } else {
    // Default: active + waiting only (not closed/archived)
    threads = threads.filter(t => t.status === 'active' || t.status === 'awaiting-follow-up');
  }

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
  const statusClass = t.status==='active' ? 'badge-teal' : t.status==='closed' || t.status==='archived' ? 'badge-green' : 'badge-amber';
  const overdue = nextTask?.deadline && nextTask.deadline < today();
  const dueToday= nextTask?.deadline === today();
  const isClosedOrArchived = t.status === 'closed' || t.status === 'archived';

  // Ink stamp SVG — deliberately imperfect, slightly rotated, partial ink bleed
  const stampSVG = isClosedOrArchived ? `
    <div aria-hidden="true" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-18deg);
      pointer-events:none;z-index:10;opacity:.18;user-select:none">
      <svg width="180" height="72" viewBox="0 0 180 72" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="172" height="64" rx="6"
          fill="none" stroke="${t.status==='archived'?'#6d28d9':'#15803d'}" stroke-width="5"
          stroke-dasharray="2,1.5"
          style="filter:url(#rough)"/>
        <text x="90" y="42" text-anchor="middle" dominant-baseline="middle"
          font-family="Georgia,serif" font-size="26" font-weight="bold" letter-spacing="6"
          fill="${t.status==='archived'?'#6d28d9':'#15803d'}"
          style="filter:url(#rough)">${t.status==='archived'?'ARCHIVED':'COMPLETE'}</text>
        <defs>
          <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
      </svg>
    </div>` : '';

  return `<div class="thread-card mb-12" id="thread-${t.id}" role="article"
    aria-label="Thread: ${esc(t.name)}"
    style="position:relative;overflow:hidden;${isClosedOrArchived ? 'opacity:.72;' : ''}">
    ${stampSVG}
    <div class="thread-header" style="${isClosedOrArchived ? 'background:var(--bg-subtle)' : ''}">
      <div style="flex:1;min-width:0">
        <div class="thread-title">${esc(t.name)}</div>
        <div class="thread-meta">
          ${esc(t.initiatedBy)}
          ${t.area ? `· <span class="badge badge-navy" style="font-size:.62rem">${t.area}</span>` : ''}
          ${t.staff ? `· ${esc(t.staff)}` : ''}
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
      ${t.trigger ? `<div class="text-xs text-muted mb-8" style="padding:.4rem .6rem;background:var(--bg);border-radius:var(--radius);border-left:3px solid var(--border-strong)">
        <strong>Trigger:</strong> ${esc(t.trigger.substring(0,120))}${t.trigger.length>120?'…':''}
      </div>` : ''}

      ${nextTask ? `<div class="thread-next-action ${overdue?'overdue':dueToday?'today':''}">
        <strong>Next:</strong> ${esc(nextTask.title)}
        ${nextTask.deadline ? `<span class="task-due ${overdue?'overdue':dueToday?'today':'soon'}" style="margin-left:.4rem">
          ${overdue?'⚠ Overdue ':'Due '}${fmtDate(nextTask.deadline)}
        </span>` : ''}
      </div>` : ''}

      ${lastEntry ? `<div class="text-xs text-muted mb-8">
        Last: ${fmtDate(lastEntry.date)} · ${esc(lastEntry.subtype||lastEntry.type||'Entry')} · ${esc(lastEntry.title?.substring(0,55)||'')}
      </div>` : ''}

      ${t.impactSummary ? `<div class="log-entry status-complete mb-8">
        <div class="log-meta">Impact summary</div>
        <p class="text-sm">${esc(t.impactSummary)}</p>
      </div>` : ''}

      <div class="flex gap-6 flex-wrap">
        ${!isClosedOrArchived ? `
          <button class="btn btn-sm btn-primary" onclick="openQuickCaptureForThread('${t.id}')">+ Add entry</button>
          <button class="btn btn-sm btn-secondary" onclick="addManualTask('${t.id}')">+ Task</button>
          <button class="btn btn-sm btn-secondary" onclick="setThreadStatus('${t.id}','awaiting-follow-up')">Mark waiting</button>
          <button class="btn btn-sm btn-teal" onclick="closeThread('${t.id}')">Close thread</button>
        ` : t.status === 'closed' ? `
          <button class="btn btn-sm btn-secondary" onclick="setThreadStatus('${t.id}','active')">Re-open</button>
          <button class="btn btn-sm btn-secondary" style="color:var(--purple-700);border-color:var(--purple-700)" onclick="archiveThread('${t.id}')">📦 Archive</button>
        ` : `
          <button class="btn btn-sm btn-secondary" onclick="setThreadStatus('${t.id}','active')">Restore from archive</button>
        `}
        <button class="btn btn-sm btn-secondary" onclick="openThreadDetail('${t.id}')">Full history</button>
        <button class="btn btn-sm btn-ghost" onclick="deleteThread('${t.id}')" aria-label="Delete thread">Delete</button>
      </div>
    </div>
  </div>`;
}

function archiveThread(threadId) {
  const t = DB.threads.find(x => x.id === threadId);
  if (!t) return;
  if (t.status !== 'closed') {
    toast('Close the thread before archiving', 'error'); return;
  }
  t.status      = 'archived';
  t.archivedDate= today();
  t.updated     = new Date().toISOString();
  renderThreads();
  toast('Thread archived', 'success');
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
      ${t.area ? `<span class="badge">${esc(t.area)}</span>` : ''}
      ${t.initiatedBy ? `<span class="badge">From: ${esc(t.initiatedBy)}</span>` : ''}
    </div>
    ${t.impactSummary ? `<div class="log-entry status-complete mb-16">
      <div class="log-meta">Impact summary</div>
      <p class="text-sm">${esc(t.impactSummary)}</p>
    </div>` : ''}
    <div class="card-title">Activity timeline</div>
    ${entriesHtml}
    ${tasksHtml}
  `, [
    { label: '➜ Next action', cls: 'btn-primary', action: () => {
        const ref = DB.referrals.find(r => r.threadId === threadId);
        closeModal();
        openNextActionsModal(ref?.id || null);
        // pass thread context if no referral
        if (!ref) setTimeout(() => {
          const el = document.getElementById('next-action-notes');
          if (el && !el.value) el.value = 'Thread: ' + t.name;
        }, 200);
      }
    },
    { label: '+ Add entry', cls: 'btn-secondary', action: () => { closeModal(); openQuickCaptureForThread(threadId); } },
    { label: '+ Task',      cls: 'btn-secondary', action: () => { closeModal(); addManualTask(threadId); } },
    t.status !== 'closed'
      ? { label: 'Close thread', cls: 'btn-ghost', action: () => { closeModal(); closeThread(threadId); } }
      : { label: 'Re-open', cls: 'btn-ghost', action: () => { closeModal(); setThreadStatus(threadId, 'active'); } },
    { label: '✕', cls: 'btn-ghost', action: closeModal },
  ]);
}

/* ── RENDER: WEEKLY VIEW ─────────────────────────────────────── */

function renderWeeklyView() {
  renderWeeklyTasks();
  renderWeeklyThreads();
  renderWeeklyDeadlines();
  renderWeeklyRecent();
}

function getWeekStart() {
  const stored = localStorage.getItem('dpc-week-start');
  if (stored) return stored;
  return getThisMonday();
}

function getThisMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}

function setWeekStart(val) {
  localStorage.setItem('dpc-week-start', val);
  renderWeeklyView();
}

function renderWeeklyTasks() {
  const el = document.getElementById('weekly-tasks-list');
  if (!el) return;

  const weekStart = getWeekStart();
  const weekEnd   = getWeekEnd(weekStart);
  const todayStr  = today();

  // Week picker
  const pickerContainer = document.getElementById('week-picker-row');
  if (pickerContainer) {
    pickerContainer.innerHTML = `
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.75rem;flex-wrap:wrap">
        <label for="week-start-input" style="font-size:.75rem;font-weight:600;color:var(--text-muted)">Week starting</label>
        <input type="date" id="week-start-input" value="${weekStart}"
          style="font-size:.8rem;padding:.25rem .5rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface)"
          onchange="setWeekStart(this.value)" aria-label="Week start date">
        <button class="btn btn-sm btn-secondary" onclick="setWeekStart(getThisMonday())" style="font-size:.72rem">This week</button>
        <span style="font-size:.72rem;color:var(--text-muted);font-family:var(--font-mono)">${weekStart} → ${weekEnd}</span>
      </div>`;
  }

  const renderTask = t => {
    const overdue  = t.deadline && t.deadline < todayStr;
    const dueToday = t.deadline === todayStr;
    const thread   = t.threadId ? DB.threads.find(th => th.id === t.threadId) : null;
    return `<div class="task-item" role="listitem" id="task-item-${t.id}"
      tabindex="0" onkeydown="if(event.key==='Enter')completeTask('${t.id}')"
      aria-label="${esc(t.title)}${t.deadline ? ', due '+fmtDate(t.deadline) : ''}">
      <div class="task-checkbox${t.status==='done'?' done':''}" onclick="completeTask('${t.id}')"
        role="checkbox" aria-checked="${t.status==='done'}" tabindex="-1"
        style="border-color:${overdue?'var(--red-700)':dueToday?'var(--amber-700)':'var(--border-strong)'}">
        ${t.status==='done'?'✓':''}
      </div>
      <div class="task-body">
        <div class="task-title${t.status==='done'?' done':''}">${esc(t.title)}</div>
        <div class="task-meta">
          ${t.assignedTo ? '<strong>'+esc(t.assignedTo)+'</strong> · ' : ''}
          ${t.requestedBy ? esc(t.requestedBy)+' · ' : ''}
          ${thread ? esc(thread.name.substring(0,35)) : (t.type||'')}
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
  };

  // Tasks due this week or overdue
  const tasks = DB.tasks
    .filter(t => t.status !== 'done' && t.deadline && t.deadline <= weekEnd)
    .sort((a, b) => {
      const ao = a.deadline < todayStr, bo = b.deadline < todayStr;
      if (ao && !bo) return -1;
      if (!ao && bo) return 1;
      if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
      const pd = {urgent:0,high:1,normal:2};
      return (pd[a.priority]||2) - (pd[b.priority]||2);
    });

  const undated = DB.tasks.filter(t => t.status !== 'done' && !t.deadline);

  if (!tasks.length && !undated.length) {
    el.innerHTML = `<div class="empty-state"><p>No tasks due this week. Clear inbox ✓</p></div>`;
    return;
  }

  let html = tasks.map(renderTask).join('');
  if (undated.length) {
    html += `<div class="card-title mt-16 mb-8" style="font-size:.7rem;color:var(--text-muted)">No deadline set (${undated.length})</div>`;
    html += undated.map(renderTask).join('');
  }
  el.innerHTML = html;
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
