import { ACTIONS, SLEEP_ACTIONS } from './actions';

export function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Date / time ──────────────────────────────────────────────────────────
export function fmtTimer(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}m`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
export function fmtDuration(sec) {
  if (!sec && sec !== 0) return '';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}
export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
export function fmtTime24(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
export function fmtDateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function fmtDateHeader(ts, lang) {
  return new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-HK' : 'en-GB', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}
export function isSameDay(ts1, ts2) {
  const a = new Date(ts1), b = new Date(ts2);
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
export function isSameMonth(ts1, ts2) {
  const a = new Date(ts1), b = new Date(ts2);
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth();
}
export function getBabyAgeWeeks(birthdayStr) {
  if (!birthdayStr) return null;
  const diff = Date.now() - new Date(birthdayStr).getTime();
  if (diff < 0) return null;
  return Math.floor(diff / (7*24*60*60*1000));
}
export function getBabyAgeMonths(birthdayStr) {
  if (!birthdayStr) return null;
  const diff = Date.now() - new Date(birthdayStr).getTime();
  if (diff < 0) return null;
  return diff / (30.44*24*3600*1000);
}
export function fmtAgeWeeks(w, lang) {
  if (w === null || w === undefined) return '';
  if (lang === 'zh') {
    if (w < 4) return `${w}週`;
    const months = Math.floor(w/4.33);
    const rem = Math.round(w - months*4.33);
    if (months < 24) return rem > 0 ? `${months}個月${rem}週` : `${months}個月`;
    const y = Math.floor(months/12), rm = months%12;
    return rm > 0 ? `${y}歲${rm}個月` : `${y}歲`;
  } else {
    if (w < 4) return `${w}w old`;
    const months = Math.floor(w/4.33);
    const rem = Math.round(w - months*4.33);
    if (months < 24) return rem > 0 ? `${months}m ${rem}w old` : `${months}mo old`;
    const y = Math.floor(months/12), rm = months%12;
    return rm > 0 ? `${y}y ${rm}m old` : `${y}y old`;
  }
}

// ── Sleep validation ─────────────────────────────────────────────────────
// Enhanced: returns Set of entry ids with issues, and issue type
export function getSleepIssues(entries) {
  const issues = new Set();
  // Sort ALL entries by time, only look at sleep/wake
  const sorted = [...entries]
    .filter(e => SLEEP_ACTIONS.includes(e.type))
    .sort((a, b) => a.timestamp - b.timestamp);

  let sleeping = false; // are we currently in a sleep state?

  for (const e of sorted) {
    if (e.type === 'sleep') {
      if (sleeping) {
        // Double sleep — previous sleep never got a wake
        issues.add(e.id);
      }
      sleeping = true;
    } else if (e.type === 'wake') {
      if (!sleeping) {
        // Wake without prior sleep
        issues.add(e.id);
      }
      sleeping = false;
    }
  }
  return issues;
}

// Compute sleep durations: returns Map<wakeEntryId, durationSec>
export function computeSleepDurations(entries) {
  const sorted = [...entries]
    .filter(e => SLEEP_ACTIONS.includes(e.type))
    .sort((a, b) => a.timestamp - b.timestamp);

  const durations = new Map();
  let lastSleepTs = null;

  for (const e of sorted) {
    if (e.type === 'sleep') {
      lastSleepTs = e.timestamp;
    } else if (e.type === 'wake' && lastSleepTs !== null) {
      const dur = Math.floor((e.timestamp - lastSleepTs) / 1000);
      durations.set(e.id, dur);
      lastSleepTs = null;
    }
  }
  return durations;
}

// Compute sleep segments for a day [{ start, end, type:'sleep'|'wake' }]
export function getDaySleepSegments(dayEntries) {
  const sorted = [...dayEntries]
    .filter(e => SLEEP_ACTIONS.includes(e.type))
    .sort((a,b) => a.timestamp - b.timestamp);

  const segments = [];
  let lastSleep = null;
  const dayStart = new Date(dayEntries[0]?.timestamp || Date.now());
  dayStart.setHours(0,0,0,0);
  const dayEnd = dayStart.getTime() + 86400000;

  for (const e of sorted) {
    if (e.type === 'sleep') {
      lastSleep = e.timestamp;
    } else if (e.type === 'wake' && lastSleep) {
      segments.push({ start: lastSleep, end: e.timestamp, type: 'sleep' });
      lastSleep = null;
    }
  }
  // Still sleeping at end of day
  if (lastSleep) segments.push({ start: lastSleep, end: dayEnd, type: 'sleep' });
  return segments;
}

// ── Temperature ──────────────────────────────────────────────────────────
export function getTempSteps() {
  const steps = [];
  for (let t = 360; t <= 420; t++) steps.push(t/10);
  return steps;
}
export function tempStatus(t) {
  if (t < 36.0) return 'low';
  if (t <= 37.5) return 'normal';
  if (t <= 38.5) return 'slight';
  return 'fever';
}

// ── Age guide — 0 to 18 years ────────────────────────────────────────────
export const AGE_GUIDES = [
  { maxWeeks:1,   stageKey:'ageStage0', freqHours:'1.5–3', freqPerDay:'8–12', bottleMl:'30–60',  breastMin:'8–12',     sleepWake:3,  note:'Colostrum first. Wake to feed if sleeping >3h.' },
  { maxWeeks:4,   stageKey:'ageStage1', freqHours:'2–3',   freqPerDay:'8–12', bottleMl:'60–90',  breastMin:'10–20',    sleepWake:4,  note:'Milk supply establishing. Feed on demand.' },
  { maxWeeks:8,   stageKey:'ageStage2', freqHours:'2–4',   freqPerDay:'6–8',  bottleMl:'90–120', breastMin:'10–20',    sleepWake:4,  note:'Growth spurts at 3 and 6 weeks — more feeding normal.' },
  { maxWeeks:16,  stageKey:'ageStage3', freqHours:'3–4',   freqPerDay:'5–6',  bottleMl:'120–150',breastMin:'10–15',    sleepWake:5,  note:'Feeds becoming more efficient. Longer night stretches possible.' },
  { maxWeeks:26,  stageKey:'ageStage4', freqHours:'3–5',   freqPerDay:'4–6',  bottleMl:'150–180',breastMin:'10–15',    sleepWake:6,  note:'May show interest in solid food. Wait until 6 months.' },
  { maxWeeks:39,  stageKey:'ageStage5', freqHours:'4–5',   freqPerDay:'3–5',  bottleMl:'180–230',breastMin:'5–10',     sleepWake:null,note:'Introducing solids. Offer milk before solids.' },
  { maxWeeks:52,  stageKey:'ageStage6', freqHours:'4–6',   freqPerDay:'3–4',  bottleMl:'180–230',breastMin:'5–10',     sleepWake:null,note:'3 meals/day. Transitioning toward family foods.' },
  { maxWeeks:104, stageKey:'ageStage7', freqHours:'on demand',freqPerDay:'2–3',bottleMl:'120–180',breastMin:'as desired',sleepWake:null,note:'Cow\'s milk from 12m. Breastfeed as long as desired.' },
  { maxWeeks:156, stageKey:'ageStage8', freqHours:'—',     freqPerDay:'3 meals',bottleMl:'150–200',breastMin:'—',       sleepWake:null,note:'Toddler. 3 main meals, 2 snacks. ~500ml dairy/day.' },
  { maxWeeks:260, stageKey:'ageStage9', freqHours:'—',     freqPerDay:'3 meals',bottleMl:'—',     breastMin:'—',        sleepWake:null,note:'Preschool age. Varied diet. Limit sugary drinks.' },
  { maxWeeks:520, stageKey:'ageStage10',freqHours:'—',     freqPerDay:'3 meals',bottleMl:'—',     breastMin:'—',        sleepWake:null,note:'School age. 3 meals + snacks. Encourage water.' },
  { maxWeeks:Infinity,stageKey:'ageStage11',freqHours:'—', freqPerDay:'3 meals',bottleMl:'—',     breastMin:'—',        sleepWake:null,note:'Adolescent. Increased nutritional needs for growth.' },
];
export function getGuide(w) {
  return AGE_GUIDES.find(g => w <= g.maxWeeks) || AGE_GUIDES[AGE_GUIDES.length-1];
}

// ── Weight/height steps for older children ───────────────────────────────
export function getWeightSteps(ageWeeks) {
  if (ageWeeks < 52)  return [2000,2500,3000,3500,4000,4500,5000,5500,6000,7000,8000,9000,10000];
  if (ageWeeks < 104) return Array.from({length:31},(_,i)=>(8+i)*1000); // 8kg–38kg
  if (ageWeeks < 260) return Array.from({length:41},(_,i)=>(10+i)*1000);
  return Array.from({length:61},(_,i)=>(20+i)*1000); // 20kg–80kg
}
export function getHeightSteps(ageWeeks) {
  if (ageWeeks < 52) return [45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,62,64,66,68,70,72,74,76,78,80];
  if (ageWeeks < 156) return Array.from({length:41},(_,i)=>60+i);
  if (ageWeeks < 520) return Array.from({length:61},(_,i)=>90+i);
  return Array.from({length:61},(_,i)=>120+i);
}

// ── Export: formatted text log ───────────────────────────────────────────
export function exportToFormattedText(entries, lang) {
  const byDay = {};
  entries.forEach(e => {
    const k = fmtDateKey(e.timestamp);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(e);
  });

  const sleepIssues = getSleepIssues(entries);
  const lines = [];

  for (const [dateKey, dayEntries] of Object.entries(byDay).sort()) {
    const dayTs = new Date(dateKey).getTime();
    lines.push(fmtDateHeader(dayTs, lang));
    lines.push('');

    const sorted = [...dayEntries].sort((a,b) => a.timestamp-b.timestamp);

    // Compute sleep durations
    const sleepDurMap = computeSleepDurations(sorted);

    for (const e of sorted) {
      const a = ACTIONS[e.type];
      if (!a) continue;
      const warn = sleepIssues.has(e.id) ? ' ( ! )' : '';
      let detail = '';

      if (e.type === 'breastfeed') {
        const parts = [];
        if (e.breastL != null) parts.push(`L ${e.breastL}m`);
        if (e.breastR != null) parts.push(`R ${e.breastR}m`);
        detail = parts.length ? ` ${parts.join(' / ')}` : ' Breastfeeding';
      } else if (e.type === 'wake' && sleepDurMap.has(e.id)) {
        detail = ` (${fmtDuration(sleepDurMap.get(e.id))})`;
      } else if (e.amountMl != null) {
        detail = ` ${e.amountMl}ml`;
      } else if (e.valueNum != null) {
        const unit = a.unit === 'g' ? (e.valueNum >= 1000 ? `${(e.valueNum/1000).toFixed(2)}kg` : `${e.valueNum}g`) : `${e.valueNum}${a.unit||''}`;
        detail = ` ${unit}`;
      } else if (e.note) {
        detail = ` ${e.note}`;
      }

      const label = lang === 'zh' ? a.labelZh : a.labelEn;
      lines.push(`${fmtTime24(e.timestamp)}   ${label}${detail}${warn}`);
    }

    // Day totals
    lines.push('');
    const bf = sorted.filter(e=>e.type==='breastfeed');
    const totalBfL = bf.reduce((s,e)=>s+(e.breastL||0),0);
    const totalBfR = bf.reduce((s,e)=>s+(e.breastR||0),0);
    lines.push(`Total Breastfeeding time L ${totalBfL}m / R ${totalBfR}m`);
    const fmls = sorted.filter(e=>['formula','bottle','ebm'].includes(e.type));
    const fmlMl = fmls.reduce((s,e)=>s+(e.amountMl||0),0);
    lines.push(`Had formula ${fmls.length}times ${fmlMl}ml`);
    let sleepTotal = 0;
    sleepDurMap.forEach(v => sleepTotal += v);
    const sleepH = Math.floor(sleepTotal/3600), sleepM = Math.floor((sleepTotal%3600)/60);
    lines.push(`Total sleep ${sleepH}h${sleepM}m`);
    const pees = sorted.filter(e=>['pee','pee_poo'].includes(e.type)).length;
    const poos = sorted.filter(e=>['poo','pee_poo'].includes(e.type)).length;
    lines.push(`Pee ${pees}times`);
    lines.push(`Poop ${poos}times`);
    lines.push('');
    lines.push('----------');
  }
  return lines.join('\n');
}

export function exportToCSV(entries) {
  const header = ['Date','Time','Action','BF_L_min','BF_R_min','BF_order','Amount_ml','Value','Unit','Note','Mood'];
  const rows = entries.map(e => {
    const a = ACTIONS[e.type];
    return [fmtDateKey(e.timestamp),fmtTime24(e.timestamp),e.type,e.breastL??'',e.breastR??'',e.breastOrder??'',e.amountMl??'',e.valueNum??'',a?.unit??'',(e.note||'').replace(/,/g,';'),e.mood??''];
  });
  downloadFile([header,...rows].map(r=>r.join(',')).join('\n'),'baby-diary.csv','text/csv');
}
export function exportToJSON(entries, baby) {
  downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),baby,entries},null,2),'baby-diary.json','application/json');
}
export function importFromJSON(jsonStr) {
  const data = JSON.parse(jsonStr);
  return { entries: data.entries||[], baby: data.baby||null };
}
function downloadFile(content, filename, type) {
  const blob = new Blob([content],{type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Import from CSV ───────────────────────────────────────────────────────
export function importFromCSV(csvStr) {
  try {
    const lines = csvStr.trim().split('\n');
    if (lines.length < 2) return { entries: [], error: null };
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dateIdx  = header.findIndex(h => h.includes('date'));
    const timeIdx  = header.findIndex(h => h.includes('time'));
    const typeIdx  = header.findIndex(h => h === 'action' || h === 'type');
    const mlIdx    = header.findIndex(h => h.includes('amount') || h.includes('ml'));
    const valIdx   = header.findIndex(h => h === 'value');
    const noteIdx  = header.findIndex(h => h.includes('note'));
    const bfLIdx   = header.findIndex(h => h.includes('bf_l'));
    const bfRIdx   = header.findIndex(h => h.includes('bf_r'));

    const entries = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 3) continue;
      const dateStr = cols[dateIdx]?.trim();
      const timeStr = cols[timeIdx]?.trim() || '00:00';
      const type    = cols[typeIdx]?.trim();
      if (!dateStr || !type) continue;
      const ts = new Date(`${dateStr}T${timeStr}`).getTime();
      if (isNaN(ts)) continue;
      entries.push({
        id: ts + Math.random(),
        timestamp: ts,
        type,
        amountMl:  mlIdx >= 0 && cols[mlIdx]?.trim()  ? parseFloat(cols[mlIdx]) : null,
        valueNum:  valIdx >= 0 && cols[valIdx]?.trim() ? parseFloat(cols[valIdx]) : null,
        note:      noteIdx >= 0 ? (cols[noteIdx]?.trim() || '') : '',
        breastL:   bfLIdx >= 0 && cols[bfLIdx]?.trim() ? parseFloat(cols[bfLIdx]) : null,
        breastR:   bfRIdx >= 0 && cols[bfRIdx]?.trim() ? parseFloat(cols[bfRIdx]) : null,
      });
    }
    return { entries };
  } catch (err) {
    return { error: true, line: 0, content: '', reason: err.message };
  }
}

// ── Import from PiyoLog / formatted text ─────────────────────────────────
// Supports the full PiyoLog export format including all action types
export function importFromFormattedText(text) {
  try {
    const lines = text.trim().split('\n');
    const entries = [];
    let currentDate = null;

    // PiyoLog label → internal action type
    const LABEL_MAP = {
      'sleep': 'sleep', '睡覺': 'sleep',
      'wake-up': 'wake', 'wake up': 'wake', '醒來': 'wake',
      'breastfeeding': 'breastfeed', 'breast feeding': 'breastfeed', '母乳': 'breastfeed',
      'formula': 'formula', '配方奶': 'formula',
      'expressed breast milk': 'ebm', 'ebm': 'ebm', '母乳儲存': 'ebm',
      'pumping': 'pumping', '泵奶': 'pumping',
      'bottle': 'bottle', '奶瓶': 'bottle',
      'solid food': 'solid', 'solid': 'solid', '固體食物': 'solid',
      'snack': 'snack', '小食': 'snack',
      'meal': 'meal', '正餐': 'meal',
      'drink': 'drink', '飲品': 'drink',
      'pee': 'wet', '小便': 'wet',
      'poop': 'soiled', '大便': 'soiled',
      'pee+poop': 'mixed', '大小便': 'mixed',
      'change': 'change', '換尿片': 'change',
      'weight': 'weight', '體重': 'weight',
      'height': 'height', '身高': 'height',
      'head size': 'head', '頭圍': 'head',
      'chest size': 'chest', '胸圍': 'chest',
      'body temp': 'temp', 'body temperature': 'temp', '體溫': 'temp',
      'cough': 'cough', '咳嗽': 'cough',
      'vomit': 'vomit', '嘔吐': 'vomit',
      'rash': 'rash', '皮疹': 'rash',
      'injury': 'injury', '受傷': 'injury',
      'hospital': 'hospital', '求診': 'hospital',
      'vaccine': 'vaccine', '疫苗': 'vaccine',
      'medicine': 'medicine', '藥物': 'medicine',
      'walks': 'walk', 'walk': 'walk', '散步': 'walk',
      'baths': 'bath', 'bath': 'bath', '洗澡': 'bath',
      'tummy time': 'tummy', '趴趴時間': 'tummy',
      'milestone': 'milestone', '里程碑': 'milestone',
    };

    function resolveType(label) {
      const l = label.toLowerCase().trim();
      // Exact match first
      if (LABEL_MAP[l]) return LABEL_MAP[l];
      // Partial match
      for (const [k, v] of Object.entries(LABEL_MAP)) {
        if (l.startsWith(k) || l.includes(k)) return v;
      }
      return 'note';
    }

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();

      // Skip blank, separators, totals, PiyoLog header
      if (!line || line.startsWith('---') || line.startsWith('[Piyo') ||
          line.startsWith('Total') || line.startsWith('Had formula') ||
          line.startsWith('Expressed breast') || line.startsWith('Pee ') ||
          line.startsWith('Poop ')) continue;

      // Date header patterns:
      // "Mon, Apr 13, 2026"  /  "Mon, Apr 13, 2026\nhh (0 mo 12 d)"
      const dateMatch = line.match(/^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat),?\s+(\w+\s+\d+,?\s+\d{4})/i)
        || line.match(/^(\d{4}-\d{2}-\d{2})$/);
      if (dateMatch) {
        const parsed = new Date(dateMatch[1].replace(',',''));
        if (!isNaN(parsed.getTime())) { currentDate = parsed; continue; }
      }
      // Also handle "Apr 2026" month header
      if (line.match(/^\w+\s+\d{4}$/)) continue;
      // Skip "hh (0 mo X d)" lines
      if (line.match(/^hh\s*\(/)) continue;
      if (!currentDate) continue;

      // Entry line: "HH:MM   Label  detail"
      const entryMatch = line.match(/^(\d{1,2}):(\d{2})\s+(.+)/);
      if (!entryMatch) continue;

      const [, hh, mm, rest] = entryMatch;
      const clean = rest.replace(/\s*\(!?\)\s*/g, '').trim();

      const ts = new Date(currentDate);
      ts.setHours(parseInt(hh), parseInt(mm), 0, 0);

      // Parse amounts: "50ml", "37.2°C", "50.0cm", "5.00kg"
      const mlMatch    = clean.match(/(\d+(?:\.\d+)?)\s*ml/i);
      const tempMatch  = clean.match(/(\d+(?:\.\d+)?)\s*°?C/i);
      const cmMatch    = clean.match(/(\d+(?:\.\d+)?)\s*cm/i);
      const kgMatch    = clean.match(/(\d+(?:\.\d+)?)\s*kg/i);
      const gMatch     = clean.match(/(\d+(?:\.\d+)?)\s*g(?!\w)/i);
      const bfLMatch   = clean.match(/L\s*(\d+)m/i);
      const bfRMatch   = clean.match(/R\s*(\d+)m/i);

      // Strip value from label to identify action
      const labelOnly = clean
        .replace(/(\d+(?:\.\d+)?\s*(?:ml|°?C|cm|kg|g(?!\w)))/gi, '')
        .replace(/L\s*\d+m\s*\/\s*R\s*\d+m/i, '')
        .replace(/L\s*\d+m/i, '')
        .replace(/R\s*\d+m/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      const type = resolveType(labelOnly);

      let valueNum = null;
      if (tempMatch)   valueNum = parseFloat(tempMatch[1]);
      else if (cmMatch) valueNum = parseFloat(cmMatch[1]);
      else if (kgMatch) valueNum = parseFloat(kgMatch[1]) * 1000; // store as grams
      else if (gMatch)  valueNum = parseFloat(gMatch[1]);

      entries.push({
        id: ts.getTime() + Math.random(),
        timestamp: ts.getTime(),
        type,
        amountMl: mlMatch ? parseFloat(mlMatch[1]) : null,
        valueNum,
        breastL: bfLMatch ? parseInt(bfLMatch[1]) : null,
        breastR: bfRMatch ? parseInt(bfRMatch[1]) : null,
        bfSides: (bfLMatch || bfRMatch) ? [bfLMatch?'L':null, bfRMatch?'R':null].filter(Boolean) : [],
        note: '',
        mood: null,
      });
    }

    return { entries };
  } catch (err) {
    return { error: true, line: 0, content: '', reason: err.message };
  }
}
