import { create } from 'zustand'
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
      if (event === 'SIGNED_IN' && session?.user) {
        await get().fetchProfile(session.user)
        // Initialize activity tracker
        tracker.init(session.user.id)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed — update user object, invalidate (not refetch) active queries.
        // invalidateQueries marks them stale so they refetch on next access,
        // NOT all at once. refetchQueries({ type: 'active' }) was firing every active
        // query simultaneously, causing a burst of requests and perceived lag.
        set({ user: session.user })
        queryClient.invalidateQueries({ type: 'active' })
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
  },

  // ── Impersonation ──
  startImpersonation: async (userId, role, name) => {
    const state = get()
    // Save admin's real data
    set({
      _realProfile: state.profile,
      _realStudentData: state.studentData,
      _realTrainerData: state.trainerData,
      impersonation: { userId, role, name, returnPath: window.location.pathname },
    })

    // Persist to sessionStorage for refresh survival
    sessionStorage.setItem('fluentia_impersonation', JSON.stringify({
      userId, role, name, returnPath: window.location.pathname,
    }))

    // Fetch impersonated user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) return

    set({ profile })

    if (role === 'student') {
      const { data: studentData } = await supabase
        .from('students')
        .select('*, groups(*)')
        .eq('id', userId)
        .single()
      set({ studentData: studentData || null, trainerData: null })
    } else if (role === 'trainer') {
      const { data: trainerData } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', userId)
        .single()
      set({ trainerData: trainerData || null, studentData: null })
    }
  },

  stopImpersonation: () => {
    const state = get()
    const returnPath = state.impersonation?.returnPath || '/admin'
    set({
      profile: state._realProfile,
      studentData: state._realStudentData,
      trainerData: state._realTrainerData,
      impersonation: null,
      _realProfile: null,
      _realStudentData: null,
      _realTrainerData: null,
    })
    sessionStorage.removeItem('fluentia_impersonation')
    return returnPath
  },

  // Restore impersonation from sessionStorage on init (called after auth init)
  restoreImpersonation: async () => {
    const stored = sessionStorage.getItem('fluentia_impersonation')
    if (!stored) return
    try {
      const { userId, role, name, returnPath } = JSON.parse(stored)
      const state = get()
      // Only restore if admin is logged in
      if (state.profile?.role !== 'admin') {
        sessionStorage.removeItem('fluentia_impersonation')
        return
      }
      // Save real data and load impersonated data
      set({
        _realProfile: state.profile,
        _realStudentData: state.studentData,
        _realTrainerData: state.trainerData,
        impersonation: { userId, role, name, returnPath },
      })

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (!profile) {
        sessionStorage.removeItem('fluentia_impersonation')
        return
      }
      set({ profile })

      if (role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('*, groups(*)')
          .eq('id', userId)
          .single()
        set({ studentData: studentData || null, trainerData: null })
      } else if (role === 'trainer') {
        const { data: trainerData } = await supabase
          .from('trainers')
          .select('*')
          .eq('id', userId)
          .single()
        set({ trainerData: trainerData || null, studentData: null })
      }
    } catch {
      sessionStorage.removeItem('fluentia_impersonation')
    }
  },

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
  isImpersonating: () => !!get().impersonation,
}))
