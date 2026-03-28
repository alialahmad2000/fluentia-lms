import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { tracker } from '../services/activityTracker'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  studentData: null,
  trainerData: null,
  loading: true,
  _authSubscription: null,
  _realtimeChannel: null,

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

    // Listen for auth changes — store subscription so it can be unsubscribed
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await get().fetchProfile(session.user)
        // Initialize activity tracker
        tracker.init(session.user.id)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed — update user object but don't refetch everything
        set({ user: session.user })
      } else if (event === 'SIGNED_OUT') {
        const ch = get()._realtimeChannel
        if (ch) supabase.removeChannel(ch)
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

  // Helpers
  isAdmin: () => get().profile?.role === 'admin',
  isTrainer: () => ['trainer', 'admin'].includes(get().profile?.role),
  isStudent: () => get().profile?.role === 'student',
}))
