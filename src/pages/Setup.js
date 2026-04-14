import React, { useState } from 'react';

function validateDate(hasBorn, dateStr) {
  if (!dateStr) return null; // no error if empty (button disabled anyway)
  const entered = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(entered.getTime())) return 'invalidDate';

  if (hasBorn) {
    // Birth date must be in the past or today
    if (entered > today) return 'birthFuture';
    // Sanity: not more than 2 years ago
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (entered < twoYearsAgo) return 'birthTooOld';
  } else {
    // Due date must be today or future
    if (entered < today) return 'duePast';
    // Sanity: not more than 10 months ahead
    const tenMonths = new Date(today);
    tenMonths.setMonth(tenMonths.getMonth() + 10);
    if (entered > tenMonths) return 'dueTooFar';
  }
  return null; // valid
}

function getDateError(code, t, lang) {
  const msgs = {
    zh: {
      invalidDate: '請輸入有效日期',
      birthFuture: '出生日期不能是未來日期',
      birthTooOld: '出生日期不能超過2年前',
      duePast: '預產期不能是過去日期',
      dueTooFar: '預產期不能超過10個月後',
    },
    en: {
      invalidDate: 'Please enter a valid date',
      birthFuture: "Birth date can't be in the future",
      birthTooOld: "Birth date can't be more than 2 years ago",
      duePast: "Due date can't be in the past",
      dueTooFar: "Due date can't be more than 10 months ahead",
    },
  };
  return msgs[lang]?.[code] || msgs.en[code] || 'Invalid date';
}

export default function Setup({ t, lang, onSave }) {
  const [hasBorn, setHasBorn] = useState(false);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const dateError = touched ? validateDate(hasBorn, date) : null;
  const canSave = date.trim() !== '' && validateDate(hasBorn, date) === null;

  const handleToggle = (born) => {
    setHasBorn(born);
    setDate('');       // reset date when switching mode
    setTouched(false);
  };

  const handleDateChange = (e) => {
    setDate(e.target.value);
    setTouched(true);
  };

  const handleSave = () => {
    setTouched(true);
    if (canSave) onSave({ hasBorn, date, name: name.trim() });
  };

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-emoji">👶</div>
        <h1 className="setup-title">{t.setupTitle}</h1>
        <p className="setup-sub">{t.setupSub}</p>

        {/* born / not yet born toggle */}
        <div className="setup-toggle">
          <button
            className={`toggle-btn ${!hasBorn ? 'active' : ''}`}
            onPointerUp={() => handleToggle(false)}
          >
            {t.notYetBorn}
          </button>
          <button
            className={`toggle-btn ${hasBorn ? 'active' : ''}`}
            onPointerUp={() => handleToggle(true)}
          >
            {t.hasBorn}
          </button>
        </div>

        {/* date field */}
        <div className="setup-field">
          <label className="setup-label">
            {hasBorn ? t.babyBirthDate : t.expectedDueDate}
          </label>
          <input
            type="date"
            className={`setup-input ${dateError ? 'setup-input--error' : touched && date && !dateError ? 'setup-input--ok' : ''}`}
            value={date}
            max={hasBorn ? today : undefined}
            min={!hasBorn ? today : undefined}
            onChange={handleDateChange}
            onBlur={() => date && setTouched(true)}
          />
          {dateError && (
            <span className="setup-field-error">
              ⚠ {getDateError(dateError, t, lang)}
            </span>
          )}
          {touched && date && !dateError && (
            <span className="setup-field-ok">✓ {lang === 'zh' ? '日期有效' : 'Date looks good'}</span>
          )}
        </div>

        {/* name field */}
        <div className="setup-field">
          <label className="setup-label">{t.babyName}</label>
          <input
            type="text"
            className="setup-input"
            placeholder={t.babyNamePlaceholder}
            value={name}
            maxLength={20}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <button
          className="setup-save-btn"
          onPointerUp={handleSave}
          disabled={!canSave}
        >
          {t.saveAndStart}
        </button>
      </div>
    </div>
  );
}
