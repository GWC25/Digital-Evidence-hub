/* ================================================================
   DPC EVIDENCE HUB — db.js
   Single source of truth. All data lives in DB.
   Option A: DB.entries[] unified store for all activity types.
   Threads and referrals link to entries by ID.
   ================================================================ */

'use strict';

const DB = {

  /* ── CORE ACTIVITY LOG ──────────────────────────────────────── */
  // Every activity type writes here. type field distinguishes them.
  // Types: quick-capture | lra | devobs | coaching | meeting |
  //        teach-meet | learning-walk | health-check | resource |
  //        external-cpd | own-cpd | vfm | staff-dev | learner-data
  entries: [],

  /* ── REFERRALS / INBOX ──────────────────────────────────────── */
  // Things assigned to you by others, or self-initiated tasks
  referrals: [],

  /* ── THREADS / WORKFLOW CHAINS ──────────────────────────────── */
  // Groups of linked entries telling one impact story
  threads: [],

  /* ── TASKS / ACTIONABLE LIST ────────────────────────────────── */
  // Generated from referrals and thread actions; shown in weekly view
  tasks: [],

  /* ── SUPPORTING RECORDS ─────────────────────────────────────── */
  areas:        [],   // 34 curriculum areas
  hoaTracker:   [],   // HoA digital tracker records
  staffRecords: [],   // Staff development records
  resources:    [],   // Resources & outputs
  learnerData:  [],   // Century EDS / learner digital data

  /* ── TAG TAXONOMY ───────────────────────────────────────────── */
  // Three-tier: macro themes > sub-tags; plus parallel Ofsted/DTPF layers
  tags: {

    // Layer 1 + 2: Macro themes with sub-tags (branching)
    themes: [
      {
        id: 'th-access',
        label: 'Accessibility & Inclusive Practice',
        cat: 'cat-accessibility',
        icon: '♿',
        subtags: [
          { id: 'st-wcag',      label: 'WCAG 2.2' },
          { id: 'st-at-tools',  label: 'Assistive Technology Tools' },
          { id: 'st-acc-check', label: 'Accessibility Checker' },
          { id: 'st-at-road',   label: 'AT Road Map' },
          { id: 'st-send-dig',  label: 'SEND Digital Inclusion' },
          { id: 'st-dig-incl',  label: 'Digitally Inclusive Practice' },
          { id: 'st-captions',  label: 'Captions / Alt Text' },
          { id: 'st-udl',       label: 'Universal Design for Learning' },
          { id: 'st-ehcp',      label: 'EHCP Digital Targets' },
        ]
      },
      {
        id: 'th-pedagogy',
        label: 'Digital Pedagogy & TLA',
        cat: 'cat-pedagogy',
        icon: '🎓',
        subtags: [
          { id: 'st-teams-env',   label: 'Teams Environment & Digital Spaces' },
          { id: 'st-dig-hc',      label: 'Digital Health Check' },
          { id: 'st-form-assess', label: 'Formative Assessment' },
          { id: 'st-ai-teach',    label: 'AI in Teaching & Learning' },
          { id: 'st-blended',     label: 'Blended Learning' },
          { id: 'st-feedback',    label: 'Feedback Tools' },
          { id: 'st-21cld',       label: '21st Century Learning Design' },
          { id: 'st-gen-tla',     label: 'General TLA' },
          { id: 'st-dig-tla',     label: 'Digital TLA' },
          { id: 'st-dig-res',     label: 'Digital Resources Quality' },
        ]
      },
      {
        id: 'th-skills',
        label: 'Digital Skills Development',
        cat: 'cat-skills',
        icon: '🛠',
        subtags: [
          { id: 'st-staff-cpd',   label: 'Staff CPD Delivered' },
          { id: 'st-jisc-disc',   label: 'Jisc Discovery Tool' },
          { id: 'st-century',     label: 'Century / EDS' },
          { id: 'st-digcomp',     label: 'DigCompEdu Mapping' },
          { id: 'st-dl-cpd',      label: 'Digital Leads CPD' },
          { id: 'st-teach-meet',  label: 'Teach-Meet' },
          { id: 'st-coaching-1',  label: '1:1 Coaching' },
          { id: 'st-lw',          label: 'Learning Walk' },
          { id: 'st-own-cpd',     label: 'Own CPD / Professional Reading' },
        ]
      },
      {
        id: 'th-leadership',
        label: 'Digital Leadership & Networks',
        cat: 'cat-leadership',
        icon: '🌐',
        subtags: [
          { id: 'st-dl-prog',    label: 'Digital Leads Programme' },
          { id: 'st-champions',  label: 'Digital Champions' },
          { id: 'st-ext-net',    label: 'External Networks' },
          { id: 'st-sector-ev',  label: 'Sector Events' },
          { id: 'st-bett',       label: 'BETT / Digifest' },
          { id: 'st-jisc-com',   label: 'Jisc Community' },
          { id: 'st-cross-col',  label: 'Cross-College Initiative' },
          { id: 'st-lead-brief', label: 'Leadership Briefing' },
          { id: 'st-referral-r', label: 'Report Back to Referrer' },
        ]
      },
      {
        id: 'th-learner',
        label: 'Learner Digital Skills',
        cat: 'cat-learner',
        icon: '📊',
        subtags: [
          { id: 'st-cent-diag',  label: 'Century Diagnostic' },
          { id: 'st-spec-map',   label: 'Specialist Skills Mapping' },
          { id: 'st-eds-frame',  label: 'EDS Framework' },
          { id: 'st-gen-dig',    label: 'General Digital Skills' },
          { id: 'st-area-dig',   label: 'Area-Specific Digital Skills' },
          { id: 'st-lwb',        label: 'Learning Without Barriers' },
        ]
      },
      {
        id: 'th-quality',
        label: 'Quality & Evidence',
        cat: 'cat-quality',
        icon: '✅',
        subtags: [
          { id: 'st-qip',       label: 'QIP Action' },
          { id: 'st-cqrp',      label: 'CQRP Contribution' },
          { id: 'st-sar',       label: 'SAR Input' },
          { id: 'st-lw-ev',     label: 'Learning Walk Evidence' },
          { id: 'st-ppr',       label: 'PPR Data' },
          { id: 'st-gov-rev',   label: 'Governance Review' },
          { id: 'st-hoa-map',   label: 'HoA Mapping' },
          { id: 'st-pilot-ev',  label: 'Pilot Review Evidence' },
        ]
      }
    ],

    // Layer 3a: Ofsted EIF frame (parallel layer)
    ofsted: [
      { id: 'of-qe',  label: 'Quality of Education',     desc: 'Intent, implementation, impact of curriculum and teaching' },
      { id: 'of-inc', label: 'Inclusion',                 desc: 'SEND, accessibility, equality — standalone grade Nov 2025' },
      { id: 'of-le',  label: 'Learner Experience',        desc: 'Behaviour, attitudes, personal development, progress' },
      { id: 'of-lm',  label: 'Leadership & Management',   desc: 'Strategic leadership, professional development, governance' },
    ],

    // Layer 3b: DTPF domains (with descriptions)
    dtpf: [
      { id: 'dtpf-ld',  label: 'Learning Design',              desc: 'Designing digital learning activities, resources and environments' },
      { id: 'dtpf-cc',  label: 'Content Creation',             desc: 'Creating and curating digital content for learning' },
      { id: 'dtpf-com', label: 'Communication & Collaboration', desc: 'Using digital tools to communicate and collaborate with learners' },
      { id: 'dtpf-ls',  label: 'Learner Support',              desc: 'Using digital tools to support learner progress and wellbeing' },
      { id: 'dtpf-af',  label: 'Assessment & Feedback',        desc: 'Using digital tools for assessment, feedback and data' },
      { id: 'dtpf-dc',  label: 'Digital Competence',           desc: 'Developing own and learners\' digital competence' },
    ],

    // KPI areas (formal pilot framework)
    kpi: [
      { id: 'kpi1', label: 'Teaching Quality Indicators' },
      { id: 'kpi2', label: 'QIP Traction' },
      { id: 'kpi3', label: 'Staff Capability' },
      { id: 'kpi4', label: 'Staff Confidence' },
      { id: 'kpi5', label: 'Student Experience' },
      { id: 'kpi6', label: 'Retention Proxy' },
      { id: 'kpi7', label: 'Value for Money' },
      { id: 'kpi8', label: 'Digital Champions' },
    ],

    // 10 formal accountabilities
    accountability: [
      { id: 'ac1',  label: '1 · Map Digital Skills to Framework' },
      { id: 'ac2',  label: '2 · Teams Environment Audit' },
      { id: 'ac3',  label: '3 · Digital Leads & Champions' },
      { id: 'ac4',  label: '4 · Accessibility by Design Workshops' },
      { id: 'ac5',  label: '5 · Accessibility Videos (SharePoint)' },
      { id: 'ac6',  label: '6 · AT Road Map with IT & SEND' },
      { id: 'ac7',  label: '7 · AT Videos & Resources' },
      { id: 'ac8',  label: '8 · AI Coaching & Training' },
      { id: 'ac9',  label: '9 · Digital Skills Training (Jisc/ETF/Century)' },
      { id: 'ac10', label: '10 · External Networks & Sector Events' },
    ],

    // Hyper platform themes (editable — will change Sept 2026)
    hyperThemes: [
      {
        id: 'ht-ap', label: 'Academic Progress',
        items: [
          { id: 'ht-ap-1', label: 'Unknown Theme' },
          { id: 'ht-ap-2', label: 'Ambition / challenge / deeper learning' },
          { id: 'ht-ap-3', label: 'Action on feedback' },
          { id: 'ht-ap-4', label: 'Incisive feedback' },
          { id: 'ht-ap-5', label: 'Ambitious targets' },
          { id: 'ht-ap-6', label: 'Impactful Assessment' },
          { id: 'ht-ap-7', label: 'Consolidation of learning / checks on learning' },
          { id: 'ht-ap-8', label: 'Progress' },
          { id: 'ht-ap-9', label: 'Planning for wider learning' },
        ]
      },
      {
        id: 'ht-it', label: 'Inclusive TLA and SEND',
        items: [
          { id: 'ht-it-1', label: 'Personalised learning' },
          { id: 'ht-it-2', label: 'Trauma informed communication' },
          { id: 'ht-it-3', label: 'Inclusive activities' },
          { id: 'ht-it-4', label: 'Inclusive assessment' },
          { id: 'ht-it-5', label: 'Implementation of EHCP targets' },
          { id: 'ht-it-6', label: 'Accessibility of resources (inc. Digital)' },
          { id: 'ht-it-7', label: 'Inclusive learning environment' },
        ]
      },
      {
        id: 'ht-dd', label: 'Development of Digital and Technological Skills',
        items: [
          { id: 'ht-dd-1', label: 'Technology to enhance learning' },
          { id: 'ht-dd-2', label: 'Teachers knowledge (digital & technological)' },
          { id: 'ht-dd-3', label: 'Digital access to resources' },
          { id: 'ht-dd-4', label: 'Digital resources (quality & accessibility)' },
          { id: 'ht-dd-5', label: 'Effective planning and delivery of digital content' },
        ]
      },
      {
        id: 'ht-pl', label: 'Planning for Learning',
        items: [
          { id: 'ht-pl-1', label: 'Learning intentions' },
          { id: 'ht-pl-2', label: 'Building blocks within session' },
          { id: 'ht-pl-3', label: 'Starting points' },
          { id: 'ht-pl-4', label: 'Lasting learning' },
          { id: 'ht-pl-5', label: 'Impactful Activities' },
          { id: 'ht-pl-6', label: 'Sequencing over time' },
          { id: 'ht-pl-7', label: 'Effective use of support worker' },
        ]
      },
      {
        id: 'ht-me', label: 'Development of Maths and English Skills',
        items: [
          { id: 'ht-me-1', label: 'English — speaking and listening skills' },
          { id: 'ht-me-2', label: 'English — writing skills' },
          { id: 'ht-me-3', label: 'English — reading skills' },
          { id: 'ht-me-4', label: 'Maths — number and data' },
          { id: 'ht-me-5', label: 'Maths — estimation and calculations' },
          { id: 'ht-me-6', label: 'Maths — measurements' },
          { id: 'ht-me-7', label: 'Maths — finance and currency' },
        ]
      },
      {
        id: 'ht-pd', label: 'Personal Development',
        items: [
          { id: 'ht-pd-1', label: 'PD Skills' },
          { id: 'ht-pd-2', label: 'PD Safeguarding & Prevent' },
          { id: 'ht-pd-3', label: 'PD topical points' },
          { id: 'ht-pd-4', label: 'PD Engagement' },
          { id: 'ht-pd-5', label: 'PD Progression' },
          { id: 'ht-pd-6', label: 'PD Self Management (wellbeing)' },
          { id: 'ht-pd-7', label: 'Work experience / Industry placement links' },
          { id: 'ht-pd-8', label: 'Learner independence' },
        ]
      },
      {
        id: 'ht-bl', label: 'Behaviours for Learning',
        items: [
          { id: 'ht-bl-1', label: 'Behaviour for learning (personalised)' },
          { id: 'ht-bl-2', label: 'Readiness to learn' },
        ]
      },
    ],

    // User-created custom tags (free form)
    custom: [],
  },

  /* ── REFERRAL TYPES ─────────────────────────────────────────── */
  // Used when logging what was requested / assigned
  referralActionTypes: [
    'Developmental Observation',
    'LRA — Learning Walk',
    'LRA — Learning Talk',
    'LRA — Work Review',
    '1:1 Coaching',
    'Team coaching / workshop',
    'Digital Health Check',
    'Follow-up coaching',
    'Resource to create',
    'Report back to referrer',
    'Learning Walk follow-up',
    'Meeting to arrange',
    'CPD to assign / recommend',
    'Teach-Meet to organise',
    'Other',
  ],

  /* ── REQUESTED BY — hybrid list ─────────────────────────────── */
  // Pre-populated, user can add more in Settings
  requestedByOptions: [
    'Neil Davies (AP Quality)',
    'Ben Manning (VP Quality)',
    'Emily Green (TLAM)',
    'Marisha West (TLA Coach)',
    'Megan Brookes (TLAM)',
    'Steve Brawley (TLAM)',
    'Liz Burkley (SEND/AT)',
    'Lois Knight (SEND/AT)',
    'Libby Heath-Tavener (E&M Lead)',
    'Self-initiated',
  ],
  // Free text overrides added by user live in requestedByCustom
  requestedByCustom: [],

  /* ── RATING FIELDS ──────────────────────────────────────────── */
  ratingFields: [
    { id: 'rf1', name: 'Digital Skills',          enabled: true },
    { id: 'rf2', name: 'Digital Learning Pyramid', enabled: true },
    { id: 'rf3', name: 'EDS Categories',           enabled: true },
    { id: 'rf4', name: 'Teams Environment',        enabled: true },
  ],

  /* ── METADATA ───────────────────────────────────────────────── */
  meta: {
    version: '4.0',
    created: null,
    lastSaved: null,
    academicYear: '2025/26',
  },
};

