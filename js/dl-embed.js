/* ================================================================
   DPC EVIDENCE HUB — dl-embed.js
   Embeds the Digital Leads Activity Dashboard inside the hub.
   Uses File System Access API (Chrome/Edge) with fallback to
   input[type=file] for Safari. Parses Excel via SheetJS CDN.
   ================================================================ */

'use strict';

let _dlData = [];
let _dlCharts = {};

function initDLDashboard() {
  // SheetJS loaded on demand
  if (!window.XLSX) loadSheetJS(() => { /* ready */ });
}

function loadSheetJS(cb) {
  if (window.XLSX) { cb(); return; }
  const s    = document.createElement('script');
  s.src      = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload   = cb;
  s.onerror  = () => toast('Could not load SheetJS library', 'error');
  document.head.appendChild(s);
}

async function dlOpenFilePicker() {
  // Prefer File System Access API (Chrome/Edge)
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description:'Excel files', accept:{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'.xlsx' } }],
      });
      const file = await handle.getFile();
      dlReadFile(file);
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // user cancelled
      // Fall through to input fallback
    }
  }
  // Fallback: hidden input
  const inp     = document.createElement('input');
  inp.type      = 'file';
  inp.accept    = '.xlsx,.xls';
  inp.onchange  = e => { if (e.target.files[0]) dlReadFile(e.target.files[0]); };
  inp.click();
}

function dlReadFile(file) {
  loadSheetJS(() => {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb  = XLSX.read(ev.target.result, { type:'binary', cellDates:false });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval:'' });
        _dlData = raw.map(normaliseDLRow);
        renderDLDashboard();
        toast('Loaded ' + _dlData.length + ' Digital Leads entries', 'success');
      } catch(err) {
        toast('Could not parse file: ' + err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
  });
}

function normaliseDLRow(row) {
  // Use exact column names from the Forms export:
  // Id, Start time, Timestamp, DLName, Area, StaffCount, Focus, OtherDetail, Confidence, HealthCheck, Notes
  const v = (key) => {
    // Exact match first
    if (row[key] !== undefined && row[key] !== '') return String(row[key]);
    // Case-insensitive fallback
    const found = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
    if (found && row[found] !== '' && row[found] !== undefined) return String(row[found]);
    return '';
  };

  const dateRaw = v('Timestamp') || v('Start time');
  let date = '';
  if (dateRaw) {
    // Handle Excel serial number (numeric)
    const num = parseFloat(dateRaw);
    if (!isNaN(num) && num > 40000 && num < 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + num * 86400000);
      if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
    } else {
      // Try as date string
      const d = new Date(dateRaw);
      if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
    }
  }

  return {
    date,
    name:        v('DLName'),
    area:        v('Area'),
    staffCount:  v('StaffCount'),
    focus:       v('Focus'),
    otherDetail: v('OtherDetail'),
    confidence:  v('Confidence'),
    healthCheck: v('HealthCheck'),
    notes:       v('Notes'),
    // For dashboard compatibility — map to common labels
    actType:     v('Focus') || v('OtherDetail') || 'Activity',
    title:       [v('Focus'), v('OtherDetail')].filter(Boolean).join(' — ') || 'Activity logged',
    impact:      v('Notes'),
    learners:    v('StaffCount'),
  };
}

