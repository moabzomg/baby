import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import LaborCounter from './pages/LaborCounter';
import Checklist from './pages/Checklist';
import WeeklyTracker from './pages/WeeklyTracker';
import KickCounter from './pages/KickCounter';
import HospitalBag from './pages/HospitalBag';
import './App.css';

const NAV = [
  { id: 'dashboard', label: 'Home', emoji: '🏠' },
  { id: 'weekly', label: 'Week', emoji: '🌱' },
  { id: 'kicks', label: 'Kicks', emoji: '👶' },
  { id: 'labor', label: 'Labor', emoji: '⏱️' },
  { id: 'checklist', label: 'Tasks', emoji: '✅' },
  { id: 'bag', label: 'Bag', emoji: '🎒' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');

  const renderPage = () => {
    switch (tab) {
      case 'dashboard': return <Dashboard setTab={setTab} />;
      case 'labor': return <LaborCounter />;
      case 'checklist': return <Checklist />;
      case 'weekly': return <WeeklyTracker />;
      case 'kicks': return <KickCounter />;
      case 'bag': return <HospitalBag />;
      default: return <Dashboard setTab={setTab} />;
    }
  };

  return (
    <div className="app">
      <div className="app-content">
        {renderPage()}
      </div>
      <nav className="bottom-nav">
        {NAV.map(n => (
          <button
            key={n.id}
            className={`nav-btn ${tab === n.id ? 'active' : ''}`}
            onClick={() => setTab(n.id)}
          >
            <span className="nav-emoji">{n.emoji}</span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
