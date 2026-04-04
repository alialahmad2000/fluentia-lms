import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'
import { tracker } from '../services/activityTracker'

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
    // Get initial session
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await get().fetchProfile(session.user)
      }
    } catch (err) {
      console.error('[AuthStore] getSession error:', err)
    }
    set({ loading: false })

    // Restore impersonation if admin was viewing as another user
    await get().restoreImpersonation()

    // Listen for auth changes — store subscription so it can be unsubscribed
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await get().fetchProfile(session.user)
        // Initialize activity tracker
        tracker.init(session.user.id)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed — update user object and invalidate stale queries
        set({ user: session.user })
        queryClient.invalidateQueries()
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
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        console.error('[AuthStore] fetchProfile error:', error)
        set({ user, profile: null })
        return
      }

      set({ user, profile })

      if (profile.role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('*, groups(*)')
          .eq('id', user.id)
          .single()
        set({ studentData: studentData || null })

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
        const { data: trainerData } = await supabase
          .from('trainers')
          .select('*')
          .eq('id', user.id)
          .single()
        set({ trainerData: trainerData || null })
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
