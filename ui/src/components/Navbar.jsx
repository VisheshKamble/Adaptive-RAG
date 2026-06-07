import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

// ── Inline SVGs (no lucide dep needed for nav) ───────────────────────────
const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)
const GithubIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
)
const ArrowRightIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const NAV_LINKS = ['Architecture', 'How it Works', 'Research']

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const isApp = location.pathname === '/app'

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: scrolled ? 'rgba(255,255,255,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent',
        transition: 'all .35s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: '#0a0a0a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}>
          <ZapIcon />
        </div>
        <span style={{
          fontFamily: 'var(--font)', fontWeight: 800, fontSize: 15,
          color: 'var(--ink)', letterSpacing: '-.03em',
        }}>
          Adaptive<span style={{ color: 'var(--blue)' }}>RAG</span>
        </span>
      </Link>

      {/* Desktop nav */}
      <nav style={{ display:'flex', alignItems:'center', gap:2 }}>
        {!isApp && NAV_LINKS.map(item => (
          <a key={item}
            href={`#${item.toLowerCase().replace(/ /g, '-')}`}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 13,
              fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none',
              transition: 'color .18s, background .18s', letterSpacing: '-.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.color='var(--ink)'; e.currentTarget.style.background='var(--bg-subtle)'; }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--ink-3)'; e.currentTarget.style.background='transparent'; }}
          >{item}</a>
        ))}

        {/* GitHub */}
        <a href="https://github.com" target="_blank" rel="noreferrer"
          style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'6px 13px', borderRadius:8,
            fontSize:13, fontWeight:500, color:'var(--ink-3)',
            textDecoration:'none', border:'1.5px solid var(--line)',
            marginLeft:8, transition:'all .18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color='var(--ink)'; e.currentTarget.style.borderColor='var(--line-strong)'; e.currentTarget.style.background='var(--bg-subtle)'; }}
          onMouseLeave={e => { e.currentTarget.style.color='var(--ink-3)'; e.currentTarget.style.borderColor='var(--line)'; e.currentTarget.style.background='transparent'; }}
        >
          <GithubIcon /> GitHub
        </a>

        <Link to="/app"
          style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'7px 16px', borderRadius:9,
            background:'var(--ink)', color:'#fff',
            fontSize:13, fontWeight:600, textDecoration:'none',
            marginLeft:6, letterSpacing:'-.015em',
            boxShadow:'0 2px 8px rgba(0,0,0,.18)',
            transition:'all .2s cubic-bezier(0.16,1,0.3,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,.22)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.18)'; }}
        >
          Launch App <ArrowRightIcon />
        </Link>
      </nav>
    </motion.header>
  )
}