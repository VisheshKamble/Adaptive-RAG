import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GITHUB_URL } from '../lib/config'
import { StarBtn, GhIcon } from '../components/Navbar'
import RunLocal from '../components/RunLocal'

/* The hero: one answer being proofread. Delays (--d) sequence a single pass. */
function ProofCard() {
  const d = s => ({ '--d': `${s}s` })
  return (
    <div className="proof" role="img" aria-label="An answer being proofread: one claim is highlighted as sourced, one is struck out as unsupported and replaced, then the answer is stamped grounded.">
      <span className="sticker" aria-hidden="true">grounded<br />or it&apos;s cut</span>
      <div className="proof-in">
        <div className="proof-q"><b>You</b>What did the benchmark show about faithfulness?</div>
        <div className="proof-doc">
          <p className="rise" style={d(.3)}>
            <span className="hl" style={d(.9)}>Hybrid retrieval found the right passages more often.</span>
            <span className="fn" style={d(1.5)}>1</span>
          </p>
          <p className="rise" style={d(2)}>
            <span className="bad" style={d(3.2)}>It also removed every hallucination in every language.</span>
          </p>
          <span className="redpen rise" style={d(3.9)}>No source says this. Cut.</span>
          <p className="rise" style={d(4.6)}>
            <span className="hl" style={d(5)}>Faithfulness rose from 0.61 to 0.89 on RAGAS.</span>
            <span className="fn" style={d(5.6)}>2</span>
          </p>
          <div className="verdict" style={d(6.2)}>Grounded 0.89</div>
        </div>
        <div className="proof-src">
          <div className="src"><span className="fn">1</span><span>benchmark.pdf</span><code>p.4 · 0.93</code></div>
          <div className="src"><span className="fn">2</span><span>ragas_eval.md</span><code>§2 · 0.88</code></div>
        </div>
      </div>
    </div>
  )
}

const NODES = ['analyse', 'retrieve', 'critique', 'web', 'rerank', 'generate', 'verify', 'memory']
function Circuit() {
  const x = i => 70 + i * 123, y = i => (i % 2 ? 190 : 110)
  const d = NODES.map((_, i) => `${i ? 'L' : 'M'}${x(i)} ${y(i)}`).join(' ')
  const loop = (a, b) => `M${x(b)} ${y(b) - 26} C ${x(b)} 10, ${x(a)} 10, ${x(a)} ${y(a) - 26}`
  return (
    <div className="circuit-wrap">
      <svg className="circuit" viewBox="0 0 1000 290" role="img" aria-label="The eight pipeline steps, with two retry loops">
        <path id="trk" d={d} fill="none" className="ln" strokeWidth="2" strokeDasharray="4 8" />
        <path d={loop(1, 2)} fill="none" stroke="#E5284F" strokeWidth="2.5" strokeDasharray="6 6" className="dash" />
        <path d={loop(5, 6)} fill="none" stroke="#E5284F" strokeWidth="2.5" strokeDasharray="6 6" className="dash" />
        <text x={(x(1) + x(2)) / 2} y="40" textAnchor="middle" className="retry">retry: weak sources</text>
        <text x={(x(5) + x(6)) / 2} y="40" textAnchor="middle" className="retry">retry: unsupported claim</text>
        {NODES.map((n, i) => (
          <g key={n} className="cnode" style={{ animationDelay: `${i}s` }}>
            <circle cx={x(i)} cy={y(i)} r="26" />
            <text x={x(i)} y={y(i) + 6} textAnchor="middle" className="no">{i + 1}</text>
            <text x={x(i)} y={y(i) + (i % 2 ? 58 : -40)} textAnchor="middle" className="nm">{n}</text>
          </g>
        ))}
        <circle r="8" fill="#2E3BFF" stroke="#161A33" strokeWidth="1.5"><animateMotion dur="8s" repeatCount="indefinite"><mpath href="#trk" /></animateMotion></circle>
      </svg>
    </div>
  )
}

function MiniGraph() {
  const P = [[50, 40], [140, 90], [235, 30], [270, 110], [105, 135], [200, 140]], E = [[0, 1], [1, 2], [1, 4], [3, 5], [4, 5], [1, 3], [2, 3]]
  const C = ['#2E3BFF', '#0E9F83', '#E5284F', '#FFE45C', '#F28C1B', '#7A4DFF']
  return (
    <svg viewBox="0 0 300 170" className="mini" aria-hidden="true">
      {E.map(([a, b], i) => <line key={i} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} />)}
      {P.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={i === 1 ? 13 : 9} fill={C[i]} className="gnode" style={{ animationDelay: `${i * .45}s` }} />)}
    </svg>
  )
}

