// app.js — LV Spices Preventive Maintenance Record (PMR)
// Auto-generates maintenance every 25-40 days from April 2026

import { saveRecord, loadAllRecords, updateCloudBadge } from './firebase-config.js';

// ── UNIT 11 / UNIT 12 TOGGLE ──────────────────────────────────────────────────
const UNIT_STORAGE_KEY = 'lv_pmr_active_unit';
let activeUnit = localStorage.getItem(UNIT_STORAGE_KEY) || 'Unit 11';

window.setActiveUnit = function(unit) {
  activeUnit = unit;
  localStorage.setItem(UNIT_STORAGE_KEY, unit);
  document.getElementById('unit-btn-11')?.classList.toggle('active', unit === 'Unit 11');
  document.getElementById('unit-btn-12')?.classList.toggle('active', unit === 'Unit 12');
};

function initUnitToggle() {
  setActiveUnit(activeUnit);
}

const EQUIPMENT = [
  {
    id: "WS-01", name: "Weighing Scale - 1", location: "Packing Area",
    type: "weighing",
    checks: [
      "Accuracy Check", "Display Check", "Cleaning", "Leveling",
      "Battery / Power", "Physical Condition", "Repair (if any)", "Calibration (if done)"
    ],
    replacementPoints: [
      "Battery Replaced", "Display Replaced", "Load Cell Replaced", "Power Adapter Replaced",
      "Keypad / Button Replaced", "PCB / Circuit Board Replaced", "Power Cable Replaced", "Weighing Platform Replaced"
    ]
  },
  {
    id: "WS-02", name: "Weighing Scale - 2", location: "Packing Area",
    type: "weighing",
    checks: [
      "Accuracy Check", "Display Check", "Cleaning", "Leveling",
      "Battery / Power", "Physical Condition", "Repair (if any)", "Calibration (if done)"
    ],
    replacementPoints: [
      "Battery Replaced", "Display Replaced", "Load Cell Replaced", "Power Adapter Replaced",
      "Keypad / Button Replaced", "PCB / Circuit Board Replaced", "Power Cable Replaced", "Weighing Platform Replaced"
    ]
  },
  {
    id: "SM-01", name: "Sealing Machine - 1", location: "Packing Area",
    type: "sealing",
    checks: [
      "Heating Check", "Seal Quality Check", "Teflon Belt / Strip", "Cleaning",
      "Temperature Setting", "Conveyor / Roller", "Electrical Wiring", "Repair (if any)"
    ],
    replacementPoints: [
      "Heating Element Replaced", "Teflon Belt / Strip Replaced", "Temperature Controller Replaced", "Fuse Replaced",
      "Sealing Belt / Roller Replaced", "Power Switch Replaced", "Thermocouple / Temperature Sensor Replaced",
      "Pressure Spring Replaced", "Motor Replaced", "Electrical Wiring Repaired"
    ]
  },
  {
    id: "SM-02", name: "Sealing Machine - 2", location: "Packing Area",
    type: "sealing",
    checks: [
      "Heating Check", "Seal Quality Check", "Teflon Belt / Strip", "Cleaning",
      "Temperature Setting", "Conveyor / Roller", "Electrical Wiring", "Repair (if any)"
    ],
    replacementPoints: [
      "Heating Element Replaced", "Teflon Belt / Strip Replaced", "Temperature Controller Replaced", "Fuse Replaced",
      "Sealing Belt / Roller Replaced", "Power Switch Replaced", "Thermocouple / Temperature Sensor Replaced",
      "Pressure Spring Replaced", "Motor Replaced", "Electrical Wiring Repaired"
    ]
  }
];

const REPAIRS = [
  "No repair needed. All OK.", "Minor cleaning done. All parts functional.",
  "Belt tension adjusted. Working fine.", "Calibration verified with 1 kg standard weight.",
  "Teflon belt checked — slight wear. Noted for next service.",
  "Heating element temperature checked — within range.", "Battery backup tested — OK.",
  "Platform level re-adjusted.", "Motor noise checked — normal."
];

function seedRng(seed) {
  let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}
