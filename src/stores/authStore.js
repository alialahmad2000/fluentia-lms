import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'
import { tracker } from '../services/activityTracker'

// Promise.race timeout wrapper. Prevents hanging auth calls (iOS Safari with
// a stale refresh token or flaky network) from leaving the app stuck on the
// loading screen forever. Rejects with a labeled error on timeout.
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[AuthStore] ${label} timed out after ${ms}ms`)), ms)
    ),
  ])

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  studentData: null,
  trainerData: null,
  loading: true,
  lastTokenRefreshAt: null,
  _authSubscription: null,
  _realtimeChannel: null,

  // ── Impersonation state ──
  impersonation: null,       // { userId, role, name, returnPath }
  _realProfile: null,        // admin's original profile
  _realStudentData: null,
  _realTrainerData: null,

  initialize: async () => {
    // Get initial session. Wrap in timeouts so the app never hangs on boot:
    // if getSession() or fetchProfile() stall (iOS Safari with a stale token,
    // flaky network, slow storage access), we still flip `loading: false`
    // so the user lands on /login instead of staring at a dark screen.
    try {
      const sessionResult = await withTimeout(
        supabase.auth.getSession(),
        6000,
        'getSession'
      )
      const session = sessionResult?.data?.session
      if (session?.user) {
        try {
          await withTimeout(get().fetchProfile(session.user), 8000, 'fetchProfile')
        } catch (err) {
          console.error('[AuthStore] fetchProfile error:', err)
          // Profile fetch failed/timed out — clear partial state and let the
          // user re-authenticate. signOut with scope 'local' removes the
          // local session without a network round-trip that could also hang.
          try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
          set({ user: null, profile: null, studentData: null, trainerData: null })
        }
      }
    } catch (err) {
      console.error('[AuthStore] getSession error:', err)
      // getSession hung or threw — nuke any corrupted local session so the
      // next login starts from a clean slate.
      try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
    } finally {
      set({ loading: false })
    }

    // Restore impersonation if admin was viewing as another user.
    // Non-blocking: if this stalls, loading is already false so user can interact.
    try {
      await withTimeout(get().restoreImpersonation(), 5000, 'restoreImpersonation')
    } catch (err) {
      console.error('[AuthStore] restoreImpersonation error:', err)
    }

    // Listen for auth changes — store subscription so it can be unsubscribed
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Recovery session — let /reset-password handle it. Do NOT fetch profile or redirect.
      if (event === 'PASSWORD_RECOVERY') {
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // After a recovery → updateUser fires SIGNED_IN. Let /reset-password manage its own redirect.
        if (typeof window !== 'undefined' && window.location.pathname === '/reset-password') {
          return
        }
        await get().fetchProfile(session.user)
        // Initialize activity tracker
        tracker.init(session.user.id)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refresh only changes the auth header — data is still valid.
        // Supabase JS auto-injects the new JWT on every subsequent request, so
        // invalidating queries here is unnecessary and was the root cause of the
        // re-render storm (up to 179 components + 20 network requests on every refresh).
        set({ user: session.user, lastTokenRefreshAt: Date.now() })
      } else if (event === 'SIGNED_OUT') {
        const ch = get()._realtimeChannel
        if (ch) supabase.removeChannel(ch)
        queryClient.clear()
        set({ user: null, profile: null, studentData: null, trainerData: null, _realtimeChannel: null })
      }
    })

    // Store the subscription object so callers can unsubscribe if needed
    set({ _authSubscription: subscription })
  },

  fetchProfile: async (user) => {
    try {
      // Fetch profile + student/trainer data in parallel to avoid waterfall.
      // We speculatively fetch both student and trainer data — one will be null.
      // This cuts auth loading time in half (1 round trip instead of 2).
      const [profileRes, studentRes, trainerRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('students').select('*, groups(*)').eq('id', user.id).maybeSingle(),
        supabase.from('trainers').select('*').eq('id', user.id).maybeSingle(),
      ])

      const { data: profile, error } = profileRes

      if (error || !profile) {
        console.error('[AuthStore] fetchProfile error:', error)
        set({ user, profile: null })
        return
      }

      set({ user, profile })

      if (profile.role === 'student') {
        set({ studentData: studentRes.data || null })

        // Subscribe to real-time XP/streak changes for gamification
        const prev = get()._realtimeChannel
        if (prev) supabase.removeChannel(prev)
        const channel = supabase
          .channel(`student-${user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'students',
            filter: `id=eq.${user.id}`,
          }, (payload) => {
            const current = get().studentData
            if (current) {
              set({ studentData: { ...current, ...payload.new } })
            }
          })
          .subscribe()
        set({ _realtimeChannel: channel })
      } else if (profile.role === 'trainer') {
        set({ trainerData: trainerRes.data || null })
      }
    } catch (err) {
      console.error('[AuthStore] fetchProfile crash:', err)
      set({ user, profile: null })
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  signOut: async () => {
    await tracker.destroy()
    await supabase.auth.signOut()
    // Clear query cache so one student's data never leaks to the next user on a shared device
    const { queryClient: qc } = await import('../lib/queryClient')
    qc.clear()
    try { window.localStorage.removeItem('fluentia-query-cache-v1') } catch (_) {}
  },

  // ── Impersonation (REAL session) ──
  // "View as student" swaps the ACTUAL Supabase session to the target so auth.uid()
  // becomes them — the only way student-scoped writes (RLS / SECURITY DEFINER RPCs)
  // persist during preview. The admin's session is stashed in sessionStorage and
  // restored on exit. Callers (ImpersonateButton / ImpersonationBanner) do a full
  // page reload after these resolve, so init()/restoreImpersonation() rebuild state.
  startImpersonation: async (userId, role, name) => {
    const state = get()
    // 1) snapshot the admin session so we can return to it on exit
    const { data: { session: adminSession } } = await supabase.auth.getSession()
    if (!adminSession) throw new Error('انتهت جلستك — سجّلي الدخول من جديد')

    // 2) backend mints a one-time login token for the target (verifies caller is admin)
    const { data, error } = await supabase.functions.invoke('impersonate', {
      body: { target_user_id: userId },
    })
    if (error) throw new Error(error.message || 'تعذّر بدء المعاينة')
    if (data?.error) throw new Error(data.error)
    if (!data?.token_hash) throw new Error('تعذّر بدء المعاينة')

    // 3) stash restore + meta BEFORE swapping the session
    sessionStorage.setItem('fluentia_admin_restore', JSON.stringify({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    }))
    sessionStorage.setItem('fluentia_impersonation', JSON.stringify({
      userId, role, name, returnPath: window.location.pathname,
      adminProfile: state.profile
        ? { id: state.profile.id, role: state.profile.role, full_name: state.profile.full_name, email: state.profile.email }
        : null,
    }))

    // 4) become the target — REAL session (writes now persist as them)
    const { error: vErr } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: data.type || 'magiclink',
    })
    if (vErr) {
      sessionStorage.removeItem('fluentia_admin_restore')
      sessionStorage.removeItem('fluentia_impersonation')
      throw vErr
    }
    // caller reloads → init() loads the target session, restoreImpersonation() shows the banner
  },

  stopImpersonation: async () => {
    const state = get()
    const returnPath = state.impersonation?.returnPath || '/admin'
    let restore = null
    try { restore = JSON.parse(sessionStorage.getItem('fluentia_admin_restore') || 'null') } catch { /* ignore */ }
    sessionStorage.removeItem('fluentia_impersonation')
    sessionStorage.removeItem('fluentia_admin_restore')
    set({ impersonation: null, _realProfile: null, _realStudentData: null, _realTrainerData: null })
    // restore the admin's real session (or fall back to a clean sign-out)
    try {
      if (restore?.refresh_token) {
        await supabase.auth.setSession({
          access_token: restore.access_token,
          refresh_token: restore.refresh_token,
        })
      } else {
        await supabase.auth.signOut()
      }
    } catch {
      try { await supabase.auth.signOut() } catch { /* ignore */ }
    }
    return returnPath
  },

  // Restore the impersonation banner on reload. With the real-session model the
  // active session already IS the target; we just re-attach the banner + the saved
  // admin profile (so role-guard helpers that read _realProfile keep working).
  restoreImpersonation: async () => {
    const stored = sessionStorage.getItem('fluentia_impersonation')
    if (!stored) return
    let meta
    try { meta = JSON.parse(stored) } catch { sessionStorage.removeItem('fluentia_impersonation'); return }
    const cur = get()
    // the logged-in session must be the impersonated user; otherwise the flag is stale
    if (!cur.profile || cur.profile.id !== meta.userId) {
      sessionStorage.removeItem('fluentia_impersonation')
      sessionStorage.removeItem('fluentia_admin_restore')
      return
    }
    set({
      _realProfile: meta.adminProfile || null,
      impersonation: { userId: meta.userId, role: meta.role, name: meta.name, returnPath: meta.returnPath },
    })
  },

  setProfile: (profile) => set({ profile }),

  // Helpers
  isAdmin: () => {
    const s = get()
    return s.impersonation ? s._realProfile?.role === 'admin' : s.profile?.role === 'admin'
  },
  isTrainer: () => {
    const s = get()
    if (s.impersonation) return s._realProfile?.role === 'admin' || ['trainer', 'admin'].includes(s.profile?.role)
    return ['trainer', 'admin'].includes(s.profile?.role)
  },
  isStudent: () => get().profile?.role === 'student',
  isAgent: () => get().profile?.role === 'agent',
  isCoordinator: () => get().profile?.role === 'coordinator',
  isImpersonating: () => !!get().impersonation,
}))

