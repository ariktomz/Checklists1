/* ============================
   GLOBAL STATE
============================ */
let currentChecklist = null;
let checked = {};
let assigned = {};
let crew = {A:'',B:'',C:'',D:'',E:'',F:'',G:'',H:''};
let captainMode = false;
let currentColor = null;

/* ============================
   HEADER COLORS
============================ */
const headerGradients = {
  blue:   'linear-gradient(135deg,#3a6bd1,#1e3f8a)',
  orange: 'linear-gradient(135deg,#d17a3a,#8a4f1e)',
  green:  'linear-gradient(135deg,#3ad16b,#1e8a3f)',
  brown:  'linear-gradient(135deg,#8a6b3a,#5a3f1e)',
  purple: 'linear-gradient(135deg,#7a3ad1,#4f1e8a)',
  red:    'linear-gradient(135deg,#d13a3a,#8a1e1e)',
  cool1:  'linear-gradient(135deg,#3ac7d1,#1e7a8a)',
  cool2:  'linear-gradient(135deg,#6ad1ff,#2a8ab8)'
};

/* ============================
   DEFAULT ASSIGNMENT ARRAYS
============================ */
const antennaDefaultAssignSteps = [...];     // ← כל המערכים שלך
const antennaTeardownDefaultAssignSteps = [...];
const rcsDeployDefaultAssignSteps = [...];
const rcsTearDefaultAssignSteps = [...];
const coolingDeployDefaultAssignSteps = [...];
const coolingTearDefaultAssignSteps = [...];
const rpsDeployDefaultAssignSteps = [...];
const rpsTearDefaultAssignSteps = [...];

/* ============================
   CHECKLISTS DATA
============================ */
const checklists = {
  "antenna-deploy": { he:"פריסת אנטנה", defaultAssignSteps: antennaDefaultAssignSteps, steps:[ ... ] },
  "antenna-tear":   { he:"קיפול אנטנה", defaultAssignSteps: antennaTeardownDefaultAssignSteps, steps:[ ... ] },
  "rcs-deploy":     { he:"פריסת קרון", defaultAssignSteps: rcsDeployDefaultAssignSteps, steps:[ ... ] },
  "rcs-tear":       { he:"קיפול קרון", defaultAssignSteps: rcsTearDefaultAssignSteps, steps:[ ... ] },
  "rps-deploy":     { he:"פריסת מערכת כוח", defaultAssignSteps: rpsDeployDefaultAssignSteps, steps:[ ... ] },
  "rps-tear":       { he:"קיפול מערכת כוח", defaultAssignSteps: rpsTearDefaultAssignSteps, steps:[ ... ] },
  "cooling-deploy": { he:"פריסת מערכת קירור", defaultAssignSteps: coolingDeployDefaultAssignSteps, steps:[ ... ] },
  "cooling-tear":   { he:"קיפול מערכת קירור", defaultAssignSteps: coolingTearDefaultAssignSteps, steps:[ ... ] }
};

/* ============================
   PERSISTENCE
============================ */
function saveState() {
  localStorage.setItem('ops_checked', JSON.stringify(checked));
  localStorage.setItem('ops_crew', JSON.stringify(crew));
  localStorage.setItem('ops_captain', captainMode ? '1' : '0');
}

function loadState() {
  const sChecked = localStorage.getItem('ops_checked');
  const sCrew = localStorage.getItem('ops_crew');
  const sCaptain = localStorage.getItem('ops_captain');

  if (sChecked) checked = JSON.parse(sChecked);
  if (sCrew) crew = JSON.parse(sCrew);
  if (sCaptain === '1') captainMode = true;

  initCrewInputs();
  initCaptainButton();
}

/* ============================
   NAVIGATION
============================ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function applyHeaderColor() {
  const hdr = document.getElementById('checklist-header');
  hdr.style.background = headerGradients[currentColor] || '#0d1f3c';
}

function openChecklist(key, color) {
  currentChecklist = key;
  currentColor = color;

  const steps = checklists[key].steps;

  if (!checked[key] || checked[key].length !== steps.length)
    checked[key] = new Array(steps.length).fill(false);

  if (!assigned[key] || assigned[key].length !== steps.length)
    assigned[key] = new Array(steps.length).fill('');

  showScreen('screen-checklist');
  document.getElementById('cl-title').textContent = checklists[key].he;

  const totalSteps = steps.filter(s=>s.type === 'step').length;
  document.getElementById('cl-sub').textContent = `${totalSteps} צעדים`;

  applyHeaderColor();
  initCrewInputs();
  initCaptainButton();
  renderSteps();
  saveState();
}

function goHome() {
  currentChecklist = null;
  currentColor = null;
  showScreen('screen-home');
  saveState();
}

/* ============================
   CREW MANAGEMENT
============================ */
function toggleCrew() {
  const body = document.getElementById('crew-body');
  const ind = document.getElementById('crew-toggle-indicator');
  body.classList.toggle('show');
  ind.textContent = body.classList.contains('show') ? '▲' : '▼';
}

function initCrewInputs() {
  document.querySelectorAll('[data-crew]').forEach(inp=>{
    const letter = inp.dataset.crew;
    inp.value = crew[letter] || '';
    inp.oninput = ()=>{
      crew[letter] = inp.value;
      saveState();
      updateAssignmentsHighlight();
    };
  });
}

