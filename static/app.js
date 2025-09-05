// =========================
//  Wage Calculator Pro - App
// =========================

// Global variables
let userProfile = {
  username: localStorage.getItem('username') || 'Guest',
  email: localStorage.getItem('email') || '-',
  pic:
    localStorage.getItem('profilePic') ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      localStorage.getItem('username') || 'Guest'
    )}`,
};

let shiftHistory = JSON.parse(localStorage.getItem('shiftHistory')) || [];
let settings =
  JSON.parse(localStorage.getItem('wageSettings')) || {
    defaultWage: 1200,
    defaultCurrency: '¥',
    defaultShiftType: 'part-time',
    autoSave: true,
    theme: 'light',
    language: 'en',
  };

let advancedSettings =
  JSON.parse(localStorage.getItem('advancedSettings')) || {
    enableNightShift: false,
    nightStart: '22:00',
    nightEnd: '05:00',
    enableOvertime: false,
    overtimeThreshold: 8,
    overtimeRate: 150,
    mealAllowance: 0,
    transportAllowance: 0,
    weekendBonus: 0,
    enableNotifications: false,
    shiftReminders: false,
    paydayAlerts: false,
  };

// =============== INIT ===============
document.addEventListener('DOMContentLoaded', function () {
  loadSettings();
  setupEventListeners();
  updateHistorySummary();
  setCurrentDate();
  updateProfileInfo();
  setupTranslatePopover();
  applyThemeButtonLabel();
});

// =============== HEADER UX ===========
function setupTranslatePopover() {
  const btn = document.getElementById('translateBtn');
  const pop = document.getElementById('gtPopover');
  if (!btn || !pop) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!pop.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      pop.classList.add('hidden');
    }
  });
}
function applyThemeButtonLabel() {
  const themeBtn = document.getElementById('themeToggle');
  if (!themeBtn) return;
  themeBtn.textContent = document.body.classList.contains('dark')
    ? '☀️ Light'
    : '🌙 Dark';
}

// =============== SETTINGS ============
function setCurrentDate() {
  const dateInput = document.getElementById('workDate');
  if (!dateInput) return;
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
}

function loadSettings() {
  // Theme first
  if (settings.theme === 'dark') document.body.classList.add('dark');

  // Basic settings (only if page has these elements)
  if (document.getElementById('defaultWage')) {
    document.getElementById('defaultWage').value = settings.defaultWage;
    document.getElementById('defaultCurrency').value = settings.defaultCurrency;
    document.getElementById('defaultShiftType').value =
      settings.defaultShiftType;
    document.getElementById('autoSave').checked = settings.autoSave;

    document.getElementById('hourlyWage').value = settings.defaultWage;
    document.getElementById('currency').value = settings.defaultCurrency;
    document.getElementById('shiftType').value = settings.defaultShiftType;
  }

  // Advanced settings
  Object.keys(advancedSettings).forEach((key) => {
    const el = document.getElementById(key);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = advancedSettings[key];
    else el.value = advancedSettings[key];
  });
}

function setupEventListeners() {
  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      showPage(this.dataset.page);
      document.querySelectorAll('.nav-btn').forEach((b) => {
        b.classList.remove('active', 'bg-blue-500', 'text-white');
        b.classList.add('bg-gray-200', 'text-gray-700');
      });
      this.classList.add('active', 'bg-blue-500', 'text-white');
      this.classList.remove('bg-gray-200', 'text-gray-700');
    });
  });

  // Calculator & page buttons
  if (document.getElementById('calculateBtn'))
    document
      .getElementById('calculateBtn')
      .addEventListener('click', calculateWage);
  if (document.getElementById('saveSettings'))
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
  if (document.getElementById('saveAdvanced'))
    document
      .getElementById('saveAdvanced')
      .addEventListener('click', saveAdvancedSettings);
  if (document.getElementById('themeToggle'))
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Export / clear
  if (document.getElementById('exportPDF'))
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);
  if (document.getElementById('exportCSV'))
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
  if (document.getElementById('exportExcel'))
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
  if (document.getElementById('clearHistory'))
    document.getElementById('clearHistory').addEventListener('click', clearHistory);

  // Profile export / logout
  if (document.getElementById('profileExportPDF'))
    document
      .getElementById('profileExportPDF')
      .addEventListener('click', exportToPDF);
  if (document.getElementById('profileExportCSV'))
    document
      .getElementById('profileExportCSV')
      .addEventListener('click', exportToCSV);
  if (document.getElementById('logoutBtn'))
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('username');
      localStorage.removeItem('email');
      localStorage.removeItem('profilePic');
      userProfile = {
        username: 'Guest',
        email: '-',
        pic: 'https://ui-avatars.com/api/?name=Guest',
      };
      updateProfileInfo();
      alert('Logged out!');
      try {
        window.location.href = '/logout';
      } catch (_) {}
    });

  // Profile image upload
  if (document.getElementById('profilePicInput'))
    document
      .getElementById('profilePicInput')
      .addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = function (evt) {
            userProfile.pic = evt.target.result;
            localStorage.setItem('profilePic', userProfile.pic);
            updateProfileInfo();
          };
          reader.readAsDataURL(file);
        }
      });

  // Save profile fields
  if (document.getElementById('saveProfileBtn'))
    document.getElementById('saveProfileBtn').addEventListener('click', () => {
      const newName =
        document.getElementById('profileUsernameInput').value.trim() || 'Guest';
      const newEmail =
        document.getElementById('profileEmailInput').value.trim() || '-';
      userProfile.username = newName;
      userProfile.email = newEmail;
      localStorage.setItem('username', newName);
      localStorage.setItem('email', newEmail);
      if (!localStorage.getItem('profilePic')) {
        userProfile.pic = `https://ui-avatars.com/api/?name=${encodeURIComponent(
          newName
        )}`;
      }
      updateProfileInfo();
      alert('Profile updated!');
    });
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach((p) => p.classList.add('hidden'));
  const page = document.getElementById(pageId + 'Page');
  if (page) page.classList.remove('hidden');

  if (pageId === 'history') renderHistoryTable();
  if (pageId === 'profile') updateProfileInfo();
}

// =============== CALCULATION =========
function calculateWage() {
  const date = document.getElementById('workDate').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const breakStart = document.getElementById('breakStart').value;
  const breakEnd = document.getElementById('breakEnd').value;
  const shiftType = document.getElementById('shiftType').value;
  const hourlyWage = parseFloat(document.getElementById('hourlyWage').value);
  const currency = document.getElementById('currency').value;

  if (!date || !startTime || !endTime || !hourlyWage) {
    alert('Please fill in all required fields');
    return;
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  let totalMinutes = endMinutes - startMinutes;
  if (totalMinutes < 0) totalMinutes += 24 * 60;

  let breakMinutes = 0;
  if (breakStart && breakEnd) {
    const breakStartMinutes = timeToMinutes(breakStart);
    const breakEndMinutes = timeToMinutes(breakEnd);
    breakMinutes = breakEndMinutes - breakStartMinutes;
    if (breakMinutes < 0) breakMinutes += 24 * 60;
  }

  const netWorkMinutes = totalMinutes - breakMinutes;
  const netWorkHours = netWorkMinutes / 60;

  // Normal + Night split (25% bonus)
  let totalWage = 0;
  let totalNormalHours = 0;
  let totalNightHours = 0;

  if (advancedSettings.enableNightShift) {
    [totalNormalHours, totalNightHours] = splitNormalAndNightHours(
      startTime,
      endTime,
      breakStart,
      breakEnd,
      advancedSettings.nightStart,
      advancedSettings.nightEnd
    );
    totalWage = totalNormalHours * hourlyWage + totalNightHours * hourlyWage * 1.25;
  } else {
    totalNormalHours = netWorkHours;
    totalWage = netWorkHours * hourlyWage;
  }

  // Overtime
  if (
    advancedSettings.enableOvertime &&
    totalNormalHours + totalNightHours > advancedSettings.overtimeThreshold
  ) {
    const overtimeHours =
      totalNormalHours + totalNightHours - advancedSettings.overtimeThreshold;
    const overtimeWage =
      overtimeHours * hourlyWage * (advancedSettings.overtimeRate / 100 - 1);
    totalWage += overtimeWage;
  }

  // Allowances & weekend
  totalWage += parseFloat(advancedSettings.mealAllowance || 0);
  totalWage += parseFloat(advancedSettings.transportAllowance || 0);
  if (advancedSettings.weekendBonus > 0) {
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      totalWage += totalWage * (advancedSettings.weekendBonus / 100);
    }
  }

  displayResults({
    date,
    startTime,
    endTime,
    breakStart,
    breakEnd,
    shiftType,
    totalHours: (netWorkMinutes / 60).toFixed(2),
    hourlyWage,
    currency,
    totalWage: Math.round(totalWage),
  });

  if (settings.autoSave) {
    saveToHistory({
      date,
      startTime,
      endTime,
      breakStart: breakStart || '-',
      breakEnd: breakEnd || '-',
      shiftType,
      totalHours: (netWorkMinutes / 60).toFixed(2),
      hourlyWage,
      currency,
      totalWage: Math.round(totalWage),
      timestamp: new Date().toISOString(),
    });
  }
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Split normal and night hours accurately across midnight and break
function splitNormalAndNightHours(
  start,
  end,
  breakStart,
  breakEnd,
  nightStart,
  nightEnd
) {
  const day = 1440;
  const ws = timeToMinutes(start);
  const we = timeToMinutes(end) > ws ? timeToMinutes(end) : timeToMinutes(end) + day;
  let intervals = [[ws, we]];

  // Remove break
  if (breakStart && breakEnd) {
    const bs = timeToMinutes(breakStart) >= ws
      ? timeToMinutes(breakStart)
      : timeToMinutes(breakStart) + day;
    const be = timeToMinutes(breakEnd) > bs
      ? timeToMinutes(breakEnd)
      : timeToMinutes(breakEnd) + day;

    const newIntervals = [];
    intervals.forEach(([s, e]) => {
      if (be <= s || bs >= e) newIntervals.push([s, e]);
      else {
        if (bs > s) newIntervals.push([s, bs]);
        if (be < e) newIntervals.push([be, e]);
      }
    });
    intervals = newIntervals;
  }

  const nS = timeToMinutes(nightStart); // e.g. 1320 (22:00)
  const nE = timeToMinutes(nightEnd);   // e.g. 300 (05:00)
  let normal = 0, night = 0;

  intervals.forEach(([s, e]) => {
    // Night part 22:00~24:00 (same day)
    let night1s = Math.max(s, nS);
    let night1e = Math.min(e, day);
    if (night1e > night1s) night += night1e - night1s;

    // Night part 0:00~5:00 (next day if crossed)
    let night2s = Math.max(s, 0);
    let night2e = Math.min(e, nE);
    if (e > day) {
      night2s = Math.max(s, day);
      night2e = Math.min(e, day + nE);
    }
    if (night2e > night2s) night += night2e - night2s;

    const total = e - s;
    const nightInThis =
      Math.max(0, night1e - night1s) + Math.max(0, night2e - night2s);
    normal += total - nightInThis;
  });

  return [normal / 60, night / 60];
}

// =============== UI OUTPUT ===========
function displayResults(data) {
  const resultsDiv = document.getElementById('results');
  if (!resultsDiv) return;
  resultsDiv.innerHTML = `
    <div class="slide-in">
      <div class="bg-green-50 dark:bg-[#0f2f22] border border-green-200 dark:border-[#1f4e3b] rounded-lg p-4 mb-4">
        <h3 class="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">💰 Calculation Results</h3>
        <div class="text-3xl font-bold text-green-600 dark:text-green-300">${data.currency}${data.totalWage.toLocaleString()}</div>
        <div class="text-sm text-green-700 dark:text-green-300 mt-1">Total wage for ${data.totalHours} hours</div>
      </div>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-300">Date:</span><span class="font-medium">${data.date}</span></div>
        <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-300">Shift Type:</span><span class="font-medium">${data.shiftType}</span></div>
        <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-300">Work Time:</span><span class="font-medium">${data.startTime} - ${data.endTime}</span></div>
        ${data.breakStart && data.breakEnd ? `
        <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-300">Break:</span><span class="font-medium">${data.breakStart} - ${data.breakEnd}</span></div>
        ` : ''}
      </div>
    </div>
  `;
}

function saveToHistory(data) {
  shiftHistory.unshift(data);
  localStorage.setItem('shiftHistory', JSON.stringify(shiftHistory));
  updateHistorySummary();
}

function addToHistory() { alert('Added to history!'); }

function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;
  if (shiftHistory.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="border border-gray-300 px-4 py-8 text-center text-gray-500">
          No shift records yet. Start by calculating your first shift!
        </td>
      </tr>`;
    return;
  }
  tbody.innerHTML = shiftHistory
    .map(
      (shift, i) => `
      <tr class="hover:bg-gray-50 dark:hover:bg-[#111827]">
        <td class="border border-gray-300 px-4 py-2">${shift.date}</td>
        <td class="border border-gray-300 px-4 py-2">${shift.shiftType}</td>
        <td class="border border-gray-300 px-4 py-2">${shift.startTime}</td>
        <td class="border border-gray-300 px-4 py-2">${shift.endTime}</td>
        <td class="border border-gray-300 px-4 py-2">${shift.breakStart} - ${shift.breakEnd}</td>
        <td class="border border-gray-300 px-4 py-2">${shift.totalHours}h</td>
        <td class="border border-gray-300 px-4 py-2">${shift.currency}${shift.hourlyWage}</td>
        <td class="border border-gray-300 px-4 py-2 font-semibold">${shift.currency}${shift.totalWage.toLocaleString()}</td>
        <td class="border border-gray-300 px-4 py-2">
          <button onclick="deleteShift(${i})" class="text-red-500 hover:text-red-700">🗑️</button>
        </td>
      </tr>`
    )
    .join('');
}