// ── Granular selectors ────────────────────────────────────────────────────────
// Each subscribes only to its own slice — components re-render only when
// their specific value changes, not on every store update (e.g. token refresh).
export const useAuthUser = () => useAuthStore((s) => s.user)
export const useAuthUserId = () => useAuthStore((s) => s.user?.id ?? null)
export const useAuthProfile = () => useAuthStore((s) => s.profile)
export const useAuthProfileId = () => useAuthStore((s) => s.profile?.id ?? null)
export const useAuthStudentData = () => useAuthStore((s) => s.studentData)
export const useAuthTrainerData = () => useAuthStore((s) => s.trainerData)
export const useAuthLoading = () => useAuthStore((s) => s.loading)
export const useAuthImpersonation = () => useAuthStore((s) => s.impersonation)
export const useAuthRole = () => useAuthStore((s) => s.profile?.role)
export const useIsAuthenticated = () => useAuthStore((s) => !!s.user)

// Role checks — impersonation-aware to match the in-store helpers (s.isAdmin/etc).
// When admin is impersonating, the helpers consider the REAL profile's role,
// so a route-guard built on useIsAdmin keeps working through impersonation.
export const useIsAdmin = () =>
  useAuthStore((s) =>
    s.impersonation
      ? s._realProfile?.role === 'admin'
      : s.profile?.role === 'admin'
  )
export const useIsTrainer = () =>
  useAuthStore((s) => {
    if (s.impersonation) {
      return (
        s._realProfile?.role === 'admin' ||
        ['trainer', 'admin'].includes(s.profile?.role)
      )
    }
    return ['trainer', 'admin'].includes(s.profile?.role)
  })
export const useIsStudent = () => useAuthStore((s) => s.profile?.role === 'student')
export const useIsAgent = () => useAuthStore((s) => s.profile?.role === 'agent')
export const useIsCoordinator = () => useAuthStore((s) => s.profile?.role === 'coordinator')
export const useIsImpersonating = () => useAuthStore((s) => !!s.impersonation)

// Action-only hook — actions are stable references, useShallow keeps the
// returned object's identity stable across renders so consumers don't re-render
// on every store update just to grab callbacks.
export const useAuthActions = () =>
  useAuthStore(
    useShallow((s) => ({
      signIn: s.signIn,
      signOut: s.signOut,
      setProfile: s.setProfile,
      fetchProfile: s.fetchProfile,
      startImpersonation: s.startImpersonation,
      stopImpersonation: s.stopImpersonation,
    }))
  )
