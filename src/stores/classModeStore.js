import { create } from 'zustand'

const useClassMode = create((set) => ({
  isClassMode: false,
  classStartedAt: null,
  currentUnitId: null,
  pointsGiven: [],
  attendanceMarked: false,

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
  }),

  endClass: () => set({
    isClassMode: false,
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
