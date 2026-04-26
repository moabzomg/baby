import React, { useState } from "react";

// ── Age-indexed guide data ────────────────────────────────────────────────
// All ranges: [min, max] per category, by age bracket
const GUIDE_DATA = [
  {
    ageLabel: "0–1 week",
    ageLabelZh: "0–1週",
    ageMonths: 0.25,
    milk: { bf: "8–12×/day, on demand", formula: "30–60ml/feed", note: "Colostrum first. Tiny stomach — ~5ml Day 1." },
    milkZh: { bf: "每天8–12次，按需", formula: "每次30–60ml", note: "初乳優先。第1天胃容量約5ml。" },
    sleep: { total: "16–17h", night: "No pattern yet", naps: "Multiple short naps" },
    sleepZh: { total: "16–17小時", night: "未有規律", naps: "多次短睡" },
    solids: null,
    milestones: ["Focus on faces 20–30cm","Startles to sounds"],
    milestonesZh: ["可聚焦20–30cm範圍","對聲音有驚跳反應"],
  },
  {
    ageLabel: "1–4 weeks",
    ageLabelZh: "1–4週",
    ageMonths: 0.75,
    milk: { bf: "8–12×/day", formula: "60–90ml/feed", note: "Feed on demand. Growth spurts at 10d & 3w." },
    milkZh: { bf: "每天8–12次", formula: "每次60–90ml", note: "按需餵哺。第10天及第3週有生長高峰。" },
    sleep: { total: "15–17h", night: "2–4h stretches", naps: "Every 1–2h" },
    sleepZh: { total: "15–17小時", night: "每次2–4小時", naps: "每1–2小時小睡" },
    solids: null,
    milestones: ["Brief eye contact","Responds to voice"],
    milestonesZh: ["短暫眼神接觸","對聲音有反應"],
  },
  {
    ageLabel: "1–2 months",
    ageLabelZh: "1–2個月",
    ageMonths: 1.5,
    milk: { bf: "7–9×/day", formula: "90–120ml/feed", note: "Growth spurt at 6w. May cluster-feed evenings." },
    milkZh: { bf: "每天7–9次", formula: "每次90–120ml", note: "6週生長高峰。傍晚可能密集餵哺。" },
    sleep: { total: "14–16h", night: "3–5h stretches", naps: "3–4 naps" },
    sleepZh: { total: "14–16小時", night: "每次3–5小時", naps: "3–4次小睡" },
    solids: null,
    milestones: ["Social smile","Tracks objects 180°","Holds head briefly"],
    milestonesZh: ["社交微笑","180°追蹤物體","短暫抬頭"],
  },
  {
    ageLabel: "2–4 months",
    ageLabelZh: "2–4個月",
    ageMonths: 3,
    milk: { bf: "5–7×/day", formula: "120–150ml/feed", note: "More efficient feeder. Longer night stretches possible." },
    milkZh: { bf: "每天5–7次", formula: "每次120–150ml", note: "進食效率提高。夜間可睡更長時間。" },
    sleep: { total: "14–16h", night: "5–7h stretches", naps: "3 naps" },
    sleepZh: { total: "14–16小時", night: "每次5–7小時", naps: "3次小睡" },
    solids: null,
    milestones: ["Laughs","Rolls tummy to back","Recognises parents","Babbles"],
    milestonesZh: ["大笑","從腹部翻身至背部","認識父母","發出咿呀聲"],
  },
  {
    ageLabel: "4–6 months",
    ageLabelZh: "4–6個月",
    ageMonths: 5,
    milk: { bf: "4–6×/day", formula: "150–180ml/feed", note: "Watch for readiness signs for solids near 6m." },
    milkZh: { bf: "每天4–6次", formula: "每次150–180ml", note: "6個月時留意固體食物準備跡象。" },
    sleep: { total: "12–16h", night: "6–8h stretches", naps: "2–3 naps" },
    sleepZh: { total: "12–16小時", night: "每次6–8小時", naps: "2–3次小睡" },
    solids: null,
    milestones: ["Sits with support","Grabs objects","Passes objects hand-to-hand","Says 'ah','oh'"],
    milestonesZh: ["有支撐時可坐","抓握物品","物品從手到手","發出'啊''哦'"],
  },
  {
    ageLabel: "6–9 months",
    ageLabelZh: "6–9個月",
    ageMonths: 7.5,
    milk: { bf: "3–5×/day", formula: "180–230ml/feed", note: "Milk remains primary nutrition. Offer before solids." },
    milkZh: { bf: "每天3–5次", formula: "每次180–230ml", note: "母乳/奶粉仍為主要營養。先餵奶再餵固體。" },
    sleep: { total: "12–16h", night: "6–10h stretches", naps: "2 naps" },
    sleepZh: { total: "12–16小時", night: "每次6–10小時", naps: "2次小睡" },
    solids: { meals: "1–2 meals/day", texture: "Smooth purées", foods: "Single-ingredient veg, fruit, iron-rich cereals", amount: "Start with 1–2 tsp, build to 2–4 tbsp" },
    solidsZh: { meals: "每天1–2餐", texture: "幼滑泥蓉", foods: "單一食材蔬菜、水果、富含鐵質穀物", amount: "由1–2茶匙開始，增至2–4湯匙" },
    milestones: ["Sits independently","Crawls","Says mama/dada non-specifically","Pincer grip emerging"],
    milestonesZh: ["獨立坐立","爬行","無針對性說媽媽/爸爸","鉗形抓握發展中"],
  },
  {
    ageLabel: "9–12 months",
    ageLabelZh: "9–12個月",
    ageMonths: 10.5,
    milk: { bf: "3–4×/day", formula: "180–230ml/feed", note: "Transition to cup drinking. Cow's milk from 12m." },
    milkZh: { bf: "每天3–4次", formula: "每次180–230ml", note: "轉用杯子飲用。12個月起可引入全脂牛奶。" },
    sleep: { total: "12–16h", night: "8–12h stretches", naps: "2 naps → 1 nap" },
    sleepZh: { total: "12–16小時", night: "每次8–12小時", naps: "2次小睡→1次小睡" },
    solids: { meals: "3 meals/day", texture: "Mashed / soft lumps", foods: "Family foods minus salt/honey/whole nuts", amount: "~¼–⅓ adult portion" },
    solidsZh: { meals: "每天3餐", texture: "磨碎/軟塊", foods: "家庭食品（不加鹽/蜂蜜/整粒堅果）", amount: "約成人份量¼–⅓" },
    milestones: ["Pulls to stand","Cruises furniture","First words","Waves bye-bye","Claps"],
    milestonesZh: ["扶物站立","沿家具橫移","第一個詞語","揮手再見","拍手"],
  },
  {
    ageLabel: "12–18 months",
    ageLabelZh: "12–18個月",
    ageMonths: 15,
    milk: { bf: "2–3×/day", formula: "~360ml whole milk/day", note: "Formula not needed after 12m. Limit to 2 cups dairy." },
    milkZh: { bf: "每天2–3次", formula: "每天約360ml全脂牛奶", note: "12個月後無需配方奶。限制2杯乳製品。" },
    sleep: { total: "11–14h", night: "10–12h", naps: "1–2 naps" },
    sleepZh: { total: "11–14小時", night: "10–12小時", naps: "1–2次小睡" },
    solids: { meals: "3 meals + 2 snacks", texture: "Soft table food", foods: "All foods except honey for infants, limit salt/sugar", amount: "~¼ adult portion" },
    solidsZh: { meals: "3餐+2份小食", texture: "軟性固體食物", foods: "除嬰兒蜂蜜外所有食品，限制鹽/糖", amount: "約成人份量¼" },
    milestones: ["Walks independently","10–20 words","Points to pictures","Scribbles","Stack 2 blocks"],
    milestonesZh: ["獨立行走","10–20個詞語","指認圖片","塗鴉","疊2塊積木"],
  },
  {
    ageLabel: "18–24 months",
    ageLabelZh: "18–24個月",
    ageMonths: 21,
    milk: { bf: "On demand", formula: "~500ml dairy/day total", note: "Dairy from all sources. Water as main drink." },
    milkZh: { bf: "按需", formula: "每天約500ml乳製品", note: "各類乳製品。水為主要飲料。" },
    sleep: { total: "11–14h", night: "10–12h", naps: "1 nap (1–2h)" },
    sleepZh: { total: "11–14小時", night: "10–12小時", naps: "1次小睡（1–2小時）" },
    solids: { meals: "3 meals + 2 snacks", texture: "Chopped family food", foods: "Introduce new textures. Limit juice to 120ml/day.", amount: "~⅓ adult portion" },
    solidsZh: { meals: "3餐+2份小食", texture: "剁碎家庭食品", foods: "引入新質感。果汁限120ml/天。", amount: "約成人份量⅓" },
    milestones: ["50+ words","2-word phrases","Runs","Kicks ball","Sorts shapes"],
    milestonesZh: ["50+個詞語","2詞短語","跑步","踢球","分類形狀"],
  },
  {
    ageLabel: "2–3 years",
    ageLabelZh: "2–3歲",
    ageMonths: 30,
    milk: { bf: "Optional", formula: "2–3 servings dairy/day", note: "Dairy: cheese, yogurt, milk 1–3 cups/day." },
    milkZh: { bf: "可選", formula: "每天2–3份乳製品", note: "乳製品：芝士、乳酪、牛奶每天1–3杯。" },
    sleep: { total: "10–13h", night: "10–12h", naps: "Optional nap (phasing out)" },
    sleepZh: { total: "10–13小時", night: "10–12小時", naps: "可選小睡（逐步取消）" },
    solids: { meals: "3 meals + 2 snacks", texture: "Family food", foods: "Balanced plate: ½ veg/fruit, ¼ protein, ¼ grains", amount: "~⅓–½ adult portion" },
    solidsZh: { meals: "3餐+2份小食", texture: "家庭食品", foods: "均衡餐盤：½蔬果、¼蛋白質、¼穀物", amount: "約成人份量⅓–½" },
    milestones: ["Sentences","Climbs stairs","Toilet training","Imaginative play","Draws circles"],
    milestonesZh: ["說出句子","爬樓梯","如廁訓練","想像性遊戲","畫圓形"],
  },
  {
    ageLabel: "3–5 years",
    ageLabelZh: "3–5歲",
    ageMonths: 48,
    milk: { bf: "WHO recommends up to 2y+", formula: "2 servings dairy/day", note: "Focus on varied diet over dairy quantity." },
    milkZh: { bf: "WHO建議2歲以上持續哺乳", formula: "每天2份乳製品", note: "重視多元飲食而非奶量。" },
    sleep: { total: "10–13h", night: "10–12h", naps: "No nap (most children)" },
    sleepZh: { total: "10–13小時", night: "10–12小時", naps: "大部分兒童無需小睡" },
    solids: { meals: "3 meals + 1–2 snacks", texture: "All textures", foods: "5 veg & fruit servings/day, limit processed food", amount: "~½ adult portion" },
    solidsZh: { meals: "3餐+1–2份小食", texture: "所有質感", foods: "每天5份蔬果，限制加工食品", amount: "約成人份量½" },
    milestones: ["Full sentences","Rides tricycle","Dresses self","Recognises letters","Cooperative play"],
    milestonesZh: ["完整句子","騎三輪車","自行穿衣","認識字母","合作遊戲"],
  },
  {
    ageLabel: "5–12 years",
    ageLabelZh: "5–12歲",
    ageMonths: 96,
    milk: { bf: "N/A", formula: "2–3 servings dairy/day", note: "1 serving = 240ml milk / 40g cheese / 150g yogurt" },
    milkZh: { bf: "不適用", formula: "每天2–3份乳製品", note: "1份=240ml牛奶/40g芝士/150g乳酪" },
    sleep: { total: "9–11h", night: "9–11h", naps: "No nap" },
    sleepZh: { total: "9–11小時", night: "9–11小時", naps: "無需小睡" },
    solids: { meals: "3 meals + snacks as needed", texture: "All", foods: "Calcium, iron, omega-3 important. Limit sugar.", amount: "~½–¾ adult portion" },
    solidsZh: { meals: "3餐+按需小食", texture: "所有", foods: "鈣質、鐵質、Omega-3重要。限制糖分。", amount: "約成人份量½–¾" },
    milestones: ["Reading","Complex problem solving","Sports skills","Growing independence"],
    milestonesZh: ["閱讀","複雜解題","運動技能","增長獨立性"],
  },
  {
    ageLabel: "12–18 years",
    ageLabelZh: "12–18歲",
    ageMonths: 180,
    milk: { bf: "N/A", formula: "3 servings dairy/day (growth)", note: "Peak bone mass building. Calcium 1300mg/day." },
    milkZh: { bf: "不適用", formula: "每天3份乳製品（生長期）", note: "建立骨骼高峰期。每天鈣質1300mg。" },
    sleep: { total: "8–10h", night: "8–10h", naps: "Short nap if needed" },
    sleepZh: { total: "8–10小時", night: "8–10小時", naps: "如需要可短暫小睡" },
    solids: { meals: "3 meals + snacks", texture: "All", foods: "High calcium, iron (girls), zinc, protein for growth", amount: "Adult-sized portions" },
    solidsZh: { meals: "3餐+小食", texture: "所有", foods: "高鈣、鐵質（女孩）、鋅、蛋白質促進生長", amount: "成人份量" },
    milestones: ["Puberty","Abstract reasoning","Peer relationships","Planning future"],
    milestonesZh: ["青春期","抽象推理","同伴關係","規劃未來"],
  },
];

