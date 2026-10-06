import { useState, useEffect } from 'react'
import { GITHUB_URL } from '../lib/config'

const ENV = `MISTRAL_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here   # optional: enables web fallback
# LLM_PROVIDER=groq  +  GROQ_API_KEY=...   # or use Groq instead`

const steps = win => [
  { t: 'Clone the repo', c: `git clone ${GITHUB_URL}.git\ncd Adaptive-RAG` },
  { t: 'Install the backend', c: win
    ? `python -m venv .venv\n.venv\\Scripts\\activate\npip install -r requirements.txt`
    : `python3 -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt` },
  { t: 'Add your keys', c: win ? 'notepad .env' : 'nano .env', paste: ENV },
  { t: 'Start the API  (port 8000)', c: 'uvicorn main:app --port 8000 --reload', live: true },
  { t: 'Start the UI  (port 3000)', c: 'cd ui\nnpm install\nnpm run dev', after: 'Open http://localhost:3000' },
]

export function useBackendUp() {
  const [up, setUp] = useState(null)
  useEffect(() => {
    let on = true
    const ping = () => fetch('/api/health').then(r => on && setUp(r.ok)).catch(() => on && setUp(false))
    ping(); const id = setInterval(ping, 4000)
    return () => { on = false; clearInterval(id) }
  }, [])
  return up
}

function Code({ text }) {
  const [ok, setOk] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1400) } catch { /* ignore */ }
  }
  return (
    <div className="rl-code">
      <pre>{text.split('\n').map((l, i) => <div key={i}><b>{l.startsWith('#') ? '' : '$'}</b>{l}</div>)}</pre>
      <button onClick={copy} className={ok ? 'ok' : ''}>{ok ? 'Copied ✓' : 'Copy'}</button>
    </div>
  )
}

export default function RunLocal({ compact }) {
  const [win, setWin] = useState(/Win/i.test(typeof navigator !== 'undefined' ? navigator.platform : ''))
  const [done, setDone] = useState(new Set())
  const up = useBackendUp()
  const list = steps(win)
  const isDone = i => done.has(i) || (up && i < 4)
  const n = list.filter((_, i) => isDone(i)).length
  const toggle = i => setDone(s => { const x = new Set(s); x.has(i) ? x.delete(i) : x.add(i); return x })

  return (
    <div className={`rl ${compact ? 'rl-compact' : ''}`}>
      <div className="rl-head">
        <div>
          <span className="rl-kicker">Run it locally</span>
          <h3>Five steps. Your docs never leave your machine.</h3>
        </div>
        <div className="rl-side">
          <div className="rl-os" role="tablist" aria-label="Operating system">
            <button className={!win ? 'on' : ''} onClick={() => setWin(false)}>macOS / Linux</button>
            <button className={win ? 'on' : ''} onClick={() => setWin(true)}>Windows</button>
          </div>
          <span className={`rl-pill ${up ? 'up' : ''}`}><i />{up === null ? 'checking API…' : up ? 'API detected on :8000' : 'API not running yet'}</span>
        </div>
      </div>
      <div className="rl-bar"><i style={{ width: `${(n / list.length) * 100}%` }} /></div>
      <ol className="rl-steps">
        {list.map((s, i) => (
          <li key={s.t} className={isDone(i) ? 'done' : ''}>
            <button className="rl-n" onClick={() => toggle(i)} aria-label={`Mark step ${i + 1} done`}>{isDone(i) ? '✓' : i + 1}</button>
            <div className="rl-body">
              <h4>{s.t}{s.live && <em className={up ? 'on' : ''}>{up ? 'running' : 'waiting'}</em>}</h4>
              <Code text={s.c} />
              {s.paste && <><p className="rl-hint">Paste into <code>.env</code> (project root):</p><Code text={s.paste} /></>}
              {s.after && <p className="rl-hint go">→ {s.after}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
