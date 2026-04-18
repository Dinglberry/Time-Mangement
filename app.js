const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const storageKey = "glow-up-time-manager-v2";
const reminderStorageKey = "glow-up-reminder-settings-v2";

const sampleState = {
  planner: {
    Monday: [
      block("K-pop trainee gym block", "07:00", "08:30", "gym", "Lower body + incline walk + posture warm-up"),
      block("Morning shower + body care", "08:35", "09:00", "care", "Quick shower, lotion, deodorant"),
      block("Work shift", "13:00", "21:00", "work", "Replace with your real Starbucks shift"),
      block("Night skincare + teeth", "21:20", "21:40", "care", "Cleanse, moisturize, brush, floss")
    ],
    Tuesday: [
      block("Pilates core + cardio", "08:00", "09:00", "gym", "Core focus + elliptical"),
      block("Hair wash day", "09:05", "09:40", "care", "Shampoo, conditioner, scalp care"),
      block("Cook protein + prep bowls", "18:00", "19:00", "meal", "Chicken, rice, yogurt bowls, snack prep")
    ],
    Wednesday: [
      block("Active recovery walk", "08:00", "08:40", "gym", "Recovery cardio + stretching"),
      block("Work shift", "12:00", "18:00", "work", "Replace with your real shift"),
      block("Evening shower + hair routine", "18:30", "19:00", "care", "Quick rinse and leave-in if sweaty")
    ],
    Thursday: [
      block("Glutes + quads block", "07:30", "09:00", "gym", "Machine work + treadmill finish"),
      block("Skincare reset", "09:05", "09:20", "care", "AM skincare + sunscreen alternative"),
      block("Work shift", "14:00", "21:00", "work", "Replace with your real Starbucks shift")
    ],
    Friday: [
      block("Upper body + posture", "08:00", "09:10", "gym", "Back, shoulders, posture drills"),
      block("Grocery shopping", "10:00", "11:00", "errand", "Aldi run for yogurt, eggs, chicken, blueberries"),
      block("Meal prep + clean kitchen", "11:10", "12:30", "meal", "Cook easy proteins and prep snacks")
    ],
    Saturday: [
      block("Long trainee workout", "09:00", "10:30", "gym", "Dance warm-up, cardio, glutes, abs"),
      block("Deep shower + hair care", "10:35", "11:15", "care", "Scalp focus, body care, detangle"),
      block("Work shift", "13:00", "19:00", "work", "Replace with your real Starbucks shift")
    ],
    Sunday: [
      block("Rest + mobility", "09:30", "10:00", "gym", "Light stretch and reset"),
      block("Weekly reset planning", "10:15", "10:45", "errand", "Review next week, refill blocks"),
      block("Hair oil / ends care", "20:00", "20:15", "care", "Light ends oil only")
    ]
  },
  routines: [
    routine("Morning glow-up", "Start clean and organized", ["Brush teeth for 2 minutes", "Floss or floss picks", "Wash face and apply skincare", "Hair refresh: brush, scalp check, style"]),
    routine("After gym / after work reset", "Keep sweat and buildup under control", ["Shower or quick rinse", "Body lotion / KP care", "Clean clothes and deodorant", "Protein meal or snack"]),
    routine("Night routine", "Protect skin, teeth, and hair", ["Brush teeth", "Floss", "Night skincare", "Silk or satin hair protection / loose braid"])
  ],
  household: [
    { title: "Weekly grocery rhythm", subtitle: "Keep food simple and budget-aware", lines: ["Friday or Sunday: grocery run", "Buy protein, fruit, yogurt, eggs, easy carbs", "Restock shower and skincare basics once weekly"] },
    { title: "Cooking rhythm", subtitle: "Reduce decision fatigue", lines: ["2 larger prep sessions each week", "Cook protein first, then carbs, then snacks", "Pack grab-and-go options after cooking"] }
  ],
  meta: {
    streak: 0,
    lastCheckDate: ""
  }
};

const defaultReminderSettings = {
  eventReminders: false,
  leadMinutes: 10,
  morningTime: "08:00",
  nightTime: "21:15"
};

let state = loadState();
let reminderSettings = loadReminderSettings();
let activeEdit = { day: null, id: null };
let deferredPrompt = null;
let reminderTicker = null;

