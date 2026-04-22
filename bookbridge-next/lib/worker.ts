// Per-call timeout (ms). The default is scoped to synchronous /translate/chunk
// calls that must fit under Vercel's hobby-tier 10 s function ceiling so the
// route can still return its own 502 instead of hitting a gateway 504.
// Longer-running endpoints (notably /parse on a multi-hundred-page PDF) must
// pass an explicit timeoutMs via the options argument.
const DEFAULT_TIMEOUT_MS = 6000

type WorkerFetchInit = RequestInit & { timeoutMs?: number }

function getWorkerUrl(): string {
  const url = process.env.WORKER_URL
  if (!url) {
    throw new Error(
      'WORKER_URL environment variable is not set. Refusing to call a hardcoded fallback.'
    )
  }
  return url
}

export async function workerFetch(
  path: string,
  init?: WorkerFetchInit
): Promise<Response> {
  const { timeoutMs, ...fetchInit } = init ?? {}
  const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS
  try {
    return await fetch(`${getWorkerUrl()}${path}`, {
      ...fetchInit,
      headers: { ...fetchInit.headers },
      signal: AbortSignal.timeout(timeout),
    })
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    const errorDetail = err instanceof Error ? err.stack || err.message : String(err)
    console.error(`[workerFetch] ${isTimeout ? 'timeout' : 'connection error'} — ${path}:`, errorDetail)
    throw new Error(isTimeout ? 'Worker timeout' : 'Worker unavailable')
  }
}