function deleteShift(index) {
  if (!confirm('Are you sure you want to delete this shift record?')) return;
  shiftHistory.splice(index, 1);
  localStorage.setItem('shiftHistory', JSON.stringify(shiftHistory));
  renderHistoryTable();
  updateHistorySummary();
}

function updateHistorySummary() {
  const weekly = document.getElementById('weeklyTotal');
  const monthly = document.getElementById('monthlyTotal');
  const totalRec = document.getElementById('totalRecords');
  if (!weekly || !monthly || !totalRec) return;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sun
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let weeklyTotal = 0;
  let monthlyTotal = 0;
  shiftHistory.forEach((s) => {
    const d = new Date(s.date);
    if (d >= weekStart) weeklyTotal += s.totalWage;
    if (d >= monthStart) monthlyTotal += s.totalWage;
  });

  weekly.textContent = `¥${weeklyTotal.toLocaleString()}`;
  monthly.textContent = `¥${monthlyTotal.toLocaleString()}`;
  totalRec.textContent = shiftHistory.length;
}

function updateProfileInfo() {
  const u = userProfile;
  const elU = document.getElementById('profileUsername');
  const elE = document.getElementById('profileEmail');
  const inU = document.getElementById('profileUsernameInput');
  const inE = document.getElementById('profileEmailInput');
  const img = document.getElementById('profilePic');
  if (elU) elU.textContent = u.username;
  if (elE) elE.textContent = u.email;
  if (inU) inU.value = u.username;
  if (inE) inE.value = u.email;
  if (img) img.src = u.pic;
}

