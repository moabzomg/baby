import React, { useState, useEffect, useRef, useCallback } from 'react';
import { load, save, fmtTimer } from '../utils/helpers';

function fmt(sec) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtClock(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function avg(arr) {
  if (!arr.length) return null;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

export default function LaborTracker({ t }) {
  const [contractions, setContractions] = useState(() => load('lt_contractions', []));
  const [activeStart, setActiveStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef(null);
  const activeStartRef = useRef(null);
  activeStartRef.current = activeStart;

  useEffect(() => { save('lt_contractions', contractions); }, [contractions]);

  const tick = useCallback(() => {
    setElapsed(Math.floor((Date.now() - activeStartRef.current) / 1000));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (activeStart != null) { rafRef.current = requestAnimationFrame(tick); }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [activeStart, tick]);

  const start = () => { setElapsed(0); setActiveStart(Date.now()); };

  const stop = useCallback(() => {
    const t0 = activeStartRef.current;
    if (t0 == null) return;
    cancelAnimationFrame(rafRef.current);
    const duration = Math.max(1, Math.floor((Date.now() - t0) / 1000));
    setContractions(prev => [{ id: Date.now(), startTime: t0, endTime: Date.now(), duration }, ...prev]);
    setActiveStart(null);
    setElapsed(0);
  }, []);

  const undoLast = () => setContractions(prev => prev.slice(1));
  const deleteOne = (id) => setContractions(prev => prev.filter(c => c.id !== id));
  const clearAll = () => { if (window.confirm(t.clearAll + '?')) setContractions([]); };

  const getGap  = (i) => { if (i >= contractions.length-1) return null; return Math.max(0, Math.floor((contractions[i].startTime - contractions[i+1].endTime)/1000)); };
  const getFreq = (i) => { if (i >= contractions.length-1) return null; return Math.floor((contractions[i].startTime - contractions[i+1].startTime)/1000); };

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
        <span className="banner__icon">
          {status==='alert' ? '🚨' : status==='warning' ? '⚠️' : status==='normal' ? '✓' : '⏱'}
        </span>
        <div>
          <strong className="banner__title">
            {status==='alert'   ? t.callMidwife    :
             status==='warning' ? t.gettingCloser   :
             status==='normal'  ? t.earlyLabor      :
             isActive           ? t.contractionActive : t.readyToTrack}
          </strong>
          <span className="banner__sub">
            {status==='alert'   ? t.callMidwifeSub    :
             status==='warning' ? t.gettingCloserSub   :
             status==='normal'  ? t.earlyLaborSub      :
             isActive           ? t.contractionActiveSub : t.readyToTrackSub}
          </span>
        </div>
      </div>

      <div className="timer-area">
        <div className={`timer-display ${isActive ? 'timer-display--active' : ''}`}>{fmtTimer(elapsed)}</div>
        <p className="timer-sub">{isActive ? t.inProgress : t.waiting}</p>
      </div>

      <div className="btn-row">
        {!isActive
          ? <button className="btn-main btn-main--start" onPointerUp={start}>{t.startContraction}</button>
          : <button className="btn-main btn-main--stop"  onPointerUp={stop}>{t.stopContraction}</button>}
        {!isActive && contractions.length > 0 &&
          <button className="btn-undo" onPointerUp={undoLast}>{t.undoLast}</button>}
      </div>

      {contractions.length >= 2 && (
        <div className="stats-grid">
          <div className="stat"><span className="stat__val">{contractions.length}</span><span className="stat__lbl">{t.total}</span></div>
          <div className="stat"><span className="stat__val">{fmt(avgDur)}</span><span className="stat__lbl">{t.avgDuration}</span></div>
          <div className="stat"><span className="stat__val">{fmt(avgFreq)}</span><span className="stat__lbl">{t.avgFrequency}</span></div>
        </div>
      )}

      {contractions.length > 0 ? (
        <section className="history">
          <div className="history__head">
            <h2 className="history__title">{t.history}</h2>
            <button className="btn-clear" onPointerUp={clearAll}>{t.clearAll}</button>
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
                      {t.duration}&nbsp;<strong>{fmt(c.duration)}</strong>
                      {gap != null && <>&nbsp;·&nbsp;{t.gap}&nbsp;<strong>{fmt(gap)}</strong></>}
                    </span>
                  </div>
                  {freq != null && <span className="c-row__freq">{t.every} {fmt(freq)}</span>}
                  <button className="c-row__del" onPointerUp={() => deleteOne(c.id)} aria-label="Delete">✕</button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        !isActive && <p className="empty" style={{ whiteSpace: 'pre-line' }}>{t.noContractions}</p>
      )}

      <div className="guide">
        <h3 className="guide__title">{t.rule511}</h3>
        <div className="guide__rows">
          <div className="guide__row"><span className="guide__n">5</span><span>{t.rule511sub.split('，')[0] || 'Contractions every 5 minutes'}</span></div>
          <div className="guide__row"><span className="guide__n">1</span><span>{t.rule511sub.split('，')[1] || 'Each lasting 1 minute'}</span></div>
          <div className="guide__row"><span className="guide__n">1</span><span>{t.rule511sub.split('，')[2] || 'For at least 1 hour'}</span></div>
        </div>
        <p className="guide__note">{t.callMidwifeSub}</p>
      </div>
    </div>
  );
}
