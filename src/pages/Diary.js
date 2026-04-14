import React, { useState } from 'react';
import { ACTIONS, FEED_ACTIONS } from '../utils/actions';
import { fmtTime, fmtDateKey, isSameDay } from '../utils/helpers';
import { MONTH_NAMES, DAY_NAMES } from '../i18n/translations';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function buildCalendar(year, month) {
  const days = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}

function getSummaryForDay(entries, year, month, day) {
  const ts = new Date(year, month, day).getTime();
  return entries.filter(e => isSameDay(e.timestamp, ts));
}

function getDaySummaryIcons(dayEntries) {
  const cats = new Set(dayEntries.map(e => ACTIONS[e.type]?.category).filter(Boolean));
  const icons = [];
  if (cats.has('feed'))    icons.push('🍼');
  if (cats.has('sleep'))   icons.push('😴');
  if (cats.has('diaper'))  icons.push('🩲');
  if (cats.has('activity'))icons.push('🐛');
  if (cats.has('health'))  icons.push('💊');
  return icons.slice(0, 3);
}

export default function Diary({ t, lang, entries, deleteEntry }) {
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [view, setView] = useState('month'); // month | day | year

  const monthNames = MONTH_NAMES[lang];
  const dayNames   = DAY_NAMES[lang];

  const cells = buildCalendar(viewYear, viewMonth);
  const selectedTs = new Date(viewYear, viewMonth, selectedDay).getTime();
  const dayEntries = entries.filter(e => isSameDay(e.timestamp, selectedTs))
    .sort((a, b) => a.timestamp - b.timestamp);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Year view: month blocks
  const allMonths = Array.from({ length: 12 }, (_, m) => {
    const count = entries.filter(e => {
      const d = new Date(e.timestamp);
      return d.getFullYear() === viewYear && d.getMonth() === m;
    }).length;
    return { month: m, count };
  });

  return (
    <div className="diary-layout">

      {/* ── left panel: calendar ── */}
      <div className="diary-left">

        {/* view switcher */}
        <div className="diary-view-switch">
          {['day','month','year'].map(v => (
            <button key={v} className={`view-switch-btn ${view === v ? 'active' : ''}`}
              onPointerUp={() => setView(v)}>
              {v === 'day'   ? (lang === 'zh' ? '日' : 'Day')   :
               v === 'month' ? (lang === 'zh' ? '月' : 'Month') :
                               (lang === 'zh' ? '年' : 'Year')}
            </button>
          ))}
        </div>

        {/* nav header */}
        <div className="cal-nav">
          <button className="cal-arrow" onPointerUp={() => { view === 'year' ? setViewYear(y => y-1) : prevMonth(); }}>‹</button>
          <span className="cal-title">
            {view === 'year' ? viewYear : `${monthNames[viewMonth]} ${viewYear}`}
          </span>
          <button className="cal-arrow" onPointerUp={() => { view === 'year' ? setViewYear(y => y+1) : nextMonth(); }}>›</button>
        </div>

        {/* YEAR VIEW */}
        {view === 'year' && (
          <div className="year-grid">
            {allMonths.map(({ month, count }) => (
              <button key={month} className={`year-month-cell ${viewMonth === month ? 'selected' : ''}`}
                onPointerUp={() => { setViewMonth(month); setView('month'); }}>
                <span className="ym-name">{monthNames[month].slice(0,3)}</span>
                {count > 0 && <span className="ym-count">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* MONTH VIEW */}
        {view === 'month' && (
          <>
            <div className="cal-weekdays">
              {dayNames.map(d => <span key={d} className="cal-weekday">{d}</span>)}
            </div>
            <div className="cal-grid">
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`} />;
                const dayEnt = getSummaryForDay(entries, viewYear, viewMonth, day);
                const icons  = getDaySummaryIcons(dayEnt);
                const isToday = isSameDay(new Date(viewYear, viewMonth, day), Date.now());
                const isSel   = day === selectedDay;
                return (
                  <button key={day} className={`cal-day ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`}
                    onPointerUp={() => { setSelectedDay(day); setView('day'); }}>
                    <span className="cal-day-num">{day}</span>
                    {icons.length > 0 && (
                      <span className="cal-day-icons">{icons.join('')}</span>
                    )}
                    {dayEnt.length > 0 && <span className="cal-dot" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* DAY VIEW mini in left panel */}
        {view === 'day' && (
          <div className="day-mini-nav">
            <div className="cal-weekdays">
              {dayNames.map(d => <span key={d} className="cal-weekday">{d}</span>)}
            </div>
            <div className="cal-grid">
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`} />;
                const dayEnt = getSummaryForDay(entries, viewYear, viewMonth, day);
                const isToday = isSameDay(new Date(viewYear, viewMonth, day), Date.now());
                const isSel   = day === selectedDay;
                return (
                  <button key={day} className={`cal-day ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`}
                    onPointerUp={() => setSelectedDay(day)}>
                    <span className="cal-day-num">{day}</span>
                    {dayEnt.length > 0 && <span className="cal-dot" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── right panel: day detail ── */}
      <div className="diary-right">
        <div className="diary-day-header">
          <span className="diary-day-title">
            {viewYear}/{String(viewMonth+1).padStart(2,'0')}/{String(selectedDay).padStart(2,'0')}
          </span>
          <span className="diary-day-count">
            {dayEntries.length} {lang === 'zh' ? '條記錄' : 'entries'}
          </span>
        </div>

        {/* day summary chips */}
        {dayEntries.length > 0 && (
          <div className="day-summary-chips">
            {['feed','sleep','diaper','activity','health'].map(cat => {
              const catEnt = dayEntries.filter(e => ACTIONS[e.type]?.category === cat);
              if (!catEnt.length) return null;
              const catAction = Object.values(ACTIONS).find(a => a.category === cat);
              return (
                <span key={cat} className="summary-chip">
                  {catAction?.emoji} {catEnt.length}
                  {cat === 'feed' && catEnt.reduce((s, e) => s + (e.amountMl||0), 0) > 0 &&
                    ` · ${catEnt.reduce((s,e) => s+(e.amountMl||0),0)}ml`}
                  {cat === 'sleep' && catEnt.reduce((s,e) => s+(e.durationSec||0),0) > 0 &&
                    ` · ${Math.round(catEnt.reduce((s,e)=>s+(e.durationSec||0),0)/360)/10}h`}
                </span>
              );
            })}
          </div>
        )}

        {/* timeline */}
        {dayEntries.length === 0 ? (
          <p className="diary-empty">{t.noEntries}</p>
        ) : (
          <ul className="timeline">
            {dayEntries.map((e, idx) => {
              const a = ACTIONS[e.type];
              if (!a) return null;
              return (
                <li key={e.id} className="timeline-item">
                  <div className="timeline-line" />
                  <div className="timeline-dot" style={{ background: a.color }} />
                  <div className="timeline-content">
                    <div className="tl-header">
                      <span className="tl-emoji">{a.emoji}</span>
                      <span className="tl-name">{t[a.key]}</span>
                      <span className="tl-time">{fmtTime(e.timestamp)}</span>
                      <button className="tl-del" onPointerUp={() => deleteEntry(e.id)}>✕</button>
                    </div>
                    <div className="tl-meta">
                      {e.durationSec != null && <span>{Math.round(e.durationSec/60)}{lang==='zh'?'分':'min'}</span>}
                      {e.amountMl    != null && <span>{e.amountMl}ml</span>}
                      {e.weightG     != null && <span>{e.weightG}g</span>}
                      {e.mood        != null && <span>{e.mood}</span>}
                      {e.note && <span className="tl-note">"{e.note}"</span>}
                    </div>
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
