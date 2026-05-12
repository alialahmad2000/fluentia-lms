import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

export default function MentionAutocomplete({ groupId, filter, onSelect, onDismiss }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIdx, setActiveIdx] = useState(0)
  const listRef = useRef(null)

  // Fetch group members: students + trainer
  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const [{ data: students }, { data: groups }] = await Promise.all([
        supabase
          .from('students')
          .select('id, profiles:profiles!inner(id, first_name_ar, last_name_ar, avatar_url)')
          .eq('group_id', groupId)
          .eq('status', 'active'),
        supabase
          .from('groups')
          .select('trainer_id, trainer:profiles!trainer_id(id, first_name_ar, last_name_ar, avatar_url)')
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
    return () => { mounted = false }
  }, [groupId])

  const filtered = filter
    ? members.filter((m) => {
        const name = `${m.first_name_ar ?? ''} ${m.last_name_ar ?? ''}`.toLowerCase()
        return name.includes(filter.toLowerCase())
      })
    : members

  // Reset active index when filter changes
  useEffect(() => { setActiveIdx(0) }, [filter])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[activeIdx]) onSelect(filtered[activeIdx])
      } else if (e.key === 'Escape') {
        onDismiss()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [filtered, activeIdx, onSelect, onDismiss])

  if (!filtered.length && !loading) return null

  return (
    <div
      ref={listRef}
      className="absolute bottom-full right-0 left-0 mb-1 mx-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl overflow-hidden z-50"
      style={{ direction: 'rtl', maxHeight: 220, overflowY: 'auto' }}
    >
      <div className="px-3 py-1.5 border-b border-[var(--border)]">
        <span className="text-[11px] text-[var(--text-muted)]" style={{ fontFamily: 'Tajawal' }}>
          أعضاء المجموعة
        </span>
      </div>

      {loading && (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {filtered.map((member, idx) => {
        const name = `${member.first_name_ar ?? ''} ${member.last_name_ar ?? ''}`.trim()
        const isActive = idx === activeIdx
        return (
          <button
            key={member.id}
            onMouseDown={(e) => { e.preventDefault(); onSelect(member) }}
            onMouseEnter={() => setActiveIdx(idx)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-right transition-colors ${
              isActive ? 'bg-sky-500/10' : 'hover:bg-[var(--surface)]'
            }`}
            style={{ minHeight: 44 }}
          >
            <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-sm shrink-0 overflow-hidden">
              {member.avatar_url
                ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                : (member.first_name_ar?.[0] ?? '?')
              }
            </div>
            <span
              className="flex-1 text-sm text-[var(--text-primary)] font-medium"
              style={{ fontFamily: 'Tajawal, sans-serif' }}
            >
              {name}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              member.role === 'trainer'
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-sky-500/10 text-sky-400'
            }`} style={{ fontFamily: 'Tajawal' }}>
              {member.role === 'trainer' ? 'مدرب' : 'طالب'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
