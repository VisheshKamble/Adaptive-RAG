const N = [['analyse_query', 'Analyse'], ['retrieve', 'Retrieve'], ['critique_chunks', 'Critique'], ['web_fallback', 'Web'], ['rerank', 'Rerank'], ['generate_answer', 'Generate'], ['critique_answer', 'Verify'], ['update_memory', 'Memory']]

/* Live circuit strip: nodes light up as the LangGraph pipeline streams events. */
export default function PipelineStrip({ active, done, busy }) {
  return (
    <div className={`pstrip ${busy ? 'busy' : ''}`} aria-label="Pipeline progress">
      {N.map(([k, l], i) => {
        const st = active.has(k) ? 'act' : done.has(k) ? 'ok' : ''
        return (
          <div key={k} className={`pn ${st}`}>
            <span className="pd">{st === 'ok' ? '✓' : i + 1}</span><span className="pl">{l}</span>
            {i < N.length - 1 && <span className="pw" />}
          </div>
        )
      })}
    </div>
  )
}
