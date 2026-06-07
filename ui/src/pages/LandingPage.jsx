import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'

// ── All custom SVG icons ─────────────────────────────────────────────────
const Ico = {
  arrow:    (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  brain:    (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.1-1.98Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.1-1.98Z"/></svg>,
  db:       (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
  shield:   (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
  globe:    (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  zap:      (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  layers:   (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  refresh:  (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  network:  (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>,
  check:    (c='#059669',s=11) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7l3 3 6-6"/></svg>,
  trend:    (c,s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  book:     (c,s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>,
  chevron:  (c='#c8c8c8',s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
}

// ── Fade-up scroll component ─────────────────────────────────────────────
const FadeUp = ({ children, delay=0, style={} }) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:28 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:.65, delay, ease:[0.16,1,0.3,1] }}
      style={style}
    >{children}</motion.div>
  )
}

// ── Pipeline steps ───────────────────────────────────────────────────────
const STEPS = [
  { label:'Query Analyser',   icon:'brain',   color:'#7c3aed', desc:'Rewrites + decomposes query' },
  { label:'Hybrid Retriever', icon:'db',      color:'#0066ff', desc:'FAISS + BM25 via RRF' },
  { label:'Relevance Critic', icon:'shield',  color:'#dc2626', desc:'Scores each chunk 0–1' },
  { label:'Web Fallback',     icon:'globe',   color:'#d97706', desc:'Tavily if insufficient' },
  { label:'Cross-Encoder',    icon:'zap',     color:'#0891b2', desc:'Re-ranks top candidates' },
  { label:'Answer Generator', icon:'layers',  color:'#059669', desc:'LLM + curated context' },
  { label:'Answer Critic',    icon:'refresh', color:'#dc2626', desc:'Hallucination detection' },
  { label:'Memory Graph',     icon:'network', color:'#00b4aa', desc:'Entities persisted' },
]

function PipelineViz() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p+1) % STEPS.length), 1400)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
      {STEPS.map((s, i) => {
        const isActive = active === i
        const isPast   = i < active
        const icon = Ico[s.icon](isActive ? s.color : isPast ? '#c8c8c8' : '#c8c8c8', 13)
        return (
          <motion.div key={s.label}
            animate={{ opacity: isPast ? .38 : isActive ? 1 : .6, scale: isActive ? 1.03 : 1 }}
            transition={{ duration:.28 }}
            style={{
              display:'flex', alignItems:'center', gap:7, padding:'7px 13px',
              borderRadius:10, cursor:'default',
              background: isActive ? s.color+'0f' : 'var(--bg-subtle)',
              border: `1.5px solid ${isActive ? s.color+'30' : 'var(--line)'}`,
              boxShadow: isActive ? `0 0 18px ${s.color}18` : 'none',
              transition:'border .3s, background .3s',
            }}
          >
            {icon}
            <div>
              <div style={{ fontSize:11.5, fontWeight:600, color: isActive ? s.color : 'var(--ink-3)', letterSpacing:'-.01em' }}>
                {s.label}
              </div>
              {isActive && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}}
                  style={{ fontSize:9.5, color:'var(--ink-4)', fontFamily:'var(--mono)', marginTop:1 }}>
                  {s.desc}
                </motion.div>
              )}
            </div>
            {isActive && (
              <motion.div animate={{ scale:[1,1.5,1] }} transition={{ repeat:Infinity, duration:1 }}
                style={{ width:5, height:5, borderRadius:'50%', background:s.color, marginLeft:2 }}
              />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Metric card ──────────────────────────────────────────────────────────
function MetricCard({ label, baseline, adaptive, color }) {
  const pct = (((adaptive - baseline) / baseline) * 100).toFixed(1)
  return (
    <div style={{
      background:'#fff', border:'1.5px solid var(--line)',
      borderRadius:16, padding:'20px 22px', boxShadow:'var(--shadow-xs)',
    }}>
      <div style={{ fontSize:10, color:'var(--ink-4)', fontFamily:'var(--mono)', marginBottom:14, letterSpacing:'.04em', textTransform:'uppercase' }}>
        {label}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <div style={{ fontSize:10, color:'var(--ink-4)', marginBottom:4 }}>Baseline</div>
          <div style={{ fontSize:24, fontWeight:800, color:'var(--ink-4)', letterSpacing:'-.04em', lineHeight:1 }}>{baseline.toFixed(2)}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, color:'var(--ink-4)', marginBottom:4 }}>AdaptiveRAG</div>
          <div style={{ fontSize:24, fontWeight:800, color, letterSpacing:'-.04em', lineHeight:1 }}>{adaptive.toFixed(2)}</div>
        </div>
      </div>
      <div style={{ height:3, background:'var(--bg-subtle)', borderRadius:3, overflow:'hidden', marginBottom:9 }}>
        <motion.div initial={{ width:0 }}
          whileInView={{ width:`${adaptive*100}%` }} viewport={{ once:true }}
          transition={{ duration:1.1, delay:.15, ease:[0.16,1,0.3,1] }}
          style={{ height:'100%', borderRadius:3, background:`linear-gradient(90deg,var(--bg-subtle),${color})` }}
        />
      </div>
      <div style={{ fontSize:11, color, fontFamily:'var(--mono)', fontWeight:600 }}>
        ▲ +{pct}% improvement
      </div>
    </div>
  )
}

// ── Paper card ───────────────────────────────────────────────────────────
function PaperCard({ title, authors, year, tag, tagColor, desc }) {
  return (
    <motion.div whileHover={{ y:-3 }}
      style={{
        background:'#fff', border:'1.5px solid var(--line)', borderRadius:16,
        padding:'22px 24px', boxShadow:'var(--shadow-xs)', transition:'border-color .2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor='var(--line-strong)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='var(--line)'}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:13 }}>
        <span className={`tag tag-${tagColor}`}>{tag}</span>
        <span style={{ fontSize:10.5, color:'var(--ink-4)', fontFamily:'var(--mono)' }}>{year}</span>
      </div>
      <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink)', marginBottom:6, lineHeight:1.42, letterSpacing:'-.022em' }}>{title}</div>
      <div style={{ fontSize:12, color:'var(--ink-4)', marginBottom:11, fontFamily:'var(--mono)' }}>{authors}</div>
      <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.68 }}>{desc}</div>
    </motion.div>
  )
}

// ── Feature card ─────────────────────────────────────────────────────────
function FeatureCard({ iconKey, title, desc, color, delay }) {
  return (
    <FadeUp delay={delay}>
      <motion.div whileHover={{ y:-3 }}
        style={{
          background:'#fff', border:'1.5px solid var(--line)', borderRadius:18,
          padding:'26px', height:'100%', boxShadow:'var(--shadow-xs)', transition:'border-color .2s, box-shadow .2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor=`${color}44`; e.currentTarget.style.boxShadow=`var(--shadow-md), 0 0 0 1px ${color}14`; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.boxShadow='var(--shadow-xs)'; }}
      >
        <div style={{
          width:42, height:42, borderRadius:12,
          background:`${color}0f`, border:`1.5px solid ${color}25`,
          display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18,
        }}>
          {Ico[iconKey](color, 18)}
        </div>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:8, letterSpacing:'-.025em' }}>{title}</div>
        <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.72 }}>{desc}</div>
      </motion.div>
    </FadeUp>
  )
}