// ── Recommended sleep hours bar chart (for reference) ────────────────────
const SLEEP_REFS = [
  { label: "0–3m", min: 14, max: 17 },
  { label: "4–11m", min: 12, max: 16 },
  { label: "1–2y", min: 11, max: 14 },
  { label: "3–5y", min: 10, max: 13 },
  { label: "6–12y", min: 9, max: 11 },
  { label: "13–18y", min: 8, max: 10 },
];

function SleepRefChart() {
  const W=100,H=70,pL=14,pR=4,pT=6,pB=16,iW=W-pL-pR,iH=H-pT-pB;
  const n=SLEEP_REFS.length,slotW=iW/n,bw=slotW*0.55;
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto',display:'block'}}>
      <line x1={pL} y1={pT+iH} x2={pL+iW} y2={pT+iH} stroke="var(--border)" strokeWidth={0.3}/>
      {[8,10,12,14,16].map(h=>{
        const y=pT+iH-((h-6)/12)*iH;
        return(<g key={h}>
          <line x1={pL} y1={y} x2={pL+iW} y2={y} stroke="var(--border)" strokeWidth={0.2} opacity={0.5}/>
          <text x={pL-1} y={y+1} textAnchor="end" fontSize={2} fill="var(--text-tertiary)">{h}h</text>
        </g>);
      })}
      {SLEEP_REFS.map((s,i)=>{
        const cx=pL+(i+0.5)*slotW;
        const yMax=pT+iH-((s.max-6)/12)*iH;
        const yMin=pT+iH-((s.min-6)/12)*iH;
        const bh=yMin-yMax;
        return(<g key={i}>
          <rect x={cx-bw/2} y={yMax} width={bw} height={bh} fill="#a78bfa" opacity={0.6} rx={0.5}/>
          <text x={cx} y={H-1} textAnchor="middle" fontSize={2} fill="var(--text-tertiary)">{s.label}</text>
          <text x={cx} y={yMax-1} textAnchor="middle" fontSize={1.8} fill="#a78bfa">{s.max}h</text>
        </g>);
      })}
    </svg>
  );
}

