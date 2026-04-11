import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

/* ─── helpers ─────────────────────────────────────── */
function fmt(sec) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtTimer(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function fmtClock(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });
}

function avg(arr) {
  if (!arr.length) return null;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function isSameDay(ts1, ts2) {
  const a = new Date(ts1), b = new Date(ts2);
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/* ══════════════════════════════════════════════════ */
/*  LABOR TRACKER                                     */
/* ══════════════════════════════════════════════════ */
function LaborTracker() {
  const [contractions, setContractions] = useState(() => load('lt_contractions', []));
  const [activeStart, setActiveStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef(null);
  const activeStartRef = useRef(null);
  activeStartRef.current = activeStart;

  useEffect(() => {
    localStorage.setItem('lt_contractions', JSON.stringify(contractions));
  }, [contractions]);

  const tick = useCallback(() => {
    setElapsed(Math.floor((Date.now() - activeStartRef.current) / 1000));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (activeStart != null) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [activeStart, tick]);

  const start = () => { setElapsed(0); setActiveStart(Date.now()); };

  const stop = useCallback(() => {
    const t0 = activeStartRef.current;
    if (t0 == null) return;
    cancelAnimationFrame(rafRef.current);
    const duration = Math.max(1, Math.floor((Date.now() - t0) / 1000));
    const entry = { id: Date.now(), startTime: t0, endTime: Date.now(), duration };
    setContractions(prev => [entry, ...prev]);
    setActiveStart(null);
    setElapsed(0);
  }, []);

  const undoLast = () => setContractions(prev => prev.slice(1));
  const deleteOne = (id) => setContractions(prev => prev.filter(c => c.id !== id));
  const clearAll = () => {
    if (window.confirm('Clear all contraction records?')) setContractions([]);
  };

  const getGap = (i) => {
    if (i >= contractions.length - 1) return null;
    return Math.max(0, Math.floor((contractions[i].startTime - contractions[i + 1].endTime) / 1000));
  };
  const getFreq = (i) => {
    if (i >= contractions.length - 1) return null;
    return Math.floor((contractions[i].startTime - contractions[i + 1].startTime) / 1000);
  };

  const recent = contractions.slice(0, 6);
  const avgDur  = avg(recent.map(c => c.duration));
  const avgFreq = avg(recent.map((_, i) => getFreq(i)).filter(v => v != null));

  const get511 = () => {
    if (contractions.length < 3) return 'tracking';
    if (avgFreq <= 300 && avgDur >= 60) return 'alert';
    if (avgFreq <= 420 && avgDur >= 45) return 'warning';
    return 'normal';
  };
  const status = get511();
  const isActive = activeStart != null;

  return (
    <div className="tab-content">
      <div className={`banner banner--${status}`}>
        <span className="banner__icon" aria-hidden="true">
          {status === 'alert' ? '🚨' : status === 'warning' ? '⚠️' : status === 'normal' ? '✓' : '⏱'}
        </span>
        <div>
          <strong className="banner__title">
            {status === 'alert'   ? 'Call your midwife now'       :
             status === 'warning' ? 'Getting closer — stay alert'  :
             status === 'normal'  ? 'Early labour — keep tracking'  :
                                    'Ready to track'}
          </strong>
          <span className="banner__sub">
            {status === 'alert'   ? '5‑1‑1 rule met — time to go to hospital' :
             status === 'warning' ? 'Contractions becoming more regular'        :
             status === 'normal'  ? 'Rest between contractions'                 :
             isActive             ? 'Stop when the contraction ends'            :
                                    'Tap Start when a contraction begins'}
          </span>
        </div>
      </div>

      <div className="timer-area">
        <div className={`timer-display ${isActive ? 'timer-display--active' : ''}`}>
          {fmtTimer(elapsed)}
        </div>
        <p className="timer-sub">{isActive ? 'contraction in progress' : 'waiting'}</p>
      </div>

      <div className="btn-row">
        {!isActive ? (
          <button className="btn-main btn-main--start" onPointerUp={start}>
            Start contraction
          </button>
        ) : (
          <button className="btn-main btn-main--stop" onPointerUp={stop}>
            Stop
          </button>
        )}
        {!isActive && contractions.length > 0 && (
          <button className="btn-undo" onPointerUp={undoLast}>Undo last</button>
        )}
      </div>

      {contractions.length >= 2 && (
        <div className="stats-grid">
          <div className="stat"><span className="stat__val">{contractions.length}</span><span className="stat__lbl">Total</span></div>
          <div className="stat"><span className="stat__val">{fmt(avgDur)}</span><span className="stat__lbl">Avg duration</span></div>
          <div className="stat"><span className="stat__val">{fmt(avgFreq)}</span><span className="stat__lbl">Every</span></div>
        </div>
      )}

      {contractions.length > 0 ? (
        <section className="history">
          <div className="history__head">
            <h2 className="history__title">History</h2>
            <button className="btn-clear" onPointerUp={clearAll}>Clear all</button>
          </div>
          <ul className="history__list">
            {contractions.map((c, i) => {
              const gap = getGap(i), freq = getFreq(i);
              return (
                <li key={c.id} className="c-row">
                  <span className="c-row__num">#{contractions.length - i}</span>
                  <div className="c-row__info">
                    <span className="c-row__clock">{fmtClock(c.startTime)}</span>
                    <span className="c-row__meta">
                      Duration&nbsp;<strong>{fmt(c.duration)}</strong>
                      {gap != null && <>&nbsp;·&nbsp;Gap&nbsp;<strong>{fmt(gap)}</strong></>}
                    </span>
                  </div>
                  {freq != null && <span className="c-row__freq">every {fmt(freq)}</span>}
                  <button className="c-row__del" onPointerUp={() => deleteOne(c.id)} aria-label="Delete">✕</button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        !isActive && <p className="empty">No contractions recorded yet.<br />Tap Start when one begins.</p>
      )}

      <div className="guide">
        <h3 className="guide__title">The 5‑1‑1 rule</h3>
        <div className="guide__rows">
          <div className="guide__row"><span className="guide__n">5</span><span>Contractions every 5 minutes</span></div>
          <div className="guide__row"><span className="guide__n">1</span><span>Each lasting at least 1 minute</span></div>
          <div className="guide__row"><span className="guide__n">1</span><span>Going on for at least 1 hour</span></div>
        </div>
        <p className="guide__note">→ Call your midwife or go to hospital when this pattern is reached.</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════ */
/*  MILK LOG                                          */
/* ══════════════════════════════════════════════════ */
const FEED_TYPES = [
  { id: 'breast_left',  label: 'Left breast',  icon: '◐' },
  { id: 'breast_right', label: 'Right breast', icon: '◑' },
  { id: 'both_breast',  label: 'Both breasts', icon: '◉' },
  { id: 'bottle',       label: 'Bottle',       icon: '🍼' },
  { id: 'formula',      label: 'Formula',      icon: '🥛' },
];

function MilkLog() {
  const [feeds, setFeeds]           = useState(() => load('lt_feeds', []));
  const [feedType, setFeedType]     = useState('breast_left');
  const [amount, setAmount]         = useState('');
  const [duration, setDuration]     = useState('');
  const [note, setNote]             = useState('');
  const [activeFeed, setActiveFeed] = useState(null);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const timerRef = useRef(null);
  const activeRef = useRef(null);
  activeRef.current = activeFeed;

  useEffect(() => {
    localStorage.setItem('lt_feeds', JSON.stringify(feeds));
  }, [feeds]);

  useEffect(() => {
    if (activeFeed) {
      timerRef.current = setInterval(() => {
        setLiveElapsed(Math.floor((Date.now() - activeFeed.startTime) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setLiveElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [activeFeed]);

  const startFeed = () => {
    setActiveFeed({ startTime: Date.now(), type: feedType });
    setAmount('');
    setDuration('');
    setNote('');
  };

  const stopFeed = useCallback(() => {
    const af = activeRef.current;
    if (!af) return;
    clearInterval(timerRef.current);
    const durSec = Math.floor((Date.now() - af.startTime) / 1000);
    const entry = {
      id: Date.now(),
      timestamp: af.startTime,
      type: af.type,
      durationSec: durSec,
      amountMl: null,
      note: '',
    };
    setFeeds(prev => [entry, ...prev]);
    setActiveFeed(null);
  }, []);

  const logManual = () => {
    if (!amount && !duration) return;
    const entry = {
      id: Date.now(),
      timestamp: Date.now(),
      type: feedType,
      durationSec: duration ? parseInt(duration, 10) * 60 : null,
      amountMl: amount ? parseFloat(amount) : null,
      note: note.trim(),
    };
    setFeeds(prev => [entry, ...prev]);
    setAmount('');
    setDuration('');
    setNote('');
  };

  const deleteOne = (id) => setFeeds(prev => prev.filter(f => f.id !== id));
  const clearAll  = () => {
    if (window.confirm('Clear all feed records?')) setFeeds([]);
  };

  const todayFeeds = feeds.filter(f => isSameDay(f.timestamp, Date.now()));
  const todayCount = todayFeeds.length;
  const todayMl    = todayFeeds.reduce((s, f) => s + (f.amountMl || 0), 0);
  const todayMin   = Math.round(todayFeeds.reduce((s, f) => s + (f.durationSec || 0), 0) / 60);

  const lastFeed = feeds[0];
  const gapSinceLastMin = lastFeed
    ? Math.floor((Date.now() - lastFeed.timestamp) / 60000)
    : null;

  const typeInfo = (id) => FEED_TYPES.find(t => t.id === id) || FEED_TYPES[0];

  const grouped = feeds.reduce((acc, f) => {
    const d = fmtDate(f.timestamp);
    if (!acc[d]) acc[d] = [];
    acc[d].push(f);
    return acc;
  }, {});

  const isActive = activeFeed != null;

  return (
    <div className="tab-content">

      {/* gap alert */}
      {gapSinceLastMin != null && !isActive && (
        <div className={`banner ${
          gapSinceLastMin >= 180 ? 'banner--alert' :
          gapSinceLastMin >= 120 ? 'banner--warning' : 'banner--normal'
        }`}>
          <span className="banner__icon">🍼</span>
          <div>
            <strong className="banner__title">
              {gapSinceLastMin >= 180 ? 'Feed overdue!' :
               gapSinceLastMin >= 120 ? 'Feed soon' : 'Last feed recorded'}
            </strong>
            <span className="banner__sub">
              {gapSinceLastMin < 60
                ? `${gapSinceLastMin} minutes ago`
                : `${Math.floor(gapSinceLastMin / 60)}h ${gapSinceLastMin % 60}m ago`}
              {' — newborns feed every 2–3 hours'}
            </span>
          </div>
        </div>
      )}

      {/* today summary */}
      <div className="stats-grid">
        <div className="stat">
          <span className="stat__val">{todayCount}</span>
          <span className="stat__lbl">Feeds today</span>
        </div>
        <div className="stat">
          <span className="stat__val">{todayMl > 0 ? `${todayMl}ml` : '—'}</span>
          <span className="stat__lbl">Total today</span>
        </div>
        <div className="stat">
          <span className="stat__val">{todayMin > 0 ? `${todayMin}m` : '—'}</span>
          <span className="stat__lbl">Time today</span>
        </div>
      </div>

      {/* feed type picker */}
      {!isActive && (
        <div className="feed-types">
          {FEED_TYPES.map(t => (
            <button
              key={t.id}
              className={`feed-type-btn ${feedType === t.id ? 'feed-type-btn--active' : ''}`}
              onPointerUp={() => setFeedType(t.id)}
            >
              <span className="feed-type-icon">{t.icon}</span>
              <span className="feed-type-label">{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* timed feed */}
      <div className="feed-timed-card">
        <p className="feed-card-label">Timed feed</p>
        {isActive ? (
          <>
            <div className="feed-timer-display">{fmtTimer(liveElapsed)}</div>
            <p className="timer-sub" style={{ textAlign: 'center', marginBottom: 16 }}>
              {typeInfo(activeFeed.type).icon} {typeInfo(activeFeed.type).label} in progress…
            </p>
            <div className="btn-row">
              <button className="btn-main btn-main--stop" onPointerUp={stopFeed}>
                Stop &amp; save
              </button>
            </div>
          </>
        ) : (
          <div className="btn-row">
            <button className="btn-main btn-main--milk" onPointerUp={startFeed}>
              Start feeding timer
            </button>
          </div>
        )}
      </div>

      {/* manual log */}
      {!isActive && (
        <div className="manual-card">
          <p className="feed-card-label">Log manually</p>
          <div className="manual-fields">
            <div className="field-group">
              <label className="field-label">Amount (ml)</label>
              <input
                type="number"
                className="field-input"
                placeholder="e.g. 90"
                value={amount}
                min="0"
                step="5"
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Duration (min)</label>
              <input
                type="number"
                className="field-input"
                placeholder="e.g. 15"
                value={duration}
                min="0"
                onChange={e => setDuration(e.target.value)}
              />
            </div>
          </div>
          <div className="field-group" style={{ marginTop: 10 }}>
            <label className="field-label">Note (optional)</label>
            <input
              type="text"
              className="field-input"
              placeholder="e.g. fussy, good latch…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          <button
            className="btn-log"
            onPointerUp={logManual}
            disabled={!amount && !duration}
          >
            Log feed
          </button>
        </div>
      )}

      {/* history */}
      {feeds.length > 0 && (
        <section className="history" style={{ marginTop: 8 }}>
          <div className="history__head">
            <h2 className="history__title">Feed history</h2>
            <button className="btn-clear" onPointerUp={clearAll}>Clear all</button>
          </div>
          {Object.entries(grouped).map(([date, dayFeeds]) => (
            <div key={date} className="feed-day-group">
              <div className="feed-day-label">{date}</div>
              <ul className="history__list">
                {dayFeeds.map(f => {
                  const ti = typeInfo(f.type);
                  return (
                    <li key={f.id} className="c-row">
                      <span className="feed-row-icon">{ti.icon}</span>
                      <div className="c-row__info">
                        <span className="c-row__clock">{fmtTime(f.timestamp)}</span>
                        <span className="c-row__meta">
                          {ti.label}
                          {f.durationSec != null && <>&nbsp;·&nbsp;<strong>{Math.round(f.durationSec / 60)}min</strong></>}
                          {f.amountMl    != null && <>&nbsp;·&nbsp;<strong>{f.amountMl}ml</strong></>}
                          {f.note && <>&nbsp;·&nbsp;{f.note}</>}
                        </span>
                      </div>
                      <button className="c-row__del" onPointerUp={() => deleteOne(f.id)} aria-label="Delete">✕</button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      )}

      {feeds.length === 0 && !isActive && (
        <p className="empty">No feeds recorded yet.<br />Start the timer or log manually above.</p>
      )}

      {/* guide */}
      <div className="guide">
        <h3 className="guide__title">Newborn feeding guide</h3>
        <div className="guide__rows">
          <div className="guide__row"><span className="guide__n" style={{ fontSize: 18 }}>📅</span><span>Feed every <strong>2–3 hours</strong> (8–12 times/day)</span></div>
          <div className="guide__row"><span className="guide__n" style={{ fontSize: 18 }}>⏱</span><span>Breastfeed <strong>10–20 min</strong> per side</span></div>
          <div className="guide__row"><span className="guide__n" style={{ fontSize: 18 }}>🍼</span><span>Bottle: <strong>60–90ml</strong> per feed in first weeks</span></div>
          <div className="guide__row"><span className="guide__n" style={{ fontSize: 18 }}>💤</span><span>Wake baby if sleeping <strong>&gt;4 hours</strong> to feed</span></div>
        </div>
        <p className="guide__note">→ Always follow your midwife or health visitor's advice.</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════ */
/*  ROOT — TAB SHELL                                  */
/* ══════════════════════════════════════════════════ */
export default function App() {
  const [tab, setTab] = useState('labor');

  return (
    <div className="shell">
      <nav className="tab-nav">
        <button
          className={`tab-btn ${tab === 'labor' ? 'tab-btn--active' : ''}`}
          onPointerUp={() => setTab('labor')}
        >
          ⏱ Labor tracker
        </button>
        <button
          className={`tab-btn ${tab === 'milk' ? 'tab-btn--active' : ''}`}
          onPointerUp={() => setTab('milk')}
        >
          🍼 Milk log
        </button>
      </nav>

      {tab === 'labor' ? <LaborTracker /> : <MilkLog />}
    </div>
  );
}
