import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  Eye, Users, CheckCircle2, Wallet, Copy, Check, QrCode, Download,
  Clock, TrendingUp, DollarSign, MousePointerClick
} from 'lucide-react'

const SHARE_TEXT = 'جرّب أكاديمية طلاقة لتعلم الإنجليزي، عندهم لقاء مبدئي مجاني'

export default function PartnerDashboard() {
  const { affiliate } = useOutletContext()
  const refLink = `https://fluentia.academy/?ref=${affiliate.ref_code}`
  const [copied, setCopied] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['partner-stats', affiliate.id],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

      const [allClicks, monthClicks, leads, conversions, payouts] = await Promise.all([
        supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('affiliate_id', affiliate.id),
        supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('affiliate_id', affiliate.id).gte('created_at', monthStart),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('affiliate_id', affiliate.id),
        supabase.from('affiliate_conversions').select('id, commission_amount, status, created_at').eq('affiliate_id', affiliate.id),
        supabase.from('affiliate_payouts').select('amount, status').eq('affiliate_id', affiliate.id),
      ])

      const convs = conversions.data || []
      const pending = convs.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.commission_amount), 0)
      const ready = convs.filter(c => c.status === 'approved').reduce((s, c) => s + Number(c.commission_amount), 0)
      const paidConvs = convs.filter(c => c.status === 'paid')
      const paidThisYear = paidConvs.reduce((s, c) => s + Number(c.commission_amount), 0)
      const lifetime = convs.reduce((s, c) => s + Number(c.commission_amount), 0)
      const confirmed = convs.filter(c => ['approved', 'paid'].includes(c.status)).length

      return {
        allClicks: allClicks.count || 0,
        monthClicks: monthClicks.count || 0,
        leads: leads.count || 0,
        confirmed,
        ready,
        pending,
        paidThisYear,
        lifetime,
        readyCount: convs.filter(c => c.status === 'approved').length,
      }
    },
  })

  const { data: activity = [] } = useQuery({
    queryKey: ['partner-activity', affiliate.id],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [clicks, convs, pays] = await Promise.all([
        supabase.from('affiliate_clicks').select('id, country, created_at').eq('affiliate_id', affiliate.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('affiliate_conversions').select('id, commission_amount, status, created_at').eq('affiliate_id', affiliate.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('affiliate_payouts').select('id, amount, status, paid_at, created_at').eq('affiliate_id', affiliate.id).order('created_at', { ascending: false }).limit(3),
      ])
      const events = [
        ...(clicks.data || []).map(c => ({ type: 'click', time: c.created_at, label: `نقرة جديدة${c.country ? ' من ' + c.country : ''}` })),
        ...(convs.data || []).map(c => ({ type: 'conversion', time: c.created_at, label: `مبيعة ${c.status === 'paid' ? 'مصروفة' : c.status === 'approved' ? 'مؤكدة' : 'معلقة'} (+${c.commission_amount} ريال)` })),
        ...(pays.data || []).map(p => ({ type: 'payout', time: p.paid_at || p.created_at, label: `دفعة ${p.status === 'paid' ? 'صُرفت' : 'جاري المعالجة'} (${p.amount} ريال)` })),
      ]
      return events.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10)
    },
  })

  const copyLink = () => {
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(refLink)}`

  // Next payout date: 5th of next month
  const now = new Date()
  const nextPayout = new Date(now.getFullYear(), now.getMonth() + 1, 5)
  const nextPayoutStr = nextPayout.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })

  const s = stats || {}

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Eye} label="النقرات" value={s.allClicks || 0} sub={`هذا الشهر: ${s.monthClicks || 0}`} color="text-sky-400" bg="bg-sky-500/10" />
        <StatCard icon={Users} label="العملاء المحتملين" value={s.leads || 0} color="text-violet-400" bg="bg-violet-500/10" />
        <StatCard icon={CheckCircle2} label="المبيعات المؤكدة" value={s.confirmed || 0} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={Wallet} label="الرصيد الجاهز للصرف" value={`${s.ready || 0} ر.س`} color="text-amber-400" bg="bg-amber-500/10" highlight />
      </div>

      {/* Unique Link Card */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(56,189,248,0.05))', border: '1px solid rgba(251,191,36,0.15)' }}>
        <h2 className="text-lg font-bold text-white font-['Tajawal']">رابطك الفريد</h2>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-center gap-2 bg-black/20 rounded-xl px-4 py-3 border border-white/10">
              <code className="text-sm text-amber-400 flex-1 truncate" dir="ltr">{refLink}</code>
              <button onClick={copyLink} className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold font-['Tajawal'] transition">
                {copied ? <><Check size={14} /> تم النسخ</> : <><Copy size={14} /> نسخ</>}
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT + '\n' + refLink)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white/70 font-['Tajawal'] transition border border-white/10">شارك على تويتر</a>
              <a href={`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + '\n' + refLink)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white/70 font-['Tajawal'] transition border border-white/10">شارك على واتساب</a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(SHARE_TEXT)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white/70 font-['Tajawal'] transition border border-white/10">شارك على تيليجرام</a>
            </div>
          </div>
          <div className="shrink-0 text-center space-y-2">
            <img src={qrUrl} alt="QR Code" className="w-28 h-28 rounded-xl bg-white p-1" />
            <a href={qrUrl} download={`fluentia-ref-${affiliate.ref_code}.png`} className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 font-['Tajawal'] transition mx-auto justify-center">
              <Download size={12} /> تحميل QR
            </a>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Balance Breakdown */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-bold text-white font-['Tajawal'] flex items-center gap-2"><DollarSign size={18} className="text-amber-400" /> تفاصيل الرصيد</h3>
          <div className="space-y-2 text-sm font-['Tajawal']">
            <Row label="عمولات معلقة (فترة الحماية)" value={`${s.pending || 0} ريال`} color="text-amber-400" />
            <Row label="عمولات جاهزة للصرف" value={`${s.ready || 0} ريال`} color="text-emerald-400" />
            <Row label="مصروفة هذا العام" value={`${s.paidThisYear || 0} ريال`} color="text-sky-400" />
            <div className="border-t border-white/5 pt-2">
              <Row label="مجموع العمر" value={`${s.lifetime || 0} ريال`} color="text-white" bold />
            </div>
          </div>
        </div>

        {/* Next Payout Preview */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-bold text-white font-['Tajawal'] flex items-center gap-2"><Clock size={18} className="text-sky-400" /> الدفعة القادمة</h3>
          {(s.ready || 0) >= 200 ? (
            <div className="space-y-2">
              <p className="text-sm text-white/70 font-['Tajawal']">
                <span className="text-amber-400 font-bold">{nextPayoutStr}</span> — متوقع <span className="text-emerald-400 font-bold">{s.ready} ريال</span> ({s.readyCount} عملاء)
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-400/70 font-['Tajawal']">
                <CheckCircle2 size={14} />
                رصيدك فوق الحد الأدنى — جاهز للصرف
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-amber-400/80 font-['Tajawal']">
                الرصيد الحالي تحت الحد الأدنى (200 ريال) — سيتم ترحيله للدفعة الجاية.
              </p>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-amber-500/40" style={{ width: `${Math.min(((s.ready || 0) / 200) * 100, 100)}%` }} />
              </div>
              <p className="text-xs text-white/40 font-['Tajawal']">{s.ready || 0} / 200 ريال</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="font-bold text-white font-['Tajawal'] flex items-center gap-2"><TrendingUp size={18} className="text-sky-400" /> آخر النشاطات</h3>
        {activity.length === 0 ? (
          <p className="text-sm text-white/40 font-['Tajawal']">لا يوجد نشاط بعد — شارك رابطك وابدأ!</p>
        ) : (
          <div className="space-y-2">
            {activity.map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-sm font-['Tajawal']">
                <div className={`w-2 h-2 rounded-full shrink-0 ${e.type === 'click' ? 'bg-sky-400' : e.type === 'conversion' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-white/70 flex-1">{e.label}</span>
                <span className="text-white/30 text-xs">{timeAgo(e.time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color, bg, highlight }) {
  return (
    <div className={`rounded-xl p-4 space-y-2 ${highlight ? 'ring-1 ring-amber-500/20' : ''}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon size={18} className={color} />
      </div>
      <div className={`text-xl font-bold font-['Tajawal'] ${highlight ? 'text-amber-400' : 'text-white'}`}>{value}</div>
      <div className="text-xs text-white/50 font-['Tajawal']">{label}</div>
      {sub && <div className="text-xs text-white/30 font-['Tajawal']">{sub}</div>}
    </div>
  )
}

function Row({ label, value, color, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-white/50 ${bold ? 'font-bold text-white/70' : ''}`}>{label}</span>
      <span className={`${color} ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `${mins} د`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} س`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} ي`
  return `${Math.floor(days / 30)} ش`
}
