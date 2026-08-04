import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Highlighter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/* ============================================================================
   HighlightableText — select any word / run of words in an IELTS passage or
   transcript to mark it in gold; tap a highlight to remove it. Highlights are
   saved per-student per-source (ielts_text_highlights) and come back on any
   device. Reused across the reading exam, the labs, and the exam review.

   A highlight is stored as { p, s, e } = paragraph index + start/end character
   offsets within that paragraph's DISPLAY text (splitParagraphs output), which
   is a pure function of the source string, so ranges stay stable across renders.
   ========================================================================== */

const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

export function splitParagraphs(content) {
  return String(content || '').split(/\n{2,}|\r\n\r\n/).map((s) => s.trim()).filter(Boolean)
}

const VARIANTS = {
  review: { fontSize: 14.5, letterW: 15, letterFs: 13, mb: 13, letterColor: 'var(--iel-ink-3)', pad: '16px 20px' },
  exam:   { fontSize: 15.5, letterW: 16, letterFs: 14, mb: 15, letterColor: 'var(--iel-ink-2)', pad: '0' },
}

function debounce(fn, ms) {
  let t
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
  d.cancel = () => clearTimeout(t)
  return d
}

// Merge a new [s,e] into paragraph p's ranges (coalesces overlaps/adjacency).
function addRange(all, p, s, e) {
  if (e <= s) return all
  const others = all.filter((r) => r.p !== p)
  const spans = all.filter((r) => r.p === p).map((r) => [r.s, r.e]).concat([[s, e]]).sort((a, b) => a[0] - b[0])
  const merged = []
  for (const [a, b] of spans) {
    const last = merged[merged.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else merged.push([a, b])
  }
  return others.concat(merged.map(([a, b]) => ({ p, s: a, e: b })))
}

// Tap-to-remove: drop the whole highlight range covering `offset` in paragraph p.
function removeAt(all, p, offset) {
  return all.filter((r) => !(r.p === p && offset >= r.s && offset <= r.e))
}

function useHighlights(sourceType, sourceId) {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const enabled = !!sourceType && !!sourceId
  const key = ['ielts-highlights', sourceType, sourceId]

  const q = useQuery({
    queryKey: key,
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_text_highlights')
        .select('highlights')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .maybeSingle()
      if (error) throw error
      return Array.isArray(data?.highlights) ? data.highlights : []
    },
  })

  const persist = useMemo(() => debounce(async (ranges) => {
    if (!userId || !enabled) return
    try {
      await supabase.from('ielts_text_highlights').upsert(
        { student_id: userId, source_type: sourceType, source_id: String(sourceId), highlights: ranges, updated_at: new Date().toISOString() },
        { onConflict: 'student_id,source_type,source_id' },
      )
    } catch { /* best-effort — a failed save never blocks reading */ }
  }, 550), [userId, enabled, sourceType, sourceId])

  useEffect(() => () => persist.cancel?.(), [persist])

  const mutate = useCallback((updater) => {
    qc.setQueryData(key, (prev) => {
      const cur = Array.isArray(prev) ? prev : []
      const next = updater(cur)
      persist(next)
      return next
    })
  }, [qc, persist]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ranges: enabled ? (q.data || []) : [], mutate, enabled }
}

// Character offset of (node, offset) within element el, flattening any nested <mark>.
function offsetInEl(el, node, offset) {
  const r = document.createRange()
  r.setStart(el, 0)
  r.setEnd(node, offset)
  return r.toString().length
}

function ParaText({ text, ranges, onRemove }) {
  const sorted = ranges.slice().sort((a, b) => a.s - b.s)
  const out = []
  let cursor = 0
  sorted.forEach((r, i) => {
    const s = Math.max(0, Math.min(r.s, text.length))
    const e = Math.max(0, Math.min(r.e, text.length))
    if (e <= s) return
    if (s > cursor) out.push(<span key={`t${i}`}>{text.slice(cursor, s)}</span>)
    out.push(
      <mark
        key={`m${i}`}
        data-hl="1"
        onClick={(ev) => { ev.stopPropagation(); onRemove(Math.floor((s + e) / 2)) }}
        style={{ background: 'color-mix(in srgb, var(--iel-gold) 30%, transparent)', color: 'var(--iel-ink)', borderRadius: 3, boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--iel-gold) 30%, transparent)', padding: '0 1px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
      >
        {text.slice(s, e)}
      </mark>,
    )
    cursor = e
  })
  if (cursor < text.length) out.push(<span key="tend">{text.slice(cursor)}</span>)
  return <>{out}</>
}