/* ============================
   CAPTAIN MODE
============================ */
function initCaptainButton() {
  const btn = document.getElementById('captain-btn');
  if (!btn) return;

  updateCaptainButtonVisual();

  let pressTimer = null;

  const startPress = () => {
    pressTimer = setTimeout(()=>{
      captainMode = !captainMode;
      updateCaptainButtonVisual();
      saveState();
      if (currentChecklist) renderSteps();
    }, 1500);
  };

  const cancelPress = () => {
    clearTimeout(pressTimer);
  };

  btn.onmousedown = startPress;
  btn.onmouseup = cancelPress;
  btn.onmouseleave = cancelPress;
  btn.ontouchstart = e => { e.preventDefault(); startPress(); };
  btn.ontouchend = cancelPress;
}

function updateCaptainButtonVisual() {
  const btn = document.getElementById('captain-btn');
  if (!btn) return;
  btn.classList.toggle('captain-active', captainMode);
}

/* ============================
   ASSIGNMENT MANAGEMENT
============================ */
function clearCrew() {
  if (!currentChecklist) return;
  if (!confirm('למחוק את הציוות הנוכחי?')) return;

  const steps = checklists[currentChecklist].steps;
  assigned[currentChecklist] = new Array(steps.length).fill('');
  saveState();
  renderSteps();
}

function autoAssignCrew() {
  if (!currentChecklist) return;

  const cfg = checklists[currentChecklist];
  const steps = cfg.steps;
  const def = cfg.defaultAssignSteps;

  if (!assigned[currentChecklist])
    assigned[currentChecklist] = new Array(steps.length).fill('');

  let stepIdx = 0;
  steps.forEach((s, i)=>{
    if (s.type === 'step' && stepIdx < def.length) {
      assigned[currentChecklist][i] = def[stepIdx] || '';
      stepIdx++;
    }
  });

  saveState();
  renderSteps();
}

/* ============================
   RENDER STEPS
============================ */
function renderSteps() {
  const list = document.getElementById('steps-list');
  list.innerHTML = '';

  const steps = checklists[currentChecklist].steps;
  const state = checked[currentChecklist];
  const assigns = assigned[currentChecklist] || [];

  let visibleStepNumber = 1;

  steps.forEach((step, i)=>{
    if (step.type === 'captain') {
      if (!captainMode) return;
      const div = document.createElement('div');
      div.className = 'captain-banner';
      div.innerHTML = step.text;
      list.appendChild(div);
      return;
    }

    if (step.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'separator-line';
      list.appendChild(sep);
      return;
    }

    if (step.type === 'step') {
      const div = document.createElement('div');
      const isChecked = !!state[i];
      const assignVal = (assigns[i] || '').toUpperCase();

      div.className = 'step-item' + (isChecked ? ' checked' : '');
      div.dataset.index = i;

      div.innerHTML = `
        <div class="step-checkbox">${isChecked ? '✓' : ''}</div>
        <div class="step-number">${visibleStepNumber}</div>
        <div class="step-text">${step.text}</div>
        <div class="assign-wrap" onclick="event.stopPropagation()">
          <input class="assign-input" maxlength="4" data-assign-index="${i}" value="${assignVal}">
        </div>
      `;

      div.addEventListener('click', ()=>toggleStep(i));
      list.appendChild(div);

      visibleStepNumber++;
    }
  });

  list.querySelectorAll('.assign-input').forEach(inp=>{
    inp.oninput = ()=>{
      const idx = parseInt(inp.dataset.assignIndex,10);
      let val = (inp.value || '').toUpperCase().replace(/[^A-H]/g,'');
      inp.value = val;
      assigned[currentChecklist][idx] = val;
      saveState();
      updateAssignmentsHighlight();
    };
  });

  updateProgress();
  updateAssignmentsHighlight();
}

/* ============================
   STEP TOGGLE
============================ */
function toggleStep(i) {
  checked[currentChecklist][i] = !checked[currentChecklist][i];
  renderSteps();
  saveState();
}

/* ============================
   PROGRESS BAR
============================ */
function updateProgress() {
  const steps = checklists[currentChecklist].steps;
  const state = checked[currentChecklist];

  let done = 0;
  let total = 0;

  steps.forEach((step, idx)=>{
    if (step.type === 'step') {
      total++;
      if (state[idx]) done++;
    }
  });

  const pct = total ? Math.round((done/total)*100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${done} / ${total}`;

  const badge = document.getElementById('complete-badge');
  badge.classList.toggle('show', done === total && total > 0);
}

/* ============================
   ASSIGNMENT HIGHLIGHT
============================ */
function updateAssignmentsHighlight() {
  if (!currentChecklist) return;

  const activeLetters = Object.entries(crew)
    .filter(([,name])=>name.trim().length>0)
    .map(([letter])=>letter);

  const list = document.getElementById('steps-list');
  const assigns = assigned[currentChecklist] || [];

  list.querySelectorAll('.step-item').forEach(item=>{
    const idx = parseInt(item.dataset.index,10);
    const val = (assigns[idx]||'').toUpperCase();
    const hasMatch = activeLetters.some(letter=>val.includes(letter));
    item.classList.toggle('assigned-highlight', hasMatch);
  });
}

/* ============================
   RESET ALL
============================ */
function resetAll() {
  if (!confirm('לאפס את כל הנתונים?')) return;

  currentChecklist = null;
  currentColor = null;
  checked = {};
  assigned = {};
  crew = {A:'',B:'',C:'',D:'',E:'',F:'',G:'',H:''};
  captainMode = false;

  saveState();
  showScreen('screen-home');
}

/* ============================
   INIT
============================ */
loadState();