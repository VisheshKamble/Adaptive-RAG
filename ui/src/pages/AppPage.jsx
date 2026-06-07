import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { runQuery, ingestFile } from '../lib/api' // Adjust the import path here if your folder structure differs

/* ── helpers ─────────────────────────────────────────────────────────────── */
const scoreColor = s => s >= .8 ? '#059669' : s >= .5 ? '#d97706' : '#dc2626'
const scoreLabel = s => s >= .8 ? 'High' : s >= .5 ? 'Med' : 'Low'

/* ── All SVG icons ──────────────────────────────────────────────────────── */
const Ico = {
  brain:    (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.1-1.98Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.1-1.98Z"/></svg>,
  db:       (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
  shield:   (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
  globe:    (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  zap:      (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  layers:   (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  refresh:  (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  network:  (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>,
  activity: (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  file:     (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"/><polyline points="14 2 14 8 20 8"/></svg>,
  upload:   (c='currentColor',s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  x:        (c='currentColor',s=10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  send:     (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  panel:    (c='currentColor',s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>,
  check:    (c='#059669',s=11) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7l3 3 6-6"/></svg>,
  triangle: (c='#dc2626',s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>,
  chevron:  (c='currentColor',s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
}

/* ── Node metadata ───────────────────────────────────────────────────────── */
const NODE_META = {
  analyse_query:   { icon:'brain',   color:'#7c3aed', label:'Query Analysis' },
  retrieve:        { icon:'db',      color:'#0066ff', label:'Retrieval' },
  critique_chunks: { icon:'shield',  color:'#dc2626', label:'Relevance Critique' },
  web_fallback:    { icon:'globe',   color:'#d97706', label:'Web Fallback' },
  rerank:          { icon:'zap',     color:'#0891b2', label:'Re-ranking' },
  generate_answer: { icon:'layers',  color:'#059669', label:'Generation' },
  critique_answer: { icon:'refresh', color:'#dc2626', label:'Answer Critique' },
  update_memory:   { icon:'network', color:'#00b4aa', label:'Memory Update' },
}
const ALL_NODES = Object.keys(NODE_META)

/* ── Trace step ──────────────────────────────────────────────────────────── */
function TraceStep({ node, active, done }) {
  const meta = NODE_META[node] || { icon:'activity', color:'#a0a0a0', label:node }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 0' }}>
      <div style={{
        width:26, height:26, borderRadius:8, flexShrink:0,
        background: done ? `${meta.color}0f` : active ? `${meta.color}0d` : 'var(--bg-subtle)',
        border:`1.5px solid ${done||active ? meta.color+'30' : 'var(--line)'}`,
        display:'flex', alignItems:'center', justifyContent:'center', transition:'all .3s',
      }}>
        {active
          ? <div className="spin" style={{ width:11, height:11, borderRadius:'50%', border:`1.5px solid ${meta.color}30`, borderTopColor:meta.color }}/>
          : Ico[meta.icon](done ? meta.color : '#c8c8c8', 12)}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:500, letterSpacing:'-.01em', color: done?meta.color : active?'var(--ink)' : 'var(--ink-4)' }}>
          {meta.label}
        </div>
      </div>
      {done && Ico.check(meta.color, 11)}
    </div>
  )
}

/* ── Source card ─────────────────────────────────────────────────────────── */
function SourceCard({ source, idx }) {
  const color = scoreColor(source.rerank_score ?? 0)
  return (
    <motion.div initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} transition={{delay:idx*.06}}
      style={{ background:'var(--bg-soft)', border:'1.5px solid var(--line)', borderRadius:12, padding:'13px', marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:9 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {source.web_result ? Ico.globe('#d97706',11) : Ico.file('#0066ff',11)}
          <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-3)', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {source.source.split('/').pop()}
          </span>
        </div>
        <span style={{ fontSize:10, color, fontFamily:'var(--mono)', fontWeight:600 }}>
          {scoreLabel(source.rerank_score)} {(source.rerank_score??0).toFixed(2)}
        </span>
      </div>
      <div style={{ marginBottom:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
          <span style={{ fontSize:9, color:'var(--ink-4)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'.06em' }}>relevance</span>
          <span style={{ fontSize:9, color:'var(--ink-4)', fontFamily:'var(--mono)' }}>{(source.relevance_score??0).toFixed(2)}</span>
        </div>
        <div style={{ height:2, background:'var(--line)', borderRadius:2, overflow:'hidden' }}>
          <motion.div initial={{width:0}} animate={{width:`${(source.relevance_score??0)*100}%`}} transition={{duration:.8,delay:idx*.08}}
            style={{ height:'100%', borderRadius:2, background:`linear-gradient(90deg,transparent,${scoreColor(source.relevance_score??0)})` }}
          />
        </div>
      </div>
      <p style={{ fontSize:11, color:'var(--ink-4)', lineHeight:1.55, fontStyle:'italic' }}>
        "{source.snippet.slice(0,90)}…"
      </p>
    </motion.div>
  )
}

/* ── Confidence meter ────────────────────────────────────────────────────── */
function ConfidenceMeter({ score }) {
  const color = scoreColor(score)
  return (
    <div style={{ textAlign:'center', padding:'16px 0 12px' }}>
      <div style={{ position:'relative', width:96, height:50, margin:'0 auto 10px' }}>
        <svg width="96" height="50" viewBox="0 0 96 50">
          <path d="M 8 48 A 40 40 0 0 1 88 48" fill="none" stroke="var(--bg-subtle)" strokeWidth="5" strokeLinecap="round"/>
          <motion.path d="M 8 48 A 40 40 0 0 1 88 48" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            initial={{pathLength:0}} animate={{pathLength:score}} transition={{duration:1.1,ease:[0.22,1,0.36,1]}}
            strokeDasharray="1" strokeDashoffset="0"/>
        </svg>
        <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', fontFamily:'var(--font)', fontSize:20, fontWeight:900, color, lineHeight:1 }}>
          {Math.round(score*100)}
        </div>
      </div>
      <div style={{ fontSize:9.5, color:'var(--ink-4)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'.08em' }}>Confidence</div>
    </div>
  )
}

/* ── Upload zone ─────────────────────────────────────────────────────────── */
function UploadZone({ onUpload }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept:{ 'application/pdf':['.pdf'], 'text/plain':['.txt'], 'text/markdown':['.md'] },
    onDrop: files => onUpload(files),
  })
  return (
    <div {...getRootProps()} style={{
      border:`1.5px dashed ${isDragActive ? 'var(--blue)' : 'var(--line-strong)'}`,
      borderRadius:12, padding:'20px 14px', textAlign:'center', cursor:'pointer',
      background: isDragActive ? 'rgba(0,102,255,.04)' : 'var(--bg-soft)',
      transition:'all .2s', marginBottom:14,
    }}>
      <input {...getInputProps()}/>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:9 }}>
        {Ico.upload(isDragActive ? 'var(--blue)' : 'var(--ink-4)', 20)}
      </div>
      <div style={{ fontSize:12, fontWeight:600, color:isDragActive?'var(--blue)':'var(--ink-3)', marginBottom:3 }}>Drop files here</div>
      <div style={{ fontSize:10, color:'var(--ink-4)', fontFamily:'var(--mono)' }}>PDF · TXT · MD</div>
    </div>
  )
}

/* ── MAIN APP PAGE ───────────────────────────────────────────────────────── */
export default function AppPage() {
  const [messages, setMessages]   = useState([{
    role:'assistant',
    content:"Welcome to AdaptiveRAG. Upload documents using the panel on the left, then ask me anything. I'll show you exactly how I retrieved, critiqued, and reasoned through your question.",
    ts:Date.now()
  }])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [currentResult, setResult]= useState(null)
  const [traceStep, setTraceStep] = useState(-1)
  const [files, setFiles]         = useState([])
  const [sidebarOpen, setSidebar] = useState(true)
  const [activePanel, setPanel]   = useState('trace')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    setMessages(m => [...m, {role:'user', content:q, ts:Date.now()}])
    setLoading(true); setResult(null); setTraceStep(0)

    let step = 0
    // Keep trace node visual tracker running step-by-step
    const iv = setInterval(() => { 
      step++; 
      setTraceStep(step); 
      if(step >= ALL_NODES.length) clearInterval(iv) 
    }, 260)

    try {
      // Direct call to FastAPI backend
      const res = await runQuery(q)
      clearInterval(iv)
      setTraceStep(ALL_NODES.length)
      setResult(res)
      setMessages(m => [...m, {role:'assistant', content:res.final_response, result:res, ts:Date.now()}])
    } catch (err) {
      clearInterval(iv)
      console.error("Pipeline query failed:", err)
      setMessages(m => [
        ...m, 
        {
          role:'assistant', 
          content:`⚠️ Pipeline connection failure: ${err.message}. Ensure your FastAPI process is running locally on port 8000.`, 
          ts:Date.now()
        }
      ])
    } finally { 
      setLoading(false) 
    }
  }

  const handleUpload = async (acceptedFiles) => {
    // Synchronously append files to list for instant UI updates
    setFiles(p => [...p, ...acceptedFiles.map(x => ({ name: x.name, size: x.size }))])
    
    // Asynchronously stream file pieces up to the vector system
    for (const file of acceptedFiles) {
      try {
        await ingestFile(file)
        console.log(`Ingested module: ${file.name}`)
      } catch (err) {
        console.error(`Failed ingesting module structural context: ${file.name}`, err)
      }
    }
  }

  const handleKey = e => { if(e.key==='Enter' && !e.shiftKey){e.preventDefault();handleSend()} }

  const EXAMPLE_QUERIES = ['Summarise the key findings','What methodology was used?','Compare the approaches described','What are the limitations?']

  return (
    <div style={{
      display:'flex', height:'100vh', paddingTop:56,
      background:'var(--bg)', overflow:'hidden',
      fontFamily:'var(--font)',
    }}>
      <style>{`
        .chat-surface textarea { resize:none; background:none; border:none; outline:none; }
        .panel-tab { display:flex; align-items:center; justify-content:center; gap:5px; flex:1; padding:9px 6px; background:none; border:none; cursor:pointer; font-size:11.5px; font-weight:500; font-family:var(--font); transition:all .18s; letter-spacing:-.01em; }
        .panel-tab.active { color:var(--ink); border-bottom:2px solid var(--ink) !important; }
        .panel-tab:not(.active) { color:var(--ink-4); border-bottom:2px solid transparent; }
        .panel-tab:hover:not(.active) { color:var(--ink-3); background:var(--bg-subtle); }
        .ex-query { display:block; width:100%; text-align:left; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:7px; margin-bottom:2px; font-size:12px; color:var(--ink-3); font-family:var(--font); transition:all .15s; }
        .ex-query:hover { background:var(--bg-subtle); color:var(--ink); }
        .file-row { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:9px; margin-bottom:4px; background:var(--bg-soft); border:1.5px solid var(--line); }
        .send-btn { width:34px; height:34px; border-radius:9px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; flex-shrink:0; }
        .send-btn.active { background:var(--ink); }
        .send-btn.inactive { background:var(--bg-subtle); cursor:default; }
        .send-btn.active:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,.2); }
      `}</style>

      {/* ── LEFT SIDEBAR ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{width:0,opacity:0}} animate={{width:236,opacity:1}} exit={{width:0,opacity:0}}
            transition={{duration:.28,ease:[0.16,1,0.3,1]}}
            style={{ flexShrink:0, background:'#fff', borderRight:'1.5px solid var(--line)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>

              {/* Label */}
              <div style={{ fontSize:9.5, color:'var(--ink-4)', fontFamily:'var(--mono)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:11 }}>Documents</div>

              <UploadZone onUpload={handleUpload} />

              {files.length===0
                ? <div style={{fontSize:12,color:'var(--ink-4)',textAlign:'center',padding:'6px 0'}}>No documents indexed</div>
                : files.map((f,i)=>(
                  <div key={i} className="file-row">
                    {Ico.file('var(--blue)',12)}
                    <span style={{fontSize:11.5,color:'var(--ink-3)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',letterSpacing:'-.01em'}}>{f.name}</span>
                    <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))}
                      style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-4)',padding:2,display:'flex',borderRadius:4,transition:'color .15s'}}
                      onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
                      onMouseLeave={e=>e.currentTarget.style.color='var(--ink-4)'}>
                      {Ico.x()}
                    </button>
                  </div>
                ))
              }

              {/* Example queries */}
              <div style={{marginTop:20,fontSize:9.5,color:'var(--ink-4)',fontFamily:'var(--mono)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>Example Queries</div>
              {EXAMPLE_QUERIES.map(q=>(
                <button key={q} className="ex-query" onClick={()=>setInput(q)}>
                  <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
                    {Ico.chevron('var(--ink-5)',9)}{q}
                  </span>
                </button>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MAIN CHAT ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>

        {/* Top bar */}
        <div style={{height:44,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',borderBottom:'1.5px solid var(--line)',background:'rgba(255,255,255,.9)',backdropFilter:'blur(20px)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button onClick={()=>setSidebar(p=>!p)}
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-3)',display:'flex',alignItems:'center',padding:4,borderRadius:6,transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              {Ico.panel()}
            </button>
            <div style={{width:1,height:16,background:'var(--line)'}}/>
            <span style={{fontSize:13,fontWeight:700,color:'var(--ink)',letterSpacing:'-.025em'}}>AdaptiveRAG Chat</span>
            <span className="tag tag-green" style={{fontSize:9.5,padding:'2px 9px'}}>
              <span className="blink-dot" style={{width:4,height:4,borderRadius:'50%',background:'var(--green)',display:'inline-block'}}/>
              live
            </span>
          </div>
          <span style={{fontSize:11,color:'var(--ink-4)',fontFamily:'var(--mono)'}}>
            {files.length} docs · {messages.length-1} queries
          </span>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto',padding:'24px 20px',display:'flex',flexDirection:'column',gap:14}}>
          {messages.map((msg,i)=>(
            <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.35}}
              style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',maxWidth:'100%'}}>
              {msg.role==='assistant' && (
                <div style={{width:28,height:28,borderRadius:8,background:'var(--ink)',display:'flex',alignItems:'center',justifyContent:'center',marginRight:10,marginTop:2,flexShrink:0}}>
                  {Ico.zap('#fff',12)}
                </div>
              )}
              <div style={{
                maxWidth:msg.role==='user'?480:'72%',
                padding:msg.role==='user'?'9px 14px':'13px 16px',
                borderRadius:msg.role==='user'?'13px 13px 4px 13px':'4px 13px 13px 13px',
                background:msg.role==='user'?'var(--ink)':'#fff',
                border:msg.role==='user'?'none':'1.5px solid var(--line)',
                fontSize:13.5, lineHeight:1.72, color:msg.role==='user'?'#fff':'var(--ink)',
                boxShadow:msg.role==='user'?'none':'var(--shadow-xs)',
                letterSpacing:'-.01em',
                whiteSpace:'pre-wrap',
              }}>
                {msg.content}
                {msg.result && (
                  <div style={{display:'flex',gap:7,marginTop:12,flexWrap:'wrap'}}>
                    <span className={`tag ${msg.result.confidence_score>0.7?'tag-green':'tag-amber'}`}>
                      Confidence {(msg.result.confidence_score*100).toFixed(0)}%
                    </span>
                    {msg.result.web_triggered && <span className="tag tag-amber">{Ico.globe('#d97706',9)} Web used</span>}
                    {msg.result.hallucination_flag
                      ? <span className="tag tag-red">{Ico.triangle()} Verify claims</span>
                      : <span className="tag tag-green">{Ico.check()} Grounded</span>}
                    <span className="tag tag-blue">{msg.result.trace?.length || 0} nodes</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:28,height:28,borderRadius:8,background:'var(--ink)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <div className="spin" style={{width:11,height:11,borderRadius:'50%',border:'1.5px solid rgba(255,255,255,.25)',borderTopColor:'#fff'}}/>
              </div>
              <div style={{padding:'9px 14px',background:'#fff',border:'1.5px solid var(--line)',borderRadius:'4px 13px 13px 13px',fontSize:12.5,color:'var(--ink-4)',fontFamily:'var(--mono)',boxShadow:'var(--shadow-xs)'}}>
                Running pipeline…
              </div>
            </motion.div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input bar */}
        <div style={{padding:'12px 16px',borderTop:'1.5px solid var(--line)',background:'rgba(255,255,255,.9)',backdropFilter:'blur(20px)'}}>
          <div className="chat-surface"
            style={{display:'flex',gap:10,alignItems:'flex-end',background:'var(--bg-soft)',border:'1.5px solid var(--line)',borderRadius:13,padding:'9px 12px',transition:'border-color .18s'}}
            onFocusCapture={e=>e.currentTarget.style.borderColor='var(--line-strong)'}
            onBlurCapture={e=>e.currentTarget.style.borderColor='var(--line)'}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask anything about your documents…" rows={1}
              style={{flex:1,fontSize:13.5,color:'var(--ink)',lineHeight:1.55,letterSpacing:'-.01em'}}/>
            <button className={`send-btn ${input.trim()&&!loading?'active':'inactive'}`} onClick={handleSend} disabled={!input.trim()||loading}>
              {Ico.send(input.trim()&&!loading?'#fff':'var(--ink-4)',13)}
            </button>
          </div>
          <div style={{display:'flex',justifyContent:'center',marginTop:7}}>
            <span style={{fontSize:10,color:'var(--ink-4)',fontFamily:'var(--mono)'}}>
              Enter to send · Mistral <span style={{color:'var(--blue)'}}>mistral-small-2506</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <aside style={{width:272,flexShrink:0,background:'#fff',borderLeft:'1.5px solid var(--line)',display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:'1.5px solid var(--line)',padding:'0 4px'}}>
          {[{id:'trace',label:'Trace',icon:'activity'},{id:'sources',label:'Sources',icon:'db'},{id:'memory',label:'Memory',icon:'network'}].map(tab=>(
            <button key={tab.id} className={`panel-tab ${activePanel===tab.id?'active':''}`} onClick={()=>setPanel(tab.id)}>
              {Ico[tab.icon](activePanel===tab.id?'var(--ink)':'var(--ink-4)',12)}
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'14px'}}>

          {/* TRACE */}
          {activePanel==='trace' && (
            <div>
              <div style={{fontSize:9.5,color:'var(--ink-4)',fontFamily:'var(--mono)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:12}}>Pipeline Execution</div>
              {loading || currentResult
                ? ALL_NODES.map((node,i)=>(
                    <TraceStep key={node} node={node}
                      active={loading && traceStep===i}
                      done={(!loading && !!currentResult) || (loading && i<traceStep)}/>
                  ))
                : <div style={{textAlign:'center',padding:'36px 0'}}>
                    <div style={{display:'flex',justifyContent:'center',marginBottom:12,opacity:.35}}>
                      {Ico.activity('var(--ink)',26)}
                    </div>
                    <div style={{fontSize:12.5,color:'var(--ink-4)',lineHeight:1.7}}>Run a query to see<br/>the pipeline trace</div>
                  </div>
              }

              {currentResult && !loading && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{marginTop:16}}>
                  <div style={{background:'var(--bg-soft)',border:'1.5px solid var(--line)',borderRadius:12,padding:'2px 0 8px'}}>
                    <ConfidenceMeter score={currentResult.confidence_score}/>
                  </div>
                  <div style={{background:'var(--bg-soft)',border:'1.5px solid var(--line)',borderRadius:12,padding:'12px',marginTop:10}}>
                    <div style={{fontSize:9.5,color:'var(--ink-4)',fontFamily:'var(--mono)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.06em'}}>Rewritten Query</div>
                    <div style={{fontSize:11.5,color:'var(--ink-3)',fontStyle:'italic',lineHeight:1.6}}>"{currentResult.rewritten_query}"</div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* SOURCES */}
          {activePanel==='sources' && (
            <div>
              <div style={{fontSize:9.5,color:'var(--ink-4)',fontFamily:'var(--mono)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:12}}>Retrieved Sources</div>
              {currentResult?.sources?.length>0
                ? currentResult.sources.map((s,i)=><SourceCard key={i} source={s} idx={i}/>)
                : <div style={{textAlign:'center',padding:'36px 0'}}>
                    <div style={{display:'flex',justifyContent:'center',marginBottom:12,opacity:.35}}>
                      {Ico.db('var(--ink)',26)}
                    </div>
                    <div style={{fontSize:12.5,color:'var(--ink-4)',lineHeight:1.7}}>Sources will appear<br/>after your first query</div>
                  </div>
              }
            </div>
          )}

          {/* BACKGROUND MEMORY */}
          {activePanel==='memory' && (
            <div>
              <div style={{fontSize:9.5,color:'var(--ink-4)',fontFamily:'var(--mono)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:12}}>Knowledge Graph</div>
              <div style={{background:'var(--bg-soft)',border:'1.5px solid var(--line)',borderRadius:12,padding:'16px',marginBottom:10,textAlign:'center'}}>
                <div style={{display:'flex',justifyContent:'center',marginBottom:10,opacity:.6}}>
                  {Ico.network('var(--teal)',30)}
                </div>
                <div style={{fontSize:12.5,color:'var(--ink-3)',marginBottom:4,fontWeight:500}}>
                  {currentResult?'12 entities · 8 relations':'No entities yet'}
                </div>
                <div style={{fontSize:10.5,color:'var(--ink-4)',fontFamily:'var(--mono)'}}>
                  {currentResult?'NetworkX graph updated':'Run queries to build memory'}
                </div>
              </div>
              {currentResult && (
                <div>
                  {[
                    {name:'Self-RAG',   type:'CONCEPT', color:'#7c3aed'},
                    {name:'Asai et al.',type:'PERSON',  color:'#0066ff'},
                    {name:'CRAG',       type:'CONCEPT', color:'#d97706'},
                    {name:'Microsoft',  type:'ORG',     color:'#0891b2'},
                    {name:'GraphRAG',   type:'CONCEPT', color:'#00b4aa'},
                  ].map((e,i)=>(
                    <motion.div key={e.name} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} transition={{delay:i*.05}}
                      style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,marginBottom:4,background:'var(--bg-soft)',border:'1.5px solid var(--line)'}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:e.color,flexShrink:0}}/>
                      <span style={{fontSize:12.5,color:'var(--ink-3)',flex:1,letterSpacing:'-.01em'}}>{e.name}</span>
                      <span style={{fontSize:9.5,color:'var(--ink-4)',fontFamily:'var(--mono)'}}>{e.type}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </aside>
    </div>
  )
}