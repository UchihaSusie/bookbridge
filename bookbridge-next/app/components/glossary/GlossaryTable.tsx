'use client'

import { useMemo, useState } from 'react'
import { Trash2, Plus, Search } from 'lucide-react'

export type GlossaryTerm = {
  id: string
  english: string
  translation: string | null
  category: string
  approved: boolean
  userEdited: boolean
  notes?: string | null
}

type Props = {
  projectId: string
  initialTerms: GlossaryTerm[]
}

const CATEGORIES = ['general', 'person', 'place', 'organization', 'technical']

export default function GlossaryTable({ projectId, initialTerms }: Props) {
  const [terms, setTerms] = useState<GlossaryTerm[]>(initialTerms)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [newEnglish, setNewEnglish] = useState('')
  const [newTranslation, setNewTranslation] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [isAdding, setIsAdding] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return terms
    return terms.filter((t) => t.english.toLowerCase().includes(q))
  }, [terms, search])

  async function addTerm() {
    if (!newEnglish.trim() || isAdding) return
    setIsAdding(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/glossary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english: newEnglish.trim(),
          translation: newTranslation.trim() || undefined,
          category: newCategory,
        }),
      })
      if (!res.ok) throw new Error('add failed')
      const body = (await res.json()) as { data: GlossaryTerm }
      setTerms((prev) => [...prev, body.data])
      setNewEnglish('')
      setNewTranslation('')
      setError(null)
    } catch {
      setError('Failed to add term. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  // patch is intentionally narrow: only fields the PATCH route's Zod schema
  // accepts. Passing server-ignored keys here would let the optimistic UI
  // diverge from the eventual server response.
  type TermPatch = Partial<Pick<GlossaryTerm, 'translation' | 'approved' | 'category'>>

  async function patchTerm(id: string, patch: TermPatch) {
    const snapshot = terms
    setTerms((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    )
    try {
      const res = await fetch(`/api/projects/${projectId}/glossary/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('patch failed')
      const body = (await res.json()) as { data: GlossaryTerm }
      setTerms((prev) => prev.map((t) => (t.id === id ? body.data : t)))
      setError(null)
    } catch {
      setTerms(snapshot)
      setError('Failed to save change. Your edit was reverted.')
    }
  }

  async function deleteTerm(id: string) {
    const snapshot = terms
    setTerms((prev) => prev.filter((t) => t.id !== id))
    setDeletingId(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/glossary/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('delete failed')
      setError(null)
    } catch {
      setTerms(snapshot)
      setError('Failed to delete term. Please try again.')
    }
  }

  async function approveAll() {
    const unapproved = terms.filter((t) => !t.approved)
    if (unapproved.length === 0 || approvingAll) return
    setApprovingAll(true)
    const snapshot = terms
    setTerms((prev) => prev.map((t) => ({ ...t, approved: true })))
    try {
      await Promise.all(
        unapproved.map((t) =>
          fetch(`/api/projects/${projectId}/glossary/${t.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approved: true }),
          })
        )
      )
      setError(null)
    } catch {
      setTerms(snapshot)
      setError('Failed to approve all terms. Please try again.')
    } finally {
      setApprovingAll(false)
    }
  }

  function startEdit(term: GlossaryTerm) {
    setDraftValue(term.translation ?? '')
    setEditingId(term.id)
  }

  function commitEdit(term: GlossaryTerm) {
    const next = draftValue
    setEditingId(null)
    if (next === (term.translation ?? '')) return
    patchTerm(term.id, { translation: next })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Search glossary by English term"
            placeholder="Search terms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-zinc-300 bg-white py-1.5 pl-8 pr-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        {terms.some((t) => !t.approved) && (
          <button
            type="button"
            onClick={approveAll}
            disabled={approvingAll}
            className="inline-flex items-center gap-1 rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {approvingAll
              ? 'Approving…'
              : `Approve All (${terms.filter((t) => !t.approved).length})`}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <input
          placeholder="English"
          aria-label="English term"
          value={newEnglish}
          onChange={(e) => setNewEnglish(e.target.value)}
          className="flex-1 min-w-[8rem] rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <input
          placeholder="Translation"
          aria-label="Translation"
          value={newTranslation}
          onChange={(e) => setNewTranslation(e.target.value)}
          className="flex-1 min-w-[8rem] rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <select
          aria-label="Category"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addTerm}
          disabled={isAdding || !newEnglish.trim()}
          className="inline-flex items-center gap-1 rounded bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          <Plus className="h-4 w-4" />
          Add term
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 text-left font-medium">English</th>
              <th className="px-3 py-2 text-left font-medium">Translation</th>
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-center font-medium" title="Unapproved terms are strong suggestions to the LLM; approved terms MUST be followed verbatim.">
                Approved
              </th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {visible.map((t) => {
              const isUnreviewed = !t.userEdited && !t.approved
              const isEditing = editingId === t.id
              const isDeleting = deletingId === t.id
              return (
                <tr
                  key={t.id}
                  className={
                    isUnreviewed
                      ? 'unreviewed bg-amber-50/40 dark:bg-amber-950/20'
                      : ''
                  }
                  data-unreviewed={isUnreviewed ? 'true' : undefined}
                >
                  <td className="px-3 py-2 font-medium">{t.english}</td>
                  <td
                    className="cursor-text px-3 py-2"
                    onClick={() => !isEditing && startEdit(t)}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        aria-label={`Edit translation for ${t.english}`}
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        onBlur={() => commitEdit(t)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          } else if (e.key === 'Escape') {
                            setEditingId(null)
                          }
                        }}
                        className="w-full rounded border border-zinc-300 bg-white px-2 py-0.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                      />
                    ) : (
                      t.translation ?? '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Approve ${t.english}`}
                      checked={t.approved}
                      onChange={(e) =>
                        patchTerm(t.id, { approved: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isDeleting ? (
                      <span className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => deleteTerm(t.id)}
                          className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Delete ${t.english}`}
                        onClick={() => setDeletingId(t.id)}
                        className="rounded p-1 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            {terms.length === 0
              ? 'No terms yet. New terms will appear here as you translate chapters.'
              : 'No terms match your search.'}
          </p>
        )}
      </div>
    </div>
  )
}
