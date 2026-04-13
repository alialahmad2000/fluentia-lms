import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Users,
  MessageSquare,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Save,
  Link as LinkIcon,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../../components/ui/FluentiaToast'

const STATUS_CONFIG = {
  pending: { label: 'قيد المراجعة', color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  approved: { label: 'معتمد', color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  rejected: { label: 'مرفوض', color: 'red', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  suspended: { label: 'موقوف', color: 'gray', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  )
}

function InfoCard({ icon: Icon, label, value, dir, isLink }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[var(--surface-base)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} className="text-muted" />
      </div>
      <div className="min-w-0">
        <p className="text-muted text-xs mb-0.5">{label}</p>
        {isLink && value ? (
          <a
            href={value.startsWith('http') ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 text-sm break-all transition-colors"
            dir={dir}
          >
            {value}
          </a>
        ) : (
          <p className="text-[var(--text-primary)] text-sm break-all" dir={dir}>{value || '—'}</p>
        )}
      </div>
    </div>
  )
}

export default function AffiliateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()
  const [adminNotes, setAdminNotes] = useState('')
  const [notesLoaded, setNotesLoaded] = useState(false)

  const { data: affiliate, isLoading } = useQuery({
    queryKey: ['admin-affiliate', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (!notesLoaded) {
        setAdminNotes(data?.notes || '')
        setNotesLoaded(true)
      }
    },
  })

  // ── Approve ────────────────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: async () => {
      // Update affiliate status
      const { error } = await supabase
        .from('affiliates')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profile?.id,
        })
        .eq('id', id)
      if (error) throw error

      // Create/update profile with 'affiliate' role so they can log in to /partner
      if (affiliate.user_id) {
        await supabase.from('profiles').update({ role: 'affiliate' }).eq('id', affiliate.user_id)
      } else {
        // Create auth user + profile for the affiliate
        const tempPass = 'Fluentia!' + Math.random().toString(36).slice(2, 8)
        const { data: authData } = await supabase.auth.signUp({
          email: affiliate.email,
          password: tempPass,
          options: { data: { full_name: affiliate.full_name } },
        })
        if (authData?.user?.id) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            full_name: affiliate.full_name,
            email: affiliate.email,
            phone: affiliate.phone,
            role: 'affiliate',
          }, { onConflict: 'id' })
          await supabase.from('affiliates').update({ user_id: authData.user.id }).eq('id', id)
        }
      }

      // Send approval email via edge function
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            to: affiliate.email,
            subject: 'مبروك! تم اعتماد طلبك كشريك في أكاديمية طلاقة',
            html: `<div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h1 style="color:#38bdf8;">مبروك ${affiliate.full_name}!</h1>
              <p>تم اعتماد طلبك كشريك في أكاديمية طلاقة.</p>
              <p><strong>رابطك الفريد:</strong><br/><code>https://fluentia.academy/?ref=${affiliate.ref_code}</code></p>
              <p><strong>QR Code:</strong><br/><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://fluentia.academy/?ref=' + affiliate.ref_code)}" width="200" height="200"/></p>
              <p><strong>العمولة:</strong> 100 ريال عن كل طالب ينضم ويدفع أول دفعة.</p>
              <p>شارك رابطك في حساباتك وابدأ الربح!</p>
            </div>`,
          }),
        })
      } catch (emailErr) {
        console.warn('Email send failed (non-blocking):', emailErr)
      }
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'تم اعتماد الشريك بنجاح', description: 'تم إرسال إيميل الاعتماد' })
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] })
    },
    onError: (err) => {
      toast({ type: 'error', title: 'خطأ في الاعتماد', description: err.message })
    },
  })

  // ── Reject ─────────────────────────────────────────────────────────────────
  const rejectMutation = useMutation({
    mutationFn: async (reason) => {
      const { error } = await supabase
        .from('affiliates')
        .update({
          status: 'rejected',
          rejected_reason: reason,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'تم رفض الطلب' })
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] })
    },
    onError: (err) => {
      toast({ type: 'error', title: 'خطأ', description: err.message })
    },
  })

  // ── Suspend ────────────────────────────────────────────────────────────────
  const suspendMutation = useMutation({
    mutationFn: async (reason) => {
      const currentNotes = affiliate?.notes || ''
      const newNotes = currentNotes
        ? `${currentNotes}\n\n[إيقاف - ${new Date().toLocaleDateString('ar-SA')}]: ${reason}`
        : `[إيقاف - ${new Date().toLocaleDateString('ar-SA')}]: ${reason}`
      const { error } = await supabase
        .from('affiliates')
        .update({
          status: 'suspended',
          notes: newNotes,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إيقاف الشريك' })
      setNotesLoaded(false)
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] })
    },
    onError: (err) => {
      toast({ type: 'error', title: 'خطأ', description: err.message })
    },
  })

  // ── Reactivate ─────────────────────────────────────────────────────────────
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('affiliates')
        .update({ status: 'approved' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إعادة تفعيل الشريك' })
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] })
    },
    onError: (err) => {
      toast({ type: 'error', title: 'خطأ', description: err.message })
    },
  })

  // ── Save Notes ─────────────────────────────────────────────────────────────
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('affiliates')
        .update({ notes: adminNotes })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حفظ الملاحظات' })
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate', id] })
    },
    onError: (err) => {
      toast({ type: 'error', title: 'خطأ', description: err.message })
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleApprove() {
    if (!window.confirm('هل تريد اعتماد هذا الشريك؟')) return
    approveMutation.mutate()
  }

  function handleReject() {
    const reason = window.prompt('سبب الرفض:')
    if (!reason) return
    rejectMutation.mutate(reason)
  }

  function handleSuspend() {
    const reason = window.prompt('سبب الإيقاف:')
    if (!reason) return
    suspendMutation.mutate(reason)
  }

  function handleReactivate() {
    if (!window.confirm('هل تريد إعادة تفعيل هذا الشريك؟')) return
    reactivateMutation.mutate()
  }

  const anyLoading = approveMutation.isPending || rejectMutation.isPending || suspendMutation.isPending || reactivateMutation.isPending

  // ── Loading / Not Found ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-muted" />
      </div>
    )
  }

  if (!affiliate) {
    return (
      <div className="fl-card-static p-12 text-center text-muted">
        لم يتم العثور على الشريك
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-10"
    >
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/affiliates')}
        className="flex items-center gap-2 text-muted hover:text-[var(--text-primary)] transition-colors text-sm"
      >
        <ArrowRight size={16} />
        العودة لقائمة الشركاء
      </button>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="fl-card-static p-7">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <User size={26} className="text-sky-400" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-page-title text-[var(--text-primary)]">{affiliate.full_name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={affiliate.status} />
                <code className="text-xs bg-[var(--surface-base)] px-2 py-1 rounded text-sky-400">
                  {affiliate.ref_code}
                </code>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {affiliate.status === 'pending' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={anyLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {approveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  اعتماد
                </button>
                <button
                  onClick={handleReject}
                  disabled={anyLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  {rejectMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  رفض
                </button>
              </>
            )}
            {affiliate.status === 'approved' && (
              <button
                onClick={handleSuspend}
                disabled={anyLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50"
              >
                {suspendMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <PauseCircle size={16} />}
                إيقاف
              </button>
            )}
            {affiliate.status === 'suspended' && (
              <button
                onClick={handleReactivate}
                disabled={anyLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
              >
                {reactivateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                إعادة تفعيل
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Application Details ─────────────────────────────────────────────── */}
      <div className="fl-card-static p-7 space-y-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">بيانات الطلب</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoCard icon={User} label="الاسم الكامل" value={affiliate.full_name} />
          <InfoCard icon={Mail} label="البريد الإلكتروني" value={affiliate.email} dir="ltr" />
          <InfoCard icon={Phone} label="رقم الهاتف" value={affiliate.phone} dir="ltr" />
          <InfoCard icon={MapPin} label="المدينة" value={affiliate.city} />
          <InfoCard icon={LinkIcon} label="تويتر / X" value={affiliate.twitter} dir="ltr" isLink />
          <InfoCard icon={LinkIcon} label="إنستغرام" value={affiliate.instagram} dir="ltr" isLink />
          <InfoCard icon={LinkIcon} label="تيك توك" value={affiliate.tiktok} dir="ltr" isLink />
          <InfoCard icon={LinkIcon} label="سناب شات" value={affiliate.snapchat} dir="ltr" isLink />
          <InfoCard icon={Globe} label="موقع / مدونة" value={affiliate.website} dir="ltr" isLink />
          <InfoCard icon={Users} label="حجم الجمهور" value={affiliate.audience_size} />
          <InfoCard icon={MessageSquare} label="كيف سمعت عنّا" value={affiliate.heard_from} />
        </div>

        {/* Why Join - full width */}
        {affiliate.why_join && (
          <div className="mt-4">
            <p className="text-muted text-xs mb-1">لماذا تريد الانضمام؟</p>
            <div className="bg-[var(--surface-base)] rounded-lg p-4 text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap">
              {affiliate.why_join}
            </div>
          </div>
        )}
      </div>

      {/* ── Dates ───────────────────────────────────────────────────────────── */}
      <div className="fl-card-static p-7 space-y-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">التواريخ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <InfoCard
            icon={Calendar}
            label="تاريخ التقديم"
            value={affiliate.created_at ? new Date(affiliate.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
          />
          <InfoCard
            icon={Calendar}
            label="تاريخ الاعتماد"
            value={affiliate.approved_at ? new Date(affiliate.approved_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
          />
          <InfoCard
            icon={Calendar}
            label="قبول الشروط"
            value={affiliate.terms_accepted_at ? new Date(affiliate.terms_accepted_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
          />
        </div>
      </div>

      {/* ── Rejection Reason ────────────────────────────────────────────────── */}
      {affiliate.status === 'rejected' && affiliate.rejected_reason && (
        <div className="fl-card-static p-7 border-red-500/20">
          <h2 className="text-lg font-semibold text-red-400 mb-3">سبب الرفض</h2>
          <p className="text-[var(--text-primary)] text-sm leading-relaxed">{affiliate.rejected_reason}</p>
        </div>
      )}

      {/* ── Admin Notes ─────────────────────────────────────────────────────── */}
      <div className="fl-card-static p-7 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">ملاحظات الإدارة</h2>
        <textarea
          value={adminNotes}
          onChange={e => setAdminNotes(e.target.value)}
          rows={4}
          className="input-field w-full text-sm resize-y"
          placeholder="أضف ملاحظاتك هنا..."
        />
        <button
          onClick={() => saveNotesMutation.mutate()}
          disabled={saveNotesMutation.isPending}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
        >
          {saveNotesMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          حفظ الملاحظات
        </button>
      </div>
    </motion.div>
  )
}
