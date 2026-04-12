export function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function fmtTimer(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function fmtDateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function isSameDay(ts1, ts2) {
  const a = new Date(ts1), b = new Date(ts2);
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function isSameMonth(ts1, ts2) {
  const a = new Date(ts1), b = new Date(ts2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function getBabyAgeWeeks(birthdayStr) {
  if (!birthdayStr) return null;
  const diff = Date.now() - new Date(birthdayStr).getTime();
  if (diff < 0) return null;
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

export function fmtAgeWeeks(w, lang) {
  if (w === null || w === undefined) return '';
  if (lang === 'zh') {
    if (w < 4) return `${w}週`;
    const months = Math.floor(w / 4.33);
    const remWeeks = Math.round(w - months * 4.33);
    if (months < 12) return remWeeks > 0 ? `${months}個月${remWeeks}週` : `${months}個月`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths > 0 ? `${years}歲${remMonths}個月` : `${years}歲`;
  } else {
    if (w < 4) return `${w}w old`;
    const months = Math.floor(w / 4.33);
    const remWeeks = Math.round(w - months * 4.33);
    if (months < 12) return remWeeks > 0 ? `${months}m ${remWeeks}w old` : `${months}mo old`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths > 0 ? `${years}y ${remMonths}m old` : `${years}y old`;
  }
}

export function exportToCSV(entries) {
  const header = ['Date','Time','Action','Duration(sec)','Amount(ml)','Note','Mood','Weight'];
  const rows = entries.map(e => [
    fmtDateKey(e.timestamp),
    fmtTime(e.timestamp),
    e.type,
    e.durationSec ?? '',
    e.amountMl ?? '',
    (e.note || '').replace(/,/g, ';'),
    e.mood ?? '',
    e.weightG ?? '',
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  downloadFile(csv, 'baby-diary.csv', 'text/csv');
}

export function exportToJSON(entries, babyInfo) {
  const data = { exportedAt: new Date().toISOString(), babyInfo, entries };
  downloadFile(JSON.stringify(data, null, 2), 'baby-diary.json', 'application/json');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// feeding guide data
export const AGE_GUIDES = [
  { maxWeeks: 1,        stageKey: 'ageStage0', freqHours: '1.5–3', freqPerDay: '8–12', bottleMl: '30–60', breastMin: '8–12',  sleepWake: 3 },
  { maxWeeks: 4,        stageKey: 'ageStage1', freqHours: '2–3',   freqPerDay: '8–12', bottleMl: '60–90', breastMin: '10–20', sleepWake: 4 },
  { maxWeeks: 8,        stageKey: 'ageStage2', freqHours: '2–4',   freqPerDay: '6–8',  bottleMl: '90–120',breastMin: '10–20', sleepWake: 4 },
  { maxWeeks: 16,       stageKey: 'ageStage3', freqHours: '3–4',   freqPerDay: '5–6',  bottleMl: '120–150',breastMin: '10–15',sleepWake: 5 },
  { maxWeeks: 26,       stageKey: 'ageStage4', freqHours: '3–5',   freqPerDay: '4–6',  bottleMl: '150–180',breastMin: '10–15',sleepWake: 6 },
  { maxWeeks: 39,       stageKey: 'ageStage5', freqHours: '4–5',   freqPerDay: '3–5',  bottleMl: '180–230',breastMin: '5–10', sleepWake: null },
  { maxWeeks: 52,       stageKey: 'ageStage6', freqHours: '4–6',   freqPerDay: '3–4',  bottleMl: '180–230',breastMin: '5–10', sleepWake: null },
  { maxWeeks: Infinity, stageKey: 'ageStage7', freqHours: 'on demand', freqPerDay: '2–3', bottleMl: '120–180', breastMin: 'as desired', sleepWake: null },
];

export function getGuide(ageWeeks) {
  return AGE_GUIDES.find(g => ageWeeks <= g.maxWeeks) || AGE_GUIDES[AGE_GUIDES.length - 1];
}
