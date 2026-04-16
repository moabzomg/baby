import React, { useState } from "react";
import {
  getBabyAgeWeeks,
  fmtAgeWeeks,
  exportToCSV,
  exportToJSON,
  exportToFormattedText,
  importFromCSV,
  importFromJSON,
  importFromFormattedText,
} from "../utils/helpers";

// ── Validation Helpers ──────────────────────────────────────────────────
function validateDate(hasBorn, dateStr) {
  if (!dateStr) return null;
  const entered = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(entered.getTime())) return "invalidDate";
  if (hasBorn) {
    if (entered > today) return "birthFuture";
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (entered < twoYearsAgo) return "birthTooOld";
  } else {
    if (entered < today) return "duePast";
    const tenMonths = new Date(today);
    tenMonths.setMonth(tenMonths.getMonth() + 10);
    if (entered > tenMonths) return "dueTooFar";
  }
  return null;
}

function getDateError(code, lang) {
  const msgs = {
    zh: {
      invalidDate: "請輸入有效日期",
      birthFuture: "出生日期不能是未來日期",
      birthTooOld: "出生日期不能超過2年前",
      duePast: "預產期不能是過去日期",
      dueTooFar: "預產期不能超過10個月後",
    },
    en: {
      invalidDate: "Please enter a valid date",
      birthFuture: "Birth date can't be in the future",
      birthTooOld: "Birth date can't be more than 2 years ago",
      duePast: "Due date can't be in the past",
      dueTooFar: "Due date can't be more than 10 months ahead",
    },
  };
  return msgs[lang]?.[code] || msgs.en[code];
}