const STEPS = [
  ['Query analyser', 'Rewrites the question and splits it into smaller ones.'],
  ['Hybrid retriever', 'Searches by meaning (FAISS) and by keyword (BM25), then merges the results.'],
  ['Relevance critic', 'Scores each retrieved passage from 0 to 1.'],
  ['Web fallback', 'If your documents fall short, searches the web with Tavily.'],
  ['Cross-encoder', 'Re-ranks the best passages by reading query and passage together.'],
  ['Answer generator', 'Writes the answer from the passages that survived.'],
  ['Answer critic', 'Checks every claim against the sources and flags unsupported ones.'],
  ['Memory graph', 'Saves the people, places and ideas it met for the next question.'],
]
const AGENTS = [
  ['Plans', 'Query analyser', 'Rewrites your question into a clearer one and splits compound questions into small, answerable parts.', '“Compare A and B, and list the limits” → 3 sub-questions'],
  ['Judges sources', 'Relevance critic', 'Scores every retrieved passage from 0 to 1. Anything under 0.5 is thrown out, and if too little survives, the system goes to the web.', 'intro.txt · 0.22 → dropped'],
  ['Judges answers', 'Answer critic', 'Reads the draft next to its sources, flags claims nothing supports and scores confidence. Below 0.6 it tries again, up to 2 times.', '“removed every hallucination” → no source, cut'],
  ['Remembers', 'Memory updater', 'Pulls out people, organisations, concepts and dates from each exchange and stores them in a knowledge graph for later questions.', 'Faithfulness → RAGAS → 0.89'],
]
const JOURNEY = [
  ['You upload', 'PDF, TXT and Markdown files are split into chunks and indexed twice: by meaning (FAISS) and by keyword (BM25).'],
  ['You ask', 'The question is rewritten and decomposed, then both indexes are searched and the results merged.'],
  ['It doubts itself', 'Each passage is scored. Weak evidence sends it to the web instead of letting the model guess.'],
  ['It writes, then proofreads', 'The answer streams in, then a second critic checks every claim. Unsupported ones trigger a retry.'],
  ['It learns', 'What it met is saved to the memory graph, so the next question starts smarter.'],
]
const PAPERS = [
  ['Self-RAG: Learning to Retrieve, Generate, and Critique', 'Asai et al., 2023'],
  ['Corrective Retrieval Augmented Generation', 'Yan et al., 2024'],
  ['From Local to Global: A Graph RAG Approach', 'Edge et al., 2024'],
]

