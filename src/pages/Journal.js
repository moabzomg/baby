import React, { useState, useRef, useCallback } from "react";
import { load, save, fmtDateKey } from "../utils/helpers";

// ── Storage helpers ───────────────────────────────────────────────────────
function loadJournal() {
  try { return JSON.parse(localStorage.getItem('bd_journal') || '[]'); } catch { return []; }
}
function saveJournal(entries) {
  try { localStorage.setItem('bd_journal', JSON.stringify(entries)); } catch {}
}

// ── Photo thumbnail ───────────────────────────────────────────────────────
function PhotoThumb({ src, onRemove, onClick }) {
  return (
    <div style={{position:'relative',display:'inline-block',cursor:'pointer'}} onPointerUp={onClick}>
      <img src={src} alt="" style={{width:72,height:72,objectFit:'cover',borderRadius:8,border:'1px solid var(--border)',display:'block'}}/>
      {onRemove && (
        <button onPointerUp={e=>{e.stopPropagation();onRemove();}}
          style={{position:'absolute',top:2,right:2,width:18,height:18,borderRadius:'50%',background:'rgba(0,0,0,0.6)',
            color:'#fff',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',
            border:'none',cursor:'pointer',lineHeight:1}}>
          ✕
        </button>
      )}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────
function Lightbox({ photos, idx, onClose }) {
  const [cur, setCur] = useState(idx);
  return (
    <div onPointerUp={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',
      zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onPointerUp={e=>e.stopPropagation()} style={{position:'relative',maxWidth:'92vw',maxHeight:'88vh'}}>
        <img src={photos[cur]} alt="" style={{maxWidth:'90vw',maxHeight:'80vh',borderRadius:8,objectFit:'contain',display:'block'}}/>
        {photos.length>1&&(
          <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}>
            <button onPointerUp={()=>setCur(c=>(c-1+photos.length)%photos.length)}
              style={{background:'rgba(255,255,255,0.15)',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:18,cursor:'pointer'}}>‹</button>
            <span style={{color:'rgba(255,255,255,.6)',fontSize:12,alignSelf:'center'}}>{cur+1}/{photos.length}</span>
            <button onPointerUp={()=>setCur(c=>(c+1)%photos.length)}
              style={{background:'rgba(255,255,255,0.15)',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:18,cursor:'pointer'}}>›</button>
          </div>
        )}
        <button onPointerUp={onClose} style={{position:'absolute',top:-14,right:-14,width:28,height:28,
          borderRadius:'50%',background:'rgba(255,255,255,0.15)',color:'#fff',border:'none',fontSize:16,cursor:'pointer'}}>✕</button>
      </div>
    </div>
  );
}

// ── Journal entry card ────────────────────────────────────────────────────
function JournalCard({ entry, lang, onDelete, onEdit }) {
  const zh=lang==='zh';
  const [lightboxIdx, setLightboxIdx]=useState(null);
  const date=new Date(entry.timestamp);
  const dateStr=date.toLocaleDateString(zh?'zh-HK':'en-GB',{weekday:'short',year:'numeric',month:'short',day:'numeric'});
  const timeStr=date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const MOOD_MAP={happy:'😄',neutral:'😐',fussy:'😣',crying:'😢'};

  return (
    <div className="journal-card">
      <div className="journal-card-header">
        <div>
          <span className="journal-date">{dateStr}</span>
          <span className="journal-time">{timeStr}</span>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button className="journal-action-btn" onPointerUp={onEdit}>✏️</button>
          <button className="journal-action-btn journal-action-btn--del" onPointerUp={onDelete}>🗑</button>
        </div>
      </div>

      {entry.mood && (
        <div style={{fontSize:22,marginBottom:6}}>{MOOD_MAP[entry.mood]||''}</div>
      )}

      {entry.title && (
        <div className="journal-title">{entry.title}</div>
      )}

      {entry.text && (
        <div className="journal-text">{entry.text}</div>
      )}

      {entry.tags?.length>0 && (
        <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:8}}>
          {entry.tags.map(tag=>(
            <span key={tag} style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius-pill)',
              padding:'2px 8px',fontSize:11,color:'var(--text-secondary)'}}>#{tag}</span>
          ))}
        </div>
      )}

      {entry.photos?.length>0 && (
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
          {entry.photos.map((src,i)=>(
            <PhotoThumb key={i} src={src} onClick={()=>setLightboxIdx(i)}/>
          ))}
        </div>
      )}

      {lightboxIdx!==null && (
        <Lightbox photos={entry.photos} idx={lightboxIdx} onClose={()=>setLightboxIdx(null)}/>
      )}
    </div>
  );
}

