import React, { useState, useMemo } from "react";
import {
  ACTIONS,
  FEED_ACTIONS,
  DIAPER_ACTIONS,
  GROWTH_ACTIONS,
} from "../utils/actions";
import {
  fmtDateKey,
  exportToCSV,
  exportToJSON,
  exportToFormattedText,
  importFromJSON,
  importFromCSV,
  importFromFormattedText,
} from "../utils/helpers";

// ── WHO growth reference data (simplified percentiles) ────────────────────
const WHO_WEIGHT = {
  // age months → [P3, P15, P50, P85, P97] in grams
  0: [2500, 2800, 3300, 3900, 4300],
  1: [3400, 3800, 4500, 5100, 5700],
  2: [4300, 4900, 5600, 6300, 6800],
  3: [5000, 5700, 6400, 7100, 7700],
  4: [5600, 6200, 7000, 7800, 8400],
  6: [6400, 7100, 7900, 8800, 9500],
  9: [7200, 8000, 8900, 9900, 10600],
  12: [7800, 8700, 9600, 10800, 11500],
  18: [8800, 9800, 10900, 12200, 13000],
  24: [9700, 10900, 12200, 13500, 14500],
};
const WHO_HEIGHT = {
  // age months → [P3, P15, P50, P85, P97] in cm
  0: [46.3, 47.9, 49.9, 52.0, 53.4],
  1: [50.8, 52.5, 54.7, 56.9, 58.5],
  2: [54.4, 56.3, 58.4, 60.7, 62.4],
  3: [57.3, 59.4, 61.4, 63.8, 65.5],
  4: [59.7, 61.8, 63.9, 66.3, 68.0],
  6: [63.3, 65.6, 67.6, 70.3, 72.1],
  9: [68.0, 70.1, 72.3, 75.0, 77.1],
  12: [71.7, 73.9, 75.7, 78.8, 81.2],
  18: [77.5, 80.0, 82.3, 85.4, 87.7],
  24: [82.5, 85.1, 87.8, 91.1, 93.6],
};
const WHO_HEAD = {
  // age months → [P3, P15, P50, P85, P97] in cm
  0: [31.7, 32.8, 34.5, 36.2, 37.3],
  1: [34.4, 35.5, 37.3, 39.0, 40.1],
  2: [36.2, 37.4, 39.1, 40.8, 41.9],
  3: [37.7, 38.9, 40.5, 42.2, 43.3],
  6: [41.0, 42.2, 43.8, 45.5, 46.5],
  9: [43.0, 44.2, 45.8, 47.5, 48.5],
  12: [44.5, 45.8, 47.2, 48.9, 49.9],
  18: [46.1, 47.4, 48.9, 50.5, 51.5],
  24: [47.2, 48.5, 50.0, 51.6, 52.6],
};

function getWhoRef(table, ageMonths) {
  const keys = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  let lo = keys[0],
    hi = keys[keys.length - 1];
  for (const k of keys) {
    if (k <= ageMonths) lo = k;
  }
  for (const k of [...keys].reverse()) {
    if (k >= ageMonths) hi = k;
  }
  if (lo === hi) return table[lo];
  const t = (ageMonths - lo) / (hi - lo);
  return table[lo].map((v, i) => v + t * (table[hi][i] - v));
}

