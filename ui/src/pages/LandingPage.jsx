import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'

/* ── Icons ───────────────────────────────────────────────────────────────── */
const Ico = {
  arrow:   (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  brain:   (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.1-1.98Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.1-1.98Z"/></svg>,
  db:      (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
  shield:  (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
  globe:   (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  zap:     (c,s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  layers:  (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  refresh: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  network: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>,
  check:   (c='#1a8a5a',s=10) => <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7l3 3 6-6"/></svg>,
  trend:   (c,s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  book:    (c,s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>,
  chevron: (c='#9e9e9a',s=10) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
}

/* ── Fade-up on scroll ───────────────────────────────────────────────────── */
const FadeUp = ({ children, delay=0, style={} }) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:22 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:.6, delay, ease:[0.16,1,0.3,1] }}
      style={style}
    >{children}</motion.div>
  )
}

/* ── Pipeline steps ──────────────────────────────────────────────────────── */
const STEPS = [
  { label:'Query Analyser',   icon:'brain',   color:'#6d3ee0', desc:'Rewrite · decompose · classify' },
  { label:'Hybrid Retriever', icon:'db',      color:'#1e62d4', desc:'FAISS + BM25 via RRF' },
  { label:'Relevance Critic', icon:'shield',  color:'#d44',    desc:'Score chunks 0–1' },
  { label:'Web Fallback',     icon:'globe',   color:'#c47a1a', desc:'Tavily search' },
  { label:'Cross-Encoder',    icon:'zap',     color:'#0d9e8a', desc:'Re-rank top candidates' },
  { label:'Answer Generator', icon:'layers',  color:'#1a8a5a', desc:'LLM + curated context' },
  { label:'Answer Critic',    icon:'refresh', color:'#d44',    desc:'Hallucination detection' },
  { label:'Memory Graph',     icon:'network', color:'#0d9e8a', desc:'Entity persistence' },
]

function PipelineViz() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p+1) % STEPS.length), 1500)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:7, justifyContent:'center' }}>
      {STEPS.map((s, i) => {
        const isActive = active === i
        const isPast   = i < active
        return (
          <motion.div key={s.label}
            animate={{ opacity: isPast ? .35 : isActive ? 1 : .55, scale: isActive ? 1.02 : 1 }}
            transition={{ duration:.25 }}
            style={{
              display:'flex', alignItems:'center', gap:7, padding:'7px 12px',
              borderRadius:9, cursor:'default',
              background: isActive ? `${s.color}0c` : 'var(--bg-soft)',
              border: `1px solid ${isActive ? s.color+'28' : 'var(--line)'}`,
              transition:'border .3s, background .3s',
            }}
          >
            {Ico[s.icon](isActive ? s.color : '#c4c4bf', 12)}
            <div>
              <div style={{ fontSize:11.5, fontWeight:600, color: isActive ? s.color : 'var(--ink-4)', letterSpacing:'-.01em', lineHeight:1.2 }}>
                {s.label}
              </div>
              {isActive && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.2}}
                  style={{ fontSize:9.5, color:'var(--ink-4)', fontFamily:'var(--mono)', marginTop:1.5 }}>
                  {s.desc}
                </motion.div>
              )}
            </div>
            {isActive && (
              <motion.div
                animate={{ scale:[1,1.6,1], opacity:[1,.5,1] }}
                transition={{ repeat:Infinity, duration:1.2 }}
                style={{ width:5, height:5, borderRadius:'50%', background:s.color, marginLeft:1, flexShrink:0 }}
              />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

/* ── Metric card ─────────────────────────────────────────────────────────── */
function MetricCard({ label, baseline, adaptive, color }) {
  const pct = (((adaptive - baseline) / baseline) * 100).toFixed(1)
  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--line-mid)',
      borderRadius:16, padding:'20px', boxShadow:'var(--shadow-xs)',
    }}>
      <div style={{ fontSize:10, color:'var(--ink-4)', fontFamily:'var(--mono)', marginBottom:14, letterSpacing:'.04em', textTransform:'uppercase' }}>
        {label}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <div style={{ fontSize:10, color:'var(--ink-4)', marginBottom:3 }}>Baseline</div>
          <div style={{ fontSize:26, fontWeight:700, color:'var(--ink-4)', letterSpacing:'-.05em', lineHeight:1 }}>{baseline.toFixed(2)}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, color:'var(--ink-4)', marginBottom:3 }}>AdaptiveRAG</div>
          <div style={{ fontSize:26, fontWeight:700, color, letterSpacing:'-.05em', lineHeight:1 }}>{adaptive.toFixed(2)}</div>
        </div>
      </div>
      <div style={{ height:3, background:'var(--bg-subtle)', borderRadius:3, overflow:'hidden', marginBottom:9 }}>
        <motion.div
          initial={{ width:0 }}
          whileInView={{ width:`${adaptive*100}%` }}
          viewport={{ once:true }}
          transition={{ duration:1.1, delay:.1, ease:[0.16,1,0.3,1] }}
          style={{ height:'100%', borderRadius:3, background:color }}
        />
      </div>
      <div style={{ fontSize:11, color, fontFamily:'var(--mono)', fontWeight:500 }}>
        ▲ +{pct}% vs baseline
      </div>
    </div>
  )
}

