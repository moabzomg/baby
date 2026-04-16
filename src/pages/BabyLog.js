import React, { useState, useMemo } from "react";
import { ACTIONS, ACTION_GROUPS, MOOD_OPTIONS, FEED_ACTIONS, NAPPY_ACTIONS } from "../utils/actions";
import { fmtTime, isSameDay, getBabyAgeWeeks, fmtAgeWeeks, getGuide,
         getSleepIssues, computeSleepDurations, getTempSteps, tempStatus,
         getWeightSteps, getHeightSteps } from "../utils/helpers";

// ── DateTime picker: date + HH MM ────────────────────────────────────────
function DateTimePicker({ value, onChange }) {
  const d = value ? new Date(value) : new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const setTime = (field, delta) => {
    const n = new Date(d);
    if (field === "h") n.setHours((n.getHours() + delta + 24) % 24);
    if (field === "m") n.setMinutes((n.getMinutes() + delta + 60) % 60);
    onChange(n.getTime());
  };
  const setDate = (ds) => {
    const [y,mo,dy] = ds.split('-').map(Number);
    const n = new Date(d);
    n.setFullYear(y, mo-1, dy);
    onChange(n.getTime());
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <input type="date" className="date-input" value={dateStr}
        onChange={e => setDate(e.target.value)} />
      <div className="time-picker">
        <div className="tp-col">
          <button className="tp-arrow" onPointerUp={() => setTime("h", 1)}>▲</button>
          <span className="tp-val">{String(d.getHours()).padStart(2,"0")}</span>
          <button className="tp-arrow" onPointerUp={() => setTime("h", -1)}>▼</button>
        </div>
        <span className="tp-sep">:</span>
        <div className="tp-col">
          <button className="tp-arrow" onPointerUp={() => setTime("m", 5)}>▲</button>
          <span className="tp-val">{String(d.getMinutes()).padStart(2,"0")}</span>
          <button className="tp-arrow" onPointerUp={() => setTime("m", -5)}>▼</button>
        </div>
      </div>
    </div>
  );
}

// ── Quick-select button row ───────────────────────────────────────────────
function QuickButtons({ steps, selected, onSelect, unit }) {
  return (
    <div className="quick-btns">
      {steps.map((v) => (
        <button key={v}
          className={`quick-btn ${selected === v ? "quick-btn--on" : ""}`}
          onPointerUp={() => onSelect(v)}>
          {v}{unit||""}
        </button>
      ))}
    </div>
  );
}

