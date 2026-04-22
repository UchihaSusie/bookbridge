'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2 } from 'lucide-react'

export default function NewProjectPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [targetLang, setTargetLang] = useState('zh-Hans')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [chapterMode, setChapterMode] = useState<'auto' | 'manual'>('auto')
  const [chapterCount, setChapterCount] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return setError('Please select a PDF file.')
    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title || file.name.replace(/\.pdf$/i, ''))
      formData.append('targetLang', targetLang)
      if (chapterMode === 'manual' && chapterCount) {
        formData.append('chapterCount', chapterCount)
      }

      const res = await fetch('/api/upload', { method: 'POST', body: formData })

      let data: Record<string, unknown> = {}
      try {
        data = await res.json()
      } catch {
        throw new Error(
          'Processing timed out — the PDF may be too large. Try a file under 200 pages, or split the PDF first.'
        )
      }

      if (!res.ok) throw new Error((data.error as string) || 'Upload failed')
      router.push(`/dashboard/projects/${data.projectId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-serif text-2xl font-bold text-ink">New Translation Project</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Upload a PDF to start translating.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-ink">Project Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Book"
            className="mt-1 w-full rounded-lg border border-parchment px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">Target Language</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="mt-1 w-full rounded-lg border border-parchment px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="zh-Hans">Chinese (Simplified)</option>
            <option value="es">Spanish</option>
            <option value="ar">Arabic</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">PDF File</label>
          <div
            data-testid="dropzone"
            className="mt-1 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-parchment px-6 py-10 hover:border-accent/40"
            onClick={(e) => { if (e.target !== fileInputRef.current) fileInputRef.current?.click() }}
          >
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-ink-muted" />
              <p className="mt-2 text-sm text-ink-light">
                {file ? file.name : 'Click to upload a PDF'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null
                  if (selected && !selected.name.toLowerCase().endsWith('.pdf')) {
                    setError('Only PDF files are supported.')
                    setFile(null)
                  } else {
                    setError('')
                    setFile(selected)
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">Chapter Detection</label>
          <div className="mt-1 flex rounded-lg border border-parchment overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setChapterMode('auto')}
              className={`flex-1 px-4 py-2 font-medium transition-colors ${
                chapterMode === 'auto'
                  ? 'bg-accent text-white'
                  : 'bg-white text-ink-light hover:bg-parchment/30'
              }`}
            >
              Auto-detect
            </button>
            <button
              type="button"
              onClick={() => setChapterMode('manual')}
              className={`flex-1 px-4 py-2 font-medium transition-colors ${
                chapterMode === 'manual'
                  ? 'bg-accent text-white'
                  : 'bg-white text-ink-light hover:bg-parchment/30'
              }`}
            >
              Manual
            </button>
          </div>
          {chapterMode === 'auto' && (
            <p className="mt-1.5 text-xs text-ink-muted">
              Detects chapters, parts, roman numerals, and common foreign headings automatically.
            </p>
          )}
          {chapterMode === 'manual' && (
            <div className="mt-2">
              <input
                type="number"
                min={1}
                value={chapterCount}
                onChange={(e) => setChapterCount(e.target.value)}
                placeholder="How many chapters?"
                className="w-full rounded-lg border border-parchment px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <p className="mt-1.5 text-xs text-ink-muted">
                Pages will be divided evenly. Use this when auto-detect gets it wrong.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex w-full items-center justify-center rounded-lg border border-parchment px-4 py-2.5 text-sm font-medium text-ink-light hover:bg-parchment/30"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Create Project
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
