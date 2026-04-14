import React, { useState } from 'react';
import { getBabyAgeWeeks, fmtAgeWeeks } from '../utils/helpers';

function validateDate(hasBorn, dateStr) {
  if (!dateStr) return null;
  const entered = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(entered.getTime())) return 'invalidDate';
  if (hasBorn) {
    if (entered > today) return 'birthFuture';
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (entered < twoYearsAgo) return 'birthTooOld';
  } else {
    if (entered < today) return 'duePast';
    const tenMonths = new Date(today);
    tenMonths.setMonth(tenMonths.getMonth() + 10);
    if (entered > tenMonths) return 'dueTooFar';
  }
  return null;
}

function getDateError(code, lang) {
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
  return msgs[lang]?.[code] || msgs.en[code];
}

export default function Settings({ t, lang, setLang, baby, setBaby, resetAll }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...baby });
  const [dateTouched, setDateTouched] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const ageWeeks = getBabyAgeWeeks(baby.date);

  const dateError = dateTouched ? validateDate(form.hasBorn, form.date) : null;
  const canSave = form.date.trim() !== '' && validateDate(form.hasBorn, form.date) === null;

  const handleToggle = (born) => {
    setForm(f => ({ ...f, hasBorn: born, date: '' }));
    setDateTouched(false);
  };

  const handleSave = () => {
    setDateTouched(true);
    if (canSave) { setBaby({ ...form, name: form.name?.trim() || '' }); setEditing(false); }
  };

  const handleCancelEdit = () => {
    setForm({ ...baby });
    setDateTouched(false);
    setEditing(false);
  };

  return (
    <div className="settings-page tab-content">

      {/* ── language ── */}
      <div className="settings-section">
        <div className="settings-label">{t.language}</div>
        <div className="lang-toggle">
          <button className={`lang-btn ${lang === 'zh' ? 'active' : ''}`} onPointerUp={() => setLang('zh')}>
            粵語
          </button>
          <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onPointerUp={() => setLang('en')}>
            English
          </button>
        </div>
      </div>

      {/* ── baby info ── */}
      <div className="settings-section">
        <div className="settings-label-row">
          <div className="settings-label">{t.babyInfo}</div>
          {!editing && (
            <button className="age-edit-btn" onPointerUp={() => { setForm({...baby}); setDateTouched(false); setEditing(true); }}>
              {t.edit}
            </button>
          )}
        </div>

        {!editing ? (
          <div className="baby-info-display">
            <div className="bi-row">
              <span className="bi-key">{lang === 'zh' ? '名字' : 'Name'}</span>
              <span className="bi-val">{baby.name || '—'}</span>
            </div>
            <div className="bi-row">
              <span className="bi-key">{baby.hasBorn ? t.babyBirthDate : t.expectedDueDate}</span>
              <span className="bi-val">{baby.date || '—'}</span>
            </div>
            <div className="bi-row">
              <span className="bi-key">{lang === 'zh' ? '狀態' : 'Status'}</span>
              <span className="bi-val">{baby.hasBorn ? t.hasBorn : t.notYetBorn}</span>
            </div>
            {baby.hasBorn && ageWeeks !== null && (
              <div className="bi-row">
                <span className="bi-key">{lang === 'zh' ? '年齡' : 'Age'}</span>
                <span className="bi-val">{fmtAgeWeeks(ageWeeks, lang)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="settings-form">
            {/* born toggle */}
            <div className="setup-toggle" style={{ marginBottom: 14 }}>
              <button
                className={`toggle-btn ${!form.hasBorn ? 'active' : ''}`}
                onPointerUp={() => handleToggle(false)}
              >{t.notYetBorn}</button>
              <button
                className={`toggle-btn ${form.hasBorn ? 'active' : ''}`}
                onPointerUp={() => handleToggle(true)}
              >{t.hasBorn}</button>
            </div>

            {/* date field with validation */}
            <div className="field-group" style={{ marginBottom: 10 }}>
              <label className="field-label">{form.hasBorn ? t.babyBirthDate : t.expectedDueDate}</label>
              <input
                type="date"
                className={`field-input ${dateError ? 'field-input--error' : dateTouched && form.date && !dateError ? 'field-input--ok' : ''}`}
                value={form.date}
                max={form.hasBorn ? today : undefined}
                min={!form.hasBorn ? today : undefined}
                onChange={e => { setForm(f => ({ ...f, date: e.target.value })); setDateTouched(true); }}
                onBlur={() => form.date && setDateTouched(true)}
              />
              {dateError && (
                <span className="setup-field-error">⚠ {getDateError(dateError, lang)}</span>
              )}
              {dateTouched && form.date && !dateError && (
                <span className="setup-field-ok">✓ {lang === 'zh' ? '日期有效' : 'Date looks good'}</span>
              )}
            </div>

            {/* name field */}
            <div className="field-group" style={{ marginBottom: 14 }}>
              <label className="field-label">{t.babyName}</label>
              <input
                type="text"
                className="field-input"
                placeholder={t.babyNamePlaceholder}
                value={form.name || ''}
                maxLength={20}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onPointerUp={handleCancelEdit}>{t.cancel}</button>
              <button
                className="btn-primary"
                style={{ background: canSave ? '#111110' : '#ccc', cursor: canSave ? 'pointer' : 'not-allowed' }}
                onPointerUp={handleSave}
              >
                {t.done}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── data management ── */}
      <div className="settings-section">
        <div className="settings-label">{t.dataManagement}</div>
        <p className="settings-data-hint">
          {lang === 'zh'
            ? '清除所有資料後，應用程式將重新開始設定。此操作無法撤銷。'
            : 'Clearing all data will restart the app from the setup screen. This cannot be undone.'}
        </p>
        <button
          className="danger-btn"
          onPointerUp={() => {
            if (window.confirm(t.clearAllConfirm)) resetAll();
          }}
        >
          🗑 {t.clearAllData}
        </button>
      </div>

      <div className="settings-footer">
        <p>寶寶日記 · Baby Diary v2.0</p>
        <p style={{ fontSize: 11, marginTop: 4, opacity: .5 }}>
          {lang === 'zh' ? '所有資料儲存於本機裝置' : 'All data stored locally on this device'}
        </p>
      </div>
    </div>
  );
}