export default function HighlightableText({ text, sourceType, sourceId, lettered = true, variant = 'review' }) {
  const v = VARIANTS[variant] || VARIANTS.review
  const paras = useMemo(() => splitParagraphs(text), [text])
  const { ranges, mutate, enabled } = useHighlights(sourceType, sourceId)
  const containerRef = useRef(null)
  const [pill, setPill] = useState(null) // { x, y }

  const byPara = useMemo(() => {
    const m = new Map()
    for (const r of ranges) { if (!m.has(r.p)) m.set(r.p, []); m.get(r.p).push(r) }
    return m
  }, [ranges])

  // Watch the selection; when a stable, non-empty selection lands inside our
  // container, float a "ظلّل" pill above it (works on touch + mouse).
  useEffect(() => {
    if (!enabled) return
    const onSel = debounce(() => {
      const sel = window.getSelection()
      const cont = containerRef.current
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !cont) { setPill(null); return }
      const range = sel.getRangeAt(0)
      if (!cont.contains(range.commonAncestorContainer) || !range.toString().trim()) { setPill(null); return }
      const rect = range.getBoundingClientRect()
      if (!rect || (rect.width === 0 && rect.height === 0)) { setPill(null); return }
      setPill({ x: rect.left + rect.width / 2, y: rect.top })
    }, 120)
    const onScroll = () => setPill(null)
    document.addEventListener('selectionchange', onSel)
    window.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('selectionchange', onSel); window.removeEventListener('scroll', onScroll, true); onSel.cancel?.() }
  }, [enabled])

  const applyHighlight = useCallback(() => {
    const sel = window.getSelection()
    const cont = containerRef.current
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !cont) return
    const range = sel.getRangeAt(0)
    const additions = []
    cont.querySelectorAll('[data-hl-para]').forEach((el) => {
      if (!range.intersectsNode(el)) return
      const p = Number(el.dataset.hlPara)
      const len = el.textContent.length
      const startsHere = el.contains(range.startContainer)
      const endsHere = el.contains(range.endContainer)
      const s = startsHere ? offsetInEl(el, range.startContainer, range.startOffset) : 0
      const e = endsHere ? offsetInEl(el, range.endContainer, range.endOffset) : len
      if (e > s) additions.push({ p, s, e })
    })
    if (additions.length) mutate((prev) => additions.reduce((acc, a) => addRange(acc, a.p, a.s, a.e), prev))
    sel.removeAllRanges()
    setPill(null)
  }, [mutate])

  const removeInPara = useCallback((p, offset) => { mutate((prev) => removeAt(prev, p, offset)) }, [mutate])

  if (!paras.length) return null

  return (
    <>
      {enabled && ranges.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: variant === 'exam' ? '0 0 10px' : '4px 20px 8px', fontSize: 11.5, color: 'var(--iel-ink-3)', fontFamily: "'Tajawal', sans-serif", direction: 'rtl', textAlign: 'right' }}>
          <Highlighter size={12} /> ظلِّل أي كلمة بتحديدها · انقر التظليل لإزالته
        </div>
      )}
      <div ref={containerRef} style={{ padding: v.pad, direction: 'ltr' }}>
        {paras.map((para, i) => (
          <p key={i} style={{ display: 'flex', alignItems: 'baseline', gap: lettered ? 10 : 0, margin: `0 0 ${v.mb}px`, fontSize: v.fontSize, color: 'var(--iel-ink)', fontFamily: SANS, lineHeight: 1.75, textAlign: 'left' }}>
            {lettered && <span style={{ flex: 'none', width: v.letterW, fontWeight: 800, color: v.letterColor, fontSize: v.letterFs }}>{String.fromCharCode(65 + i)}</span>}
            <span
              data-hl-para={i}
              style={{ flex: 1, userSelect: 'text', WebkitUserSelect: 'text', cursor: 'text' }}
            >
              <ParaText text={para} ranges={byPara.get(i) || []} onRemove={(off) => removeInPara(i, off)} />
            </span>
          </p>
        ))}
      </div>
      {pill && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
          onClick={applyHighlight}
          style={{
            position: 'fixed', left: pill.x, top: pill.y - 46, transform: 'translateX(-50%)', zIndex: 60,
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 999,
            background: 'var(--iel-gold)', color: '#1a1405', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 800, fontFamily: "'Tajawal', sans-serif",
            boxShadow: '0 8px 22px -6px rgba(0,0,0,.7), 0 0 0 1px color-mix(in srgb, var(--iel-gold) 40%, transparent)',
          }}
        >
          <Highlighter size={15} /> ظلِّل
        </button>
      )}
    </>
  )
}
