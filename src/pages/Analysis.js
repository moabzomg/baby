import React, { useState, useMemo, useCallback } from "react";
import { ACTIONS, FEED_ACTIONS, NAPPY_ACTIONS, GROWTH_ACTIONS } from "../utils/actions";
import { fmtDateKey, getDaySleepSegments, computeSleepDurations } from "../utils/helpers";

// ── WHO reference data ────────────────────────────────────────────────────
const WHO = {
  weight: {
    0:[2500,3300,4300],1:[3400,4500,5700],2:[4300,5600,6800],3:[5000,6400,7700],
    4:[5600,7000,8400],6:[6400,7900,9500],9:[7200,8900,10600],12:[7800,9600,11500],
    18:[8800,10900,13000],24:[9700,12200,14500],36:[12000,14700,17500],
    48:[13700,16700,20000],60:[15500,19200,23000],72:[17000,21400,25800],
    84:[18800,23800,29000],96:[20500,26400,32700],120:[24000,32500,42500],
    144:[28500,40000,55000],168:[36000,52000,73000],192:[46500,67500,94000],216:[57000,82000,110000],
  },
  height: {
    0:[46.3,49.9,53.4],1:[50.8,54.7,58.5],2:[54.4,58.4,62.4],3:[57.3,61.4,65.5],
    4:[59.7,63.9,68.0],6:[63.3,67.6,72.1],9:[68.0,72.3,77.1],12:[71.7,75.7,81.2],
    18:[77.5,82.3,87.7],24:[82.5,87.8,93.6],36:[88.7,96.1,103.0],48:[94.9,103.3,111.1],
    60:[100.7,110.0,118.7],84:[111.2,122.4,133.2],120:[125.6,139.6,153.8],
    144:[135.1,150.9,167.4],168:[145.2,162.2,180.7],192:[150.2,167.8,186.9],
  },
  head: {
    0:[31.7,34.5,37.3],1:[34.4,37.3,40.1],2:[36.2,39.1,41.9],3:[37.7,40.5,43.3],
    6:[41.0,43.8,46.5],9:[43.0,45.8,48.5],12:[44.5,47.2,49.9],18:[46.1,48.9,51.5],24:[47.2,50.0,52.6],
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

// ── Key & label helpers ───────────────────────────────────────────────────
function shortLbl(k) {
  const [,m,d]=k.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

// ── Simple bar chart ──────────────────────────────────────────────────────
function BarChart({ data, color, unit='', h=100 }) {
  const max = Math.max(...data.map(d=>d.value), 0.001);
  const W=100, padL=6, padR=2, padT=6, padB=14;
  const iW=W-padL-padR, iH=h-padT-padB;
  const n=data.length;
  const bw=Math.max(0.8, iW/n*0.6);

  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{width:'100%',height:'auto',display:'block'}}>
      <line x1={padL} y1={padT+iH} x2={padL+iW} y2={padT+iH} stroke="var(--border)" strokeWidth={0.3}/>
      {data.map((d,i)=>{
        const x=padL+(i+0.5)/n*iW;
        const bh=d.value>0?(d.value/max)*iH:0;
        const y=padT+iH-bh;
        return (
          <g key={i}>
            <rect x={x-bw/2} y={y} width={bw} height={Math.max(bh,0.3)} fill={color} opacity={d.value>0?0.85:0.1} rx={0.5}/>
            {d.value>0&&bh>10&&<text x={x} y={y-1.5} textAnchor="middle" fontSize={2} fill={color}>{Number.isInteger(d.value)?d.value:d.value.toFixed(1)}{unit}</text>}
            {i%Math.max(1,Math.ceil(n/8))===0&&<text x={x} y={h-1} textAnchor="middle" fontSize={2.2} fill="var(--text-tertiary)">{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ── Multi-bar chart (grouped, each series side-by-side per day) ───────────
function MultiBarChart({ series, keys, h=110 }) {
  const n = keys.length;
  const ns = series.length;
  const W=100, padL=6, padR=2, padT=6, padB=14;
  const iW=W-padL-padR, iH=h-padT-padB;
  const slotW = iW/n;
  const bw = Math.max(0.5, Math.min(2.5, slotW/(ns+1)));

  const maxPerSeries = series.map(s=>Math.max(...keys.map(k=>s.byDay[k]||0), 0.001));

  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{width:'100%',height:'auto',display:'block'}}>
      <line x1={padL} y1={padT+iH} x2={padL+iW} y2={padT+iH} stroke="var(--border)" strokeWidth={0.3}/>
      {keys.map((k,ki)=>{
        const cx=padL+(ki+0.5)*slotW;
        return (
          <g key={k}>
            {series.map((s,si)=>{
              const v=s.byDay[k]||0;
              const norm=v/maxPerSeries[si];
              const bh=norm*iH;
              const x=cx+(si-(ns-1)/2)*(bw+0.5);
              const y=padT+iH-bh;
              return (
                <g key={si}>
                  <rect x={x-bw/2} y={y} width={bw} height={Math.max(bh,0.2)} fill={s.color} opacity={v>0?0.85:0.08} rx={0.4}/>
                </g>
              );
            })}
            {ki%Math.max(1,Math.ceil(n/8))===0&&(
              <text x={cx} y={h-1} textAnchor="middle" fontSize={2.1} fill="var(--text-tertiary)">{shortLbl(k)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Sleep timeline (horizontal shading per day, 0–24h) ───────────────────
function SleepTimeline({ entries, keys }) {
  const show=keys.slice(-Math.min(keys.length,14));
  return (
    <div>
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
                const l=Math.max(0,((s.start-dayStart)/86400000)*100);
                const w=Math.min(100-l,((s.end-s.start)/86400000)*100);
                return <div key={i} style={{position:'absolute',left:`${l}%`,width:`${w}%`,height:'100%',background:'#a78bfa',opacity:.75}}/>;
              })}
            </div>
          </div>
        );
      })}
      <div style={{display:'flex',alignItems:'center',gap:5,marginTop:5,fontSize:10,color:'var(--text-secondary)'}}>
        <div style={{width:10,height:8,background:'#a78bfa',borderRadius:2,opacity:.75}}/>
        Sleep
      </div>
    </div>
  );
}

// ── Dot timeline (events along 0–24h axis per day) ────────────────────────
function DotTimeline({ entries, keys, types }) {
  const show=keys.slice(-Math.min(keys.length,14));
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
                const pct=Math.min(97,((e.timestamp-dayStart)/86400000)*100);
                const ty=types.find(t=>t.id===e.type)||types[0];
                const filled=e.amountMl!=null||e.breastL!=null||e.breastR!=null;
                return (
                  <div key={i} style={{
                    position:'absolute',left:`${pct}%`,top:'50%',
                    transform:'translate(-50%,-50%)',width:8,height:8,borderRadius:'50%',
                    background:filled?ty.color:'transparent',border:`1.5px solid ${ty.color}`,
                    boxSizing:'border-box',cursor:'default',
                  }} title={ty.label+(e.amountMl?` ${e.amountMl}ml`:'')}/>
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
    entries.filter(e=>e.type==='temp'&&e.valueNum!=null).sort((a,b)=>a.timestamp-b.timestamp),
    [entries]);

  if (!pts.length) return (
    <div style={{textAlign:'center',color:'var(--text-tertiary)',padding:'20px 0',fontSize:13}}>
      No temperature records yet
    </div>
  );

  const vals=pts.map(p=>p.valueNum);
  const minV=Math.min(...vals)-0.3, maxV=Math.max(...vals)+0.3;
  const W=100,H=60,pL=10,pR=4,pT=6,pB=14;
  const iW=W-pL-pR,iH=H-pT-pB;
  const toX=i=>pL+(i/Math.max(pts.length-1,1))*iW;
  const toY=v=>pT+iH-((v-minV)/(maxV-minV||1))*iH;
  const col=v=>v<36?'#60a5fa':v<=37.5?'#22c55e':v<=38.5?'#f59e0b':'#ef4444';

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto'}}>
        <rect x={pL} y={toY(37.5)} width={iW} height={Math.max(0,toY(36)-toY(37.5))} fill="#22c55e" opacity={0.08}/>
        {[37.5,38.5].map(v=>(
          <line key={v} x1={pL} y1={toY(v)} x2={pL+iW} y2={toY(v)} stroke={col(v+0.1)} strokeWidth={0.3} strokeDasharray="2,1" opacity={0.5}/>
        ))}
        {pts.length>1&&<polyline points={pts.map((p,i)=>`${toX(i)},${toY(p.valueNum)}`).join(' ')} fill="none" stroke="#f43f5e" strokeWidth={0.8}/>}
        {pts.map((p,i)=><circle key={i} cx={toX(i)} cy={toY(p.valueNum)} r={1.3} fill={col(p.valueNum)}/>)}
        {[36,37,38,39].filter(v=>v>=minV&&v<=maxV).map(v=>(
          <text key={v} x={pL-1} y={toY(v)+1} textAnchor="end" fontSize={2.4} fill="var(--text-tertiary)">{v}</text>
        ))}
        <line x1={pL} y1={pT+iH} x2={pL+iW} y2={pT+iH} stroke="var(--border)" strokeWidth={0.3}/>
        {[0,pts.length-1].map(i=>(
          <text key={i} x={toX(i)} y={H-1} textAnchor="middle" fontSize={2.1} fill="var(--text-tertiary)">
            {new Date(pts[i].timestamp).toLocaleDateString([],{month:'numeric',day:'numeric'})}
          </text>
        ))}
      </svg>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:4}}>
        {[{c:'#60a5fa',l:'Low (<36°C)'},{c:'#22c55e',l:'Normal'},{c:'#f59e0b',l:'Low fever (>37.5)'},{c:'#ef4444',l:'Fever (>38.5°C)'}].map(x=>(
          <span key={x.l} style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:'var(--text-secondary)'}}>
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
        value:e.valueNum,
      })),
    [entries,metric,birthday]);

  if (!measurements.length) return (
    <div style={{textAlign:'center',color:'var(--text-tertiary)',padding:'20px 0',fontSize:13}}>
      No {ACTIONS[metric]?.labelEn} records yet
    </div>
  );

  const hasWho=!!WHO[metric]&&!!birthday;
  const maxAgeM=Math.max(...measurements.map(m=>m.ageM||0),24);
  const allVals=measurements.map(m=>m.value);
  if (hasWho) { const r=whoInterp(WHO[metric],maxAgeM); allVals.push(r[0],r[2]); }
  const minV=Math.min(...allVals)*0.97, maxV=Math.max(...allVals)*1.03;

  const W=100,H=130,pL=14,pR=4,pT=8,pB=16;
  const iW=W-pL-pR,iH=H-pT-pB;
  const toX=ageM=>pL+(ageM/(maxAgeM||1))*iW;
  const toY=v=>pT+iH-((v-minV)/(maxV-minV||1))*iH;
  const col=ACTIONS[metric]?.color||'#8b5cf6';

  const whoAges=Object.keys(WHO[metric]||{}).map(Number).sort((a,b)=>a-b).filter(a=>a<=maxAgeM+3);
  const whoLines=hasWho?[0,1,2].map(idx=>whoAges.map(a=>({x:toX(a),y:toY(whoInterp(WHO[metric],a)[idx])}))):[];
  const pts=measurements.map(m=>({x:toX(m.ageM||0),y:toY(m.value),value:m.value}));
  const fmtV=v=>metric==='weight'?(v>=1000?(v/1000).toFixed(2)+'kg':v+'g'):v+(ACTIONS[metric]?.unit||'');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto'}}>
        {hasWho&&whoLines.length===3&&(
          <>
            <polygon points={[...whoLines[0].map(p=>`${p.x},${p.y}`),...whoLines[2].map(p=>`${p.x},${p.y}`).reverse()].join(' ')} fill={col} opacity={0.08}/>
            {whoLines.map((line,i)=>(
              <polyline key={i} points={line.map(p=>`${p.x},${p.y}`).join(' ')} stroke={col} strokeWidth={0.4} fill="none" strokeDasharray={i===1?'':'2,1'} opacity={0.55}/>
            ))}
          </>
        )}
        {pts.length>1&&<polyline points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke={col} strokeWidth={0.9}/>}
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={1.4} fill={col}/>
            <text x={p.x} y={p.y-2.5} textAnchor="middle" fontSize={2.0} fill="var(--text-secondary)">{fmtV(p.value)}</text>
          </g>
        ))}
        <line x1={pL} y1={pT+iH} x2={pL+iW} y2={pT+iH} stroke="var(--border)" strokeWidth={0.3}/>
        <line x1={pL} y1={pT} x2={pL} y2={pT+iH} stroke="var(--border)" strokeWidth={0.3}/>
        {[0,6,12,24,36,60,120,180].filter(a=>a<=maxAgeM+3).map(a=>(
          <text key={a} x={toX(a)} y={H-2} textAnchor="middle" fontSize={2.2} fill="var(--text-tertiary)">{a}m</text>
        ))}
      </svg>
      {hasWho&&(
        <div style={{display:'flex',gap:12,marginTop:6,fontSize:10,color:'var(--text-tertiary)'}}>
          <span style={{display:'flex',alignItems:'center',gap:4}}>
            <span style={{width:14,height:2,background:col,opacity:.55,display:'inline-block',borderRadius:1}}/>WHO P3/P50/P97
          </span>
          <span style={{display:'flex',alignItems:'center',gap:4}}>
            <span style={{width:14,height:2,background:col,display:'inline-block',borderRadius:1}}/>Your baby
          </span>
        </div>
      )}
    </div>
  );
}

