import React, { useState, useMemo, useCallback } from "react";
import { ACTIONS, FEED_ACTIONS, NAPPY_ACTIONS, GROWTH_ACTIONS } from "../utils/actions";
import { fmtDateKey, getDaySleepSegments, computeSleepDurations } from "../utils/helpers";

// ── WHO reference (weight g, height cm, head cm) ─────────────────────────
const WHO = {
  weight: {
    0:[2500,3300,4300],1:[3400,4500,5700],2:[4300,5600,6800],3:[5000,6400,7700],
    4:[5600,7000,8400],6:[6400,7900,9500],9:[7200,8900,10600],12:[7800,9600,11500],
    18:[8800,10900,13000],24:[9700,12200,14500],36:[12000,14700,17500],
    48:[13700,16700,20000],60:[15500,19200,23000],72:[17000,21400,25800],
    84:[18800,23800,29000],96:[20500,26400,32700],108:[22200,29300,37000],
    120:[24000,32500,42500],144:[28500,40000,55000],168:[36000,52000,73000],
    192:[46500,67500,94000],216:[57000,82000,110000],
  },
  height: {
    0:[46.3,49.9,53.4],1:[50.8,54.7,58.5],2:[54.4,58.4,62.4],3:[57.3,61.4,65.5],
    4:[59.7,63.9,68.0],6:[63.3,67.6,72.1],9:[68.0,72.3,77.1],12:[71.7,75.7,81.2],
    18:[77.5,82.3,87.7],24:[82.5,87.8,93.6],36:[88.7,96.1,103.0],48:[94.9,103.3,111.1],
    60:[100.7,110.0,118.7],72:[106.1,116.4,126.2],84:[111.2,122.4,133.2],
    96:[116.2,128.3,140.2],108:[120.9,134.0,147.0],120:[125.6,139.6,153.8],
    144:[135.1,150.9,167.4],168:[145.2,162.2,180.7],180:[150.2,167.8,186.9],
  },
  head: {
    0:[31.7,34.5,37.3],1:[34.4,37.3,40.1],2:[36.2,39.1,41.9],3:[37.7,40.5,43.3],
    6:[41.0,43.8,46.5],9:[43.0,45.8,48.5],12:[44.5,47.2,49.9],18:[46.1,48.9,51.5],
    24:[47.2,50.0,52.6],
  },
};

function whoInterp(table, ageM) {
  const ks = Object.keys(table).map(Number).sort((a,b)=>a-b);
  let lo=ks[0], hi=ks[ks.length-1];
  for (const k of ks) { if (k<=ageM) lo=k; }
  for (const k of [...ks].reverse()) { if (k>=ageM) hi=k; }
  if (lo===hi) return table[lo];
  const t=(ageM-lo)/(hi-lo);
  return table[lo].map((v,i)=>v+t*(table[hi][i]-v));
}

// ── Period helpers ────────────────────────────────────────────────────────
// Returns { start: Date, end: Date, label: string, keys: string[] }
function getPeriodKeys(anchor, range) {
  const end = new Date(anchor); end.setHours(23,59,59,999);
  const start = new Date(anchor);
  let n;
  if (range==='7')   { n=7;   start.setDate(end.getDate()-6); }
  if (range==='30')  { n=30;  start.setDate(end.getDate()-29); }
  if (range==='180') { n=180; start.setDate(end.getDate()-179); }
  if (range==='365') { n=365; start.setDate(end.getDate()-364); }
  if (range==='custom') return null; // handled separately
  const keys=[];
  const d=new Date(start);
  while (d<=end) { keys.push(fmtDateKey(d.getTime())); d.setDate(d.getDate()+1); }
  return keys;
}

function shortLbl(k, range) {
  const [y,m,d]=k.split('-');
  if (range==='7') return `${parseInt(m)}/${parseInt(d)}`;
  if (range==='30') return `${parseInt(m)}/${parseInt(d)}`;
  // For longer ranges, group by week/month
  return `${parseInt(m)}/${parseInt(d)}`;
}

