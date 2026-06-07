import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

/* ── Inline Premium Icons ── */
const ZapIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)
const GithubIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
)
const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const NAV_LINKS = [
  { label: 'Architecture', href: '#architecture' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Benchmarks', href: '#benchmarks' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [barDismissed, setBarDismissed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isApp = location.pathname === '/app'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location])

  return (
    <>
      {/* ── TOP ANNOUNCEMENT BAR ── */}
      <AnimatePresence>
        {!barDismissed && (
          <motion.div
            initial={{ height: 36, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ 
              overflow: 'hidden',
              position: 'relative',
              zIndex: 201,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0c0c0e',
              color: '#e4e4e7',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            <span style={{ paddingRight: '24px', textAlign: 'center' }}>
              AdaptiveRAG v2 — now with GraphRAG + multi-hop reasoning.{' '}
              <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Read release notes →</a>
            </span>
            <button
              onClick={() => setBarDismissed(true)}
              style={{
                position: 'absolute', right: 16, background: 'none',
                border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)',
                display: 'flex', alignItems: 'center', padding: 4,
                transition: 'color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.9)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.4)'}
            >
              <XIcon />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── COHESIVE SYSTEM NAVBAR ── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'sticky', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 200,
          height: 60,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 24px',
          // Explicit theme overrides preventing system variable dropouts
          background: scrolled ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          borderBottom: scrolled ? '1px solid rgba(0, 0, 0, 0.07)' : '1px solid rgba(0, 0, 0, 0.02)',
          boxShadow: scrolled ? '0 4px 20px rgba(0, 0, 0, 0.02)' : 'none',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Logo Configuration */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: '#0e0e11',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
            boxShadow: '0 2px 6px rgba(0,0,0,.12)',
          }}>
            <ZapIcon />
          </div>
          <span style={{
            fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 750, fontSize: 15.5,
            color: '#0e0e11', letterSpacing: '-.03em',
          }}>
            Adaptive<span style={{ color: '#2563eb' }}>RAG</span>
          </span>
        </Link>

        {/* Links Navigation */}
        <nav className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {!isApp && NAV_LINKS.map(item => (
            <a key={item.label}
              href={item.href}
              style={{
                padding: '6px 12px', borderRadius: 7, fontSize: 13.5,
                fontWeight: 500, color: '#4b5563', textDecoration: 'none',
                transition: 'all .2s ease', letterSpacing: '-.01em',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0e0e11'; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'transparent'; }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA Elements */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="https://github.com" target="_blank" rel="noreferrer"
            className="hide-mobile"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 7, fontSize: 13,
              fontWeight: 500, color: '#1f2937', textDecoration: 'none',
              border: '1px solid rgba(0,0,0,0.08)', background: '#ffffff',
              transition: 'all .2s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.16)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#1f2937'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
          >
            <GithubIcon /> GitHub
          </a>

          <Link to="/app"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 7,
              background: '#0e0e11', color: '#ffffff',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              letterSpacing: '-.01em',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; }}
          >
            Launch App <ArrowIcon />
          </Link>

          {/* Handled Responsive Action Trigger */}
          <button
            className="show-mobile"
            onClick={() => setMobileOpen(p => !p)}
            style={{
              display: 'none', background: 'none', border: 'none', cursor: 'pointer',
              color: '#0e0e11', padding: 6, borderRadius: 6,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>
      </motion.header>

      {/* Mobile Drawer Overlay Context */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed', 
              top: barDismissed ? 70 : 106, 
              left: 16, 
              right: 16, 
              zIndex: 199,
              background: 'rgba(255, 255, 255, 0.98)', 
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.08)', 
              borderRadius: 12,
              padding: '12px', 
              boxShadow: '0 16px 32px rgba(0,0,0,0.06)',
            }}
          >
            {NAV_LINKS.map(item => (
              <a key={item.label} href={item.href} onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block', padding: '10px 12px', borderRadius: 8,
                  fontSize: 14, fontWeight: 500, color: '#374151', textDecoration: 'none',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {item.label}
              </a>
            ))}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 8, paddingTop: 8 }}>
              <a href="https://github.com" target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 8, fontSize: 14,
                  fontWeight: 500, color: '#374151', textDecoration: 'none',
                }}
              >
                <GithubIcon /> GitHub
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .show-mobile { display: flex !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </>
  )
}