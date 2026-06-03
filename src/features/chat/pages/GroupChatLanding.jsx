// Routes the user into their group's general channel. Handles the
// no-group / error cases instead of spinning forever.
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'

export default function GroupChatLanding() {
  const navigate = useNavigate()
  const { profile, studentData } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData })))
  const [state, setState] = useState('loading') // loading | none | error

  useEffect(() => {
    let mounted = true
    async function redirect() {
      if (!profile) return
      try {
        if (profile.role === 'student') {
          const groupId = studentData?.group_id
          if (!mounted) return
          if (groupId) navigate(`/chat/${groupId}/general`, { replace: true })
          else setState('none')
          return
        }

        let q = supabase.from('groups').select('id').order('level', { ascending: true }).limit(1)
        if (profile.role === 'trainer') q = q.eq('trainer_id', profile.id)
        const { data: groups, error } = await q
        if (!mounted) return
        if (error) { setState('error'); return }
        if (groups?.[0]) navigate(`/chat/${groups[0].id}/general`, { replace: true })
        else setState('none')
      } catch {
        if (mounted) setState('error')
      }
    }
    redirect()
    return () => { mounted = false }
  }, [profile, studentData, navigate])

  if (state === 'none' || state === 'error') {
    const isErr = state === 'error'
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-8 text-center" style={{ minHeight: '50vh', direction: 'rtl' }}>
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 72, height: 72,
            background: 'color-mix(in srgb, var(--ds-accent-gold) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ds-accent-gold) 28%, transparent)',
          }}
        >
          {isErr ? <AlertCircle size={26} style={{ color: 'var(--ds-accent-danger)' }} /> : <MessageSquare size={26} style={{ color: 'var(--ds-accent-gold)' }} />}
        </div>
        <div>
          <h3 className="mb-1" style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 18, color: 'var(--ds-text-primary)' }}>
            {isErr ? 'تعذّر فتح المحادثة' : 'لا توجد مجموعة بعد'}
          </h3>
          <p style={{ fontFamily: 'Tajawal', fontSize: 14, color: 'var(--ds-text-secondary)', lineHeight: 1.7 }}>
            {isErr
              ? 'حدث خطأ أثناء التحميل. حاول مرة أخرى بعد قليل.'
              : 'لم يتم إضافتك إلى مجموعة محادثة حتى الآن. تواصل مع مدربك.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'color-mix(in srgb, var(--ds-accent-gold) 40%, transparent)', borderTopColor: 'transparent' }} />
    </div>
  )
}
