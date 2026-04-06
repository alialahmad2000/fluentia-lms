import { create } from 'zustand'

const useClassMode = create((set) => ({
  isClassMode: false,
  classStartedAt: null,
  currentUnitId: null,
  pointsGiven: [],
  attendanceMarked: false,
  showPostSummary: false,

  // Timer state (persists across popup close)
  timerSeconds: 0,
  timerRunning: false,
  timerVisible: false, // visible to students

  startClass: (unitId) => set({
    isClassMode: true,
    classStartedAt: new Date().toISOString(),
    currentUnitId: unitId,
    pointsGiven: [],
    attendanceMarked: false,
    showPostSummary: false,
  }),

  endClass: () => set((state) => ({
    isClassMode: false,
    showPostSummary: true,
    // Keep classStartedAt, currentUnitId, pointsGiven for the summary
  })),

  dismissSummary: () => set({
    showPostSummary: false,
    classStartedAt: null,
    currentUnitId: null,
    pointsGiven: [],
    attendanceMarked: false,
  }),

  addPointRecord: (record) => set(state => ({
    pointsGiven: [...state.pointsGiven, record],
  })),

  markAttendance: () => set({ attendanceMarked: true }),

  setTimer: (seconds) => set({ timerSeconds: seconds }),
  setTimerRunning: (running) => set({ timerRunning: running }),
  setTimerVisible: (visible) => set({ timerVisible: visible }),
}))

export default useClassMode
