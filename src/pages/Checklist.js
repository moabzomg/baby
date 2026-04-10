import React, { useState } from 'react';
import './Checklist.css';

const DEFAULT_TASKS = {
  'First Trimester (Weeks 1–13)': [
    { id: 't1', text: 'Book first prenatal appointment' },
    { id: 't2', text: 'Start prenatal vitamins (folic acid)' },
    { id: 't3', text: 'Stop alcohol, smoking, raw fish' },
    { id: 't4', text: 'Schedule nuchal translucency scan (11–13 weeks)' },
    { id: 't5', text: 'Dental check-up' },
    { id: 't6', text: 'Discuss NIPT / genetic testing' },
    { id: 't7', text: 'Tell employer when ready' },
    { id: 't8', text: 'Research maternity leave rights' },
  ],
  'Second Trimester (Weeks 14–26)': [
    { id: 't9', text: 'Book 20-week anatomy scan' },
    { id: 't10', text: 'Glucose tolerance test (~24–28 weeks)' },
    { id: 't11', text: 'Research birth options and hospitals' },
    { id: 't12', text: 'Enrol in antenatal / birth class' },
    { id: 't13', text: 'Start looking at nursery furniture' },
    { id: 't14', text: 'Consider hiring a doula' },
    { id: 't15', text: 'Write a birth preferences / plan draft' },
    { id: 't16', text: 'Start pregnancy pillow' },
  ],
  'Third Trimester (Weeks 27–40)': [
    { id: 't17', text: 'Pack hospital bag (by week 36)' },
    { id: 't18', text: 'Install car seat' },
    { id: 't19', text: 'Pre-register at maternity unit' },
    { id: 't20', text: 'Whooping cough vaccine (28–32 weeks)' },
    { id: 't21', text: 'Freeze batch-cooked meals' },
    { id: 't22', text: 'Set up nursery / cot / bassinet' },
    { id: 't23', text: 'Buy newborn essentials (nappies, onesies, swaddles)' },
    { id: 't24', text: 'Discuss paternity leave with employer' },
    { id: 't25', text: 'Download baby app / prepare for newborn care' },
    { id: 't26', text: 'Choose paediatrician / GP for baby' },
  ],
  'For Dad / Partner 💕': [
    { id: 't27', text: 'Attend all midwife appointments possible' },
    { id: 't28', text: 'Read a book on newborn care' },
    { id: 't29', text: 'Learn the 5-1-1 contraction rule' },
    { id: 't30', text: 'Prepare hospital bag with her' },
    { id: 't31', text: 'Set up a night-feed station' },
    { id: 't32', text: 'Practice installing the car seat' },
    { id: 't33', text: 'Cook and freeze meals together' },
    { id: 't34', text: 'Know the route to hospital' },
    { id: 't35', text: 'Write down emergency numbers' },
  ],
};

export default function Checklist() {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('taskChecked') || '{}'); } catch { return {}; }
  });
  const [custom, setCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem('customTasks') || '[]'); } catch { return []; }
  });
  const [newTask, setNewTask] = useState('');
  const [open, setOpen] = useState({});

  const toggle = (id) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem('taskChecked', JSON.stringify(next));
  };

  const addCustom = () => {
    if (!newTask.trim()) return;
    const t = { id: `c${Date.now()}`, text: newTask.trim() };
    const next = [...custom, t];
    setCustom(next);
    localStorage.setItem('customTasks', JSON.stringify(next));
    setNewTask('');
  };

  const removeCustom = (id) => {
    const next = custom.filter(t => t.id !== id);
    setCustom(next);
    localStorage.setItem('customTasks', JSON.stringify(next));
  };

  const allTasks = [
    ...Object.values(DEFAULT_TASKS).flat(),
    ...custom,
  ];
  const totalDone = allTasks.filter(t => checked[t.id]).length;
  const totalAll = allTasks.length;
  const pct = totalAll ? Math.round((totalDone / totalAll) * 100) : 0;

  const toggleSection = (s) => setOpen(o => ({ ...o, [s]: !o[s] }));

  return (
    <div className="page checklist-page">
      <div className="page-header">
        <h1>✅ Preparation Tasks</h1>
        <p>Everything to do before baby arrives</p>
      </div>

      {/* Overall progress */}
      <div className="card progress-card">
        <div className="progress-header">
          <span className="prog-label">Overall Progress</span>
          <span className="prog-pct">{pct}%</span>
        </div>
        <div className="prog-bar-bg">
          <div className="prog-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="prog-sub">{totalDone} of {totalAll} tasks done</div>
      </div>

      {/* Task categories */}
      {Object.entries(DEFAULT_TASKS).map(([section, tasks]) => {
        const done = tasks.filter(t => checked[t.id]).length;
        const isOpen = open[section] !== false;
        return (
          <div key={section} className="section-block">
            <button className="section-toggle" onClick={() => toggleSection(section)}>
              <div className="section-toggle-left">
                <span className="section-name">{section}</span>
                <span className="section-count">{done}/{tasks.length}</span>
              </div>
              <span className="section-chevron">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="task-list fade-in">
                {tasks.map(task => (
                  <label key={task.id} className={`task-item ${checked[task.id] ? 'done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={!!checked[task.id]}
                      onChange={() => toggle(task.id)}
                    />
                    <span className="task-text">{task.text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Custom tasks */}
      <div className="section-block">
        <div className="section-toggle">
          <div className="section-toggle-left">
            <span className="section-name">My Custom Tasks</span>
            <span className="section-count">{custom.filter(t => checked[t.id]).length}/{custom.length}</span>
          </div>
        </div>
        <div className="task-list">
          {custom.map(task => (
            <label key={task.id} className={`task-item ${checked[task.id] ? 'done' : ''}`}>
              <input
                type="checkbox"
                checked={!!checked[task.id]}
                onChange={() => toggle(task.id)}
              />
              <span className="task-text">{task.text}</span>
              <button className="task-del" onClick={(e) => { e.preventDefault(); removeCustom(task.id); }}>✕</button>
            </label>
          ))}
          <div className="add-task-row">
            <input
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              placeholder="Add a custom task…"
              className="add-task-input"
            />
            <button className="add-task-btn" onClick={addCustom}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}