const weeklyPlanner = document.getElementById("weeklyPlanner");
const routineGroups = document.getElementById("routineGroups");
const householdBlocks = document.getElementById("householdBlocks");
const todayDate = document.getElementById("todayDate");
const focusText = document.getElementById("focusText");
const nextRoutine = document.getElementById("nextRoutine");
const completionText = document.getElementById("completionText");
const todayTimeline = document.getElementById("todayTimeline");
const streakCount = document.getElementById("streakCount");
const reminderStatus = document.getElementById("reminderStatus");
const quickAddForm = document.getElementById("quickAddForm");
const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");
const deleteBlockButton = document.getElementById("deleteBlockButton");
const installButton = document.getElementById("installButton");
const jumpToTodayButton = document.getElementById("jumpToTodayButton");
const enableNotificationsButton = document.getElementById("enableNotificationsButton");
const eventReminderToggle = document.getElementById("eventReminderToggle");
const reminderLeadMinutes = document.getElementById("reminderLeadMinutes");
const morningReminderTime = document.getElementById("morningReminderTime");
const nightReminderTime = document.getElementById("nightReminderTime");
const saveReminderSettingsButton = document.getElementById("saveReminderSettingsButton");
const navButtons = document.querySelectorAll(".nav-btn");
const daySelect = quickAddForm.elements.day;

hydrateControls();
attachEvents();
registerServiceWorker();
render();
startReminderTicker();

function block(title, start, end, category, notes) {
  return { id: crypto.randomUUID(), title, start, end, category, notes };
}

function routine(title, focus, items) {
  return {
    title,
    focus,
    items: items.map((text) => ({ id: crypto.randomUUID(), text, done: false }))
  };
}

function hydrateControls() {
  days.forEach((day) => {
    const option = document.createElement("option");
    option.value = day;
    option.textContent = day;
    daySelect.appendChild(option);
  });
  daySelect.value = todayName();
  eventReminderToggle.checked = reminderSettings.eventReminders;
  reminderLeadMinutes.value = String(reminderSettings.leadMinutes);
  morningReminderTime.value = reminderSettings.morningTime;
  nightReminderTime.value = reminderSettings.nightTime;
  reminderStatus.textContent = reminderSettings.eventReminders ? "On" : "Off";
}

function attachEvents() {
  document.getElementById("resetButton").addEventListener("click", resetPlan);
  document.getElementById("exportButton").addEventListener("click", exportPlan);
  jumpToTodayButton.addEventListener("click", () => switchTab("today"));

  quickAddForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(quickAddForm);
    const day = formData.get("day");
    const newBlock = block(
      formData.get("title"),
      formData.get("start"),
      formData.get("end"),
      formData.get("category"),
      ""
    );
    state.planner[day].push(newBlock);
    state.planner[day].sort(sortByStart);
    persistState();
    quickAddForm.reset();
    daySelect.value = day;
    render();
  });

  editForm.addEventListener("submit", () => {
    const list = state.planner[activeEdit.day];
    const current = list.find((item) => item.id === activeEdit.id);
    if (!current) return;
    current.title = editForm.elements.title.value;
    current.start = editForm.elements.start.value;
    current.end = editForm.elements.end.value;
    current.notes = editForm.elements.notes.value;
    list.sort(sortByStart);
    persistState();
    render();
  });

  deleteBlockButton.addEventListener("click", () => {
    state.planner[activeEdit.day] = state.planner[activeEdit.day].filter((item) => item.id !== activeEdit.id);
    persistState();
    editDialog.close();
    render();
  });

  navButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.classList.remove("hidden");
  });

  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.classList.add("hidden");
  });

  enableNotificationsButton.addEventListener("click", requestNotificationPermission);
  saveReminderSettingsButton.addEventListener("click", saveReminderSettings);
}

function render() {
  ensureStreak();
  renderHeader();
  renderTodayTimeline();
  renderPlanner();
  renderRoutines();
  renderHousehold();
}