/* ── DEFAULT HOA TRACKER DATA ────────────────────────────────── */
// Imported from previous Evidence Hub v3 — all 34 areas
const DEFAULT_HOA_TRACKER = [
  { code:'AGF', dept:'Arts, Graphics & Fashion', hoaName:'Chrissandra Boxley', campus:'Loxton', metM1:'Y', formM1:'Y', rag:3, digitalLead:'Ronnie Houselander-Cook', futureDigitalLead:'', meeting1Summary:'Really positive meeting with clear understanding of role and future involvement.', strengths:'Good digital foundation. Ronnie Houselander-Cook is a strong digital lead.', afis:'Staff CPD needed in Digital TLA — all six CPD areas rated High.', priorityActions:'Book Digital Learning Walk with Chrissandra. Team CPD on Teams environments.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'Book Digital Learning Walk with Chrissandra.', snapshots:[] },
  { code:'AHE', dept:'Access to HE', hoaName:'', campus:'???', metM1:'N', formM1:'N', rag:null, digitalLead:'Stephanie Lee', futureDigitalLead:'', meeting1Summary:'No meeting held.', strengths:'', afis:'Meeting not yet arranged.', priorityActions:'Arrange meeting. Identify HoA contact.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'ANM', dept:'Animal Management', hoaName:'Laura Link', campus:'Puxton Park', metM1:'Y', formM1:'N', rag:null, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Really engaged and positive about the potential of digital learning.', strengths:'Genuine enthusiasm for digital learning.', afis:'No form submitted. No Digital Lead identified.', priorityActions:'Follow up with form. Identify Digital Lead.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'BUI', dept:'Building Services (Construction)', hoaName:'Richard Hanney', campus:'SWSC', metM1:'Y', formM1:'N', rag:3, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Idea for clocking in/out resource. Wants to teach MS Fundamentals.', strengths:'Clear industry-relevant digital skills vision.', afis:'No survey form. No Digital Lead identified.', priorityActions:'Support Richard with clocking-in resource. Identify Digital Lead.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'BUS', dept:'Business & Tourism', hoaName:'Ben Melhuish', campus:'???', metM1:'N', formM1:'N', rag:null, digitalLead:'', futureDigitalLead:'', meeting1Summary:'No direct HoA meeting.', strengths:'', afis:'BUS HoA did not attend meeting.', priorityActions:'Rearrange meeting with BUS HoA.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'CED', dept:'Community Education', hoaName:'Charlotte Hynes', campus:'Multi', metM1:'N', formM1:'N', rag:null, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Charlotte declined initial meeting.', strengths:'', afis:'No meeting. No form. No engagement yet.', priorityActions:'Use Becky Morris as bridge.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'CON', dept:'Construction Trades', hoaName:'Richard Hanney', campus:'SWSC', metM1:'Y', formM1:'Y', rag:3, digitalLead:'Victoria Howell', futureDigitalLead:'', meeting1Summary:'', strengths:'', afis:'', priorityActions:'', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'CTC', dept:'Construction Training Centre', hoaName:'John Fowler', campus:'CTC', metM1:'Y', formM1:'Y', rag:3, digitalLead:'John Fowler, Dave Evans', futureDigitalLead:'', meeting1Summary:'Site visit arranged. Really positive and engaged.', strengths:'Strong existing digital practice — Teams, Forms, rubrics, assignments.', afis:'Staff CPD in data/evidence use and subject-specific software rated High.', priorityActions:'Observe and document good practice. Support John on assignment-based learning.', teachMeets:'', coaching1to1:'Explored Teams Learning Environments with John Fowler.', asyncTraining:'', nextAction:'Touch base later in May half term.', snapshots:[] },
  { code:'DCI', dept:'Digital Computing & IT', hoaName:'Sean Shearing', campus:'UCW & Knightstone', metM1:'Y', formM1:'N', rag:1, digitalLead:'Ben Hobbs', futureDigitalLead:'', meeting1Summary:'Sean understands the angle. Invited Graeme in to explore practice.', strengths:'Confident, strong digital foundations. Highest-performing area digitally.', afis:'No Digital Lead formally identified.', priorityActions:'Identify a Digital Lead from Sean\'s team. Arrange observation visit.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'Go and see them in practice.', snapshots:[] },
  { code:'EEY', dept:'Education & Early Years', hoaName:'Rachael Moger', campus:'Knightstone', metM1:'N', formM1:'Y', rag:3, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Support needed for digital TLA around Assessment & Data.', strengths:'Survey completed — good engagement through form.', afis:'HoA did not attend meeting.', priorityActions:'Arrange direct meeting with Rachael Moger.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'EFE', dept:'Engineering WBL FE', hoaName:'', campus:'SWSC', metM1:'N', formM1:'N', rag:null, digitalLead:'', futureDigitalLead:'', meeting1Summary:'No meeting held.', strengths:'', afis:'No meeting. No form.', priorityActions:'Identify EFE HoA. Arrange meeting.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'EGL', dept:'English', hoaName:'Libby Heath-Tavener', campus:'Multi', metM1:'Y', formM1:'N', rag:3, digitalLead:'Georgina Berritta', futureDigitalLead:'Joel Baylis, Denholm Wilcox, Diego Fanhe', meeting1Summary:'Meeting with Libby Heath-Tavener and Jason Clear. Century first college approach needed.', strengths:'Clear understanding of Century\'s potential for funded digital hours.', afis:'No form submitted. No formal Digital Lead.', priorityActions:'1:1 with Libby before May half-term re Century.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'Arrange training for Libby with Sam at Century.', snapshots:[] },
  { code:'EHE', dept:'Engineering Higher Education', hoaName:'', campus:'SWSC', metM1:'N', formM1:'N', rag:null, digitalLead:'', futureDigitalLead:'', meeting1Summary:'No meeting held.', strengths:'', afis:'No meeting. No form.', priorityActions:'Identify EHE HoA. Arrange meeting.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'EMV', dept:'Engineering & Motor Vehicle', hoaName:'Andreas ???', campus:'SWSC', metM1:'Y', formM1:'N', rag:2, digitalLead:'Felix Coles', futureDigitalLead:'', meeting1Summary:'Briefly met re other TLA strategies. Felix is Deputy to Andreas.', strengths:'Advanced Forms use discussed — auto marking, Copilot in Excel.', afis:'Felix is Deputy — Andreas Panos is current HoA. No form.', priorityActions:'Arrange meeting with Andreas and Felix. Book Forms/Copilot coaching.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'Reach out for Teach Meet on Teams Learning Environment.', snapshots:[] },
  { code:'ENG', dept:'Engineering (General)', hoaName:'Thanos Adamos', campus:'SWSC', metM1:'Y', formM1:'N', rag:2, digitalLead:'Thanos Adamos', futureDigitalLead:'', meeting1Summary:'Very engaged. Wants more engaging and fun learning.', strengths:'Thanos is self-aware about digital limitations and motivated to improve.', afis:'Teams environment needs assessing. No form submitted.', priorityActions:'Assess Thanos\'s Teams environment. Book session on dynamic PowerPoint.', teachMeets:'', coaching1to1:'Owen Readon - Digital Accessibility, Teams, and Assessment', asyncTraining:'', nextAction:'Arrange 1:1 with Thanos on Teams Digital Learning Environment.', snapshots:[] },
  { code:'ESO', dept:'ESOL', hoaName:'Alexia Sporidis', campus:'Multi', metM1:'Y', formM1:'N', rag:4, digitalLead:'John ???', futureDigitalLead:'', meeting1Summary:'Major IT infrastructure concerns raised. SpringPod Virtual Work Experience discussed.', strengths:'Alexia is very positive and forward-thinking.', afis:'Team needs a lot of support. IT infrastructure is a major barrier.', priorityActions:'Alexia to book team session. Refresher on Teams and Accessibility.', teachMeets:'Booking for Team post Easter — Refresher on Teams & Accessibility', coaching1to1:'', asyncTraining:'', nextAction:'Follow up with Alexia the Teach-Meet on accessibility.', snapshots:[] },
  { code:'EXT', dept:'External Contracts', hoaName:'', campus:'Multi', metM1:'N', formM1:'N', rag:null, digitalLead:'', futureDigitalLead:'', meeting1Summary:'No meeting held.', strengths:'', afis:'No meeting. No form.', priorityActions:'Identify EXT lead.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'FAU', dept:'FIP Autism', hoaName:'Andy Girling / Jess Gill', campus:'???', metM1:'Y', formM1:'N', rag:2, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Meeting with Andy Girling, Jess Gill, Liz Burkey, Joe Radcliffe.', strengths:'Strong AT awareness. Jess Gill keen on staff development.', afis:'Staff need to develop mastery of AT tools. No form. No formal Digital Lead.', priorityActions:'Meet Liz Burkey post-Easter re adaptive/intelligent TLA for SEND.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'FCO', dept:'FIP Complex Needs', hoaName:'', campus:'???', metM1:'N', formM1:'N', rag:null, digitalLead:'', futureDigitalLead:'', meeting1Summary:'No separate meeting.', strengths:'', afis:'No direct HoA meeting.', priorityActions:'Include FCO in FIP AT strategy.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'FEH', dept:'FIP Supported Employment Excellence', hoaName:'Jess Gill', campus:'???', metM1:'Y', formM1:'Y', rag:2, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Form submitted. Support needed for digital TLA around Assessment & Data.', strengths:'Jess Gill engaged via FIP meeting.', afis:'Assessment and data digital skills are the priority gap.', priorityActions:'Follow up with Jess on FEH specific needs.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'FPL', dept:'FIP Pre-Vocational', hoaName:'', campus:'???', metM1:'N', formM1:'N', rag:null, digitalLead:'Becky Salter???', futureDigitalLead:'', meeting1Summary:'No separate meeting.', strengths:'', afis:'No meeting.', priorityActions:'Include FPL in FIP digital strategy.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'Go and see them in practice.', snapshots:[] },
  { code:'GMA', dept:'Games, Media & Animation', hoaName:'Gina Hele', campus:'Loxton', metM1:'Y', formM1:'N', rag:1, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Gina confident digital foundations are strong.', strengths:'Strong digital TLA already embedded. Gina is open to peer learning.', afis:'No form submitted. No formal Digital Lead.', priorityActions:'Arrange observation visit. Document and share GMA good practice.', teachMeets:'Exploring the ethical use of AI in the learning experience.', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'HAC', dept:'Health (inc. Health T-Level)', hoaName:'Dale Bond', campus:'HALSC', metM1:'Y', formM1:'Y', rag:4, digitalLead:'Dale Bond', futureDigitalLead:'', meeting1Summary:'Training already planned. Dale Bond identified as Digital Lead.', strengths:'Dale Bond is engaged and has a clear understanding of how Graeme can support.', afis:'Team very inexperienced in TLA and digital assessment. All CPD areas rated High.', priorityActions:'Deliver planned training. Focus on effective Teams assessment.', teachMeets:'Completed: Teams Learning Foundations', coaching1to1:'Teams Learning Environment with Amy Walker', asyncTraining:'', nextAction:'Reach out to plan next phase of Digital support.', snapshots:[] },
  { code:'HBH', dept:'Hair, Beauty & Hospitality', hoaName:'Jenna Ratcliffe', campus:'Knightstone', metM1:'Y', formM1:'Y', rag:1, digitalLead:'Nicola Smith & Jasmine Nickells', futureDigitalLead:'', meeting1Summary:'Digital Hours not needed as a formal requirement. Digital skills embedded in portfolios.', strengths:'Strong embedded digital skills practice. Two Digital Leads identified.', afis:'Digital hours not formally tracked.', priorityActions:'Support Nicola and Jasmine as Digital Leads.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'Reach out to discuss supporting observations and learning walks.', snapshots:[] },
  { code:'MAT', dept:'Maths', hoaName:'Jason Clear', campus:'Multi', metM1:'Y', formM1:'N', rag:3, digitalLead:'Jed Randall', futureDigitalLead:'Joel Baylis, Denholm Wilcox, Diego Fanhe', meeting1Summary:'Meeting with Libby Heath-Tavener and Jason Clear. GoTeach Maths discussed.', strengths:'Potential Champions identified. GoTeach Maths in active use.', afis:'No form submitted. 100 digital hours requirement needs Century.', priorityActions:'1:1 with Libby re Century before May half-term.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'PAP', dept:'Performance & Production', hoaName:'Chrissandra Boxley', campus:'Loxton', metM1:'Y', formM1:'Y', rag:4, digitalLead:'Ronnie Houselander-Cook', futureDigitalLead:'', meeting1Summary:'See AGF — same HoA. Ronnie is Digital Lead for both areas.', strengths:'See AGF notes. Digital self-tape skills are a baseline employability requirement.', afis:'See AGF. Digital practice not yet formally mapped to EDS.', priorityActions:'See AGF actions.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'PRA', dept:'Professional Apprenticeships', hoaName:'Georgina Hayden', campus:'Multi', metM1:'Y', formM1:'N', rag:3, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Georgina will work with wider team to explore digital skills development.', strengths:'Georgina is engaged and willing to involve her team.', afis:'No form. No Digital Lead. EPA digital evidence requirements not yet mapped.', priorityActions:'Follow up with Georgina. Map Smart Assessor EPA evidence to EDS.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'PRE', dept:'Employment Services (Pre-employment)', hoaName:'Laura Taylor', campus:'SWSC', metM1:'Y', formM1:'N', rag:3, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Laura was very positive. Invited Graeme to meet the team.', strengths:'Laura is positive and proactive. TurnItIn training already delivered as a Teach Meet.', afis:'No form. No Digital Lead. SWSC Teams Teaching Room needs attention.', priorityActions:'Book team visit at SWSC. Assess SWSC Teams Teaching Room.', teachMeets:'Embedding Turnitin within Teams to support integrity of learner submissions.', coaching1to1:'Liam Benson - Enhance formative assessment opportunities.', asyncTraining:'', nextAction:'Reach out for Teach-Meet on Teams Learning Environments.', snapshots:[] },
  { code:'PRS', dept:'Professional Studies', hoaName:'Louise Perkins???', campus:'???', metM1:'N', formM1:'N', rag:null, digitalLead:'', futureDigitalLead:'', meeting1Summary:'No meeting held.', strengths:'', afis:'No meeting. No form.', priorityActions:'Identify PRS HoA. Arrange meeting.', teachMeets:'', coaching1to1:'Coaching with Lauren Bester following TLAM request.', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'PSF', dept:'Public Services', hoaName:'David Beresford', campus:'Knightstone', metM1:'Y', formM1:'N', rag:5, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Really positive. Totally gets the idea for working together. Drone use and GPS discussed.', strengths:'David fully engaged and understanding of how digital fits in PSF curriculum.', afis:'No form submitted. No Digital Lead identified. RAG 5.', priorityActions:'Complete survey form with David. Identify Digital Lead.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'Dave needs 1:1 support on specifically what digital skills can be developed.', snapshots:[] },
  { code:'SKB', dept:'Skills Bootcamps', hoaName:'Becky Morris', campus:'Multi', metM1:'Y', formM1:'N', rag:4, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Becky was very engaged. Will share Forms link with others.', strengths:'Becky is a connector — willing to share resources across her network.', afis:'No form yet. No Digital Lead.', priorityActions:'Follow up for survey completion. Identify Digital Lead for SKB.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'SMS', dept:'Sixth Form', hoaName:'Maria Miles', campus:'Loxton', metM1:'Y', formM1:'Y', rag:2, digitalLead:'Ethan Shi', futureDigitalLead:'', meeting1Summary:'Digital Hours not a key focus for Sixth Form. CVs, media editing, portfolios.', strengths:'Digital Health Checks already in use. Ethan Shi identified as Digital Lead.', afis:'Digital Hours expectations unclear for SMS.', priorityActions:'Clarify SMS digital hours expectations. Support Michael Foster on Teams.', teachMeets:'How to use AI in the learning experience — Ethical use for learners', coaching1to1:'Setting up a Power Automate driven system that sends reports to all learners.', asyncTraining:'', nextAction:'Reach out for update on Power Automate systems.', snapshots:[] },
  { code:'SMX', dept:'SOMAX (Offsite / Prison)', hoaName:'John Fowler', campus:'NSI', metM1:'Y', formM1:'Y', rag:2, digitalLead:'John Fowler, Dave Evans', futureDigitalLead:'', meeting1Summary:'See CTC. John manages both CTC and SMX.', strengths:'See CTC. SOMAX has restricted digital access.', afis:'Digital access restrictions mean standard approaches don\'t apply.', priorityActions:'See CTC actions. Develop SOMAX-specific digital skills approach.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
  { code:'SPO', dept:'Sport', hoaName:'Dan Pratlett', campus:'Loxton', metM1:'N', formM1:'N', rag:null, digitalLead:'', futureDigitalLead:'', meeting1Summary:'Meeting declined or needs rearranging.', strengths:'', afis:'Meeting not held. Wearable tech and video analysis relevant.', priorityActions:'Rearrange meeting. Identify HoA contact.', teachMeets:'', coaching1to1:'', asyncTraining:'', nextAction:'', snapshots:[] },
];

/* ── DEFAULT CURRICULUM AREAS ────────────────────────────────── */
const DEFAULT_AREAS = [
  { code:'AGF', name:'Arts, Graphics & Fashion',         group:'Arts, Creative & Media',                      coreSkills:['Digital research & content creation','Portfolio development (Adobe CC, Behance)','Professional social media for creative industry'], subjectTools:['Adobe Creative Cloud','CLO 3D','Canva Pro','Adobe Firefly','Behance'], ratings:{}, notes:'' },
  { code:'GMA', name:'Games, Media & Animation',         group:'Arts, Creative & Media',                      coreSkills:['Complex software navigation','Digital project management','Version control (Git)'], subjectTools:['Unity / Unreal Engine','Autodesk Maya / Blender','Adobe Premiere / After Effects','Toon Boom'], ratings:{}, notes:'' },
  { code:'PAP', name:'Performance & Production',         group:'Arts, Creative & Media',                      coreSkills:['Digital research & professional social media','Video recording and self-review'], subjectTools:['GarageBand / Logic / Ableton','QLab','Spotlight / Mandy'], ratings:{}, notes:'' },
  { code:'BUI', name:'Building Services',                group:'Construction, Engineering & Motor Vehicle',   coreSkills:['Data handling & digital invoicing','QR clock-in systems','BIM Level 2 awareness'], subjectTools:['AutoCAD / Revit (BIM)','Fieldwire / Procore','Sage / Xero'], ratings:{}, notes:'' },
  { code:'CON', name:'Construction Trades',              group:'Construction, Engineering & Motor Vehicle',   coreSkills:['Digital record-keeping','Digital time-keeping','Ordering via digital portals'], subjectTools:['QR site sign-in','Digital measuring devices','Trade supplier ordering portals'], ratings:{}, notes:'' },
  { code:'EFE', name:'Engineering WBL',                  group:'Construction, Engineering & Motor Vehicle',   coreSkills:['Technical documentation','ERP/MRP data entry','Email and digital reporting'], subjectTools:['CAD/CAM (SolidWorks, Fusion 360)','ERP systems (SAP, Oracle)'], ratings:{}, notes:'' },
  { code:'EHE', name:'Engineering Higher Education',     group:'Construction, Engineering & Motor Vehicle',   coreSkills:['Complex data analysis','Technical report writing','Simulation software'], subjectTools:['ANSYS / MATLAB','AutoCAD / Revit advanced','Python / MATLAB scripting'], ratings:{}, notes:'' },
  { code:'EMV', name:'Engineering & Motor Vehicle',      group:'Construction, Engineering & Motor Vehicle',   coreSkills:['Technical documentation','Diagnostic data interpretation','EV battery management awareness'], subjectTools:['OBD II digital diagnostics','VW / Bosch / ALLDATA software','ADAS calibration tools'], ratings:{}, notes:'' },
  { code:'ENG', name:'Engineering (General)',            group:'Construction, Engineering & Motor Vehicle',   coreSkills:['CAD / technical drawing','Data analysis','Technical documentation'], subjectTools:['AutoCAD / Fusion 360','CNC programming interfaces','Excel for engineering'], ratings:{}, notes:'' },
  { code:'BUS', name:'Business & Tourism',               group:'Business, Professional & Digital',            coreSkills:['Spreadsheets & data analysis','Professional email','Digital marketing'], subjectTools:['Xero / QuickBooks','CRM (Salesforce / HubSpot)','Power BI / Excel advanced'], ratings:{}, notes:'' },
  { code:'DCI', name:'Digital Computing & IT',           group:'Business, Professional & Digital',            coreSkills:['All EDS skills','Programming fundamentals','Networks & cybersecurity basics'], subjectTools:['Python / JavaScript / SQL','Azure / AWS','Cybersecurity tools','GitHub','Figma'], ratings:{}, notes:'' },
  { code:'PRA', name:'Professional Apprenticeships',     group:'Business, Professional & Digital',            coreSkills:['All 5 EDS work categories','Sector-specific software','ePortfolio / EPA evidence'], subjectTools:['Smart Assessor','eILP tools','Sector-specific platforms'], ratings:{}, notes:'' },
  { code:'PRS', name:'Professional Studies',             group:'Business, Professional & Digital',            coreSkills:['Academic digital research','Referencing and citation tools','Report writing'], subjectTools:['Microsoft Office advanced','Zotero / Mendeley','SPSS / Excel'], ratings:{}, notes:'' },
  { code:'EEY', name:'Education & Early Years',          group:'Health, Care & Education',                    coreSkills:['Digital child observation recording','Learning platform management'], subjectTools:['Tapestry / Evidence Me','EYFS digital tracking','Scratch / coding toys'], ratings:{}, notes:'' },
  { code:'HAC', name:'Health (inc. T Level)',             group:'Health, Care & Education',                    coreSkills:['Digital record-keeping','Patient data handling','GDPR / Caldicott compliance'], subjectTools:['SystmOne / EMIS','NHS Digital portals','Telehealth platforms'], ratings:{}, notes:'' },
  { code:'FEH', name:'FIP Supported Employment',         group:'Health, Care & Education',                    coreSkills:['Basic device navigation','Email for job applications','Online job search'], subjectTools:['Indeed / Reed job platforms','Gov.UK digital services','Digital CV tools'], ratings:{}, notes:'' },
  { code:'EGL', name:'English',                          group:'English, Maths & ESOL',                       coreSkills:['Word processing','Digital research & referencing','Accessibility tools'], subjectTools:['Microsoft Word / Google Docs advanced','Grammarly','Immersive Reader'], ratings:{}, notes:'' },
  { code:'ESO', name:'ESOL',                             group:'English, Maths & ESOL',                       coreSkills:['Device setup & basic navigation','Translation apps','Accessing public services online'], subjectTools:['Google Translate / DeepL','Microsoft Translator','NHS App / Gov.UK'], ratings:{}, notes:'' },
  { code:'MAT', name:'Maths',                            group:'English, Maths & ESOL',                       coreSkills:['Spreadsheet calculations','Digital graphing tools','Online quizzes'], subjectTools:['Desmos','GeoGebra','Excel / Google Sheets','OneNote digital inking'], ratings:{}, notes:'' },
  { code:'HBH', name:'Hair, Beauty & Hospitality',       group:'Hair, Beauty & Hospitality',                  coreSkills:['Social media for business','Digital booking systems','Card payment tech'], subjectTools:['Fresha / Treatwell / Vagaro','EPOS / POS (Square)','Instagram / TikTok portfolio'], ratings:{}, notes:'' },
  { code:'ANM', name:'Animal Management',                group:'Animal Management & Science',                 coreSkills:['Digital record-keeping','Data entry','Scientific research online'], subjectTools:['RoboVet / VetSoft','iNaturalist species ID','Environmental data monitoring'], ratings:{}, notes:'' },
  { code:'SPO', name:'Sport',                            group:'Sport, Health & Active Living',               coreSkills:['Data handling','Digital communications','Performance analysis'], subjectTools:['Wearable tech (Garmin, Catapult)','Video analysis (Hudl, Dartfish)','Trainerize'], ratings:{}, notes:'' },
  { code:'PSF', name:'Public Services',                  group:'Public Services, Community & Employment',     coreSkills:['Research & information gathering','Digital report writing','Cybersecurity awareness'], subjectTools:['Niche RMS','Body-worn camera data management','GIS digital mapping'], ratings:{}, notes:'' },
  { code:'CED', name:'Community Education',              group:'Public Services, Community & Employment',     coreSkills:['Accessing public services online','Digital financial inclusion','Basic device literacy'], subjectTools:['Gov.UK digital services','NHS App','Universal Credit portal'], ratings:{}, notes:'' },
  { code:'PRE', name:'Employment Services (Pre-employment)', group:'Public Services, Community & Employment', coreSkills:['Digital CV creation','Online job search','Email for job applications'], subjectTools:['Indeed / LinkedIn / Reed','DWP digital tools','Canva CV builder'], ratings:{}, notes:'' },
  { code:'SKB', name:'Skills Bootcamps',                 group:'Public Services, Community & Employment',     coreSkills:['Sector-specific digital skills (fast-track)','Digital portfolio','AI tool awareness'], subjectTools:['Sector-dependent','LinkedIn','Credly digital badges'], ratings:{}, notes:'' },
  { code:'SMX', name:'SOMAX (Offsite / Prison)',         group:'Public Services, Community & Employment',     coreSkills:['Basic device literacy','Digital employability skills','Online job applications'], subjectTools:['Restricted: secure email','Basic word processing','Employability platforms'], ratings:{}, notes:'' },
  { code:'SMS', name:'Sixth Form (A Level)',             group:'Sixth Form & Access to HE',                   coreSkills:['Academic digital research','Reference management','Data analysis for subjects'], subjectTools:['JSTOR / Google Scholar / EBSCO','Desmos / GeoGebra','UCAS digital application'], ratings:{}, notes:'' },
  { code:'AHE', name:'Access to Higher Education',      group:'Sixth Form & Access to HE',                   coreSkills:['Academic writing (word processing)','Digital research skills','Presentation tools'], subjectTools:['UCAS / university application portals','Turnitin','Zotero referencing'], ratings:{}, notes:'' },
  { code:'FAU', name:'FIP Autism',                       group:'Faculty of Inclusive Practice (FIP) & SEND',  coreSkills:['Predictable structured digital environments','AAC communication tools'], subjectTools:['Proloquo2Go / Grid 3 (AAC)','Choiceworks (visual schedules)'], ratings:{}, notes:'' },
  { code:'FCO', name:'FIP Complex Needs',                group:'Faculty of Inclusive Practice (FIP) & SEND',  coreSkills:['Switch-access technology','Eye-gaze systems','Accessible digital devices'], subjectTools:['Tobii eye-gaze','Switch-access devices','Clicker / Widgit Online'], ratings:{}, notes:'' },
  { code:'FPL', name:'FIP Pre-Vocational',               group:'Faculty of Inclusive Practice (FIP) & SEND',  coreSkills:['Basic device operation','Simple task management apps','Assistive technology'], subjectTools:['Read&Write','Immersive Reader','Clicker 8','Taskmaster'], ratings:{}, notes:'' },
  { code:'QUA', name:'Quality (Internal QA)',            group:'Quality & External Provision',                 coreSkills:['Data analysis & reporting','Digital dashboard use','Evidence management'], subjectTools:['ProMonitor (QA data)','Power BI','Teams for coaching records'], ratings:{}, notes:'' },
  { code:'EXT', name:'External Contracts',               group:'Quality & External Provision',                 coreSkills:['Contract-specific digital platforms','Remote / online delivery tools'], subjectTools:['Contract-dependent digital systems','Online assessment platforms'], ratings:{}, notes:'' },
];

/* ── DB FUNCTIONS ────────────────────────────────────────────── */

function initDB() {
  if (!DB.areas.length)      DB.areas      = JSON.parse(JSON.stringify(DEFAULT_AREAS));
  if (!DB.hoaTracker.length) DB.hoaTracker = JSON.parse(JSON.stringify(DEFAULT_HOA_TRACKER));
  DB.hoaTracker.forEach(a => { if (!a.snapshots) a.snapshots = []; });
  if (!DB.meta.created) DB.meta.created = new Date().toISOString();
}

function genId(prefix) {
  return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2,7);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function saveJSON() {
  _dirty = false;
  if (_autosaveTimer) clearTimeout(_autosaveTimer);
  DB.meta.lastSaved = new Date().toISOString();
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'dpc-evidence-store.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Data saved to dpc-evidence-store.json', 'success');
}

function loadJSON() {
  const input   = document.createElement('input');
  input.type    = 'file';
  input.accept  = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const loaded = JSON.parse(ev.target.result);
        mergeLoadedData(loaded);
        updateJSONStatus(true, file.name);
        refreshAllViews();
        toast('Loaded: ' + file.name, 'success');
      } catch(err) {
        toast('Could not parse file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function mergeLoadedData(loaded) {
  // Migrate old formats
  if (loaded.coachingSessions) {
    (loaded.coachingSessions || []).forEach(s => {
      if (!loaded.entries) loaded.entries = [];
      loaded.entries.push({
        id: genId('migrated'), type: 'coaching',
        date: s.date || '', title: s.title || 'Coaching session',
        notes: [s.content||'', s.impact||'', s.testimonial ? '"'+s.testimonial+'"' : ''].filter(Boolean).join('\n\n'),
        area: s.area || '', subtype: 'Coaching session',
        tags: { themes:[], ofsted:[], dtpf:[], kpi:[], accountability:[] },
        created: s.created || new Date().toISOString(), _migrated: true
      });
    });
    delete loaded.coachingSessions;
  }
  if (loaded.meetings) {
    (loaded.meetings || []).forEach(m => {
      if (!loaded.entries) loaded.entries = [];
      loaded.entries.push({
        id: genId('migrated'), type: 'meeting',
        date: m.date || '', title: m.title || 'Meeting',
        notes: [m.outcomes||'', m.actions ? 'Actions: '+m.actions : ''].filter(Boolean).join('\n\n'),
        area: m.area || '', subtype: 'Meeting',
        tags: { themes:[], ofsted:[], dtpf:[], kpi:[], accountability:[] },
        created: m.created || new Date().toISOString(), _migrated: true
      });
    });
    delete loaded.meetings;
  }

  // Merge all arrays
  const arrays = ['entries','referrals','threads','tasks','staffRecords','resources','learnerData'];
  arrays.forEach(key => { if (loaded[key] && Array.isArray(loaded[key])) DB[key] = loaded[key]; });
  if (loaded.areas?.length)      DB.areas      = loaded.areas;
  if (loaded.hoaTracker?.length) {
    DB.hoaTracker = loaded.hoaTracker;
    DB.hoaTracker.forEach(a => { if (!a.snapshots) a.snapshots = []; });
  }
  // Merge tags carefully — preserve custom tags and requestedByCustom
  if (loaded.tags) {
    if (loaded.tags.custom?.length)         DB.tags.custom              = loaded.tags.custom;
    if (loaded.tags.hyperThemes?.length)    DB.tags.hyperThemes         = loaded.tags.hyperThemes;
    if (loaded.tags.requestedByCustom)      DB.requestedByCustom        = loaded.tags.requestedByCustom;
  }
  if (loaded.requestedByCustom?.length)   DB.requestedByCustom          = loaded.requestedByCustom;
  if (loaded.ratingFields?.length)         DB.ratingFields               = loaded.ratingFields;
  if (loaded.meta)                         Object.assign(DB.meta, loaded.meta);
}

// Get all "Requested by" options (built-in + custom)
function getRequestedByOptions() {
  return [...DB.requestedByOptions, ...DB.requestedByCustom];
}

// Add a custom "requested by" person
function addRequestedByOption(name) {
  const n = name.trim();
  if (!n) return;
  if (DB.requestedByOptions.includes(n) || DB.requestedByCustom.includes(n)) return;
  DB.requestedByCustom.push(n);
}

// Get a tag label by ID (searches all tag arrays)
function getTagLabel(id) {
  // Sub-tags
  for (const th of DB.tags.themes) {
    const st = th.subtags.find(s => s.id === id);
    if (st) return st.label;
  }
  // Hyper themes
  for (const ht of DB.tags.hyperThemes) {
    const it = ht.items.find(i => i.id === id);
    if (it) return it.label;
  }
  const flat = [...DB.tags.ofsted, ...DB.tags.dtpf, ...DB.tags.kpi, ...DB.tags.accountability, ...DB.tags.custom];
  return flat.find(t => t.id === id)?.label || id;
}

// Get theme label by ID
function getThemeLabel(id) {
  const th = DB.tags.themes.find(t => t.id === id);
  return th ? th.label : (DB.tags.ofsted.find(t=>t.id===id)?.label || id);
}

// Snapshot HoA area before changes
function snapshotHoA(tracker, reason) {
  if (!tracker.snapshots) tracker.snapshots = [];
  tracker.snapshots.push({
    timestamp: new Date().toISOString(),
    reason: reason || 'Manual snapshot',
    state: {
      rag: tracker.rag, metM1: tracker.metM1, formM1: tracker.formM1,
      hoaName: tracker.hoaName, campus: tracker.campus,
      digitalLead: tracker.digitalLead, futureDigitalLead: tracker.futureDigitalLead,
      meeting1Summary: tracker.meeting1Summary, strengths: tracker.strengths,
      afis: tracker.afis, priorityActions: tracker.priorityActions,
      teachMeets: tracker.teachMeets, coaching1to1: tracker.coaching1to1,
      asyncTraining: tracker.asyncTraining, nextAction: tracker.nextAction
    }
  });
}

// Update JSON status indicator in header
/* ── AUTOSAVE TO LOCALSTORAGE ───────────────────────────────── */
// Protects against accidental navigation. Not a substitute for
// the JSON save — just a safety net for unsaved session work.
const LS_KEY = 'dpc-hub-autosave';
let _autosaveTimer = null;
let _dirty = false;

function markDirty() {
  _dirty = true;
  scheduleAutosave();
}

function scheduleAutosave() {
  if (_autosaveTimer) clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(doAutosave, 8000); // 8 seconds after last change
}

function doAutosave() {
  if (!_dirty) return;
  try {
    const snapshot = JSON.stringify(DB);
    localStorage.setItem(LS_KEY, snapshot);
    localStorage.setItem(LS_KEY + '-ts', new Date().toISOString());
    _dirty = false;
    updateAutosaveStatus();
  } catch(e) { /* quota exceeded — ignore */ }
}

function updateAutosaveStatus() {
  const el = document.getElementById('autosave-status');
  if (!el) return;
  const ts = localStorage.getItem(LS_KEY + '-ts');
  el.textContent = ts
    ? 'Auto-saved ' + new Date(ts).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
    : '';
}

function restoreAutosave() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const ts  = localStorage.getItem(LS_KEY + '-ts');
    const age = ts ? Math.round((Date.now() - new Date(ts)) / 60000) : '?';
    if (!confirm(`An auto-saved session was found (${age} minutes ago).\n\nRestore it? Click Cancel to start fresh.`)) return false;
    const loaded = JSON.parse(raw);
    mergeLoadedData(loaded);
    updateJSONStatus(true, 'Auto-restored session');
    refreshAllViews();
    toast('Session restored from auto-save', 'success');
    return true;
  } catch(e) { return false; }
}

// Warn on browser navigation away if dirty
window.addEventListener('beforeunload', e => {
  doAutosave(); // flush immediately
  if (_dirty) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Use the Save button to download your data file.';
  }
});

// Patch saveJSON to also clear autosave + dirty flag
const _origSaveJSON = typeof saveJSON === 'function' ? saveJSON : null;

function updateJSONStatus(linked, filename) {
  const dot  = document.getElementById('json-dot');
  const text = document.getElementById('json-status-text');
  if (!dot || !text) return;
  if (linked) {
    dot.className  = 'json-dot linked';
    text.textContent = filename || 'Data linked';
  } else {
    dot.className  = 'json-dot';
    text.textContent = 'No file linked';
  }
}

// Refresh all visible sections after data load
function refreshAllViews() {
  renderTagClouds();
  renderAreaDropdowns();
  populateFilterDropdowns();
  renderDashboard();
  renderWeeklyView();
  renderReferralInbox();
  renderThreads();
}
