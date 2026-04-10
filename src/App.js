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

function avg(arr) {
  if (!arr.length) return null;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

/* ─── main component ──────────────────────────────── */
export default function App() {
  const [contractions, setContractions] = useState(() => load('lt_contractions', []));
  const [activeStart, setActiveStart] = useState(null); // ms timestamp or null
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef(null);

  /* persist */
  useEffect(() => {
    localStorage.setItem('lt_contractions', JSON.stringify(contractions));
  }, [contractions]);

  /* rAF-based timer — avoids setInterval drift and keeps the button
     fully interactive (no closure over stale state) */
  const tick = useCallback(() => {
    setElapsed(e => {
      const next = Math.floor((Date.now() - activeStart) / 1000);
      return next !== e ? next : e;
    });
    rafRef.current = requestAnimationFrame(tick);
  }, [activeStart]);

  useEffect(() => {
    if (activeStart != null) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeStart, tick]);

  /* ── actions ── */
  const start = () => {
    setElapsed(0);
    setActiveStart(Date.now());
  };

  /* stopRef lets the stop handler always see the latest activeStart
     without being re-created — solves the "can't press stop" bug
     caused by stale closures over activeStart in event handlers */
  const activeStartRef = useRef(null);
  activeStartRef.current = activeStart;

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

  const undoLast = () => {
    setContractions(prev => prev.slice(1));
  };

  const deleteOne = (id) => {
    setContractions(prev => prev.filter(c => c.id !== id));
  };

  const clearAll = () => {
    if (window.confirm('Clear all contraction records?')) {
      setContractions([]);
    }
  };

  /* ── derived values ── */
  const getGap = (i) => {
    if (i >= contractions.length - 1) return null;
    return Math.max(0, Math.floor((contractions[i].startTime - contractions[i + 1].endTime) / 1000));
  };

  const getFreq = (i) => {
    if (i >= contractions.length - 1) return null;
    return Math.floor((contractions[i].startTime - contractions[i + 1].startTime) / 1000);
  };

  const recent = contractions.slice(0, 6);
  const recentDurs = recent.map(c => c.duration);
  const recentFreqs = recent.map((_, i) => getFreq(i)).filter(v => v != null);
  const avgDur  = avg(recentDurs);
  const avgFreq = avg(recentFreqs);

  /* 5-1-1 status */
  const get511 = () => {
    if (contractions.length < 3) return 'tracking';
    if (avgFreq <= 300 && avgDur >= 60) return 'alert';
    if (avgFreq <= 420 && avgDur >= 45) return 'warning';
    return 'normal';
  };
  const status = get511();

  const isActive = activeStart != null;

  /* ─── render ─── */
  return (
    <div className="shell">

      {/* ── status banner ── */}
      <div className={`banner banner--${status}`}>
        <span className="banner__icon" aria-hidden="true">
          {status === 'alert'    ? '🚨' :
           status === 'warning'  ? '⚠️' :
           status === 'normal'   ? '✓'  : '⏱'}
        </span>
        <div>
          <strong className="banner__title">
            {status === 'alert'   ? 'Call your midwife now'      :
             status === 'warning' ? 'Getting closer — stay alert' :
             status === 'normal'  ? 'Early labour — keep tracking':
                                    'Ready to track'}
          </strong>
          <span className="banner__sub">
            {status === 'alert'   ? '5‑1‑1 rule met — time to go to hospital' :
             status === 'warning' ? 'Contractions becoming more regular'       :
             status === 'normal'  ? 'Rest between contractions'                :
             isActive             ? 'Stop when the contraction ends'           :
                                    'Tap Start when a contraction begins'}
          </span>
        </div>
      </div>

      {/* ── timer ── */}
      <div className="timer-area">
        <div className={`timer-display ${isActive ? 'timer-display--active' : ''}`}>
          {fmtTimer(elapsed)}
        </div>
        <p className="timer-sub">
          {isActive ? 'contraction in progress' : 'waiting'}
        </p>
      </div>

      {/* ── START / STOP button ──
          Key insight: we render ONE button with changing label/style.
          No z-index stacking or overlay elements near it. The button
          always occupies the same DOM position so touch targets never
          shift mid-gesture. onPointerUp fires before onTouchEnd and
          isn't blocked by scroll momentum — crucial on mobile. */}
      <div className="btn-row">
        {!isActive ? (
          <button
            className="btn-main btn-main--start"
            onPointerUp={start}
          >
            Start contraction
          </button>
        ) : (
          <button
            className="btn-main btn-main--stop"
            onPointerUp={stop}
          >
            Stop
          </button>
        )}

        {!isActive && contractions.length > 0 && (
          <button className="btn-undo" onPointerUp={undoLast}>
            Undo last
          </button>
        )}
      </div>

      {/* ── stats ── */}
      {contractions.length >= 2 && (
        <div className="stats-grid">
          <div className="stat">
            <span className="stat__val">{contractions.length}</span>
            <span className="stat__lbl">Total</span>
          </div>
          <div className="stat">
            <span className="stat__val">{fmt(avgDur)}</span>
            <span className="stat__lbl">Avg duration</span>
          </div>
          <div className="stat">
            <span className="stat__val">{fmt(avgFreq)}</span>
            <span className="stat__lbl">Every</span>
          </div>
        </div>
      )}

      {/* ── history ── */}
      {contractions.length > 0 ? (
        <section className="history">
          <div className="history__head">
            <h2 className="history__title">History</h2>
            <button className="btn-clear" onPointerUp={clearAll}>Clear all</button>
          </div>

          <ul className="history__list">
            {contractions.map((c, i) => {
              const gap  = getGap(i);
              const freq = getFreq(i);
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
                  {freq != null && (
                    <span className="c-row__freq">every {fmt(freq)}</span>
                  )}
                  <button
                    className="c-row__del"
                    onPointerUp={() => deleteOne(c.id)}
                    aria-label="Delete"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        !isActive && (
          <p className="empty">No contractions recorded yet.<br />Tap Start when one begins.</p>
        )
      )}

      {/* ── 5-1-1 guide ── */}
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
