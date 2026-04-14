import React, { useState } from "react";
import { TRANSLATIONS } from "./i18n/translations";
import { load, save } from "./utils/helpers";
import useEntries from "./hooks/useEntries";
import Setup from "./pages/Setup";
import BabyLog from "./pages/BabyLog";
import Diary from "./pages/Diary";
import Analysis from "./pages/Analysis";
import LaborTracker from "./pages/LaborTracker";
import Settings from "./pages/Settings";
import "./App.css";

export default function App() {
  const [lang, setLangState] = useState(() => load("bd_lang", "zh"));
  const [baby, setBabyState] = useState(() => load("bd_baby", null));
  const [tab, setTab] = useState("log");
  const { entries, addEntry, deleteEntry, clearAll, setEntries } = useEntries();

  const t = TRANSLATIONS[lang];

  const setLang = (l) => {
    setLangState(l);
    save("bd_lang", l);
  };

  const setBaby = (b) => {
    setBabyState(b);
    save("bd_baby", b);
  };

  // Full reset: wipe all data AND baby profile → back to Setup
  const resetAll = () => {
    clearAll(); // clears entries in localStorage
    localStorage.removeItem("bd_baby");
    localStorage.removeItem("lt_contractions");
    setBabyState(null);
    setTab("log");
  };

  // Show setup screen if no baby configured
  if (!baby) {
    return (
      <div className="shell">
        <Setup t={t} lang={lang} onSave={setBaby} />
      </div>
    );
  }

  // Nav depends on whether baby has been born
  // Labor tracker is only shown BEFORE birth (pre-natal)
  const NAV = baby.hasBorn
    ? [
        { id: "log", label: lang === "zh" ? "記錄" : "Log", emoji: "👶" },
        { id: "diary", label: lang === "zh" ? "日記" : "Diary", emoji: "📅" },
        {
          id: "analysis",
          label: lang === "zh" ? "分析" : "Analysis",
          emoji: "📊",
        },
        {
          id: "settings",
          label: lang === "zh" ? "設定" : "Settings",
          emoji: "⚙️",
        },
      ]
    : [
        { id: "labor", label: lang === "zh" ? "陣痛" : "Labor", emoji: "⏱" },
        {
          id: "settings",
          label: lang === "zh" ? "設定" : "Settings",
          emoji: "⚙️",
        },
      ];

  // Ensure active tab is always valid for current nav
  const validTabIds = NAV.map((n) => n.id);
  const activeTab = validTabIds.includes(tab) ? tab : NAV[0].id;

  return (
    <div className="shell">
      {/* ── header ── */}
      <header className="app-header">
        <span className="app-header-title">
          {baby.name
            ? lang === "zh"
              ? `${baby.name}的日記`
              : `${baby.name}'s diary`
            : t.appName}
        </span>
        <button
          className="lang-mini-btn"
          onPointerUp={() => setLang(lang === "zh" ? "en" : "zh")}
        >
          {lang === "zh" ? "EN" : "中"}
        </button>
      </header>

      {/* ── page content ── */}
      <main className="app-main">
        {activeTab === "log" && baby.hasBorn && (
          <BabyLog
            t={t}
            lang={lang}
            baby={baby}
            entries={entries}
            addEntry={addEntry}
            updateEntry={updateEntry} // <--- Add this
          />
        )}
        {activeTab === "diary" && baby.hasBorn && (
          <Diary
            t={t}
            lang={lang}
            entries={entries}
            deleteEntry={deleteEntry}
          />
        )}
        {activeTab === "analysis" && baby.hasBorn && (
          <Analysis t={t} lang={lang} entries={entries} baby={baby} />
        )}
        {activeTab === "labor" && !baby.hasBorn && <LaborTracker t={t} />}
        {activeTab === "settings" && (
          <Settings
            t={t}
            lang={lang}
            setLang={setLang}
            baby={baby}
            entries={entries}
            setEntries={setEntries}
            setBaby={(b) => {
              setBaby(b);
              // If user changes hasBorn status, snap tab to first valid tab
              const firstTab = b.hasBorn ? "log" : "labor";
              setTab(firstTab);
            }}
            resetAll={resetAll}
          />
        )}
      </main>

      {/* ── bottom nav ── */}
      <nav className="bottom-nav">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-btn ${activeTab === n.id ? "nav-btn--active" : ""}`}
            onPointerUp={() => setTab(n.id)}
          >
            <span className="nav-emoji">{n.emoji}</span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