// ── Milk volume reference chart ───────────────────────────────────────────
const MILK_REFS = [
  {label:"1w",  val:60},{label:"1m",  val:90},{label:"2m",  val:120},
  {label:"3m",  val:150},{label:"4m", val:165},{label:"6m",  val:195},
  {label:"9m",  val:210},{label:"12m",val:230},
];
function MilkRefChart() {
  const max=250,W=100,H=60,pL=6,pR=4,pT=6,pB=14,iW=W-pL-pR,iH=H-pT-pB;
  const n=MILK_REFS.length,bw=Math.max(1,iW/n*0.6);
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto',display:'block'}}>
      <line x1={pL} y1={pT+iH} x2={pL+iW} y2={pT+iH} stroke="var(--border)" strokeWidth={0.3}/>
      {MILK_REFS.map((s,i)=>{
        const x=pL+(i+0.5)/n*iW,bh=(s.val/max)*iH,y=pT+iH-bh;
        return(<g key={i}>
          <rect x={x-bw/2} y={y} width={bw} height={Math.max(bh,0.3)} fill="#93c5fd" opacity={0.8} rx={0.4}/>
          <text x={x} y={y-1.5} textAnchor="middle" fontSize={1.8} fill="#93c5fd">{s.val}</text>
          <text x={x} y={H-1} textAnchor="middle" fontSize={2} fill="var(--text-tertiary)">{s.label}</text>
        </g>);
      })}
    </svg>
  );
}

