import React, { useState, useMemo } from "react";
import { ACTIONS, FEED_ACTIONS, DIAPER_ACTIONS } from "../utils/actions";
import { fmtDateKey, exportToCSV, exportToJSON } from "../utils/helpers";

function getLast7Keys() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return fmtDateKey(d.getTime());
  });
}

function getLast30Keys() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return fmtDateKey(d.getTime());
  });
}

function groupByDay(entries) {
  const map = {};
  entries.forEach((e) => {
    const k = fmtDateKey(e.timestamp);
    if (!map[k]) map[k] = [];
    map[k].push(e);
  });
  return map;
}

function BarChart({ data, maxVal, color, label }) {
  const max = maxVal || Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bar-chart">
      <div className="bar-chart-bars">
        {data.map((d, i) => (
          <div key={i} className="bar-col">
            <div className="bar-wrap">
              <div
                className="bar-fill"
                style={{
                  height: `${(d.value / max) * 100}%`,
                  background: color,
                  opacity: d.value > 0 ? 1 : 0.15,
                }}
              />
            </div>
            <span className="bar-label">{d.label}</span>
          </div>
        ))}
      </div>
      {label && (
        <div className="bar-chart-legend" style={{ color }}>
          {label}
        </div>
      )}
    </div>
  );
}

function StatCard({ emoji, value, sub, color }) {
  return (
    <div className="analysis-stat" style={{ borderLeftColor: color }}>
      <span className="as-emoji">{emoji}</span>
      <div>
        <div className="as-val">{value}</div>
        <div className="as-sub">{sub}</div>
      </div>
    </div>
  );
}

