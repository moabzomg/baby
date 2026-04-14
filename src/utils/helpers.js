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
export function exportToFormattedText(entries) {
  // Remove lang param or ignore it
  const lines = [];
  const byDay = {};

  entries.forEach((e) => {
    const k = fmtDateKey(e.timestamp);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(e);
  });

  Object.entries(byDay)
    .sort()
    .forEach(([dateKey, dayEntries]) => {
      const dayTs = new Date(dateKey).getTime();
      // Force English Locale for date header
      lines.push(
        new Date(dayTs).toLocaleDateString("en-GB", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      );
      lines.push("");

      const sorted = [...dayEntries].sort((a, b) => a.timestamp - b.timestamp);
      sorted.forEach((e) => {
        const a = ACTIONS[e.type];
        if (!a) return;

        let detail = "";
        if (e.type === "breastfeed") {
          detail = ` L ${e.breastL || 0}m / R ${e.breastR || 0}m`;
        } else if (e.amountMl) {
          detail = ` ${e.amountMl}ml`;
        } else if (e.valueNum) {
          detail = ` ${e.valueNum}${a.unit || ""}`;
        }

        // Always use labelEn
        lines.push(`${fmtTime24(e.timestamp)}   ${a.labelEn}${detail}`);
      });
      lines.push("\n----------\n");
    });

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      !trimmed ||
      trimmed.startsWith("---") ||
      trimmed.startsWith("Total") ||
      trimmed.startsWith("Had") ||
      trimmed.includes("mo )") ||
      trimmed.startsWith("[PiyoLog]") ||
      trimmed.includes("Expressed breast milk")
    )
      continue;

    const dateParsed = Date.parse(trimmed);
    if (!isNaN(dateParsed) && !trimmed.includes(":")) {
      const d = new Date(dateParsed);
      currentDateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      continue;
    }

    const entryMatch = trimmed.match(/^(\d{1,2}:\d{2})\s+([^(]+)(.*)/);

    if (entryMatch) {
      if (!currentDateKey) {
        return {
          error: true,
          line: i + 1,
          content: trimmed,
          reason: "Missing Date Header above this line",
        };
      }

      let [, time, labelPart, extra] = entryMatch;
      const ts = new Date(
        `${currentDateKey}T${time.padStart(5, "0")}`,
      ).getTime();

      let cleanLabel = labelPart
        .trim()
        .replace(/Breastfeeding Breastfeeding/g, "Breastfeeding")
        .replace(/-up/g, " up")
        .replace(/\s*\(!\)\s*$/, "");

      const type = Object.keys(ACTIONS).find((k) => {
        const a = ACTIONS[k];
        const target = cleanLabel.toLowerCase();
        return (
          target === a.labelEn?.toLowerCase() ||
          target.includes(a.labelEn?.toLowerCase()) ||
          (target.includes("expressed breast milk") && k === "ebm") ||
          (target.includes("head size") && k === "head") ||
          (target.includes("chest size") && k === "chest") ||
          (target.includes("body temp") && k === "temp")
        );
      });

      if (type) {
        const entry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: ts,
          type,
        };

        const fullContent = (cleanLabel + extra).toLowerCase();

        const mlMatch = fullContent.match(/(\d+)ml/);
        if (mlMatch) entry.amountMl = Number(mlMatch[1]);

        const valMatch = fullContent.match(/(\d+\.?\d*)\s*(cm|g|°c|kg)/);
        if (valMatch) entry.valueNum = Number(valMatch[1]);

        const bL = fullContent.match(/l\s*(\d+)m/);
        const bR = fullContent.match(/r\s*(\d+)m/);
        if (bL) entry.breastL = Number(bL[1]);
        if (bR) entry.breastR = Number(bR[1]);

        entries.push(entry);
      } else {
        return {
          error: true,
          line: i + 1,
          content: trimmed,
          reason: "Unknown Action label",
        };
      }
    }
  }
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
