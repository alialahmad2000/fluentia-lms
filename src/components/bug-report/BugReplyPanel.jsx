import { useState, useEffect, useCallback } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/ui/FluentiaToast'

// Staff-side reply thread for a bug-report ticket. Drop into the admin bug-report
// detail with <BugReplyPanel reportId={report.id} />. Posting a reply fires the
// DB trigger that notifies the student who reported it.
export default function BugReplyPanel({ reportId }) {
  const profile = useAuthStore((s) => s.profile)
  const [messages, setMessages] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    if (!reportId) return
    const { data } = await supabase
      .from('bug_report_messages')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }, [reportId])

  useEffect(() => { load() }, [load])

  const send = async () => {
    const body = reply.trim()
    if (!body || sending) return
    setSending(true)
    const { error } = await supabase.from('bug_report_messages').insert({
      report_id: reportId,
      sender_id: profile?.id,
      sender_role: profile?.role === 'trainer' ? 'trainer' : 'admin',
      body,
    })
    setSending(false)
    if (error) { toast({ type: 'error', title: 'تعذّر إرسال الرد', description: error.message }); return }
    setReply('')
    load()
    toast({ type: 'success', title: 'تم إرسال الرد للطالب ✅' })
  }

  return (
    <div dir="rtl" className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      <div className="text-xs text-slate-400 mb-2">المحادثة مع الطالب</div>
      <div className="space-y-2 mb-2 max-h-60 overflow-y-auto">
        {messages === null && <div className="text-xs text-slate-500">جارٍ التحميل…</div>}
        {messages?.length === 0 && <div className="text-xs text-slate-500">لا توجد رسائل بعد.</div>}
        {messages?.map((m) => {
          const staff = m.sender_role === 'admin' || m.sender_role === 'trainer'
          return (
            <div key={m.id} className={`flex ${staff ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm whitespace-pre-wrap ${staff ? 'bg-sky-500/15 text-sky-50' : 'bg-white/[0.06] text-slate-100'}`}>
                <div className="text-[10px] opacity-70 mb-0.5">{staff ? 'أنت / الفريق' : 'الطالب'}</div>
                {m.body}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={reply} onChange={(e) => setReply(e.target.value)} rows={1} placeholder="اكتب ردّك للطالب…"
          className="flex-1 resize-none rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500/40"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        />
        <button onClick={send} disabled={sending || !reply.trim()}
          className="w-10 h-10 rounded-lg bg-sky-500 text-white flex items-center justify-center disabled:opacity-40 shrink-0">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
