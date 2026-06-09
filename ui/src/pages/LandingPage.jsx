import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView, animate } from 'framer-motion'

/* ── Icons ─────────────────────────────────────────────────────────────── */
const Ico = {
  arrow:   (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
  arrowUp: (s = 13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M7 7h10v10" /></svg>,
  brain:   (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.1-1.98Z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.1-1.98Z" /></svg>,
  db:      (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" /></svg>,
  shield:  (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>,
  globe:   (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  zap:     (c, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  layers:  (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  refresh: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>,
  network: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" /></svg>,
}

/* ── Pipeline steps ────────────────────────────────────────────────────── */
const STEPS = [
  { label: 'Query Analyser',   icon: 'brain',   color: '#7c5cfc', desc: 'Rewrite · decompose · classify' },
  { label: 'Hybrid Retriever', icon: 'db',      color: '#2563eb', desc: 'FAISS + BM25 via RRF' },
  { label: 'Relevance Critic', icon: 'shield',  color: '#ef4444', desc: 'Score chunks 0–1' },
  { label: 'Web Fallback',     icon: 'globe',   color: '#f59e0b', desc: 'Tavily real-time search' },
  { label: 'Cross-Encoder',    icon: 'zap',     color: '#10b981', desc: 'Re-rank top candidates' },
  { label: 'Answer Generator', icon: 'layers',  color: '#059669', desc: 'LLM + curated context' },
  { label: 'Answer Critic',    icon: 'refresh', color: '#ef4444', desc: 'Hallucination detection' },
  { label: 'Memory Graph',     icon: 'network', color: '#10b981', desc: 'Persist entities + edges' },
]

/* ── CountUp ───────────────────────────────────────────────────────────── */
function CountUp({ to, suffix = '', duration = 1.4 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const isFloat = String(to).includes('.')
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) { setVal(isFloat ? parseFloat(v.toFixed(2)) : Math.round(v)) },
    })
    return controls.stop
  }, [inView, to, duration])
  return <span ref={ref}>{val}{suffix}</span>
}

/* ── FadeUp ────────────────────────────────────────────────────────────── */
const FadeUp = ({ children, delay = 0, style = {} }) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      style={style}
    >{children}</motion.div>
  )
}

/* ── Marquee ───────────────────────────────────────────────────────────── */
function Marquee({ items, speed = 28, reverse = false }) {
  const content = [...items, ...items, ...items]
  return (
    <div style={{ overflow: 'hidden', display: 'flex', userSelect: 'none' }}>
      <motion.div
        animate={{ x: reverse ? ['-33.33%', '0%'] : ['0%', '-33.33%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
        style={{ display: 'flex', gap: 0, willChange: 'transform' }}
      >
        {content.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '0 32px', flexShrink: 0,
            borderRight: '1px solid rgba(0,0,0,0.07)',
          }}>
            <span style={{
              fontSize: 11.5, fontWeight: 600, color: '#6b6b6b',
              letterSpacing: '0.04em', whiteSpace: 'nowrap',
              textTransform: 'uppercase', fontFamily: 'monospace',
            }}>
              {item.label}
            </span>
            {item.val && (
              <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#10b981', fontWeight: 600 }}>{item.val}</span>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

/* ── Pipeline Viz ──────────────────────────────────────────────────────── */
function PipelineViz() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % STEPS.length), 1700)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {STEPS.map((s, i) => {
        const isActive = active === i
        const isPast = i < active
        return (
          <motion.div key={s.label}
            animate={{ opacity: isPast ? 0.28 : isActive ? 1 : 0.5, scale: isActive ? 1.02 : 1 }}
            transition={{ duration: 0.22 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 11px', borderRadius: 8, cursor: 'default',
              background: isActive ? `${s.color}12` : 'rgba(0,0,0,0.02)',
              border: `1px solid ${isActive ? s.color + '35' : 'rgba(0,0,0,0.07)'}`,
            }}
          >
            {Ico[s.icon](isActive ? s.color : '#aaa', 11)}
            <div>
              <div style={{
                fontSize: 10.5, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em',
                color: isActive ? s.color : '#999',
              }}>
                {s.label}
              </div>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
                  style={{ fontSize: 9, color: '#aaa', fontFamily: 'monospace', marginTop: 2 }}
                >
                  {s.desc}
                </motion.div>
              )}
            </div>
            {isActive && (
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.1 }}
                style={{ width: 4, height: 4, borderRadius: '50%', background: s.color, marginLeft: 2, flexShrink: 0 }}
              />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

/* ── MetricCard ────────────────────────────────────────────────────────── */
function MetricCard({ label, baseline, adaptive, color, delay }) {
  const pct = (((adaptive - baseline) / baseline) * 100).toFixed(1)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  return (
    <FadeUp delay={delay}>
      <motion.div ref={ref}
        whileHover={{ y: -3 }}
        style={{
          background: '#fff', border: '1px solid #e8e8e4',
          borderRadius: 16, padding: '22px',
          transition: 'border-color .2s, box-shadow .2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = color + '50'
          e.currentTarget.style.boxShadow = `0 8px 32px ${color}14`
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#e8e8e4'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div style={{
          fontSize: 9.5, color: '#aaa', fontFamily: 'monospace',
          marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>{label}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 9, color: '#ccc', marginBottom: 4, letterSpacing: '0.04em' }}>BASELINE</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#ccc', letterSpacing: '-0.06em', lineHeight: 1 }}>
              {inView ? <CountUp to={baseline} duration={1} /> : '0'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#bbb', marginBottom: 4, letterSpacing: '0.04em' }}>ADAPTIVE</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.06em', lineHeight: 1 }}>
              {inView ? <CountUp to={adaptive} duration={1.4} /> : '0'}
            </div>
          </div>
        </div>
        <div style={{ height: 2, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={inView ? { width: `${adaptive * 100}%` } : {}}
            transition={{ duration: 1.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%', borderRadius: 2, background: color }}
          />
        </div>
        <div style={{ fontSize: 11, color, fontFamily: 'monospace', fontWeight: 700 }}>+{pct}%</div>
      </motion.div>
    </FadeUp>
  )
}

/* ── FeatureCard ───────────────────────────────────────────────────────── */
function FeatureCard({ iconKey, title, desc, color, delay, number }) {
  const [hov, setHov] = useState(false)
  return (
    <FadeUp delay={delay}>
      <motion.div
        whileHover={{ y: -4 }}
        onHoverStart={() => setHov(true)}
        onHoverEnd={() => setHov(false)}
        style={{
          background: hov ? `${color}06` : '#fff',
          border: `1px solid ${hov ? color + '22' : '#e8e8e4'}`,
          borderRadius: 18, padding: '26px 24px', height: '100%',
          boxShadow: hov ? `0 12px 40px ${color}14` : 'none',
          transition: 'all .25s cubic-bezier(0.16,1,0.3,1)',
          cursor: 'default', position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: 14, right: 18, fontSize: 56, fontWeight: 900,
          color: `${color}08`, lineHeight: 1, letterSpacing: '-0.05em', pointerEvents: 'none',
        }}>{String(number).padStart(2, '0')}</div>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}0d`, border: `1px solid ${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          transform: hov ? 'scale(1.08) rotate(-3deg)' : 'none',
          transition: 'transform .25s',
        }}>
          {Ico[iconKey](color, 17)}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 8, letterSpacing: '-0.025em' }}>{title}</div>
        <div style={{ fontSize: 13, color: '#888', lineHeight: 1.72 }}>{desc}</div>
      </motion.div>
    </FadeUp>
  )
}

/* ── PaperCard ─────────────────────────────────────────────────────────── */
function PaperCard({ title, authors, year, tag, tagColor, desc, delay }) {
  const tagColors = {
    purple: { bg: '#f3f0ff', text: '#6d28d9' },
    amber:  { bg: '#fffbeb', text: '#b45309' },
    teal:   { bg: '#f0fdf9', text: '#0f766e' },
  }
  const c = tagColors[tagColor] || tagColors.purple
  return (
    <FadeUp delay={delay}>
      <motion.div whileHover={{ y: -4 }}
        style={{
          background: '#fff', border: '1px solid #e8e8e4',
          borderRadius: 18, padding: '24px', height: '100%',
          transition: 'border-color .2s, box-shadow .2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#c8c8c4'
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.06)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#e8e8e4'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
            padding: '4px 9px', borderRadius: 6, background: c.bg, color: c.text,
          }}>{tag}</span>
          <span style={{ fontSize: 10, color: '#bbb', fontFamily: 'monospace' }}>{year}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 7, lineHeight: 1.44, letterSpacing: '-0.022em' }}>{title}</div>
        <div style={{ fontSize: 11, color: '#bbb', marginBottom: 12, fontFamily: 'monospace' }}>{authors}</div>
        <div style={{ fontSize: 13, color: '#777', lineHeight: 1.72 }}>{desc}</div>
      </motion.div>
    </FadeUp>
  )
}

/* ── Data ──────────────────────────────────────────────────────────────── */
const MQ_TOP = [
  { label: 'Self-Critiquing RAG' }, { label: 'FAISS Vector Search' }, { label: 'BM25 Keyword Match' },
  { label: 'Reciprocal Rank Fusion' }, { label: 'ms-marco Cross-Encoder' }, { label: 'Tavily Web Fallback' },
  { label: 'LangGraph State Machine' }, { label: 'NetworkX Memory Graph' }, { label: 'RAGAS Evaluation' },
]
const MQ_BOT = [
  { label: 'Self-RAG', val: 'Asai 2023' }, { label: 'CRAG', val: 'Yan 2024' },
  { label: 'GraphRAG', val: 'Edge 2024' }, { label: 'Faithfulness', val: '+46%' },
  { label: 'Relevancy', val: '+26%' }, { label: 'Precision', val: '+45%' },
  { label: 'Recall', val: '+38%' }, { label: '8 Pipeline Nodes' }, { label: '2 Critique Loops' },
]

const ARCH = [
  { nodes: [{ l: 'User Query', c: '#111', w: 160 }], first: true },
  { nodes: [{ l: 'Query Analyser', c: '#7c5cfc', d: 'rewrite · decompose · classify' }] },
  { nodes: [
    { l: 'FAISS Vector', c: '#2563eb', d: 'semantic' },
    { l: 'BM25 Retriever', c: '#2563eb', d: 'keyword' },
    { l: 'Memory Graph', c: '#10b981', d: 'history' },
  ]},
  { nodes: [{ l: 'Relevance Critic', c: '#ef4444', d: 'score 0–1 per chunk', badge: 'CRITIQUE LOOP 1' }] },
  { split: true, left: { l: 'Sufficient ✓', c: '#059669' }, right: { l: 'Insufficient → Web Fallback', c: '#f59e0b' } },
  { nodes: [{ l: 'Cross-Encoder Re-ranker', c: '#10b981', d: 'ms-marco-MiniLM' }] },
  { nodes: [{ l: 'Answer Generator', c: '#059669', d: 'LLM + curated context window' }] },
  { nodes: [{ l: 'Answer Critic', c: '#ef4444', d: 'faithfulness · completeness · confidence', badge: 'CRITIQUE LOOP 2' }] },
  { nodes: [{ l: 'Memory Updater → Graph Store', c: '#10b981', d: 'entities + relations persisted' }] },
  { nodes: [{ l: 'Final Response + Citations', c: '#111', w: 300 }], last: true },
]

/* ══════════════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroOpac = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const [typed, setTyped] = useState('')
  const fullText = 'What are the key findings from the latest RAG research?'
  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      setTyped(fullText.slice(0, i))
      i++
      if (i > fullText.length) clearInterval(t)
    }, 44)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f7', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.2);opacity:0} }
        * { box-sizing: border-box; }
        ::selection { background: rgba(37,99,235,0.15); }
        @media (max-width:900px) {
          .hero-split { flex-direction: column !important; }
          .hero-right { margin-top: 48px !important; }
          .hero-h1 { font-size: 52px !important; }
          .stat-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width:580px) {
          .hero-h1 { font-size: 40px !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section ref={heroRef} style={{
        minHeight: '100vh', position: 'relative',
        overflow: 'hidden', padding: '0 48px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.025) 1px,transparent 1px)',
          backgroundSize: '72px 72px',
        }} />
        {/* Glow — top left */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600,
          background: 'radial-gradient(circle,rgba(124,92,252,0.07) 0%,transparent 65%)',
          pointerEvents: 'none',
        }} />
        {/* Glow — bottom right */}
        <div style={{
          position: 'absolute', bottom: '5%', right: '-8%', width: 500, height: 500,
          background: 'radial-gradient(circle,rgba(16,185,129,0.06) 0%,transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* ── NAV ── */}
        
        {/* ── SPLIT HERO CONTENT ──
            NOTE: opacity is passed via style prop — only ONE style prop on this element */}
        <motion.div
          className="hero-split"
          style={{
            opacity: heroOpac,
            display: 'flex',
            alignItems: 'center',
            gap: 80,
            flex: 1,
            paddingBottom: 80,
            paddingTop: 32,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* ── LEFT: headline + CTAs ── */}
          <div style={{ flex: '0 0 auto', maxWidth: 520, width: '100%' }}>

            {/* Version badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ marginBottom: 28 }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontSize: 11.5, fontWeight: 600, color: '#555',
                padding: '6px 12px', borderRadius: 100,
                border: '1px solid #e0e0e0', background: '#fff',
                letterSpacing: '0.01em',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                v2.0 — GraphRAG + Multi-hop Reasoning
              </span>
            </motion.div>

            {/* Headline — left aligned */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ overflow: 'hidden' }}>
                <motion.h1
                  initial={{ y: '100%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="hero-h1"
                  style={{
                    fontSize: 76, fontWeight: 900, lineHeight: 0.95,
                    letterSpacing: '-0.055em', color: '#0f0f0e',
                    margin: 0,
                  }}
                >
                  RAG
                </motion.h1>
              </div>
              <div style={{ overflow: 'hidden', paddingBottom: 4 }}>
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.9, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="hero-h1"
                  style={{
                    fontSize: 76, fontWeight: 900, lineHeight: 0.95,
                    letterSpacing: '-0.055em', margin: 0,
                    display: 'flex', alignItems: 'baseline', gap: '0.2em',
                  }}
                >
                  <span style={{ color: '#0f0f0e' }}>that</span>
                  <span style={{
                    background: 'linear-gradient(135deg,#2563eb 0%,#10b981 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>knows</span>
                </motion.div>
              </div>
              <div style={{ overflow: 'hidden', paddingBottom: 4 }}>
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.9, delay: 0.29, ease: [0.16, 1, 0.3, 1] }}
                  className="hero-h1"
                  style={{
                    fontSize: 76, fontWeight: 900, lineHeight: 0.95,
                    letterSpacing: '-0.055em', margin: 0,
                    display: 'flex', alignItems: 'baseline', gap: '0.2em',
                  }}
                >
                  <span style={{ color: '#c8c8c4' }}>when</span>
                  <span style={{ color: '#0f0f0e', position: 'relative' }}>
                    it's wrong.
                    <motion.span
                      initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                      transition={{ duration: 0.7, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        position: 'absolute', left: 0, right: 0, bottom: 8,
                        height: 5, background: 'linear-gradient(90deg,#2563eb,#10b981)',
                        borderRadius: 3, transformOrigin: 'left', opacity: 0.3,
                      }}
                    />
                  </span>
                </motion.div>
              </div>
            </div>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55 }}
              style={{ fontSize: 16, color: '#6b6b6b', lineHeight: 1.78, maxWidth: 440, margin: '0 0 36px' }}
            >
              A production-grade retrieval system that{' '}
              <strong style={{ color: '#2a2a28', fontWeight: 600 }}>critiques its own outputs</strong>,
              triggers web fallback when local context is insufficient, and builds a{' '}
              <strong style={{ color: '#2a2a28', fontWeight: 600 }}>persistent memory graph</strong>{' '}
              across conversations.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.68 }}
              style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 56 }}
            >
              <Link to="/app"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '13px 24px', borderRadius: 10,
                  background: '#0f0f0e', color: '#fff',
                  fontSize: 14, fontWeight: 700, textDecoration: 'none',
                  letterSpacing: '-0.025em', transition: 'all .18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0f0f0e'; e.currentTarget.style.transform = '' }}
              >
                Launch App {Ico.arrowUp(12)}
              </Link>
              <a href="#architecture"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 22px', borderRadius: 10,
                  background: '#fff', color: '#444',
                  fontSize: 14, fontWeight: 600, textDecoration: 'none',
                  letterSpacing: '-0.02em', border: '1px solid #ddd',
                  transition: 'all .18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#aaa'; e.currentTarget.style.background = '#fafafa' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.background = '#fff' }}
              >
                View Architecture {Ico.arrow(12)}
              </a>
            </motion.div>

            {/* Mini stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.85 }}
              style={{ display: 'flex', gap: 32, alignItems: 'center' }}
            >
              {[
                { val: '8',    label: 'Pipeline nodes' },
                { val: '2',    label: 'Critique loops' },
                { val: '+31%', label: 'Faithfulness gain' },
              ].map(s => (
                <div key={s.val}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#0f0f0e', letterSpacing: '-0.05em', lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 3, letterSpacing: '0.02em' }}>{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT: Terminal card ── */}
          <div className="hero-right" style={{ flex: 1, minWidth: 0 }}>
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: '#fff',
                border: '1px solid #e0e0dc',
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: '0 2px 0 #e0e0dc, 0 24px 80px rgba(0,0,0,0.09), 0 4px 16px rgba(0,0,0,0.04)',
              }}
            >
              {/* Window chrome */}
              <div style={{
                padding: '12px 16px', background: '#f4f4f0',
                borderBottom: '1px solid #e8e8e4',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {['#ff5f57', '#ffbd2e', '#28c840'].map(c => (
                    <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', letterSpacing: '0.04em' }}>adaptive-rag — ~/docs</div>
                <div style={{ width: 60 }} />
              </div>

              {/* Terminal */}
              <div style={{ background: '#0e0e0d', padding: '20px 22px 22px' }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#10b981' }}>❯ </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{typed}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563eb', animation: 'blink 1s infinite' }}>▌</span>
                </div>
                <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', marginTop: 4 }}>
                  Running 8-node pipeline...
                </div>
              </div>

              {/* Pipeline viz */}
              <div style={{ padding: '20px' }}>
                <div style={{
                  fontSize: 9.5, color: '#bbb', fontFamily: 'monospace',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
                }}>
                  Live pipeline execution
                </div>
                <PipelineViz />
              </div>

              {/* Status bar */}
              <div style={{
                padding: '14px 20px', borderTop: '1px solid #f0f0ee',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[
                    { label: 'Faithfulness', val: '0.89', color: '#059669' },
                    { label: 'Relevancy',    val: '0.91', color: '#2563eb' },
                    { label: 'Precision',    val: '0.84', color: '#7c5cfc' },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ fontSize: 9, color: '#bbb', letterSpacing: '0.04em', marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: m.color, letterSpacing: '-0.04em' }}>{m.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#059669', fontWeight: 600 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', position: 'relative' }}>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      animation: 'pulse-ring 1.5s ease-out infinite',
                      border: '1px solid #10b981',
                    }} />
                  </div>
                  Live
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ══ MARQUEE BAND ══════════════════════════════════════════════════ */}
      <div style={{ borderTop: '1px solid #e8e8e4', borderBottom: '1px solid #e8e8e4', background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '11px 0', borderBottom: '1px solid #f0f0ee' }}>
          <Marquee items={MQ_TOP} speed={34} />
        </div>
        <div style={{ padding: '11px 0' }}>
          <Marquee items={MQ_BOT} speed={26} reverse />
        </div>
      </div>

      {/* ══ STATS ════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2 }}>
          {[
            { num: 3,  suffix: '',  label: 'Research Papers',   sub: 'Self-RAG · CRAG · GraphRAG', color: '#7c5cfc' },
            { num: 8,  suffix: '',  label: 'Pipeline Nodes',    sub: 'LangGraph state machine',    color: '#2563eb' },
            { num: 31, suffix: '%', label: 'Faithfulness gain', sub: 'vs vanilla RAG baseline',    color: '#059669' },
            { num: 2,  suffix: '×', label: 'Retrieval Methods', sub: 'FAISS + BM25 via RRF',       color: '#10b981' },
          ].map((s, i) => (
            <FadeUp key={s.label} delay={i * 0.07}>
              <motion.div whileHover={{ y: -3 }}
                style={{
                  padding: '32px 28px', border: '1px solid #e8e8e4',
                  borderRadius: 18, background: '#fff', transition: 'border-color .18s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '40'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#e8e8e4'}
              >
                <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.065em', lineHeight: 1, color: s.color, marginBottom: 10 }}>
                  <CountUp to={s.num} suffix={s.suffix} duration={1.4} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4, letterSpacing: '-0.018em' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{s.sub}</div>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ══ FEATURES ═════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 48px 100px', background: '#fff', borderTop: '1px solid #e8e8e4' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ marginBottom: 60 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7c5cfc', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Core Capabilities</span>
                <div style={{ flex: 1, height: 1, background: '#f0f0ee' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: 24 }}>
                <h2 style={{ fontSize: 'clamp(32px,4.5vw,54px)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04, color: '#0f0f0e', margin: 0 }}>
                  Beyond retrieval.<br />
                  <span style={{ background: 'linear-gradient(135deg,#7c5cfc,#2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    Self-aware reasoning.
                  </span>
                </h2>
                <p style={{ fontSize: 13.5, color: '#888', maxWidth: 280, lineHeight: 1.74, marginBottom: 4 }}>
                  Every component validates, critiques, and improves its own outputs before surfacing an answer.
                </p>
              </div>
            </div>
          </FadeUp>
          <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <FeatureCard number={1} delay={0}    iconKey="brain"   color="#7c5cfc" title="Query Intelligence"      desc="Rewrites ambiguous queries, decomposes multi-part questions, and classifies intent before any retrieval begins." />
            <FeatureCard number={2} delay={0.06} iconKey="db"      color="#2563eb" title="Hybrid Retrieval"        desc="Fuses dense FAISS semantic search with sparse BM25 keyword matching via Reciprocal Rank Fusion for maximum coverage." />
            <FeatureCard number={3} delay={0.12} iconKey="shield"  color="#ef4444" title="Relevance Critique"      desc="Scores every retrieved chunk 0–1. If the aggregate falls below threshold, CRAG triggers a corrective web search." />
            <FeatureCard number={4} delay={0.18} iconKey="zap"     color="#10b981" title="Cross-Encoder Rerank"    desc="ms-marco MiniLM re-ranks top candidates with full query-document joint scoring — not just dot-product similarity." />
            <FeatureCard number={5} delay={0.24} iconKey="refresh" color="#ef4444" title="Hallucination Guard"     desc="After generation, a second critic checks every claim against retrieved context. Failed checks trigger a retry loop." />
            <FeatureCard number={6} delay={0.30} iconKey="network" color="#10b981" title="Persistent Memory Graph" desc="Entities and relationships extracted from every conversation are persisted in a NetworkX knowledge graph for multi-hop reasoning." />
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding: '100px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <FadeUp>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>How It Works</span>
            <div style={{ flex: 1, height: 1, background: '#f0f0ee' }} />
          </div>
          <h2 style={{ fontSize: 'clamp(28px,4.5vw,52px)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04, color: '#0f0f0e', marginBottom: 52 }}>
            Two critique loops.<br />
            <span style={{ background: 'linear-gradient(135deg,#2563eb,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Zero hallucinations.
            </span>
          </h2>
        </FadeUp>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 12 }}>
          {[
            {
              step: '01', color: '#ef4444', title: 'Retrieval Critique',
              body: 'Every chunk returned from the vector store and BM25 index is scored by a cross-encoder critic. Chunks below 0.4 confidence are discarded. If fewer than 3 chunks pass, the pipeline escalates to live web search via Tavily.',
            },
            {
              step: '02', color: '#ef4444', title: 'Answer Critique',
              body: 'Once the LLM generates an answer, a second critic evaluates every factual claim against the retrieved context. Unsupported claims are flagged, and the response is regenerated with tighter constraints until it passes or the retry limit is hit.',
            },
            {
              step: '03', color: '#059669', title: 'Memory Persistence',
              body: 'Named entities, relationships and key facts extracted from each conversation turn are written to a persistent NetworkX graph store. Future queries retrieve this structured knowledge alongside vector chunks, enabling multi-hop reasoning.',
            },
          ].map((item, i) => (
            <FadeUp key={item.step} delay={i * 0.1}>
              <div
                style={{
                  padding: '28px 26px', border: '1px solid #e8e8e4',
                  borderRadius: 18, background: '#fff', height: '100%',
                  transition: 'border-color .18s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = item.color + '35'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#e8e8e4'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `${item.color}0e`, border: `1px solid ${item.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: item.color,
                  }}>{item.step}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#111', letterSpacing: '-0.025em' }}>{item.title}</div>
                </div>
                <p style={{ fontSize: 13, color: '#777', lineHeight: 1.78, margin: 0 }}>{item.body}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ══ ARCHITECTURE ════════════════════════════════════════════════ */}
      <section id="architecture" style={{ padding: '96px 48px', background: '#fff', borderTop: '1px solid #e8e8e4', borderBottom: '1px solid #e8e8e4' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>System Architecture</span>
              <div style={{ flex: 1, height: 1, background: '#f0f0ee' }} />
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,50px)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04, color: '#0f0f0e', marginBottom: 48 }}>
              LangGraph state machine.<br />
              <span style={{ background: 'linear-gradient(135deg,#2563eb,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                8 nodes. 2 critique loops.
              </span>
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div style={{ background: '#f9f9f7', border: '1px solid #e8e8e4', borderRadius: 18, padding: '24px' }}>
              {ARCH.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {!row.first && ri > 0 && (
                    <div style={{ width: 1, height: 14, background: '#ddd' }} />
                  )}
                  {row.split ? (
                    <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 600, justifyContent: 'center' }}>
                      {[row.left, row.right].map((n, ni) => (
                        <div key={ni} style={{
                          flex: 1, padding: '8px 14px', borderRadius: 8, textAlign: 'center',
                          background: `${n.c}09`, border: `1px solid ${n.c}22`,
                          fontSize: 11.5, color: n.c, fontWeight: 600, letterSpacing: '-0.01em',
                        }}>{n.l}</div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', width: '100%', maxWidth: 780 }}>
                      {row.nodes.map(n => (
                        <div key={n.l} style={{
                          padding: '8px 14px', borderRadius: 8, textAlign: 'center',
                          background: `${n.c}09`, border: `1px solid ${n.c}22`,
                          minWidth: n.w || 'auto',
                          flex: row.nodes.length > 1 ? 1 : 'none',
                          maxWidth: row.nodes.length > 1 ? 200 : (n.w || 440),
                        }}>
                          {n.badge && <div style={{ fontSize: 8, color: n.c, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 2, textTransform: 'uppercase' }}>{n.badge}</div>}
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: n.c, letterSpacing: '-0.015em' }}>{n.l}</div>
                          {n.d && <div style={{ fontSize: 9.5, color: '#aaa', fontFamily: 'monospace', marginTop: 2 }}>{n.d}</div>}
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

      {/* ══ BENCHMARKS ══════════════════════════════════════════════════ */}
      <section id="benchmarks" style={{ padding: '100px 48px', maxWidth: 1060, margin: '0 auto' }}>
        <FadeUp>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Benchmark Results</span>
            <div style={{ flex: 1, height: 1, background: '#f0f0ee' }} />
          </div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,50px)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04, color: '#0f0f0e', marginBottom: 14 }}>
            Measured on RAGAS.<br />
            <span style={{ background: 'linear-gradient(135deg,#059669,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Critique loops make the difference.
            </span>
          </h2>
          <p style={{ fontSize: 14.5, color: '#888', maxWidth: 480, lineHeight: 1.74, marginBottom: 48 }}>
            Evaluated against the same document corpus. The system refuses to hallucinate — it either finds a grounded answer or says it can't.
          </p>
        </FadeUp>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
          <MetricCard delay={0}    label="faithfulness"      baseline={0.61} adaptive={0.89} color="#059669" />
          <MetricCard delay={0.07} label="answer_relevancy"  baseline={0.72} adaptive={0.91} color="#2563eb" />
          <MetricCard delay={0.14} label="context_precision" baseline={0.58} adaptive={0.84} color="#7c5cfc" />
          <MetricCard delay={0.21} label="context_recall"    baseline={0.64} adaptive={0.88} color="#10b981" />
        </div>
      </section>

      {/* ══ RESEARCH PAPERS ═════════════════════════════════════════════ */}
      <section style={{ padding: '96px 48px', background: '#fff', borderTop: '1px solid #e8e8e4' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Research Foundation</span>
              <div style={{ flex: 1, height: 1, background: '#f0f0ee' }} />
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,50px)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04, color: '#0f0f0e', marginBottom: 48 }}>
              Three papers.<br />
              <span style={{ background: 'linear-gradient(135deg,#b45309,#7c5cfc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                One system.
              </span>
            </h2>
          </FadeUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 10 }}>
            <PaperCard delay={0}    title="Self-RAG: Learning to Retrieve, Generate, and Critique" authors="Asai et al." year="2023" tag="Self-RAG" tagColor="purple" desc="Introduces learnable reflection tokens — [Retrieve], [Relevant], [IsSupported] — so the model controls when to retrieve and validates each chunk inline, rather than blindly using all context." />
            <PaperCard delay={0.08} title="Corrective Retrieval Augmented Generation"             authors="Yan et al."   year="2024" tag="CRAG"     tagColor="amber"  desc="When retrieved documents score below a relevance threshold, CRAG triggers an external web search as a corrective step rather than hallucinating an answer from weak context." />
            <PaperCard delay={0.16} title="From Local to Global: A Graph RAG Approach"            authors="Edge et al."  year="2024" tag="GraphRAG" tagColor="teal"   desc="Entities and relationships stored in a knowledge graph enable multi-hop reasoning that pure vector similarity cannot handle — critical for complex, multi-document questions." />
          </div>
        </div>
      </section>

      {/* ══ CTA ════════════════════════════════════════════════════════ */}
      <section style={{ padding: '130px 48px', textAlign: 'left', position: 'relative', overflow: 'hidden', background: '#0f0f0e' }}>
        <div style={{
          position: 'absolute', top: '40%', right: '10%', transform: 'translateY(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '5%',
          width: 400, height: 400,
          background: 'radial-gradient(circle,rgba(37,99,235,0.08) 0%,transparent 70%)',
          pointerEvents: 'none',
        }} />
        <FadeUp>
          <div style={{ maxWidth: 1060, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#10b981',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              display: 'block', marginBottom: 22,
            }}>
              Ready to run
            </span>
            <h2 style={{
              fontSize: 'clamp(42px,6vw,80px)', fontWeight: 900,
              letterSpacing: '-0.055em', lineHeight: 1.02,
              marginBottom: 20, color: '#fff',
            }}>
              Ask anything.<br />
              <span style={{ background: 'linear-gradient(135deg,#2563eb,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Watch it think.
              </span>
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', maxWidth: 420, margin: '0 0 40px', lineHeight: 1.76 }}>
              Upload your documents, run a query, and see every critique score, confidence metric and source citation update in real time.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/app"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 10,
                  background: '#fff', color: '#0f0f0e',
                  fontSize: 14.5, fontWeight: 700, textDecoration: 'none',
                  letterSpacing: '-0.025em', transition: 'all .18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e8e8e8'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = '' }}
              >
                Open the App {Ico.arrowUp(13)}
              </Link>
              <a href="https://github.com" target="_blank" rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '13px 24px', borderRadius: 10,
                  background: 'transparent', color: 'rgba(255,255,255,0.7)',
                  fontSize: 14.5, fontWeight: 600, textDecoration: 'none',
                  letterSpacing: '-0.02em', border: '1px solid rgba(255,255,255,0.15)',
                  transition: 'all .18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              >
                ★ Star on GitHub
              </a>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer style={{
        borderTop: '1px solid #1e1e1c', background: '#0f0f0e',
        padding: '24px 48px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Ico.zap('#0f0f0e', 11)}
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>AdaptiveRAG</span>
        </div>
        <p style={{ fontSize: 11, color: '#444', fontFamily: 'monospace' }}>
          LangChain · LangGraph · FAISS · Mistral AI · RAGAS
        </p>
      </footer>
    </div>
  )
}