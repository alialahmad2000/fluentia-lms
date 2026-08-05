import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Highlighter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/* ============================================================================
   Text highlighting for the IELTS exam — select any word / run of words in a
   passage, transcript, question stem, or answer choice to mark it in gold; tap
   a highlight to remove it. Saved per-student per-source (ielts_text_highlights)
   so it comes back on any device.

   A highlight is stored as { b, s, e } = block key + start/end character offsets
   within that block's DISPLAY text. `b` is a string: paragraph index for a
   passage ("0","1",…), or a question block id ("q3_stem","q3_opt1"…). Legacy
   rows used a numeric `p` (paragraph index) — read as `b ?? p` for compatibility.

   HighlightSurface  — provider: owns the selection→offset mapping + the "ظلِّل"
                       pill + the persisted ranges for one (sourceType, sourceId).
   HighlightableBlock — an inline highlightable text span (one block).
   HighlightableText  — the passage/transcript wrapper (paragraphs = blocks).
   ========================================================================== */

const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const HL_CTX = createContext(null)
const rkey = (r) => String(r.b ?? r.p)   // legacy rows stored numeric `p`

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

// Merge a new [s,e] into block `key`'s ranges (coalesces overlaps/adjacency).
function addRange(all, key, s, e) {
  key = String(key)
  if (e <= s) return all
  const others = all.filter((r) => rkey(r) !== key)
  const spans = all.filter((r) => rkey(r) === key).map((r) => [r.s, r.e]).concat([[s, e]]).sort((a, b) => a[0] - b[0])
  const merged = []
  for (const [a, b] of spans) {
    const last = merged[merged.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else merged.push([a, b])
  }
  return others.concat(merged.map(([a, b]) => ({ b: key, s: a, e: b })))
}

// Tap-to-remove: drop the whole highlight range covering `offset` in block `key`.
function removeAt(all, key, offset) {
  key = String(key)
  return all.filter((r) => !(rkey(r) === key && offset >= r.s && offset <= r.e))
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

// One block's text with its highlight marks rendered inline.
function MarkedText({ text, ranges, onRemove }) {
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

// ── The surface: manages the pill + selection→(block,offset) mapping for every
//    HighlightableBlock inside it, sharing one persisted (sourceType, sourceId). ──
export function HighlightSurface({ sourceType, sourceId, children, style }) {
  const { ranges, mutate, enabled } = useHighlights(sourceType, sourceId)
  const rootRef = useRef(null)
  const [pill, setPill] = useState(null)

  useEffect(() => {
    if (!enabled) return
    const onSel = debounce(() => {
      const sel = window.getSelection()
      const cont = rootRef.current
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
    const cont = rootRef.current
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !cont) return
    const range = sel.getRangeAt(0)
    const additions = []
    cont.querySelectorAll('[data-hl-block]').forEach((el) => {
      if (!range.intersectsNode(el)) return
      const b = el.dataset.hlBlock
      const len = el.textContent.length
      const startsHere = el.contains(range.startContainer)
      const endsHere = el.contains(range.endContainer)
      const s = startsHere ? offsetInEl(el, range.startContainer, range.startOffset) : 0
      const e = endsHere ? offsetInEl(el, range.endContainer, range.endOffset) : len
      if (e > s) additions.push({ b, s, e })
    })
    if (additions.length) mutate((prev) => additions.reduce((acc, a) => addRange(acc, a.b, a.s, a.e), prev))
    sel.removeAllRanges()
    setPill(null)
  }, [mutate])

  const removeInBlock = useCallback((b, offset) => { mutate((prev) => removeAt(prev, b, offset)) }, [mutate])

  const ctx = useMemo(() => ({ ranges, enabled, removeInBlock }), [ranges, enabled, removeInBlock])

  return (
    <HL_CTX.Provider value={ctx}>
      <div ref={rootRef} style={style}>{children}</div>
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
    </HL_CTX.Provider>
  )
}

// ── An inline highlightable text block. Renders plain text (no-op) when it is
//    NOT inside a HighlightSurface, so it's safe to drop into any renderer. ──
export function HighlightableBlock({ blockKey, children, style }) {
  const ctx = useContext(HL_CTX)
  const text = typeof children === 'string' ? children : (children == null ? '' : String(children))
  if (!ctx || !ctx.enabled) return <>{text}</>
  const bk = String(blockKey)
  const mine = ctx.ranges.filter((r) => rkey(r) === bk)
  return (
    <span data-hl-block={bk} style={{ userSelect: 'text', WebkitUserSelect: 'text', ...style }}>
      <MarkedText text={text} ranges={mine} onRemove={(off) => ctx.removeInBlock(bk, off)} />
    </span>
  )
}

// The one-line discovery hint — shown until the first highlight exists.
export function HighlightHint({ padding }) {
  const ctx = useContext(HL_CTX)
  if (!ctx?.enabled || ctx.ranges.length) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: padding || '4px 20px 8px', fontSize: 11.5, color: 'var(--iel-ink-3)', fontFamily: "'Tajawal', sans-serif", direction: 'rtl', textAlign: 'right' }}>
      <Highlighter size={12} /> ظلِّل أي كلمة بتحديدها · انقر التظليل لإزالته
    </div>
  )
}

// ── Passage / transcript — paragraphs are the highlight blocks. ──
export default function HighlightableText({ text, sourceType, sourceId, lettered = true, variant = 'review' }) {
  const v = VARIANTS[variant] || VARIANTS.review
  const paras = useMemo(() => splitParagraphs(text), [text])
  if (!paras.length) return null

  return (
    <HighlightSurface sourceType={sourceType} sourceId={sourceId}>
      <HighlightHint padding={variant === 'exam' ? '0 0 10px' : '4px 20px 8px'} />
      <div style={{ padding: v.pad, direction: 'ltr' }}>
        {paras.map((para, i) => (
          <p key={i} style={{ display: 'flex', alignItems: 'baseline', gap: lettered ? 10 : 0, margin: `0 0 ${v.mb}px`, fontSize: v.fontSize, color: 'var(--iel-ink)', fontFamily: SANS, lineHeight: 1.75, textAlign: 'left' }}>
            {lettered && <span style={{ flex: 'none', width: v.letterW, fontWeight: 800, color: v.letterColor, fontSize: v.letterFs }}>{String.fromCharCode(65 + i)}</span>}
            <HighlightableBlock blockKey={String(i)} style={{ flex: 1, cursor: 'text' }}>{para}</HighlightableBlock>
          </p>
        ))}
      </div>
    </HighlightSurface>
  )
}
