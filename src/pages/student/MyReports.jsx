import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bug, ChevronDown, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/ui/FluentiaToast'
import { useG } from '@/i18n/gender'

const STATUS_META = {
  new:         { label: 'قيد المراجعة', cls: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  in_progress: { label: 'نشتغل عليها',  cls: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  resolved:    { label: 'تم الحل',      cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  wontfix:     { label: 'مغلق',         cls: 'text-slate-400 bg-white/5 border-white/10' },
}

function fmtDate(s) {
  try { return new Date(s).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '' }
}

export default function MyReports() {
  const g = useG()
  const profile = useAuthStore((s) => s.profile)
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('report')
  const [reports, setReports] = useState(null)
  const [openId, setOpenId] = useState(focusId || null)

  const load = useCallback(async () => {
    if (!profile?.id) return
    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .eq('reporter_id', profile.id)
      .order('created_at', { ascending: false })
    if (error) { toast({ type: 'error', title: 'تعذّر تحميل بلاغاتك', description: error.message }); return }
    setReports(data || [])
  }, [profile?.id])

  useEffect(() => { load() }, [load])

  return (
    <div dir="rtl" className="max-w-2xl mx-auto" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
          <Bug className="w-5 h-5 text-sky-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">بلاغاتي</h1>
          <p className="text-sm text-slate-400">{g('تابع حالة المشكلات التي أبلغت عنها ورُدّ علينا', 'تابعي حالة المشكلات التي أبلغتِ عنها وردّي علينا')}</p>
        </div>
      </div>

      {reports === null && (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-sky-400 animate-spin" /></div>
      )}

      {reports?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Bug className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{g('لا توجد بلاغات بعد. إذا واجهت مشكلة، استخدم زر «أبلغ عن مشكلة».', 'لا توجد بلاغات بعد. إذا واجهتِ مشكلة، استخدمي زر «أبلغ عن مشكلة».')}</p>
        </div>
      )}

      <div className="space-y-3">
        {reports?.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            isOpen={openId === r.id}
            onToggle={() => setOpenId(openId === r.id ? null : r.id)}
            currentUserId={profile?.id}
            onChanged={load}
          />
        ))}
      </div>
    </div>
  )
}

function ReportCard({ report, isOpen, onToggle, currentUserId, onChanged }) {
  const g = useG()
  const meta = STATUS_META[report.status] || STATUS_META.new
  const [messages, setMessages] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('bug_report_messages')
      .select('*')
      .eq('report_id', report.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }, [report.id])

  useEffect(() => { if (isOpen) loadMessages() }, [isOpen, loadMessages])

  const sendReply = async () => {
    const body = reply.trim()
    if (!body || sending) return
    setSending(true)
    const { error } = await supabase.from('bug_report_messages').insert({
      report_id: report.id, sender_id: currentUserId, sender_role: 'student', body,
    })
    setSending(false)
    if (error) { toast({ type: 'error', title: 'تعذّر إرسال الرد', description: error.message }); return }
    setReply('')
    loadMessages()
    toast({ type: 'success', title: 'وصلنا ردّك ✅' })
  }

  const verdict = async (fixed) => {
    if (sending) return
    setSending(true)
    const { error } = await supabase.rpc('bug_report_reporter_verdict', { p_report_id: report.id, p_fixed: fixed })
    setSending(false)
    if (error) { toast({ type: 'error', title: 'تعذّر الحفظ', description: error.message }); return }
    toast({ type: 'success', title: fixed ? 'شكراً لك 🌿' : 'وصلنا — بنكمل الحل', description: fixed ? 'سعداء أنها اتحلّت.' : 'بلّغنا الفريق إنها لا تزال موجودة.' })
    loadMessages(); onChanged()
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-start gap-3 p-4 text-right">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
            {report.reporter_status === 'confirmed_fixed' && <span className="text-[11px] text-emerald-300">✓ أكّدتِ الحل</span>}
            {report.reporter_status === 'still_broken' && <span className="text-[11px] text-rose-300">● أبلغتِ أنها مستمرة</span>}
            <span className="text-[11px] text-slate-500">{fmtDate(report.created_at)}</span>
          </div>
          <p className="text-sm text-slate-200 line-clamp-2 whitespace-pre-wrap">{report.description}</p>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-white/10 pt-3">
              <div className="space-y-2 mb-3">
                {messages === null && <div className="text-xs text-slate-500">جارٍ التحميل…</div>}
                {messages?.length === 0 && <div className="text-xs text-slate-500">لا توجد ردود بعد. {g('اكتب لنا إذا عندك تفاصيل إضافية.', 'اكتبي لنا إذا عندك تفاصيل إضافية.')}</div>}
                {messages?.map((m) => {
                  const mine = m.sender_id === currentUserId
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${mine ? 'bg-sky-500/15 text-sky-50' : 'bg-white/[0.06] text-slate-100'}`}>
                        {!mine && <div className="text-[10px] text-amber-300/80 mb-0.5">فريق الدعم</div>}
                        {m.body}
                        <div className="text-[10px] text-slate-500 mt-1">{fmtDate(m.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => verdict(true)} disabled={sending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 disabled:opacity-50">
                  <CheckCircle2 className="w-4 h-4" /> تم الحل
                </button>
                <button onClick={() => verdict(false)} disabled={sending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/20 hover:bg-rose-500/25 disabled:opacity-50">
                  <AlertCircle className="w-4 h-4" /> لا تزال موجودة
                </button>
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  value={reply} onChange={(e) => setReply(e.target.value)} rows={1} placeholder={g('اكتب ردّك…', 'اكتبي ردّك…')}
                  className="flex-1 resize-none rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500/40"
                  style={{ fontSize: '16px' }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()}
                  className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center disabled:opacity-40 shrink-0">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
