/* ================================================================
   DPC EVIDENCE HUB — export.js
   Word (.docx) export via docx library CDN and plain text.
   Called from Report Builder and individual entry views.
   ================================================================ */

'use strict';

function loadDocxLibrary(cb) {
  if (window.docx) { cb(); return; }
  const s   = document.createElement('script');
  s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/docx/7.8.2/docx.umd.min.js';
  s.onload  = cb;
  s.onerror = () => toast('Could not load docx library', 'error');
  document.head.appendChild(s);
}

/* ── ENTRY EXPORT (single or set) ────────────────────────────── */

function exportEntriesToDocx(entries, filename) {
  loadDocxLibrary(() => {
    try {
      const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType,
              Packer, Table, TableRow, TableCell, WidthType, BorderStyle } = window.docx;

      const children = [];

      // Cover page
      children.push(
        new Paragraph({ text:'DPC Evidence Hub — Evidence Export', heading: HeadingLevel.TITLE }),
        new Paragraph({ text:'Weston College Group · Digital Pedagogy Coach', spacing:{ after:400 } }),
        new Paragraph({ text:'Graeme Wright', spacing:{ after:200 } }),
        new Paragraph({ text:'Generated: ' + new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}), spacing:{ after:200 } }),
        new Paragraph({ text:`Entries: ${entries.length}`, spacing:{ after:800 } }),
      );

      entries.forEach(e => {
        // Entry heading
        children.push(new Paragraph({
          text: e.title || 'Untitled',
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: entries.indexOf(e) > 0,
        }));

        // Meta row
        children.push(new Paragraph({
          children: [
            new TextRun({ text:`Date: ${e.date || '—'}`, bold:true }),
            new TextRun('  |  '),
            new TextRun({ text: e.subtype || e.type || 'Entry' }),
            e.area ? new TextRun('  |  Area: ' + e.area) : new TextRun(''),
            e.requestedBy ? new TextRun('  |  Requested by: ' + e.requestedBy) : new TextRun(''),
          ],
          spacing: { after:200 },
        }));

        if (e.notes) {
          children.push(new Paragraph({ text:'Notes', heading:HeadingLevel.HEADING_2 }));
          e.notes.split('\n').filter(Boolean).forEach(line => {
            children.push(new Paragraph({ text: line, spacing:{ after:100 } }));
          });
        }

        if (e.strengths) {
          children.push(new Paragraph({ text:'Strengths', heading:HeadingLevel.HEADING_2 }));
          e.strengths.split('\n').filter(Boolean).forEach(line => {
            children.push(new Paragraph({ text: line, spacing:{ after:100 } }));
          });
        }

        if (e.afis) {
          children.push(new Paragraph({ text:'Areas for Improvement', heading:HeadingLevel.HEADING_2 }));
          e.afis.split('\n').filter(Boolean).forEach(line => {
            children.push(new Paragraph({ text: line, spacing:{ after:100 } }));
          });
        }

        if (e.actions) {
          children.push(new Paragraph({ text:'Actions / Next Steps', heading:HeadingLevel.HEADING_2 }));
          e.actions.split('\n').filter(Boolean).forEach(line => {
            children.push(new Paragraph({ text: line, spacing:{ after:100 } }));
          });
        }

        // LRA-specific
        if (e.type === 'lra') {
          if (e.lecturer) children.push(new Paragraph({ children:[
            new TextRun({ text:'Lecturer/Assessor: ', bold:true }),
            new TextRun(e.lecturer),
          ], spacing:{after:100} }));
          if (e.observer) children.push(new Paragraph({ children:[
            new TextRun({ text:'Observer: ', bold:true }),
            new TextRun(e.observer),
          ], spacing:{after:100} }));
          if (e.programme) children.push(new Paragraph({ children:[
            new TextRun({ text:'Programme: ', bold:true }),
            new TextRun(e.programme),
          ], spacing:{after:200} }));
        }

        // Dev Obs specific
        if (e.type === 'devobs' && e.obsRows?.length) {
          children.push(new Paragraph({ text:'Observation Record', heading:HeadingLevel.HEADING_2 }));
          e.obsRows.forEach(row => {
            if (row.evidence || row.reflect) {
              children.push(new Paragraph({
                children:[
                  new TextRun({ text: row.time ? `[${row.time}] ` : '', bold:true }),
                  new TextRun(row.evidence || ''),
                ],
                spacing:{ after:60 },
              }));
              if (row.reflect) children.push(new Paragraph({
                children:[ new TextRun({ text:'Reflection: ', italics:true }), new TextRun(row.reflect) ],
                spacing:{ after:120 },
              }));
            }
          });
        }

        // Tags
        const tagCount = countTags(e.tags);
        if (tagCount > 0) {
          const labels = [];
          (e.tags?.subtags||[]).forEach(id => labels.push(getSubtagLabel(id)));
          (e.tags?.ofsted||[]).forEach(id => { const t=DB.tags.ofsted.find(x=>x.id===id); if(t) labels.push('Ofsted: '+t.label); });
          (e.tags?.dtpf||[]).forEach(id => { const t=DB.tags.dtpf.find(x=>x.id===id); if(t) labels.push('DTPF: '+t.label); });
          if (labels.length) children.push(new Paragraph({
            children:[ new TextRun({ text:'Tags: ', bold:true }), new TextRun(labels.join(' · ')) ],
            spacing:{ before:200, after:100 },
          }));
        }

        children.push(new Paragraph({ text:'', spacing:{ after:400 } }));
      });

      const doc  = new Document({ sections:[{ properties:{}, children }] });
      Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = (filename || 'dpc-evidence-export') + '-' + today() + '.docx';
        a.click();
        URL.revokeObjectURL(url);
        toast('Word document exported', 'success');
      });
    } catch(err) {
      toast('Export error: ' + err.message, 'error');
      console.error(err);
    }
  });
}

/* ── REPORT EXPORT ───────────────────────────────────────────── */

function exportReportDocx() {
  const text   = document.getElementById('report-output')?.textContent;
  const rType  = document.getElementById('report-type')?.value || 'report';
  if (!text || text.startsWith('Select parameters')) {
    toast('Generate a report first', 'error'); return;
  }

  loadDocxLibrary(() => {
    try {
      const { Document, Paragraph, TextRun, HeadingLevel, Packer } = window.docx;
      const children = [];
      const lines    = text.split('\n');

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) { children.push(new Paragraph({ text:'', spacing:{after:100} })); return; }
        // Headings (all-caps lines or ## markers)
        if (/^#{1,3}\s/.test(trimmed)) {
          const level = (trimmed.match(/^#+/)||[''])[0].length;
          const text  = trimmed.replace(/^#+\s*/,'');
          children.push(new Paragraph({ text, heading: level===1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2 }));
        } else if (/^[A-Z][A-Z\s&\-\/]{4,}$/.test(trimmed)) {
          children.push(new Paragraph({ text:trimmed, heading: HeadingLevel.HEADING_2 }));
        } else {
          children.push(new Paragraph({ text:trimmed, spacing:{after:100} }));
        }
      });

      const doc  = new Document({ sections:[{ properties:{}, children }] });
      Packer.toBlob(doc).then(blob => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `dpc-report-${rType}-${today()}.docx`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Report exported as Word document', 'success');
      });
    } catch(err) {
      toast('Export error: ' + err.message, 'error');
    }
  });
}

// Override the placeholder in report-builder.js
function exportEvidenceDocx() {
  const entries = getFilteredReportEntries();
  if (!entries.length) { toast('No entries to export', 'error'); return; }
  exportEntriesToDocx(entries, 'dpc-evidence');
}
