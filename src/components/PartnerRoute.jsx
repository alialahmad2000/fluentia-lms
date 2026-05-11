import { Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

export default function PartnerRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const loading = useAuthStore((s) => s.loading)

  const { data, isPending } = useQuery({
    queryKey: ['partner-gate', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: aff } = await supabase
        .from('affiliates')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle()
      return aff
    },
  })

  if (loading || isPending) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#050c18' }}>
        <p className="text-sm text-white/40 font-['Tajawal']">جاري التحميل...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (profile?.role !== 'affiliate') return <Navigate to="/" replace />
  if (!data) return <Navigate to="/" replace />
  if (data.status === 'suspended') return <Navigate to="/partner/suspended" replace />
  if (data.status !== 'approved') return <Navigate to="/" replace />

  return children || <Outlet />
}