// =============== SAVE / THEME =========
function saveSettings() {
  settings.defaultWage =
    parseFloat(document.getElementById('defaultWage').value) || 1200;
  settings.defaultCurrency = document.getElementById('defaultCurrency').value;
  settings.defaultShiftType = document.getElementById('defaultShiftType').value;
  settings.autoSave = document.getElementById('autoSave').checked;

  localStorage.setItem('wageSettings', JSON.stringify(settings));
  document.getElementById('hourlyWage').value = settings.defaultWage;
  document.getElementById('currency').value = settings.defaultCurrency;
  document.getElementById('shiftType').value = settings.defaultShiftType;
  alert('Settings saved successfully!');
}

function saveAdvancedSettings() {
  Object.keys(advancedSettings).forEach((key) => {
    const el = document.getElementById(key);
    if (!el) return;
    if (el.type === 'checkbox') advancedSettings[key] = el.checked;
    else advancedSettings[key] = el.value;
  });
  localStorage.setItem('advancedSettings', JSON.stringify(advancedSettings));
  alert('Advanced settings saved successfully!');
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  settings.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
  localStorage.setItem('wageSettings', JSON.stringify(settings));
  applyThemeButtonLabel();
}

// =============== EXPORTS ==============
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text('Wage Calculator - Shift History', 20, 20);
  let y = 40;
  doc.setFontSize(12);

  shiftHistory.forEach((s, i) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.text(`${i + 1}. ${s.date} - ${s.shiftType}`, 20, y);
    doc.text(`   ${s.startTime} to ${s.endTime} (${s.totalHours}h)`, 20, y + 10);
    doc.text(`   Wage: ${s.currency}${s.totalWage.toLocaleString()}`, 20, y + 20);
    y += 35;
  });
  doc.save('wage-history.pdf');
}

