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
  Send,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../../components/ui/FluentiaToast'

const STATUS_CONFIG = {
  pending:   { label: 'قيد المراجعة', color: 'amber',   bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20'   },
  approved:  { label: 'معتمد',         color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20'  },
  rejected:  { label: 'مرفوض',         color: 'red',     bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20'      },
  suspended: { label: 'موقوف',          color: 'gray',    bg: 'bg-gray-500/10',    text: 'text-gray-400',    border: 'border-gray-500/20'     },
}

// ============================================================
// Welcome email builder — used by both approve and resend paths
// ============================================================
function buildWelcomeEmail(affiliate, magic_link) {
  // also support { ...affiliate, magic_link } merged-object pattern
  const link = magic_link ?? affiliate.magic_link;
  const refLink = `https://fluentia.academy/?ref=${encodeURIComponent(affiliate.ref_code)}`;
  const ctaUrl  = link || 'https://app.fluentia.academy/partner/login';
  const ctaText = link ? 'ادخل لبوابة الشركاء مباشرةً' : 'تسجيل الدخول لبوابة الشركاء';

  const subject = `مرحباً بك في شركاء طلاقة — كودك ${affiliate.ref_code} جاهز 🎉`;

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b1628;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#e5e7eb;">
  <div style="max-width:560px;margin:32px auto;background:#111d35;border-radius:16px;padding:32px;text-align:right;">
    <h1 style="color:#fbbf24;font-size:28px;margin:0 0 16px;">مرحباً ${affiliate.full_name} 🎉</h1>
    <p style="font-size:16px;line-height:1.7;color:#e5e7eb;margin:0 0 16px;">
      تم اعتماد طلبك في <strong>برنامج شركاء أكاديمية طلاقة</strong>. أنت الآن جاهز لبدء التسويق والكسب.
    </p>

    <div style="background:#0b1628;border:1px solid #1f2d4a;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;">كودك التسويقي:</p>
      <p style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#fbbf24;letter-spacing:2px;">
        ${affiliate.ref_code}
      </p>
      <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;">رابطك للتسويق:</p>
      <p style="margin:0;font-size:14px;word-break:break-all;">
        <a href="${refLink}" style="color:#7dd3fc;text-decoration:none;">${refLink}</a>
      </p>
    </div>

    <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">
      كل طالب يسجّل ويدفع عبر رابطك = <strong style="color:#fbbf24;">100 ريال عمولة لك</strong>.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(90deg,#fbbf24,#f59e0b);color:#0b1628;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">
        ${ctaText}
      </a>
    </div>

    ${link ? `<p style="font-size:13px;color:#94a3b8;text-align:center;margin:0 0 16px;">الرابط صالح لمرة واحدة فقط — استخدمه لتعيين كلمة مرورك.</p>` : ''}

    <p style="font-size:14px;color:#94a3b8;line-height:1.7;margin:24px 0 0;border-top:1px solid #1f2d4a;padding-top:16px;">
      إذا واجهت أي صعوبة بالدخول، تواصل معنا على واتساب: +966558669974
    </p>
  </div>

  <p style="text-align:center;color:#64748b;font-size:12px;margin:16px 0 32px;">
    أكاديمية طلاقة | Fluentia Academy
  </p>
</body>
</html>`;

  return { subject, html };
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
  const [isProcessing, setIsProcessing] = useState(false)

  const { data: affiliate, isLoading, refetch } = useQuery({
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

  // ── Edge-function caller ───────────────────────────────────────────────────
  const callEdgeFunction = async (name, body) => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) throw new Error('انتهت الجلسة، سجّل دخول من جديد.');

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
    console.log(`[${name}] calling with`, body);

    let res, text, data;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      console.error(`[${name}] network error`, networkErr);
      throw new Error(`فشل الاتصال بالخادم: ${networkErr.message}`);
    }

    text = await res.text();
    try { data = JSON.parse(text); }
    catch {
      console.error(`[${name}] non-JSON response (status ${res.status}):`, text);
      throw new Error(`الخادم رجّع ردًا غير متوقّع (status ${res.status}). راجع console.`);
    }

    console.log(`[${name}] response`, res.status, data);

    if (!res.ok || !data.success) {
      const msg = data.error || `فشل (HTTP ${res.status})`;
      const detail = data.detail ? ` — ${data.detail}` : '';
      throw new Error(msg + detail);
    }

    return data;
  };

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!window.confirm('هل أنت متأكد من اعتماد هذا الطلب وإرسال إيميل الدخول؟')) return;
    setIsProcessing(true);
    try {
      const approveData = await callEdgeFunction('approve-affiliate', { affiliate_id: affiliate.id });

      const { subject, html } = buildWelcomeEmail({ ...affiliate, magic_link: approveData.magic_link });

      try {
        await callEdgeFunction('send-email', { to: affiliate.email, subject, html });
        alert('تم اعتماد المسوق وإرسال إيميل الدخول بنجاح ✅');
      } catch (emailErr) {
        console.error('email send failed (approval still succeeded):', emailErr);
        alert(`تم الاعتماد ✅ لكن الإيميل ما انرسل: ${emailErr.message}\nاستخدم زر "إعادة إرسال" لاحقاً.`);
      }

      queryClient.invalidateQueries({ queryKey: ['admin-affiliate', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      await refetch();
    } catch (err) {
      console.error('[handleApprove] FAILED:', err);
      alert(`خطأ في الاعتماد:\n\n${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Resend invite link ─────────────────────────────────────────────────────
  const handleResendEmail = async () => {
    if (!window.confirm('هل تريد إعادة إرسال إيميل الدخول؟ سيتم إنشاء رابط دخول جديد.')) return;
    setIsProcessing(true);
    try {
      const linkData = await callEdgeFunction('resend-affiliate-invite', { affiliate_id: affiliate.id });

      const { subject, html } = buildWelcomeEmail({ ...affiliate, magic_link: linkData.magic_link });

      await callEdgeFunction('send-email', { to: affiliate.email, subject, html });

      alert('تم إرسال إيميل الدخول بنجاح ✅');
    } catch (err) {
      console.error('[handleResendEmail] FAILED:', err);
      alert(`خطأ في إعادة الإرسال:\n\n${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

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

  // ── Remaining handlers ─────────────────────────────────────────────────────
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

  const anyLoading = isProcessing || rejectMutation.isPending || suspendMutation.isPending || reactivateMutation.isPending

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
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
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
              <>
                <button
                  onClick={handleResendEmail}
                  disabled={anyLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  إعادة إرسال رابط الدخول
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={anyLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                >
                  {suspendMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <PauseCircle size={16} />}
                  إيقاف
                </button>
              </>
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
          <InfoCard icon={User}       label="الاسم الكامل"          value={affiliate.full_name} />
          <InfoCard icon={Mail}       label="البريد الإلكتروني"      value={affiliate.email}     dir="ltr" />
          <InfoCard icon={Phone}      label="رقم الهاتف"             value={affiliate.phone}     dir="ltr" />
          <InfoCard icon={MapPin}     label="المدينة"                value={affiliate.city} />
          <InfoCard icon={LinkIcon}   label="تويتر / X"              value={affiliate.twitter}   dir="ltr" isLink />
          <InfoCard icon={LinkIcon}   label="إنستغرام"               value={affiliate.instagram} dir="ltr" isLink />
          <InfoCard icon={LinkIcon}   label="تيك توك"               value={affiliate.tiktok}    dir="ltr" isLink />
          <InfoCard icon={LinkIcon}   label="سناب شات"               value={affiliate.snapchat}  dir="ltr" isLink />
          <InfoCard icon={Globe}      label="موقع / مدونة"           value={affiliate.website}   dir="ltr" isLink />
          <InfoCard icon={Users}      label="حجم الجمهور"            value={affiliate.audience_size} />
          <InfoCard icon={MessageSquare} label="كيف سمعت عنّا"       value={affiliate.heard_from} />
        </div>

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