// ── Main Component ──────────────────────────────────────────────────────
export default function Settings({
  t,
  lang,
  setLang,
  baby,
  setBaby,
  resetAll,
  entries,
  setEntries,
}) {
  const zh = lang === "zh";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...baby });
  const [dateTouched, setDateTouched] = useState(false);
  const [importError, setImportError] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const ageWeeks = getBabyAgeWeeks(baby.date);
  const dateError = dateTouched ? validateDate(form.hasBorn, form.date) : null;
  const canSave =
    form.date.trim() !== "" && validateDate(form.hasBorn, form.date) === null;

  const handleToggle = (born) => {
    setForm((f) => ({ ...f, hasBorn: born, date: "" }));
    setDateTouched(false);
  };

  const handleSave = () => {
    setDateTouched(true);
    if (canSave) {
      setBaby({ ...form, name: form.name?.trim() || "" });
      setEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setForm({ ...baby });
    setDateTouched(false);
    setEditing(false);
  };

  const handleImport = (rawText) => {
    if (!rawText || !rawText.trim()) return;
    setImportError("");

    const processImportResult = (result) => {
      if (result && result.error) {
        setImportError(
          zh
            ? `匯入失敗 (第 ${result.line} 行): "${result.content}" - ${result.reason}`
            : `Import failed (Line ${result.line}): "${result.content}" - ${result.reason}`,
        );
        return;
      }

      if (result && result.entries?.length > 0) {
        setEntries((prev) => {
          const combined = [...prev, ...result.entries];
          return combined.sort((a, b) => a.timestamp - b.timestamp);
        });

        setImportError(
          zh
            ? `已成功匯入 ${result.entries.length} 條記錄`
            : `Successfully imported ${result.entries.length} entries`,
        );

        const area = document.getElementById("import-text-area");
        if (area) area.value = "";
      } else {
        setImportError(zh ? "找不到有效的資料記錄" : "No valid entries found");
      }
    };

    try {
      let result;
      const trimmed = rawText.trim();

      // 1. Explicitly check for PiyoLog first to avoid JSON "startsWith [" conflict
      if (trimmed.startsWith("[PiyoLog]")) {
        result = importFromFormattedText(trimmed);
      }
      // 2. Then check for JSON formats
      else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        result = importFromJSON(trimmed);
      }
      // 3. Then check for CSV
      else if (
        trimmed.includes(",") &&
        trimmed.toLowerCase().includes("date")
      ) {
        result = importFromCSV(trimmed);
      }
      // 4. Final fallback
      else {
        result = importFromFormattedText(trimmed);
      }

      processImportResult(result);
    } catch (err) {
      setImportError(
        zh ? `系統錯誤: ${err.message}` : `System Error: ${err.message}`,
      );
    }
  };

  return (
    <div className="settings-page tab-content">
      {/* ── Language Section ── */}
      <div className="settings-section">
        <div className="settings-label">{t.language}</div>
        <div className="lang-toggle">
          <button
            className={`lang-btn ${lang === "zh" ? "active" : ""}`}
            onPointerUp={() => setLang("zh")}
          >
            粵語
          </button>
          <button
            className={`lang-btn ${lang === "en" ? "active" : ""}`}
            onPointerUp={() => setLang("en")}
          >
            English
          </button>
        </div>
      </div>

      {/* ── Baby Info Section ── */}
      <div className="settings-section">
        <div className="settings-label-row">
          <div className="settings-label">{t.babyInfo}</div>
          {!editing && (
            <button
              className="age-edit-btn"
              onPointerUp={() => {
                setForm({ ...baby });
                setDateTouched(false);
                setEditing(true);
              }}
            >
              {t.edit}
            </button>
          )}
        </div>

        {!editing ? (
          <div className="baby-info-display">
            <div className="bi-row">
              <span className="bi-key">{lang === "zh" ? "名字" : "Name"}</span>
              <span className="bi-val">{baby.name || "—"}</span>
            </div>
            <div className="bi-row">
              <span className="bi-key">
                {baby.hasBorn ? t.babyBirthDate : t.expectedDueDate}
              </span>
              <span className="bi-val">{baby.date || "—"}</span>
            </div>
            <div className="bi-row">
              <span className="bi-key">
                {lang === "zh" ? "狀態" : "Status"}
              </span>
              <span className="bi-val">
                {baby.hasBorn ? t.hasBorn : t.notYetBorn}
              </span>
            </div>
            {baby.hasBorn && ageWeeks !== null && (
              <div className="bi-row">
                <span className="bi-key">{lang === "zh" ? "年齡" : "Age"}</span>
                <span className="bi-val">{fmtAgeWeeks(ageWeeks, lang)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="settings-form">
            <div className="setup-toggle" style={{ marginBottom: 14 }}>
              <button
                className={`toggle-btn ${!form.hasBorn ? "active" : ""}`}
                onPointerUp={() => handleToggle(false)}
              >
                {t.notYetBorn}
              </button>
              <button
                className={`toggle-btn ${form.hasBorn ? "active" : ""}`}
                onPointerUp={() => handleToggle(true)}
              >
                {t.hasBorn}
              </button>
            </div>

            <div className="field-group" style={{ marginBottom: 10 }}>
              <label className="field-label">
                {form.hasBorn ? t.babyBirthDate : t.expectedDueDate}
              </label>
              <input
                type="date"
                className={`field-input ${dateError ? "field-input--error" : dateTouched && form.date && !dateError ? "field-input--ok" : ""}`}
                value={form.date}
                max={form.hasBorn ? today : undefined}
                min={!form.hasBorn ? today : undefined}
                onChange={(e) => {
                  setForm((f) => ({ ...f, date: e.target.value }));
                  setDateTouched(true);
                }}
                onBlur={() => form.date && setDateTouched(true)}
              />
              {dateError && (
                <span className="setup-field-error">
                  ⚠ {getDateError(dateError, lang)}
                </span>
              )}
            </div>

            <div className="field-group" style={{ marginBottom: 14 }}>
              <label className="field-label">{t.babyName}</label>
              <input
                type="text"
                className="field-input"
                placeholder={t.babyNamePlaceholder}
                value={form.name || ""}
                maxLength={20}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onPointerUp={handleCancelEdit}>
                {t.cancel}
              </button>
              <button
                className="btn-primary"
                style={{
                  background: canSave ? "#111110" : "#ccc",
                  cursor: canSave ? "pointer" : "not-allowed",
                }}
                onPointerUp={handleSave}
              >
                {t.done}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Data Management Section ── */}
      <div className="settings-section">
        <div className="settings-label">{t.dataManagement}</div>
        <p className="settings-data-hint">
          {lang === "zh"
            ? "清除所有資料後，應用程式將重新開始設定。此操作無法撤銷。"
            : "Clearing all data will restart the app from the setup screen. This cannot be undone."}
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

      {/* ── Export / Import Card ── */}
      <div className="chart-card">
        <div className="chart-title">{zh ? "匯出資料" : "Export data"}</div>
        <div className="export-btns">
          <button
            className="export-btn"
            disabled={!entries?.length}
            style={{
              opacity: !entries?.length ? 0.5 : 1,
              cursor: !entries?.length ? "not-allowed" : "pointer",
            }}
            onPointerUp={() => {
              if (entries?.length) exportToCSV(entries);
            }}
          >
            📄 CSV
          </button>

          <button
            className="export-btn"
            disabled={!entries?.length}
            style={{
              opacity: !entries?.length ? 0.5 : 1,
              cursor: !entries?.length ? "not-allowed" : "pointer",
            }}
            onPointerUp={() => {
              if (entries?.length) exportToJSON(entries, baby);
            }}
          >
            📦 JSON
          </button>

          <button
            className="export-btn"
            disabled={!entries?.length}
            style={{
              opacity: !entries?.length ? 0.5 : 1,
              cursor: !entries?.length ? "not-allowed" : "pointer",
            }}
            onPointerUp={() => {
              if (entries?.length) {
                const txt = exportToFormattedText(entries, lang);
                const blob = new Blob([txt], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "baby-diary-log.txt";
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
          >
            📋 {zh ? "日誌" : "Log text"}
          </button>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            margin: "20px 0",
          }}
        ></div>

        <div className="chart-title">{zh ? "匯入資料" : "Import data"}</div>

        <div style={{ marginBottom: 16 }}>
          <label
            className="field-label"
            style={{ display: "block", marginBottom: 6 }}
          >
            {zh
              ? "選擇檔案 (JSON / CSV / TXT)"
              : "Choose File (JSON / CSV / TXT)"}
          </label>
          <input
            type="file"
            accept=".json,.csv,.txt"
            style={{ fontSize: 13 }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => handleImport(ev.target.result);
              reader.readAsText(file);
              e.target.value = "";
            }}
          />
        </div>

        <label className="field-label">
          {zh ? "或者貼上日誌文字" : "Or paste log text"}
        </label>
        <textarea
          id="import-text-area"
          rows="4"
          placeholder={zh ? "在此貼上資料..." : "Paste data here..."}
          style={{
            width: "100%",
            marginTop: 6,
            fontSize: 13,
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text-primary)",
            fontFamily: "monospace",
          }}
        />
        <button
          className="export-btn"
          style={{ marginTop: 8, width: "100%" }}
          onPointerUp={() => {
            const rawText = document.getElementById("import-text-area").value;
            handleImport(rawText);
          }}
        >
          📥 {zh ? "從文字匯入" : "Import from text"}
        </button>

        {importError && (
          <div
            style={{
              fontSize: 12,
              marginTop: 10,
              padding: "10px",
              borderRadius: "6px",
              fontWeight: "500",
              backgroundColor:
                importError.includes("failed") ||
                importError.includes("失敗") ||
                importError.includes("Error")
                  ? "#fee2e2"
                  : "#ecfdf5",
              color:
                importError.includes("failed") ||
                importError.includes("失敗") ||
                importError.includes("Error")
                  ? "#dc2626"
                  : "#059669",
            }}
          >
            {importError}
          </div>
        )}
      </div>

      <div
        className="settings-footer"
        style={{ textAlign: "center", marginTop: 40, paddingBottom: 20 }}
      >
        <p style={{ opacity: 0.6 }}>寶寶日記 · Baby Diary v2.0</p>
        <p style={{ fontSize: 11, marginTop: 4, opacity: 0.4 }}>
          {lang === "zh"
            ? "所有資料儲存於本機裝置"
            : "All data stored locally on this device"}
        </p>
      </div>
    </div>
  );
}