// ── Grouped bar chart (stacked-style: multiple series side by side) ───────
// Each day has a vertical position for each series, normalised independently
// Series are displayed as thin vertical strips side by side within each day column
function MultiSeriesChart({ series, keys, range }) {
  if (!keys || keys.length === 0) return null;

  // For 180/365 day ranges, bucket into weeks or months
  const buckets = useMemo(() => {
    if (keys.length <= 35) return keys.map(k=>({ label: shortLbl(k, range), keys:[k] }));
    // Group by week
    const groups = [];
    for (let i=0; i<keys.length; i+=7) {
      const chunk = keys.slice(i, i+7);
      const [,m,d] = chunk[0].split('-');
      groups.push({ label: `${parseInt(m)}/${parseInt(d)}`, keys: chunk });
    }
    return groups;
  }, [keys, range]);

  const H=120, padT=8, padB=18, padL=8, padR=4;

  // For each series normalise to 0–1 so different units coexist
  const seriesNorm = series.map(s=>{
    const vals = buckets.map(b=> b.keys.reduce((sum,k)=> sum+(s.byDay[k]||0),0));
    const max = Math.max(...vals, 0.001);
    return { ...s, vals, max };
  });

  const W=100;
  const iW=W-padL-padR;
  const iH=H-padT-padB;
  const n=buckets.length;
  const slotW=iW/n;
  const barW=Math.max(0.8, Math.min(2.5, slotW/(series.length+1)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto',display:'block'}}>
      {/* Grid lines */}
      {[0.25,0.5,0.75,1].map(f=>(
        <line key={f} x1={padL} y1={padT+iH*(1-f)} x2={padL+iW} y2={padT+iH*(1-f)}
          stroke="var(--border)" strokeWidth={0.2} opacity={0.6}/>
      ))}
      {/* Bars */}
      {seriesNorm.map((s,si)=>
        buckets.map((b,bi)=>{
          const norm = s.max>0 ? s.vals[bi]/s.max : 0;
          const barH = norm*iH;
          const x = padL + bi*slotW + (si-(series.length-1)/2)*barW*1.3 + slotW/2;
          const y = padT+iH-barH;
          return (
            <g key={`${si}-${bi}`}>
              <rect x={x-barW/2} y={y} width={barW} height={Math.max(barH,0.3)}
                fill={s.color} rx={0.4} opacity={s.vals[bi]>0?0.85:0.1}/>
              {s.vals[bi]>0 && barH>8 && (
                <text x={x} y={y-1} textAnchor="middle" fontSize={1.8} fill={s.color} opacity={0.9}>
                  {s.vals[bi]>=10?Math.round(s.vals[bi]):s.vals[bi].toFixed(s.dp||0)}
                </text>
              )}
            </g>
          );
        })
      )}
      {/* X axis */}
      <line x1={padL} y1={padT+iH} x2={padL+iW} y2={padT+iH} stroke="var(--border)" strokeWidth={0.3}/>
      {/* X labels — show subset to avoid crowding */}
      {buckets.filter((_,i)=>i%Math.max(1,Math.ceil(buckets.length/8))===0||i===buckets.length-1).map((b,i,arr)=>{
        const bi=buckets.indexOf(b);
        const x=padL+bi*slotW+slotW/2;
        return <text key={bi} x={x} y={H-2} textAnchor="middle" fontSize={2.2} fill="var(--text-tertiary)">{b.label}</text>;
      })}
    </svg>
  );
}

// ── Sleep timeline (horizontal shading per day) ───────────────────────────
function SleepTimeline({ entries, keys, range }) {
  const show = keys.slice(-(Math.min(keys.length,14)));
  return (
    <div style={{marginTop:4}}>
      <div style={{display:'flex',paddingLeft:32,marginBottom:3}}>
        {['0h','6h','12h','18h','24h'].map(l=>(
          <span key={l} style={{flex:1,fontSize:8,color:'var(--text-tertiary)',textAlign:'center'}}>{l}</span>
        ))}
      </div>
      {show.map(k=>{
        const dayEnt=entries.filter(e=>fmtDateKey(e.timestamp)===k);
        const segs=getDaySleepSegments(dayEnt);
        const dayStart=new Date(k+'T00:00:00').getTime();
        const [,m,d]=k.split('-');
        return (
          <div key={k} style={{display:'flex',alignItems:'center',gap:4,marginBottom:2}}>
            <span style={{fontSize:8,color:'var(--text-tertiary)',width:28,flexShrink:0,textAlign:'right'}}>{`${parseInt(m)}/${parseInt(d)}`}</span>
            <div style={{flex:1,height:12,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:2,overflow:'hidden',position:'relative'}}>
              {segs.map((s,i)=>{
                const l=((s.start-dayStart)/86400000)*100;
                const w=((s.end-s.start)/86400000)*100;
                return <div key={i} style={{position:'absolute',left:`${Math.max(0,l)}%`,width:`${Math.min(100-Math.max(0,l),w)}%`,height:'100%',background:'#a78bfa',opacity:.75}}/>;
              })}
            </div>
          </div>
        );
      })}
      <div style={{display:'flex',alignItems:'center',gap:5,marginTop:5}}>
        <div style={{width:10,height:8,background:'#a78bfa',borderRadius:2,opacity:.75}}/>
        <span style={{fontSize:10,color:'var(--text-secondary)'}}>Sleep</span>
      </div>
    </div>
  );
}

// ── Dot timeline (events along 0–24h axis) ────────────────────────────────
function DotTimeline({ entries, keys, types, rowLabel }) {
  const show=keys.slice(-(Math.min(keys.length,14)));
  return (
    <div>
      <div style={{display:'flex',paddingLeft:32,marginBottom:3}}>
        {['0h','6h','12h','18h','24h'].map(l=>(
          <span key={l} style={{flex:1,fontSize:8,color:'var(--text-tertiary)',textAlign:'center'}}>{l}</span>
        ))}
      </div>
      {show.map(k=>{
        const dayStart=new Date(k+'T00:00:00').getTime();
        const dayEnt=entries.filter(e=>fmtDateKey(e.timestamp)===k&&types.some(t=>t.id===e.type));
        const [,m,d]=k.split('-');
        return (
          <div key={k} style={{display:'flex',alignItems:'center',gap:4,marginBottom:2}}>
            <span style={{fontSize:8,color:'var(--text-tertiary)',width:28,flexShrink:0,textAlign:'right'}}>{`${parseInt(m)}/${parseInt(d)}`}</span>
            <div style={{flex:1,height:14,position:'relative'}}>
              {dayEnt.map((e,i)=>{
                const pct=((e.timestamp-dayStart)/86400000)*100;
                const ty=types.find(t=>t.id===e.type)||types[0];
                const filled=e.amountMl!=null||e.breastL!=null||e.breastR!=null||e.inputType==='tap';
                return (
                  <div key={i} title={`${ty.label} ${e.amountMl?e.amountMl+'ml':''}`} style={{
                    position:'absolute',left:`${Math.min(97,pct)}%`,top:'50%',
                    transform:'translate(-50%,-50%)',width:8,height:8,borderRadius:'50%',
                    background:filled?ty.color:'transparent',border:`1.5px solid ${ty.color}`,
                    boxSizing:'border-box',
                  }}/>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Temperature line chart ────────────────────────────────────────────────
function TempLineChart({ entries }) {
  const pts=useMemo(()=>
    entries.filter(e=>e.type==='temp'&&e.valueNum!=null)
      .sort((a,b)=>a.timestamp-b.timestamp),
    [entries]);

  if (pts.length===0) return <div style={{textAlign:'center',color:'var(--text-tertiary)',padding:'20px 0',fontSize:13}}>No temperature records yet</div>;

  const vals=pts.map(p=>p.valueNum);
  const minV=Math.min(...vals)-0.3, maxV=Math.max(...vals)+0.3;
  const W=100,H=60,pL=10,pR=4,pT=6,pB=14;
  const iW=W-pL-pR, iH=H-pT-pB;
  const toX=i=>pL+(i/(Math.max(pts.length-1,1)))*iW;
  const toY=v=>pT+iH-((v-minV)/(maxV-minV||1))*iH;
  const col=v=>v<36?'#60a5fa':v<=37.5?'#22c55e':v<=38.5?'#f59e0b':'#ef4444';

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto'}}>
        {/* normal band */}
        <rect x={pL} y={toY(37.5)} width={iW} height={Math.max(0,toY(36)-toY(37.5))} fill="#22c55e" opacity={0.08}/>
        {/* ref lines */}
        {[37.5,38.5].map(v=>(
          <line key={v} x1={pL} y1={toY(v)} x2={pL+iW} y2={toY(v)} stroke={col(v+0.1)} strokeWidth={0.3} strokeDasharray="2,1" opacity={0.5}/>
        ))}
        {/* line */}
        {pts.length>1&&(
          <polyline points={pts.map((p,i)=>`${toX(i)},${toY(p.valueNum)}`).join(' ')} fill="none" stroke="#f43f5e" strokeWidth={0.8}/>
        )}
        {/* dots */}
        {pts.map((p,i)=>(<circle key={i} cx={toX(i)} cy={toY(p.valueNum)} r={1.3} fill={col(p.valueNum)}/>))}
        {/* y labels */}
        {[36,37,38,39].filter(v=>v>=minV&&v<=maxV).map(v=>(
          <text key={v} x={pL-1} y={toY(v)+1} textAnchor="end" fontSize={2.4} fill="var(--text-tertiary)">{v}</text>
        ))}
        {/* axes */}
        <line x1={pL} y1={pT+iH} x2={pL+iW} y2={pT+iH} stroke="var(--border)" strokeWidth={0.3}/>
        {pts.length>0&&[0,pts.length-1].map(i=>(
          <text key={i} x={toX(i)} y={H-1} textAnchor="middle" fontSize={2.1} fill="var(--text-tertiary)">
            {new Date(pts[i].timestamp).toLocaleDateString([],{month:'numeric',day:'numeric'})}
          </text>
        ))}
      </svg>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:4}}>
        {[{c:'#60a5fa',l:'Low (<36)'},{c:'#22c55e',l:'Normal'},{c:'#f59e0b',l:'Low fever'},{c:'#ef4444',l:'Fever (>38.5)'}].map(x=>(
          <span key={x.l} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-secondary)'}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:x.c,display:'inline-block'}}/>
            {x.l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Growth chart ──────────────────────────────────────────────────────────
function GrowthChart({ entries, baby, metric }) {
  const birthday=useMemo(()=>baby?.date?new Date(baby.date):null,[baby]);
  const measurements=useMemo(()=>
    entries.filter(e=>e.type===metric&&e.valueNum!=null)
      .sort((a,b)=>a.timestamp-b.timestamp)
      .map(e=>({
        ageM:birthday?(e.timestamp-birthday.getTime())/(30.44*24*3600*1000):null,
        value:e.valueNum, ts:e.timestamp,
      })),
    [entries,metric,birthday]);

  if (!measurements.length) return (
    <div style={{textAlign:'center',color:'var(--text-tertiary)',padding:'20px 0',fontSize:13}}>
      No {ACTIONS[metric]?.labelEn} records yet
    </div>
  );

  const hasWho=!!WHO[metric]&&!!birthday;
  const maxAgeM=measurements.length?Math.max(...measurements.map(m=>m.ageM||0),24):24;
  const allVals=[...measurements.map(m=>m.value)];
  if (hasWho) {
    const ref=whoInterp(WHO[metric],maxAgeM);
    allVals.push(ref[0], ref[2]);
  }
  const minV=Math.min(...allVals)*0.97, maxV=Math.max(...allVals)*1.03;

  const W=100,H=130,pL=14,pR=4,pT=8,pB=16;
  const iW=W-pL-pR,iH=H-pT-pB;
  const toX=ageM=>pL+(ageM/(maxAgeM||1))*iW;
  const toY=v=>pT+iH-((v-minV)/(maxV-minV||1))*iH;

  const whoAges=Object.keys(WHO[metric]||{}).map(Number).sort((a,b)=>a-b).filter(a=>a<=(maxAgeM+3));
  const whoLines=hasWho?[0,1,2].map(idx=>whoAges.map(a=>({x:toX(a),y:toY(whoInterp(WHO[metric],a)[idx])}))): [];

  const pts=measurements.map(m=>({x:toX(m.ageM||0),y:toY(m.value),value:m.value,ageM:m.ageM}));
  const col=ACTIONS[metric]?.color||'#8b5cf6';

  const fmtVal=v=>metric==='weight'?(v/1000).toFixed(2)+'kg':v+(ACTIONS[metric]?.unit||'');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto'}}>
        {hasWho&&whoLines.length===3&&(
          <>
            <polygon
              points={[...whoLines[0].map(p=>`${p.x},${p.y}`),...whoLines[2].map(p=>`${p.x},${p.y}`).reverse()].join(' ')}
              fill={col} opacity={0.08}/>
            {whoLines.map((line,i)=>(
              <polyline key={i} points={line.map(p=>`${p.x},${p.y}`).join(' ')}
                stroke={col} strokeWidth={0.4} fill="none"
                strokeDasharray={i===1?'':'2,1'} opacity={0.55}/>
            ))}
          </>
        )}
        {pts.length>1&&(
          <polyline points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke={col} strokeWidth={0.9}/>
        )}
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={1.4} fill={col}/>
            <text x={p.x} y={p.y-2.5} textAnchor="middle" fontSize={2.0} fill="var(--text-secondary)">{fmtVal(p.value)}</text>
          </g>
        ))}
        {/* axes */}
        <line x1={pL} y1={pT+iH} x2={pL+iW} y2={pT+iH} stroke="var(--border)" strokeWidth={0.3}/>
        <line x1={pL} y1={pT} x2={pL} y2={pT+iH} stroke="var(--border)" strokeWidth={0.3}/>
        {/* y labels */}
        {[0,0.25,0.5,0.75,1].map(f=>{
          const v=minV+f*(maxV-minV);
          return <text key={f} x={pL-1} y={toY(v)+1} textAnchor="end" fontSize={2.0} fill="var(--text-tertiary)">{fmtVal(Math.round(v))}</text>;
        })}
        {/* x labels */}
        {[0,6,12,24,36,60,120,180].filter(a=>a<=maxAgeM+3).map(a=>(
          <text key={a} x={toX(a)} y={H-2} textAnchor="middle" fontSize={2.2} fill="var(--text-tertiary)">{a}m</text>
        ))}
      </svg>
      {hasWho&&(
        <div style={{display:'flex',gap:12,marginTop:6,fontSize:10,color:'var(--text-tertiary)'}}>
          <span style={{display:'flex',alignItems:'center',gap:4}}>
            <span style={{width:16,height:2,background:col,opacity:.55,display:'inline-block',borderRadius:1}}/>WHO P3/P50/P97
          </span>
          <span style={{display:'flex',alignItems:'center',gap:4}}>
            <span style={{width:16,height:2,background:col,display:'inline-block',borderRadius:1}}/>Your baby
          </span>
        </div>
      )}
    </div>
  );
}

// ── Period navigator ──────────────────────────────────────────────────────
const RANGES=[
  {id:'7',   label:'7d'},
  {id:'30',  label:'30d'},
  {id:'180', label:'6m'},
  {id:'365', label:'1y'},
  {id:'custom',label:'Custom'},
];

function PeriodNav({ range, setRange, anchor, setAnchor, customStart, customEnd, setCustomStart, setCustomEnd, zh }) {
  const step = useCallback((dir)=>{
    const a=new Date(anchor);
    const days={'7':7,'30':30,'180':180,'365':365}[range]||7;
    a.setDate(a.getDate()+dir*days);
    if (a>new Date()) a.setTime(new Date().getTime());
    setAnchor(fmtDateKey(a.getTime()));
  },[anchor, range]);

  const isToday=anchor===fmtDateKey(Date.now());

  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {/* Range tabs */}
      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
        {RANGES.map(r=>(
          <button key={r.id}
            style={{padding:'6px 12px',borderRadius:'var(--radius-pill)',border:'1px solid var(--border)',
              background:range===r.id?'var(--accent)':'var(--bg)',color:range===r.id?'var(--bg)':'var(--text-secondary)',
              fontSize:12,fontWeight:600,cursor:'pointer',touchAction:'manipulation'}}
            onPointerUp={()=>setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Prev / label / Next */}
      {range!=='custom' && (
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onPointerUp={()=>step(-1)} style={{padding:'6px 12px',fontSize:16,background:'var(--surface)',
            border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text-primary)'}}>‹</button>
          <div style={{flex:1,textAlign:'center',fontSize:12,color:'var(--text-secondary)'}}>
            {(()=>{
              const end=new Date(anchor);
              const days={'7':6,'30':29,'180':179,'365':364}[range]||6;
              const start=new Date(anchor); start.setDate(end.getDate()-days);
              return `${start.toLocaleDateString([],{month:'short',day:'numeric'})} – ${end.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}`;
            })()}
          </div>
          <button onPointerUp={()=>step(1)} disabled={isToday}
            style={{padding:'6px 12px',fontSize:16,background:'var(--surface)',
              border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',cursor:isToday?'not-allowed':'pointer',
              color:isToday?'var(--text-tertiary)':'var(--text-primary)',opacity:isToday?0.4:1}}>›</button>
        </div>
      )}

      {/* Custom date pickers */}
      {range==='custom' && (
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)}
            style={{flex:1,padding:'6px 8px',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',
              background:'var(--bg)',color:'var(--text-primary)',fontSize:13}}/>
          <span style={{color:'var(--text-tertiary)',fontSize:12}}>→</span>
          <input type="date" value={customEnd} max={fmtDateKey(Date.now())} onChange={e=>setCustomEnd(e.target.value)}
            style={{flex:1,padding:'6px 8px',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',
              background:'var(--bg)',color:'var(--text-primary)',fontSize:13}}/>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function Analysis({ lang, entries, baby }) {
  const zh=lang==='zh';
  const [activeView, setActiveView] = useState('summary');
  const [range, setRange]           = useState('7');
  const [anchor, setAnchor]         = useState(fmtDateKey(Date.now()));
  const [customStart, setCustomStart]=useState('');
  const [customEnd, setCustomEnd]   = useState(fmtDateKey(Date.now()));
  const [growthMetric, setGrowthMetric]=useState('weight');
  const [summaryFilters, setSummaryFilters]=useState({feeds:true,milk:true,sleep:true,nappy:true,bfMin:false});

  // Build keys array
  const keys = useMemo(()=>{
    if (range==='custom') {
      if (!customStart||!customEnd) return [];
      const keys=[];
      const d=new Date(customStart);
      const end=new Date(customEnd);
      while(d<=end&&keys.length<400){ keys.push(fmtDateKey(d.getTime())); d.setDate(d.getDate()+1); }
      return keys;
    }
    const n={'7':7,'30':30,'180':180,'365':365}[range]||7;
    const a=new Date(anchor);
    const days=[];
    for(let i=n-1;i>=0;i--){
      const d=new Date(a); d.setDate(a.getDate()-i);
      days.push(fmtDateKey(d.getTime()));
    }
    return days;
  },[range,anchor,customStart,customEnd]);

  const byDay=useMemo(()=>{
    const m={};
    entries.forEach(e=>{ const k=fmtDateKey(e.timestamp); if(!m[k])m[k]=[]; m[k].push(e); });
    return m;
  },[entries]);

  // Per-day values
  const dayVal=(k,id)=>{
    const day=byDay[k]||[];
    if(id==='feeds')  return day.filter(e=>FEED_ACTIONS.includes(e.type)).length;
    if(id==='milk')   return Math.round(day.reduce((s,e)=>s+(e.amountMl||0),0));
    if(id==='sleep')  {
      const durs=computeSleepDurations(day);
      let t=0; durs.forEach(v=>t+=v); return Math.round(t/360)/10;
    }
    if(id==='nappy')  return day.filter(e=>NAPPY_ACTIONS.includes(e.type)).length;
    if(id==='bfMin')  return day.filter(e=>e.type==='breastfeed').reduce((s,e)=>s+(e.breastL||0)+(e.breastR||0),0);
    return 0;
  };

  const activeDays=keys.filter(k=>(byDay[k]||[]).length>0).length||1;
  const avg=(id)=>{
    const total=keys.reduce((s,k)=>s+dayVal(k,id),0);
    return (total/activeDays);
  };

  // Series for multi-series chart
  const SUMMARY_SERIES=[
    {id:'feeds', color:'#f9a8d4', label:zh?'餵食':'Feeds',   dp:0, byDay:Object.fromEntries(keys.map(k=>[k,dayVal(k,'feeds')]))},
    {id:'milk',  color:'#93c5fd', label:zh?'奶量':'Milk(ml)', dp:0, byDay:Object.fromEntries(keys.map(k=>[k,dayVal(k,'milk')]))},
    {id:'sleep', color:'#a78bfa', label:zh?'睡眠':'Sleep(h)', dp:1, byDay:Object.fromEntries(keys.map(k=>[k,dayVal(k,'sleep')]))},
    {id:'nappy', color:'#6ee7b7', label:zh?'尿片':'Nappy',   dp:0, byDay:Object.fromEntries(keys.map(k=>[k,dayVal(k,'nappy')]))},
    {id:'bfMin', color:'#fda4af', label:zh?'母乳分':'BF(min)',dp:0, byDay:Object.fromEntries(keys.map(k=>[k,dayVal(k,'bfMin')]))},
  ];
  const activeSeries=SUMMARY_SERIES.filter(s=>summaryFilters[s.id]);

  const VIEWS=[
    {id:'summary',label:zh?'總覽':'Summary'},
    {id:'food',   label:zh?'餵食':'Food'},
    {id:'sleep',  label:zh?'睡眠':'Sleep'},
    {id:'nappy',  label:zh?'尿片':'Nappy'},
    {id:'temp',   label:zh?'體溫':'Temp'},
    {id:'growth', label:zh?'生長':'Growth'},
  ];

  const NAPPY_TYPES=[
    {id:'wet',    color:'#60a5fa',label:zh?'濕尿片':'Wet'},
    {id:'soiled', color:'#d97706',label:zh?'便便':'Soiled'},
    {id:'mixed',  color:'#86efac',label:zh?'濕+便':'Mixed'},
    {id:'change', color:'#a8a29e',label:zh?'換片':'Change'},
  ];
  const FEED_TYPES_VIZ=[
    {id:'breastfeed',color:'#f9a8d4',label:zh?'母乳':'BF'},
    {id:'formula',   color:'#93c5fd',label:zh?'配方':'Formula'},
    {id:'ebm',       color:'#fb923c',label:zh?'儲存奶':'EBM'},
    {id:'drink',     color:'#38bdf8',label:zh?'飲品':'Drink'},
    {id:'solid',     color:'#fbbf24',label:zh?'固體':'Solid'},
  ];

  return (
    <div className="analysis-page">

      {/* ── View tabs ── */}
      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
        {VIEWS.map(v=>(
          <button key={v.id} onPointerUp={()=>setActiveView(v.id)}
            style={{padding:'7px 12px',borderRadius:'var(--radius-pill)',border:'1px solid var(--border)',
              background:activeView===v.id?'var(--accent)':'var(--bg)',
              color:activeView===v.id?'var(--bg)':'var(--text-secondary)',
              fontSize:12,fontWeight:600,cursor:'pointer',touchAction:'manipulation'}}>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Period navigator ── */}
      <div className="chart-card" style={{padding:'12px 14px'}}>
        <PeriodNav range={range} setRange={setRange} anchor={anchor} setAnchor={setAnchor}
          customStart={customStart} customEnd={customEnd}
          setCustomStart={setCustomStart} setCustomEnd={setCustomEnd} zh={zh}/>
      </div>

      {/* ══ SUMMARY ══ */}
      {activeView==='summary' && (
        <>
          {/* Stats row */}
          <div className="analysis-stats">
            {[
              {emoji:'🍼',val:avg('feeds').toFixed(1),  lbl:zh?'平均餵食/天':'Avg feeds/day',  color:'#f9a8d4'},
              {emoji:'🥛',val:avg('milk')>0?`${Math.round(avg('milk'))}ml`:'—', lbl:zh?'平均奶量/天':'Avg milk/day', color:'#93c5fd'},
              {emoji:'😴',val:`${avg('sleep').toFixed(1)}h`,lbl:zh?'平均睡眠/天':'Avg sleep/day', color:'#a78bfa'},
              {emoji:'🩱',val:avg('nappy').toFixed(1),  lbl:zh?'平均換片/天':'Avg nappy/day',  color:'#6ee7b7'},
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
              <div className="chart-title">{zh?'綜合圖表':'Combined chart'}</div>
            </div>
            {/* Filter checkboxes */}
            <div className="filter-row">
              {SUMMARY_SERIES.map(s=>(
                <label key={s.id} className="filter-cb">
                  <input type="checkbox" checked={!!summaryFilters[s.id]}
                    onChange={()=>setSummaryFilters(prev=>({...prev,[s.id]:!prev[s.id]}))}/>
                  <span style={{color:s.color,fontWeight:600,fontSize:11}}>{s.label}</span>
                </label>
              ))}
            </div>
            {activeSeries.length>0
              ? <MultiSeriesChart series={activeSeries} keys={keys} range={range}/>
              : <div style={{textAlign:'center',color:'var(--text-tertiary)',padding:'20px 0',fontSize:13}}>
                  {zh?'請選擇至少一個圖表':'Select at least one series'}
                </div>
            }
            {/* Legend */}
            <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:8}}>
              {activeSeries.map(s=>(
                <span key={s.id} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-secondary)'}}>
                  <span style={{width:8,height:8,borderRadius:2,background:s.color,display:'inline-block'}}/>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══ FOOD ══ */}
      {activeView==='food' && (
        <>
          <div className="chart-card">
            <div className="chart-title">{zh?'餵食時間':'Feeding timeline'}</div>
            <DotTimeline entries={entries} keys={keys.slice(-14)} types={FEED_TYPES_VIZ}/>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
              {FEED_TYPES_VIZ.map(t=>(
                <span key={t.id} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-secondary)'}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:t.color,border:'1.5px solid '+t.color,display:'inline-block'}}/>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-title">{zh?'奶量 (ml)':'Milk amount (ml)'}</div>
            <MultiSeriesChart keys={keys} range={range} series={[
              {id:'formula',color:'#93c5fd',label:zh?'配方':'Formula',dp:0,byDay:Object.fromEntries(keys.map(k=>[k,entries.filter(e=>fmtDateKey(e.timestamp)===k&&e.type==='formula').reduce((s,e)=>s+(e.amountMl||0),0)]))},
              {id:'ebm',    color:'#fb923c',label:'EBM',              dp:0,byDay:Object.fromEntries(keys.map(k=>[k,entries.filter(e=>fmtDateKey(e.timestamp)===k&&e.type==='ebm').reduce((s,e)=>s+(e.amountMl||0),0)]))},
              {id:'drink',  color:'#38bdf8',label:zh?'飲品':'Drink',  dp:0,byDay:Object.fromEntries(keys.map(k=>[k,entries.filter(e=>fmtDateKey(e.timestamp)===k&&e.type==='drink').reduce((s,e)=>s+(e.amountMl||0),0)]))},
            ]}/>
          </div>
          <div className="chart-card">
            <div className="chart-title">{zh?'母乳時長 (分鐘)':'Breastfeed time (min)'}</div>
            <MultiSeriesChart keys={keys} range={range} series={[
              {id:'bfL',color:'#f9a8d4',label:'Left',  dp:0,byDay:Object.fromEntries(keys.map(k=>[k,entries.filter(e=>fmtDateKey(e.timestamp)===k&&e.type==='breastfeed').reduce((s,e)=>s+(e.breastL||0),0)]))},
              {id:'bfR',color:'#fda4af',label:'Right', dp:0,byDay:Object.fromEntries(keys.map(k=>[k,entries.filter(e=>fmtDateKey(e.timestamp)===k&&e.type==='breastfeed').reduce((s,e)=>s+(e.breastR||0),0)]))},
            ]}/>
          </div>
        </>
      )}

      {/* ══ SLEEP ══ */}
      {activeView==='sleep' && (
        <>
          <div className="chart-card">
            <div className="chart-title">{zh?'睡眠時長':'Sleep duration'}</div>
            <MultiSeriesChart keys={keys} range={range} series={[
              {id:'sleep',color:'#a78bfa',label:zh?'小時':'Hours',dp:1,byDay:Object.fromEntries(keys.map(k=>[k,dayVal(k,'sleep')]))}
            ]}/>
          </div>
          <div className="chart-card">
            <div className="chart-title">{zh?'每日睡眠時段':'Daily sleep timeline'}</div>
            <SleepTimeline entries={entries} keys={keys} range={range}/>
          </div>
        </>
      )}

      {/* ══ NAPPY ══ */}
      {activeView==='nappy' && (
        <>
          <div className="chart-card">
            <div className="chart-title">{zh?'尿片時間':'Nappy timeline'}</div>
            <DotTimeline entries={entries} keys={keys.slice(-14)} types={NAPPY_TYPES}/>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
              {NAPPY_TYPES.map(t=>(
                <span key={t.id} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-secondary)'}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:t.color,display:'inline-block'}}/>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-title">{zh?'尿片次數':'Nappy count'}</div>
            <MultiSeriesChart keys={keys} range={range} series={NAPPY_TYPES.map(t=>({
              id:t.id, color:t.color, label:t.label, dp:0,
              byDay:Object.fromEntries(keys.map(k=>[k,entries.filter(e=>fmtDateKey(e.timestamp)===k&&e.type===t.id).length])),
            }))}/>
          </div>
        </>
      )}

      {/* ══ TEMP ══ */}
      {activeView==='temp' && (
        <div className="chart-card">
          <div className="chart-title">{zh?'體溫趨勢':'Temperature trend'}</div>
          <TempLineChart entries={entries}/>
        </div>
      )}

      {/* ══ GROWTH ══ */}
      {activeView==='growth' && (
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-title">{zh?'生長曲線':'Growth chart'}</div>
          </div>
          <div className="growth-metric-tabs">
            {GROWTH_ACTIONS.map(id=>(
              <button key={id} className={`growth-tab ${growthMetric===id?'growth-tab--on':''}`}
                style={growthMetric===id?{background:ACTIONS[id]?.color,borderColor:ACTIONS[id]?.color,color:'#111'}:{}}
                onPointerUp={()=>setGrowthMetric(id)}>
                {ACTIONS[id]?.emoji} {zh?ACTIONS[id]?.labelZh:ACTIONS[id]?.labelEn}
              </button>
            ))}
          </div>
          <GrowthChart entries={entries} baby={baby} metric={growthMetric}/>
        </div>
      )}
    </div>
  );
}
