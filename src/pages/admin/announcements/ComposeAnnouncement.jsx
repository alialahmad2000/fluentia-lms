import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Send, Eye, ChevronDown, ChevronUp, Bell, Users, Megaphone } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { toast } from '../../../components/ui/FluentiaToast'

const ROLE_OPTIONS = [
  { value: 'student', label: 'الطلاب' },
  { value: 'trainer', label: 'المدربين' },
  { value: 'admin', label: 'المدراء' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'منخفضة' },
  { value: 'normal', label: 'عادية' },
  { value: 'high', label: 'عالية' },
  { value: 'urgent', label: 'عاجلة' },
]

export default function ComposeAnnouncement() {
  const { profile } = useAuthStore()
  const [titleDefault, setTitleDefault] = useState('')
  const [bodyDefault, setBodyDefault] = useState('')
  const [titleStudent, setTitleStudent] = useState('')
  const [bodyStudent, setBodyStudent] = useState('')
  const [titleTrainer, setTitleTrainer] = useState('')
  const [bodyTrainer, setBodyTrainer] = useState('')
  const [titleAdmin, setTitleAdmin] = useState('')
  const [bodyAdmin, setBodyAdmin] = useState('')
  const [targetRoles, setTargetRoles] = useState(['student', 'trainer', 'admin'])
  const [actionUrl, setActionUrl] = useState('')
  const [actionLabel, setActionLabel] = useState('')
  const [priority, setPriority] = useState('normal')
  const [sendPush, setSendPush] = useState(true)
  const [showOverrides, setShowOverrides] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [sending, setSending] = useState(false)

  // Fetch user counts per role
  const { data: roleCounts } = useQuery({
    queryKey: ['role-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
      const counts = { student: 0, trainer: 0, admin: 0 }
      ;(data || []).forEach(p => { if (counts[p.role] !== undefined) counts[p.role]++ })
      return counts
    },
  })

  // Fetch announcement history
  const { data: history } = useQuery({
    queryKey: ['announcement-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      return data || []
    },
  })

  const totalRecipients = targetRoles.reduce((sum, r) => sum + (roleCounts?.[r] || 0), 0)

  const handleRoleToggle = (role) => {
    setTargetRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const handleSend = async () => {
    if (!titleDefault.trim() || !bodyDefault.trim()) {
      toast({ type: 'error', title: 'العنوان والنص مطلوبان' })
      return
    }
    if (targetRoles.length === 0) {
      toast({ type: 'error', title: 'اختر جمهور واحد على الأقل' })
      return
    }

    setSending(true)
    try {
      // 1. Insert announcement record
      const { data: announcement, error: annError } = await supabase
        .from('announcements')
        .insert({
          title_default: titleDefault,
          body_default: bodyDefault,
          title_student: titleStudent || null,
          body_student: bodyStudent || null,
          title_trainer: titleTrainer || null,
          body_trainer: bodyTrainer || null,
          title_admin: titleAdmin || null,
          body_admin: bodyAdmin || null,
          target_roles: targetRoles,
          send_push: sendPush,
          send_in_app: true,
          action_url: actionUrl || null,
          action_label: actionLabel || null,
          priority,
          created_by: profile.id,
        })
        .select()
        .single()

      if (annError) throw annError

      // 2. Send to each role via edge function
      let totalSent = 0
      let totalFailed = 0

      for (const role of targetRoles) {
        const title = (role === 'student' && titleStudent) || (role === 'trainer' && titleTrainer) || (role === 'admin' && titleAdmin) || titleDefault
        const body = (role === 'student' && bodyStudent) || (role === 'trainer' && bodyTrainer) || (role === 'admin' && bodyAdmin) || bodyDefault

        const { data, error } = await supabase.functions.invoke('send-push-notification', {
          body: {
            target_roles: [role],
            title,
            body,
            url: actionUrl || '/',
            action_label: actionLabel || null,
            type: 'announcement',
            priority,
            announcement_id: announcement.id,
          },
        })

        if (!error && data) {
          totalSent += data.sent || 0
          totalFailed += data.failed || 0
        }
      }

      // 3. Update announcement with sent count
      await supabase
        .from('announcements')
        .update({
          sent_at: new Date().toISOString(),
          sent_count: totalSent,
          failed_count: totalFailed,
        })
        .eq('id', announcement.id)

      toast({ type: 'success', title: `تم الإرسال — ${totalRecipients} مستلم (${totalSent} push)` })

      // Reset form
      setTitleDefault('')
      setBodyDefault('')
      setTitleStudent('')
      setBodyStudent('')
      setTitleTrainer('')
      setBodyTrainer('')
      setTitleAdmin('')
      setBodyAdmin('')
      setActionUrl('')
      setActionLabel('')
    } catch (err) {
      console.error('Send announcement error:', err)
      toast({ type: 'error', title: 'فشل إرسال الإعلان' })
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-3xl mx-auto px-4 py-6 space-y-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))' }}>
          <Megaphone size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>إرسال إعلان</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>أرسل إعلان لجميع المستخدمين أو فئة محددة</p>
        </div>
      </div>

      {/* Default content */}
      <div className="fl-card-static p-5 space-y-4">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>المحتوى الأساسي</h3>

        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>العنوان</label>
          <input
            value={titleDefault}
            onChange={e => setTitleDefault(e.target.value)}
            placeholder="عنوان الإعلان..."
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>النص</label>
          <textarea
            value={bodyDefault}
            onChange={e => setBodyDefault(e.target.value)}
            placeholder="اكتب محتوى الإعلان..."
            rows={5}
            className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
            style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          />
        </div>
      </div>

      {/* Role-specific overrides */}
      <div className="fl-card-static overflow-hidden">
        <button
          onClick={() => setShowOverrides(!showOverrides)}
          className="w-full flex items-center justify-between p-4 text-start"
        >
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>محتوى مخصص حسب الفئة (اختياري)</span>
          {showOverrides ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
        </button>

        {showOverrides && (
          <div className="px-5 pb-5 space-y-5">
            {/* Student override */}
            <RoleOverride
              label="الطلاب"
              title={titleStudent}
              body={bodyStudent}
              onTitleChange={setTitleStudent}
              onBodyChange={setBodyStudent}
            />
            {/* Trainer override */}
            <RoleOverride
              label="المدربين"
              title={titleTrainer}
              body={bodyTrainer}
              onTitleChange={setTitleTrainer}
              onBodyChange={setBodyTrainer}
            />
            {/* Admin override */}
            <RoleOverride
              label="المدراء"
              title={titleAdmin}
              body={bodyAdmin}
              onTitleChange={setTitleAdmin}
              onBodyChange={setBodyAdmin}
            />
          </div>
        )}
      </div>

      {/* Targeting */}
      <div className="fl-card-static p-5 space-y-4">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>الجمهور المستهدف</h3>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleRoleToggle(opt.value)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: targetRoles.includes(opt.value) ? 'rgba(56,189,248,0.15)' : 'var(--surface-raised)',
                border: targetRoles.includes(opt.value) ? '1px solid rgba(56,189,248,0.4)' : '1px solid var(--border-subtle)',
                color: targetRoles.includes(opt.value) ? 'var(--accent-sky)' : 'var(--text-secondary)',
              }}
            >
              <Users size={12} />
              {opt.label}
              <span className="text-[10px] opacity-60">({roleCounts?.[opt.value] || 0})</span>
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          إجمالي المستلمين: {totalRecipients}
        </p>
      </div>

      {/* Action + settings */}
      <div className="fl-card-static p-5 space-y-4">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>إعدادات الإعلان</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>رابط الإجراء</label>
            <input
              value={actionUrl}
              onChange={e => setActionUrl(e.target.value)}
              placeholder="/dashboard"
              dir="ltr"
              className="w-full px-3 py-2 rounded-xl text-xs font-['Inter']"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>عنوان الزر</label>
            <input
              value={actionLabel}
              onChange={e => setActionLabel(e.target.value)}
              placeholder="افتح التطبيق"
              className="w-full px-3 py-2 rounded-xl text-xs"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>الأولوية</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            >
              {PRIORITY_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-5">
            <input
              type="checkbox"
              checked={sendPush}
              onChange={e => setSendPush(e.target.checked)}
              className="accent-sky-500"
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>إرسال push notification</span>
          </label>
        </div>
      </div>

      {/* Preview */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="flex items-center gap-2 text-xs font-medium px-1"
        style={{ color: 'var(--accent-sky)' }}
      >
        <Eye size={14} />
        {showPreview ? 'إخفاء المعاينة' : 'معاينة'}
      </button>

      {showPreview && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {targetRoles.map(role => {
            const title = (role === 'student' && titleStudent) || (role === 'trainer' && titleTrainer) || (role === 'admin' && titleAdmin) || titleDefault
            const body = (role === 'student' && bodyStudent) || (role === 'trainer' && bodyTrainer) || (role === 'admin' && bodyAdmin) || bodyDefault
            return (
              <div key={role} className="fl-card-static p-4 space-y-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent-sky)' }}>
                  {ROLE_OPTIONS.find(r => r.value === role)?.label}
                </span>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title || '—'}</p>
                <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{body || '—'}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={sending || !titleDefault.trim() || !bodyDefault.trim() || targetRoles.length === 0}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100"
        style={{ background: 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))', color: '#fff' }}
      >
        <Send size={16} />
        {sending ? 'جاري الإرسال...' : `إرسال إلى ${totalRecipients} مستخدم`}
      </button>

      {/* History */}
      {history?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>آخر الإعلانات</h3>
          {history.map(a => (
            <div key={a.id} className="fl-card-static p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{a.title_default}</p>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(a.created_at).toLocaleDateString('ar-SA')}
                </span>
              </div>
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{a.body_default}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                <span>الجمهور: {(a.target_roles || []).join(', ')}</span>
                {a.sent_count != null && <span>أُرسل: {a.sent_count} push</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function RoleOverride({ label, title, body, onTitleChange, onBodyChange }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold" style={{ color: 'var(--accent-sky)' }}>{label}</p>
      <input
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder={`عنوان مخصص لـ${label} (اختياري)`}
        className="w-full px-3 py-2 rounded-xl text-xs"
        style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
      />
      <textarea
        value={body}
        onChange={e => onBodyChange(e.target.value)}
        placeholder={`نص مخصص لـ${label} (اختياري)`}
        rows={3}
        className="w-full px-3 py-2 rounded-xl text-xs resize-none"
        style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
      />
    </div>
  )
}