function renderDLDashboard() {
  const el = document.getElementById('dl-dashboard-content');
  if (!el) return;
  if (!_dlData.length) {
    el.innerHTML = `<div class="empty-state"><p>No data loaded.</p></div>`;
    return;
  }

  if (!window.Chart) {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';
    s.onload = () => buildDLCharts();
    document.head.appendChild(s);
  } else {
    buildDLCharts();
  }

  const total     = _dlData.length;
  const leads     = new Set(_dlData.map(r => r.name).filter(Boolean)).size;
  const areas     = new Set(_dlData.map(r => r.area).filter(Boolean)).size;
  const thisMonth = _dlData.filter(r => r.date >= today().substring(0, 7)).length;
  const hcDone    = _dlData.filter(r => (r.healthCheck || '').toLowerCase().startsWith('y') ||
                                        (r.healthCheck || '') === '1').length;
  const confident = _dlData.filter(r => (r.confidence || '').toLowerCase().includes('confident') &&
                                        !(r.confidence || '').toLowerCase().includes('not')).length;

  el.innerHTML = `
    <div class="grid-4 mb-16">
      <div class="stat-card c-teal">
        <div class="stat-n">${total}</div>
        <div class="stat-l">Total sessions</div>
      </div>
      <div class="stat-card">
        <div class="stat-n">${leads}</div>
        <div class="stat-l">Digital Leads</div>
      </div>
      <div class="stat-card c-green">
        <div class="stat-n">${areas}</div>
        <div class="stat-l">Areas covered</div>
      </div>
      <div class="stat-card c-amber">
        <div class="stat-n">${thisMonth}</div>
        <div class="stat-l">This month</div>
      </div>
    </div>
    <div class="grid-2 mb-16">
      <div class="stat-card">
        <div class="stat-n">${hcDone}</div>
        <div class="stat-l">Health Checks completed</div>
        <div class="stat-d">${total ? Math.round(hcDone/total*100) : 0}% of sessions</div>
      </div>
      <div class="stat-card c-green">
        <div class="stat-n">${confident}</div>
        <div class="stat-l">Reported as Confident</div>
        <div class="stat-d">${total ? Math.round(confident/total*100) : 0}% of sessions</div>
      </div>
    </div>
    <div class="grid-2 mb-16">
      <div class="card"><div class="card-title">Sessions by focus area</div>
        <canvas id="dl-chart-type" aria-label="Bar chart: sessions by focus area" role="img"></canvas>
      </div>
      <div class="card"><div class="card-title">Sessions over time (by month)</div>
        <canvas id="dl-chart-time" aria-label="Line chart: sessions over time" role="img"></canvas>
      </div>
    </div>
    <div class="grid-2 mb-16">
      <div class="card"><div class="card-title">Sessions by curriculum area</div>
        <canvas id="dl-chart-area" aria-label="Bar chart: sessions by area" role="img"></canvas>
      </div>
      <div class="card"><div class="card-title">Sessions by Digital Lead</div>
        <canvas id="dl-chart-leads" aria-label="Bar chart: sessions by Digital Lead" role="img"></canvas>
      </div>
    </div>
    <div class="grid-2 mb-16">
      <div class="card"><div class="card-title">Confidence levels</div>
        <canvas id="dl-chart-confidence" aria-label="Bar chart: confidence levels" role="img"></canvas>
      </div>
      <div class="card"><div class="card-title">Staff reached per session</div>
        <canvas id="dl-chart-staff" aria-label="Bar chart: staff count per session" role="img"></canvas>
      </div>
    </div>
    <div class="card">
      <div class="card-title flex-between">
        Activity log
        <span class="badge">${total} sessions</span>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table" aria-label="Digital Leads activity log">
          <caption class="sr-only">All Digital Lead sessions from Excel file</caption>
          <thead><tr>
            <th scope="col">Date</th>
            <th scope="col">Digital Lead</th>
            <th scope="col">Area</th>
            <th scope="col">Staff</th>
            <th scope="col">Focus</th>
            <th scope="col">Confidence</th>
            <th scope="col">HC</th>
            <th scope="col">Notes</th>
          </tr></thead>
          <tbody>
            ${_dlData.slice().sort((a, b) => b.date > a.date ? 1 : -1).map(r => `<tr>
              <td class="text-mono text-xs">${esc(r.date || '—')}</td>
              <td class="fw-600 text-sm">${esc(r.name || '—')}</td>
              <td class="text-xs">${esc(r.area || '—')}</td>
              <td class="text-xs text-mono">${esc(r.staffCount || '—')}</td>
              <td class="text-sm">${esc(r.focus || r.otherDetail || '—')}</td>
              <td><span class="badge ${
                (r.confidence||'').toLowerCase().includes('confident') && !(r.confidence||'').toLowerCase().includes('not') ? 'badge-green' :
                (r.confidence||'').toLowerCase().includes('getting') ? 'badge-amber' : 'badge-red'
              }">${esc(r.confidence || '—')}</span></td>
              <td class="text-xs">${esc(r.healthCheck || '—')}</td>
              <td class="text-xs text-muted" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.notes || '—')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  setTimeout(buildDLCharts, 100);
}