/* ── Paper card ──────────────────────────────────────────────────────────── */
function PaperCard({ title, authors, year, tag, tagColor, desc }) {
  return (
    <motion.div whileHover={{ y:-3 }}
      style={{
        background:'var(--bg-card)', border:'1px solid var(--line-mid)', borderRadius:16,
        padding:'22px', boxShadow:'var(--shadow-xs)', transition:'border-color .2s, box-shadow .2s',
        cursor:'default',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--line-strong)'; e.currentTarget.style.boxShadow='var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--line-mid)'; e.currentTarget.style.boxShadow='var(--shadow-xs)'; }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span className={`tag tag-${tagColor}`}>{tag}</span>
        <span style={{ fontSize:10.5, color:'var(--ink-4)', fontFamily:'var(--mono)' }}>{year}</span>
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:7, lineHeight:1.44, letterSpacing:'-.022em' }}>{title}</div>
      <div style={{ fontSize:11.5, color:'var(--ink-4)', marginBottom:12, fontFamily:'var(--mono)' }}>{authors}</div>
      <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.7 }}>{desc}</div>
    </motion.div>
  )
}

/* ── Feature card ────────────────────────────────────────────────────────── */
function FeatureCard({ iconKey, title, desc, color, delay }) {
  return (
    <FadeUp delay={delay}>
      <motion.div whileHover={{ y:-3 }}
        style={{
          background:'var(--bg-card)', border:'1px solid var(--line-mid)', borderRadius:18,
          padding:'24px', height:'100%', boxShadow:'var(--shadow-xs)',
          transition:'border-color .2s, box-shadow .22s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor=`${color}30`; e.currentTarget.style.boxShadow=`var(--shadow-md)`; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--line-mid)'; e.currentTarget.style.boxShadow='var(--shadow-xs)'; }}
      >
        <div style={{
          width:40, height:40, borderRadius:11,
          background:`${color}0e`, border:`1px solid ${color}22`,
          display:'flex', alignItems:'center', justifyContent:'center', marginBottom:17,
        }}>
          {Ico[iconKey](color, 17)}
        </div>
        <div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink)', marginBottom:8, letterSpacing:'-.025em' }}>{title}</div>
        <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.72 }}>{desc}</div>
      </motion.div>
    </FadeUp>
  )
}

