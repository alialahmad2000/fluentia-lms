import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  studentData: null,
  trainerData: null,
  loading: true,

  initialize: async () => {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await get().fetchProfile(session.user)
    }
    set({ loading: false })

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await get().fetchProfile(session.user)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed — update user object but don't refetch everything
        set({ user: session.user })
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, studentData: null, trainerData: null })
      }
    })
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
    await supabase.auth.signOut()
  },

  // Helpers
  isAdmin: () => get().profile?.role === 'admin',
  isTrainer: () => ['trainer', 'admin'].includes(get().profile?.role),
  isStudent: () => get().profile?.role === 'student',
}))
