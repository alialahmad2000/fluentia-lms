// PendingBriefsCard — shows the most recent unopened brief delivery
// (or null if nothing). Mounted in RetentionDashboardSection.

import { useNavigate } from 'react-router-dom'
import { Clock, BookOpen } from 'lucide-react'
import { usePendingBriefs } from '../../lib/retention/useBriefs'
import RetentionCard from '../../design-system/retention/RetentionCard'

export default function PendingBriefsCard() {
  const navigate = useNavigate()
  const { data, isLoading } = usePendingBriefs()

  if (isLoading || !data || data.length === 0) return null
  const next = data[0]
  if (!next?.brief) return null

  const isPrep = next.brief.brief_type === 'prep'
  return (
    <RetentionCard
      moduleKey="lesson_briefs"
      title={isPrep ? 'تحضيركِ للكلاس القادم' : 'مراجعة كلاسكِ'}
      subtitle={next.brief.title_ar}
      icon={isPrep ? <Clock size={20} /> : <BookOpen size={20} />}
      badge={isPrep ? '٦٠ ثانية' : '٩٠ ثانية'}
      variant="featured"
      onClick={() => navigate(`/student/retention/brief/${next.id}`)}
    >
      <div className="mt-2 text-sm font-semibold" style={{ color: 'var(--ds-accent-primary)' }}>
        افتحي الآن ←
      </div>
    </RetentionCard>
  )
}