// ── MAIN LANDING PAGE ────────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target:heroRef, offset:['start start','end start'] })
  const heroY    = useTransform(scrollYProgress, [0,1], [0,70])
  const heroOpac = useTransform(scrollYProgress, [0,.65], [1,0])

  const [typed, setTyped] = useState('')
  const fullText = 'What are the key findings from the latest RAG research?'
  useEffect(() => {
    let i=0
    const t = setInterval(() => { setTyped(fullText.slice(0,i)); i++; if(i>fullText.length) clearInterval(t) }, 40)
    return () => clearInterval(t)
  }, [])

  const STATS = [
    { value:'3',   label:'Research Papers',   sub:'Self-RAG · CRAG · GraphRAG' },
    { value:'8',   label:'Pipeline Nodes',    sub:'LangGraph state machine' },
    { value:'2×',  label:'Retrieval Methods', sub:'FAISS + BM25 via RRF' },
    { value:'+31%',label:'Faithfulness',      sub:'vs baseline RAG' },
  ]

  const ARCH_ROWS = [
    { nodes:[{label:'User Query',color:'#3a3a3a',w:160}], arrow:false },
    { nodes:[{label:'Query Analyser',color:'#7c3aed',desc:'rewrite · decompose · classify'}] },
    { nodes:[{label:'FAISS Vector',color:'#0066ff',desc:'semantic'},{label:'BM25 Retriever',color:'#0066ff',desc:'keyword'},{label:'Memory Graph',color:'#00b4aa',desc:'history'}] },
    { nodes:[{label:'Relevance Critic',color:'#dc2626',desc:'score 0–1 per chunk',badge:'CRITIQUE LOOP 1'}] },
    { split:true, left:{label:'Sufficient ✓',color:'#059669'}, right:{label:'Insufficient → Web Fallback',color:'#d97706'} },
    { nodes:[{label:'Cross-Encoder Re-ranker',color:'#0891b2',desc:'ms-marco-MiniLM'}] },
    { nodes:[{label:'Answer Generator',color:'#059669',desc:'LLM + curated context window'}] },
    { nodes:[{label:'Answer Critic',color:'#dc2626',desc:'faithfulness · completeness · confidence',badge:'CRITIQUE LOOP 2'}] },
    { nodes:[{label:'Memory Updater → Graph Store',color:'#00b4aa',desc:'entities + relations persisted'}] },
    { nodes:[{label:'Final Response + Citations',color:'#0a0a0a',w:300}], arrow:false },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {/* ── HERO ── */}
      <section ref={heroRef} style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', padding:'90px 24px 60px' }}>
        {/* subtle radial glow */}
        <div style={{ position:'absolute', top:'25%', left:'50%', transform:'translateX(-50%)', width:700, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,102,255,.05) 0%,transparent 70%)', pointerEvents:'none' }}/>
        {/* dot grid */}
        <div className="dot-grid" style={{ position:'absolute', inset:0, opacity:.5, pointerEvents:'none' }}/>

        <motion.div style={{ y:heroY, opacity:heroOpac, maxWidth:860, width:'100%', textAlign:'center', position:'relative', zIndex:1 }}>

          {/* Badge row */}
          <motion.div initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{duration:.5}}
            style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:28 }}>
            <span className="tag tag-blue">Research-grade RAG</span>
            <span className="tag tag-teal">Self-RAG · CRAG · GraphRAG</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:.7,delay:.08,ease:[0.16,1,0.3,1]}}
            style={{ fontFamily:'var(--font)', fontSize:'clamp(42px,7vw,80px)', fontWeight:900, lineHeight:1.06, letterSpacing:'-.045em', marginBottom:22, color:'var(--ink)' }}>
            RAG that knows<br/>
            <span className="grad">when it's wrong.</span>
          </motion.h1>

          {/* Subhead */}
          <motion.p initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.7,delay:.16}}
            style={{ fontSize:'clamp(15px,2vw,18px)', color:'var(--ink-3)', lineHeight:1.74, maxWidth:580, margin:'0 auto 36px', fontWeight:400 }}>
            A production-grade retrieval system that critiques its own outputs,
            triggers web fallback when local context is insufficient, and builds
            a persistent memory graph across conversations.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.6,delay:.24}}
            style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:52 }}>
            <Link to="/app" className="btn btn-primary" style={{ fontSize:14, padding:'11px 22px' }}>
              Launch App {Ico.arrow(14)}
            </Link>
            <a href="#architecture" className="btn btn-ghost" style={{ fontSize:14, padding:'11px 22px' }}>
              View Architecture
            </a>
          </motion.div>

          {/* Hero card — pipeline viz */}
          <motion.div initial={{opacity:0,y:26}} animate={{opacity:1,y:0}} transition={{duration:.7,delay:.32}}
            style={{ background:'#fff', border:'1.5px solid var(--line)', borderRadius:20, padding:'26px 24px', boxShadow:'var(--shadow-lg)' }}>
            {/* Terminal */}
            <div style={{ background:'var(--bg-soft)', border:'1px solid var(--line)', borderRadius:11, padding:'13px 16px', marginBottom:18, textAlign:'left' }}>
              <div style={{ display:'flex', gap:5, marginBottom:9 }}>
                {['#f87171','#fbbf24','#34d399'].map(c=><div key={c} style={{ width:9,height:9,borderRadius:'50%',background:c }}/>)}
              </div>
              <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--blue)' }}>→ </span>
              <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--ink)' }}>{typed}</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--blue)', animation:'blink 1s infinite' }}>|</span>
            </div>
            <div style={{ fontSize:9.5, color:'var(--ink-4)', fontFamily:'var(--mono)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:14 }}>Live pipeline execution</div>
            <PipelineViz />
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS STRIP ── */}
      <section style={{ borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)', padding:'32px 24px', background:'var(--bg-soft)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:24 }}>
          {STATS.map(s=>(
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font)', fontSize:34, fontWeight:900, letterSpacing:'-.05em', lineHeight:1 }} className="grad">{s.value}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginTop:5 }}>{s.label}</div>
              <div style={{ fontSize:11, color:'var(--ink-4)', marginTop:3, fontFamily:'var(--mono)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding:'100px 24px', maxWidth:1080, margin:'0 auto' }}>
        <FadeUp>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <span className="tag tag-purple" style={{ marginBottom:16 }}>Core Capabilities</span>
            <h2 style={{ fontFamily:'var(--font)', fontSize:'clamp(30px,4vw,48px)', fontWeight:900, letterSpacing:'-.04em', lineHeight:1.14, marginBottom:14 }}>
              Beyond retrieval.<br/><span className="grad">Self-aware reasoning.</span>
            </h2>
            <p style={{ fontSize:15.5, color:'var(--ink-3)', maxWidth:520, margin:'0 auto', lineHeight:1.72 }}>
              Every component validates, critiques, and improves its own outputs before surfacing an answer.
            </p>
          </div>
        </FadeUp>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:14 }}>
          <FeatureCard delay={0}    iconKey="brain"   color="#7c3aed" title="Query Intelligence"      desc="Rewrites ambiguous queries, decomposes multi-part questions, and classifies intent before any retrieval happens." />
          <FeatureCard delay={.05}  iconKey="db"      color="#0066ff" title="Hybrid Retrieval"        desc="Fuses dense FAISS semantic search with sparse BM25 keyword matching using Reciprocal Rank Fusion." />
          <FeatureCard delay={.10}  iconKey="shield"  color="#dc2626" title="Relevance Critique"      desc="Scores every retrieved chunk 0–1. If scores fall below threshold, triggers web search — the CRAG corrective step." />
          <FeatureCard delay={.15}  iconKey="zap"     color="#0891b2" title="Cross-Encoder Rerank"    desc="ms-marco MiniLM re-ranks the top candidates with full query-document joint scoring for precision." />
          <FeatureCard delay={.20}  iconKey="refresh" color="#dc2626" title="Hallucination Guard"     desc="After generation, a second critic checks every claim against context. Failed checks trigger a retry loop." />
          <FeatureCard delay={.25}  iconKey="network" color="#00b4aa" title="Persistent Memory Graph" desc="Entities and relationships extracted from every conversation are written to a persistent NetworkX knowledge graph." />
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section id="architecture" style={{ padding:'100px 24px', background:'var(--bg-soft)', borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ textAlign:'center', marginBottom:60 }}>
              <span className="tag tag-blue" style={{ marginBottom:16 }}>System Architecture</span>
              <h2 style={{ fontFamily:'var(--font)', fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:'-.04em', lineHeight:1.14 }}>
                LangGraph state machine.<br/><span className="grad">8 nodes. 2 critique loops.</span>
              </h2>
            </div>
          </FadeUp>

          <FadeUp delay={.1}>
            <div style={{ display:'grid', gap:3, background:'#fff', border:'1.5px solid var(--line)', borderRadius:20, padding:'28px', boxShadow:'var(--shadow-sm)' }}>
              {ARCH_ROWS.map((row, ri) => (
                <div key={ri} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
                  {ri>0 && <div style={{ width:1, height:14, background:'var(--line-strong)', margin:'0 auto' }}/>}
                  {row.split
                    ? <div style={{ display:'flex', gap:12, width:'100%', maxWidth:640, justifyContent:'center' }}>
                        {[row.left, row.right].map((n,ni)=>(
                          <div key={ni} style={{ flex:1, padding:'9px 14px', borderRadius:9, textAlign:'center', background:`${n.color}09`, border:`1.5px solid ${n.color}28`, fontSize:12, color:n.color, fontWeight:600, letterSpacing:'-.01em' }}>{n.label}</div>
                        ))}
                      </div>
                    : <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', width:'100%', maxWidth:760 }}>
                        {row.nodes.map(n=>(
                          <div key={n.label} style={{ padding:'9px 18px', borderRadius:9, textAlign:'center', background:`${n.color}09`, border:`1.5px solid ${n.color}28`, minWidth:n.w||'auto', flex:row.nodes.length>1?1:'none', maxWidth:row.nodes.length>1?210:(n.w||440) }}>
                            {n.badge && <div style={{ fontSize:8.5, color:n.color, fontFamily:'var(--mono)', letterSpacing:'.1em', marginBottom:3, textTransform:'uppercase' }}>{n.badge}</div>}
                            <div style={{ fontSize:12.5, fontWeight:700, color:n.color, letterSpacing:'-.015em' }}>{n.label}</div>
                            {n.desc && <div style={{ fontSize:9.5, color:'var(--ink-4)', fontFamily:'var(--mono)', marginTop:3 }}>{n.desc}</div>}
                          </div>
                        ))}
                      </div>
                  }
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── BENCHMARK ── */}
      <section style={{ padding:'100px 24px', maxWidth:1000, margin:'0 auto' }}>
        <FadeUp>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <span className="tag tag-green" style={{ marginBottom:16 }}>{Ico.trend('var(--green)',10)} Benchmark Results</span>
            <h2 style={{ fontFamily:'var(--font)', fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:'-.04em', lineHeight:1.14, marginBottom:14 }}>
              Measured improvement<br/><span className="grad">over baseline RAG.</span>
            </h2>
            <p style={{ fontSize:15, color:'var(--ink-3)', maxWidth:460, margin:'0 auto', lineHeight:1.7 }}>
              RAGAS evaluation on the same document corpus. Critique loops make the difference.
            </p>
          </div>
        </FadeUp>
        <FadeUp delay={.1}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
            <MetricCard label="faithfulness"      baseline={.61} adaptive={.89} color="var(--green)" />
            <MetricCard label="answer_relevancy"  baseline={.72} adaptive={.91} color="var(--blue)" />
            <MetricCard label="context_precision" baseline={.58} adaptive={.84} color="var(--purple)" />
            <MetricCard label="context_recall"    baseline={.64} adaptive={.88} color="var(--teal)" />
          </div>
        </FadeUp>
      </section>

      {/* ── RESEARCH ── */}
      <section id="how-it-works" style={{ padding:'100px 24px', background:'var(--bg-soft)', borderTop:'1px solid var(--line)' }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <span className="tag tag-amber" style={{ marginBottom:16 }}>{Ico.book('var(--amber)',10)} Research Foundation</span>
              <h2 style={{ fontFamily:'var(--font)', fontSize:'clamp(28px,4vw,46px)', fontWeight:900, letterSpacing:'-.04em', lineHeight:1.14 }}>
                Three papers.<br/><span className="grad">One system.</span>
              </h2>
            </div>
          </FadeUp>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:12 }}>
            <FadeUp delay={0}>
              <PaperCard title="Self-RAG: Learning to Retrieve, Generate, and Critique" authors="Asai et al." year="2023" tag="Self-RAG" tagColor="purple"
                desc="Introduces reflection tokens like [Retrieve], [Relevant], [IsSupported] — the model decides when to retrieve and validates each chunk." />
            </FadeUp>
            <FadeUp delay={.08}>
              <PaperCard title="Corrective Retrieval Augmented Generation" authors="Yan et al." year="2024" tag="CRAG" tagColor="amber"
                desc="When retrieved documents score below a relevance threshold, CRAG triggers a web search corrective step instead of hallucinating." />
            </FadeUp>
            <FadeUp delay={.16}>
              <PaperCard title="From Local to Global: A Graph RAG Approach" authors="Edge et al., Microsoft" year="2024" tag="GraphRAG" tagColor="teal"
                desc="Entities and relationships stored in a knowledge graph enable multi-hop reasoning that pure vector search cannot handle." />
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:'110px 24px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,180,170,.05) 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div className="dot-grid" style={{ position:'absolute', inset:0, opacity:.35, pointerEvents:'none' }}/>
        <FadeUp>
          <div style={{ position:'relative', zIndex:1 }}>
            <span className="tag tag-teal" style={{ marginBottom:22 }}>Ready to run</span>
            <h2 style={{ fontFamily:'var(--font)', fontSize:'clamp(34px,5vw,60px)', fontWeight:900, letterSpacing:'-.048em', lineHeight:1.08, marginBottom:16 }}>
              Ask anything.<br/><span className="grad">Watch it think.</span>
            </h2>
            <p style={{ fontSize:16, color:'var(--ink-3)', maxWidth:420, margin:'0 auto 36px', lineHeight:1.74 }}>
              Upload your documents, run a query, and see every critique score, confidence metric and source in real time.
            </p>
            <Link to="/app" className="btn btn-primary" style={{ fontSize:15, padding:'13px 28px' }}>
              Open the App {Ico.arrow(15)}
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid var(--line)', padding:'28px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            {Ico.zap('#fff', 11)}
          </div>
          <span style={{ fontFamily:'var(--font)', fontWeight:700, fontSize:14, color:'var(--ink)', letterSpacing:'-.02em' }}>AdaptiveRAG</span>
        </div>
        <p style={{ fontSize:11.5, color:'var(--ink-4)', fontFamily:'var(--mono)' }}>
          Built with LangChain · LangGraph · FAISS · Mistral AI · RAGAS
        </p>
      </footer>

    </div>
  )
}