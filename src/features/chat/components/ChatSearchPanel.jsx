import { useState } from 'react'
import { X, Search, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useChatSearch } from '../queries/useChatSearch'

export default function ChatSearchPanel({ groupId, onClose }) {
  const [query, setQuery] = useState('')
  const [channelSlug, setChannelSlug] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const navigate = useNavigate()

  const { data: results = [], isLoading } = useChatSearch({
    groupId,
    query: submitted ? query : null,
    channelId: null, // channel_id not slug — skip for now, filter by slug client-side
    fromDate: fromDate || null,
    toDate: toDate || null,
    enabled: submitted && !!groupId,
  })

  // Client-side channel slug filter (search RPC filters by channel_id UUID;
  // for now we let all results through and filter by slug after)
  const filtered = channelSlug
    ? results.filter((r) => r.channel_slug === channelSlug)
    : results

  function handleSearch(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  function handleResultClick(result) {
    onClose()
    navigate(`/chat/${groupId}/${result.channel_slug}/m/${result.id}`)
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const bodyText = (r) => r.body || r.content || ''

  return (
    <>
      {/* Backdrop (mobile full-screen, desktop right drawer) */}
      <div
        className="fixed inset-0 z-40 bg-black/40 md:bg-transparent"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 md:inset-auto md:top-0 md:left-0 md:bottom-0 md:w-96 flex flex-col bg-[var(--bg-card)] border-l border-[var(--border)] shadow-2xl"
        style={{ direction: 'rtl', maxHeight: '100dvh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <Search size={18} className="text-[var(--text-muted)] shrink-0" />
          <span
            className="flex-1 font-semibold text-[var(--text-primary)]"
            style={{ fontFamily: 'Tajawal, sans-serif' }}
          >
            بحث في المحادثة
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="px-4 py-3 space-y-2 border-b border-[var(--border)]">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSubmitted(false) }}
            placeholder="ابحثي عن رسالة..."
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500/50 transition-colors"
            style={{ fontFamily: 'Tajawal, sans-serif', direction: 'auto' }}
            autoFocus
          />

          {/* Filters row */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={channelSlug}
              onChange={(e) => setChannelSlug(e.target.value)}
              placeholder="القناة (general…)"
              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500/40"
              style={{ fontFamily: 'Tajawal, sans-serif' }}
            />
            <div className="flex gap-1">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--text-muted)] focus:outline-none focus:border-sky-500/40"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--text-muted)] focus:outline-none focus:border-sky-500/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!query.trim()}
            className="w-full py-2 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: 'Tajawal, sans-serif' }}
          >
            بحث
          </button>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-sky-400" />
            </div>
          )}

          {submitted && !isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-[var(--text-muted)]" style={{ fontFamily: 'Tajawal' }}>
              <Search size={36} className="opacity-20" />
              <p className="text-sm">لا توجد نتائج</p>
            </div>
          )}

          {filtered.map((result) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result)}
              className="w-full text-right px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors"
              style={{ direction: 'rtl' }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] text-sky-400 font-mono">#{result.channel_slug}</span>
                <span className="text-[11px] text-[var(--text-muted)]">{formatDate(result.created_at)}</span>
              </div>
              <p
                className="text-sm text-[var(--text-primary)] line-clamp-2 text-right"
                style={{ fontFamily: 'Tajawal, sans-serif', direction: 'auto' }}
              >
                {bodyText(result) || <span className="italic text-[var(--text-muted)]">🎙️ رسالة صوتية</span>}
              </p>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