// ── Bar chart ─────────────────────────────────────────────────────────────
function BarChart({ data, color, unit }) {
  const max = Math.max(...data.map((d) => d.value), 1);
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
                  opacity: d.value > 0 ? 1 : 0.12,
                }}
              />
            </div>
            <span className="bar-label">{d.label}</span>
            {d.value > 0 && (
              <span className="bar-val">
                {d.value}
                {unit || ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
const GROWTH_ACTION_MAP = {
  weight: "weight",
  height: "height",
  head: "head",
  chest: "chest",
};
const GROWTH_UNIT_MAP = { weight: "g", height: "cm", head: "cm", chest: "cm" };
const GROWTH_WHO_MAP = {
  weight: WHO_WEIGHT,
  height: WHO_HEIGHT,
  head: WHO_HEAD,
};

// ── Growth chart ──────────────────────────────────────────────────────────
function GrowthChart({ entries, baby, metric, lang }) {
  const zh = lang === "zh";
  const birthday = useMemo(() => {
    return baby?.date ? new Date(baby.date) : null;
  }, [baby?.date]);

  const measurements = useMemo(
    () =>
      entries
        .filter(
          (e) => e.type === GROWTH_ACTION_MAP[metric] && e.valueNum != null,
        )
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((e) => ({
          ts: e.timestamp,
          ageMonths: birthday
            ? (e.timestamp - birthday.getTime()) / (30.44 * 24 * 3600 * 1000)
            : null,
          value: e.valueNum,
        })),
    [entries, metric, birthday],
  );

  if (measurements.length === 0) {
    return (
      <div className="chart-empty">
        {zh
          ? `尚無${ACTIONS[metric]?.labelZh}記錄`
          : `No ${ACTIONS[metric]?.labelEn} records yet`}
      </div>
    );
  }

  const hasWho = GROWTH_WHO_MAP[metric] && birthday;
  const maxAge = hasWho
    ? Math.max(...measurements.map((m) => m.ageMonths), 24)
    : null;
  const maxVal = Math.max(...measurements.map((m) => m.value)) * 1.1;

  const H = 160,
    W = 100; // viewBox units (%)
  const padL = 12,
    padR = 4,
    padT = 8,
    padB = 20;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const toX = (ageMonths) => padL + (ageMonths / (maxAge || 1)) * innerW;
  const toY = (val) => padT + innerH - (val / maxVal) * innerH;

  // WHO reference bands
  const whoPercentiles = hasWho
    ? [3, 50, 97].map((_, idx) => {
        const ages = [0, 1, 2, 3, 4, 6, 9, 12, 18, 24].filter(
          (a) => a <= maxAge + 2,
        );
        return ages.map((a) => {
          const ref = getWhoRef(GROWTH_WHO_MAP[metric], a);
          return { x: toX(a), y: toY(ref[[0, 2, 4][idx]]) };
        });
      })
    : [];

  const pts = measurements.map((m) => ({
    x: toX(m.ageMonths || 0),
    y: toY(m.value),
    value: m.value,
    ageMonths: m.ageMonths,
  }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  return (
    <div className="growth-chart">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {/* WHO bands */}
        {hasWho && whoPercentiles.length === 3 && (
          <>
            <polygon
              points={[
                ...whoPercentiles[0].map((p) => `${p.x},${p.y}`),
                ...whoPercentiles[2].map((p) => `${p.x},${p.y}`).reverse(),
              ].join(" ")}
              fill={ACTIONS[metric]?.color || "#93c5fd"}
              opacity={0.12}
            />
            {[0, 1, 2].map((idx, i) => (
              <polyline
                key={i}
                points={whoPercentiles[idx]
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ")}
                stroke={ACTIONS[metric]?.color || "#93c5fd"}
                strokeWidth={0.4}
                fill="none"
                strokeDasharray={idx === 1 ? "" : "2,1"}
                opacity={0.6}
              />
            ))}
          </>
        )}
        {/* Measurement line */}
        {pts.length > 1 && (
          <path
            d={linePath}
            stroke={ACTIONS[metric]?.color || "#8b5cf6"}
            strokeWidth={0.8}
            fill="none"
          />
        )}
        {/* Data points */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={1.2}
              fill={ACTIONS[metric]?.color || "#8b5cf6"}
            />
            <text
              x={p.x}
              y={p.y - 2.5}
              textAnchor="middle"
              fontSize={2.5}
              fill="#6b7280"
            >
              {metric === "weight"
                ? (p.value / 1000).toFixed(1) + "kg"
                : p.value + GROWTH_UNIT_MAP[metric]}
            </text>
          </g>
        ))}
        {/* Axes */}
        <line
          x1={padL}
          y1={padT + innerH}
          x2={padL + innerW}
          y2={padT + innerH}
          stroke="#e5e7eb"
          strokeWidth={0.4}
        />
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + innerH}
          stroke="#e5e7eb"
          strokeWidth={0.4}
        />
      </svg>
      {hasWho && (
        <div className="growth-legend">
          <span className="growth-legend-line growth-legend-line--ref">
            {zh ? "WHO P3/P50/P97" : "WHO P3/P50/P97"}
          </span>
          <span className="growth-legend-line growth-legend-line--data">
            {zh ? "實際數據" : "Your baby"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Chart config ──────────────────────────────────────────────────────────
const CHART_CONFIGS = [
  {
    id: "feeds",
    labelZh: "餵食次數",
    labelEn: "Feeds",
    color: "#f9a8d4",
    unit: "",
  },
  {
    id: "milk",
    labelZh: "奶量ml",
    labelEn: "Milk (ml)",
    color: "#93c5fd",
    unit: "ml",
  },
  {
    id: "sleep",
    labelZh: "睡眠",
    labelEn: "Sleep (h)",
    color: "#a78bfa",
    unit: "h",
  },
  {
    id: "diapers",
    labelZh: "尿片",
    labelEn: "Diapers",
    color: "#6ee7b7",
    unit: "",
  },
  {
    id: "bf_l",
    labelZh: "母乳左",
    labelEn: "BF Left (m)",
    color: "#fda4af",
    unit: "m",
  },
  {
    id: "bf_r",
    labelZh: "母乳右",
    labelEn: "BF Right (m)",
    color: "#f9a8d4",
    unit: "m",
  },
];

export default function Analysis({ t, lang, entries, baby }) {
  const zh = lang === "zh";
  const [range, setRange] = useState("7");
  const [activeCharts, setActive] = useState(
    new Set(["feeds", "milk", "sleep", "diapers"]),
  );
  const [growthMetric, setGrowthMetric] = useState("weight");
  const [importError, setImportError] = useState("");

  const keys = useMemo(() => {
    const n = range === "7" ? 7 : 30;
    return Array.from({ length: n }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (n - 1 - i));
      return fmtDateKey(d.getTime());
    });
  }, [range]);

  const byDay = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const k = fmtDateKey(e.timestamp);
      if (!map[k]) map[k] = [];
      map[k].push(e);
    });
    return map;
  }, [entries]);

  const shortLbl = (k) => {
    const [, m, d] = k.split("-");
    return `${parseInt(m)}/${parseInt(d)}`;
  };

  const buildData = (id) =>
    keys.map((k) => {
      const day = byDay[k] || [];
      let val = 0;
      if (id === "feeds")
        val = day.filter((e) => FEED_ACTIONS.includes(e.type)).length;
      if (id === "milk")
        val = Math.round(day.reduce((s, e) => s + (e.amountMl || 0), 0));
      if (id === "sleep")
        val =
          Math.round(
            day
              .filter((e) => e.type === "sleep")
              .reduce((s, e) => s + (e.durationSec || 0), 0) / 360,
          ) / 10;
      if (id === "diapers")
        val = day.filter((e) => DIAPER_ACTIONS.includes(e.type)).length;
      if (id === "bf_l")
        val = day
          .filter((e) => e.type === "breastfeed")
          .reduce((s, e) => s + (e.breastL || 0), 0);
      if (id === "bf_r")
        val = day
          .filter((e) => e.type === "breastfeed")
          .reduce((s, e) => s + (e.breastR || 0), 0);
      return { label: shortLbl(k), value: val };
    });

  const activeDays =
    keys.filter((k) => (byDay[k] || []).length > 0).length || 1;
  const avgFeeds = (
    buildData("feeds").reduce((s, d) => s + d.value, 0) / activeDays
  ).toFixed(1);
  const avgMl = Math.round(
    buildData("milk").reduce((s, d) => s + d.value, 0) / activeDays,
  );
  const avgSleep = (
    buildData("sleep").reduce((s, d) => s + d.value, 0) / activeDays
  ).toFixed(1);
  const avgDiapers = (
    buildData("diapers").reduce((s, d) => s + d.value, 0) / activeDays
  ).toFixed(1);

  const toggleChart = (id) => {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const showAll = () => setActive(new Set(CHART_CONFIGS.map((c) => c.id)));
  const hideAll = () => setActive(new Set());

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        let data;
        if (fileName.endsWith(".json")) data = importFromJSON(ev.target.result);
        else if (fileName.endsWith(".csv"))
          data = importFromCSV(ev.target.result);
        else if (fileName.endsWith(".txt"))
          data = importFromFormattedText(ev.target.result);

        if (data?.entries?.length) {
          // Log counts for user feedback
          setImportError(
            zh
              ? `已匯入 ${data.entries.length} 條記錄`
              : `Imported ${data.entries.length} entries`,
          );
        }
      } catch {
        setImportError(
          zh ? "匯入失敗：格式不符" : "Import failed: format error",
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="analysis-page">
      {/* ── Range toggle ── */}
      <div className="range-toggle">
        <button
          className={`range-btn ${range === "7" ? "active" : ""}`}
          onPointerUp={() => setRange("7")}
        >
          {zh ? "過去7天" : "Last 7 days"}
        </button>
        <button
          className={`range-btn ${range === "30" ? "active" : ""}`}
          onPointerUp={() => setRange("30")}
        >
          {zh ? "過去30天" : "Last 30 days"}
        </button>
      </div>

      {/* ── Summary stats ── */}
      <div className="analysis-stats">
        {[
          {
            emoji: "🍼",
            val: avgFeeds,
            lbl: zh ? "平均餵食/天" : "Avg feeds/day",
            color: "#f9a8d4",
          },
          {
            emoji: "🥛",
            val: avgMl > 0 ? `${avgMl}ml` : "—",
            lbl: zh ? "平均奶量/天" : "Avg milk/day",
            color: "#93c5fd",
          },
          {
            emoji: "😴",
            val: `${avgSleep}h`,
            lbl: zh ? "平均睡眠/天" : "Avg sleep/day",
            color: "#a78bfa",
          },
          {
            emoji: "🩲",
            val: avgDiapers,
            lbl: zh ? "平均尿片/天" : "Avg diapers/day",
            color: "#6ee7b7",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="analysis-stat"
            style={{ borderLeftColor: s.color }}
          >
            <span className="as-emoji">{s.emoji}</span>
            <div>
              <div className="as-val">{s.val}</div>
              <div className="as-sub">{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart toggle strip ── */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-title">{zh ? "圖表選擇" : "Charts"}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="range-btn active"
              onPointerUp={showAll}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              {zh ? "全選" : "All"}
            </button>
            <button
              className="range-btn"
              onPointerUp={hideAll}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              {zh ? "清除" : "None"}
            </button>
          </div>
        </div>
        <div className="chart-toggles">
          {CHART_CONFIGS.map((c) => (
            <button
              key={c.id}
              className={`chart-toggle-btn ${activeCharts.has(c.id) ? "chart-toggle-btn--on" : ""}`}
              style={
                activeCharts.has(c.id)
                  ? { background: c.color, borderColor: c.color, color: "#111" }
                  : {}
              }
              onPointerUp={() => toggleChart(c.id)}
            >
              {zh ? c.labelZh : c.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* ── Active charts ── */}
      {CHART_CONFIGS.filter((c) => activeCharts.has(c.id)).map((c) => (
        <div key={c.id} className="chart-card">
          <div className="chart-title">{zh ? c.labelZh : c.labelEn}</div>
          <BarChart data={buildData(c.id)} color={c.color} unit={c.unit} />
        </div>
      ))}

      {/* ── Growth chart ── */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div className="chart-title">{zh ? "生長曲線" : "Growth chart"}</div>
        </div>
        <div className="growth-metric-tabs">
          {GROWTH_ACTIONS.map((id) => (
            <button
              key={id}
              className={`growth-tab ${growthMetric === id ? "growth-tab--on" : ""}`}
              style={
                growthMetric === id
                  ? {
                      background: ACTIONS[id]?.color,
                      borderColor: ACTIONS[id]?.color,
                    }
                  : {}
              }
              onPointerUp={() => setGrowthMetric(id)}
            >
              {ACTIONS[id]?.emoji}{" "}
              {zh ? ACTIONS[id]?.labelZh : ACTIONS[id]?.labelEn}
            </button>
          ))}
        </div>
        <GrowthChart
          entries={entries}
          baby={baby}
          metric={growthMetric}
          lang={lang}
        />
      </div>

      {/* ── Export / Import ── */}
      <div className="chart-card">
        <div className="chart-title">{zh ? "匯出資料" : "Export data"}</div>
        <div className="export-btns">
          <button
            className="export-btn"
            onPointerUp={() => exportToCSV(entries)}
          >
            📄 CSV
          </button>
          <button
            className="export-btn"
            onPointerUp={() => exportToJSON(entries, baby)}
          >
            📦 JSON
          </button>
          <button
            className="export-btn"
            onPointerUp={() => {
              const txt = exportToFormattedText(entries, lang);
              const blob = new Blob([txt], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "baby-diary-log.txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            📋 {zh ? "日誌" : "Log text"}
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="field-label">
            {zh ? "匯入 JSON" : "Import JSON"}
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{
              display: "block",
              marginTop: 6,
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          />
          {importError && (
            <div
              style={{
                fontSize: 12,
                marginTop: 4,
                color:
                  importError.includes("失敗") || importError.includes("failed")
                    ? "#dc2626"
                    : "#059669",
              }}
            >
              {importError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
