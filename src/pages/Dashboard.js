import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const TIPS = [
  "Stay hydrated — aim for 8–10 glasses of water daily 💧",
  "Gentle prenatal yoga can ease back pain and improve sleep 🧘‍♀️",
  "Take your prenatal vitamins every day, especially folic acid 💊",
  "Rest when you need to — growing a human is hard work! 😴",
  "Track your mood alongside symptoms — emotions matter too 💕",
  "Pack your hospital bag by week 36 🎒",
  "Practice breathing techniques together for labor prep 🌬️",
  "Attend all prenatal appointments — routine checks save lives 🏥",
];

export default function Dashboard({ setTab }) {
  const [dueDate, setDueDate] = useState(() => localStorage.getItem('dueDate') || '');
  const [partnerName, setPartnerName] = useState(() => localStorage.getItem('partnerName') || 'My Love');
  const [babyName, setBabyName] = useState(() => localStorage.getItem('babyName') || 'Baby');
  const [editing, setEditing] = useState(false);
  const [tipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    localStorage.setItem('dueDate', dueDate);
    localStorage.setItem('partnerName', partnerName);
    localStorage.setItem('babyName', babyName);
  }, [dueDate, partnerName, babyName]);

  const getDaysLeft = () => {
    if (!dueDate) return null;
    const diff = new Date(dueDate) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getWeek = () => {
    const days = getDaysLeft();
    if (days === null) return null;
    const weeksPassed = Math.floor((280 - days) / 7);
    return Math.max(1, Math.min(40, weeksPassed));
  };

  const getTrimester = (week) => {
    if (week <= 13) return { label: '1st Trimester', color: '#fde68a' };
    if (week <= 26) return { label: '2nd Trimester', color: '#86efac' };
    return { label: '3rd Trimester', color: '#f9a8c9' };
  };

  const days = getDaysLeft();
  const week = getWeek();
  const trimester = week ? getTrimester(week) : null;

  const QUICK = [
    { label: 'Weekly Tracker', emoji: '🌱', tab: 'weekly' },
    { label: 'Kick Counter', emoji: '👶', tab: 'kicks' },
    { label: 'Labor Timer', emoji: '⏱️', tab: 'labor' },
    { label: 'Hospital Bag', emoji: '🎒', tab: 'bag' },
  ];

  return (
    <div className="page dashboard">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-greeting">
          <span className="dash-emoji">🌸</span>
          <div>
            <h1>Baby Prep</h1>
            <p>Your pregnancy companion</p>
          </div>
        </div>
        <button className="edit-btn" onClick={() => setEditing(!editing)}>
          {editing ? '✓ Done' : '✏️ Edit'}
        </button>
      </div>

      {editing && (
        <div className="card edit-card fade-in">
          <h3 className="section-title">Your Details</h3>
          <div className="edit-field">
            <label>Partner's Name</label>
            <input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="e.g. Emma" />
          </div>
          <div className="edit-field">
            <label>Baby's Name (or nickname)</label>
            <input value={babyName} onChange={e => setBabyName(e.target.value)} placeholder="e.g. Peanut" />
          </div>
          <div className="edit-field">
            <label>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>
      )}

      {/* Hero countdown */}
      {dueDate ? (
        <div className="hero-card">
          <div className="hero-bg" />
          <div className="hero-content">
            <p className="hero-sub">Hello, {partnerName} 💕</p>
            <div className="hero-count">
              {days > 0 ? (
                <>
                  <span className="hero-num">{days}</span>
                  <span className="hero-unit">days until {babyName} arrives</span>
                </>
              ) : days === 0 ? (
                <span className="hero-today">Today is the day! 🎉</span>
              ) : (
                <span className="hero-today">Welcome, {babyName}! 🎉</span>
              )}
            </div>
            {week && (
              <div className="hero-meta">
                <span className="pill" style={{ background: trimester.color + '55', color: '#1c1917' }}>
                  Week {week} · {trimester.label}
                </span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (week / 40) * 100)}%` }} />
                </div>
                <span className="progress-label">{week} / 40 weeks</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hero-card hero-empty" onClick={() => setEditing(true)}>
          <span style={{ fontSize: 32 }}>🌸</span>
          <p>Tap <strong>Edit</strong> to set your due date</p>
        </div>
      )}

      {/* Tip of the day */}
      <div className="card tip-card">
        <div className="tip-label">✨ Tip of the day</div>
        <p className="tip-text">{TIPS[tipIdx]}</p>
      </div>

      {/* Quick actions */}
      <h3 className="section-title">Quick Access</h3>
      <div className="quick-grid">
        {QUICK.map(q => (
          <button key={q.tab} className="quick-btn" onClick={() => setTab(q.tab)}>
            <span className="quick-emoji">{q.emoji}</span>
            <span className="quick-label">{q.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
