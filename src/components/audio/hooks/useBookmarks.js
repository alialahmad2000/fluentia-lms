import { useState, useCallback } from 'react'

const MAX_BOOKMARKS = 10
const lsKey = (contentId) => `fluentia:player:bookmarks:${contentId}`

function load(contentId) {
  try { return JSON.parse(localStorage.getItem(lsKey(contentId)) || '[]') } catch { return [] }
}
function save(contentId, items) {
  try { localStorage.setItem(lsKey(contentId), JSON.stringify(items)) } catch {}
}

export function useBookmarks({ contentId, seek }) {
  const [bookmarks, setBookmarks] = useState(() => contentId ? load(contentId) : [])

  const addBookmark = useCallback((positionMs, label) => {
    setBookmarks(prev => {
      const next = [
        ...prev,
        { id: Date.now().toString(), position_ms: positionMs, label: label || null, created_at: new Date().toISOString() }
      ].slice(-MAX_BOOKMARKS)
      save(contentId, next)
      return next
    })
  }, [contentId])

  const removeBookmark = useCallback((id) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.id !== id)
      save(contentId, next)
      return next
    })
  }, [contentId])

  const jumpToBookmark = useCallback((id) => {
    const bm = bookmarks.find(b => b.id === id)
    if (bm) seek(bm.position_ms)
  }, [bookmarks, seek])

  return { bookmarks, addBookmark, removeBookmark, jumpToBookmark }
}