function padDate(d) { return d.toISOString().split('T')[0]; }
function formatDate(d) { return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

function generateRecords() {
  const records = [];
  const start = new Date('2026-04-01');
  const today = new Date();
  let d = new Date(start);
  let idx = 1;

  while (d <= today) {
    const rng = seedRng(d.getTime() + idx * 7);
    const dateStr = padDate(d);
    const nextD = new Date(d); nextD.setMonth(nextD.getMonth() + 2);
    const equipmentRecords = EQUIPMENT.map(eq => {
      const rng2 = seedRng(d.getTime() + eq.id.charCodeAt(0) * 13);
      const checkedItems = eq.checks.filter(() => rng2() > 0.15);
      const repairText = REPAIRS[Math.floor(rng2() * REPAIRS.length)];
      return {
        equipmentId: eq.id,
        equipmentName: eq.name,
        location: eq.location,
        type: eq.type,
        checksPerformed: checkedItems,
        repairAction: repairText,
        status: "OK",
        checkedBy: "BHIMLAL SHARMA",
        nextDueDate: formatDate(nextD)
      };
    });

    records.push({
      id: `PMR-${String(idx).padStart(4,'0')}`,
      srNo: idx,
      date: dateStr,
      displayDate: formatDate(d),
      month: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      equipmentRecords,
      preparedBy: "BHIMLAL SHARMA",
      verifiedBy: "Vishal",
      nextDueDate: formatDate(nextD),
      isGenerated: true
    });

    const gap = 25 + Math.floor(rng() * 16); // 25-40 days
    d.setDate(d.getDate() + gap);
    idx++;
  }
  return records;
}

// ── STATE ──────────────────────────────────────────────────────────────────
let allRecords = [];
let filteredRecords = [];
let currentRecordId = null;
const expandedRows = new Set();

async function init() {
  const cloudData = await loadAllRecords();
  const cloudMap = {};
  cloudData.forEach(r => { cloudMap[r.id] = r; });

  const generated = generateRecords();
  generated.forEach(r => {
    if (!cloudMap[r.id]) cloudMap[r.id] = r;
    else cloudMap[r.id] = { ...r, ...cloudMap[r.id] };
  });

  allRecords = Object.values(cloudMap).sort((a, b) => b.date.localeCompare(a.date));
  filteredRecords = [...allRecords];

  renderStats();
  renderList();
  if (allRecords.length > 0) openRecord(allRecords[0].id);

  try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) {}
  initUnitToggle();
}

function renderStats() {
  const totalEl = document.getElementById('stat-total');
  const eqEl = document.getElementById('stat-equipment');
  const nextEl = document.getElementById('stat-next');

  if (totalEl) totalEl.textContent = allRecords.length;
  if (eqEl) eqEl.textContent = 11;
  if (nextEl && allRecords[0]) {
    const nextD = new Date(allRecords[0].date + 'T00:00:00');
    nextD.setMonth(nextD.getMonth() + 2);
    nextEl.textContent = formatDate(nextD);
  }
}

function renderList() {
  const container = document.getElementById('record-list');
  if (!container) return;
  if (filteredRecords.length === 0) {
    container.innerHTML = `<div class="empty-state">No records found</div>`;
    return;
  }
  container.innerHTML = filteredRecords.map(r => `
    <div class="record-card ${r.id === currentRecordId ? 'active' : ''}" onclick="openRecord('${r.id}')">
      <div class="record-card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div class="record-card-info">
        <div class="record-card-id">${r.id}</div>
        <div class="record-card-date">${r.displayDate}</div>
        <div class="record-card-sub">${r.month}</div>
      </div>
    </div>
  `).join('');
}

window.openRecord = function(id) {
  currentRecordId = id;
  const r = allRecords.find(x => x.id === id);
  if (!r) return;
  renderList();
  renderDetail(r);
};

window.toggleRowExpansion = function(rowId) {
  if (expandedRows.has(rowId)) {
    expandedRows.delete(rowId);
  } else {
    expandedRows.add(rowId);
  }
  const r = allRecords.find(x => x.id === currentRecordId);
  if (r) renderDetail(r);
};

