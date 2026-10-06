// Thin client for the FastAPI backend (proxied through Vite at /api)
const j = async r => { if (!r.ok) throw new Error((await r.text()) || r.statusText); return r.json() }

export const ingestFiles = files => {
  const fd = new FormData(); files.forEach(f => fd.append('files', f))
  return fetch('/api/ingest', { method: 'POST', body: fd }).then(j)
}
export const getMemoryGraph = () => fetch('/api/memory/graph').then(j)
export const clearSession = id => fetch(`/api/session/${id}`, { method: 'DELETE' }).then(j)

// SSE over POST. Calls onEvent(event, data). Returns a cancel function.
export function streamQuery(query, user_id, onEvent) {
  const ctl = new AbortController()
  ;(async () => {
    try {
      const res = await fetch('/api/query/stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, user_id }), signal: ctl.signal,
      })
      if (!res.ok || !res.body) throw new Error(await res.text())
      const reader = res.body.getReader(), dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n'); buf = parts.pop()
        for (const p of parts) {
          if (!p.startsWith('data: ')) continue
          try { const m = JSON.parse(p.slice(6)); onEvent(m.event, m.data) } catch { /* skip */ }
        }
      }
    } catch (e) { if (e.name !== 'AbortError') onEvent('error', { message: e.message }) }
  })()
  return () => ctl.abort()
}
