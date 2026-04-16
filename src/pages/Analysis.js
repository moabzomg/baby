import React, { useState, useMemo } from "react";
import { ACTIONS, FEED_ACTIONS, DIAPER_ACTIONS, GROWTH_ACTIONS } from "../utils/actions";
import { fmtDateKey, fmtTime24, exportToCSV, exportToJSON, exportToFormattedText,
         importFromJSON, computeSleepDurations, getDaySleepSegments, isSameDay } from "../utils/helpers";

// ── WHO reference data ────────────────────────────────────────────────────
const WHO_WEIGHT = {
  0:[2500,2800,3300,3900,4300],1:[3400,3800,4500,5100,5700],2:[4300,4900,5600,6300,6800],
  3:[5000,5700,6400,7100,7700],4:[5600,6200,7000,7800,8400],6:[6400,7100,7900,8800,9500],
  9:[7200,8000,8900,9900,10600],12:[7800,8700,9600,10800,11500],18:[8800,9800,10900,12200,13000],
  24:[9700,10900,12200,13500,14500],36:[12000,13500,14700,16500,17500],
  48:[13700,15300,16700,18700,20000],60:[15500,17200,19200,21500,23000],
  72:[17000,19000,21400,24000,25800],84:[18800,21000,23800,27000,29000],
  96:[20500,23000,26400,30200,32700],108:[22200,25200,29300,34000,37000],
  120:[24000,27500,32500,38500,42500],132:[26000,30200,36000,43500,48500],
  144:[28500,33500,40000,49000,55000],156:[31500,37000,45000,55500,63000],
  168:[36000,42000,52000,64000,73000],180:[41000,48000,60000,74000,84000],
  192:[46500,54500,67500,83000,94000],204:[52000,61000,75000,91000,103000],
  216:[57000,67000,82000,98000,110000],
};
const WHO_HEIGHT = {
  0:[46.3,47.9,49.9,52.0,53.4],1:[50.8,52.5,54.7,56.9,58.5],2:[54.4,56.3,58.4,60.7,62.4],
  3:[57.3,59.4,61.4,63.8,65.5],4:[59.7,61.8,63.9,66.3,68.0],6:[63.3,65.6,67.6,70.3,72.1],
  9:[68.0,70.1,72.3,75.0,77.1],12:[71.7,73.9,75.7,78.8,81.2],18:[77.5,80.0,82.3,85.4,87.7],
  24:[82.5,85.1,87.8,91.1,93.6],36:[88.7,91.9,96.1,100.0,103.0],48:[94.9,98.7,103.3,107.8,111.1],
  60:[100.7,104.9,110.0,115.0,118.7],72:[106.1,110.8,116.4,122.0,126.2],84:[111.2,116.2,122.4,128.6,133.2],
  96:[116.2,121.5,128.3,135.2,140.2],108:[120.9,126.6,134.0,141.5,147.0],
  120:[125.6,131.6,139.6,147.8,153.8],132:[130.3,136.8,145.2,154.1,160.6],
  144:[135.1,141.9,150.9,160.4,167.4],156:[140.1,147.3,156.6,166.8,174.3],
  168:[145.2,152.7,162.2,172.8,180.7],180:[150.2,158.0,167.8,178.7,186.9],
};
const WHO_HEAD = {
  0:[31.7,32.8,34.5,36.2,37.3],1:[34.4,35.5,37.3,39.0,40.1],2:[36.2,37.4,39.1,40.8,41.9],
  3:[37.7,38.9,40.5,42.2,43.3],6:[41.0,42.2,43.8,45.5,46.5],9:[43.0,44.2,45.8,47.5,48.5],
  12:[44.5,45.8,47.2,48.9,49.9],18:[46.1,47.4,48.9,50.5,51.5],24:[47.2,48.5,50.0,51.6,52.6],
};

function getWhoRef(table, ageMonths) {
  const keys = Object.keys(table).map(Number).sort((a,b)=>a-b);
  let lo=keys[0], hi=keys[keys.length-1];
  for (const k of keys) { if (k<=ageMonths) lo=k; }
  for (const k of [...keys].reverse()) { if (k>=ageMonths) hi=k; }
  if (lo===hi) return table[lo];
  const t=(ageMonths-lo)/(hi-lo);
  return table[lo].map((v,i)=>v+t*(table[hi][i]-v));
}

// ── Day key helpers ───────────────────────────────────────────────────────
function getDayKeys(n) {
  return Array.from({length:n},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(n-1-i));
    return fmtDateKey(d.getTime());
  });
}
function shortLbl(k) { const [,m,d]=k.split('-'); return `${parseInt(m)}/${parseInt(d)}`; }

