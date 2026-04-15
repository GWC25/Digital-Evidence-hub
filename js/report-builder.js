/* ================================================================
   DPC EVIDENCE HUB — report-builder.js
   Filter evidence → AI-generated report draft via Anthropic API,
   or plain text export.
   ================================================================ */

'use strict';

function initReportBuilder() {
  // Populate thread filter
  const threadSel = document.getElementById('filter-thread');
  if (threadSel) {
    while (threadSel.options.length > 1) threadSel.remove(1);
    DB.threads.forEach(t => threadSel.add(new Option(t.name, t.id)));
  }
  updateReportEntriesCount();
}

function getFilteredReportEntries() {
  const from  = document.getElementById('report-from')?.value  || '';
  const to    = document.getElementById('report-to')?.value    || '';
  const acId  = document.getElementById('report-accountability')?.value || '';
  const kpiId = document.getElementById('report-kpi')?.value   || '';

  return DB.entries.filter(e => {
    if (from && e.date < from) return false;
    if (to   && e.date > to)   return false;
    if (acId  && !(e.tags?.accountability||[]).includes(acId))  return false;
    if (kpiId && !(e.tags?.kpi||[]).includes(kpiId))            return false;
    return true;
  }).sort((a,b) => a.date > b.date ? 1 : -1);
}

function updateReportEntriesCount() {
  const el = document.getElementById('report-entries-count');
  if (!el) return;
  const n = getFilteredReportEntries().length;
  el.textContent = `${n} entr${n===1?'y':'ies'} match these filters.`;
}

// Wire up date and filter changes
['report-from','report-to','report-accountability','report-kpi'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', updateReportEntriesCount);
});

function previewReportEntries() {
  const entries = getFilteredReportEntries();
  const output  = document.getElementById('report-output');
  if (!output) return;
  if (!entries.length) {
    output.textContent = 'No entries match the current filters.';
    return;
  }
  output.textContent = `${entries.length} entries matched:\n\n` +
    entries.map(e =>
      `${e.date} | ${e.subtype||e.type} | ${e.area||'—'} | ${e.title}` +
      (e.strengths ? `\n  Str: ${e.strengths.substring(0,80)}` : '') +
      (e.afis      ? `\n  AFI: ${e.afis.substring(0,80)}`      : '')
    ).join('\n\n');
}

async function generateReport() {
  const apiKey = document.getElementById('report-api-key')?.value?.trim();
  if (!apiKey) { toast('API key required for AI generation', 'error'); return; }

  const entries  = getFilteredReportEntries();
  const output   = document.getElementById('report-output');
  const rType    = document.getElementById('report-type')?.value || 'custom';

  if (!entries.length) { toast('No entries match these filters', 'error'); return; }

  output.textContent = '⏳ Generating report…';

  const reportLabels = {
    '3month':     '3-Month Pilot Review (October 2026)',
    '9month':     '9-Month Pilot Review (April 2027)',
    '18month':    '18-Month Pilot Review (July 2027)',
    'line-manager':'Line Manager Update',
    'kpi-summary':'KPI Summary',
    'cqrp':       'CQRP Contribution',
    'sar':        'SAR Input',
    'custom':     'Evidence Summary',
  };

  const evidenceBlock = entries.slice(0, 40).map(e =>
    `DATE: ${e.date}
TYPE: ${e.subtype||e.type}
AREA: ${e.area||'—'}
TITLE: ${e.title}
${e.notes      ? 'NOTES: '+e.notes.substring(0,300)   : ''}
${e.strengths  ? 'STRENGTHS: '+e.strengths.substring(0,200)  : ''}
${e.afis       ? 'AFIs: '+e.afis.substring(0,200)     : ''}
${e.actions    ? 'ACTIONS: '+e.actions.substring(0,200) : ''}
${e.requestedBy? 'REQUESTED BY: '+e.requestedBy       : ''}`.trim()
  ).join('\n\n---\n\n');

  const systemPrompt = `You are a professional education quality and digital pedagogy specialist helping a Digital Pedagogy Coach at Weston College Group in North Somerset write formal evidence reports. 

The role covers all 34 curriculum areas and reports into the Quality & Innovation Team. The strategic framework references: the Digital Learning Pyramid (Digital Foundations → Digital Inclusion → Digital Innovation), ETF Digital Teaching Professional Framework (DTPF), DigCompEdu, Jisc Building Digital Capability (BDC), and the Ofsted Education Inspection Framework (EIF). The Ofsted Inclusion standalone grade (November 2025) is relevant.

Write in a formal, evidence-based tone appropriate for senior leadership and Ofsted. Use specific examples from the evidence provided. Avoid hyperbole. Structure clearly with headers. Flag any gaps in evidence honestly.`;

  const userPrompt = `Generate a ${reportLabels[rType]} report for Graeme Wright, Digital Pedagogy Coach at Weston College.

EVIDENCE ENTRIES (${entries.length} total, showing up to 40):
${evidenceBlock}

THREAD SUMMARIES (closed threads with impact):
${DB.threads.filter(t=>t.status==='closed'&&t.impactSummary).slice(0,8).map(t=>
  `Thread: ${t.name}\nImpact: ${t.impactSummary}`
).join('\n\n')}

HOA TRACKER SUMMARY:
Areas met: ${DB.hoaTracker.filter(a=>a.metM1==='Y').length}/${DB.hoaTracker.length}
Digital Leads identified: ${DB.hoaTracker.filter(a=>a.digitalLead?.trim()).length}
Priority areas (RAG 4-5): ${DB.hoaTracker.filter(a=>a.rag>=4).map(a=>a.code).join(', ')||'None'}

Please write a structured ${reportLabels[rType]} report that:
1. Summarises key achievements and evidence of impact
2. Maps evidence to the Digital Learning Pyramid and formal frameworks (DTPF, DigComp, Ofsted EIF)
3. Highlights breadth across curriculum areas
4. Identifies patterns, strengths, and areas for development
5. References specific examples by date, area, and activity type
6. Closes with recommendations and next steps

Use professional report language. Be specific. Do not invent evidence not present in the entries above.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1800,
        system: systemPrompt,
        messages: [{ role:'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      output.textContent = `API error ${response.status}: ${err.error?.message || 'Unknown error'}`;
      return;
    }

    const data  = await response.json();
    const text  = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
    output.textContent = text || 'No content returned.';
    toast('Report generated', 'success');
  } catch(err) {
    output.textContent = `Error: ${err.message}`;
    toast('Generation failed', 'error');
  }
}

function copyReport() {
  const text = document.getElementById('report-output')?.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => toast('Report copied', 'success'))
    .catch(() => toast('Copy failed', 'error'));
}

function downloadReportTxt() {
  const text  = document.getElementById('report-output')?.textContent;
  if (!text)  return;
  const rType = document.getElementById('report-type')?.value || 'report';
  const blob  = new Blob([text], { type:'text/plain' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href = url; a.download = `dpc-${rType}-${today()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Downloaded', 'success');
}

function exportEvidenceDocx() {
  // Placeholder — full docx export via export.js
  toast('Word export — use the Export button in export.js (coming next)', 'warning');
}
