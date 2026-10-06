import { Link, useLocation } from 'react-router-dom'
import { GITHUB_URL } from '../lib/config'

export const GhIcon = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
)
export const StarIcon = ({ s = 15 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 18l-6.4 3.6L7 14.5 1.7 9.5l7.2-.9z"/></svg>
)
export const StarBtn = ({ big }) => (
  <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={`btn btn-star ${big ? '' : 'btn-sm'}`}>
    <GhIcon s={big ? 18 : 15} /> Star on GitHub <span className="star-pip"><StarIcon s={13} /></span>
  </a>
)

export default function Navbar() {
  const isApp = useLocation().pathname === '/app'
  return (
    <header className="nav">
      <Link to="/" className="brand">
        <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#2E3BFF"/><rect x="4" y="14" width="24" height="10" rx="3" fill="#FFE45C" transform="rotate(-8 16 19)"/><path d="M8 17l5.5 5.5L24 9" fill="none" stroke="#161A33" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        AdaptiveRAG
      </Link>
      {!isApp && (
        <nav className="nav-links" aria-label="Sections">
          <a href="#pipeline">Pipeline</a><a href="#checks">Checks</a><a href="#results">Results</a>
        </nav>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="icon-btn" aria-label="GitHub repository"><GhIcon s={18} /></a>
        <StarBtn />
        {isApp ? <Link to="/" className="btn btn-sm">Overview</Link> : <Link to="/app" className="btn btn-primary btn-sm">Open app</Link>}
      </div>
    </header>
  )
}