// ── Entry editor ──────────────────────────────────────────────────────────
const MOOD_OPTIONS=[
  {id:'happy',emoji:'😄'},{id:'neutral',emoji:'😐'},{id:'fussy',emoji:'😣'},{id:'crying',emoji:'😢'},
];

function EntryEditor({ initial, lang, onSave, onCancel }) {
  const zh=lang==='zh';
  const [title, setTitle]=useState(initial?.title||'');
  const [text, setText]=useState(initial?.text||'');
  const [mood, setMood]=useState(initial?.mood||'');
  const [tags, setTags]=useState((initial?.tags||[]).join(', '));
  const [photos, setPhotos]=useState(initial?.photos||[]);
  const [timestamp, setTimestamp]=useState(
    initial?.timestamp ? new Date(initial.timestamp).toISOString().slice(0,16) : new Date().toISOString().slice(0,16)
  );
  const fileRef=useRef();

  const handlePhotos=useCallback((files)=>{
    Array.from(files).forEach(file=>{
      if (!file.type.startsWith('image/')) return;
      const reader=new FileReader();
      reader.onload=e=>setPhotos(prev=>[...prev,e.target.result]);
      reader.readAsDataURL(file);
    });
  },[]);

  const handleDrop=useCallback(e=>{
    e.preventDefault();
    handlePhotos(e.dataTransfer.files);
  },[handlePhotos]);

  const parsedTags=tags.split(',').map(t=>t.trim()).filter(Boolean);

  const submit=()=>{
    if (!text.trim()&&!title.trim()&&!photos.length) return;
    onSave({
      title:title.trim(),
      text:text.trim(),
      mood,
      tags:parsedTags,
      photos,
      timestamp:new Date(timestamp).getTime(),
    });
  };

  return (
    <div className="journal-editor">
      <div className="journal-editor-header">
        <span style={{fontSize:15,fontWeight:600,color:'var(--text-primary)'}}>
          {initial ? (zh?'編輯日記':'Edit entry') : (zh?'新日記':'New entry')}
        </span>
        <button onPointerUp={onCancel} style={{color:'var(--text-tertiary)',fontSize:16,background:'none',border:'none',cursor:'pointer'}}>✕</button>
      </div>

      {/* Date/time */}
      <div className="field-group" style={{marginBottom:10}}>
        <label className="field-label">{zh?'日期時間':'Date & time'}</label>
        <input type="datetime-local" className="field-input" value={timestamp}
          max={new Date().toISOString().slice(0,16)}
          onChange={e=>setTimestamp(e.target.value)}/>
      </div>

      {/* Mood */}
      <div style={{display:'flex',gap:8,marginBottom:10}}>
        {MOOD_OPTIONS.map(m=>(
          <button key={m.id} onPointerUp={()=>setMood(prev=>prev===m.id?'':m.id)}
            style={{fontSize:24,background:'none',border:'none',cursor:'pointer',
              opacity:mood===m.id?1:0.35,transform:mood===m.id?'scale(1.2)':'scale(1)',
              transition:'all .15s'}}>
            {m.emoji}
          </button>
        ))}
      </div>

      {/* Title */}
      <div className="field-group" style={{marginBottom:10}}>
        <label className="field-label">{zh?'標題（可選）':'Title (optional)'}</label>
        <input type="text" className="field-input" placeholder={zh?'今天的主題…':'Title for this entry…'}
          value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}/>
      </div>

      {/* Text */}
      <div className="field-group" style={{marginBottom:10}}>
        <label className="field-label">{zh?'內容':'Content'}</label>
        <textarea className="field-input" rows={5}
          placeholder={zh?'今天發生了什麼…':'What happened today…'}
          value={text} onChange={e=>setText(e.target.value)}
          style={{resize:'vertical',lineHeight:1.6}}/>
      </div>

      {/* Tags */}
      <div className="field-group" style={{marginBottom:10}}>
        <label className="field-label">{zh?'標籤（用逗號分隔）':'Tags (comma separated)'}</label>
        <input type="text" className="field-input" placeholder={zh?'例：第一次、里程碑':'e.g. milestone, first-time'}
          value={tags} onChange={e=>setTags(e.target.value)}/>
      </div>

      {/* Photo upload */}
      <div className="field-group" style={{marginBottom:12}}>
        <label className="field-label">{zh?'相片':'Photos'}</label>
        <div className="photo-drop-zone"
          onDrop={handleDrop}
          onDragOver={e=>e.preventDefault()}
          onPointerUp={()=>fileRef.current?.click()}>
          {zh?'點擊或拖放相片':'Tap or drop photos here'}
          <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}}
            onChange={e=>handlePhotos(e.target.files)}/>
        </div>
        {photos.length>0 && (
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
            {photos.map((src,i)=>(
              <PhotoThumb key={i} src={src} onRemove={()=>setPhotos(prev=>prev.filter((_,j)=>j!==i))}/>
            ))}
          </div>
        )}
      </div>

      <div style={{display:'flex',gap:8}}>
        <button className="btn-secondary" onPointerUp={onCancel} style={{flex:1}}>{zh?'取消':'Cancel'}</button>
        <button onPointerUp={submit}
          style={{flex:2,padding:'12px',borderRadius:'var(--radius-sm)',background:'var(--accent)',
            color:'var(--bg)',fontSize:15,fontWeight:600,border:'none',cursor:'pointer',touchAction:'manipulation'}}>
          {zh?'儲存':'Save'}
        </button>
      </div>
    </div>
  );
}

