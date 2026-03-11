import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Shuffle, Trash2, Loader2, Zap, UserPlus, UserMinus } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const TEAM_EMOJIS = ['🦁', '🐺', '🦅', '🐉', '🦊', '🦈', '🐻', '🦇']
const TEAM_COLORS = ['sky', 'gold', 'rose', 'violet', 'emerald', 'orange', 'blue', 'red']

export default function TrainerTeams() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const [selectedGroup, setSelectedGroup] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamEmoji, setTeamEmoji] = useState('🦁')
  const [teamColor, setTeamColor] = useState('sky')
  const [toast, setToast] = useState(null)

  // Groups
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups', role],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code').order('level')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  useEffect(() => {
    if (groups?.length > 0 && !selectedGroup) setSelectedGroup(groups[0].id)
  }, [groups, selectedGroup])

  // Teams in group
  const { data: teams, isLoading } = useQuery({
    queryKey: ['trainer-teams', selectedGroup],
    queryFn: async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name, emoji, color, total_xp')
        .eq('group_id', selectedGroup)
        .order('total_xp', { ascending: false })
      return data || []
    },
    enabled: !!selectedGroup,
  })

  // Team members
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', selectedGroup],
    queryFn: async () => {
      const teamIds = (teams || []).map(t => t.id)
      if (!teamIds.length) return {}

      const { data } = await supabase
        .from('team_members')
        .select('team_id, student_id, students:student_id(id, xp_total, profiles(full_name, display_name))')
        .in('team_id', teamIds)

      const map = {}
      ;(data || []).forEach(m => {
        if (!map[m.team_id]) map[m.team_id] = []
        map[m.team_id].push({
          id: m.student_id,
          name: m.students?.profiles?.display_name || m.students?.profiles?.full_name || 'طالب',
          xp: m.students?.xp_total || 0,
        })
      })
      return map
    },
    enabled: !!teams?.length,
  })

  // Unassigned students
  const { data: unassigned } = useQuery({
    queryKey: ['unassigned-students', selectedGroup],
    queryFn: async () => {
      const { data: allStudents } = await supabase
        .from('students')
        .select('id, xp_total, profiles(full_name, display_name)')
        .eq('group_id', selectedGroup)
        .eq('status', 'active')
        .is('deleted_at', null)

      // Get all assigned student IDs
      const assignedIds = new Set()
      if (teamMembers) {
        Object.values(teamMembers).forEach(members => {
          members.forEach(m => assignedIds.add(m.id))
        })
      }

      return (allStudents || [])
        .filter(s => !assignedIds.has(s.id))
        .map(s => ({
          id: s.id,
          name: s.profiles?.display_name || s.profiles?.full_name || 'طالب',
          xp: s.xp_total || 0,
        }))
    },
    enabled: !!selectedGroup && !!teamMembers,
  })

  // Create team
  const createTeam = useMutation({
    mutationFn: async () => {
      if (!teamName.trim()) throw new Error('اسم الفريق مطلوب')
      const { error } = await supabase.from('teams').insert({
        name: teamName.trim(),
        emoji: teamEmoji,
        color: teamColor,
        group_id: selectedGroup,
        total_xp: 0,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setShowForm(false)
      setTeamName('')
      queryClient.invalidateQueries({ queryKey: ['trainer-teams'] })
      showToastMsg('تم إنشاء الفريق')
    },
    onError: (err) => showToastMsg(err.message),
  })

  // Delete team
  const deleteTeam = useMutation({
    mutationFn: async (teamId) => {
      await supabase.from('team_members').delete().eq('team_id', teamId)
      const { error } = await supabase.from('teams').delete().eq('id', teamId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-teams'] })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      queryClient.invalidateQueries({ queryKey: ['unassigned-students'] })
      showToastMsg('تم حذف الفريق')
    },
  })

  // Add student to team
  const addToTeam = useMutation({
    mutationFn: async ({ studentId, teamId }) => {
      // Remove from any existing team first
      await supabase.from('team_members').delete().eq('student_id', studentId)
      const { error } = await supabase.from('team_members').insert({
        team_id: teamId,
        student_id: studentId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      queryClient.invalidateQueries({ queryKey: ['unassigned-students'] })
    },
  })

  // Remove student from team
  const removeFromTeam = useMutation({
    mutationFn: async (studentId) => {
      const { error } = await supabase.from('team_members').delete().eq('student_id', studentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      queryClient.invalidateQueries({ queryKey: ['unassigned-students'] })
    },
  })

  // Random assign all unassigned students
  const randomAssign = useMutation({
    mutationFn: async () => {
      if (!unassigned?.length || !teams?.length) return

      const shuffled = [...unassigned].sort(() => Math.random() - 0.5)
      const inserts = shuffled.map((s, i) => ({
        team_id: teams[i % teams.length].id,
        student_id: s.id,
      }))

      const { error } = await supabase.from('team_members').insert(inserts)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      queryClient.invalidateQueries({ queryKey: ['unassigned-students'] })
      showToastMsg('تم توزيع الطلاب عشوائياً')
    },
  })

  function showToastMsg(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-sky-400" size={24} />
            إدارة الفرق
          </h1>
          <p className="text-muted text-sm mt-1">أنشئ فرق ووزّع الطلاب</p>
        </div>
        <div className="flex gap-2">
          {unassigned?.length > 0 && teams?.length > 0 && (
            <button
              onClick={() => randomAssign.mutate()}
              disabled={randomAssign.isPending}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1"
            >
              <Shuffle size={14} /> توزيع عشوائي ({unassigned.length})
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            <Plus size={16} /> فريق جديد
          </button>
        </div>
      </div>

      {/* Group selector */}
      {groups?.length > 1 && (
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="input-field py-2 px-3 text-sm w-auto"
        >
          {groups.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
        </select>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-5 space-y-4"
          >
            <h3 className="text-sm font-medium text-white">فريق جديد</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <input
                className="input-field text-sm"
                placeholder="اسم الفريق..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              <div>
                <label className="text-xs text-muted block mb-1">الرمز</label>
                <div className="flex gap-1 flex-wrap">
                  {TEAM_EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setTeamEmoji(e)}
                      className={`text-xl p-1 rounded-lg ${teamEmoji === e ? 'bg-sky-500/20 ring-1 ring-sky-500' : 'hover:bg-white/10'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => createTeam.mutate()}
                  disabled={createTeam.isPending}
                  className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                >
                  {createTeam.isPending && <Loader2 size={14} className="animate-spin" />}
                  إنشاء
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary text-xs py-2 px-4">إلغاء</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teams */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && teams && (
        <div className="space-y-4">
          {teams.map((team, i) => {
            const members = teamMembers?.[team.id] || []
            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{team.emoji || '🏆'}</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">{team.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>{members.length} أعضاء</span>
                        <span className="flex items-center gap-0.5 text-sky-400">
                          <Zap size={10} /> {team.total_xp || 0} XP
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm('حذف الفريق؟')) deleteTeam.mutate(team.id) }}
                    className="text-muted hover:text-red-400 transition-colors p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Members */}
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 text-xs">
                      <span className="text-white font-medium">{m.name}</span>
                      <span className="text-muted">{m.xp} XP</span>
                      <button
                        onClick={() => removeFromTeam.mutate(m.id)}
                        className="text-muted hover:text-red-400 transition-colors"
                      >
                        <UserMinus size={12} />
                      </button>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <p className="text-xs text-muted">لا يوجد أعضاء</p>
                  )}
                </div>

                {/* Quick add unassigned */}
                {unassigned?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <p className="text-xs text-muted mb-2">إضافة طالب:</p>
                    <div className="flex flex-wrap gap-1">
                      {unassigned.map(s => (
                        <button
                          key={s.id}
                          onClick={() => addToTeam.mutate({ studentId: s.id, teamId: team.id })}
                          className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg px-2 py-1 hover:bg-sky-500/20 transition-colors flex items-center gap-1"
                        >
                          <UserPlus size={10} /> {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}

          {teams.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Users size={48} className="text-muted mx-auto mb-3 opacity-30" />
              <p className="text-muted">لا توجد فرق</p>
              <p className="text-xs text-muted mt-1">أنشئ فرق لبدء المنافسة بين الطلاب</p>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-sky-500/20 border border-sky-500/30 text-sky-400 px-6 py-3 rounded-2xl text-sm font-medium z-50 backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
