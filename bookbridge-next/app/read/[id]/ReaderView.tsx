'use client'

import { useState, useMemo, useRef } from 'react'
import { pollJob } from '@/lib/jobPoll'
import Link from 'next/link'
import { CheckCircle, FileText, Search, Download, X, Loader2 } from 'lucide-react'

type ViewMode = 'bilingual' | 'translation' | 'source'

interface ChapterData {
  id?: string
  number: number
  title: string
  source: string
  translation: string
}

const MODE_LABELS: Record<ViewMode, string> = {
  bilingual: 'Bilingual',
  translation: 'Translation Only',
  source: 'Source Only',
}

export default function ReaderView({
  title,
  subtitle,
  sourceLang = 'English',
  targetLang = 'Translation',
  chapters,
  isDemo,
  projectId,
}: {
  title: string
  subtitle?: string
  sourceLang?: string
  targetLang?: string
  chapters: ChapterData[]
  isDemo?: boolean
  projectId?: string
}) {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'bilingual'
    const saved = localStorage.getItem('bookbridge-reader-mode')
    if (saved === 'bilingual' || saved === 'translation' || saved === 'source') {
      return saved
    }
    return 'bilingual'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set())
  const doneRef = useRef(false)

  async function handleTranslate(chapterId: string) {
    if (!projectId || translatingIds.has(chapterId)) return
    setTranslatingIds((prev) => new Set(prev).add(chapterId))
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, chapterId }),
      })
      if (!res.ok) return
      const body = await res.json() as { id?: string }
      if (!body.id) return
      const final = await pollJob(body.id)
      if (final.status === 'SUCCEEDED') {
        doneRef.current = true
        window.location.reload()
      }
    } finally {
      setTranslatingIds((prev) => {
        const next = new Set(prev)
        next.delete(chapterId)
        return next
      })
    }
  }

  function handleModeChange(newMode: ViewMode) {
    setMode(newMode)
    localStorage.setItem('bookbridge-reader-mode', newMode)
  }

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    return chapters
      .filter(
        (ch) =>
          ch.source.toLowerCase().includes(q) ||
          ch.translation.toLowerCase().includes(q) ||
          ch.title.toLowerCase().includes(q)
      )
      .map((ch) => ch.number)
  }, [searchQuery, chapters])

  function handleExport() {
    const lines: string[] = [`# ${title}\n`]
    if (subtitle) lines.push(`*${subtitle}*\n`)
    lines.push(`${sourceLang} → ${targetLang}\n\n---\n`)

    for (const ch of chapters) {
      lines.push(`## Chapter ${ch.number}: ${ch.title}\n`)
      if (ch.translation) {
        lines.push(ch.translation)
      } else {
        lines.push('*Not yet translated*')
      }
      lines.push('\n\n---\n')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_translation.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-10 border-b border-parchment bg-cream/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white font-serif text-sm font-bold"
            >
              B
            </Link>
            <div className="hidden sm:block">
              <span className="font-serif font-semibold text-ink">{title}</span>
              {subtitle && (
                <span className="ml-2 text-sm text-ink-muted">{subtitle}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {searchOpen ? (
              <div className="flex items-center gap-1 rounded-lg border border-parchment bg-white px-2">
                <Search className="h-3.5 w-3.5 text-ink-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  autoFocus
                  className="w-36 border-none bg-transparent py-1.5 text-xs outline-none placeholder:text-ink-muted"
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery('') }}>
                  <X className="h-3.5 w-3.5 text-ink-muted hover:text-ink" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="rounded-lg border border-parchment p-2 text-ink-muted hover:text-ink"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleExport}
              className="rounded-lg border border-parchment p-2 text-ink-muted hover:text-ink"
              title="Export as Markdown"
            >
              <Download className="h-4 w-4" />
            </button>
            <div className="hidden sm:flex rounded-lg border border-parchment bg-white p-0.5">
              {(Object.keys(MODE_LABELS) as ViewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    mode === m
                      ? 'bg-accent text-white'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
            {isDemo && (
              <Link
                href="/sign-up"
                className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent-hover"
              >
                Sign Up
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-parchment bg-paper/50 p-5 lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Contents
          </p>
          {searchResults && (
            <p className="mt-1 text-[10px] text-accent">
              {searchResults.length} chapter{searchResults.length !== 1 ? 's' : ''} match
            </p>
          )}
          <nav className="mt-4 space-y-1">
            {chapters.map((ch) => {
              const isMatch = searchResults?.includes(ch.number)
              return (
                <a
                  key={ch.number}
                  href={`#ch-${ch.number}`}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    isMatch
                      ? 'bg-highlight text-ink font-medium'
                      : 'text-ink-light hover:bg-parchment/50 hover:text-ink'
                  }`}
                >
                  {ch.translation ? (
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 shrink-0 text-ink-muted/40" />
                  )}
                  <span className="truncate">
                    <span className="text-ink-muted">{ch.number}.</span> {ch.title}
                  </span>
                </a>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div className={`mx-auto px-6 py-10 ${mode === 'bilingual' ? 'max-w-5xl' : 'max-w-3xl'}`}>
            <div className="mb-12 text-center">
              <h1 className="font-serif text-4xl font-bold text-ink">{title}</h1>
              {subtitle && (
                <p className="mt-2 font-serif text-2xl text-ink-muted">{subtitle}</p>
              )}
              <p className="mt-4 text-sm text-ink-muted">
                {sourceLang} &rarr; {targetLang} &middot; {chapters.length} chapters
              </p>
            </div>

            <div className="space-y-16">
              {chapters.map((ch) => (
                <section key={ch.number} id={`ch-${ch.number}`}>
                  <div className="mb-6 border-b border-parchment pb-4">
                    <p className="text-xs font-medium uppercase tracking-widest text-accent">
                      Chapter {ch.number}
                    </p>
                    <h2 className="mt-1 font-serif text-2xl font-bold text-ink">
                      {ch.title}
                    </h2>
                  </div>

                  {mode === 'bilingual' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                          {sourceLang}
                        </p>
                        <div className="h-[480px] overflow-y-auto pr-2 font-serif text-[15px] leading-[1.9] text-ink whitespace-pre-wrap">
                          {ch.source || <span className="italic text-ink-muted">Content not available</span>}
                        </div>
                      </div>
                      <div className="flex flex-col rounded-xl bg-accent-light/30 p-6">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-accent">
                          {targetLang}
                        </p>
                        <div className="h-[480px] overflow-y-auto pr-2 font-serif text-[15px] leading-[1.9] text-ink whitespace-pre-wrap">
                          {ch.translation || (
                            <span className="flex items-center gap-2">
                              <span className="italic text-ink-muted">Not yet translated</span>
                              {projectId && ch.id && (
                                <button
                                  onClick={() => handleTranslate(ch.id!)}
                                  disabled={translatingIds.has(ch.id)}
                                  className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                                >
                                  {translatingIds.has(ch.id) ? (
                                    <><Loader2 className="h-3 w-3 animate-spin" /> Translating…</>
                                  ) : 'Translate'}
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === 'translation' && (
                    <div className="rounded-xl bg-accent-light/30 p-6">
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-accent">
                        {targetLang}
                      </p>
                      <div className="font-serif text-[15px] leading-[1.9] text-ink whitespace-pre-wrap">
                        {ch.translation || (
                          <span className="flex items-center gap-2">
                            <span className="italic text-ink-muted">Not yet translated</span>
                            {projectId && ch.id && (
                              <button
                                onClick={() => handleTranslate(ch.id!)}
                                disabled={translatingIds.has(ch.id)}
                                className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                              >
                                {translatingIds.has(ch.id) ? (
                                  <><Loader2 className="h-3 w-3 animate-spin" /> Translating…</>
                                ) : 'Translate'}
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {mode === 'source' && (
                    <div>
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                        {sourceLang}
                      </p>
                      <div className="font-serif text-[15px] leading-[1.9] text-ink whitespace-pre-wrap">
                        {ch.source || <span className="italic text-ink-muted">Content not available</span>}
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