// ── Breastfeed form ───────────────────────────────────────────────────────
const BF_STEPS = [1,2,3,4,5,6,7,8,9,10,12,15,20];
const BF_ORDERS = [
  { id:"none", zh:"無順序", en:"No order" },
  { id:"lr",   zh:"先左後右", en:"L → R" },
  { id:"rl",   zh:"先右後左", en:"R → L" },
];
function BreastfeedForm({ lang, form, setForm }) {
  const zh = lang === "zh";
  return (
    <div className="bf-form">
      <div className="field-group">
        <label className="field-label">{zh?"哺乳側":"Side"}</label>
        <div className="bf-side-row">
          {[["L", zh?"左":"Left"],["R", zh?"右":"Right"]].map(([side, label]) => (
            <button key={side}
              className={`bf-side-btn ${form.bfSides?.includes(side)?"bf-side-btn--on":""}`}
              onPointerUp={() => {
                const cur = form.bfSides||[];
                const next = cur.includes(side) ? cur.filter(s=>s!==side) : [...cur,side];
                setForm(f=>({...f, bfSides:next}));
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {(form.bfSides||[]).includes("L") && (
        <div className="field-group">
          <label className="field-label">{zh?"左邊時長 (分鐘)":"Left duration (min)"}</label>
          <QuickButtons steps={BF_STEPS} selected={form.breastL} onSelect={v=>setForm(f=>({...f,breastL:v}))} unit="m" />
        </div>
      )}
      {(form.bfSides||[]).includes("R") && (
        <div className="field-group">
          <label className="field-label">{zh?"右邊時長 (分鐘)":"Right duration (min)"}</label>
          <QuickButtons steps={BF_STEPS} selected={form.breastR} onSelect={v=>setForm(f=>({...f,breastR:v}))} unit="m" />
        </div>
      )}
      {(form.bfSides||[]).length === 2 && (
        <div className="field-group">
          <label className="field-label">{zh?"順序":"Order"}</label>
          <div className="bf-order-row">
            {BF_ORDERS.map(o=>(
              <button key={o.id}
                className={`bf-order-btn ${form.breastOrder===o.id?"bf-order-btn--on":""}`}
                onPointerUp={()=>setForm(f=>({...f,breastOrder:o.id}))}>
                {zh?o.zh:o.en}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Temperature picker ────────────────────────────────────────────────────
const TEMP_STEPS = getTempSteps();
function TempPicker({ value, onChange }) {
  const status = value ? tempStatus(value) : null;
  const statusColor = { normal:"#22c55e", slight:"#f59e0b", fever:"#ef4444", low:"#60a5fa" };
  return (
    <div className="temp-picker">
      <div className="temp-scroll">
        {TEMP_STEPS.map(t=>(
          <button key={t}
            className={`temp-btn ${value===t?"temp-btn--on":""}`}
            style={value===t?{background:statusColor[tempStatus(t)],color:"#fff",borderColor:statusColor[tempStatus(t)]}:{}}
            onPointerUp={()=>onChange(t)}>
            {t.toFixed(1)}
          </button>
        ))}
      </div>
      {status && (
        <div className="temp-status" style={{color:statusColor[status]}}>
          {status==="normal"?"✓ Normal":status==="slight"?"⚠ Low fever":status==="fever"?"🔴 Fever":"❄ Low temp"}
        </div>
      )}
    </div>
  );
}

// ── Sleep/Wake validation message ─────────────────────────────────────────
function SleepWakeHint({ action, entries, lang }) {
  const zh = lang === "zh";
  const sorted = [...entries].filter(e=>["sleep","wake"].includes(e.type)).sort((a,b)=>a.timestamp-b.timestamp);
  const last = sorted[sorted.length-1];

  if (action === "sleep") {
    if (last?.type === "sleep") {
      return <div className="sleep-hint sleep-hint--warn">
        ⚠ {zh?"上一個記錄也是睡覺，請先記錄醒來！":"Last record is also sleep — log Wake first!"}
      </div>;
    }
    return <div className="sleep-hint sleep-hint--ok">
      ✓ {zh?"記錄睡覺時間":"Log sleep time"}
    </div>;
  }
  if (action === "wake") {
    if (!last || last.type === "wake") {
      return <div className="sleep-hint sleep-hint--warn">
        ⚠ {zh?"沒有睡覺記錄，請先記錄睡覺！":"No sleep record found — log Sleep first!"}
      </div>;
    }
    const dur = Math.floor((Date.now() - last.timestamp) / 60000);
    return <div className="sleep-hint sleep-hint--ok">
      ✓ {zh?`上次睡覺: ${dur < 60 ? dur+"分鐘前" : Math.floor(dur/60)+"h"+dur%60+"m前"}`
           :`Slept ${dur < 60 ? dur+"m ago" : Math.floor(dur/60)+"h"+dur%60+"m ago"}`}
    </div>;
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────
export default function BabyLog({ t, lang, baby, entries, addEntry, deleteEntry }) {
  const now = Date.now();
  const [selectedAction, setSelectedAction] = useState(null);
  const [form, setForm] = useState({
    timestamp: now, bfSides:[], breastL:null, breastR:null, breastOrder:"none",
    amountMl:null, valueNum:null, note:"", mood:"",
  });

  const ageWeeks = getBabyAgeWeeks(baby.date);
  const guide = ageWeeks !== null ? getGuide(ageWeeks) : null;
  const weightSteps = getWeightSteps(ageWeeks || 0);
  const heightSteps = getHeightSteps(ageWeeks || 0);

  const todayEntries = useMemo(
    () => entries.filter(e=>isSameDay(e.timestamp, now)).sort((a,b)=>a.timestamp-b.timestamp),
    [entries, now]
  );
  const sleepIssues = useMemo(() => getSleepIssues(entries), [entries]);
  const sleepDurMap = useMemo(() => computeSleepDurations(entries), [entries]);

  const todayFeeds   = todayEntries.filter(e=>FEED_ACTIONS.includes(e.type));
  const todayMl      = todayFeeds.reduce((s,e)=>s+(e.amountMl||0), 0);
  const todayDiapers = todayEntries.filter(e=>NAPPY_ACTIONS.includes(e.type)).length;
  const sleepPairs   = (() => {
    let lastSleep=null, total=0;
    for (const e of todayEntries) {
      if (e.type==="sleep") lastSleep=e.timestamp;
      if (e.type==="wake" && lastSleep) { total+=e.timestamp-lastSleep; lastSleep=null; }
    }
    return total;
  })();

  const lastFeed  = entries.find(e=>FEED_ACTIONS.includes(e.type));
  const gapMin    = lastFeed ? Math.floor((now-lastFeed.timestamp)/60000) : null;
  const warnMins  = guide ? parseFloat(guide.freqHours)*60 : 120;

  const openForm = (actionId) => {
    setSelectedAction(actionId);
    setForm({ timestamp:Date.now(), bfSides:[], breastL:null, breastR:null, breastOrder:"none", amountMl:null, valueNum:null, note:"", mood:"" });
  };

  const submitLog = () => {
    const a = ACTIONS[selectedAction];
    if (!a) return;
    addEntry({
      timestamp: form.timestamp,
      type: selectedAction,
      amountMl: form.amountMl,
      valueNum: form.valueNum,
      note: form.note?.trim()||"",
      mood: form.mood||null,
      breastL: form.breastL,
      breastR: form.breastR,
      breastOrder: form.breastOrder,
      bfSides: form.bfSides,
    });
    setSelectedAction(null);
  };

  const action = selectedAction ? ACTIONS[selectedAction] : null;
  const zh = lang === "zh";

  const canSubmit = () => {
    if (!selectedAction) return false;
    const a = ACTIONS[selectedAction];
    if (a.inputType==="breastfeed") return (form.bfSides||[]).length>0;
    if (a.inputType==="ml_buttons") return form.amountMl!=null;
    if (a.inputType==="min_buttons") return form.valueNum!=null;
    if (a.inputType==="measurement") return form.valueNum!=null;
    if (a.inputType==="temp") return form.valueNum!=null;
    return true;
  };

  // dynamic steps for weight/height based on age
  const getMeasurementSteps = (id) => {
    if (id==="weight") return weightSteps;
    if (id==="height") return heightSteps;
    return ACTIONS[id]?.steps || [];
  };

  return (
    <div className="babylog-layout">

      {/* ── Gap banner ── */}
      {gapMin !== null && guide && (
        <div className={`banner ${gapMin>=(warnMins+60)?"banner--alert":gapMin>=warnMins?"banner--warning":"banner--normal"}`}>
          <span className="banner__icon">🍼</span>
          <div>
            <strong className="banner__title">
              {gapMin>=(warnMins+60) ? (zh?"餵食已過時！":"Feed overdue!") :
               gapMin>=warnMins      ? (zh?"快要餵食":"Feed soon")          :
                                       (zh?"上次餵食已記錄":"Last feed recorded")}
            </strong>
            <span className="banner__sub">
              {gapMin<60 ? `${gapMin}${zh?"分鐘前":" min ago"}` : `${Math.floor(gapMin/60)}h ${gapMin%60}m`}
              {guide && ` · ${zh?"建議每隔":"Recommended every"} ${guide.freqHours}h`}
            </span>
          </div>
        </div>
      )}

      {/* ── Today stats ── */}
      <div className="stats-grid-4">
        <div className="stat"><span className="stat__val">{todayFeeds.length}</span><span className="stat__lbl">{zh?"餵食":"Feeds"}</span></div>
        <div className="stat"><span className="stat__val">{todayMl>0?`${todayMl}ml`:"—"}</span><span className="stat__lbl">{zh?"奶量":"Milk ml"}</span></div>
        <div className="stat"><span className="stat__val">{sleepPairs>0?`${Math.round(sleepPairs/3600*10)/10}h`:"—"}</span><span className="stat__lbl">{zh?"睡眠":"Sleep"}</span></div>
        <div className="stat"><span className="stat__val">{todayDiapers||"—"}</span><span className="stat__lbl">{zh?"尿片":"Diapers"}</span></div>
      </div>

      {/* ── Action groups ── */}
      {!selectedAction && (
        <div className="action-groups">
          {ACTION_GROUPS.map(group=>(
            <div key={group.key} className="action-group">
              <div className="action-group-label">{zh?group.labelZh:group.labelEn}</div>
              <div className="action-grid">
                {group.actions.map(id=>{
                  const a=ACTIONS[id];
                  return (
                    <button key={id} className="action-btn"
                      style={{"--action-color":a.color,"--action-bg":a.bg}}
                      onPointerUp={()=>openForm(id)}>
                      <span className="action-emoji">{a.emoji}</span>
                      <span className="action-label">{zh?a.labelZh:a.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Log form ── */}
      {selectedAction && action && (
        <div className="log-form" style={{borderColor:action.color}}>
          <div className="log-form-header" style={{background:action.bg}}>
            <span style={{fontSize:24}}>{action.emoji}</span>
            <span className="log-form-title">{zh?action.labelZh:action.labelEn}</span>
            <button className="log-form-close" onPointerUp={()=>setSelectedAction(null)}>✕</button>
          </div>

          {/* Date+Time picker */}
          <div className="field-group" style={{padding:"12px 16px 0"}}>
            <label className="field-label">{zh?"日期及時間":"Date & time"}</label>
            <DateTimePicker value={form.timestamp} onChange={ts=>setForm(f=>({...f,timestamp:ts}))} />
          </div>

          {/* Sleep/wake hint */}
          {action.inputType==="sleep_wake" && (
            <div style={{padding:"8px 16px 0"}}>
              <SleepWakeHint action={selectedAction} entries={entries} lang={lang} />
            </div>
          )}

          {/* Breastfeed */}
          {action.inputType==="breastfeed" && (
            <div style={{padding:"0 16px"}}>
              <BreastfeedForm lang={lang} form={form} setForm={setForm} />
            </div>
          )}

          {/* ml buttons */}
          {action.inputType==="ml_buttons" && (
            <div className="field-group" style={{padding:"12px 16px 0"}}>
              <label className="field-label">{zh?"奶量 (ml)":"Amount (ml)"}</label>
              <QuickButtons steps={action.steps} selected={form.amountMl}
                onSelect={v=>setForm(f=>({...f,amountMl:v}))} unit="ml" />
              <input type="number" className="field-input" style={{marginTop:8}}
                placeholder={zh?"或輸入數量…":"or type amount…"}
                value={form.amountMl??""} min={0} step={5}
                onChange={e=>setForm(f=>({...f,amountMl:e.target.value?parseFloat(e.target.value):null}))} />
            </div>
          )}

          {/* min buttons */}
          {action.inputType==="min_buttons" && (
            <div className="field-group" style={{padding:"12px 16px 0"}}>
              <label className="field-label">{zh?"時長 (分鐘)":"Duration (min)"}</label>
              <QuickButtons steps={action.steps} selected={form.valueNum}
                onSelect={v=>setForm(f=>({...f,valueNum:v}))} unit="min" />
            </div>
          )}

          {/* measurement */}
          {action.inputType==="measurement" && (
            <div className="field-group" style={{padding:"12px 16px 0"}}>
              <label className="field-label">{zh?action.labelZh:action.labelEn} ({action.unit})</label>
              <QuickButtons steps={getMeasurementSteps(selectedAction)} selected={form.valueNum}
                onSelect={v=>setForm(f=>({...f,valueNum:v}))} unit={action.unit} />
              <input type="number" className="field-input" style={{marginTop:8}}
                placeholder={zh?"或輸入…":"or type…"}
                value={form.valueNum??""} step={0.1}
                onChange={e=>setForm(f=>({...f,valueNum:e.target.value?parseFloat(e.target.value):null}))} />
              {selectedAction==="weight" && form.valueNum &&
                <div style={{fontSize:12,color:"var(--text-tertiary)",marginTop:4}}>
                  {form.valueNum>=1000?(form.valueNum/1000).toFixed(2)+" kg":form.valueNum+" g"}
                </div>}
            </div>
          )}

          {/* temperature */}
          {action.inputType==="temp" && (
            <div className="field-group" style={{padding:"12px 16px 0"}}>
              <label className="field-label">{zh?"體溫 (°C)":"Body temperature (°C)"}</label>
              <TempPicker value={form.valueNum} onChange={v=>setForm(f=>({...f,valueNum:v}))} />
            </div>
          )}

          {/* mood */}
          {action.inputType==="mood" && (
            <div className="field-group" style={{padding:"12px 16px 0"}}>
              <label className="field-label">{zh?"心情":"Mood"}</label>
              <div className="mood-grid">
                {MOOD_OPTIONS.map(m=>(
                  <button key={m.id}
                    className={`mood-btn ${form.mood===m.id?"mood-btn--active":""}`}
                    onPointerUp={()=>setForm(f=>({...f,mood:m.id}))}>
                    <span style={{fontSize:20}}>{m.emoji}</span>
                    <span>{zh?m.zh:m.en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note (text types also get a bigger input) */}
          {action.inputType==="text" && (
            <div className="field-group" style={{padding:"12px 16px 0"}}>
              <label className="field-label">{zh?action.labelZh:action.labelEn}</label>
              <input type="text" className="field-input"
                placeholder={zh?"輸入詳情…":"Enter details…"}
                value={form.note}
                onChange={e=>setForm(f=>({...f,note:e.target.value}))} />
            </div>
          )}

          {/* Note field (always shown for non-text types) */}
          {action.inputType!=="text" && (
            <div className="field-group" style={{padding:"12px 16px 0"}}>
              <label className="field-label">{zh?"備注（可選）":"Note (optional)"}</label>
              <input type="text" className="field-input"
                placeholder={zh?"例：睡得很好…":"e.g. slept well…"}
                value={form.note}
                onChange={e=>setForm(f=>({...f,note:e.target.value}))} />
            </div>
          )}

          <div className="form-actions">
            <button className="btn-secondary" onPointerUp={()=>setSelectedAction(null)}>
              {zh?"取消":"Cancel"}
            </button>
            <button className="btn-primary"
              style={{background:canSubmit()?action.color:"#ccc",cursor:canSubmit()?"pointer":"not-allowed",color:"#fff"}}
              onPointerUp={canSubmit()?submitLog:undefined}>
              {zh?"記錄":"Log"}
            </button>
          </div>
        </div>
      )}

      {/* ── Today's log ── */}
      {!selectedAction && todayEntries.length>0 && (
        <div className="recent-entries">
          <div className="recent-title">{zh?"今天記錄":"Today's log"}</div>
          <ul className="entry-list">
            {[...todayEntries].reverse().map(e=>{
              const a=ACTIONS[e.type];
              if (!a) return null;
              const warn = sleepIssues.has(e.id);
              const sleepDur = sleepDurMap.get(e.id);
              let detail="";
              if (e.type==="breastfeed") {
                const parts=[];
                if (e.breastL!=null) parts.push(`L ${e.breastL}m`);
                if (e.breastR!=null) parts.push(`R ${e.breastR}m`);
                detail=parts.join(" / ");
              } else if (e.type==="wake" && sleepDur) {
                detail=`(${Math.floor(sleepDur/3600)}h${Math.floor((sleepDur%3600)/60)}m)`;
              } else if (e.amountMl!=null) detail=`${e.amountMl}ml`;
              else if (e.valueNum!=null) {
                detail = a.unit==="g" && e.valueNum>=1000
                  ? `${(e.valueNum/1000).toFixed(2)}kg`
                  : `${e.valueNum}${a.unit||""}`;
              } else if (e.note) detail=e.note;
              return (
                <li key={e.id} className={`entry-row ${warn?"entry-row--warn":""}`} style={{borderLeftColor:a.color}}>
                  <span className="entry-emoji">{a.emoji}</span>
                  <div className="entry-info">
                    <span className="entry-time">{fmtTime(e.timestamp)}</span>
                    <span className="entry-detail">
                      {zh?a.labelZh:a.labelEn}
                      {detail && ` · ${detail}`}
                      {e.note && detail && ` · ${e.note}`}
                      {warn && <span className="warn-badge"> (!)</span>}
                    </span>
                  </div>
                  <button className="entry-del" onPointerUp={()=>deleteEntry(e.id)}>✕</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Feeding guide ── */}
      {guide && !selectedAction && (
        <div className="guide">
          <h3 className="guide__title">
            {zh?"餵食指南":"Feeding guide"} — {fmtAgeWeeks(ageWeeks, lang)}
          </h3>
          <div className="guide__rows">
            {guide.freqHours !== "—" && (
              <div className="guide__row"><span>📅</span><span>{zh?"每隔":"Every"} <strong>{guide.freqHours}h</strong> · <strong>{guide.freqPerDay}</strong>/day</span></div>
            )}
            {guide.bottleMl !== "—" && (
              <div className="guide__row"><span>🍼</span><span>{zh?"奶瓶":"Bottle"}: <strong>{guide.bottleMl}ml</strong></span></div>
            )}
            {guide.breastMin !== "—" && (
              <div className="guide__row"><span>🤱</span><span>{zh?"母乳":"Breast"}: <strong>{guide.breastMin} {zh?"分鐘":"min"}</strong></span></div>
            )}
            {guide.sleepWake && (
              <div className="guide__row"><span>💤</span><span>{zh?`超過${guide.sleepWake}小時需叫醒餵食`:`Wake to feed if >${guide.sleepWake}h sleep`}</span></div>
            )}
          </div>
          {guide.note && <div className="age-guide-note">{guide.note}</div>}
        </div>
      )}
    </div>
  );
}
