import React, { useState } from "react";
import { ACTIONS, DIAPER_ACTIONS, FEED_ACTIONS } from "../utils/actions";
import { fmtTime, isSameDay, getSleepIssues } from "../utils/helpers";
import { MONTH_NAMES, DAY_NAMES } from "../i18n/translations";

function getDaysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function getFirstDOW(y, m) {
  return new Date(y, m, 1).getDay();
}

function buildCalendar(y, m) {
  const days = getDaysInMonth(y, m),
    first = getFirstDOW(y, m);
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}

function dayIcons(dayEntries) {
  const cats = new Set(
    dayEntries.map((e) => ACTIONS[e.type]?.category).filter(Boolean),
  );
  const icons = [];
  if (cats.has("feed")) icons.push("🍼");
  if (cats.has("sleep")) icons.push("😴");
  if (cats.has("diaper")) icons.push("💧");
  if (cats.has("health")) icons.push("💊");
  return icons.slice(0, 3);
}

export default function Diary({ t, lang, entries, deleteEntry }) {
  const now = new Date();
  const [vy, setVy] = useState(now.getFullYear());
  const [vm, setVm] = useState(now.getMonth());
  const [vd, setVd] = useState(now.getDate());
  const [view, setView] = useState("month");
  const zh = lang === "zh";

  const monthNames = MONTH_NAMES[lang];
  const dayNames = DAY_NAMES[lang];
  const cells = buildCalendar(vy, vm);
  const selTs = new Date(vy, vm, vd).getTime();
  const dayEntries = entries
    .filter((e) => isSameDay(e.timestamp, selTs))
    .sort((a, b) => a.timestamp - b.timestamp);
  const sleepIssues = getSleepIssues(entries);

  const prevMonth = () => {
    if (vm === 0) {
      setVy((y) => y - 1);
      setVm(11);
    } else setVm((m) => m - 1);
  };
  const nextMonth = () => {
    if (vm === 11) {
      setVy((y) => y + 1);
      setVm(0);
    } else setVm((m) => m + 1);
  };

  // Compute sleep durations for timeline
  const sleepDurations = {};
  let lastSleepTs = null;
  for (const e of [...dayEntries].sort((a, b) => a.timestamp - b.timestamp)) {
    if (e.type === "sleep") lastSleepTs = e.timestamp;
    if (e.type === "wake" && lastSleepTs) {
      sleepDurations[e.id] = Math.floor((e.timestamp - lastSleepTs) / 1000);
      lastSleepTs = null;
    }
  }

  // Day chips summary
  const todayFeeds = dayEntries.filter((e) => FEED_ACTIONS.includes(e.type));
  const todayMl = todayFeeds.reduce((s, e) => s + (e.amountMl || 0), 0);
  const todayDiapers = dayEntries.filter((e) =>
    DIAPER_ACTIONS.includes(e.type),
  ).length;
  const sleepSecs = Object.values(sleepDurations).reduce((a, b) => a + b, 0);

  const allMonths = Array.from({ length: 12 }, (_, m) => ({
    m,
    count: entries.filter((e) => {
      const d = new Date(e.timestamp);
      return d.getFullYear() === vy && d.getMonth() === m;
    }).length,
  }));

  return (
    <div className="diary-layout">
      {/* ── Left: calendar ── */}
      <div className="diary-left">
        {/* view switch */}
        <div className="diary-view-switch">
          {["day", "month", "year"].map((v) => (
            <button
              key={v}
              className={`view-switch-btn ${view === v ? "active" : ""}`}
              onPointerUp={() => setView(v)}
            >
              {v === "day"
                ? zh
                  ? "日"
                  : "Day"
                : v === "month"
                  ? zh
                    ? "月"
                    : "Mon"
                  : zh
                    ? "年"
                    : "Year"}
            </button>
          ))}
        </div>

        {/* nav */}
        <div className="cal-nav">
          <button
            className="cal-arrow"
            onPointerUp={() =>
              view === "year" ? setVy((y) => y - 1) : prevMonth()
            }
          >
            ‹
          </button>
          <span className="cal-title">
            {view === "year" ? vy : `${monthNames[vm]} ${vy}`}
          </span>
          <button
            className="cal-arrow"
            onPointerUp={() =>
              view === "year" ? setVy((y) => y + 1) : nextMonth()
            }
          >
            ›
          </button>
        </div>

        {/* year grid */}
        {view === "year" && (
          <div className="year-grid">
            {allMonths.map(({ m, count }) => (
              <button
                key={m}
                className={`year-month-cell ${vm === m ? "selected" : ""}`}
                onPointerUp={() => {
                  setVm(m);
                  setView("month");
                }}
              >
                <span className="ym-name">{monthNames[m].slice(0, 3)}</span>
                {count > 0 && <span className="ym-count">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* month / day calendar */}
        {(view === "month" || view === "day") && (
          <>
            <div className="cal-weekdays">
              {dayNames.map((d) => (
                <span key={d} className="cal-weekday">
                  {d}
                </span>
              ))}
            </div>
            <div className="cal-grid">
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`} />;
                const dEnt = entries.filter((e) =>
                  isSameDay(e.timestamp, new Date(vy, vm, day).getTime()),
                );
                const icons = dayIcons(dEnt);
                const isToday = isSameDay(new Date(vy, vm, day), Date.now());
                const isSel = day === vd;
                return (
                  <button
                    key={day}
                    className={`cal-day ${isToday ? "today" : ""} ${isSel ? "selected" : ""}`}
                    onPointerUp={() => {
                      setVd(day);
                      setView("day");
                    }}
                  >
                    <span className="cal-day-num">{day}</span>
                    {icons.length > 0 && (
                      <span className="cal-day-icons">{icons.join("")}</span>
                    )}
                    {dEnt.length > 0 && <span className="cal-dot" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Right: day detail ── */}
      <div className="diary-right">
        <div className="diary-day-header">
          <span className="diary-day-title">
            {vy}/{String(vm + 1).padStart(2, "0")}/{String(vd).padStart(2, "0")}
          </span>
          <span className="diary-day-count">
            {dayEntries.length} {zh ? "條記錄" : "entries"}
          </span>
        </div>

        {/* summary chips */}
        {dayEntries.length > 0 && (
          <div className="day-summary-chips">
            {todayFeeds.length > 0 && (
              <span className="summary-chip">
                🍼 {todayFeeds.length}
                {todayMl > 0 ? ` · ${todayMl}ml` : ""}
              </span>
            )}
            {sleepSecs > 0 && (
              <span className="summary-chip">
                😴 {Math.round(sleepSecs / 360) / 10}h
              </span>
            )}
            {todayDiapers > 0 && (
              <span className="summary-chip">🩲 {todayDiapers}</span>
            )}
            {sleepIssues.size > 0 &&
              dayEntries.some((e) => sleepIssues.has(e.id)) && (
                <span className="summary-chip summary-chip--warn">
                  ⚠ {zh ? "睡眠異常" : "Sleep issue"}
                </span>
              )}
          </div>
        )}

        {/* timeline */}
        {dayEntries.length === 0 ? (
          <p className="diary-empty">{t.noEntries}</p>
        ) : (
          <ul className="timeline">
            {dayEntries.map((e) => {
              const a = ACTIONS[e.type];
              if (!a) return null;
              const warn = sleepIssues.has(e.id);
              const dur = sleepDurations[e.id];
              let detail = "";
              if (e.type === "breastfeed") {
                const parts = [];
                if (e.breastL != null) parts.push(`L ${e.breastL}m`);
                if (e.breastR != null) parts.push(`R ${e.breastR}m`);
                detail = parts.join(" / ");
              } else if (e.type === "wake" && dur)
                detail = `(${Math.floor(dur / 3600)}h${Math.floor((dur % 3600) / 60)}m)`;
              else if (e.amountMl != null) detail = `${e.amountMl}ml`;
              else if (e.valueNum != null)
                detail = `${e.valueNum}${a.unit || ""}`;

              return (
                <li key={e.id} className="timeline-item">
                  <div className="timeline-line" />
                  <div
                    className="timeline-dot"
                    style={{ background: a.color }}
                  />
                  <div
                    className={`timeline-content ${warn ? "timeline-content--warn" : ""}`}
                  >
                    <div className="tl-header">
                      <span className="tl-emoji">{a.emoji}</span>
                      <span className="tl-name">
                        {zh ? a.labelZh : a.labelEn}
                      </span>
                      {warn && <span className="tl-warn">(!)</span>}
                      <span className="tl-time">{fmtTime(e.timestamp)}</span>
                      <button
                        className="tl-del"
                        onPointerUp={() => deleteEntry(e.id)}
                      >
                        ✕
                      </button>
                    </div>
                    {(detail || e.note) && (
                      <div className="tl-meta">
                        {detail && <span>{detail}</span>}
                        {e.note && <span className="tl-note">"{e.note}"</span>}
                      </div>
                    )}
                    {warn && (
                      <div className="tl-warn-msg">
                        {zh
                          ? "⚠ 睡眠記錄異常，請檢查並修正"
                          : "⚠ Sleep record issue — please review"}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