// ── Simple bar chart ──────────────────────────────────────────────────────
function BarChart({ data, color, unit, h=120 }) {
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div className="bar-chart">
      <div className="bar-chart-bars" style={{height:h}}>
        {data.map((d,i)=>(
          <div key={i} className="bar-col">
            <div className="bar-wrap">
              <div className="bar-fill" style={{height:`${(d.value/max)*100}%`,background:color,opacity:d.value>0?1:0.12}}/>
            </div>
            <span className="bar-label">{d.label}</span>
            {d.value>0&&<span className="bar-val">{d.value}{unit||""}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Combined "ALL" chart — multiple series on same SVG ───────────────────
function CombinedChart({ series, keys, zh }) {
  const W=100, H=80, padL=6, padR=2, padT=8, padB=16;
  const iW=W-padL-padR, iH=H-padT-padB;
  const n=keys.length;
  const toX=i=>padL+((i+0.5)/n)*iW;

  return (
    <div style={{overflowX:'auto'}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',minWidth:300,height:'auto'}}>
        {series.map(s=>{
          const max=Math.max(...s.data.map(d=>d.value),1);
          const toY=v=>padT+iH-(v/max)*iH;
          return (
            <g key={s.id}>
              {/* bars with low opacity */}
              {s.data.map((d,i)=>(
                <rect key={i}
                  x={toX(i)-iW/(n*2)*0.6} y={toY(d.value)} width={iW/n*0.6} height={iH-(toY(d.value)-padT)}
                  fill={s.color} opacity={0.5} rx={1}/>
              ))}
              {/* line overlay */}
              {s.data.length>1&&(
                <polyline
                  points={s.data.map((d,i)=>`${toX(i)},${padT+iH-(d.value/Math.max(...s.data.map(x=>x.value),1))*iH}`).join(' ')}
                  fill="none" stroke={s.color} strokeWidth={0.8} opacity={0.9}/>
              )}
            </g>
          );
        })}
        {/* x-axis labels */}
        {keys.filter((_,i)=>i%Math.ceil(n/7)===0).map((k,i,arr)=>{
          const realIdx=keys.indexOf(k);
          return (
            <text key={k} x={toX(realIdx)} y={H-2} textAnchor="middle" fontSize={2.5} fill="var(--text-tertiary)">
              {shortLbl(k)}
            </text>
          );
        })}
        <line x1={padL} y1={padT+iH} x2={padL+iW} y2={padT+iH} stroke="var(--border)" strokeWidth={0.3}/>
      </svg>
    </div>
  );
}

// ── Temperature line chart ────────────────────────────────────────────────
function TempLineChart({ entries, lang }) {
  const zh = lang==="zh";
  const temps = useMemo(()=>
    entries.filter(e=>e.type==="temp"&&e.valueNum!=null)
      .sort((a,b)=>a.timestamp-b.timestamp)
      .slice(-30),
    [entries]
  );
  if (temps.length===0) return <div className="chart-empty">{zh?"尚無體溫記錄":"No temperature records"}</div>;

  const W=100, H=60, padL=10, padR=4, padT=6, padB=12;
  const iW=W-padL-padR, iH=H-padT-padB;
  const vals=temps.map(t=>t.valueNum);
  const minV=Math.min(...vals,36)-0.2, maxV=Math.max(...vals,38)+0.2;
  const n=temps.length;
  const toX=i=>padL+(i/(Math.max(n-1,1)))*iW;
  const toY=v=>padT+iH-((v-minV)/(maxV-minV))*iH;
  const NORMAL_Y_TOP=toY(37.5), NORMAL_Y_BOT=toY(36.0);
  const linePts=temps.map((t,i)=>`${toX(i)},${toY(t.valueNum)}`).join(' ');
  const statusColor=(v)=>v<36?"#60a5fa":v<=37.5?"#22c55e":v<=38.5?"#f59e0b":"#ef4444";

  return (
    <div className="temp-line-chart">
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto'}}>
        {/* Normal range band */}
        <rect x={padL} y={NORMAL_Y_TOP} width={iW} height={NORMAL_Y_BOT-NORMAL_Y_TOP} fill="#22c55e" opacity={0.08}/>
        {/* Lines */}
        {[37.5,38.5].map(v=>(
          <line key={v} x1={padL} y1={toY(v)} x2={padL+iW} y2={toY(v)} stroke={statusColor(v+0.1)} strokeWidth={0.3} strokeDasharray="2,1" opacity={0.5}/>
        ))}
        {/* Main line */}
        <polyline points={linePts} fill="none" stroke="#f43f5e" strokeWidth={0.8}/>
        {/* Dots */}
        {temps.map((t,i)=>(
          <circle key={i} cx={toX(i)} cy={toY(t.valueNum)} r={1.2} fill={statusColor(t.valueNum)}/>
        ))}
        {/* Y axis labels */}
        {[36,37,38,39].filter(v=>v>=minV&&v<=maxV).map(v=>(
          <text key={v} x={padL-1} y={toY(v)+1} textAnchor="end" fontSize={2.5} fill="var(--text-tertiary)">{v}</text>
        ))}
        {/* X axis */}
        <line x1={padL} y1={padT+iH} x2={padL+iW} y2={padT+iH} stroke="var(--border)" strokeWidth={0.3}/>
        {/* X labels — show first and last */}
        {[0,temps.length-1].map(i=>(
          <text key={i} x={toX(i)} y={H-1} textAnchor="middle" fontSize={2.2} fill="var(--text-tertiary)">
            {new Date(temps[i].timestamp).toLocaleDateString([],{month:'numeric',day:'numeric'})}
          </text>
        ))}
      </svg>
      <div className="dot-legend" style={{marginTop:4}}>
        {[{c:"#60a5fa",l:zh?"低温":"Low"},{c:"#22c55e",l:zh?"正常":"Normal"},{c:"#f59e0b",l:zh?"低燒":"Low fever"},{c:"#ef4444",l:zh?"發燒":"Fever"}].map(x=>(
          <span key={x.l} className="dot-legend-item"><span className="dot-legend-dot" style={{background:x.c}}/>{x.l}</span>
        ))}
      </div>
    </div>
  );
}

// ── Sleep shading chart ───────────────────────────────────────────────────
function SleepShadingChart({ entries, dayKeys, lang }) {
  const zh = lang==="zh";
  return (
    <div className="sleep-timeline">
      <div style={{display:'flex',gap:4,marginBottom:4}}>
        {["0h","6h","12h","18h","24h"].map(l=><span key={l} style={{flex:1,fontSize:9,color:'var(--text-tertiary)',textAlign:'center'}}>{l}</span>)}
      </div>
      {dayKeys.slice(-7).map(k=>{
        const dayEnt = entries.filter(e=>fmtDateKey(e.timestamp)===k);
        const segs = getDaySleepSegments(dayEnt);
        const dayStart = new Date(k+"T00:00:00").getTime();
        const dayMs = 86400000;
        const [,m,d]=k.split('-');
        return (
          <div key={k} style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
            <span style={{fontSize:9,color:'var(--text-tertiary)',width:28,flexShrink:0,textAlign:'right'}}>{`${parseInt(m)}/${parseInt(d)}`}</span>
            <div style={{flex:1,height:14,background:'var(--bg)',borderRadius:3,overflow:'hidden',border:'1px solid var(--border)',position:'relative'}}>
              {segs.map((seg,i)=>{
                const left=((seg.start-dayStart)/dayMs)*100;
                const width=((seg.end-seg.start)/dayMs)*100;
                return <div key={i} style={{position:'absolute',left:`${Math.max(0,left)}%`,width:`${Math.min(100-Math.max(0,left),width)}%`,height:'100%',background:'#a78bfa',opacity:.7}}/>;
              })}
            </div>
          </div>
        );
      })}
      <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
        <div style={{width:12,height:8,background:'#a78bfa',borderRadius:2,opacity:.7}}/>
        <span style={{fontSize:11,color:'var(--text-secondary)'}}>{zh?"睡眠":"Sleep"}</span>
      </div>
    </div>
  );
}

// ── Diaper chart: time-of-day dots OR count bar chart ────────────────────
function DiaperChart({ entries, dayKeys, lang, zh }) {
  const [view, setView] = useState("count");
  const types = [{id:"pee",color:"#60a5fa",label:zh?"小便":"Pee"},{id:"poo",color:"#d97706",label:zh?"大便":"Poo"},{id:"pee_poo",color:"#86efac",label:zh?"大小便":"Both"}];

  const countData = types.map(ty=>({
    ...ty,
    data: dayKeys.map(k=>({
      label:shortLbl(k),
      value:entries.filter(e=>fmtDateKey(e.timestamp)===k&&e.type===ty.id).length
    }))
  }));

  if (view==="count") {
    return (
      <>
        <div className="diaper-view-toggle">
          <button className={`diaper-toggle-btn ${view==="count"?"active":""}`} onPointerUp={()=>setView("count")}>{zh?"次數":"Count"}</button>
          <button className={`diaper-toggle-btn ${view==="time"?"active":""}`} onPointerUp={()=>setView("time")}>{zh?"時間":"Time"}</button>
        </div>
        {types.map(ty=>(
          <div key={ty.id} style={{marginBottom:12}}>
            <div style={{fontSize:11,color:'var(--text-tertiary)',marginBottom:4}}>{ty.label}</div>
            <BarChart data={countData.find(d=>d.id===ty.id)?.data||[]} color={ty.color} unit="" h={60}/>
          </div>
        ))}
      </>
    );
  }

  // Time-of-day dot view (0–24h axis)
  const diaperByDay = {};
  dayKeys.forEach(k=>diaperByDay[k]=[]);
  entries.filter(e=>DIAPER_ACTIONS.includes(e.type)&&dayKeys.includes(fmtDateKey(e.timestamp)))
    .forEach(e=>diaperByDay[fmtDateKey(e.timestamp)].push(e));

  return (
    <>
      <div className="diaper-view-toggle">
        <button className={`diaper-toggle-btn ${view==="count"?"active":""}`} onPointerUp={()=>setView("count")}>{zh?"次數":"Count"}</button>
        <button className={`diaper-toggle-btn ${view==="time"?"active":""}`} onPointerUp={()=>setView("time")}>{zh?"時間":"Time"}</button>
      </div>
      <div style={{display:'flex',gap:4,marginBottom:4,paddingLeft:36}}>
        {["0h","6h","12h","18h","24h"].map(l=><span key={l} style={{flex:1,fontSize:9,color:'var(--text-tertiary)',textAlign:'center'}}>{l}</span>)}
      </div>
      {dayKeys.slice(-7).map(k=>(
        <div key={k} style={{display:'flex',alignItems:'center',gap:4,marginBottom:3}}>
          <span style={{fontSize:9,color:'var(--text-tertiary)',width:32,flexShrink:0,textAlign:'right'}}>{shortLbl(k)}</span>
          <div style={{flex:1,height:18,position:'relative'}}>
            {(diaperByDay[k]||[]).map((e,i)=>{
              const dayStart=new Date(k+"T00:00:00").getTime();
              const pct=((e.timestamp-dayStart)/86400000)*100;
              const ty=types.find(t=>t.id===e.type)||types[0];
              return <div key={i} style={{position:'absolute',left:`${pct}%`,top:'50%',transform:'translate(-50%,-50%)',width:8,height:8,borderRadius:'50%',background:ty.color,border:'1.5px solid rgba(0,0,0,0.15)'}}/>;
            })}
          </div>
        </div>
      ))}
      <div className="dot-legend" style={{marginTop:6}}>
        {types.map(ty=><span key={ty.id} className="dot-legend-item"><span className="dot-legend-dot" style={{background:ty.color}}/>{ty.label}</span>)}
      </div>
    </>
  );
}

// ── Food chart: time dots OR amount bar chart ─────────────────────────────
const FEED_TYPES_VIZ = [
  { id:"breastfeed", color:"#f9a8d4", label_zh:"母乳",   label_en:"BF" },
  { id:"formula",    color:"#93c5fd", label_zh:"配方奶", label_en:"Formula" },
  { id:"ebm",        color:"#fb923c", label_zh:"母乳儲存",label_en:"EBM" },
  { id:"drink",      color:"#38bdf8", label_zh:"飲品",   label_en:"Drink" },
  { id:"solid",      color:"#fbbf24", label_zh:"固體",   label_en:"Solid" },
];

function FoodChart({ entries, dayKeys, lang, zh }) {
  const [view, setView] = useState("time");

  if (view==="time") {
    const feedsByDay = {};
    dayKeys.forEach(k=>feedsByDay[k]=[]);
    entries.filter(e=>FEED_ACTIONS.includes(e.type)&&dayKeys.includes(fmtDateKey(e.timestamp)))
      .forEach(e=>feedsByDay[fmtDateKey(e.timestamp)].push(e));

    return (
      <>
        <div className="food-view-toggle">
          <button className={`food-toggle-btn ${view==="time"?"active":""}`} onPointerUp={()=>setView("time")}>{zh?"時間":"Time"}</button>
          <button className={`food-toggle-btn ${view==="amount"?"active":""}`} onPointerUp={()=>setView("amount")}>{zh?"奶量":"Amount"}</button>
        </div>
        <div style={{display:'flex',gap:4,marginBottom:4,paddingLeft:36}}>
          {["0h","6h","12h","18h","24h"].map(l=><span key={l} style={{flex:1,fontSize:9,color:'var(--text-tertiary)',textAlign:'center'}}>{l}</span>)}
        </div>
        {dayKeys.slice(-7).map(k=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:4,marginBottom:3}}>
            <span style={{fontSize:9,color:'var(--text-tertiary)',width:32,flexShrink:0,textAlign:'right'}}>{shortLbl(k)}</span>
            <div style={{flex:1,height:20,position:'relative'}}>
              {(feedsByDay[k]||[]).map((e,i)=>{
                const dayStart=new Date(k+"T00:00:00").getTime();
                const pct=((e.timestamp-dayStart)/86400000)*100;
                const ty=FEED_TYPES_VIZ.find(t=>t.id===e.type)||{color:"#888"};
                const filled = e.amountMl!=null||e.breastL!=null||e.breastR!=null;
                return (
                  <div key={i} style={{position:'absolute',left:`${pct}%`,top:'50%',
                    transform:'translate(-50%,-50%)',width:9,height:9,borderRadius:'50%',
                    background:filled?ty.color:'transparent',border:`2px solid ${ty.color}`}}/>
                );
              })}
            </div>
          </div>
        ))}
        <div className="dot-legend">
          {FEED_TYPES_VIZ.map(ty=>(
            <span key={ty.id} className="dot-legend-item">
              <span className="dot-legend-dot" style={{background:ty.color}}/>
              {zh?ty.label_zh:ty.label_en}
            </span>
          ))}
        </div>
      </>
    );
  }

  // Amount view: two-sided bar chart
  const mlData   = dayKeys.map(k=>({label:shortLbl(k),value:entries.filter(e=>fmtDateKey(e.timestamp)===k&&["formula","ebm","bottle","drink"].includes(e.type)).reduce((s,e)=>s+(e.amountMl||0),0)}));
  const bfLData  = dayKeys.map(k=>({label:shortLbl(k),value:entries.filter(e=>fmtDateKey(e.timestamp)===k&&e.type==="breastfeed").reduce((s,e)=>s+(e.breastL||0),0)}));
  const bfRData  = dayKeys.map(k=>({label:shortLbl(k),value:entries.filter(e=>fmtDateKey(e.timestamp)===k&&e.type==="breastfeed").reduce((s,e)=>s+(e.breastR||0),0)}));
  const solidCnt = dayKeys.map(k=>({label:shortLbl(k),value:entries.filter(e=>fmtDateKey(e.timestamp)===k&&["solid","snack","meal"].includes(e.type)).length}));

  return (
    <>
      <div className="food-view-toggle">
        <button className={`food-toggle-btn ${view==="time"?"active":""}`} onPointerUp={()=>setView("time")}>{zh?"時間":"Time"}</button>
        <button className={`food-toggle-btn ${view==="amount"?"active":""}`} onPointerUp={()=>setView("amount")}>{zh?"奶量":"Amount"}</button>
      </div>
      <div style={{display:'flex',gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:'var(--text-tertiary)',marginBottom:4}}>{zh?"飲品 (ml)":"Drinks (ml)"}</div>
          <BarChart data={mlData} color="#93c5fd" unit="ml" h={80}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:'var(--text-tertiary)',marginBottom:4}}>{zh?"母乳 L+R (分鐘)":"BF L+R (min)"}</div>
          <BarChart data={bfLData.map((d,i)=>({label:d.label,value:d.value+bfRData[i].value}))} color="#f9a8d4" unit="m" h={80}/>
        </div>
      </div>
      <div style={{marginTop:8}}>
        <div style={{fontSize:10,color:'var(--text-tertiary)',marginBottom:4}}>{zh?"固體食物 (次)":"Solid meals (times)"}</div>
        <BarChart data={solidCnt} color="#fbbf24" unit="" h={50}/>
      </div>
    </>
  );
}

// ── Growth chart ──────────────────────────────────────────────────────────
function GrowthChart({ entries, baby, metric, lang }) {
  const zh=lang==="zh";
  const birthday=useMemo(()=>baby?.date?new Date(baby.date):null,[baby?.date]);
  const whoMap={weight:WHO_WEIGHT,height:WHO_HEIGHT,head:WHO_HEAD};

  const measurements=useMemo(()=>
    entries.filter(e=>e.type===metric&&e.valueNum!=null)
      .sort((a,b)=>a.timestamp-b.timestamp)
      .map(e=>({ts:e.timestamp,ageMonths:birthday?(e.timestamp-birthday.getTime())/(30.44*24*3600*1000):null,value:e.valueNum})),
    [entries,metric,birthday]);

  if (measurements.length===0) return <div className="chart-empty">{zh?`尚無${ACTIONS[metric]?.labelZh}記錄`:`No ${ACTIONS[metric]?.labelEn} records`}</div>;

  const hasWho=!!whoMap[metric]&&!!birthday;
  const maxAgeM=hasWho?Math.max(...measurements.map(m=>m.ageMonths||0),24):null;
  const minVal=Math.min(...measurements.map(m=>m.value));
  const maxVal=Math.max(...measurements.map(m=>m.value));
  const padV=(maxVal-minVal)*0.15||1;

  const H=160,W=100,pL=12,pR=4,pT=8,pB=20;
  const iW=W-pL-pR,iH=H-pT-pB;
  const toX=age=>pL+(age/(maxAgeM||1))*iW;
  const toY=val=>pT+iH-((val-(minVal-padV))/((maxVal+padV)-(minVal-padV)))*iH;

  const whoAges=[0,1,2,3,4,6,9,12,18,24,36,48,60,72,84,96,108,120,132,144,156,168,180].filter(a=>a<=(maxAgeM||0)+6&&whoMap[metric]?.[a]);
  const whoP=hasWho?[0,2,4].map(idx=>whoAges.map(a=>{const ref=getWhoRef(whoMap[metric],a);return{x:toX(a),y:toY(ref[idx])};})):[];

  const pts=measurements.map(m=>({x:toX(m.ageMonths||0),y:toY(m.value),value:m.value,ageMonths:m.ageMonths}));
  const linePath=pts.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");

  return (
    <div className="growth-chart">
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
        {hasWho&&whoP.length===3&&(
          <>
            <polygon
              points={[...whoP[0].map(p=>`${p.x},${p.y}`),...whoP[2].map(p=>`${p.x},${p.y}`).reverse()].join(" ")}
              fill={ACTIONS[metric]?.color||"#93c5fd"} opacity={0.1}/>
            {whoP.map((line,i)=>(
              <polyline key={i} points={line.map(p=>`${p.x},${p.y}`).join(" ")}
                stroke={ACTIONS[metric]?.color||"#93c5fd"} strokeWidth={0.4} fill="none"
                strokeDasharray={i===1?"":"2,1"} opacity={0.6}/>
            ))}
          </>
        )}
        {pts.length>1&&<path d={linePath} stroke={ACTIONS[metric]?.color||"#8b5cf6"} strokeWidth={0.8} fill="none"/>}
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={1.2} fill={ACTIONS[metric]?.color||"#8b5cf6"}/>
            <text x={p.x} y={p.y-2.5} textAnchor="middle" fontSize={2.2} fill="var(--text-secondary)">
              {metric==="weight"?(p.value/1000).toFixed(1)+"kg":p.value+(ACTIONS[metric]?.unit||"")}
            </text>
          </g>
        ))}
        <line x1={pL} y1={pT+iH} x2={pL+iW} y2={pT+iH} stroke="var(--border)" strokeWidth={0.4}/>
        <line x1={pL} y1={pT} x2={pL} y2={pT+iH} stroke="var(--border)" strokeWidth={0.4}/>
        {hasWho&&maxAgeM&&[0,12,24,36,48,60].filter(a=>a<=maxAgeM+2).map(a=>(
          <text key={a} x={toX(a)} y={H-2} textAnchor="middle" fontSize={2.5} fill="var(--text-tertiary)">{a}m</text>
        ))}
      </svg>
      {hasWho&&<div className="growth-legend">
        <span className="growth-legend-line growth-legend-line--ref">{zh?"WHO P3/P50/P97":"WHO P3/P50/P97"}</span>
        <span className="growth-legend-line growth-legend-line--data">{zh?"實際數據":"Your baby"}</span>
      </div>}
    </div>
  );
}