function Results() {
  const [r, setR] = useState(null)
  useEffect(() => { fetch('/api/eval').then(x => x.json()).then(setR).catch(() => setR({ available: false })) }, [])
  const p = v => `${v * 100}%`
  const rows = r?.available ? [
    ['Answer correctness', r.plain.correctness, r.adaptive.correctness],
    ['Backed by your documents', r.plain.doc_cited, r.adaptive.doc_cited],
    ['Asks when a question is unclear', r.plain.clarify, r.adaptive.clarify],
  ] : []
  return (
    <section id="results" className="alt">
      <div className="wrap">
        <h2>Measured, not claimed.</h2>
        <p className="lead">
          {r?.available
            ? `Plain RAG against AdaptiveRAG on ${r.n_doc} document questions and ${r.n_vague} deliberately vague ones, scored by keyword match so no extra model judges itself. Run ${r.generated}.`
            : 'No results yet. Index a PDF, then run the ablation to fill this section with your own numbers.'}
        </p>
        {r?.available ? (<>
          <div className="legend"><span><i style={{ background: '#fff', border: '2px solid var(--ink-4)' }} />Plain RAG</span><span><i style={{ background: 'var(--pencil)' }} />AdaptiveRAG</span></div>
          <div className="dumb">
            {rows.map(([l, a, b]) => (
              <div className="drow" key={l}>
                <b>{l}</b>
                <div className="track" role="img" aria-label={`${l}: plain ${a}, adaptive ${b}`}>
                  <i className="seg" style={{ left: p(Math.min(a, b)), width: p(Math.abs(b - a)) }} />
                  <i className="dot was" style={{ left: p(a) }} /><i className="dot now" style={{ left: p(b) }} />
                </div>
                <div className="val">{Math.round(b * 100)}%<small>plain {Math.round(a * 100)}%</small></div>
              </div>
            ))}
          </div>
          <div className="costgrid">
            <div><small>Plain RAG</small><b>{r.plain.llm_calls} LLM call</b><span>{r.plain.latency_s}s per question</span></div>
            <div><small>AdaptiveRAG</small><b>{r.adaptive.llm_calls} LLM calls</b><span>{r.adaptive.latency_s}s per question</span></div>
            <p>The honest trade: checking costs time and tokens. You pay for it in speed and get sources you can trust. Model: <code>{r.model}</code>. Free-tier rate limits can inflate adaptive latency. Small test set, one document collection, so read it as direction, not proof. Reproduce with <code>python -m eval.ablation</code>.</p>
          </div>
        </>) : <pre className="term" style={{ marginTop: 28 }}><code>{`# 1. upload your PDF in the app, then:\npython -m eval.ablation`}</code></pre>}
      </div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <main className="lp">
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>A RAG system that proofreads its own answers.</h1>
            <p className="lead">
              AdaptiveRAG searches your documents, checks what it found, then checks its own draft
              before you see it. If your documents aren't enough, it says so and looks on the web.
            </p>
            <div className="cta-row">
              <Link to="/app" className="btn btn-primary">Ask your documents</Link>
              <StarBtn big />
              <a href="#run" className="btn">Run locally</a>
              <a href="#pipeline" className="btn">See the 8 steps</a>
            </div>
          </div>
          <ProofCard />
        </div>
        <div className="marquee" aria-hidden="true"><div>{[...NODES, ...NODES, ...NODES, ...NODES].map((n, i) => <span key={i}>{n}</span>)}</div></div>
      </section>

      <section id="about">
        <div className="wrap">
          <h2>Not a chatbot. A small team of agents.</h2>
          <p className="lead">
            A normal RAG app searches once and trusts whatever the model says. AdaptiveRAG treats every step as
            something that can go wrong, and has a dedicated agent to catch it. It decides for itself whether to
            search the web, retry an answer or throw a source away.
          </p>
          <div className="agents">
            {AGENTS.map(([k, t, d, ex]) => (
              <article className="agent" key={t}>
                <span className="agent-k">{k}</span>
                <h3>{t}</h3>
                <p>{d}</p>
                <code>{ex}</code>
              </article>
            ))}
          </div>
          <h3 className="jt">What happens when you use it</h3>
          <ol className="journey">
            {JOURNEY.map(([t, d], i) => (
              <li key={t}><b>{i + 1}</b><div><h4>{t}</h4><p>{d}</p></div></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="run" className="runsec alt">
        <div className="wrap"><RunLocal /></div>
      </section>

      <section id="pipeline" className="alt">
        <div className="wrap">
          <h2>Eight steps between your question and the answer.</h2>
          <p className="lead">A LangGraph state machine runs them in order, and loops back when a check fails.</p>
          <Circuit />
          <div className="steps">
            {STEPS.map(([t, s], i) => (
              <div className="step" key={t}>
                <span className="step-n">{i + 1}</span>
                <div><h3>{t}</h3><p>{s}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="checks">
        <div className="wrap">
          <h2>Two checks, and a memory.</h2>
          <div className="cols">
            <div className="col">
              <h3>Check the sources</h3>
              <p>Every retrieved passage is scored. Weak ones are dropped, and if too little is left, the system searches the web instead of guessing.</p>
              <div className="frag">
                <div className="rs"><code>benchmark.pdf</code><div className="meter"><i style={{ width: '93%' }} /></div><span>0.93</span></div>
                <div className="rs"><code>notes.md</code><div className="meter"><i style={{ width: '71%' }} /></div><span>0.71</span></div>
                <div className="rs off"><code>intro.txt</code><div className="meter"><i style={{ width: '22%' }} /></div><span>0.22</span></div>
                <div className="note">Too little left. Searching the web.</div>
              </div>
            </div>
            <div className="col">
              <h3>Check the answer</h3>
              <p>A second critic compares each claim with the sources, flags unsupported ones, and gives you a confidence score.</p>
              <div className="frag">
                <div className="cl"><i>✓</i><span>Hybrid retrieval improved recall.</span></div>
                <div className="cl"><i>✓</i><span>Faithfulness rose from 0.61 to 0.89.</span></div>
                <div className="cl no"><i>✕</i><span>It removed every hallucination.</span></div>
                <div className="conf">Confidence 89%</div>
              </div>
            </div>
            <div className="col">
              <h3>Remember what mattered</h3>
              <p>People, places and ideas from each chat join a knowledge graph that later questions draw on.</p>
              <div className="frag">
                <MiniGraph />
                <div className="cycle">Measured<small>latency and LLM calls per question are reported below</small></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Results />

      <section>
        <div className="wrap two">
          <div>
            <h2>What it can't do.</h2>
            <ul>
              <li>It only knows what you index. Upload PDF, TXT or Markdown files.</li>
              <li>The web fallback needs a Tavily key, and web results are only as good as the web.</li>
              <li>A critic is a model too. Check the sources panel before you rely on an answer.</li>
            </ul>
          </div>
          <div>
            <h2>Built on three papers.</h2>
            <ul>{PAPERS.map(([t, y]) => <li className="pp" key={t}><span>{t}</span><em>{y}</em></li>)}</ul>
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap final-box">
          <div>
            <h2>Ask a question. Watch it check itself.</h2>
            <div className="cta-row" style={{ marginTop: 32 }}>
              <Link to="/app" className="btn">Open the app</Link>
              <StarBtn big />
            </div>
          </div>
          <pre className="term"><code>{`pip install -r requirements.txt
uvicorn main:app --port 8000
cd ui && npm run dev`}<em>   # localhost:3000</em></code></pre>
        </div>
      </section>
      <footer className="foot"><a href={GITHUB_URL} target="_blank" rel="noreferrer" className="foot-gh"><GhIcon s={16} /> AdaptiveRAG on GitHub</a><span>LangChain, LangGraph, FAISS, Mistral AI, RAGAS</span></footer>
    </main>
  )
}
