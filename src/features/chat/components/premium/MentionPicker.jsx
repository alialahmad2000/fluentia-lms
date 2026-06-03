import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { senderColor, senderGradient } from '../../lib/senderColors'
import { popIn } from '../../lib/motion'
import { supabase } from '../../../../lib/supabase'
import SenderAvatar from './SenderAvatar'

// ── Arabic-aware normalisation ───────────────────────────────────────────────
// Strip tashkeel/tatweel, unify alef/hamza/ya/ta-marbuta forms, lowercase Latin,
// so "أحمد"/"احمد"/"احمَد" and "Ali"/"ali" all match the same way.
const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g
function normalize(str) {
  return String(str || '')
    .replace(TASHKEEL, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim()
}

// Subsequence test — every char of `q` appears in `text` in order.
function isSubsequence(q, text) {
  if (!q) return true
  let i = 0
  for (let j = 0; j < text.length && i < q.length; j++) {
    if (text[j] === q[i]) i++
  }
  return i === q.length
}

// Rank a member against the normalised query. Lower score = stronger match.
// surname-start (0) > name-start (1) > word-start (2) > substring (3) > subsequence (4).
// Returns null when there is no match at all.
function rankMember(member, q) {
  const full = normalize(
    `${member.first_name_ar ?? ''} ${member.last_name_ar ?? ''}`,
  )
  const first = normalize(member.first_name_ar)
  const last = normalize(member.last_name_ar)
  const words = full.split(/\s+/).filter(Boolean)

  if (!q) return 2 // no filter → neutral, keep input order (trainer pin still applies)

  if (last && last.startsWith(q)) return 0
  if (first && first.startsWith(q)) return 1
  if (words.some((w) => w.startsWith(q))) return 2
  if (full.includes(q)) return 3
  if (isSubsequence(q, full)) return 4
  return null
}

// Find the [start, end) slice of the rendered name to wrap in <mark>.
// Matches the contiguous normalised query inside the display name; falls back to
// a per-word start match. Indexing is on the ORIGINAL (un-normalised) string so
// the highlight lands on the visible characters.
function matchRange(name, rawFilter) {
  const q = normalize(rawFilter)
  if (!q) return null
  const lowerName = name.toLowerCase()

  // 1) direct contiguous substring (works for Latin + most Arabic since
  //    normalisation rarely changes length for the common forms here)
  const idx = normalize(name).indexOf(q)
  if (idx >= 0 && idx + q.length <= name.length) {
    return [idx, idx + q.length]
  }

  // 2) word-start fallback on the raw name
  const m = lowerName.match(
    new RegExp(`(^|\\s)(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'),
  )
  if (m) {
    const start = m.index + m[1].length
    return [start, start + m[2].length]
  }
  return null
}

function HighlightedName({ name, rawFilter, markColor }) {
  const range = useMemo(() => matchRange(name, rawFilter), [name, rawFilter])
  if (!range) return <>{name}</>
  const [start, end] = range
  return (
    <>
      {name.slice(0, start)}
      <mark
        style={{
          background: 'transparent',
          color: markColor,
          fontWeight: 800,
          padding: 0,
        }}
      >
        {name.slice(start, end)}
      </mark>
      {name.slice(end)}
    </>
  )
}

export default function MentionPicker({ groupId, filter, onSelect, onDismiss }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIdx, setActiveIdx] = useState(0)
  const listRef = useRef(null)
  const rowRefs = useRef([])

  // ── Fetch group members (mirrors MentionAutocomplete's query + shape) ──────
  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const [{ data: students }, { data: groups }] = await Promise.all([
        supabase
          .from('students')
          .select(
            'id, profiles:profiles!inner(id, first_name_ar, last_name_ar, avatar_url)',
          )
          .eq('group_id', groupId)
          .eq('status', 'active'),
        supabase
          .from('groups')
          .select(
            'trainer_id, trainer:profiles!trainer_id(id, first_name_ar, last_name_ar, avatar_url)',
          )
          .eq('id', groupId)
          .maybeSingle(),
      ])
      if (!mounted) return

      const result = []
      if (students) {
        students.forEach((s) => {
          if (s.profiles) result.push({ ...s.profiles, role: 'student' })
        })
      }
      if (groups?.trainer) {
        result.push({ ...groups.trainer, role: 'trainer' })
      }
      setMembers(result)
      setLoading(false)
    }
    if (groupId) load()
    return () => {
      mounted = false
    }
  }, [groupId])

  // ── Fuzzy filter + rank + trainer pin ──────────────────────────────────────
  const filtered = useMemo(() => {
    const q = normalize(filter)
    return members
      .map((m) => ({ member: m, rank: rankMember(m, q) }))
      .filter((x) => x.rank !== null)
      .sort((a, b) => {
        // trainers pinned to top
        const at = a.member.role === 'trainer' ? 0 : 1
        const bt = b.member.role === 'trainer' ? 0 : 1
        if (at !== bt) return at - bt
        if (a.rank !== b.rank) return a.rank - b.rank
        const an = normalize(
          `${a.member.first_name_ar ?? ''} ${a.member.last_name_ar ?? ''}`,
        )
        const bn = normalize(
          `${b.member.first_name_ar ?? ''} ${b.member.last_name_ar ?? ''}`,
        )
        return an.localeCompare(bn, 'ar')
      })
      .map((x) => x.member)
  }, [members, filter])

  // Reset highlight when the result set changes
  useEffect(() => {
    setActiveIdx(0)
  }, [filter, members])

  // Keep the active row in view
  useEffect(() => {
    const el = rowRefs.current[activeIdx]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const select = useCallback(
    (member) => {
      if (member) onSelect(member)
    },
    [onSelect],
  )

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filtered[activeIdx]) {
          e.preventDefault()
          select(filtered[activeIdx])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onDismiss()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [filtered, activeIdx, select, onDismiss])

  if (!filtered.length && !loading) return null

  return (
    <motion.div
      {...popIn}
      ref={listRef}
      role="listbox"
      style={{
        position: 'absolute',
        bottom: '100%',
        insetInlineStart: 0,
        insetInlineEnd: 0,
        marginInlineStart: 12,
        marginInlineEnd: 12,
        marginBottom: 4,
        zIndex: 50,
        direction: 'rtl',
        transformOrigin: 'bottom center',
        maxHeight: 'min(280px, 38vh)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        background:
          'color-mix(in srgb, var(--ds-bg-elevated) 94%, transparent)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 16,
        boxShadow: '0 -12px 40px -12px rgba(0,0,0,0.55)',
        padding: 4,
      }}
    >
      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
               style={{ borderColor: 'var(--ds-accent-primary)', borderTopColor: 'transparent' }} />
        </div>
      )}

      {!loading &&
        filtered.map((member, idx) => {
          const color = senderColor(member.id)
          const name = `${member.first_name_ar ?? ''} ${member.last_name_ar ?? ''}`.trim()
          const isTrainer = member.role === 'trainer'
          const isActive = idx === activeIdx

          return (
            <div
              key={member.id}
              ref={(el) => (rowRefs.current[idx] = el)}
              role="option"
              aria-selected={isActive}
              onMouseDown={(e) => {
                e.preventDefault()
                select(member)
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 56,
                paddingInlineStart: 12,
                paddingInlineEnd: 12,
                paddingBlock: 8,
                borderRadius: 12,
                cursor: 'pointer',
                touchAction: 'manipulation',
                transition: 'background 120ms ease',
                background: isActive
                  ? `color-mix(in srgb, ${color.base} 12%, transparent)`
                  : 'transparent',
                borderInlineEnd: isActive
                  ? `2.5px solid ${color.base}`
                  : '2.5px solid transparent',
              }}
            >
              <SenderAvatar sender={member} senderId={member.id} size={40} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'Tajawal, sans-serif',
                    fontWeight: 700,
                    fontSize: 15,
                    lineHeight: 1.25,
                    color: 'var(--ds-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <HighlightedName
                    name={name}
                    rawFilter={filter}
                    markColor={color.base}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 2,
                    fontFamily: 'Tajawal, sans-serif',
                    fontSize: 12,
                    lineHeight: 1.2,
                    color: isTrainer
                      ? 'var(--ds-accent-gold)'
                      : 'var(--ds-text-tertiary)',
                  }}
                >
                  {isTrainer ? (
                    <>
                      <Star size={12} fill="currentColor" strokeWidth={0} />
                      <span>مدرب</span>
                    </>
                  ) : (
                    <span>طالب</span>
                  )}
                </div>
              </div>

              {isActive && (
                <span
                  aria-hidden
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    color: color.base,
                    opacity: 0.9,
                    flex: '0 0 auto',
                  }}
                >
                  ↵
                </span>
              )}
            </div>
          )
        })}
    </motion.div>
  )
}