function renderDetail(r) {
  const detId = document.getElementById('det-id');
  const detDate = document.getElementById('det-date');
  const detMonth = document.getElementById('det-month');
  const detNext = document.getElementById('det-next');
  const detPrep = document.getElementById('det-prepared');
  const detVer = document.getElementById('det-verified');

  if (detId) detId.textContent = r.id;
  if (detDate) detDate.textContent = r.displayDate;
  if (detMonth) detMonth.textContent = r.month;
  if (detNext) detNext.textContent = r.nextDueDate;
  if (detPrep) detPrep.textContent = r.preparedBy;
  if (detVer) detVer.textContent = r.verifiedBy;

  const tbody = document.getElementById('pmr-tbody');
  if (!tbody) return;

  tbody.innerHTML = (r.equipmentRecords || []).map((eq, i) => {
    const rowId = `${r.id}_${eq.equipmentId}`;
    const isExpanded = expandedRows.has(rowId);
    const eqDef = EQUIPMENT.find(e => e.id === eq.equipmentId);
    const allChecks = eqDef?.checks || [];
    const performed = eq.checksPerformed || [];
    const firstTwo = allChecks.slice(0, 2);
    const remainingCount = Math.max(0, allChecks.length - 2);
    const replacementPoints = eqDef?.replacementPoints || [];

    let mainRow = `
      <tr class="pmr-row ${isExpanded ? 'row-expanded' : ''}">
        <td class="col-sr">${i + 1}</td>
        <td class="col-equipment">
          <div class="eq-name">${eq.equipmentName}</div>
          <div class="eq-sub">${eq.equipmentId} • ${eq.location}</div>
        </td>
        <td class="col-checks">
          <div class="checks-inline-wrap">
            ${firstTwo.map(c => `
              <span class="badge-check-preview">${c}</span>
            `).join('')}
            ${remainingCount > 0 ? `
              <button class="btn-more-checks ${isExpanded ? 'active' : ''}" onclick="toggleRowExpansion('${rowId}')" aria-expanded="${isExpanded}">
                ${isExpanded ? 'Show Less' : `+${remainingCount} more`}
              </button>
            ` : ''}
          </div>
        </td>
        <td class="col-repair">${eq.repairAction}</td>
        <td class="col-status">
          <span class="status-pill-ok">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
            OK
          </span>
        </td>
        <td class="col-checked">${eq.checkedBy}</td>
        <td class="col-next">${r.nextDueDate}</td>
        <td class="col-edit" onclick="event.stopPropagation()">
          <button class="btn-edit-row" onclick="openPmrEdit('${r.id}','${eq.equipmentId}')" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
        </td>
      </tr>
    `;

    if (isExpanded) {
      mainRow += `
        <tr class="expanded-row">
          <td colspan="8">
            <div class="expanded-container">
              <div class="expanded-section">
                <div class="expanded-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  Maintenance Checks Performed (${performed.length} Items)
                </div>
                <div class="checks-pill-grid">
                  ${performed.length > 0 ? performed.map(c => `
                    <span class="pill-check pill-done">
                      ✓ ${c}
                    </span>
                  `).join('') : '<span style="color:var(--text-muted);font-size:12px;">No checks recorded</span>'}
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }

    return mainRow;
  }).join('');
}

window.onSearchChange = function(val) {
  const q = val.toLowerCase();
  filteredRecords = allRecords.filter(r =>
    r.id.toLowerCase().includes(q) ||
    r.displayDate.includes(q) ||
    r.month.toLowerCase().includes(q) ||
    (r.equipmentRecords || []).some(eq =>
      eq.equipmentName.toLowerCase().includes(q) ||
      eq.equipmentId.toLowerCase().includes(q) ||
      eq.repairAction.toLowerCase().includes(q)
    )
  );
  renderList();
};

let _modalStep = 0;
const _MODAL_STEPS = 5;
const _STEP_LABELS = [
  'Step 1 of 5 — Record Details',
  'Step 2 of 5 — Weighing Scale 1',
  'Step 3 of 5 — Weighing Scale 2',
  'Step 4 of 5 — Sealing Machine 1',
  'Step 5 of 5 — Sealing Machine 2',
];

window.modalStepNav = function(dir) {
  if (dir === 1 && _modalStep === 0) {
    const dateVal = document.getElementById('n-date').value;
    if (!dateVal) { alert('Select a date first.'); return; }
  }
  _modalStep = Math.min(Math.max(_modalStep + dir, 0), _MODAL_STEPS - 1);
  for (let i = 0; i < _MODAL_STEPS; i++) {
    document.getElementById(`panel-${i}`).classList.toggle('hidden', i !== _modalStep);
    document.getElementById(`step-dot-${i}`).classList.toggle('active', i === _modalStep);
    document.getElementById(`step-dot-${i}`).classList.toggle('done', i < _modalStep);
  }
  document.getElementById('modal-step-sub').textContent = _STEP_LABELS[_modalStep];
  document.getElementById('modal-back-btn').style.display = _modalStep > 0 ? '' : 'none';
  document.getElementById('modal-next-btn').classList.toggle('hidden', _modalStep === _MODAL_STEPS - 1);
  document.getElementById('save-pmr-btn').classList.toggle('hidden', _modalStep !== _MODAL_STEPS - 1);
};

window.openNewModal = function() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('n-date').value = today;
  _modalStep = 0;
  modalStepNav(0); // reset view
  document.getElementById('modal-overlay').style.display = 'flex';
};
window.closeModal = function() {
  document.getElementById('modal-overlay').style.display = 'none';
};

window.saveNewRecord = async function() {
  const dateVal = document.getElementById('n-date').value;
  const preparedBy = document.getElementById('n-prepared').value.trim() || 'BHIMLAL SHARMA';
  const verifiedBy = document.getElementById('n-verified').value.trim() || 'Vishal';
  if (!dateVal) { alert('Select a date.'); return; }

  const d = new Date(dateVal + 'T00:00:00');
  const nextD = new Date(d); nextD.setMonth(nextD.getMonth() + 2);
  const newId = `PMR-${String(allRecords.length + 1).padStart(4,'0')}-M`;

  function getChecks(name) {
    return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(c => c.value);
  }
  function getRepair(id) {
    const el = document.getElementById(id);
    return el && el.value.trim() ? el.value.trim() : 'All checks performed. No issues found.';
  }

  const manualEqMap = {
    'WS-01': { checks: getChecks('ws01'), repair: getRepair('repair-ws01') },
    'WS-02': { checks: getChecks('ws02'), repair: getRepair('repair-ws02') },
    'SM-01': { checks: getChecks('sm01'), repair: getRepair('repair-sm01') },
    'SM-02': { checks: getChecks('sm02'), repair: getRepair('repair-sm02') },
  };

  const record = {
    id: newId,
    srNo: allRecords.length + 1,
    date: dateVal,
    displayDate: formatDate(d),
    month: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    equipmentRecords: EQUIPMENT.map(eq => ({
      equipmentId: eq.id,
      equipmentName: eq.name,
      location: eq.location,
      type: eq.type,
      checksPerformed: manualEqMap[eq.id]?.checks || eq.checks,
      repairAction: manualEqMap[eq.id]?.repair || 'All checks performed. No issues found.',
      status: 'OK',
      checkedBy: preparedBy,
      nextDueDate: formatDate(nextD)
    })),
    preparedBy,
    verifiedBy,
    nextDueDate: formatDate(nextD),
    isGenerated: false
  };

  const btn = document.getElementById('save-pmr-btn');
  btn.textContent = 'Saving...'; btn.disabled = true;
  const ok = await saveRecord(newId, record);
  btn.textContent = 'Save Record'; btn.disabled = false;

  if (ok) {
    allRecords.unshift(record);
    allRecords.sort((a, b) => b.date.localeCompare(a.date));
    filteredRecords = [...allRecords];
    renderStats();
    renderList();
    openRecord(newId);
    closeModal();
  }
};

window.exportExcel = function() {
  const wb = XLSX.utils.book_new();
  allRecords.forEach(r => {
    const rows = [
      ['Equipment', 'Checks Performed', 'Repair / Action', 'Status', 'Checked By', 'Next Due'],
      ...(r.equipmentRecords || []).map(eq => [
        `${eq.equipmentName} (${eq.equipmentId})`,
        (eq.checksPerformed || []).join(', '),
        eq.repairAction,
        eq.status,
        eq.checkedBy,
        r.nextDueDate
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet([
      [`PMR: ${r.id}`, `Date: ${r.displayDate}`, `Month: ${r.month}`, `Next Due: ${r.nextDueDate}`],
      [],
      ...rows
    ]);
    XLSX.utils.book_append_sheet(wb, ws, r.id.replace(/[^\w]/g, '_').slice(0, 31));
  });
  XLSX.writeFile(wb, `LV_Spices_PMR_${new Date().toISOString().split('T')[0]}.xlsx`);
};

window.printPage = function() { window.print(); };

// ── PMR Edit ───────────────────────────────────────────────────────────────
let _pmrEditId = null;
let _pmrEditStep = 0;
let _pmrEditTotal = 0;

window.openPmrEdit = function(recordId) {
  const r = allRecords.find(x => x.id === recordId);
  if (!r) return;
  _pmrEditId = recordId;
  _pmrEditStep = 0;
  _pmrEditTotal = r.equipmentRecords.length;
  document.getElementById('pmr-edit-id').textContent = recordId;

  // Build step dots
  document.getElementById('pmr-edit-steps-bar').innerHTML =
    r.equipmentRecords.map((_, i) => `<div class="modal-step ${i === 0 ? 'active' : ''}" id="pmredit-dot-${i}"></div>`).join('');

  // Build one panel per equipment
  const panels = r.equipmentRecords.map((eq, i) => {
    const eqDef = EQUIPMENT.find(e => e.id === eq.equipmentId);
    const allChecks = eqDef?.checks || [];
    const performed = eq.checksPerformed || [];
    const dotClass = eq.type === 'weighing' ? 'dot-green' : 'dot-blue';
    return `
      <div class="modal-step-panel ${i !== 0 ? 'hidden' : ''}" id="pmredit-panel-${i}">
        <div class="eq-entry-header"><span class="eq-entry-dot ${dotClass}"></span><strong>${eq.equipmentName}</strong><span class="eq-entry-id">${eq.equipmentId} &middot; ${eq.location}</span></div>
        <div class="checks-checkbox-grid">
          ${allChecks.map(c => `<label><input type="checkbox" name="pmredit-${eq.equipmentId}" value="${c}" ${performed.includes(c) ? 'checked' : ''}> ${c}</label>`).join('')}
        </div>
        <div class="form-row" style="margin-top:10px"><label>Repair / Action Taken</label><input type="text" id="pmredit-repair-${eq.equipmentId}" value="${(eq.repairAction || '').replace(/"/g,'&quot;')}" /></div>
      </div>`;
  }).join('');
  document.getElementById('pmr-edit-equipment-sections').innerHTML = panels;

  _updatePmrEditNav();
  document.getElementById('pmr-edit-overlay').style.display = 'flex';
};

function _updatePmrEditNav() {
  const labels = ['Weighing Scale 1','Weighing Scale 2','Sealing Machine 1','Sealing Machine 2'];
  document.getElementById('pmr-edit-step-sub').textContent =
    `Step ${_pmrEditStep + 1} of ${_pmrEditTotal} — ${labels[_pmrEditStep] || ''}`;
  for (let i = 0; i < _pmrEditTotal; i++) {
    const dot = document.getElementById(`pmredit-dot-${i}`);
    const panel = document.getElementById(`pmredit-panel-${i}`);
    if (dot) { dot.className = `modal-step${i === _pmrEditStep ? ' active' : i < _pmrEditStep ? ' done' : ''}`; }
    if (panel) panel.classList.toggle('hidden', i !== _pmrEditStep);
  }
  document.getElementById('pmr-edit-back-btn').style.display = _pmrEditStep > 0 ? '' : 'none';
  document.getElementById('pmr-edit-next-btn').classList.toggle('hidden', _pmrEditStep === _pmrEditTotal - 1);
  document.getElementById('pmr-edit-save-btn').classList.toggle('hidden', _pmrEditStep !== _pmrEditTotal - 1);
}

window.pmrEditStepNav = function(dir) {
  _pmrEditStep = Math.min(Math.max(_pmrEditStep + dir, 0), _pmrEditTotal - 1);
  _updatePmrEditNav();
};

window.closePmrEdit = function() { document.getElementById('pmr-edit-overlay').style.display = 'none'; };

window.savePmrEdit = async function() {
  if (!_pmrEditId) return;
  const idx = allRecords.findIndex(x => x.id === _pmrEditId);
  if (idx === -1) return;
  const r = allRecords[idx];
  const updatedEqRecords = r.equipmentRecords.map(eq => {
    const checked = [...document.querySelectorAll(`input[name="pmredit-${eq.equipmentId}"]:checked`)].map(c => c.value);
    const repairEl = document.getElementById(`pmredit-repair-${eq.equipmentId}`);
    const repair = repairEl ? repairEl.value.trim() || eq.repairAction : eq.repairAction;
    return { ...eq, checksPerformed: checked, repairAction: repair };
  });
  const updated = { ...r, equipmentRecords: updatedEqRecords };
  const btn = document.getElementById('pmr-edit-save-btn');
  btn.textContent = 'Saving...'; btn.disabled = true;
  const ok = await saveRecord(_pmrEditId, updated);
  btn.textContent = 'Save Changes'; btn.disabled = false;
  if (ok) {
    allRecords[idx] = updated;
    filteredRecords = allRecords.filter(x => filteredRecords.some(f => f.id === x.id));
    if (filteredRecords.length === 0) filteredRecords = [...allRecords];
    renderDetail(updated);
    closePmrEdit();
  }
};

window.toggleSidebar = function() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
};
window.closeSidebar = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
};

init();
