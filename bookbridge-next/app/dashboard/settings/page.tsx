'use client'

import { useEffect, useState } from 'react'
import { Settings, Key, Save, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'

interface SettingsData {
  apiProvider: string | null
  apiBaseUrl: string | null
  hasApiKey: boolean
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [hasExistingKey, setHasExistingKey] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: SettingsData) => {
        setProvider(data.apiProvider || 'openai')
        setBaseUrl(data.apiBaseUrl || '')
        setHasExistingKey(data.hasApiKey)
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const body: Record<string, unknown> = { apiProvider: provider }
      if (apiKey) body.apiKey = apiKey
      if (provider === 'custom' && baseUrl) body.apiBaseUrl = baseUrl
      if (provider !== 'custom') body.apiBaseUrl = null

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to save')

      const data: SettingsData = await res.json()
      setHasExistingKey(data.hasApiKey)
      setApiKey('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveKey() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: null }),
      })
      if (!res.ok) throw new Error('Failed to remove key')
      setHasExistingKey(false)
      setApiKey('')
    } catch {
      setError('Failed to remove API key.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-ink-muted" />
        <h1 className="font-serif text-2xl font-bold text-ink">Settings</h1>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Manage your translation API key.
      </p>

      {!hasExistingKey && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">API key required</p>
            <p className="mt-0.5 text-xs text-amber-700">
              BookBridge does not provide a built-in translation service. You must supply
              your own API key below to translate chapters and generate summaries.
            </p>
          </div>
        </div>
      )}

      {/* API key config */}
      <form onSubmit={handleSave} className="mt-6 rounded-xl border border-parchment bg-white p-6">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-ink-muted" />
          <h2 className="text-sm font-semibold text-ink">API Key Configuration</h2>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Your key is stored securely and only used for your own translation requests.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="mt-1 w-full rounded-lg border border-parchment px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="deepseek">DeepSeek (deepseek-chat)</option>
              <option value="claude" disabled>Anthropic (Claude) — coming soon</option>
              <option value="custom">Custom OpenAI-compatible</option>
            </select>
            <p className="mt-1 text-xs text-ink-muted">
              BookBridge uses the OpenAI API protocol. DeepSeek and any OpenAI-compatible
              endpoint are supported. Native Anthropic support is coming soon.
            </p>
          </div>

          {provider === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-ink">
                Base URL <span className="text-ink-muted font-normal">(including /v1)</span>
              </label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="mt-1 w-full rounded-lg border border-parchment px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink">API Key</label>
            {hasExistingKey && !apiKey && (
              <div className="mt-1 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Key saved
                </span>
                <button
                  type="button"
                  onClick={handleRemoveKey}
                  disabled={saving}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            )}
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasExistingKey ? 'Enter new key to replace' : 'sk-...'}
              className="mt-1 w-full rounded-lg border border-parchment px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-ink-muted">
              {provider === 'openai'
                ? 'Get your key at platform.openai.com/api-keys'
                : provider === 'deepseek'
                  ? 'Get your key at platform.deepseek.com/api_keys'
                  : 'Enter the API key for your custom provider'}
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}

        {saved && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Settings saved successfully.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </button>
      </form>
    </div>
  )
}
