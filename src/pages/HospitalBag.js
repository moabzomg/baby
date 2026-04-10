import React, { useState } from 'react';
import './HospitalBag.css';

const BAG_ITEMS = {
  'For Mum 👩': [
    { id: 'b1', text: 'Maternity notes / birth plan' },
    { id: 'b2', text: 'ID and insurance / NHS card' },
    { id: 'b3', text: 'Comfortable nightgown / pyjamas' },
    { id: 'b4', text: 'Dressing gown and slippers' },
    { id: 'b5', text: 'Maternity bra x2' },
    { id: 'b6', text: 'Breast pads' },
    { id: 'b7', text: 'Comfortable post-birth underwear x5' },
    { id: 'b8', text: 'Maternity pads (heavy flow)' },
    { id: 'b9', text: 'TENS machine (if using)' },
    { id: 'b10', text: 'Lip balm (for gas & air breathing)' },
    { id: 'b11', text: 'Massage oil or roller for back pain' },
    { id: 'b12', text: 'Hair ties / headband' },
    { id: 'b13', text: 'Toiletries (toothbrush, shampoo, etc.)' },
    { id: 'b14', text: 'Phone charger (long cable!)' },
    { id: 'b15', text: 'Snacks and energy drinks' },
    { id: 'b16', text: 'Change of clothes to go home in' },
    { id: 'b17', text: 'Eye mask and earplugs' },
    { id: 'b18', text: 'Comfort item (pillow, blanket)' },
  ],
  'For Baby 🍼': [
    { id: 'b19', text: 'Baby grows / sleepsuits x3' },
    { id: 'b20', text: 'Vests (short-sleeved) x3' },
    { id: 'b21', text: 'Cardigan or warm layer' },
    { id: 'b22', text: 'Newborn nappies' },
    { id: 'b23', text: 'Nappy cream' },
    { id: 'b24', text: 'Cotton wool / baby wipes (unperfumed)' },
    { id: 'b25', text: 'Muslin cloths x4' },
    { id: 'b26', text: 'Baby hat' },
    { id: 'b27', text: 'Swaddle blanket' },
    { id: 'b28', text: 'Infant car seat (in the car ready)' },
  ],
  'For Dad / Partner 💪': [
    { id: 'b29', text: 'Change of clothes' },
    { id: 'b30', text: 'Snacks and drinks' },
    { id: 'b31', text: 'Phone charger' },
    { id: 'b32', text: 'Camera / phone fully charged' },
    { id: 'b33', text: 'List of people to call/text' },
    { id: 'b34', text: 'Pillow (labour can be long!)' },
    { id: 'b35', text: 'Cash for parking/vending machines' },
    { id: 'b36', text: 'A book or entertainment' },
  ],
};

export default function HospitalBag() {
  const [packed, setPacked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bagPacked') || '{}'); } catch { return {}; }
  });
  const [open, setOpen] = useState({ 'For Mum 👩': true, 'For Baby 🍼': true, 'For Dad / Partner 💪': true });

  const toggle = (id) => {
    const next = { ...packed, [id]: !packed[id] };
    setPacked(next);
    localStorage.setItem('bagPacked', JSON.stringify(next));
  };

  const allItems = Object.values(BAG_ITEMS).flat();
  const totalPacked = allItems.filter(i => packed[i.id]).length;
  const totalAll = allItems.length;
  const pct = Math.round((totalPacked / totalAll) * 100);

  const getStatus = () => {
    if (pct === 100) return { label: '🎉 All packed! Ready to go!', color: '#22c55e' };
    if (pct >= 75) return { label: '🌟 Almost ready!', color: '#f59e0b' };
    if (pct >= 50) return { label: '🔄 Good progress…', color: '#60a5fa' };
    return { label: '🎒 Let\'s start packing!', color: 'var(--blush-deep)' };
  };

  const status = getStatus();

  return (
    <div className="page bag-page">
      <div className="page-header">
        <h1>🎒 Hospital Bag</h1>
        <p>Pack before week 36 to be safe</p>
      </div>

      {/* Progress */}
      <div className="card bag-progress">
        <div className="bag-pct" style={{ color: status.color }}>{pct}%</div>
        <div className="bag-status-label">{status.label}</div>
        <div className="bag-prog-bar">
          <div className="bag-prog-fill" style={{ width: `${pct}%`, background: status.color }} />
        </div>
        <div className="bag-prog-sub">{totalPacked} of {totalAll} items packed</div>
      </div>

      {/* Sections */}
      {Object.entries(BAG_ITEMS).map(([section, items]) => {
        const doneCnt = items.filter(i => packed[i.id]).length;
        const isOpen = open[section] !== false;
        return (
          <div key={section} className="bag-section">
            <button className="bag-section-header" onClick={() => setOpen(o => ({ ...o, [section]: !o[section] }))}>
              <div className="bsh-left">
                <span className="bsh-name">{section}</span>
                <span className="bsh-count">{doneCnt}/{items.length}</span>
              </div>
              <span>{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="bag-items fade-in">
                {items.map(item => (
                  <label key={item.id} className={`bag-item ${packed[item.id] ? 'packed' : ''}`}>
                    <span className="bag-check-icon">{packed[item.id] ? '✓' : ''}</span>
                    <input type="checkbox" checked={!!packed[item.id]} onChange={() => toggle(item.id)} style={{ display: 'none' }} />
                    <span className="bag-item-text">{item.text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Reminder */}
      <div className="card reminder-card">
        <span style={{ fontSize: 20 }}>📍</span>
        <div>
          <strong>Important reminder</strong>
          <p>Install your car seat and test it before your due date. You won't be able to leave the hospital without one!</p>
        </div>
      </div>
    </div>
  );
}
