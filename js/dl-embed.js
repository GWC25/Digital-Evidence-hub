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
  // Normalise column names (Forms renames them with question text)
  const get = (keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find(r => r.toLowerCase().includes(k.toLowerCase()));
      if (found && row[found] !== undefined && row[found] !== '') return String(row[found]);
    }
    return '';
  };

  const dateRaw = get(['completion time','timestamp','date','completed']);
  let date = '';
  if (dateRaw) {
    // Handle Excel serial number
    const num = parseFloat(dateRaw);
    if (!isNaN(num) && num > 40000 && num < 60000) {
      const d = new Date(Date.UTC(1899,11,30) + num * 86400000);
      if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
    } else {
      const d = new Date(dateRaw);
      if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
    }
  }

  return {
    date,
    name:      get(['name','your name','full name']),
    area:      get(['area','department','curriculum','subject area']),
    actType:   get(['activity type','type of activity','what type']),
    title:     get(['activity title','title','what did you do','name the activity']),
    impact:    get(['impact','what was the impact','outcome']),
    learners:  get(['learners','number of learners','how many learners']),
    notes:     get(['notes','additional','comments','anything else']),
  };
}

function renderDLDashboard() {
  const el = document.getElementById('dl-dashboard-content');
  if (!el) return;
  if (!_dlData.length) {
    el.innerHTML = `<div class="empty-state"><p>No data loaded.</p></div>`;
    return;
  }

  // Load Chart.js if needed
  if (!window.Chart) {
    const s   = document.createElement('script');
    s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';
    s.onload  = () => buildDLCharts();
    document.head.appendChild(s);
  } else {
    buildDLCharts();
  }

  const total    = _dlData.length;
  const areas    = new Set(_dlData.map(r=>r.area).filter(Boolean)).size;
  const leads    = new Set(_dlData.map(r=>r.name).filter(Boolean)).size;
  const thisMonth= _dlData.filter(r => r.date >= today().substring(0,7)).length;

  el.innerHTML = `
    <div class="grid-4 mb-16">
      <div class="stat-card c-teal">
        <div class="stat-n">${total}</div>
        <div class="stat-l">Total activities</div>
      </div>
      <div class="stat-card">
        <div class="stat-n">${leads}</div>
        <div class="stat-l">Digital Leads</div>
      </div>
      <div class="stat-card c-green">
        <div class="stat-n">${areas}</div>
        <div class="stat-l">Areas</div>
      </div>
      <div class="stat-card c-amber">
        <div class="stat-n">${thisMonth}</div>
        <div class="stat-l">This month</div>
      </div>
    </div>
    <div class="grid-2 mb-16">
      <div class="card"><div class="card-title">Activity by type</div>
        <canvas id="dl-chart-type" aria-label="Bar chart: Digital Lead activities by type" role="img"></canvas>
      </div>
      <div class="card"><div class="card-title">Activity over time</div>
        <canvas id="dl-chart-time" aria-label="Line chart: Digital Lead activities over time" role="img"></canvas>
      </div>
    </div>
    <div class="grid-2 mb-16">
      <div class="card"><div class="card-title">Activity by area</div>
        <canvas id="dl-chart-area" aria-label="Bar chart: activities by curriculum area" role="img"></canvas>
      </div>
      <div class="card"><div class="card-title">Contributions by Digital Lead</div>
        <canvas id="dl-chart-leads" aria-label="Bar chart: activities by Digital Lead" role="img"></canvas>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Activity log</div>
      <div style="overflow-x:auto">
        <table class="data-table" aria-label="Digital Leads activity log">
          <caption class="sr-only">All Digital Lead activities loaded from Excel file</caption>
          <thead><tr>
            <th scope="col">Date</th>
            <th scope="col">Name</th>
            <th scope="col">Area</th>
            <th scope="col">Type</th>
            <th scope="col">Title</th>
            <th scope="col">Impact</th>
          </tr></thead>
          <tbody>
            ${_dlData.slice().sort((a,b)=>b.date>a.date?1:-1).map(r=>`<tr>
              <td class="text-mono text-xs">${esc(r.date||'—')}</td>
              <td class="fw-600 text-sm">${esc(r.name||'—')}</td>
              <td class="text-xs">${esc(r.area||'—')}</td>
              <td><span class="badge">${esc(r.actType||'—')}</span></td>
              <td class="text-sm">${esc(r.title||'—')}</td>
              <td class="text-xs text-muted">${esc((r.impact||'').substring(0,80))}</td>
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

  // Destroy existing charts
  Object.values(_dlCharts).forEach(c => { try { c.destroy(); } catch(e){} });
  _dlCharts = {};

  const COLOURS = [
    '#1d4e89','#0f766e','#b45309','#b91c1c','#15803d',
    '#6d28d9','#c2410c','#0369a1','#065f46','#92400e',
  ];

  // Activity by type
  const typeCounts = {};
  _dlData.forEach(r => { if (r.actType) typeCounts[r.actType] = (typeCounts[r.actType]||0)+1; });
  const typeCanvas = document.getElementById('dl-chart-type');
  if (typeCanvas) {
    const labels = Object.keys(typeCounts).sort((a,b)=>typeCounts[b]-typeCounts[a]);
    _dlCharts.type = new Chart(typeCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label:'Activities', data: labels.map(l=>typeCounts[l]),
          backgroundColor: labels.map((_,i) => COLOURS[i % COLOURS.length]),
          borderRadius: 4 }]
      },
      options: barOpts('Number of activities'),
    });
  }

  // Over time (monthly)
  const monthCounts = {};
  _dlData.forEach(r => {
    if (r.date) {
      const m = r.date.substring(0,7);
      monthCounts[m] = (monthCounts[m]||0)+1;
    }
  });
  const timeCanvas = document.getElementById('dl-chart-time');
  if (timeCanvas) {
    const months = Object.keys(monthCounts).sort();
    _dlCharts.time = new Chart(timeCanvas, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{ label:'Activities', data: months.map(m=>monthCounts[m]),
          borderColor: '#1d4e89', backgroundColor: 'rgba(29,78,137,.1)',
          fill: true, tension: 0.3, pointRadius: 4 }]
      },
      options: lineOpts('Activities per month'),
    });
  }

  // By area
  const areaCounts = {};
  _dlData.forEach(r => { if (r.area) areaCounts[r.area] = (areaCounts[r.area]||0)+1; });
  const areaCanvas = document.getElementById('dl-chart-area');
  if (areaCanvas) {
    const labels = Object.keys(areaCounts).sort((a,b)=>areaCounts[b]-areaCounts[a]).slice(0,12);
    _dlCharts.area = new Chart(areaCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label:'Activities', data: labels.map(l=>areaCounts[l]),
          backgroundColor: '#0f766e', borderRadius: 4 }]
      },
      options: { ...barOpts('Activities'), indexAxis:'y' },
    });
  }

  // By Digital Lead
  const leadCounts = {};
  _dlData.forEach(r => { if (r.name) leadCounts[r.name] = (leadCounts[r.name]||0)+1; });
  const leadCanvas = document.getElementById('dl-chart-leads');
  if (leadCanvas) {
    const labels = Object.keys(leadCounts).sort((a,b)=>leadCounts[b]-leadCounts[a]).slice(0,10);
    _dlCharts.leads = new Chart(leadCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label:'Activities', data: labels.map(l=>leadCounts[l]),
          backgroundColor: labels.map((_,i)=>COLOURS[i%COLOURS.length]), borderRadius:4 }]
      },
      options: { ...barOpts('Activities'), indexAxis:'y' },
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
