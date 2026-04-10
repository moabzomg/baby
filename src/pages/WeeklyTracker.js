import React, { useState } from 'react';
import './WeeklyTracker.css';

const WEEKS = {
  4: { size: '🫐 Poppy seed', highlight: 'Implantation complete. hCG rising.', tips: ['Begin prenatal vitamins', 'Avoid alcohol & smoking', 'Schedule first OB appointment'] },
  5: { size: '🌱 Sesame seed', highlight: 'Heart begins to beat.', tips: ['Start folic acid 400mcg', 'Rest as needed', 'Avoid raw fish and unpasteurised dairy'] },
  6: { size: '🫘 Lentil', highlight: 'Facial features forming.', tips: ['Eat small frequent meals for nausea', 'Stay hydrated', 'Discuss medications with doctor'] },
  7: { size: '🫐 Blueberry', highlight: 'Brain developing rapidly.', tips: ['Ginger tea can ease morning sickness', 'Light walks are great', 'Avoid hot tubs and saunas'] },
  8: { size: '🍇 Raspberry', highlight: 'Fingers and toes forming.', tips: ['Book first ultrasound', 'Dental check-up recommended', 'Avoid heavy lifting'] },
  9: { size: '🍒 Cherry', highlight: 'Embryo now called a fetus.', tips: ['Discuss genetic testing options', 'Wear loose comfortable clothing', 'Kegel exercises begin now'] },
  10: { size: '🍓 Strawberry', highlight: 'All major organs formed.', tips: ['NIPT or nuchal scan window opening', 'Omega-3 supports brain development', 'Document bump photos'] },
  11: { size: '🫛 Fig', highlight: 'Tooth buds appearing.', tips: ['Avoid contact sports', 'Calcium-rich foods important', 'Begin researching birth options'] },
  12: { size: '🍋 Lime', highlight: 'First trimester complete! Risk of miscarriage drops.', tips: ['Share your news if ready', 'First trimester screen', 'Celebrate this milestone!'] },
  13: { size: '🥝 Kiwi', highlight: 'Baby can suck thumb now.', tips: ['Energy often returns this week', 'Start looking at maternity wear', 'Discuss birth plan ideas with partner'] },
  14: { size: '🍑 Peach', highlight: 'Baby making facial expressions.', tips: ['Anatomy scan coming up', 'Increase protein intake', 'Consider prenatal pilates'] },
  16: { size: '🥑 Avocado', highlight: 'Baby can hear your voice.', tips: ['Talk and sing to your baby', 'Anatomy scan at 18-20 weeks', 'Sleep on your left side'] },
  18: { size: '🍠 Sweet potato', highlight: 'Baby is yawning and hiccuping.', tips: ['Start tracking kicks soon', 'Consider a pregnancy pillow', 'Book your 20-week scan'] },
  20: { size: '🍌 Banana', highlight: 'Halfway there! Anatomy scan week.', tips: ['20-week anomaly scan', 'Start moisturising bump', 'Research birth classes'] },
  24: { size: '🌽 Corn', highlight: 'Baby has a chance of survival if born now.', tips: ['Glucose tolerance test coming up', 'Start birth class research', 'Pack some hospital bag items'] },
  28: { size: '🥦 Broccoli', highlight: 'Third trimester begins!', tips: ['Kick counting from now', 'Whooping cough vaccine recommended', 'Discuss birth plan with midwife'] },
  32: { size: '🍈 Napa cabbage', highlight: 'Baby gaining weight rapidly.', tips: ['Finish hospital bag', 'Install car seat', 'Pre-register at hospital'] },
  36: { size: '🥬 Lettuce', highlight: 'Baby considered "early term" now.', tips: ['Weekly midwife visits begin', 'Freeze some meals', 'Final nursery preparations'] },
  38: { size: '🎃 Pumpkin', highlight: 'Baby is full term!', tips: ['Rest as much as possible', 'Watch for labour signs', 'Keep hospital bag by the door'] },
  40: { size: '🍉 Watermelon', highlight: 'Due date! Baby ready to meet you.', tips: ['Go to hospital if contractions 5-1-1', 'Stay calm and trust the process', 'You have got this! 💕'] },
};

