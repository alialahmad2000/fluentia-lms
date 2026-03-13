import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Eye, EyeOff, Clock, Users, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { ASSIGNMENT_TYPES } from '../../lib/constants'
import { formatDateAr, deadlineText, isOverdue } from '../../utils/dateHelpers'
import AssignmentForm from '../../components/assignments/AssignmentForm'

export default function TrainerAssignments() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [filterGroup, setFilterGroup] = useState('all')

  const role = profile?.role

  // Trainer's groups (admin sees all)
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups', role],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code, trainer_id')
      if (role !== 'admin') {
        query = query.eq('trainer_id', profile?.id)
      }
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Assignments for trainer's groups (admin sees all)
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['trainer-assignments', filterGroup, role],
    queryFn: async () => {
      let query = supabase
        .from('assignments')
        .select('*, groups(name, code)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (role !== 'admin') {
        query = query.eq('trainer_id', profile?.id)
      }

      if (filterGroup !== 'all') {
        query = query.eq('group_id', filterGroup)
      }
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Submission counts per assignment
  const { data: submissionCounts } = useQuery({
    queryKey: ['trainer-submission-counts'],
    queryFn: async () => {
      if (!assignments?.length) return {}
      const ids = assignments.map(a => a.id)
      const { data } = await supabase
        .from('submissions')
        .select('assignment_id, status')
        .in('assignment_id', ids)
        .is('deleted_at', null)

      const counts = {}
      for (const s of data || []) {
        if (!counts[s.assignment_id]) counts[s.assignment_id] = { total: 0, submitted: 0, graded: 0 }
        counts[s.assignment_id].total++
        if (s.status === 'submitted') counts[s.assignment_id].submitted++
        if (s.status === 'graded') counts[s.assignment_id].graded++
      }
      return counts
    },
    enabled: !!assignments?.length,
  })

  // Toggle visibility
  const toggleVisibility = useMutation({
    mutationFn: async ({ id, is_visible }) => {
      const { error } = await supabase
        .from('assignments')
        .update({ is_visible: !is_visible })
        .eq('id', id)
        .select()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['trainer-submission-counts'] })
    },
  })

  // Soft delete
  const deleteAssignment = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('assignments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['trainer-submission-counts'] })
    },
  })

  function handleEdit(assignment) {
    setEditingAssignment(assignment)
    setShowForm(true)
  }

  function handleFormClose() {
    setShowForm(false)
    setEditingAssignment(null)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الواجبات</h1>
          <p className="text-muted text-sm mt-1">إنشاء وإدارة واجبات المجموعات</p>
        </div>
        <button
          onClick={() => { setEditingAssignment(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={18} />
          <span>واجب جديد</span>
        </button>
      </div>

      {/* Group filter */}
      {groups?.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-muted text-sm">المجموعة:</span>
          <div className="relative">
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="input-field py-2 px-3 text-sm pr-8 appearance-none cursor-pointer"
            >
              <option value="all">الكل</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>
      )}

      {/* Assignment list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 w-full rounded-2xl" />)}
        </div>
      ) : assignments?.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted">لا توجد واجبات — أنشئ أول واجب</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a, i) => {
            const typeInfo = ASSIGNMENT_TYPES[a.type] || ASSIGNMENT_TYPES.custom
            const counts = submissionCounts?.[a.id] || { total: 0, submitted: 0, graded: 0 }
            const overdue = a.deadline && isOverdue(a.deadline)

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card p-5 cursor-pointer hover:border-sky-500/20 hover:translate-y-[-2px] transition-all duration-200 ${
                  !a.is_visible ? 'opacity-60' : ''
                }`}
                onClick={() => handleEdit(a)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-lg shrink-0">
                        {typeInfo.icon}
                      </div>
                      <h3 className="font-medium text-white truncate">{a.title}</h3>
                      {!a.is_visible && (
                        <span className="badge-muted">مخفي</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted mt-2">
                      <span className="badge-blue">{typeInfo.label_ar}</span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {a.groups?.code}
                      </span>
                      {a.deadline && (
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
                          <Clock size={12} />
                          {deadlineText(a.deadline)}
                        </span>
                      )}
                    </div>
                    {/* Submission stats */}
                    <div className="flex items-center gap-3 text-xs text-muted mt-2">
                      <span className="badge-muted">{counts.total} تسليم</span>
                      {counts.submitted > 0 && (
                        <span className="badge-yellow">{counts.submitted} بانتظار التقييم</span>
                      )}
                      {counts.graded > 0 && (
                        <span className="badge-green">{counts.graded} تم تقييمه</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleVisibility.mutate({ id: a.id, is_visible: a.is_visible })}
                      className="btn-icon"
                      title={a.is_visible ? 'إخفاء' : 'إظهار'}
                    >
                      {a.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('هل تريد حذف هذا الواجب؟')) deleteAssignment.mutate(a.id)
                      }}
                      className="btn-icon hover:text-red-400 hover:bg-red-500/10"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Assignment Form Modal */}
      <AnimatePresence>
        {showForm && (
          <AssignmentForm
            assignment={editingAssignment}
            groups={groups || []}
            trainerId={profile?.id}
            isAdmin={role === 'admin'}
            onClose={handleFormClose}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
