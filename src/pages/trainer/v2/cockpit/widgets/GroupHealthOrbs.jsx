import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { CommandCard } from '@/design-system/trainer'

function useGroupActivity(groups) {
  const groupIds = (groups || []).map(g => g.id)
  return useQuery({
    queryKey: ['group-activity', groupIds.join(',')],
    queryFn: async () => {
      if (groupIds.length === 0) return {}
      const since24h = new Date(Date.now() - 86400000).toISOString()

      // Get student profile IDs per group
      const { data: rows } = await supabase
        .from('students')
        .select('id, group_id, profile:profiles!inner(id, last_active_at)')
        .in('group_id', groupIds)
        .eq('status', 'active')
        .is('deleted_at', null)
      if (!rows) return {}

      const result = {}
      groupIds.forEach(gid => {
        const groupStudents = rows.filter(r => r.group_id === gid)
        const total = groupStudents.length
        const active = groupStudents.filter(r => {
          const lat = r.profile?.last_active_at
          return lat && new Date(lat) >= new Date(since24h)
        }).length
        result[gid] = { total, active, pct: total > 0 ? Math.round((active / total) * 100) : 0 }
      })
      return result
    },
    enabled: groupIds.length > 0,
    staleTime: 60000,
  })
}

function orbColor(pct) {
  if (pct >= 90) return 'tr-orb--peak'
  if (pct >= 70) return 'tr-orb--healthy'
  if (pct >= 40) return 'tr-orb--warning'
  return 'tr-orb--danger'
}

export default function GroupHealthOrbs({ groups = [] }) {
  const { data: activity = {} } = useGroupActivity(groups)

  if (groups.length === 0) {
    return (
      <CommandCard className="tr-orbs">
        <p className="tr-orbs__empty">لم يتم تعيين مجموعات بعد</p>
      </CommandCard>
    )
  }

  return (
    <CommandCard className="tr-orbs">
      <h3 className="tr-orbs__title">صحة المجموعات</h3>
      <div className="tr-orbs__grid">
        {groups.map(g => {
          const stats = activity[g.id] || { total: 0, active: 0, pct: 0 }
          const colorClass = orbColor(stats.pct)
          return (
            <div key={g.id} className={`tr-orb ${colorClass}`} title={`${g.name}: ${stats.active}/${stats.total} نشط`}>
              <div
                className="tr-orb__fill"
                style={{ '--pct': `${stats.pct}%` }}
                aria-label={`${g.name} — ${stats.pct}% نشط`}
              />
              <span className="tr-orb__pct">{stats.pct}%</span>
              <span className="tr-orb__name">
                {g.name}
                {g.level ? ` · ${g.level}` : ''}
              </span>
            </div>
          )
        })}
      </div>
    </CommandCard>
  )
}