function buildDLCharts() {
  if (!window.Chart || !_dlData.length) return;

  Object.values(_dlCharts).forEach(c => { try { c.destroy(); } catch(e){} });
  _dlCharts = {};

  const COLOURS = [
    '#1d4e89','#0f766e','#b45309','#b91c1c','#15803d',
    '#6d28d9','#c2410c','#0369a1','#065f46','#92400e',
  ];

  // Focus area chart
  const focusCounts = {};
  _dlData.forEach(r => {
    const f = r.focus || r.otherDetail || 'Other';
    focusCounts[f] = (focusCounts[f] || 0) + 1;
  });
  const typeCanvas = document.getElementById('dl-chart-type');
  if (typeCanvas) {
    const labels = Object.keys(focusCounts).sort((a, b) => focusCounts[b] - focusCounts[a]);
    _dlCharts.type = new Chart(typeCanvas, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Sessions', data: labels.map(l => focusCounts[l]),
        backgroundColor: labels.map((_, i) => COLOURS[i % COLOURS.length]), borderRadius: 4 }] },
      options: barOpts('Sessions'),
    });
  }

  // Over time (monthly)
  const monthCounts = {};
  _dlData.forEach(r => {
    if (r.date) { const m = r.date.substring(0, 7); monthCounts[m] = (monthCounts[m] || 0) + 1; }
  });
  const timeCanvas = document.getElementById('dl-chart-time');
  if (timeCanvas) {
    const months = Object.keys(monthCounts).sort();
    _dlCharts.time = new Chart(timeCanvas, {
      type: 'line',
      data: { labels: months, datasets: [{ label: 'Sessions', data: months.map(m => monthCounts[m]),
        borderColor: '#1d4e89', backgroundColor: 'rgba(29,78,137,.1)', fill: true, tension: 0.3, pointRadius: 4 }] },
      options: lineOpts('Sessions per month'),
    });
  }

  // By area
  const areaCounts = {};
  _dlData.forEach(r => { if (r.area) areaCounts[r.area] = (areaCounts[r.area] || 0) + 1; });
  const areaCanvas = document.getElementById('dl-chart-area');
  if (areaCanvas) {
    const labels = Object.keys(areaCounts).sort((a, b) => areaCounts[b] - areaCounts[a]).slice(0, 12);
    _dlCharts.area = new Chart(areaCanvas, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Sessions', data: labels.map(l => areaCounts[l]),
        backgroundColor: '#0f766e', borderRadius: 4 }] },
      options: { ...barOpts('Sessions'), indexAxis: 'y' },
    });
  }

  // By Digital Lead
  const leadCounts = {};
  _dlData.forEach(r => { if (r.name) leadCounts[r.name] = (leadCounts[r.name] || 0) + 1; });
  const leadCanvas = document.getElementById('dl-chart-leads');
  if (leadCanvas) {
    const labels = Object.keys(leadCounts).sort((a, b) => leadCounts[b] - leadCounts[a]).slice(0, 12);
    _dlCharts.leads = new Chart(leadCanvas, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Sessions', data: labels.map(l => leadCounts[l]),
        backgroundColor: labels.map((_, i) => COLOURS[i % COLOURS.length]), borderRadius: 4 }] },
      options: { ...barOpts('Sessions'), indexAxis: 'y' },
    });
  }

  // Confidence levels
  const confCounts = {};
  _dlData.forEach(r => {
    const c = r.confidence || 'Not recorded';
    confCounts[c] = (confCounts[c] || 0) + 1;
  });
  const confCanvas = document.getElementById('dl-chart-confidence');
  if (confCanvas) {
    const labels = Object.keys(confCounts).sort((a, b) => confCounts[b] - confCounts[a]);
    const bgMap = (l) => {
      const lower = l.toLowerCase();
      if (lower.includes('confident') && !lower.includes('not')) return '#15803d';
      if (lower.includes('getting')) return '#b45309';
      if (lower.includes('not')) return '#b91c1c';
      return '#6b7280';
    };
    _dlCharts.confidence = new Chart(confCanvas, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Count', data: labels.map(l => confCounts[l]),
        backgroundColor: labels.map(bgMap), borderRadius: 4 }] },
      options: barOpts('Count'),
    });
  }

  // Staff count distribution
  const staffBuckets = { '1': 0, '2–3': 0, '4–6': 0, '7–10': 0, '11+': 0 };
  _dlData.forEach(r => {
    const n = parseInt(r.staffCount) || 0;
    if (n === 1) staffBuckets['1']++;
    else if (n <= 3) staffBuckets['2–3']++;
    else if (n <= 6) staffBuckets['4–6']++;
    else if (n <= 10) staffBuckets['7–10']++;
    else if (n > 10) staffBuckets['11+']++;
  });
  const staffCanvas = document.getElementById('dl-chart-staff');
  if (staffCanvas) {
    const labels = Object.keys(staffBuckets);
    _dlCharts.staff = new Chart(staffCanvas, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Sessions', data: labels.map(l => staffBuckets[l]),
        backgroundColor: '#1d4e89', borderRadius: 4 }] },
      options: barOpts('Sessions'),
    });
  }
}

function barOpts(yLabel) {
  return {
    responsive: true,
    plugins: { legend:{ display:false } },
    scales: {
      y: { beginAtZero:true, title:{ display:true, text:yLabel, font:{ size:11 } },
           grid:{ color:'rgba(0,0,0,.06)' } },
      x: { grid:{ display:false } }
    }
  };
}

function lineOpts(yLabel) {
  return {
    responsive: true,
    plugins: { legend:{ display:false } },
    scales: {
      y: { beginAtZero:true, title:{ display:true, text:yLabel, font:{ size:11 } },
           grid:{ color:'rgba(0,0,0,.06)' } },
      x: { grid:{ display:false } }
    }
  };
}
