import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import StudentGroupChat from '../student/StudentGroupChat'

// Wrapper that provides group selection for trainers
// StudentGroupChat reads groupId from studentData.group_id
// For trainers, we temporarily override this via a Zustand override
export default function TrainerGroupChat() {
  const { profile } = useAuthStore()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const [selectedGroup, setSelectedGroup] = useState('')

  const { data: groups } = useQuery({
    queryKey: ['trainer-groups-chat', role],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code').order('level')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  useEffect(() => {
    if (groups?.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].id)
    }
  }, [groups, selectedGroup])

  // Temporarily inject group_id into authStore for StudentGroupChat
  const authStore = useAuthStore
  useEffect(() => {
    if (selectedGroup) {
      const current = authStore.getState()
      authStore.setState({
        studentData: { ...current.studentData, group_id: selectedGroup },
      })
    }
    return () => {
      // Restore on unmount if trainer
      const current = authStore.getState()
      if (current.profile?.role !== 'student') {
        authStore.setState({ studentData: current.studentData })
      }
    }
  }, [selectedGroup])

  return (
    <div className="space-y-3">
      {groups?.length > 1 && (
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="input-field py-2 px-3 text-sm w-auto"
        >
          {groups?.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
        </select>
      )}
      {selectedGroup && <StudentGroupChat />}
    </div>
  )
}