// ── Section block ─────────────────────────────────────────────────────────
function Section({title,emoji,color,children}){
  const [open,setOpen]=useState(true);
  return(
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden',marginBottom:10}}>
      <button onPointerUp={()=>setOpen(v=>!v)}
        style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'12px 14px',background:'none',border:'none',cursor:'pointer',borderBottom:open?'1px solid var(--border)':'none'}}>
        <span style={{fontSize:18}}>{emoji}</span>
        <span style={{flex:1,textAlign:'left',fontSize:14,fontWeight:600,color:'var(--text-primary)'}}>{title}</span>
        <span style={{color:'var(--text-tertiary)',fontSize:12}}>{open?'▲':'▼'}</span>
      </button>
      {open&&<div style={{padding:'12px 14px'}}>{children}</div>}
    </div>
  );
}

function InfoRow({label,value,note}){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:2,marginBottom:8,paddingBottom:8,borderBottom:'1px solid var(--border)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
        <span style={{fontSize:12,color:'var(--text-tertiary)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px'}}>{label}</span>
        <span style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',textAlign:'right',maxWidth:'55%'}}>{value}</span>
      </div>
      {note&&<span style={{fontSize:11,color:'var(--text-secondary)',fontStyle:'italic'}}>{note}</span>}
    </div>
  );
}

