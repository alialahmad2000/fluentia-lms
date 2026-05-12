import { useState, useEffect, useRef } from 'react'

export function useABLoop({ currentTime, seek }) {
  const [markerA, setMarkerAState] = useState(null)
  const [markerB, setMarkerBState] = useState(null)
  const [isLooping, setIsLooping] = useState(false)
  const loopingRef = useRef(false)
  const markerARef = useRef(null)
  const markerBRef = useRef(null)

  useEffect(() => { loopingRef.current = isLooping }, [isLooping])
  useEffect(() => { markerARef.current = markerA }, [markerA])
  useEffect(() => { markerBRef.current = markerB }, [markerB])

  // Enforce loop
  useEffect(() => {
    if (!loopingRef.current) return
    const a = markerARef.current
    const b = markerBRef.current
    if (a !== null && b !== null && currentTime >= b) {
      seek(a)
    }
  }, [currentTime, seek])

  const setMarkerA = (ms) => {
    const b = markerBRef.current
    if (b !== null && ms >= b) {
      setMarkerAState(b)
      setMarkerBState(ms)
    } else {
      setMarkerAState(ms)
    }
  }

  const setMarkerB = (ms) => {
    const a = markerARef.current
    if (a !== null && ms <= a) {
      setMarkerBState(a)
      setMarkerAState(ms)
    } else {
      setMarkerBState(ms)
    }
  }

  const clearMarkers = () => {
    setMarkerAState(null)
    setMarkerBState(null)
    setIsLooping(false)
  }

  const toggleLoop = () => {
    if (markerARef.current === null || markerBRef.current === null) return
    setIsLooping(v => !v)
  }

  return { markerA, markerB, isLooping, setMarkerA, setMarkerB, clearMarkers, toggleLoop }
}
