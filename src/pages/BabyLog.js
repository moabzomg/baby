import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ACTIONS,
  ACTION_GROUPS,
  MOOD_OPTIONS,
  FEED_ACTIONS,
} from "../utils/actions";
import {
  fmtTimer,
  fmtTime,
  isSameDay,
  getBabyAgeWeeks,
  fmtAgeWeeks,
  getGuide,
} from "../utils/helpers";

export default function BabyLog({
  t,
  lang,
  baby,
  entries,
  addEntry,
  updateEntry,
}) {
  const [editingId, setEditingId] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [activeTimer, setActiveTimer] = useState(null); // { type, startTime }
  const [elapsed, setElapsed] = useState(0);
  const [form, setForm] = useState({
    amountMl: "",
    durationHrs: "",
    durationMin: "",
    durationSec: "",
    time: "",
    note: "",
    mood: "",
    weightG: "",
  });
  const [showForm, setShowForm] = useState(false);
  const rafRef = useRef(null);
  const activeRef = useRef(null);
  activeRef.current = activeTimer;

  // rAF timer
  const tick = useCallback(() => {
    if (activeRef.current) {
      setElapsed(Math.floor((Date.now() - activeRef.current.startTime) / 1000));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (activeTimer) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeTimer, tick]);

  const ageWeeks = getBabyAgeWeeks(baby.date);
  const guide = ageWeeks !== null ? getGuide(ageWeeks) : null;

  // Today's summary
  const todayEntries = entries.filter((e) =>
    isSameDay(e.timestamp, Date.now()),
  );
  const todayFeeds = todayEntries.filter((e) => FEED_ACTIONS.includes(e.type));
  const todayMl = todayFeeds.reduce((s, e) => s + (e.amountMl || 0), 0);
  const todaySleep = todayEntries
    .filter((e) => e.type === "sleep")
    .reduce((s, e) => s + (e.durationSec || 0), 0);
  const todayDiapers = todayEntries.filter((e) =>
    ["pee", "poo", "diaper"].includes(e.type),
  ).length;
  const lastFeedEntry = entries.find((e) => FEED_ACTIONS.includes(e.type));
  const gapMin = lastFeedEntry
    ? Math.floor((Date.now() - lastFeedEntry.timestamp) / 60000)
    : null;
  const warnMins = guide ? parseFloat(guide.freqHours) * 60 : 120;
  const alertMins = warnMins + 60;

  const handleActionTap = (actionId) => {
    const action = ACTIONS[actionId];
    if (activeTimer && activeTimer.type === actionId) {
      // stop active timer
      stopTimer();
      return;
    }
    if (activeTimer) {
      // stop existing timer first
      stopTimer();
    }
    setSelectedAction(actionId);
    if (action.hasTimer) {
      setActiveTimer({ type: actionId, startTime: Date.now() });
      setElapsed(0);
    } else {
      setShowForm(true);
    }
  };
  const handleEditEntry = (e) => {
    const action = ACTIONS[e.type];
    setEditingId(e.id);
    setSelectedAction(e.type);

    // Decompose durationSec into H:M:S
    const h = Math.floor((e.durationSec || 0) / 3600);
    const m = Math.floor(((e.durationSec || 0) % 3600) / 60);
    const s = (e.durationSec || 0) % 60;

    setForm({
      amountMl: e.amountMl || "",
      durationHrs: h > 0 ? String(h) : "",
      durationMin: String(m),
      durationSec: String(s),
      note: e.note || "",
      mood: e.mood || "",
      weightG: e.weightG || "",
      time: new Date(e.timestamp).toTimeString().slice(0, 5),
    });
    setShowForm(true);
  };
  const stopTimer = useCallback(() => {
    const at = activeRef.current;
    if (!at) return;
    cancelAnimationFrame(rafRef.current);

    const totalSeconds = Math.max(
      1,
      Math.floor((Date.now() - at.startTime) / 1000),
    );

    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const formatPreciseDuration = (totalSec, lang) => {
      if (!totalSec) return "";
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      const parts = [];
      if (h > 0) parts.push(`${h}${lang === "zh" ? "時" : "h"}`);
      if (m > 0 || h > 0) parts.push(`${m}${lang === "zh" ? "分" : "m"}`);
      parts.push(`${s}${lang === "zh" ? "秒" : "s"}`);
      return parts.join(" ");
    };
    setActiveTimer(null);
    setElapsed(0);
    setSelectedAction(at.type);

    setForm((f) => ({
      ...f,
      durationHrs: hrs > 0 ? String(hrs) : "",
      durationMin: String(mins),
      durationSec: String(secs),
      time: new Date(at.startTime).toTimeString().slice(0, 5), // Autofill start time
    }));

    setShowForm(true);
    pendingDurRef.current = totalSeconds;
  }, []);

  const pendingDurRef = useRef(null);

  const submitLog = () => {
    if (!selectedAction) return;

    const h = parseInt(form.durationHrs || 0) * 3600;
    const m = parseInt(form.durationMin || 0) * 60;
    const s = parseInt(form.durationSec || 0);
    const finalDuration = h + m + s || null;

    // Handle Custom Time
    const [hrs, mins] = (form.time || "00:00").split(":");
    const targetDate = new Date();
    targetDate.setHours(parseInt(hrs), parseInt(mins), 0, 0);

    const payload = {
      timestamp: targetDate.getTime(),
      type: selectedAction,
      durationSec: finalDuration,
      amountMl: form.amountMl ? parseFloat(form.amountMl) : null,
      note: form.note.trim(),
      mood: form.mood || null,
      weightG: form.weightG ? parseFloat(form.weightG) : null,
    };

    if (editingId) {
      updateEntry(editingId, payload);
    } else {
      addEntry(payload);
    }

    // Reset
    setEditingId(null);
    setShowForm(false);
    setSelectedAction(null);
    setForm({
      amountMl: "",
      durationHrs: "",
      durationMin: "",
      durationSec: "",
      note: "",
      mood: "",
      weightG: "",
      time: "",
    });
  };
  const cancelForm = () => {
    setShowForm(false);
    setSelectedAction(null);
    pendingDurRef.current = null;
    setForm({ amountMl: "", durationMin: "", note: "", mood: "", weightG: "" });
  };

  const action = selectedAction ? ACTIONS[selectedAction] : null;

  return (
    <div className="babylog-layout">
      {/* ── gap banner ── */}
      {gapMin !== null && (
        <div
          className={`banner ${gapMin >= alertMins ? "banner--alert" : gapMin >= warnMins ? "banner--warning" : "banner--normal"}`}
        >
          <span className="banner__icon">🍼</span>
          <div>
            <strong className="banner__title">
              {gapMin >= alertMins
                ? t.feedOverdue
                : gapMin >= warnMins
                  ? t.feedSoon
                  : t.lastFeedRecorded}
            </strong>
            <span className="banner__sub">
              {gapMin < 60
                ? `${gapMin} ${t.minutesAgo}`
                : `${Math.floor(gapMin / 60)}${t.hoursAgo} ${gapMin % 60}min`}
              {guide ? ` · ${t.recommendedEvery} ${guide.freqHours}h` : ""}
            </span>
          </div>
        </div>
      )}

      {/* ── today stats ── */}
      <div className="stats-grid-4">
        <div className="stat">
          <span className="stat__val">{todayFeeds.length}</span>
          <span className="stat__lbl">{t.feedsToday}</span>
        </div>
        <div className="stat">
          <span className="stat__val">
            {todayMl > 0 ? `${todayMl}ml` : "—"}
          </span>
          <span className="stat__lbl">{t.totalMl}</span>
        </div>
        <div className="stat">
          <span className="stat__val">
            {todaySleep > 0
              ? `${Math.round((todaySleep / 3600) * 10) / 10}h`
              : "—"}
          </span>
          <span className="stat__lbl">{lang === "zh" ? "睡眠" : "Sleep"}</span>
        </div>
        <div className="stat">
          <span className="stat__val">{todayDiapers || "—"}</span>
          <span className="stat__lbl">
            {lang === "zh" ? "尿片" : "Diapers"}
          </span>
        </div>
      </div>

      {/* ── active timer display ── */}
      {activeTimer && (
        <div
          className="active-timer-bar"
          style={{ background: ACTIONS[activeTimer.type]?.bg }}
        >
          <span style={{ fontSize: 22 }}>
            {ACTIONS[activeTimer.type]?.emoji}
          </span>
          <span className="active-timer-label">
            {t[ACTIONS[activeTimer.type]?.key]}
          </span>
          <span className="active-timer-clock">{fmtTimer(elapsed)}</span>
          <button className="stop-inline-btn" onPointerUp={stopTimer}>
            ⏹ {t.stopSave}
          </button>
        </div>
      )}

      {/* ── action grid ── */}
      {!showForm && (
        <div className="action-groups">
          {ACTION_GROUPS.map((group) => (
            <div key={group.key} className="action-group">
              <div className="action-group-label">
                {lang === "zh" ? group.labelZh : group.labelEn}
              </div>
              <div className="action-grid">
                {group.actions.map((actionId) => {
                  const a = ACTIONS[actionId];
                  const isActive = activeTimer?.type === actionId;
                  return (
                    <button
                      key={actionId}
                      className={`action-btn ${isActive ? "action-btn--active" : ""}`}
                      style={{ "--action-color": a.color, "--action-bg": a.bg }}
                      onPointerUp={() => handleActionTap(actionId)}
                    >
                      <span className="action-emoji">{a.emoji}</span>
                      <span className="action-label">{t[a.key]}</span>
                      {isActive && (
                        <span className="action-timer-badge">
                          {fmtTimer(elapsed)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── log form ── */}
      {showForm && action && (
        <div className="log-form" style={{ borderColor: action.color }}>
          <div className="log-form-header" style={{ background: action.bg }}>
            <span style={{ fontSize: 24 }}>{action.emoji}</span>
            <span className="log-form-title">{t[action.key]}</span>
          </div>

          {action.hasMl && (
            <div className="field-group">
              <label className="field-label">{t.amountMl}</label>
              <input
                type="number"
                className="field-input"
                placeholder={guide ? guide.bottleMl.split("–")[0] : "90"}
                value={form.amountMl}
                min="0"
                step="5"
                onChange={(e) =>
                  setForm((f) => ({ ...f, amountMl: e.target.value }))
                }
              />
            </div>
          )}
          <div className="field-group">
            <label className="field-label">
              {lang === "zh" ? "記錄時間" : "Record Time"}
            </label>
            <input
              type="time"
              className="field-input"
              value={form.time || new Date().toTimeString().slice(0, 5)}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
          </div>

          {action.hasTimer && (
            <div className="field-group">
              <label className="field-label">
                {lang === "zh" ? "持續時間" : "Duration"}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    className="field-input"
                    placeholder="H"
                    value={form.durationHrs}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, durationHrs: e.target.value }))
                    }
                  />
                  <small style={{ fontSize: "10px", opacity: 0.6 }}>
                    {lang === "zh" ? "時" : "Hrs"}
                  </small>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    className="field-input"
                    placeholder="M"
                    value={form.durationMin}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, durationMin: e.target.value }))
                    }
                  />
                  <small style={{ fontSize: "10px", opacity: 0.6 }}>
                    {lang === "zh" ? "分" : "Min"}
                  </small>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    className="field-input"
                    placeholder="S"
                    value={form.durationSec}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, durationSec: e.target.value }))
                    }
                  />
                  <small style={{ fontSize: "10px", opacity: 0.6 }}>
                    {lang === "zh" ? "秒" : "Sec"}
                  </small>
                </div>
              </div>
            </div>
          )}
          {selectedAction === "weight" && (
            <div className="field-group">
              <label className="field-label">{t.weightG}</label>
              <input
                type="number"
                className="field-input"
                placeholder="3500"
                value={form.weightG}
                min="0"
                step="10"
                onChange={(e) =>
                  setForm((f) => ({ ...f, weightG: e.target.value }))
                }
              />
            </div>
          )}

          {selectedAction === "mood" && (
            <div className="field-group">
              <label className="field-label">{t.mood}</label>
              <div className="mood-grid">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    className={`mood-btn ${form.mood === m.id ? "mood-btn--active" : ""}`}
                    onPointerUp={() => setForm((f) => ({ ...f, mood: m.id }))}
                  >
                    <span style={{ fontSize: 20 }}>{m.emoji}</span>
                    <span>{lang === "zh" ? m.zh : m.en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field-group">
            <label className="field-label">{t.addNote}</label>
            <input
              type="text"
              className="field-input"
              placeholder={lang === "zh" ? "例：睡得很好…" : "e.g. slept well…"}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onPointerUp={cancelForm}>
              {t.cancel}
            </button>
            <button
              className="btn-primary"
              onPointerUp={submitLog}
              style={{ background: action.color }}
            >
              {t.logEntry}
            </button>
          </div>
        </div>
      )}

      {/* ── today's feed guide ── */}
      {guide && !showForm && (
        <div className="guide">
          <h3 className="guide__title">
            {t.feedingGuide} — {t[guide.stageKey]} ·{" "}
            {fmtAgeWeeks(ageWeeks, lang)}
          </h3>
          <div className="guide__rows">
            <div className="guide__row">
              <span>📅</span>
              <span>
                {t.feedEvery} <strong>{guide.freqHours}h</strong> ·{" "}
                <strong>{guide.freqPerDay}×</strong>/day
              </span>
            </div>
            <div className="guide__row">
              <span>🍼</span>
              <span>
                {t.bottlePerFeed}: <strong>{guide.bottleMl}ml</strong>
              </span>
            </div>
            <div className="guide__row">
              <span>🤱</span>
              <span>
                {t.breastPerSide}:{" "}
                <strong>
                  {guide.breastMin} {lang === "zh" ? "分鐘" : "min"}
                </strong>
              </span>
            </div>
            {guide.sleepWake && (
              <div className="guide__row">
                <span>💤</span>
                <span>
                  {t.wakeToFeed} <strong>{guide.sleepWake}h</strong>{" "}
                  {t.wakeToFeedSuffix}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {todayEntries.length > 0 && !showForm && (
        <div className="recent-entries">
          <div className="recent-title">
            {lang === "zh" ? "今天記錄" : "Today's log"}
          </div>
          <ul className="entry-list">
            {/* Sort descending by timestamp */}
            {[...todayEntries]
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, 10)
              .map((e) => {
                const a = ACTIONS[e.type];
                if (!a) return null;
                return (
                  <li
                    key={e.id}
                    className="entry-row entry-row--editable" // Add a class for cursor: pointer
                    style={{ borderLeftColor: a.color, cursor: "pointer" }}
                    onPointerUp={() => handleEditEntry(e)} // <--- Trigger edit
                  >
                    <span className="entry-emoji">{a.emoji}</span>
                    <div className="entry-info">
                      <span className="entry-time">{fmtTime(e.timestamp)}</span>
                      <span className="entry-detail">
                        <strong>{t[a.key]}</strong>
                        {e.durationSec != null &&
                          ` · ${formatPreciseDuration(e.durationSec, lang)}`}
                        {e.amountMl != null && ` · ${e.amountMl}ml`}
                        {e.weightG != null && ` · ${e.weightG}g`}
                        {e.note && <div className="entry-note">{e.note}</div>}
                      </span>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}