function renderHeader() {
  const now = new Date();
  todayDate.textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const todaysBlocks = getTodayBlocks();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = todaysBlocks.find((item) => timeToMinutes(item.end) >= currentMinutes);
  nextRoutine.textContent = upcoming ? `${upcoming.title} • ${formatTime(upcoming.start)}–${formatTime(upcoming.end)}` : "No more blocks today";
  const checklistItems = state.routines.flatMap((group) => group.items);
  const doneCount = checklistItems.filter((item) => item.done).length;
  const percent = checklistItems.length ? Math.round((doneCount / checklistItems.length) * 100) : 0;
  completionText.textContent = `${percent}%`;
  document.querySelector(".ring").style.setProperty("--progress", `${percent}%`);
  focusText.textContent = percent < 40 ? "Build momentum" : percent < 80 ? "Keep your streak going" : "Strong finish today";
  streakCount.textContent = state.meta.streak;
  reminderStatus.textContent = reminderSettings.eventReminders ? "On" : "Off";
}

function renderTodayTimeline() {
  todayTimeline.innerHTML = "";
  const todaysBlocks = getTodayBlocks();
  if (!todaysBlocks.length) {
    todayTimeline.innerHTML = `<div class="timeline-card"><strong>No blocks today</strong><p class="muted">Add a shift, gym session, or routine in the Plan tab.</p></div>`;
    return;
  }

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  todaysBlocks.forEach((item) => {
    const article = document.createElement("article");
    article.className = "timeline-card";
    const stateText = nowMinutes > timeToMinutes(item.end) ? "Done" : nowMinutes >= timeToMinutes(item.start) ? "Now" : "Up next";
    article.innerHTML = `
      <div class="timeline-meta">
        <span class="timeline-tag ${item.category}">${capitalize(item.category)}</span>
        <span class="pill">${stateText}</span>
      </div>
      <strong>${item.title}</strong>
      <div>${formatTime(item.start)} – ${formatTime(item.end)}</div>
      ${item.notes ? `<p class="muted">${item.notes}</p>` : ""}
    `;
    todayTimeline.appendChild(article);
  });
}

function renderPlanner() {
  weeklyPlanner.innerHTML = "";
  days.forEach((day) => {
    const column = document.createElement("article");
    column.className = "day-column";
    column.innerHTML = `<h3>${day}</h3>`;
    const list = document.createElement("div");
    list.className = "block-list";

    state.planner[day].sort(sortByStart).forEach((entry) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `time-block ${entry.category}`;
      card.innerHTML = `
        <strong>${entry.title}</strong>
        <div>${formatTime(entry.start)} – ${formatTime(entry.end)}</div>
        ${entry.notes ? `<div class="note-text">${entry.notes}</div>` : ""}
      `;
      card.addEventListener("click", () => openEdit(day, entry.id));
      list.appendChild(card);
    });

    column.appendChild(list);
    weeklyPlanner.appendChild(column);
  });
}

function renderRoutines() {
  routineGroups.innerHTML = "";
  state.routines.forEach((group, groupIndex) => {
    const card = document.createElement("article");
    card.className = "routine-card";
    card.innerHTML = `<p class="eyebrow">Routine</p><h3>${group.title}</h3><p class="muted">${group.focus}</p>`;
    const checklist = document.createElement("div");
    checklist.className = "checklist";

    group.items.forEach((item, itemIndex) => {
      const row = document.createElement("label");
      row.className = "check-item";
      row.innerHTML = `<input type="checkbox" ${item.done ? "checked" : ""}><span>${item.text}</span>`;
      row.querySelector("input").addEventListener("change", (event) => {
        state.routines[groupIndex].items[itemIndex].done = event.target.checked;
        persistState();
        renderHeader();
      });
      checklist.appendChild(row);
    });

    card.appendChild(checklist);
    routineGroups.appendChild(card);
  });
}

function renderHousehold() {
  householdBlocks.innerHTML = "";
  state.household.forEach((item) => {
    const card = document.createElement("article");
    card.className = "household-card";
    card.innerHTML = `<p class="eyebrow">Life admin</p><h3>${item.title}</h3><p class="muted">${item.subtitle}</p>`;
    const list = document.createElement("div");
    list.className = "checklist";
    item.lines.forEach((line) => {
      const row = document.createElement("div");
      row.className = "check-item";
      row.innerHTML = `<span>${line}</span>`;
      list.appendChild(row);
    });
    card.appendChild(list);
    householdBlocks.appendChild(card);
  });
}

function openEdit(day, id) {
  const current = state.planner[day].find((item) => item.id === id);
  if (!current) return;
  activeEdit = { day, id };
  editForm.elements.title.value = current.title;
  editForm.elements.start.value = current.start;
  editForm.elements.end.value = current.end;
  editForm.elements.notes.value = current.notes || "";
  editDialog.showModal();
}