// ── Period navigator ──────────────────────────────────────────────────────
const RANGES=[{id:'7',label:'7d'},{id:'30',label:'30d'},{id:'180',label:'6m'},{id:'365',label:'1y'},{id:'custom',label:'Custom'}];

function PeriodNav({ range, setRange, anchor, setAnchor, customStart, customEnd, setCustomStart, setCustomEnd }) {
  const step = useCallback((dir)=>{
    const a=new Date(anchor);
    const days={'7':7,'30':30,'180':180,'365':365}[range]||7;
    a.setDate(a.getDate()+dir*days);
    if (a>new Date()) a.setTime(Date.now());
    setAnchor(fmtDateKey(a.getTime()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[anchor, range]);

  const isToday=anchor===fmtDateKey(Date.now());

  const rangeLabel=()=>{
    if (range==='custom') return 'Custom range';
    const end=new Date(anchor);
    const days={'7':6,'30':29,'180':179,'365':364}[range]||6;
    const start=new Date(anchor); start.setDate(end.getDate()-days);
    return `${start.toLocaleDateString([],{month:'short',day:'numeric'})} – ${end.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}`;
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
        {RANGES.map(r=>(
          <button key={r.id} onPointerUp={()=>setRange(r.id)}
            style={{padding:'6px 11px',borderRadius:'var(--radius-pill)',border:'1px solid var(--border)',
              background:range===r.id?'var(--accent)':'var(--bg)',color:range===r.id?'var(--bg)':'var(--text-secondary)',
              fontSize:12,fontWeight:600,cursor:'pointer',touchAction:'manipulation'}}>
            {r.label}
          </button>
        ))}
      </div>
      {range!=='custom'&&(
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onPointerUp={()=>step(-1)} style={{padding:'5px 12px',fontSize:16,background:'var(--surface)',
            border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text-primary)'}}>‹</button>
          <span style={{flex:1,textAlign:'center',fontSize:11,color:'var(--text-secondary)'}}>{rangeLabel()}</span>
          <button onPointerUp={()=>step(1)} disabled={isToday}
            style={{padding:'5px 12px',fontSize:16,background:'var(--surface)',border:'1px solid var(--border)',
              borderRadius:'var(--radius-sm)',cursor:isToday?'not-allowed':'pointer',
              color:isToday?'var(--text-tertiary)':'var(--text-primary)',opacity:isToday?0.4:1}}>›</button>
        </div>
      )}
      {range==='custom'&&(
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

// ── Legend row ────────────────────────────────────────────────────────────
function Legend({ items }) {
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:8}}>
      {items.map(x=>(
        <span key={x.label} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-secondary)'}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:x.color,display:'inline-block'}}/>
          {x.label}
        </span>
      ))}
    </div>
  );
}

// ── Main Analysis ─────────────────────────────────────────────────────────
const NAPPY_TYPES=[
  {id:'wet',   color:'#60a5fa',label:'Wet 💦'},
  {id:'soiled',color:'#d97706',label:'Soiled 💩'},
  {id:'mixed', color:'#86efac',label:'Mixed'},
  {id:'change',color:'#a8a29e',label:'Change'},
];
const FEED_TYPES_VIZ=[
  {id:'breastfeed',color:'#f9a8d4',label:'BF'},
  {id:'formula',   color:'#93c5fd',label:'Formula'},
  {id:'ebm',       color:'#fb923c',label:'EBM'},
  {id:'drink',     color:'#38bdf8',label:'Drink'},
  {id:'solid',     color:'#fbbf24',label:'Solid'},
];

export default function Analysis({ lang, entries, baby }) {
  const zh=lang==='zh';
  const [activeView, setActiveView] = useState('food');
  const [range, setRange]           = useState('7');
  const [anchor, setAnchor]         = useState(fmtDateKey(Date.now()));
  const [customStart, setCustomStart]=useState('');
  const [customEnd, setCustomEnd]   = useState(fmtDateKey(Date.now()));
  const [growthMetric, setGrowthMetric]=useState('weight');

  const keys=useMemo(()=>{
    if (range==='custom') {
      if (!customStart||!customEnd) return [];
      const ks=[]; const d=new Date(customStart); const end=new Date(customEnd);
      while(d<=end&&ks.length<400){ ks.push(fmtDateKey(d.getTime())); d.setDate(d.getDate()+1); }
      return ks;
    }
    const n={'7':7,'30':30,'180':180,'365':365}[range]||7;
    const a=new Date(anchor); const days=[];
    for(let i=n-1;i>=0;i--){ const d=new Date(a); d.setDate(a.getDate()-i); days.push(fmtDateKey(d.getTime())); }
    return days;
  },[range,anchor,customStart,customEnd]);

  const byDay=useMemo(()=>{
    const m={};
    entries.forEach(e=>{ const k=fmtDateKey(e.timestamp); if(!m[k])m[k]=[]; m[k].push(e); });
    return m;
  },[entries]);

  const dv=(k,id)=>{
    const day=byDay[k]||[];
    if(id==='feeds')  return day.filter(e=>FEED_ACTIONS.includes(e.type)).length;
    if(id==='milk')   return Math.round(day.reduce((s,e)=>s+(e.amountMl||0),0));
    if(id==='sleep')  { const dm=computeSleepDurations(day); let t=0; dm.forEach(v=>t+=v); return Math.round(t/360)/10; }
    if(id==='nappy')  return day.filter(e=>NAPPY_ACTIONS.includes(e.type)).length;
    if(id==='bfMin')  return day.filter(e=>e.type==='breastfeed').reduce((s,e)=>s+(e.breastL||0)+(e.breastR||0),0);
    return 0;
  };
  const mkBar=(id)=>keys.map(k=>({label:shortLbl(k),value:dv(k,id)}));
  const mkByDay=(fn)=>Object.fromEntries(keys.map(k=>[k,fn(byDay[k]||[])]));

  const activeDays=keys.filter(k=>(byDay[k]||[]).length>0).length||1;
  const avgFeeds=(keys.reduce((s,k)=>s+dv(k,'feeds'),0)/activeDays).toFixed(1);
  const avgMl=Math.round(keys.reduce((s,k)=>s+dv(k,'milk'),0)/activeDays);
  const avgSleep=(keys.reduce((s,k)=>s+dv(k,'sleep'),0)/activeDays).toFixed(1);
  const avgNappy=(keys.reduce((s,k)=>s+dv(k,'nappy'),0)/activeDays).toFixed(1);

  const VIEWS=[
    {id:'food',   label:zh?'餵食':'Food'},
    {id:'sleep',  label:zh?'睡眠':'Sleep'},
    {id:'nappy',  label:zh?'尿片':'Nappy'},
    {id:'temp',   label:zh?'體溫':'Temp'},
    {id:'growth', label:zh?'生長':'Growth'},
  ];

  return (
    <div className="analysis-page">

      {/* View tabs */}
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

      {/* Period navigator */}
      <div className="chart-card" style={{padding:'12px 14px'}}>
        <PeriodNav range={range} setRange={setRange} anchor={anchor} setAnchor={setAnchor}
          customStart={customStart} customEnd={customEnd}
          setCustomStart={setCustomStart} setCustomEnd={setCustomEnd}/>
      </div>

      {/* Stats row */}
      <div className="analysis-stats">
        {[
          {emoji:'🍼',val:avgFeeds,    lbl:zh?'平均餵食/天':'Avg feeds/day',  color:'#f9a8d4'},
          {emoji:'🥛',val:avgMl>0?`${avgMl}ml`:'—',lbl:zh?'平均奶量/天':'Avg milk/day', color:'#93c5fd'},
          {emoji:'😴',val:`${avgSleep}h`,lbl:zh?'平均睡眠/天':'Avg sleep/day',color:'#a78bfa'},
          {emoji:'🩱',val:avgNappy,    lbl:zh?'平均換片/天':'Avg nappy/day',  color:'#6ee7b7'},
        ].map((s,i)=>(
          <div key={i} className="analysis-stat" style={{borderLeftColor:s.color}}>
            <span className="as-emoji">{s.emoji}</span>
            <div><div className="as-val">{s.val}</div><div className="as-sub">{s.lbl}</div></div>
          </div>
        ))}
      </div>

      {/* ── FOOD ── */}
      {activeView==='food'&&(
        <>
          <div className="chart-card">
            <div className="chart-title">{zh?'餵食時間':'Feeding timeline'}</div>
            <DotTimeline entries={entries} keys={keys} types={FEED_TYPES_VIZ}/>
            <Legend items={FEED_TYPES_VIZ}/>
          </div>
          <div className="chart-card">
            <div className="chart-title">{zh?'奶量 (ml)':'Milk amount (ml)'}</div>
            <MultiBarChart keys={keys} series={[
              {color:'#93c5fd',label:'Formula',byDay:mkByDay(day=>day.filter(e=>e.type==='formula').reduce((s,e)=>s+(e.amountMl||0),0))},
              {color:'#fb923c',label:'EBM',     byDay:mkByDay(day=>day.filter(e=>e.type==='ebm').reduce((s,e)=>s+(e.amountMl||0),0))},
              {color:'#38bdf8',label:'Drink',   byDay:mkByDay(day=>day.filter(e=>e.type==='drink').reduce((s,e)=>s+(e.amountMl||0),0))},
              {color:'#6ee7b7',label:'Bottle',  byDay:mkByDay(day=>day.filter(e=>e.type==='bottle').reduce((s,e)=>s+(e.amountMl||0),0))},
            ]}/>
            <Legend items={[{color:'#93c5fd',label:'Formula'},{color:'#fb923c',label:'EBM'},{color:'#38bdf8',label:'Drink'},{color:'#6ee7b7',label:'Bottle'}]}/>
          </div>
          <div className="chart-card">
            <div className="chart-title">{zh?'母乳時長 (分鐘)':'Breastfeed (min)'}</div>
            <MultiBarChart keys={keys} series={[
              {color:'#f9a8d4',label:'Left',  byDay:mkByDay(day=>day.filter(e=>e.type==='breastfeed').reduce((s,e)=>s+(e.breastL||0),0))},
              {color:'#fda4af',label:'Right', byDay:mkByDay(day=>day.filter(e=>e.type==='breastfeed').reduce((s,e)=>s+(e.breastR||0),0))},
            ]}/>
            <Legend items={[{color:'#f9a8d4',label:'Left'},{color:'#fda4af',label:'Right'}]}/>
          </div>
          <div className="chart-card">
            <div className="chart-title">{zh?'固體食物 (次)':'Solid meals (times)'}</div>
            <BarChart data={mkBar('feeds').map((d,i)=>({...d,value:(byDay[keys[i]]||[]).filter(e=>['solid','snack','meal'].includes(e.type)).length}))} color="#fbbf24"/>
          </div>
        </>
      )}

      {/* ── SLEEP ── */}
      {activeView==='sleep'&&(
        <>
          <div className="chart-card">
            <div className="chart-title">{zh?'睡眠時長':'Sleep duration (h)'}</div>
            <BarChart data={mkBar('sleep')} color="#a78bfa" unit="h"/>
          </div>
          <div className="chart-card">
            <div className="chart-title">{zh?'每日睡眠時段':'Daily sleep timeline'}</div>
            <SleepTimeline entries={entries} keys={keys}/>
          </div>
        </>
      )}

      {/* ── NAPPY ── */}
      {activeView==='nappy'&&(
        <>
          <div className="chart-card">
            <div className="chart-title">{zh?'尿片時間':'Nappy timeline'}</div>
            <DotTimeline entries={entries} keys={keys} types={NAPPY_TYPES}/>
            <Legend items={NAPPY_TYPES}/>
          </div>
          <div className="chart-card">
            <div className="chart-title">{zh?'尿片次數':'Nappy count'}</div>
            <MultiBarChart keys={keys} series={NAPPY_TYPES.map(t=>({
              color:t.color, label:t.label,
              byDay:mkByDay(day=>day.filter(e=>e.type===t.id).length),
            }))}/>
            <Legend items={NAPPY_TYPES}/>
          </div>
        </>
      )}

      {/* ── TEMP ── */}
      {activeView==='temp'&&(
        <div className="chart-card">
          <div className="chart-title">{zh?'體溫趨勢':'Temperature trend'}</div>
          <TempLineChart entries={entries}/>
        </div>
      )}

      {/* ── GROWTH ── */}
      {activeView==='growth'&&(
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
