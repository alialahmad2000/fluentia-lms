import { useCallback, memo, useMemo } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { prefetchRoute } from '@/lib/prefetchRegistry'
import { motion } from 'framer-motion'
import { ChevronLeft, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import UserAvatar from '@/components/common/UserAvatar'
import { hasIELTSAccess } from '@/lib/packageAccess'
import { toast } from '@/components/ui/FluentiaToast'
import { useIELTSRoster } from '@/hooks/trainer/useTrainerIELTSStudents'
import { getHardWordsCount } from '@/services/hardWords'
import { getDueCount } from '@/services/vocab'
import { toArabicNum } from '@/lib/vocabFormat'
import { useChatUnread } from '@/features/chat/queries/useDM'
import { supabase } from '@/lib/supabase'

const ROLE_DASHBOARDS = { student: '/student', trainer: '/trainer', admin: '/admin', agent: '/team' }

function Sidebar({ nav, collapsed, onToggle }) {
  const profile = useAuthStore((s) => s.profile)
  const profileId = profile?.id
  const studentData = useAuthStore((s) => s.studentData)
  const role = profile?.role || 'student'

  const { data: ieltsRoster } = useIELTSRoster()
  const hasIELTSStudents = Array.isArray(ieltsRoster) && ieltsRoster.length > 0

  // Visibility-aware mock-exam access (unchanged logic).
  const isTestAccount = profile?.is_test_account === true
  const isStaff = role === 'admin' || role === 'trainer'
  const { data: mockExamRows = [] } = useQuery({
    queryKey: ['mock-exam-visibility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_exams')
        .select('id, code, visibility, level:curriculum_levels(level_number)')
        .eq('is_active', true)
      if (error) return []
      return data || []
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
    enabled: !!profileId,
  })
  const studentLevelNumber = studentData?.academic_level ?? null
  const canSeeMockExam = (mockExamRows || []).some((e) => {
    if (e.visibility === 'live') {
      return isStaff || (studentLevelNumber && e.level?.level_number === studentLevelNumber)
    }
    if (e.visibility === 'preview') {
      if (isStaff) return true
      if (isTestAccount && studentLevelNumber && e.level?.level_number === studentLevelNumber) return true
    }
    return false
  })

  // Conditional hard-words nav visibility (unchanged logic).
  const { data: hardWordsCount = 0 } = useQuery({
    queryKey: ['hard-words', 'count', profileId],
    queryFn: () => getHardWordsCount(profileId),
    enabled: !!profileId && role === 'student',
    staleTime: 60_000,
  })

  // "X words due" daily-return badge — same unified count the review surface shows.
  const { data: vocabDueCount = 0 } = useQuery({
    queryKey: ['vocab-due-badge', profileId],
    queryFn: () => getDueCount(profileId),
    enabled: !!profileId && role === 'student',
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
  const chatUnread = useChatUnread()
  const badgeCounts = useMemo(
    () => ({ 'srs-due': vocabDueCount, 'hard-words-count': hardWordsCount, 'chat-unread': chatUnread }),
    [vocabDueCount, hardWordsCount, chatUnread]
  )

  const navigate = useNavigate()
  const location = useLocation()
  const displayName = profile?.display_name || profile?.full_name || 'مستخدم'
  const level = studentData?.level ?? profile?.level ?? null
  const xp = studentData?.xp_total || 0

  const isActive = useCallback((to) => {
    if (to === `/${role}` || to === '/student' || to === '/trainer' || to === '/admin') {
      return location.pathname === to
    }
    return location.pathname.startsWith(to)
  }, [location.pathname, role])

  return (
    <aside
      role="navigation"
      data-sidebar-root
      aria-label="القائمة الرئيسية"
      className="pd-rail hidden lg:flex flex-col fixed right-0 z-30 transition-all duration-300"
      style={{
        top: 'var(--impersonation-banner-height, 0px)',
        height: 'calc(100vh - var(--impersonation-banner-height, 0px))',
        width: collapsed ? 76 : 264,
        background: 'var(--ds-bg-elevated, #0b0f18)',
        borderLeft: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))',
        position: 'fixed',
        overflow: 'hidden',
      }}
    >
      {/* ambient warm glow behind the brand */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          insetBlockStart: '-30%',
          insetInline: '-20%',
          height: 280,
          background:
            'radial-gradient(60% 80% at 70% 0%, var(--ds-accent-primary-glow, rgba(233,185,73,0.35)), transparent 70%)',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
      {/* inner edge highlight */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          insetBlock: 0,
          insetInlineStart: 0,
          width: 1,
          background: 'linear-gradient(180deg, transparent, var(--ds-border-strong, rgba(251,191,36,0.4)), transparent)',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />

      {/* Brand */}
      <div
        className="flex items-center shrink-0 cursor-pointer relative"
        style={{ height: 76, paddingInline: collapsed ? 0 : 20, justifyContent: collapsed ? 'center' : 'flex-start', gap: 12, zIndex: 1 }}
        onClick={() => navigate(ROLE_DASHBOARDS[role] || '/student')}
      >
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            background: 'linear-gradient(135deg, var(--ds-accent-primary), var(--ds-accent-gold, var(--ds-accent-primary)))',
            color: 'var(--ds-text-inverse, #0b0f18)',
            fontFamily: "'Playfair Display', serif",
            fontSize: 24,
            fontWeight: 900,
            boxShadow: '0 8px 20px -8px var(--ds-accent-primary-glow), inset 0 1px 0 rgba(255,255,255,0.35)',
          }}
        >
          ط
        </span>
        {!collapsed && (
          <span
            className="text-[19px] font-bold leading-none"
            style={{ color: 'var(--ds-text-primary, #faf5e6)', fontFamily: "'Tajawal', sans-serif", letterSpacing: '-0.01em' }}
          >
            طلاقة
          </span>
        )}
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-5 relative" style={{ zIndex: 1 }}>
        {nav.sections.map((section) => {
          const visibleItems = section.items.filter(item => {
            if (item.visibleWhen === 'hard-words-count' && hardWordsCount <= 0) return false
            if (item.requiresIELTSStudents) return hasIELTSStudents
            if (item.requiresMockExamAccess) return canSeeMockExam
            if (!item.requiresPackage) return true
            if (item.requiresPackage === 'ielts') return hasIELTSAccess(studentData)
            return true
          })
          if (visibleItems.length === 0) return null
          return (
            <div key={section.id}>
              {!collapsed && (
                <div className="flex items-center gap-2 px-3 mb-2.5">
                  <span
                    aria-hidden="true"
                    style={{ width: 14, height: 2, borderRadius: 2, background: 'var(--ds-accent-primary)', opacity: 0.8 }}
                  />
                  <span
                    className="text-[10.5px] font-bold uppercase"
                    style={{ color: 'var(--ds-text-tertiary)', letterSpacing: '0.16em' }}
                  >
                    {section.label}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  if (!item || !item.to || !item.icon) return null
                  const active = isActive(item.to)
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      end={item.to === `/${role}` || item.to === '/student' || item.to === '/trainer' || item.to === '/admin'}
                      aria-current={active ? 'page' : undefined}
                      onMouseEnter={() => prefetchRoute(item.to, profileId)}
                      onFocus={() => prefetchRoute(item.to, profileId)}
                      onTouchStart={() => prefetchRoute(item.to, profileId)}
                      onClick={(e) => {
                        if (item.requiresPackage === 'ielts' && !hasIELTSAccess(studentData)) {
                          e.preventDefault()
                          toast({ type: 'error', title: 'هذي الميزة لباقة IELTS فقط 🔒' })
                        }
                      }}
                      className={`pd-rail-item relative flex items-center rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent-primary)] ${active ? 'is-active' : ''}`}
                      style={{
                        height: 46,
                        gap: 12,
                        padding: collapsed ? '0' : '0 12px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        background: active
                          ? 'linear-gradient(90deg, color-mix(in srgb, var(--ds-accent-primary) 16%, transparent), color-mix(in srgb, var(--ds-accent-primary) 4%, transparent))'
                          : 'transparent',
                        color: active ? 'var(--ds-accent-primary)' : 'var(--ds-text-secondary)',
                      }}
                      title={collapsed ? item.label : undefined}
                    >
                      {active && (
                        <motion.div
                          layoutId="active-sidebar-indicator"
                          className="absolute right-0 top-2.5 bottom-2.5"
                          style={{
                            width: 3,
                            borderRadius: 9999,
                            background: 'var(--ds-accent-primary)',
                            boxShadow: '0 0 16px var(--ds-accent-primary-glow)',
                          }}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span
                        className="pd-rail-ico flex items-center justify-center shrink-0"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 11,
                          background: active
                            ? 'linear-gradient(135deg, color-mix(in srgb, var(--ds-accent-primary) 30%, transparent), color-mix(in srgb, var(--ds-accent-primary) 10%, transparent))'
                            : 'transparent',
                          border: active ? '1px solid var(--ds-border-subtle)' : '1px solid transparent',
                          boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
                        }}
                      >
                        <Icon
                          size={20}
                          strokeWidth={active ? 2 : 1.75}
                          style={active ? { filter: 'drop-shadow(0 0 8px var(--ds-accent-primary-glow))' } : undefined}
                        />
                      </span>
                      {!collapsed && (
                        <span className={`text-[14px] truncate font-['Tajawal'] flex-1 min-w-0 ${active ? 'font-bold' : 'font-medium'}`}>
                          {item.label}
                        </span>
                      )}

                      {/* daily-return badge (e.g. "X words due") — same unified count the review surface shows */}
                      {item.showBadge && badgeCounts[item.badgeSource] > 0 &&
                        (collapsed ? (
                          <span
                            className="absolute top-2 right-2 w-2 h-2 rounded-full"
                            style={{ background: '#818cf8', boxShadow: '0 0 6px rgba(129,140,248,0.7)' }}
                          />
                        ) : (
                          <span
                            className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums"
                            style={{
                              background: 'rgba(129,140,248,0.16)',
                              color: '#a5b4fc',
                              border: '1px solid rgba(129,140,248,0.32)',
                            }}
                          >
                            {badgeCounts[item.badgeSource] > 99 ? '٩٩+' : toArabicNum(badgeCounts[item.badgeSource])}
                          </span>
                        ))}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* User card */}
      <div className="shrink-0 p-3 relative" style={{ zIndex: 1 }}>
        <div
          className="rounded-[18px] p-3 flex items-center gap-3"
          style={{
            background: 'var(--ds-surface-1)',
            border: '1px solid var(--ds-border-subtle)',
            boxShadow: 'var(--ds-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <UserAvatar user={profile} size={collapsed ? 34 : 42} rounded="xl" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate font-['Tajawal']" style={{ color: 'var(--ds-text-primary)' }}>
                {displayName}
              </div>
              <div className="text-[11px] truncate font-data" style={{ color: 'var(--ds-text-tertiary)' }}>
                {level != null ? `المستوى ${level}` : ''}{level != null && xp > 0 ? ' · ' : ''}{xp > 0 ? `${xp.toLocaleString('en-US')} XP` : ''}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(role === 'admin' ? '/admin/settings' : role === 'trainer' ? '/trainer/my-students' : role === 'agent' ? '/team' : '/student/profile') }}
              className="shrink-0 p-1.5 rounded-lg transition-colors duration-200"
              style={{ color: 'var(--ds-text-tertiary)' }}
              aria-label="الإعدادات"
            >
              <Settings size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center z-40 transition-all duration-200 cursor-pointer"
        style={{
          background: 'var(--ds-bg-elevated, #0b0f18)',
          border: '1px solid var(--ds-border-subtle)',
          color: 'var(--ds-text-tertiary)',
          boxShadow: 'var(--ds-shadow-sm)',
        }}
        aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
      >
        <ChevronLeft size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
      </button>

      <style>{`
        .pd-rail-item { transition: background var(--motion-base,240ms) var(--ease-out,ease), color var(--motion-base,240ms) var(--ease-out,ease); }
        .pd-rail-item:not(.is-active):hover { background: var(--ds-surface-1) !important; color: var(--ds-text-primary) !important; }
        .pd-rail-item:not(.is-active):hover .pd-rail-ico { background: var(--ds-surface-2); }
      `}</style>
    </aside>
  )
}

export default memo(Sidebar)
