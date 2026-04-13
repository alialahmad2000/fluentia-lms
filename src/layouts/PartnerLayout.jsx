import { useState } from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import {
  LayoutDashboard, Palette, Users, Wallet, Settings, LogOut,
  Menu, X, Award
} from 'lucide-react'

const NAV = [
  { to: '/partner', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
  { to: '/partner/materials', label: 'رابطي والمواد', icon: Palette },
  { to: '/partner/conversions', label: 'عملائي', icon: Users },
  { to: '/partner/payouts', label: 'المدفوعات', icon: Wallet },
  { to: '/partner/settings', label: 'الإعدادات', icon: Settings },
]

export default function PartnerLayout() {
  const { user, profile } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const { data: affiliate, isPending } = useQuery({
    queryKey: ['my-affiliate', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })

  if (!user) return <Navigate to="/login" replace />
  if (profile?.role !== 'affiliate') return <Navigate to="/" replace />
  if (isPending) return <BootScreen />

  if (!affiliate) return <SuspendedPage message="لم يتم العثور على حساب شريك مرتبط." />
  if (affiliate.status === 'suspended') return <SuspendedPage message="تم إيقاف حسابك — راسل الدعم للمساعدة." />
  if (affiliate.status !== 'approved') return <SuspendedPage message="طلبك قيد المراجعة — سنراسلك على الإيميل بالرد." />

  return (
    <div className="min-h-dvh flex" dir="rtl" style={{ background: '#050c18', color: '#e2e8f0' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 border-l border-white/5" style={{ background: '#0a1628' }}>
        <SidebarContent affiliate={affiliate} />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-[260px] flex flex-col" style={{ background: '#0a1628' }}>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <span className="text-sm font-bold text-white/60 font-['Tajawal']">القائمة</span>
              <button onClick={() => setMobileOpen(false)} className="text-white/40"><X size={20} /></button>
            </div>
            <SidebarContent affiliate={affiliate} onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/5" style={{ background: '#0a1628' }}>
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-white/50">
            <Menu size={22} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <Award size={18} className="text-amber-400" />
            <span className="text-sm font-bold text-white font-['Tajawal']">{affiliate.full_name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-['Tajawal']">شريك معتمد</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet context={{ affiliate }} />
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ affiliate, onNav }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
            {affiliate.full_name?.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-bold text-white font-['Tajawal']">{affiliate.full_name}</div>
            <div className="text-xs text-amber-400/70 font-['Tajawal']">{affiliate.ref_code}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNav}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-['Tajawal'] transition ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/80 border border-transparent'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5">
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-['Tajawal'] text-red-400/70 hover:bg-red-500/10 w-full transition">
          <LogOut size={18} />
          تسجيل خروج
        </button>
      </div>
    </>
  )
}

function BootScreen() {
  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#050c18' }}>
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-white/40 font-['Tajawal']">جاري التحميل...</p>
      </div>
    </div>
  )
}

function SuspendedPage({ message }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6" dir="rtl" style={{ background: '#050c18' }}>
      <div className="text-center max-w-md space-y-6">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
          <Award size={36} className="text-amber-400/50" />
        </div>
        <p className="text-lg text-white/70 font-['Tajawal']">{message}</p>
        <button onClick={handleSignOut} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-['Tajawal'] hover:bg-white/10 transition">
          تسجيل خروج
        </button>
      </div>
    </div>
  )
}
