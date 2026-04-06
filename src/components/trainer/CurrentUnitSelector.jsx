import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'

export default function CurrentUnitSelector({ groupId, groupLevel }) {
  const queryClient = useQueryClient()

  // Get units for this group's level
  const { data: units = [] } = useQuery({
    queryKey: ['units-for-level', groupLevel],
    queryFn: async () => {
      const { data: level } = await supabase
        .from('curriculum_levels')
        .select('id')
        .eq('level_number', groupLevel)
        .maybeSingle()
      if (!level) return []

      const { data } = await supabase
        .from('curriculum_units')
        .select('id, unit_number, theme_ar')
        .eq('level_id', level.id)
        .order('unit_number')
      return data || []
    },
    enabled: !!groupLevel,
  })

  // Get current unit
  const { data: group } = useQuery({
    queryKey: ['group-current-unit', groupId],
    queryFn: async () => {
      const { data } = await supabase.from('groups').select('current_unit_id').eq('id', groupId).single()
      return data
    },
    enabled: !!groupId,
  })

  const updateMutation = useMutation({
    mutationFn: async (unitId) => {
      const { error } = await supabase.from('groups').update({ current_unit_id: unitId }).eq('id', groupId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-current-unit', groupId] })
      queryClient.invalidateQueries({ queryKey: ['prep-'] })
      toast({ type: 'success', title: 'تم تحديث الوحدة الحالية' })
    },
  })

  if (!units.length) return null

  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] font-['Tajawal'] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
        الوحدة الحالية:
      </label>
      <select
        value={group?.current_unit_id || ''}
        onChange={(e) => updateMutation.mutate(e.target.value || null)}
        className="flex-1 text-[12px] font-['Tajawal'] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
        style={{
          background: 'var(--surface-overlay)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          maxWidth: '200px',
        }}
      >
        <option value="">— اختر —</option>
        {units.map(u => (
          <option key={u.id} value={u.id}>الوحدة {u.unit_number} — {u.theme_ar}</option>
        ))}
      </select>
    </div>
  )
}
