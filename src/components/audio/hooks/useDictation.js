import { useState, useCallback, useRef } from 'react'

function splitSentences(text) {
  // Handles Dr., Mr., 3.14, etc.
  return text
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  }
  return dp[m][n]
}

function diffWords(typed, original) {
  const tWords = typed.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const oWords = original.trim().toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/).filter(Boolean)
  let correct = 0
  const results = oWords.map((orig, i) => {
    const typed = tWords[i] || ''
    const dist = levenshtein(typed, orig)
    const status = dist === 0 ? 'correct' : dist <= 2 ? 'close' : 'wrong'
    if (status === 'correct') correct++
    return { word: orig, typed, status }
  })
  return { results, score: oWords.length ? Math.round((correct / oWords.length) * 100) : 0 }
}

export function useDictation({ enabled, segments, currentSegmentIndex, seek, pause, play, onDictationSubmit }) {
  const [active, setActive] = useState(false)
  const [sentenceIdx, setSentenceIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [lastDiff, setLastDiff] = useState(null)
  const [waitingForInput, setWaitingForInput] = useState(false)
  const sentencesRef = useRef([])

  const start = useCallback(() => {
    const seg = segments?.[currentSegmentIndex]
    if (!seg) return
    sentencesRef.current = splitSentences(seg.text_content || '')
    setSentenceIdx(0)
    setTyped('')
    setLastDiff(null)
    setActive(true)
    setWaitingForInput(false)
  }, [segments, currentSegmentIndex])

  const stop = useCallback(() => {
    setActive(false)
    setWaitingForInput(false)
  }, [])

  const submit = useCallback(() => {
    const sentence = sentencesRef.current[sentenceIdx]
    if (!sentence) return
    const diff = diffWords(typed, sentence)
    setLastDiff(diff)
    setWaitingForInput(false)
    onDictationSubmit?.(typed, sentence, diff)
  }, [typed, sentenceIdx, onDictationSubmit])

  const nextSentence = useCallback(() => {
    const next = sentenceIdx + 1
    if (next >= sentencesRef.current.length) {
      setActive(false)
    } else {
      setSentenceIdx(next)
      setTyped('')
      setLastDiff(null)
      setWaitingForInput(false)
    }
  }, [sentenceIdx])

  const currentSentence = active ? sentencesRef.current[sentenceIdx] : null
  const totalSentences = sentencesRef.current.length

  return {
    active, start, stop,
    sentenceIdx, totalSentences, currentSentence,
    typed, setTyped,
    lastDiff, submit, nextSentence,
    waitingForInput, setWaitingForInput,
  }
}