// ── Main Journal page ─────────────────────────────────────────────────────
export default function Journal({ lang }) {
  const zh=lang==='zh';
  const [entries, setEntries]=useState(loadJournal);
  const [editing, setEditing]=useState(null); // null | 'new' | entry-id
  const [search, setSearch]=useState('');
  const [filterTag, setFilterTag]=useState('');
  const [albumMode, setAlbumMode]=useState(false);

  const persist=(updated)=>{ setEntries(updated); saveJournal(updated); };

  const saveEntry=(data)=>{
    if (editing==='new') {
      const entry={ id:Date.now(), ...data };
      persist([entry, ...entries]);
    } else {
      persist(entries.map(e=>e.id===editing?{...e,...data}:e));
    }
    setEditing(null);
  };

  const deleteEntry=(id)=>{
    if (window.confirm(zh?'確定刪除此日記？':'Delete this entry?')) {
      persist(entries.filter(e=>e.id!==id));
    }
  };

  // Search + tag filter
  const q=search.toLowerCase().trim();
  const filtered=entries.filter(e=>{
    if (filterTag && !(e.tags||[]).includes(filterTag)) return false;
    if (!q) return true;
    return (e.title||'').toLowerCase().includes(q)||(e.text||'').toLowerCase().includes(q);
  });

  // All unique tags
  const allTags=[...new Set(entries.flatMap(e=>e.tags||[]))].sort();

  // All photos
  const allPhotos=entries.flatMap(e=>(e.photos||[]).map(src=>({src,id:e.id,ts:e.timestamp})));

  const [lightboxSrc, setLightboxSrc]=useState(null);

  return (
    <div style={{padding:16,paddingBottom:80,background:'var(--bg)',minHeight:'100vh'}}>

      {/* ── Header ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <h2 style={{fontSize:18,fontWeight:600,color:'var(--text-primary)'}}>
          {zh?'📖 日記':'📖 Journal'}
        </h2>
        <div style={{display:'flex',gap:8}}>
          <button onPointerUp={()=>setAlbumMode(v=>!v)}
            style={{padding:'7px 12px',borderRadius:'var(--radius-pill)',border:'1px solid var(--border)',
              background:albumMode?'var(--accent)':'var(--bg)',color:albumMode?'var(--bg)':'var(--text-secondary)',
              fontSize:12,fontWeight:600,cursor:'pointer',touchAction:'manipulation'}}>
            {albumMode?(zh?'列表':'List'):(zh?'相冊':'Album')}
          </button>
          <button onPointerUp={()=>setEditing('new')}
            style={{padding:'7px 14px',borderRadius:'var(--radius-pill)',background:'var(--accent)',
              color:'var(--bg)',border:'none',fontSize:13,fontWeight:600,cursor:'pointer',touchAction:'manipulation'}}>
            + {zh?'新增':'New'}
          </button>
        </div>
      </div>

      {/* ── Editor ── */}
      {editing!==null && (
        <div style={{marginBottom:16}}>
          <EntryEditor
            lang={lang}
            initial={editing==='new'?null:entries.find(e=>e.id===editing)}
            onSave={saveEntry}
            onCancel={()=>setEditing(null)}/>
        </div>
      )}

      {/* ── Search + Tag filter ── */}
      {!editing && (
        <>
          <input type="text" className="field-input" style={{marginBottom:10}}
            placeholder={zh?'搜尋日記…':'Search entries…'}
            value={search} onChange={e=>setSearch(e.target.value)}/>
          {allTags.length>0 && (
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:12}}>
              <button onPointerUp={()=>setFilterTag('')}
                style={{padding:'3px 10px',borderRadius:'var(--radius-pill)',border:'1px solid var(--border)',
                  background:filterTag===''?'var(--accent)':'var(--bg)',color:filterTag===''?'var(--bg)':'var(--text-secondary)',
                  fontSize:11,cursor:'pointer'}}>
                {zh?'全部':'All'}
              </button>
              {allTags.map(tag=>(
                <button key={tag} onPointerUp={()=>setFilterTag(prev=>prev===tag?'':tag)}
                  style={{padding:'3px 10px',borderRadius:'var(--radius-pill)',border:'1px solid var(--border)',
                    background:filterTag===tag?'var(--accent)':'var(--bg)',color:filterTag===tag?'var(--bg)':'var(--text-secondary)',
                    fontSize:11,cursor:'pointer'}}>
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Album view ── */}
      {albumMode && !editing && (
        <div style={{columns:'3 80px',gap:6,columnFill:'balance'}}>
          {allPhotos.map((p,i)=>(
            <div key={i} style={{breakInside:'avoid',marginBottom:6}}>
              <img src={p.src} alt="" onPointerUp={()=>setLightboxSrc(p.src)}
                style={{width:'100%',borderRadius:6,display:'block',cursor:'pointer',border:'1px solid var(--border)'}}/>
            </div>
          ))}
          {allPhotos.length===0 && (
            <p style={{color:'var(--text-tertiary)',fontSize:13,padding:'24px 0',textAlign:'center'}}>
              {zh?'尚無相片':'No photos yet'}
            </p>
          )}
        </div>
      )}

      {/* ── List view ── */}
      {!albumMode && !editing && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {filtered.length===0 && (
            <p style={{color:'var(--text-tertiary)',fontSize:13,padding:'24px 0',textAlign:'center'}}>
              {entries.length===0
                ? (zh?'還沒有日記，點擊「新增」開始記錄！':'No entries yet — tap New to start!')
                : (zh?'找不到符合的記錄':'No matching entries')}
            </p>
          )}
          {filtered.map(e=>(
            <JournalCard key={e.id} entry={e} lang={lang}
              onDelete={()=>deleteEntry(e.id)}
              onEdit={()=>setEditing(e.id)}/>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div onPointerUp={()=>setLightboxSrc(null)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <img src={lightboxSrc} alt="" style={{maxWidth:'90vw',maxHeight:'88vh',borderRadius:8,objectFit:'contain'}}/>
        </div>
      )}
    </div>
  );
}