// ── Chart config for the "ALL" summary view ───────────────────────────────
const CHART_CONFIGS = [
  {id:"feeds",   labelZh:"餵食次數", labelEn:"Feeds",     color:"#f9a8d4"},
  {id:"milk",    labelZh:"奶量",     labelEn:"Milk (ml)", color:"#93c5fd"},
  {id:"sleep",   labelZh:"睡眠",     labelEn:"Sleep (h)", color:"#a78bfa"},
  {id:"diapers", labelZh:"尿片",     labelEn:"Diapers",   color:"#6ee7b7"},
  {id:"bf_l",    labelZh:"母乳左",   labelEn:"BF Left",   color:"#fda4af"},
  {id:"bf_r",    labelZh:"母乳右",   labelEn:"BF Right",  color:"#f9a8d4"},
];

// ── Main Analysis component ───────────────────────────────────────────────
export default function Analysis({ t, lang, entries, baby }) {
  const zh=lang==="zh";
  const [range,setRange]             = useState("7");
  const [activeCharts,setActive]     = useState(new Set(["feeds","milk","sleep","diapers"]));
  const [growthMetric,setGrowthMetric]=useState("weight");
  const [importError,setImportError] = useState("");
  const [activeView,setActiveView]   = useState("summary"); // summary | food | sleep | diaper | temp | growth

  const keys=useMemo(()=>getDayKeys(range==="7"?7:30),[range]);
  const byDay=useMemo(()=>{
    const m={};
    entries.forEach(e=>{const k=fmtDateKey(e.timestamp);if(!m[k])m[k]=[];m[k].push(e);});
    return m;
  },[entries]);

  const buildSeries=(id)=>keys.map(k=>{
    const day=byDay[k]||[];
    let val=0;
    if(id==="feeds")   val=day.filter(e=>FEED_ACTIONS.includes(e.type)).length;
    if(id==="milk")    val=Math.round(day.reduce((s,e)=>s+(e.amountMl||0),0));
    if(id==="sleep")   val=Math.round(day.filter(e=>e.type==="sleep").reduce((s,e)=>s+(e.durationSec||0),0)/360)/10;
    if(id==="diapers") val=day.filter(e=>DIAPER_ACTIONS.includes(e.type)).length;
    if(id==="bf_l")    val=day.filter(e=>e.type==="breastfeed").reduce((s,e)=>s+(e.breastL||0),0);
    if(id==="bf_r")    val=day.filter(e=>e.type==="breastfeed").reduce((s,e)=>s+(e.breastR||0),0);
    return {label:shortLbl(k),value:val};
  });

  const activeDays=keys.filter(k=>(byDay[k]||[]).length>0).length||1;
  const avgFeeds  =(buildSeries("feeds").reduce((s,d)=>s+d.value,0)/activeDays).toFixed(1);
  const avgMl     =Math.round(buildSeries("milk").reduce((s,d)=>s+d.value,0)/activeDays);
  const avgSleep  =(buildSeries("sleep").reduce((s,d)=>s+d.value,0)/activeDays).toFixed(1);
  const avgDiapers=(buildSeries("diapers").reduce((s,d)=>s+d.value,0)/activeDays).toFixed(1);

  const toggleChart=id=>setActive(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});

  const VIEWS=[
    {id:"summary", label:zh?"總覽":"Summary"},
    {id:"food",    label:zh?"餵食":"Food"},
    {id:"sleep",   label:zh?"睡眠":"Sleep"},
    {id:"diaper",  label:zh?"尿片":"Diaper"},
    {id:"temp",    label:zh?"體溫":"Temp"},
    {id:"growth",  label:zh?"生長":"Growth"},
  ];

  return (
    <div className="analysis-page">

      {/* ── view tabs ── */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {VIEWS.map(v=>(
          <button key={v.id}
            className={`range-btn ${activeView===v.id?"active":""}`}
            style={{padding:"7px 12px",fontSize:13}}
            onPointerUp={()=>setActiveView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Range ── */}
      <div className="range-toggle">
        <button className={`range-btn ${range==="7"?"active":""}`} onPointerUp={()=>setRange("7")}>{zh?"7天":"7 days"}</button>
        <button className={`range-btn ${range==="30"?"active":""}`} onPointerUp={()=>setRange("30")}>{zh?"30天":"30 days"}</button>
      </div>

      {/* ── SUMMARY VIEW ── */}
      {activeView==="summary" && (
        <>
          <div className="analysis-stats">
            {[{emoji:"🍼",val:avgFeeds,lbl:zh?"平均餵食/天":"Avg feeds/day",color:"#f9a8d4"},
              {emoji:"🥛",val:avgMl>0?`${avgMl}ml`:"—",lbl:zh?"平均奶量/天":"Avg milk/day",color:"#93c5fd"},
              {emoji:"😴",val:`${avgSleep}h`,lbl:zh?"平均睡眠/天":"Avg sleep/day",color:"#a78bfa"},
              {emoji:"🩲",val:avgDiapers,lbl:zh?"平均尿片/天":"Avg diapers/day",color:"#6ee7b7"},
            ].map((s,i)=>(
              <div key={i} className="analysis-stat" style={{borderLeftColor:s.color}}>
                <span className="as-emoji">{s.emoji}</span>
                <div><div className="as-val">{s.val}</div><div className="as-sub">{s.lbl}</div></div>
              </div>
            ))}
          </div>

          {/* Combined chart */}
          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-title">{zh?"綜合圖表":"Combined chart"}</div>
              <div style={{display:'flex',gap:6}}>
                <button className="range-btn active" onPointerUp={()=>setActive(new Set(CHART_CONFIGS.map(c=>c.id)))} style={{padding:'4px 10px',fontSize:11}}>{zh?"全選":"All"}</button>
                <button className="range-btn" onPointerUp={()=>setActive(new Set())} style={{padding:'4px 10px',fontSize:11}}>{zh?"清除":"None"}</button>
              </div>
            </div>
            {/* filter checkboxes */}
            <div className="filter-row">
              {CHART_CONFIGS.map(c=>(
                <label key={c.id} className="filter-cb">
                  <input type="checkbox" checked={activeCharts.has(c.id)} onChange={()=>toggleChart(c.id)}/>
                  <span style={{color:c.color,fontWeight:600}}>{zh?c.labelZh:c.labelEn}</span>
                </label>
              ))}
            </div>
            {activeCharts.size>0 && (
              <CombinedChart
                series={CHART_CONFIGS.filter(c=>activeCharts.has(c.id)).map(c=>({...c,data:buildSeries(c.id)}))}
                keys={keys} zh={zh}/>
            )}
            {/* individual charts for active items */}
            {CHART_CONFIGS.filter(c=>activeCharts.has(c.id)).map(c=>(
              <div key={c.id} style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                <div style={{fontSize:11,color:'var(--text-tertiary)',marginBottom:4,display:'flex',alignItems:'center',gap:4}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:c.color,display:'inline-block'}}/>
                  {zh?c.labelZh:c.labelEn}
                </div>
                <BarChart data={buildSeries(c.id)} color={c.color} h={60}/>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── FOOD VIEW ── */}
      {activeView==="food" && (
        <div className="chart-card">
          <div className="chart-title">{zh?"餵食分析":"Feeding analysis"}</div>
          <FoodChart entries={entries} dayKeys={keys} lang={lang} zh={zh}/>
        </div>
      )}

      {/* ── SLEEP VIEW ── */}
      {activeView==="sleep" && (
        <>
          <div className="chart-card">
            <div className="chart-title">{zh?"睡眠時長":"Sleep duration"}</div>
            <BarChart data={buildSeries("sleep")} color="#a78bfa" unit="h" h={100}/>
          </div>
          <div className="chart-card">
            <div className="chart-title">{zh?"睡眠時段（每天）":"Sleep timeline (per day)"}</div>
            <SleepShadingChart entries={entries} dayKeys={keys} lang={lang}/>
          </div>
        </>
      )}

      {/* ── DIAPER VIEW ── */}
      {activeView==="diaper" && (
        <div className="chart-card">
          <div className="chart-title">{zh?"尿片分析":"Diaper analysis"}</div>
          <DiaperChart entries={entries} dayKeys={keys} lang={lang} zh={zh}/>
        </div>
      )}

      {/* ── TEMPERATURE VIEW ── */}
      {activeView==="temp" && (
        <div className="chart-card">
          <div className="chart-title">{zh?"體溫趨勢":"Temperature trend"}</div>
          <TempLineChart entries={entries} lang={lang}/>
        </div>
      )}

      {/* ── GROWTH VIEW ── */}
      {activeView==="growth" && (
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title">{zh?"生長曲線":"Growth chart"}</div>
          </div>
          <div className="growth-metric-tabs">
            {GROWTH_ACTIONS.map(id=>(
              <button key={id}
                className={`growth-tab ${growthMetric===id?"growth-tab--on":""}`}
                style={growthMetric===id?{background:ACTIONS[id]?.color,borderColor:ACTIONS[id]?.color,color:"#111"}:{}}
                onPointerUp={()=>setGrowthMetric(id)}>
                {ACTIONS[id]?.emoji} {zh?ACTIONS[id]?.labelZh:ACTIONS[id]?.labelEn}
              </button>
            ))}
          </div>
          <GrowthChart entries={entries} baby={baby} metric={growthMetric} lang={lang}/>
        </div>
      )}

      {/* ── Export / Import ── */}
      <div className="chart-card">
        <div className="chart-title">{zh?"匯出資料":"Export data"}</div>
        <div className="export-btns">
          <button className="export-btn" onPointerUp={()=>exportToCSV(entries)}>📄 CSV</button>
          <button className="export-btn" onPointerUp={()=>exportToJSON(entries,baby)}>📦 JSON</button>
          <button className="export-btn" onPointerUp={()=>{
            const txt=exportToFormattedText(entries,lang);
            const blob=new Blob([txt],{type:'text/plain'});
            const url=URL.createObjectURL(blob);
            const a=document.createElement('a');
            a.href=url;a.download='baby-diary-log.txt';a.click();
            URL.revokeObjectURL(url);
          }}>📋 {zh?"日誌":"Log"}</button>
        </div>
        <div style={{marginTop:12}}>
          <label className="field-label">{zh?"匯入 JSON":"Import JSON"}</label>
          <input type="file" accept=".json" onChange={e=>{
            const file=e.target.files[0];
            if(!file)return;
            const reader=new FileReader();
            reader.onload=ev=>{
              try{
                const{entries:imp}=importFromJSON(ev.target.result);
                if(!Array.isArray(imp))throw new Error();
                setImportError(zh?`已匯入 ${imp.length} 條記錄`:`Imported ${imp.length} entries`);
              }catch{setImportError(zh?"匯入失敗：格式錯誤":"Import failed: invalid format");}
            };
            reader.readAsText(file);
          }} style={{display:'block',marginTop:6,fontSize:13,color:'var(--text-secondary)'}}/>
          {importError&&<div style={{fontSize:12,marginTop:4,color:importError.includes('失敗')||importError.includes('failed')?"#dc2626":"#059669"}}>{importError}</div>}
        </div>
      </div>
    </div>
  );
}
