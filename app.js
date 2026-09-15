const DB_NAME = "ebbinghaus-scheduler";
const DB_VERSION = 1;
const STORE = "appState";
const DEFAULT_INTERVALS = [1, 2, 4, 7, 15];
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toISODate(d);
};

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

const formatDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`;
};

const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const monthKey = (iso) => iso.slice(0, 7);

const uid = () => window.crypto?.randomUUID?.() || `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createInitialState = () => ({
  version: 1,
  settings: {
    defaultIntervals: DEFAULT_INTERVALS,
    compactMode: true,
    reviewMinutes: 5,
  },
  plans: [
    {
      id: uid(),
      title: "医学复习计划",
      startDate: todayISO(),
      intervals: DEFAULT_INTERVALS,
      note: "示例计划，可直接删除后新建自己的内容",
      createdAt: new Date().toISOString(),
    },
  ],
  completions: {},
  backup: null,
  selectedDate: todayISO(),
  currentView: "today",
});

let state = createInitialState();
let backupFileHandle = null;

function backupPayload() {
  const { backup, ...data } = state;
  return data;
}

function updateBackup() {
  state.backup = {
    updatedAt: new Date().toISOString(),
    json: JSON.stringify(backupPayload(), null, 2),
  };
}

async function loadBackupHandle() {
  try {
    if (!window.indexedDB) return;
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    backupFileHandle = await new Promise((resolve, reject) => {
      const req = tx.objectStore(STORE).get("backupHandle");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    backupFileHandle = null;
  }
}

async function persistBackupHandle() {
  try {
    if (!window.indexedDB || !backupFileHandle) return;
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(backupFileHandle, "backupHandle");
  } catch {
    // Some browsers do not support storing file handles in IndexedDB.
  }
}

async function writeBackupFile() {
  if (!backupFileHandle || !state.backup) return;
  try {
    const permission = backupFileHandle.queryPermission
      ? await backupFileHandle.queryPermission({ mode: "readwrite" })
      : "granted";
    if (permission !== "granted") return;
    const writable = await backupFileHandle.createWritable();
    await writable.write(state.backup.json);
    await writable.close();
  } catch {
    backupFileHandle = null;
  }
}

async function chooseAutoBackupFile() {
  if (!window.showSaveFilePicker) {
    alert("当前浏览器不支持自动写入文件，请使用最新版 Chrome 或 Edge。");
    return;
  }
  try {
    backupFileHandle = await window.showSaveFilePicker({
      suggestedName: "Ebbinghaus_backup.json",
      types: [{ description: "JSON 备份文件", accept: { "application/json": [".json"] } }],
    });
    await persistBackupHandle();
    await saveState();
    alert("自动备份已开启。以后每次更新都会保存到这个 JSON 文件。");
  } catch (error) {
    if (error?.name !== "AbortError") alert("没有开启自动备份。");
  }
}

let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function loadState() {
  try {
    if (!window.indexedDB) throw new Error("IndexedDB unavailable");
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const saved = await new Promise((resolve, reject) => {
      const req = store.get("state");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (saved) state = saved;
  } catch {
    const raw = localStorage.getItem("ebbinghaus-fallback");
    if (raw) state = JSON.parse(raw);
  }
}

async function saveState() {
  updateBackup();
  await writeBackupFile();
  try {
    if (!window.indexedDB) throw new Error("IndexedDB unavailable");
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, "state");
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    localStorage.setItem("ebbinghaus-fallback", JSON.stringify(state));
  }
}

function getOccurrences(plan) {
  const occurrences = [{ type: "start", date: plan.startDate, index: 0 }];
  plan.intervals.forEach((gap, i) => {
    occurrences.push({
      type: "review",
      date: addDays(plan.startDate, gap),
      index: i + 1,
      gap,
    });
  });
  return occurrences;
}

function getStatus(plan, date) {
  const done = state.completions[plan.id]?.[date];
  if (done) return "done";
  if (date < todayISO()) return "overdue";
  if (date === todayISO()) return "today";
  return "future";
}

function getDueEntries(date) {
  return state.plans
    .flatMap((plan) => {
      const occurrences = getOccurrences(plan).filter((item) => item.date === date);
      return occurrences.map((occ) => ({
        plan,
        occurrence: occ,
        status: getStatus(plan, date),
      }));
    })
    .sort((a, b) => a.plan.startDate.localeCompare(b.plan.startDate));
}

function getCalendarDays(viewDate) {
  const d = new Date(`${viewDate.slice(0, 7)}-01T00:00:00`);
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const startOffset = start.getDay();
  const days = [];
  for (let i = startOffset; i > 0; i--) days.push(toISODate(new Date(year, month, 1 - i)));
  for (let day = 1; day <= end.getDate(); day++) days.push(toISODate(new Date(year, month, day)));
  const trailing = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= trailing; i++) days.push(toISODate(new Date(year, month + 1, i)));
  return days;
}

function setPlanDone(planId, date) {
  state.completions[planId] ||= {};
  state.completions[planId][date] = true;
}

function deletePlan(planId) {
  state.plans = state.plans.filter((p) => p.id !== planId);
  delete state.completions[planId];
}

function render() {
  const app = $("#app");
  const month = monthKey(state.selectedDate);
  const monthLabel = new Date(`${month}-01T00:00:00`);
  const monthTitle = `${monthLabel.getFullYear()}年${monthLabel.getMonth() + 1}月`;
  const dueToday = getDueEntries(todayISO());
  const selectedEntries = getDueEntries(state.selectedDate);
  const days = getCalendarDays(state.selectedDate);
  const currentMonthDays = days.filter((d) => monthKey(d) === month);

  const stats = {
    total: state.plans.length,
    dueToday: dueToday.length,
    doneToday: dueToday.filter((item) => item.status === "done").length,
    overdue: state.plans
      .flatMap((plan) => getOccurrences(plan).map((occurrence) => ({ plan, occurrence })))
      .filter(({ plan, occurrence }) => getStatus(plan, occurrence.date) === "overdue").length,
  };

  app.innerHTML = `
    <div class="shell">
      <div class="topbar">
        <div class="hero">
          <h1>艾宾浩斯日程表</h1>
          <p>纯本地网页，支持日历展示、完成状态、IndexedDB 保存，以及 JSON 导入导出。</p>
        </div>
        <div class="top-actions">
          <button class="btn ghost" id="exportBtn">导出 JSON</button>
          <button class="btn ghost" id="autoBackupBtn">设置自动备份</button>
          <button class="btn ghost" id="importBtn">导入 JSON</button>
          <button class="btn primary" id="addBtn">+ 新建计划</button>
        </div>
      </div>

      <div class="grid">
        <section class="card">
          <div class="section-head">
            <h2>今日待办</h2>
            <span class="pill today">${formatDate(todayISO())}</span>
          </div>
          <div class="meta-row">
            <span>共 ${stats.total} 个计划</span>
            <span>今日 ${stats.dueToday} 项</span>
          </div>
          <div class="task-list">
            ${dueToday.length ? dueToday.map(renderTaskCard).join("") : `<div class="overview-row">今天没有待办，可以新建一个计划开始。</div>`}
          </div>
        </section>

        <section class="card">
          <div class="section-head">
            <div class="month-title-group">
              <button class="month-arrow" data-month-shift="-1" aria-label="上个月">‹</button>
              <h2>${monthTitle}</h2>
              <button class="month-arrow" data-month-shift="1" aria-label="下个月">›</button>
              <input class="month-picker" id="monthJump" type="month" value="${month}" aria-label="跳转到月份" />
            </div>
            <div class="tabs">
              <button class="tab ${state.currentView === "today" ? "active" : ""}" data-goto-today>今天</button>
              <button class="tab ${state.currentView === "month" ? "active" : ""}" data-goto-month>本月</button>
            </div>
          </div>
          <div class="calendar-tip">选择月份可直接跳转，点击日期查看当天安排</div>
          <div class="calendar">
            ${["日", "一", "二", "三", "四", "五", "六"].map((d) => `<div class="weekday">${d}</div>`).join("")}
            ${days.map((iso) => renderDayCell(iso, month)).join("")}
          </div>
        </section>

        <section class="card">
          <div class="section-head">
            <h2>复习概览</h2>
            <span class="pill future">预计 ${stats.total * 5} 分钟</span>
          </div>
          <div class="overview-list">
            ${currentMonthDays.slice(0, 14).map((date) => renderOverviewRow(date)).join("")}
          </div>
        </section>
      </div>

      <div class="footerbar">
        <div>已保存到本机 IndexedDB · JSON 自动备份：${state.backup ? formatBackupTime(state.backup.updatedAt) : "准备中"}</div>
        <div>选中日期：${formatDate(state.selectedDate)}</div>
      </div>
    </div>
  `;

  $("#exportBtn").onclick = exportJSON;
  $("#autoBackupBtn").onclick = chooseAutoBackupFile;
  $("#importBtn").onclick = () => $("#importFile").click();
  $("#addBtn").onclick = openAddModal;
  $$("[data-goto-today]").forEach((btn) => (btn.onclick = () => {
    state.currentView = "today";
    state.selectedDate = todayISO();
    saveAndRender();
  }));
  $$("[data-goto-month]").forEach((btn) => (btn.onclick = () => {
    state.currentView = "month";
    saveAndRender();
  }));
  $$("[data-month-shift]").forEach((btn) => {
    btn.onclick = () => {
      const current = new Date(`${month}-01T00:00:00`);
      current.setMonth(current.getMonth() + Number(btn.dataset.monthShift));
      state.selectedDate = toISODate(current);
      state.currentView = "month";
      saveAndRender();
    };
  });
  $("#monthJump").onchange = (event) => {
    if (!event.target.value) return;
    state.selectedDate = `${event.target.value}-01`;
    state.currentView = "month";
    saveAndRender();
  };
  $$(".day").forEach((el) => {
    el.onclick = () => {
      state.selectedDate = el.dataset.date;
      state.currentView = "month";
      saveAndRender();
    };
  });
  $$(".complete-btn").forEach((btn) => {
    btn.onclick = async () => {
      const { planId, date } = btn.dataset;
      setPlanDone(planId, date);
      await saveAndRender();
    };
  });
  $$(".delete-btn").forEach((btn) => {
    btn.onclick = async () => {
      deletePlan(btn.dataset.planId);
      await saveAndRender();
    };
  });
  const importFile = $("#importFile");
  if (importFile) importFile.onchange = importJSON;
}

function renderTaskCard({ plan, occurrence, status }) {
  const intervals = [0, ...plan.intervals];
  const occurrences = getOccurrences(plan);
  const currentIndex = occurrence.index;
  const chipClass = status === "done" ? "done" : status === "overdue" ? "overdue" : status === "today" ? "today" : "future";
  return `
    <article class="task">
      <div class="task-top">
        <div>
          <div class="task-title">${escapeHtml(plan.title)}</div>
          <div class="task-sub">${plan.note ? escapeHtml(plan.note) : "艾宾浩斯复习计划"} · ${occurrence.type === "start" ? "Day 0" : `第 ${currentIndex} 次复习`}</div>
          <div class="task-sub">${formatDate(occurrence.date)}</div>
        </div>
        <span class="pill ${chipClass}">${status === "done" ? "已完成" : status === "overdue" ? "逾期" : status === "today" ? "今日待办" : "未来"}</span>
      </div>
      <div class="timeline">
        ${occurrences.map((item, idx) => `
          <div class="dot ${state.completions[plan.id]?.[item.date] ? "done" : item.date < todayISO() ? "done" : item.date === todayISO() ? "current todo" : "future"}">
            ${idx === 0 ? "起" : `R${idx}`}
            <div style="margin-top:4px;color:#64748b">${shortDate(item.date)}</div>
          </div>
        `).join("")}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn primary complete-btn" data-plan-id="${plan.id}" data-date="${occurrence.date}">完成</button>
        <button class="btn ghost delete-btn" data-plan-id="${plan.id}">删除计划</button>
      </div>
    </article>
  `;
}

function renderDayCell(iso, month) {
  const entries = getDueEntries(iso);
  const selected = iso === state.selectedDate ? "selected" : "";
  const muted = monthKey(iso) !== month ? "muted" : "";
  const badges = entries.map((entry) => {
    const done = state.completions[entry.plan.id]?.[iso];
    const cls = done ? "done" : entry.status === "overdue" ? "overdue" : iso === todayISO() ? "today" : "plan";
    return `<span class="badge ${cls}"></span>`;
  }).join("");
  return `
    <div class="day ${selected} ${muted}" data-date="${iso}">
      <div class="day-number">${new Date(`${iso}T00:00:00`).getDate()}</div>
      <div class="day-badges">${badges || ""}</div>
    </div>
  `;
}

function renderOverviewRow(date) {
  const entries = getDueEntries(date);
  const overdue = entries.filter((item) => item.status === "overdue").length;
  const done = entries.filter((item) => item.status === "done").length;
  return `
    <div class="overview-row">
      <div class="overview-date">${date} ${formatDate(date).split(" ").slice(-1)[0]}</div>
      <div class="overview-items">
        ${entries.length ? entries.map((entry) => {
          const suffix = entry.occurrence.index === 0 ? "Day 0" : `第 ${entry.occurrence.index} 次`;
          const stateText = entry.status === "done" ? "已完成" : entry.status === "overdue" ? "逾期" : entry.status === "today" ? "今日" : "未来";
          return `• ${escapeHtml(entry.plan.title)} · ${suffix} · ${stateText}`;
        }).join("<br>") : "• 当天无安排"}
      </div>
      <div class="task-sub" style="margin-top:8px">${entries.length} 项待办 · ${overdue} 项逾期 · ${done} 项完成</div>
    </div>
  `;
}

function formatBackupTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "已保存" : `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function openAddModal() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.35);display:grid;place-items:center;padding:24px;z-index:40";
  overlay.innerHTML = `
    <div class="card" style="width:min(680px, 100%);">
      <div class="section-head">
        <h2>新建艾宾浩斯计划</h2>
        <button class="btn ghost" id="closeModal">关闭</button>
      </div>
      <div class="form-grid">
        <div class="field full"><label>计划名称</label><input id="planTitle" placeholder="例如：英语单词 Unit 5" /></div>
        <div class="field"><label>开始日期</label><input id="planStart" type="date" value="${todayISO()}" /></div>
        <div class="field"><label>复习间隔</label><input id="planIntervals" value="1,2,4,7,15" /></div>
        <div class="field full"><label>备注</label><textarea id="planNote" placeholder="可选"></textarea></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
        <button class="btn ghost" id="cancelModal">取消</button>
        <button class="btn primary" id="savePlan">确认添加</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  $("#closeModal", overlay).onclick = close;
  $("#cancelModal", overlay).onclick = close;
  $("#savePlan", overlay).onclick = async () => {
    const title = $("#planTitle", overlay).value.trim();
    const startDate = $("#planStart", overlay).value;
    const intervals = $("#planIntervals", overlay).value
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    const note = $("#planNote", overlay).value.trim();
    if (!title || !startDate || !intervals.length) return;
    state.plans.unshift({
      id: uid(),
      title,
      startDate,
      intervals,
      note,
      createdAt: new Date().toISOString(),
    });
    state.selectedDate = startDate;
    state.currentView = "month";
    close();
    await saveAndRender();
  };
}

async function exportJSON() {
  await saveState();
  const blob = new Blob([state.backup.json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Ebbinghaus_backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importJSON(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const incoming = JSON.parse(text);
    if (!incoming || !Array.isArray(incoming.plans)) throw new Error("invalid backup");
    state = {
      ...createInitialState(),
      ...incoming,
      completions: incoming.completions && typeof incoming.completions === "object" ? incoming.completions : {},
      selectedDate: incoming.selectedDate || todayISO(),
      currentView: "month",
    };
    await saveAndRender();
    alert("数据导入成功");
  } catch {
    alert("导入失败：请选择本应用导出的 JSON 备份文件。");
  }
  e.target.value = "";
}

async function saveAndRender() {
  await saveState();
  render();
}

async function boot() {
  await loadState();
  await loadBackupHandle();
  if (!state.backup) await saveState();
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json";
  fileInput.id = "importFile";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);
  render();
}

boot();