// ── Main BabyGuide page ───────────────────────────────────────────────────
export default function BabyGuide({ lang, baby }) {
  const zh = lang === "zh";

  // Find the current guide based on baby age
  const getBabyAgeMonths = () => {
    if (!baby?.date || !baby?.hasBorn) return null;
    const diff = Date.now() - new Date(baby.date).getTime();
    if (diff < 0) return null;
    return diff / (30.44 * 24 * 3600 * 1000);
  };
  const ageMonths = getBabyAgeMonths();

  const getDefaultIdx = () => {
    if (ageMonths === null) return 0;
    let best = 0;
    GUIDE_DATA.forEach((g, i) => { if (ageMonths >= g.ageMonths * 0.5) best = i; });
    return Math.min(best, GUIDE_DATA.length - 1);
  };

  const [selectedIdx, setSelectedIdx] = useState(getDefaultIdx);
  const guide = GUIDE_DATA[selectedIdx];
  const milk = zh ? guide.milkZh : guide.milk;
  const sleep = zh ? guide.sleepZh : guide.sleep;
  const solids = guide.solids ? (zh ? guide.solidsZh : guide.solids) : null;
  const milestones = zh ? guide.milestonesZh : guide.milestones;

  return (
    <div style={{ padding: 16, paddingBottom: 80, background: "var(--bg)", minHeight: "100vh" }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>
        {zh ? "👶 育兒指南" : "👶 Baby Guide"}
      </h2>

      {/* Age selector */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-tertiary)", marginBottom: 8 }}>
          {zh ? "選擇年齡階段" : "Select age stage"}
          {ageMonths !== null && (
            <span style={{ marginLeft: 8, color: "var(--text-secondary)", fontWeight: 400 }}>
              — {zh ? `寶寶現在約 ${Math.round(ageMonths)} 個月` : `Baby is ~${Math.round(ageMonths)} months`}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {GUIDE_DATA.map((g, i) => {
            const isCurrent = ageMonths !== null && Math.abs(g.ageMonths - ageMonths) === Math.min(...GUIDE_DATA.map(x => Math.abs(x.ageMonths - ageMonths)));
            return (
              <button key={i} onPointerUp={() => setSelectedIdx(i)}
                style={{
                  padding: "5px 10px", borderRadius: "var(--radius-pill)",
                  border: `1.5px solid ${selectedIdx === i ? "var(--accent)" : isCurrent ? "#a78bfa" : "var(--border)"}`,
                  background: selectedIdx === i ? "var(--accent)" : isCurrent ? "rgba(167,139,250,0.1)" : "var(--bg)",
                  color: selectedIdx === i ? "var(--bg)" : "var(--text-secondary)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", touchAction: "manipulation",
                }}>
                {zh ? g.ageLabelZh : g.ageLabel}
                {isCurrent && selectedIdx !== i && <span style={{ marginLeft: 3, fontSize: 8 }}>●</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage banner */}
      <div style={{ background: "linear-gradient(135deg,var(--surface),var(--bg))", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 32 }}>👶</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{zh ? guide.ageLabelZh : guide.ageLabel}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            {zh ? "點擊各區段查看詳情" : "Tap sections to expand"}
          </div>
        </div>
      </div>

      {/* Milk / feeding */}
      <Section emoji="🍼" title={zh ? "餵食" : "Feeding"} color="#93c5fd">
        <InfoRow label={zh ? "母乳" : "Breastfeed"} value={milk.bf}/>
        <InfoRow label={zh ? "配方奶" : "Formula"} value={milk.formula}/>
        {milk.note && <div style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", marginTop: 4 }}>{milk.note}</div>}
      </Section>

      {/* Solids */}
      {solids ? (
        <Section emoji="🥣" title={zh ? "固體食物" : "Solid food"} color="#fbbf24">
          <InfoRow label={zh ? "餐次" : "Meals"} value={solids.meals}/>
          <InfoRow label={zh ? "質感" : "Texture"} value={solids.texture}/>
          <InfoRow label={zh ? "食物" : "Foods"} value={solids.foods}/>
          <InfoRow label={zh ? "份量" : "Amount"} value={solids.amount}/>
        </Section>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 10, fontSize: 13, color: "var(--text-tertiary)", fontStyle: "italic" }}>
          🥣 {zh ? "此階段尚未引入固體食物" : "Solids not yet introduced at this stage"}
        </div>
      )}

      {/* Sleep */}
      <Section emoji="😴" title={zh ? "睡眠" : "Sleep"} color="#a78bfa">
        <InfoRow label={zh ? "總睡眠" : "Total"} value={sleep.total}/>
        <InfoRow label={zh ? "夜間連續睡眠" : "Night stretch"} value={sleep.night}/>
        <InfoRow label={zh ? "小睡" : "Naps"} value={sleep.naps}/>
      </Section>

      {/* Milestones */}
      <Section emoji="🌟" title={zh ? "發展里程碑" : "Development milestones"} color="#f59e0b">
        {milestones.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, fontSize: 13, color: "var(--text-secondary)" }}>
            <span style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }}>✦</span>
            <span>{m}</span>
          </div>
        ))}
      </Section>

      {/* Reference charts */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
          {zh ? "😴 推薦睡眠時間（所有年齡）" : "😴 Recommended sleep hours (all ages)"}
        </div>
        <SleepRefChart/>
        <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>{zh ? "來源：WHO / AAP 指引" : "Source: WHO / AAP guidelines"}</div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
          {zh ? "🍼 推薦每次奶瓶奶量（ml）" : "🍼 Recommended bottle feed (ml/feed)"}
        </div>
        <MilkRefChart/>
        <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>{zh ? "僅供參考，每個嬰兒有所不同" : "Reference only — every baby is different"}</div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: "var(--yellow-bg)", border: "1px solid var(--yellow-border)", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 11, color: "var(--yellow-text)", lineHeight: 1.5 }}>
        ⚠️ {zh
          ? "本指南僅供參考。每個嬰兒的發展有所不同。如有任何疑慮，請諮詢您的兒科醫生或健康訪客。"
          : "This guide is for reference only. Every baby develops differently. Always consult your paediatrician or health visitor for personalised advice."}
      </div>
    </div>
  );
}
