import { ACTIONS, SLEEP_ACTIONS } from "./actions";

export function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ── Date / time ──────────────────────────────────────────────────────────
export function fmtTimer(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function fmtDuration(sec) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function fmtTime24(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
export function fmtDateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function fmtDateHeader(ts, lang) {
  return new Date(ts).toLocaleDateString(lang === "zh" ? "zh-HK" : "en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
export function isSameDay(ts1, ts2) {
  const a = new Date(ts1),
    b = new Date(ts2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
export function isSameMonth(ts1, ts2) {
  const a = new Date(ts1),
    b = new Date(ts2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
export function getBabyAgeWeeks(birthdayStr) {
  if (!birthdayStr) return null;
  const diff = Date.now() - new Date(birthdayStr).getTime();
  if (diff < 0) return null;
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}
export function fmtAgeWeeks(w, lang) {
  if (w === null || w === undefined) return "";
  if (lang === "zh") {
    if (w < 4) return `${w}週`;
    const months = Math.floor(w / 4.33);
    const rem = Math.round(w - months * 4.33);
    if (months < 12) return rem > 0 ? `${months}個月${rem}週` : `${months}個月`;
    const y = Math.floor(months / 12),
      rm = months % 12;
    return rm > 0 ? `${y}歲${rm}個月` : `${y}歲`;
  } else {
    if (w < 4) return `${w}w old`;
    const months = Math.floor(w / 4.33);
    const rem = Math.round(w - months * 4.33);
    if (months < 12)
      return rem > 0 ? `${months}m ${rem}w old` : `${months}mo old`;
    const y = Math.floor(months / 12),
      rm = months % 12;
    return rm > 0 ? `${y}y ${rm}m old` : `${y}y old`;
  }
}

// ── Sleep validation ─────────────────────────────────────────────────────
// Returns array of entry ids that have issues
export function getSleepIssues(entries) {
  const issues = new Set();
  const sleepEntries = entries
    .filter((e) => SLEEP_ACTIONS.includes(e.type))
    .sort((a, b) => a.timestamp - b.timestamp);

  let lastSleep = null;
  let lastWake = null;

  for (const e of sleepEntries) {
    if (e.type === "sleep") {
      // Double sleep without wake
      if (lastSleep && !lastWake) issues.add(e.id);
      lastSleep = e;
      lastWake = null;
    } else if (e.type === "wake") {
      // Wake without prior sleep
      if (!lastSleep) issues.add(e.id);
      // Double wake
      if (lastWake) issues.add(e.id);
      lastWake = e;
    }
  }
  return issues;
}

// ── Feeding age guide ────────────────────────────────────────────────────
export const AGE_GUIDES = [
  {
    maxWeeks: 1,
    stageKey: "ageStage0",
    freqHours: "1.5–3",
    freqPerDay: "8–12",
    bottleMl: "30–60",
    breastMin: "8–12",
    sleepWake: 3,
  },
  {
    maxWeeks: 4,
    stageKey: "ageStage1",
    freqHours: "2–3",
    freqPerDay: "8–12",
    bottleMl: "60–90",
    breastMin: "10–20",
    sleepWake: 4,
  },
  {
    maxWeeks: 8,
    stageKey: "ageStage2",
    freqHours: "2–4",
    freqPerDay: "6–8",
    bottleMl: "90–120",
    breastMin: "10–20",
    sleepWake: 4,
  },
  {
    maxWeeks: 16,
    stageKey: "ageStage3",
    freqHours: "3–4",
    freqPerDay: "5–6",
    bottleMl: "120–150",
    breastMin: "10–15",
    sleepWake: 5,
  },
  {
    maxWeeks: 26,
    stageKey: "ageStage4",
    freqHours: "3–5",
    freqPerDay: "4–6",
    bottleMl: "150–180",
    breastMin: "10–15",
    sleepWake: 6,
  },
  {
    maxWeeks: 39,
    stageKey: "ageStage5",
    freqHours: "4–5",
    freqPerDay: "3–5",
    bottleMl: "180–230",
    breastMin: "5–10",
    sleepWake: null,
  },
  {
    maxWeeks: 52,
    stageKey: "ageStage6",
    freqHours: "4–6",
    freqPerDay: "3–4",
    bottleMl: "180–230",
    breastMin: "5–10",
    sleepWake: null,
  },
  {
    maxWeeks: Infinity,
    stageKey: "ageStage7",
    freqHours: "demand",
    freqPerDay: "2–3",
    bottleMl: "120–180",
    breastMin: "desired",
    sleepWake: null,
  },
];
export function getGuide(w) {
  return (
    AGE_GUIDES.find((g) => w <= g.maxWeeks) || AGE_GUIDES[AGE_GUIDES.length - 1]
  );
}

// ── Temperature helpers ──────────────────────────────────────────────────
export function getTempSteps() {
  const steps = [];
  for (let t = 360; t <= 420; t++) steps.push(t / 10);
  return steps;
}
export function tempStatus(t) {
  if (t < 36.0) return "low";
  if (t <= 37.5) return "normal";
  if (t <= 38.5) return "slight";
  return "fever";
}

// ── Export ───────────────────────────────────────────────────────────────
export function exportToFormattedText(entries, lang) {
  // Group by day
  const byDay = {};
  entries.forEach((e) => {
    const k = fmtDateKey(e.timestamp);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(e);
  });

  const sleepIssues = getSleepIssues(entries);
  const lines = [];

  for (const [dateKey, dayEntries] of Object.entries(byDay).sort()) {
    const dayTs = new Date(dateKey).getTime();
    lines.push(fmtDateHeader(dayTs, lang));
    lines.push("");

    // Sort by time
    const sorted = [...dayEntries].sort((a, b) => a.timestamp - b.timestamp);

    // Find sleep durations
    let lastSleepTs = null;
    const sleepDurations = {};
    for (const e of sorted) {
      if (e.type === "sleep") lastSleepTs = e.timestamp;
      if (e.type === "wake" && lastSleepTs) {
        sleepDurations[e.id] = Math.floor((e.timestamp - lastSleepTs) / 1000);
      }
    }

    for (const e of sorted) {
      const a = ACTIONS[e.type];
      if (!a) continue;
      const warn = sleepIssues.has(e.id) ? " ( ! )" : "";
      let detail = "";

      if (e.type === "breastfeed") {
        const parts = [];
        if (e.breastL != null) parts.push(`L ${e.breastL}m`);
        if (e.breastR != null) parts.push(`R ${e.breastR}m`);
        detail = parts.length ? ` ${parts.join(" / ")}` : " Breastfeeding";
      } else if (e.type === "wake" && sleepDurations[e.id]) {
        detail = ` (${fmtDuration(sleepDurations[e.id])})`;
      } else if (e.amountMl != null) {
        detail = ` ${e.amountMl}ml`;
      } else if (e.valueNum != null) {
        detail = ` ${e.valueNum}${a.unit || ""}`;
      } else if (e.note) {
        detail = ` ${e.note}`;
      }

      const label = lang === "zh" ? a.labelZh : a.labelEn;
      lines.push(`${fmtTime24(e.timestamp)}   ${label}${detail}${warn}`);
    }

    // Day totals
    lines.push("");
    const feeds = sorted.filter((e) => e.type === "breastfeed");
    const totalBfL = feeds.reduce((s, e) => s + (e.breastL || 0), 0);
    const totalBfR = feeds.reduce((s, e) => s + (e.breastR || 0), 0);
    lines.push(`Total Breastfeeding time L ${totalBfL}m / R ${totalBfR}m`);

    const fmls = sorted.filter((e) =>
      ["formula", "bottle", "ebm"].includes(e.type),
    );
    const fmlMl = fmls.reduce((s, e) => s + (e.amountMl || 0), 0);
    lines.push(`Had formula ${fmls.length}times ${fmlMl}ml`);

    const sleepSecs = Object.values(sleepDurations).reduce((a, b) => a + b, 0);
    const sleepH = Math.floor(sleepSecs / 3600),
      sleepM = Math.floor((sleepSecs % 3600) / 60);
    lines.push(`Total sleep ${sleepH}h${sleepM}m`);

    const pees = sorted.filter((e) =>
      ["pee", "pee_poo"].includes(e.type),
    ).length;
    const poos = sorted.filter((e) =>
      ["poo", "pee_poo"].includes(e.type),
    ).length;
    lines.push(`Pee ${pees}times`);
    lines.push(`Poop ${poos}times`);
    lines.push("");
    lines.push("----------");
  }

  return lines.join("\n");
}

export function exportToCSV(entries) {
  const header = [
    "Date",
    "Time",
    "Action",
    "BF_L_min",
    "BF_R_min",
    "BF_order",
    "Amount_ml",
    "Value",
    "Unit",
    "Note",
    "Mood",
  ];
  const rows = entries.map((e) => {
    const a = ACTIONS[e.type];
    return [
      fmtDateKey(e.timestamp),
      fmtTime24(e.timestamp),
      e.type,
      e.breastL ?? "",
      e.breastR ?? "",
      e.breastOrder ?? "",
      e.amountMl ?? "",
      e.valueNum ?? "",
      a?.unit ?? "",
      (e.note || "").replace(/,/g, ";"),
      e.mood ?? "",
    ];
  });
  downloadFile(
    [header, ...rows].map((r) => r.join(",")).join("\n"),
    "baby-diary.csv",
    "text/csv",
  );
}

export function exportToJSON(entries, baby) {
  downloadFile(
    JSON.stringify(
      { exportedAt: new Date().toISOString(), baby, entries },
      null,
      2,
    ),
    "baby-diary.json",
    "application/json",
  );
}

export function importFromJSON(jsonStr) {
  const data = JSON.parse(jsonStr);
  return { entries: data.entries || [], baby: data.baby || null };
}

export function importFromCSV(csvText) {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return { entries: [] };

  const headers = lines[0].split(",");
  const entries = lines.slice(1).map((line) => {
    const values = line.split(",");
    const entry = {};
    headers.forEach((header, i) => {
      const val = values[i]?.replace(/"/g, "").trim();
      // Restore Date/Time to timestamp
      if (header === "Date") entry._date = val;
      if (header === "Time") entry._time = val;
      // Convert numeric strings back to numbers
      entry[header] = val === "" || isNaN(val) ? val : Number(val);
    });

    // Reconstruct timestamp from CSV Date and Time columns
    entry.timestamp = new Date(`${entry._date}T${entry._time}`).getTime();
    entry.type = entry.Action; // Map CSV "Action" back to "type"
    delete entry._date;
    delete entry._time;
    delete entry.Action;
    return entry;
  });
  return { entries };
}

export function importFromFormattedText(text) {
  const entries = [];
  const lines = text.split("\n");
  let currentDateKey = null;

  lines.forEach((line) => {
    // Detect Date Header (e.g., "2026-04-14")
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      currentDateKey = dateMatch[1];
      return;
    }

    // Detect Entry Line (e.g., "14:30   Milk 120ml")
    const entryMatch = line.match(/^(\d{2}:\d{2})\s+([^\s]+)(.*)/);
    if (entryMatch && currentDateKey) {
      const [, time, label, details] = entryMatch;
      const ts = new Date(`${currentDateKey}T${time}`).getTime();

      // Reverse lookup type by label
      const type = Object.keys(ACTIONS).find(
        (k) => ACTIONS[k].labelEn === label || ACTIONS[k].labelZh === label,
      );

      if (type) {
        const entry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: ts,
          type,
        };
        // Basic detail extraction (ml)
        const mlMatch = details.match(/(\d+)ml/);
        if (mlMatch) entry.amountMl = Number(mlMatch[1]);
        entries.push(entry);
      }
    }
  });
  return { entries };
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
