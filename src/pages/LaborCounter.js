import React, { useState, useEffect, useRef } from 'react';
import './LaborCounter.css';

export default function LaborCounter() {
  const [contractions, setContractions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('contractions') || '[]'); } catch { return []; }
  });
  const [active, setActive] = useState(null); // { startTime }
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('contractions', JSON.stringify(contractions));
  }, [contractions]);

  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - active.startTime) / 1000));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [active]);

  const startContraction = () => {
    setActive({ startTime: Date.now() });
  };

  const stopContraction = () => {
    if (!active) return;
    const duration = Math.floor((Date.now() - active.startTime) / 1000);
    const newEntry = {
      id: Date.now(),
      startTime: active.startTime,
      endTime: Date.now(),
      duration,
    };
    setContractions(prev => [newEntry, ...prev]);
    setActive(null);
  };

  const deleteContraction = (id) => {
    setContractions(prev => prev.filter(c => c.id !== id));
  };

  const clearAll = () => {
    if (window.confirm('Clear all contraction records?')) {
      setContractions([]);
    }
  };

  // Calculate gap (time between end of last and start of this)
  const getGap = (idx) => {
    if (idx >= contractions.length - 1) return null;
    const current = contractions[idx];
    const prev = contractions[idx + 1];
    const gapSec = Math.floor((current.startTime - prev.endTime) / 1000);
    return gapSec;
  };

  // Calculate frequency (start to start)
  const getFrequency = (idx) => {
    if (idx >= contractions.length - 1) return null;
    const current = contractions[idx];
    const prev = contractions[idx + 1];
    return Math.floor((current.startTime - prev.startTime) / 1000);
  };

  const formatTime = (sec) => {
    if (sec === null) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatClock = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 5-1-1 rule check
  const check511 = () => {
    if (contractions.length < 3) return null;
    const recent = contractions.slice(0, 5);
    const freqs = recent.map((_, i) => getFrequency(i)).filter(Boolean);
    const durs = recent.map(c => c.duration);
    const avgFreq = freqs.reduce((a, b) => a + b, 0) / freqs.length;
    const avgDur = durs.reduce((a, b) => a + b, 0) / durs.length;
    if (avgFreq <= 300 && avgDur >= 60) return 'alert';
    if (avgFreq <= 420 && avgDur >= 45) return 'warning';
    return 'normal';
  };

  const status511 = check511();

  const avgDuration = contractions.length
    ? Math.round(contractions.slice(0, 5).reduce((a, c) => a + c.duration, 0) / Math.min(5, contractions.length))
    : 0;

  const avgFreq = contractions.length >= 2
    ? (() => {
        const freqs = contractions.slice(0, 5).map((_, i) => getFrequency(i)).filter(Boolean);
        return freqs.length ? Math.round(freqs.reduce((a, b) => a + b, 0) / freqs.length) : 0;
      })()
    : 0;

  return (
    <div className="page labor-page">
      <div className="page-header">
        <h1>⏱️ Labor Counter</h1>
        <p>Track contractions using the 5-1-1 rule</p>
      </div>

      {/* 5-1-1 Status */}
      {status511 && (
        <div className={`rule-banner rule-${status511} fade-in`}>
          {status511 === 'alert' && (
            <>
              <span className="rule-icon">🚨</span>
              <div>
                <strong>Call your midwife now!</strong>
                <p>Contractions every 5 min, lasting 1 min, for 1+ hour</p>
              </div>
            </>
          )}
          {status511 === 'warning' && (
            <>
              <span className="rule-icon">⚠️</span>
              <div>
                <strong>Getting closer!</strong>
                <p>Contractions are becoming regular — stay alert</p>
              </div>
            </>
          )}
          {status511 === 'normal' && (
            <>
              <span className="rule-icon">✅</span>
              <div>
                <strong>Early labor</strong>
                <p>Keep tracking — rest when you can</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main button */}
      <div className="labor-center">
        {active ? (
          <div className="active-contraction">
            <div className="pulse-ring" />
            <div className="elapsed-display">{formatElapsed(elapsed)}</div>
            <p className="elapsed-label">Contraction in progress…</p>
            <button className="stop-btn btn-primary" onClick={stopContraction}>
              ■ Stop
            </button>
          </div>
        ) : (
          <button className="start-btn" onClick={startContraction}>
            <span className="start-icon">▶</span>
            <span>Start Contraction</span>
          </button>
        )}
      </div>

      {/* Stats row */}
      {contractions.length >= 2 && (
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-num">{formatTime(avgDuration)}</span>
            <span className="stat-label">Avg Duration</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-box">
            <span className="stat-num">{formatTime(avgFreq)}</span>
            <span className="stat-label">Avg Frequency</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-box">
            <span className="stat-num">{contractions.length}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
      )}

      {/* History */}
      {contractions.length > 0 && (
        <div className="history-section">
          <div className="history-header">
            <h3 className="section-title">History</h3>
            <button className="clear-btn" onClick={clearAll}>Clear all</button>
          </div>
          <div className="history-list">
            {contractions.map((c, i) => (
              <div key={c.id} className="contraction-row fade-in">
                <div className="c-index">#{contractions.length - i}</div>
                <div className="c-info">
                  <div className="c-time">{formatClock(c.startTime)}</div>
                  <div className="c-meta">
                    <span className="c-dur">Duration: <strong>{formatTime(c.duration)}</strong></span>
                    {getGap(i) !== null && (
                      <span className="c-gap">Gap: <strong>{formatTime(getGap(i))}</strong></span>
                    )}
                  </div>
                </div>
                <div className="c-freq">
                  {getFrequency(i) !== null && (
                    <span className="freq-badge">{formatTime(getFrequency(i))}</span>
                  )}
                </div>
                <button className="del-btn" onClick={() => deleteContraction(c.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {contractions.length === 0 && !active && (
        <div className="empty-state">
          <span style={{ fontSize: 48 }}>🌸</span>
          <p>No contractions recorded yet.<br />Press Start when one begins.</p>
        </div>
      )}

      {/* 5-1-1 Guide */}
      <div className="card guide-card">
        <h3 className="section-title">The 5-1-1 Rule</h3>
        <div className="guide-items">
          <div className="guide-item"><span className="guide-num">5</span><span>Contractions every 5 minutes</span></div>
          <div className="guide-item"><span className="guide-num">1</span><span>Each lasting at least 1 minute</span></div>
          <div className="guide-item"><span className="guide-num">1</span><span>Going on for at least 1 hour</span></div>
        </div>
        <p className="guide-note">→ Call your midwife or go to the hospital when this pattern is reached.</p>
      </div>
    </div>
  );
}
