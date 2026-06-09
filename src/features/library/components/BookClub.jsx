// Per-novel book club. Readers share thoughts (spoiler-tagged by chapter); posts
// ahead of the reader's progress are blurred until tapped. Live via realtime.
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuthProfileId } from '../../../stores/authStore'
import { useDiscussions, postDiscussion } from '../hooks/useLibraryEngagement'

const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'الآن'; if (s < 3600) return `قبل ${Math.floor(s / 60)} د`
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`; return `قبل ${Math.floor(s / 86400)} يوم`
}
const initials = (n) => (n || '؟').trim().slice(0, 1)

export default function BookClub({ bookId, bookTitle, authorName, viewerChapter, totalChapters, seedText, onSeedUsed }) {
  const qc = useQueryClient()
  const myId = useAuthProfileId()
  const { data: posts = [], isLoading } = useDiscussions(bookId)
  const [body, setBody] = useState(seedText || '')
  const [chapter, setChapter] = useState(viewerChapter || null)
  const [sending, setSending] = useState(false)
  const [reveal, setReveal] = useState({})

  useEffect(() => { if (seedText) { setBody(seedText); onSeedUsed?.() } }, [seedText]) // eslint-disable-line
  // live updates
  useEffect(() => {
    if (!bookId) return
    const ch = supabase.channel(`bookclub-${bookId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'library_discussions', filter: `book_id=eq.${bookId}` },
        () => qc.invalidateQueries({ queryKey: ['lib-discussions', bookId] }))
      .subscribe()
    return () => { ch.unsubscribe(); supabase.removeChannel(ch) }
  }, [bookId, qc])

  const send = async () => {
    if (!body.trim() || sending) return
    setSending(true)
    const r = await postDiscussion(myId, bookId, { body: body.trim(), chapter_number: chapter, author_name: authorName })
    setSending(false)
    if (r.ok) { setBody(''); qc.invalidateQueries({ queryKey: ['lib-discussions', bookId] }) }
  }

  return (
    <div className="lib-club" dir="rtl">
      <div className="lib-club-head"><MessageCircle size={16} /> نادي القرّاء — «{bookTitle}»</div>
      <div className="lib-club-compose">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} dir="auto"
          placeholder="شاركي رأيك في الرواية أو فصلٍ منها…" />
        <div className="lib-club-compose-row">
          <select value={chapter ?? ''} onChange={(e) => setChapter(e.target.value ? Number(e.target.value) : null)}>
            <option value="">بدون فصل</option>
            {Array.from({ length: totalChapters || 0 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>فصل {n}</option>
            ))}
          </select>
          <button className="lib-club-send" disabled={!body.trim() || sending} onClick={send}>
            <Send size={14} /> نشر
          </button>
        </div>
      </div>
      {isLoading ? <div className="lib-skel" style={{ height: 80 }} />
        : !posts.length ? <div className="lib-club-empty">كوني أول من يشارك رأيه ✦</div>
          : (
            <div className="lib-club-list">
              {posts.map((p) => {
                const spoiler = viewerChapter != null && p.chapter_number != null && p.chapter_number > viewerChapter && !reveal[p.id]
                return (
                  <div key={p.id} className="lib-club-post" data-pin={p.is_pinned || undefined}>
                    <div className="lib-club-ava">{initials(p.author_name)}</div>
                    <div className="lib-club-main">
                      <div className="lib-club-meta">
                        <b>{p.author_name || 'قارئ'}</b>
                        {p.chapter_number != null && <span className="lib-club-ch">فصل {p.chapter_number}</span>}
                        <i>{timeAgo(p.created_at)}</i>
                      </div>
                      {spoiler
                        ? <button className="lib-club-spoiler" onClick={() => setReveal((r) => ({ ...r, [p.id]: true }))}>حرق أحداث (فصل {p.chapter_number}) — اضغطي للعرض</button>
                        : <p className="lib-club-body" dir="auto">{p.body}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
    </div>
  )
}
