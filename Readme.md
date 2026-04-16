# DPC Evidence Hub
### Digital Pedagogy Coach · Weston College Group

A suite of professional tools built for Graeme Wright, Digital Pedagogy Coach, Quality & Innovation Team, Weston College Group.

**Live:** [gwc25.github.io/Digital-Evidence-Hub](https://gwc25.github.io/Digital-Evidence-Hub)

---

## Tools

| File | Purpose |
|---|---|
| `index.html` | Landing page — links to all tools |
| `evidence-hub.html` | Main Evidence Hub — the primary daily tool |
| `Digital_Leads_Training_Plan_2025-27.html` | Digital Leads CPD pathway (3-phase) |
| `digital-skills-framework.html` | 34-area digital skills framework |
| `dl-dashboard.html` | Digital Leads Activity Dashboard (standalone) |

---

## Evidence Hub — what it does

The hub is the front door for everything. All activity flows into it and out of it as evidence.

**Capture everything:**
- Quick Capture — any activity type (coaching, meetings, Teach-Meets, learning walks, health checks, external events, own CPD)
- LRA — full 5-section form mirroring the Weston Hyper College Platform, with "Copy for Hyper" clipboard export
- Dev Obs — timestamped observation rows, Hyper themes per row, Plan and Outcome sections

**Workflow tracking:**
- Referrals & Inbox — log things assigned by Neil Davies, TLAMs, or self-initiated
- Threads — workflow chains from first contact to evidenced outcome, with ink-stamp archive
- Weekly View — open on Monday, close on Friday; overdue tasks float to top

**Evidence management:**
- Evidence Log — filterable by area, type, thread, date range
- Evidence links on every entry — SharePoint URLs, Teams recordings, screenshots
- Three-tier tag taxonomy: macro themes → sub-tags, Ofsted EIF, ETF DTPF, KPIs, Accountabilities, Hyper platform themes, custom

**Area and people tracking:**
- HoA Tracker — all 34 areas pre-loaded, RAG ratings, snapshot/restore history, clickable filter badges
- Curriculum Areas — digital skills and tools per area, rating fields, evidence per area
- Staff Development — individual records

**Professional development:**
- Own CPD — log courses, reading, webinars with evidence links
- External Networking — BETT, Digifest, Jisc events, college visits

**Reporting:**
- Report Builder — filter evidence, generate draft via Anthropic API (your key, never stored)
- Export to Word (.docx) and CSV
- Digital Leads tab — load Excel file directly in browser, 6 Chart.js charts

---

## File structure

```
Digital-Evidence-Hub/
├── index.html                    ← landing page
├── evidence-hub.html             ← main hub shell
├── README.md
│
├── css/
│   └── hub.css                   ← all styles, WCAG 2.2 AA verified
│
└── js/
    ├── db.js                     ← data schema, load/save JSON
    ├── nav.js                    ← navigation, modal, toast, utilities
    ├── tags.js                   ← three-tier tag taxonomy
    ├── threads.js                ← threads, referrals, weekly view, tasks
    ├── activities.js             ← quick capture, evidence log, CPD, dashboard
    ├── lra.js                    ← LRA form (Hyper-aligned)
    ├── devobs.js                 ← Dev Obs form (Hyper-aligned)
    ├── hoa-tracker.js            ← HoA tracker, RAG overview, history
    ├── areas.js                  ← curriculum areas, export
    ├── staff-dev.js              ← staff development records
    ├── report-builder.js         ← report builder, AI generation
    ├── dl-embed.js               ← Digital Leads dashboard embed
    └── export.js                 ← Word/PDF export
```

---

## Data

All data is stored in a single JSON file (`dpc-evidence-store.json`) that you control. Nothing is sent anywhere except:
- When you use the Report Builder AI generation, selected entries are sent to `api.anthropic.com` using your own API key, which is never stored.

**Workflow:**
1. Open `evidence-hub.html`
2. Click **Load** → select your `dpc-evidence-store.json`
3. Work normally
4. Click **Save** at end of session → re-download the updated file

The green dot in the header confirms a file is linked.

---

## WCAG 2.2 AA compliance

All colour pairs verified programmatically before any CSS was written. Standards met:
- Contrast: all text/background combinations ≥ 4.5:1 (AA), most exceed 7:1 (AAA)
- Focus indicators: visible, ≥ 3:1 contrast against adjacent colours (WCAG 2.2 §2.4.11)
- Keyboard navigation: all interactive elements reachable and operable by keyboard
- Screen reader: ARIA landmarks, live regions, skip link, logical heading hierarchy
- Touch targets: minimum 44×44px
- Reduced motion: `prefers-reduced-motion` respected throughout

---

## Frameworks

| Framework | Use |
|---|---|
| ETF Digital Teaching Professional Framework (DTPF) | Staff CPD tagging, LRA/Dev Obs themes |
| DigCompEdu | Competence mapping |
| Jisc Building Digital Capability (BDC) | Discovery Tool sequencing, institutional strategy |
| DigComp 3.0 | Learner digital skills |
| Ofsted EIF | Report tagging: Quality of Education, Inclusion, Learner Experience, L&M |
| WCAG 2.2 | Accessibility standard for all tools and resources |
| Century EDS | Learner digital skills tracking |

---

## Pilot governance

| Date | Review |
|---|---|
| October 2026 | 3-Month Review — baseline, coaching initiated, Jisc deployed |
| April 2027 | 9-Month Review — progress across all 8 KPI areas |
| July 2027 | 18-Month Review — comprehensive evidence portfolio |

---

## Notes for future development (Summer 2026)

- Merge with Digital Impact Hub (Gantt timeline, Kanban planner view)
- Update Hyper platform themes when September changes are confirmed (editable in Settings → Tags → Hyper Themes)
- Power Automate integration for automated SharePoint logging
- Teams environment audit data integration

---

*Built by Graeme Wright with Claude (Anthropic). Not a pilot — a programme.*