function exportToCSV() {
  const headers = [
    'Date','Shift Type','Start Time','End Time','Break Start','Break End','Total Hours','Hourly Wage','Total Wage'
  ];
  const csvContent = [
    headers.join(','),
    ...shiftHistory.map(s =>
      [s.date, s.shiftType, s.startTime, s.endTime, s.breakStart, s.breakEnd, s.totalHours, `${s.currency}${s.hourlyWage}`, `${s.currency}${s.totalWage}`].join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'wage-history.csv'; a.click();
  window.URL.revokeObjectURL(url);
}

function exportToExcel() {
  const headers = ['Date','Shift Type','Start Time','End Time','Break Start','Break End','Total Hours','Hourly Wage','Total Wage'];
  const data = shiftHistory.map(s => [
    s.date, s.shiftType, s.startTime, s.endTime, s.breakStart, s.breakEnd, s.totalHours,
    `${s.currency}${s.hourlyWage}`, `${s.currency}${s.totalWage}`
  ]);
  data.unshift(headers);
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Shift History');
  XLSX.writeFile(wb, 'wage-history.xlsx');
}

function clearHistory() {
  if (!confirm('Are you sure you want to clear all shift history?')) return;
  shiftHistory = [];
  localStorage.setItem('shiftHistory', JSON.stringify(shiftHistory));
  renderHistoryTable();
  updateHistorySummary();
  alert('History cleared successfully!');
}