export default function Analysis({ t, lang, entries, baby }) {
  const [range, setRange] = useState("7");

  const keys = range === "7" ? getLast7Keys() : getLast30Keys();
  const byDay = useMemo(() => groupByDay(entries), [entries]);

  const shortLabel = (k) => {
    const [, m, d] = k.split("-");
    return `${parseInt(m)}/${parseInt(d)}`;
  };

  // Feed counts per day
  const feedData = keys.map((k) => ({
    label: shortLabel(k),
    value: (byDay[k] || []).filter((e) => FEED_ACTIONS.includes(e.type)).length,
  }));

  // Sleep hours per day
  const sleepData = keys.map((k) => ({
    label: shortLabel(k),
    value:
      Math.round(
        (byDay[k] || [])
          .filter((e) => e.type === "sleep")
          .reduce((s, e) => s + (e.durationSec || 0), 0) / 360,
      ) / 10,
  }));

  // Diaper per day
  const diaperData = keys.map((k) => ({
    label: shortLabel(k),
    value: (byDay[k] || []).filter((e) => DIAPER_ACTIONS.includes(e.type))
      .length,
  }));

  // Milk ml per day
  const mlData = keys.map((k) => ({
    label: shortLabel(k),
    value: Math.round(
      (byDay[k] || []).reduce((s, e) => s + (e.amountMl || 0), 0),
    ),
  }));

  // Weight trend (last entries)
  const weightEntries = entries
    .filter((e) => e.type === "weight" && e.weightG)
    .slice(0, 10)
    .reverse();

  // Averages
  const activeDays =
    keys.filter((k) => (byDay[k] || []).length > 0).length || 1;
  const avgFeeds = (
    feedData.reduce((s, d) => s + d.value, 0) / activeDays
  ).toFixed(1);
  const avgSleep = (
    sleepData.reduce((s, d) => s + d.value, 0) / activeDays
  ).toFixed(1);
  const avgDiapers = (
    diaperData.reduce((s, d) => s + d.value, 0) / activeDays
  ).toFixed(1);
  const avgMl = Math.round(
    mlData.reduce((s, d) => s + d.value, 0) / activeDays,
  );

  // Action breakdown pie-like bar
  const actionBreakdown = Object.entries(ACTIONS)
    .map(([type, a]) => ({
      type,
      a,
      count: entries.filter((e) => e.type === type).length,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxCount = Math.max(...actionBreakdown.map((x) => x.count), 1);

  return (
    <div className="analysis-page">
      {/* range toggle */}
      <div className="range-toggle">
        <button
          className={`range-btn ${range === "7" ? "active" : ""}`}
          onPointerUp={() => setRange("7")}
        >
          {t.last7Days}
        </button>
        <button
          className={`range-btn ${range === "30" ? "active" : ""}`}
          onPointerUp={() => setRange("30")}
        >
          {t.last30Days}
        </button>
      </div>

      {/* summary stats */}
      <div className="analysis-stats">
        <StatCard
          emoji="🍼"
          value={avgFeeds}
          sub={t.avgFeedsPerDay}
          color="#f9a8d4"
        />
        <StatCard
          emoji="😴"
          value={`${avgSleep}h`}
          sub={t.avgSleepHours}
          color="#a78bfa"
        />
        <StatCard
          emoji="🩲"
          value={avgDiapers}
          sub={t.avgDiapersPerDay}
          color="#6ee7b7"
        />
        <StatCard
          emoji="🥛"
          value={avgMl > 0 ? `${avgMl}ml` : "—"}
          sub={lang === "zh" ? "平均奶量" : "Avg milk"}
          color="#93c5fd"
        />
      </div>

      {/* feeding chart */}
      <div className="chart-card">
        <div className="chart-title">{t.feedingTrend}</div>
        <BarChart
          data={feedData}
          color="#f9a8d4"
          label={lang === "zh" ? "次數" : "feeds"}
        />
      </div>

      {/* ml chart */}
      {mlData.some((d) => d.value > 0) && (
        <div className="chart-card">
          <div className="chart-title">
            {lang === "zh" ? "奶量 (ml)" : "Milk (ml)"}
          </div>
          <BarChart data={mlData} color="#93c5fd" label="ml" />
        </div>
      )}

      {/* sleep chart */}
      <div className="chart-card">
        <div className="chart-title">{t.sleepPattern}</div>
        <BarChart
          data={sleepData}
          color="#a78bfa"
          label={lang === "zh" ? "小時" : "hours"}
        />
      </div>

      {/* diaper chart */}
      <div className="chart-card">
        <div className="chart-title">{t.diaperCount}</div>
        <BarChart
          data={diaperData}
          color="#6ee7b7"
          label={lang === "zh" ? "次" : "changes"}
        />
      </div>

      {/* weight trend */}
      {weightEntries.length >= 2 && (
        <div className="chart-card">
          <div className="chart-title">
            {lang === "zh" ? "體重趨勢" : "Weight trend"}
          </div>
          <div className="weight-trend">
            {weightEntries.map((e, i) => (
              <div key={e.id} className="weight-row">
                <span className="weight-date">{fmtDateKey(e.timestamp)}</span>
                <div className="weight-bar-wrap">
                  <div
                    className="weight-bar"
                    style={{
                      width: `${(e.weightG / weightEntries[weightEntries.length - 1].weightG) * 100}%`,
                      background: "#8b5cf6",
                    }}
                  />
                </div>
                <span className="weight-val">{e.weightG}g</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* action breakdown */}
      {actionBreakdown.length > 0 && (
        <div className="chart-card">
          <div className="chart-title">
            {lang === "zh" ? "記錄分佈" : "Activity breakdown"}
          </div>
          {actionBreakdown.map(({ type, a, count }) => (
            <div key={type} className="breakdown-row">
              <span className="bd-emoji">{a.emoji}</span>
              <div className="bd-bar-wrap">
                <div
                  className="bd-bar"
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                    background: a.color,
                  }}
                />
              </div>
              <span className="bd-count">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* export */}
      <div className="export-section">
        <div className="chart-title">{t.exportData}</div>
        <div className="export-btns">
          <button
            className="export-btn"
            onPointerUp={() => exportToCSV(entries)}
          >
            📄 {t.exportCSV}
          </button>
          <button
            className="export-btn"
            onPointerUp={() => exportToJSON(entries, baby)}
          >
            📦 {t.exportJSON}
          </button>
        </div>
      </div>
    </div>
  );
}
