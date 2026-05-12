// Phase F will flesh this out — stub routes the user to their group's general channel
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'

export default function GroupChatLanding() {
  const navigate = useNavigate()
  const { profile, studentData } = useAuthStore()

  useEffect(() => {
    let mounted = true
    async function redirect() {
      if (!profile) return

      if (profile.role === 'student') {
        const groupId = studentData?.group_id
        if (groupId && mounted) {
          navigate(`/chat/${groupId}/general`, { replace: true })
        }
        return
      }

      if (profile.role === 'trainer') {
        const { data: groups } = await supabase
          .from('groups')
          .select('id')
          .eq('trainer_id', profile.id)
          .limit(1)
        if (mounted && groups?.[0]) {
          navigate(`/chat/${groups[0].id}/general`, { replace: true })
        }
        return
      }

      // admin: pick first group
      const { data: groups } = await supabase
        .from('groups')
        .select('id')
        .limit(1)
      if (mounted && groups?.[0]) {
        navigate(`/chat/${groups[0].id}/general`, { replace: true })
      }
    }
    redirect()
    return () => { mounted = false }
  }, [profile, studentData, navigate])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