const MILESTONES = [
  { week: 8, label: 'First heartbeat visible on scan', icon: '💗' },
  { week: 12, label: 'End of first trimester', icon: '🌟' },
  { week: 16, label: 'May feel first movements (quickening)', icon: '✨' },
  { week: 20, label: 'Anatomy scan', icon: '🔍' },
  { week: 24, label: 'Viability milestone', icon: '🏆' },
  { week: 28, label: 'Third trimester begins', icon: '🎯' },
  { week: 36, label: 'Baby is full term', icon: '🌈' },
  { week: 40, label: 'Due date!', icon: '🎉' },
];

function getWeekData(week) {
  const keys = Object.keys(WEEKS).map(Number).sort((a, b) => a - b);
  let best = keys[0];
  for (const k of keys) { if (week >= k) best = k; }
  return WEEKS[best];
}

export default function WeeklyTracker() {
  const dueDate = localStorage.getItem('dueDate');
  const currentWeek = dueDate
    ? Math.max(1, Math.min(40, Math.floor((280 - Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24))) / 7)))
    : 20;

  const [week, setWeek] = useState(currentWeek);
  const data = getWeekData(week);

  const trimester = week <= 13 ? 1 : week <= 26 ? 2 : 3;
  const trimColors = ['#fde68a', '#86efac', '#f9a8c9'];
  const tColor = trimColors[trimester - 1];

  return (
    <div className="page weekly-page">
      <div className="page-header">
        <h1>🌱 Weekly Tracker</h1>
        <p>Your pregnancy journey, week by week</p>
      </div>

      {/* Week selector */}
      <div className="week-selector card">
        <div className="week-row">
          <button className="week-arrow" onClick={() => setWeek(w => Math.max(1, w - 1))}>‹</button>
          <div className="week-display">
            <span className="week-big">Week {week}</span>
            <span className="week-trim" style={{ background: tColor + '55', color: '#1c1917' }}>
              Trimester {trimester}
            </span>
          </div>
          <button className="week-arrow" onClick={() => setWeek(w => Math.min(40, w + 1))}>›</button>
        </div>
        <input
          type="range" min="1" max="40" value={week}
          onChange={e => setWeek(Number(e.target.value))}
          className="week-slider"
          style={{ '--accent': tColor }}
        />
        <div className="week-labels"><span>Week 1</span><span>Week 40</span></div>
      </div>

      {/* Size card */}
      <div className="size-card card" style={{ borderLeft: `4px solid ${tColor}` }}>
        <div className="size-emoji">{data.size.split(' ')[0]}</div>
        <div className="size-info">
          <div className="size-label">Baby is the size of a</div>
          <div className="size-name">{data.size.split(' ').slice(1).join(' ')}</div>
          <div className="size-highlight">✨ {data.highlight}</div>
        </div>
      </div>

      {/* Tips */}
      <div className="card">
        <h3 className="section-title">This week's tips</h3>
        <div className="tips-list">
          {data.tips.map((tip, i) => (
            <div key={i} className="tip-item">
              <span className="tip-dot" style={{ background: tColor }} />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <h3 className="section-title">Milestones</h3>
      <div className="milestones-list">
        {MILESTONES.map(m => (
          <div key={m.week} className={`milestone-item ${week >= m.week ? 'reached' : 'upcoming'}`}>
            <span className="milestone-icon">{m.icon}</span>
            <div className="milestone-info">
              <span className="milestone-label">{m.label}</span>
              <span className="milestone-week">Week {m.week}</span>
            </div>
            {week >= m.week && <span className="milestone-check">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