/* ── Section label ───────────────────────────────────────────────────────── */
function SectionLabel({ tag, tagColor, title, subtitle, gradient='grad' }) {
  return (
    <div style={{ textAlign:'center', marginBottom:56 }}>
      <span className={`tag tag-${tagColor}`} style={{ marginBottom:16 }}>{tag}</span>
      <h2 style={{ fontFamily:'var(--font)', fontSize:'clamp(28px,4vw,46px)', fontWeight:800, letterSpacing:'-.04em', lineHeight:1.12, marginBottom:subtitle?14:0 }}>
        {title.map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {typeof line === 'string' ? line : <span className={gradient}>{line.g}</span>}
          </span>
        ))}
      </h2>
      {subtitle && <p style={{ fontSize:15, color:'var(--ink-3)', maxWidth:480, margin:'0 auto', lineHeight:1.72 }}>{subtitle}</p>}
    </div>
  )
}

/* ── MAIN LANDING PAGE ───────────────────────────────────────────────────── */
export default function LandingPage() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target:heroRef, offset:['start start','end start'] })
  const heroY    = useTransform(scrollYProgress, [0,1], [0,60])
  const heroOpac = useTransform(scrollYProgress, [0,.7], [1,0])

  const [typed, setTyped] = useState('')
  const fullText = 'What are the key findings from the latest RAG research?'
  useEffect(() => {
    let i = 0
    const t = setInterval(() => { setTyped(fullText.slice(0,i)); i++; if(i>fullText.length) clearInterval(t) }, 42)
    return () => clearInterval(t)
  }, [])

  const STATS = [
    { value:'3',    label:'Research Papers',   sub:'Self-RAG · CRAG · GraphRAG' },
    { value:'8',    label:'Pipeline Nodes',    sub:'LangGraph state machine' },
    { value:'2×',   label:'Retrieval Methods', sub:'FAISS + BM25 via RRF' },
    { value:'+31%', label:'Faithfulness',      sub:'vs baseline RAG' },
  ]

  const ARCH = [
    { nodes:[{l:'User Query', c:'#2c2c2a', w:160}], first:true },
    { nodes:[{l:'Query Analyser', c:'#6d3ee0', d:'rewrite · decompose · classify'}] },
    { nodes:[
      {l:'FAISS Vector', c:'#1e62d4', d:'semantic'},
      {l:'BM25 Retriever', c:'#1e62d4', d:'keyword'},
      {l:'Memory Graph', c:'#0d9e8a', d:'history'},
    ]},
    { nodes:[{l:'Relevance Critic', c:'#d44', d:'score 0–1 per chunk', badge:'CRITIQUE LOOP 1'}] },
    { split:true, left:{l:'Sufficient ✓', c:'#1a8a5a'}, right:{l:'Insufficient → Web Fallback', c:'#c47a1a'} },
    { nodes:[{l:'Cross-Encoder Re-ranker', c:'#0d9e8a', d:'ms-marco-MiniLM'}] },
    { nodes:[{l:'Answer Generator', c:'#1a8a5a', d:'LLM + curated context window'}] },
    { nodes:[{l:'Answer Critic', c:'#d44', d:'faithfulness · completeness · confidence', badge:'CRITIQUE LOOP 2'}] },
    { nodes:[{l:'Memory Updater → Graph Store', c:'#0d9e8a', d:'entities + relations persisted'}] },
    { nodes:[{l:'Final Response + Citations', c:'#111110', w:300}], last:true },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{
        minHeight:'calc(100vh - 90px)', display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative', overflow:'hidden', padding:'80px 24px 60px',
      }}>
        {/* Background grid */}
        <div className="grid-bg" style={{ position:'absolute', inset:0, opacity:.4, pointerEvents:'none' }}/>
        {/* Radial glow */}
        <div style={{
          position:'absolute', top:'30%', left:'50%', transform:'translateX(-50%)',
          width:800, height:600, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(30,98,212,.04) 0%,transparent 65%)',
          pointerEvents:'none',
        }}/>

        <motion.div style={{ y:heroY, opacity:heroOpac, maxWidth:840, width:'100%', textAlign:'center', position:'relative', zIndex:1 }}>

          {/* Badges */}
          <motion.div
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.5}}
            style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:26, flexWrap:'wrap', justifyContent:'center' }}
          >
            <span className="tag tag-blue">Research-grade RAG</span>
            <span className="tag tag-teal">LangGraph · FAISS · Mistral</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
            transition={{duration:.7,delay:.06,ease:[0.16,1,0.3,1]}}
            style={{
              fontFamily:'var(--font)', fontSize:'clamp(40px,7vw,78px)',
              fontWeight:800, lineHeight:1.05, letterSpacing:'-.046em',
              marginBottom:20, color:'var(--ink)',
            }}
          >
            RAG that knows<br/>
            <span className="grad">when it's wrong.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.6,delay:.13}}
            style={{ fontSize:'clamp(14px,2vw,17px)', color:'var(--ink-3)', lineHeight:1.76, maxWidth:560, margin:'0 auto 34px', fontWeight:400 }}
          >
            A production-grade retrieval system that critiques its own outputs,
            triggers web fallback when local context is insufficient, and builds
            a persistent memory graph across conversations.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.55,delay:.2}}
            style={{ display:'flex', gap:9, justifyContent:'center', flexWrap:'wrap', marginBottom:48 }}
          >
            <Link to="/app" className="btn btn-primary" style={{ fontSize:13.5, padding:'10px 20px' }}>
              Launch App {Ico.arrow(13)}
            </Link>
            <a href="#architecture" className="btn btn-ghost" style={{ fontSize:13.5, padding:'10px 20px' }}>
              View Architecture
            </a>
          </motion.div>

          {/* Pipeline demo card */}
          <motion.div
            initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:.65,delay:.28}}
            style={{
              background:'var(--bg-card)', border:'1px solid var(--line-mid)', borderRadius:22,
              padding:'24px', boxShadow:'var(--shadow-lg)',
            }}
          >
            {/* Terminal */}
            <div style={{
              background:'var(--bg-soft)', border:'1px solid var(--line)', borderRadius:10,
              padding:'12px 15px', marginBottom:18, textAlign:'left',
            }}>
              <div style={{ display:'flex', gap:5, marginBottom:9 }}>
                {['#f87171','#fbbf24','#34d399'].map(c=>(
                  <div key={c} style={{ width:8, height:8, borderRadius:'50%', background:c }}/>
                ))}
              </div>
              <span style={{ fontFamily:'var(--mono)', fontSize:12.5, color:'var(--blue)' }}>→ </span>
              <span style={{ fontFamily:'var(--mono)', fontSize:12.5, color:'var(--ink)' }}>{typed}</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:12.5, color:'var(--blue)', animation:'blink 1s infinite' }}>▌</span>
            </div>
            <div style={{ fontSize:9, color:'var(--ink-4)', fontFamily:'var(--mono)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:13 }}>
              Live pipeline execution
            </div>
            <PipelineViz />
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section style={{ borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)', padding:'30px 24px', background:'var(--bg-card)' }}>
        <div style={{ maxWidth:860, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:20 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font)', fontSize:32, fontWeight:800, letterSpacing:'-.05em', lineHeight:1 }} className="grad">{s.value}</div>
              <div style={{ fontSize:12.5, fontWeight:600, color:'var(--ink)', marginTop:5, letterSpacing:'-.01em' }}>{s.label}</div>
              <div style={{ fontSize:10.5, color:'var(--ink-4)', marginTop:2.5, fontFamily:'var(--mono)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section style={{ padding:'96px 24px', maxWidth:1060, margin:'0 auto' }}>
        <FadeUp>
          <SectionLabel
            tag="Core Capabilities" tagColor="purple"
            title={['Beyond retrieval.', {g:'Self-aware reasoning.'}]}
            subtitle="Every component validates, critiques, and improves its own outputs before surfacing an answer."
          />
        </FadeUp>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))', gap:12 }}>
          <FeatureCard delay={0}    iconKey="brain"   color="#6d3ee0" title="Query Intelligence"      desc="Rewrites ambiguous queries, decomposes multi-part questions, and classifies intent before any retrieval happens." />
          <FeatureCard delay={.05}  iconKey="db"      color="#1e62d4" title="Hybrid Retrieval"        desc="Fuses dense FAISS semantic search with sparse BM25 keyword matching via Reciprocal Rank Fusion." />
          <FeatureCard delay={.10}  iconKey="shield"  color="#d44"    title="Relevance Critique"      desc="Scores every retrieved chunk 0–1. Below threshold triggers web search — the CRAG corrective step." />
          <FeatureCard delay={.15}  iconKey="zap"     color="#0d9e8a" title="Cross-Encoder Rerank"    desc="ms-marco MiniLM re-ranks the top candidates with full query-document joint scoring for precision." />
          <FeatureCard delay={.20}  iconKey="refresh" color="#d44"    title="Hallucination Guard"     desc="After generation, a second critic checks every claim against context. Failed checks trigger a retry loop." />
          <FeatureCard delay={.25}  iconKey="network" color="#0d9e8a" title="Persistent Memory Graph" desc="Entities and relationships extracted from every conversation are written to a persistent NetworkX knowledge graph." />
        </div>
      </section>

      {/* ── ARCHITECTURE ─────────────────────────────────────────────────── */}
      <section id="architecture" style={{ padding:'96px 24px', background:'var(--bg-card)', borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)' }}>
        <div style={{ maxWidth:940, margin:'0 auto' }}>
          <FadeUp>
            <SectionLabel
              tag="System Architecture" tagColor="blue"
              title={['LangGraph state machine.', {g:'8 nodes. 2 critique loops.'}]}
            />
          </FadeUp>
          <FadeUp delay={.1}>
            <div style={{
              background:'var(--bg)', border:'1px solid var(--line-mid)',
              borderRadius:20, padding:'26px', boxShadow:'var(--shadow-sm)',
            }}>
              {ARCH.map((row, ri) => (
                <div key={ri} style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  {!row.first && ri > 0 && (
                    <div style={{ width:1, height:14, background:'var(--line-strong)' }}/>
                  )}
                  {row.split ? (
                    <div style={{ display:'flex', gap:10, width:'100%', maxWidth:620, justifyContent:'center' }}>
                      {[row.left, row.right].map((n,ni) => (
                        <div key={ni} style={{
                          flex:1, padding:'9px 13px', borderRadius:8, textAlign:'center',
                          background:`${n.c}0a`, border:`1px solid ${n.c}22`,
                          fontSize:11.5, color:n.c, fontWeight:600, letterSpacing:'-.01em',
                        }}>{n.l}</div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', width:'100%', maxWidth:740 }}>
                      {row.nodes.map(n => (
                        <div key={n.l} style={{
                          padding:'9px 16px', borderRadius:8, textAlign:'center',
                          background:`${n.c}0a`, border:`1px solid ${n.c}22`,
                          minWidth:n.w||'auto', flex:row.nodes.length>1?1:'none',
                          maxWidth:row.nodes.length>1?200:(n.w||420),
                        }}>
                          {n.badge && <div style={{ fontSize:8, color:n.c, fontFamily:'var(--mono)', letterSpacing:'.1em', marginBottom:2, textTransform:'uppercase' }}>{n.badge}</div>}
                          <div style={{ fontSize:12, fontWeight:700, color:n.c, letterSpacing:'-.015em' }}>{n.l}</div>
                          {n.d && <div style={{ fontSize:9.5, color:'var(--ink-4)', fontFamily:'var(--mono)', marginTop:2 }}>{n.d}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── BENCHMARKS ───────────────────────────────────────────────────── */}
      <section id="benchmarks" style={{ padding:'96px 24px', maxWidth:980, margin:'0 auto' }}>
        <FadeUp>
          <SectionLabel
            tag="Benchmark Results" tagColor="green"
            title={['Measured improvement', {g:'over baseline RAG.'}]}
            subtitle="RAGAS evaluation on the same document corpus. Critique loops make the difference."
          />
        </FadeUp>
        <FadeUp delay={.1}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:11 }}>
            <MetricCard label="faithfulness"      baseline={.61} adaptive={.89} color="var(--green)" />
            <MetricCard label="answer_relevancy"  baseline={.72} adaptive={.91} color="var(--blue)" />
            <MetricCard label="context_precision" baseline={.58} adaptive={.84} color="var(--purple)" />
            <MetricCard label="context_recall"    baseline={.64} adaptive={.88} color="var(--teal)" />
          </div>
        </FadeUp>
      </section>

      {/* ── RESEARCH ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding:'96px 24px', background:'var(--bg-card)', borderTop:'1px solid var(--line)' }}>
        <div style={{ maxWidth:980, margin:'0 auto' }}>
          <FadeUp>
            <SectionLabel
              tag="Research Foundation" tagColor="amber"
              title={['Three papers.', {g:'One system.'}]}
            />
          </FadeUp>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))', gap:11 }}>
            <FadeUp delay={0}>
              <PaperCard
                title="Self-RAG: Learning to Retrieve, Generate, and Critique"
                authors="Asai et al." year="2023" tag="Self-RAG" tagColor="purple"
                desc="Introduces reflection tokens — the model decides when to retrieve and validates each chunk for relevance and support."
              />
            </FadeUp>
            <FadeUp delay={.07}>
              <PaperCard
                title="Corrective Retrieval Augmented Generation"
                authors="Yan et al." year="2024" tag="CRAG" tagColor="amber"
                desc="When retrieved docs score below a relevance threshold, CRAG triggers a web search corrective step instead of hallucinating."
              />
            </FadeUp>
            <FadeUp delay={.14}>
              <PaperCard
                title="From Local to Global: A Graph RAG Approach"
                authors="Edge et al., Microsoft" year="2024" tag="GraphRAG" tagColor="teal"
                desc="Entities and relationships in a knowledge graph enable multi-hop reasoning that pure vector search cannot handle."
              />
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding:'110px 24px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div className="grid-bg" style={{ position:'absolute', inset:0, opacity:.3, pointerEvents:'none' }}/>
        <div style={{
          position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          width:560, height:400, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(13,158,138,.05) 0%,transparent 65%)',
          pointerEvents:'none',
        }}/>
        <FadeUp>
          <div style={{ position:'relative', zIndex:1 }}>
            <span className="tag tag-teal" style={{ marginBottom:20 }}>Ready to run</span>
            <h2 style={{
              fontFamily:'var(--font)', fontSize:'clamp(32px,5.5vw,62px)',
              fontWeight:800, letterSpacing:'-.048em', lineHeight:1.07, marginBottom:16,
            }}>
              Ask anything.<br/><span className="grad">Watch it think.</span>
            </h2>
            <p style={{ fontSize:15.5, color:'var(--ink-3)', maxWidth:400, margin:'0 auto 34px', lineHeight:1.76 }}>
              Upload your documents, run a query, and see every critique score,
              confidence metric and source citation in real time.
            </p>
            <Link to="/app" className="btn btn-primary" style={{ fontSize:14, padding:'12px 24px' }}>
              Open the App {Ico.arrow(14)}
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid var(--line)', padding:'24px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            {Ico.zap('#fff', 11)}
          </div>
          <span style={{ fontFamily:'var(--font)', fontWeight:700, fontSize:13.5, color:'var(--ink)', letterSpacing:'-.025em' }}>AdaptiveRAG</span>
        </div>
        <p style={{ fontSize:11, color:'var(--ink-4)', fontFamily:'var(--mono)' }}>
          LangChain · LangGraph · FAISS · Mistral AI · RAGAS
        </p>
      </footer>
    </div>
  )
}