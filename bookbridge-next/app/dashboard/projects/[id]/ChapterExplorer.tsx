'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, CheckCircle, Clock, Loader2, PlayCircle, StopCircle } from 'lucide-react'
import TranslateButton from './TranslateButton'
import SummaryButton from './SummaryButton'
import { pollJob } from '@/lib/jobPoll'

interface ChapterData {
  id: string
  number: number
  title: string
  startPage: number
  endPage: number
  sourceContent: string | null
  translation: string | null
  summary: string | null
}

interface JobData {
  id: string
  chapterId: string | null
  status: string
}

function extractTranslation(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) return raw
  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed?.text === 'string') return parsed.text
  } catch {}
  const m = trimmed.match(/"text"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"new_terms"|"\s*\})/)
  if (m) {
    return m[1]
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }
  return raw
}

export default function ChapterExplorer({
  chapters,
  jobs,
  projectId,
}: {
  chapters: ChapterData[]
  jobs: JobData[]
  projectId: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    chapters[0]?.id ?? null
  )
  const [summaries, setSummaries] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const c of chapters) {
      if (c.summary) map[c.id] = c.summary
    }
    return map
  })

  const [batchTranslating, setBatchTranslating] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 })
  const [batchError, setBatchError] = useState<string | null>(null)
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null)
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set())

  async function handleCancelJob(jobId: string) {
    setCancellingJobId(jobId)
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
    } finally {
      setCancellingJobId(null)
      window.location.reload()
    }
  }

  const selected = chapters.find((c) => c.id === selectedId)
  const untranslatedChapters = chapters.filter(
    (c) => !c.translation && c.sourceContent
  )

  function toggleChapter(id: string) {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSelectedTranslate() {
    const toTranslate = chapters.filter(
      (c) => selectedChapterIds.has(c.id) && !c.translation && c.sourceContent
    )
    if (toTranslate.length === 0) return
    setBatchTranslating(true)
    setBatchError(null)
    setBatchProgress({ done: 0, total: toTranslate.length })
    let hadError = false

    for (let i = 0; i < toTranslate.length; i++) {
      const ch = toTranslate[i]
      try {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, chapterId: ch.id }),
        })
        if (res.status === 402) {
          const errBody = await res.json().catch(() => ({}))
          setBatchError(errBody.error || 'Free tier limit reached.')
          hadError = true
          break
        }
        if (res.ok) {
          const body = await res.json()
          if (body.id) await pollJob(body.id)
        }
      } catch {}
      setBatchProgress({ done: i + 1, total: toTranslate.length })
    }

    setBatchTranslating(false)
    setSelectedChapterIds(new Set())
    if (!hadError) window.location.reload()
  }

  async function handleBatchTranslate() {
    if (untranslatedChapters.length === 0) return
    setBatchTranslating(true)
    setBatchError(null)
    setBatchProgress({ done: 0, total: untranslatedChapters.length })

    for (let i = 0; i < untranslatedChapters.length; i++) {
      const ch = untranslatedChapters[i]
      try {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, chapterId: ch.id }),
        })
        if (res.status === 402) {
          const errBody = await res.json().catch(() => ({}))
          setBatchError(errBody.error || 'Free tier limit reached.')
          break
        }
        if (res.ok) {
          const body = await res.json()
          if (body.id) {
            await pollJob(body.id)
          }
        }
      } catch {
        // Continue with next chapter
      }
      setBatchProgress({ done: i + 1, total: untranslatedChapters.length })
    }

    setBatchTranslating(false)
    if (!batchError) window.location.reload()
  }



  function getChapterStatus(chapter: ChapterData) {
    if (chapter.translation) return 'translated'
    const job = jobs.find((j) => j.chapterId === chapter.id)
    if (job?.status === 'PROCESSING' || job?.status === 'RUNNING' || job?.status === 'PENDING')
      return 'translating'
    if (job?.status === 'QUEUED') return 'queued'
    return 'pending'
  }

  if (chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-4 text-sm text-ink-muted">
          Scanning chapters from your PDF...
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          This may take a moment for large files.
        </p>
      </div>
    )
  }

  const translatedCount = chapters.filter((c) => c.translation).length

  return (
    <div className="flex h-[700px] gap-6">
      {/* Sidebar: chapter list */}
      <div className="flex w-72 shrink-0 flex-col overflow-hidden">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Chapters
          </p>
          <span className="text-xs text-ink-muted">
            {translatedCount}/{chapters.length} translated
          </span>
        </div>
        <div className="mb-3 space-y-2">
          {untranslatedChapters.length > 0 && (
            <button
              onClick={handleBatchTranslate}
              disabled={batchTranslating}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {batchTranslating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {batchProgress.done}/{batchProgress.total} done
                </>
              ) : (
                <>
                  <PlayCircle className="h-3.5 w-3.5" />
                  Translate All ({untranslatedChapters.length})
                </>
              )}
            </button>
          )}
          {batchError && (
            <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600">
              <p>{batchError}</p>
              <Link
                href="/dashboard/settings"
                className="mt-1 inline-block font-medium text-accent hover:underline"
              >
                Go to Settings to add your API key &rarr;
              </Link>
            </div>
          )}

        </div>
        {selectedChapterIds.size > 0 && (
          <div className="mb-2 space-y-1.5">
            {selectedChapterIds.size > 5 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                Selecting many chapters may take a while. Consider translating in smaller batches.
              </p>
            )}
            <button
              onClick={handleSelectedTranslate}
              disabled={batchTranslating}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {batchTranslating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {batchProgress.done}/{batchProgress.total} done
                </>
              ) : (
                <>
                  <PlayCircle className="h-3.5 w-3.5" />
                  Translate Selected ({selectedChapterIds.size})
                </>
              )}
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto space-y-1">
          {chapters.map((chapter) => {
            const status = getChapterStatus(chapter)
            const isSelected = chapter.id === selectedId
            const isChecked = selectedChapterIds.has(chapter.id)
            return (
              <div key={chapter.id} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleChapter(chapter.id)}
                  disabled={batchTranslating}
                  aria-label={`Select chapter ${chapter.number}`}
                  className="h-3.5 w-3.5 shrink-0 accent-accent"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => setSelectedId(chapter.id)}
                  className={`flex flex-1 items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-accent/10 text-accent'
                      : 'text-ink-light hover:bg-parchment/50 hover:text-ink'
                  }`}
                >
                  {status === 'translated' ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  ) : status === 'translating' ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-purple-500" />
                  ) : status === 'queued' ? (
                    <Clock className="h-4 w-4 shrink-0 text-yellow-500" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-ink-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-medium ${isSelected ? 'text-accent' : ''}`}>
                      {chapter.number}. {chapter.title}
                    </p>
                    <p className="text-xs text-ink-muted">
                      pp. {chapter.startPage}–{chapter.endPage}
                    </p>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Content preview panel */}
      <div className="min-w-0 flex-1 overflow-y-auto rounded-xl border border-parchment bg-white p-6">
        {selected ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-accent">
                  Chapter {selected.number}
                </p>
                <h3 className="mt-1 font-serif text-xl font-bold text-ink">
                  {selected.title}
                </h3>
                <p className="mt-1 text-xs text-ink-muted">
                  Pages {selected.startPage}–{selected.endPage}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SummaryButton
                  projectId={projectId}
                  chapterId={selected.id}
                  hasSummary={!!(summaries[selected.id] || selected.summary)}
                  onSummaryGenerated={(summary) => {
                    setSummaries((prev) => ({ ...prev, [selected.id]: summary }))
                  }}
                />
                {selected.translation ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Translated
                  </span>
                ) : (() => {
                  const activeJob = jobs.find(
                    (j) => j.chapterId === selected.id &&
                      (j.status === 'QUEUED' || j.status === 'PENDING' || j.status === 'PROCESSING' || j.status === 'RUNNING')
                  )
                  if (activeJob) {
                    return (
                      <button
                        onClick={() => handleCancelJob(activeJob.id)}
                        disabled={cancellingJobId === activeJob.id}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {cancellingJobId === activeJob.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <StopCircle className="h-3.5 w-3.5" />
                        )}
                        Stop Translate
                      </button>
                    )
                  }
                  return (
                    <TranslateButton
                      key={selected.id}
                      projectId={projectId}
                      chapterId={selected.id}
                    />
                  )
                })()}
              </div>
            </div>

            {(summaries[selected.id] || selected.summary) && (
              <div id="chapter-summary-section" className="mt-4 rounded-lg bg-highlight/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Summary
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-light">
                  {summaries[selected.id] || selected.summary}
                </p>
              </div>
            )}

            <div className="mt-6">
              {selected.translation ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                      Original
                    </p>
                    <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-ink">
                      {selected.sourceContent || (
                        <span className="italic text-ink-muted">No content</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl bg-accent-light/30 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
                      Translation
                    </p>
                    <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-ink">
                      {extractTranslation(selected.translation)}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    Source text
                  </p>
                  <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-ink">
                    {selected.sourceContent || (
                      <span className="italic text-ink-muted">
                        No content available for this chapter.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">Select a chapter to preview.</p>
        )}
      </div>
    </div>
  )
}