function resetPlan() {
  if (!confirm("Reset to the sample plan? Your saved edits will be replaced.")) return;
  state = structuredClone(sampleState);
  persistState();
  render();
}

function exportPlan() {
  const data = JSON.stringify({ state, reminderSettings }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "glow-up-time-manager-backup.json";
  link.click();
  URL.revokeObjectURL(url);
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("Notifications are not supported in this browser.");
    return;
  }
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      reminderStatus.textContent = "On";
      showNotification("Glow Up Planner", "Notifications are enabled.");
    }
  });
}

function saveReminderSettings() {
  reminderSettings = {
    eventReminders: eventReminderToggle.checked,
    leadMinutes: Number(reminderLeadMinutes.value),
    morningTime: morningReminderTime.value,
    nightTime: nightReminderTime.value
  };
  localStorage.setItem(reminderStorageKey, JSON.stringify(reminderSettings));
  renderHeader();
  startReminderTicker();
  alert("Reminder settings saved.");
}

function startReminderTicker() {
  if (reminderTicker) clearInterval(reminderTicker);
  reminderTicker = setInterval(checkReminders, 30000);
  checkReminders();
}

function checkReminders() {
  const now = new Date();
  const keyPrefix = now.toISOString().slice(0, 10);
  if (reminderSettings.eventReminders) {
    const lead = reminderSettings.leadMinutes;
    getTodayBlocks().forEach((item) => {
      const startMins = timeToMinutes(item.start);
      const currentMins = now.getHours() * 60 + now.getMinutes();
      if (currentMins >= startMins - lead && currentMins < startMins) {
        const key = `${keyPrefix}-${item.id}-${lead}`;
        if (!sessionStorage.getItem(key)) {
          showNotification(item.title, `${formatTime(item.start)} starts soon`);
          sessionStorage.setItem(key, "1");
        }
      }
    });
  }

  [
    { label: "Morning routine", time: reminderSettings.morningTime },
    { label: "Night routine", time: reminderSettings.nightTime }
  ].forEach((routineReminder) => {
    const key = `${keyPrefix}-${routineReminder.label}-${routineReminder.time}`;
    if (now.getHours() === Number(routineReminder.time.split(":")[0]) && now.getMinutes() === Number(routineReminder.time.split(":")[1])) {
      if (!sessionStorage.getItem(key)) {
        showNotification(routineReminder.label, "Time for your glow-up routine.");
        sessionStorage.setItem(key, "1");
      }
    }
  });
}

function showNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (navigator.serviceWorker?.ready) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body,
        icon: "icon-192.png",
        badge: "icon-192.png"
      });
    }).catch(() => new Notification(title, { body }));
  } else {
    new Notification(title, { body });
  }
}

function switchTab(name) {
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((button) => button.classList.remove("active"));
  document.getElementById(`tab-${name}`).classList.add("active");
  document.querySelector(`.nav-btn[data-tab="${name}"]`).classList.add("active");
}

function ensureStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const checklistItems = state.routines.flatMap((group) => group.items);
  const completedAny = checklistItems.some((item) => item.done);
  if (!completedAny || state.meta.lastCheckDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  state.meta.streak = state.meta.lastCheckDate === yesterday ? state.meta.streak + 1 : 1;
  state.meta.lastCheckDate = today;
  persistState();
}

function getTodayBlocks() {
  return (state.planner[todayName()] || []).slice().sort(sortByStart);
}

function todayName() {
  const dayIndex = new Date().getDay();
  return days[dayIndex === 0 ? 6 : dayIndex - 1];
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(sampleState);
  try { return JSON.parse(saved); } catch { return structuredClone(sampleState); }
}

function loadReminderSettings() {
  const saved = localStorage.getItem(reminderStorageKey);
  if (!saved) return { ...defaultReminderSettings };
  try { return { ...defaultReminderSettings, ...JSON.parse(saved) }; } catch { return { ...defaultReminderSettings }; }
}

function persistState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function sortByStart(a, b) { return a.start.localeCompare(b.start); }
function timeToMinutes(time) { const [h, m] = time.split(":").map(Number); return h * 60 + m; }
function formatTime(time) {
  const [hourText, minute] = time.split(":");
  let hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}
function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}
