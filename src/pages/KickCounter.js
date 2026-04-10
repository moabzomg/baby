import React, { useState, useEffect } from 'react';
import './KickCounter.css';

export default function KickCounter() {
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kickSessions') || '[]'); } catch { return []; }
  });
  const [active, setActive] = useState(false);
  const [kicks, setKicks] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [lastKick, setLastKick] = useState(null);

  useEffect(() => {
    localStorage.setItem('kickSessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    let iv;
    if (active) {
      iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    }
    return () => clearInterval(iv);
  }, [active, startTime]);

  const startSession = () => {
    setActive(true);
    setKicks(0);
    setStartTime(Date.now());
    setElapsed(0);
    setLastKick(null);
  };

  const recordKick = () => {
    if (!active) return;
    setKicks(k => k + 1);
    setLastKick(Date.now());
  };

  const endSession = () => {
    const session = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      kicks,
      durationSec: elapsed,
    };
    setSessions(prev => [session, ...prev.slice(0, 29)]);
    setActive(false);
    setKicks(0);
    setElapsed(0);
  };

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const goal = 10;
  const pct = Math.min(100, (kicks / goal) * 100);
  const goalReached = kicks >= goal;

  return (
    <div className="page kick-page">
      <div className="page-header">
        <h1>👶 Kick Counter</h1>
        <p>Track your baby's movements daily</p>
      </div>

      <div className="card kick-info-card">
        <span style={{ fontSize: 20 }}>ℹ️</span>
        <p>Count <strong>10 kicks</strong> in 2 hours (from week 28). Contact your midwife if baby is unusually quiet.</p>
      </div>

      {!active ? (
        <div className="kick-start">
          <button className="btn-primary start-session-btn" onClick={startSession}>
            Start Counting Session
          </button>
        </div>
      ) : (
        <div className="kick-active fade-in">
          {/* Timer */}
          <div className="kick-timer">{formatElapsed(elapsed)}</div>

          {/* Kick button */}
          <div className="kick-btn-wrap">
            {goalReached && <div className="goal-ring" />}
            <button
              className={`kick-big-btn ${goalReached ? 'goal' : ''}`}
              onClick={recordKick}
            >
              <span className="kick-count">{kicks}</span>
              <span className="kick-count-label">kicks</span>
            </button>
          </div>

          {lastKick && (
            <p className="last-kick-msg">
              Last kick: {new Date(lastKick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}

          {/* Progress */}
          <div className="kick-progress-wrap">
            <div className="kick-progress-bar">
              <div
                className="kick-progress-fill"
                style={{ width: `${pct}%`, background: goalReached ? '#22c55e' : 'linear-gradient(90deg, var(--blush), var(--blush-deep))' }}
              />
            </div>
            <span className="kick-goal-label">
              {goalReached ? '🎉 Goal reached!' : `${kicks} / ${goal} kicks`}
            </span>
          </div>

          {kicks > 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>
              Tap the button each time you feel a kick!
            </p>
          )}

          <button className="btn-secondary end-btn" onClick={endSession}>
            End Session
          </button>
        </div>
      )}

      {/* History */}
      {sessions.length > 0 && (
        <div className="kick-history">
          <h3 className="section-title">Recent Sessions</h3>
          {sessions.map(s => (
            <div key={s.id} className="kick-session-row">
              <div className="ks-date">
                <div className="ks-day">{s.date}</div>
                <div className="ks-time">{s.time}</div>
              </div>
              <div className="ks-kicks">
                <span className="ks-num">{s.kicks}</span>
                <span className="ks-unit">kicks</span>
              </div>
              <div className={`ks-status ${s.kicks >= 10 ? 'good' : 'low'}`}>
                {s.kicks >= 10 ? '✓ Normal' : '⚠ Low'}
              </div>
              <div className="ks-dur">{formatElapsed(s.durationSec)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
