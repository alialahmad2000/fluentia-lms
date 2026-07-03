import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PrimaryButton } from './primitives'

const BANDS = ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5']

// Goal capture — target band + exam date + Academic/General → ielts_adaptive_plans.
export default function GoalModal({ open, onClose, studentId, initial }) {
  const qc = useQueryClient()
  const [target, setTarget] = useState(initial?.target_band != null ? Number(initial.target_band).toFixed(1) : '7.0')
  const [examDate, setExamDate] = useState(initial?.target_exam_date || initial?.exam_date || '')
  const [variant, setVariant] = useState(initial?.test_variant || 'academic')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!open) return null

  async function save() {
    if (!studentId) return
    setSaving(true); setError(null)
    try {
      const { error: e } = await supabase.from('ielts_adaptive_plans').upsert({
        student_id: studentId,
        test_variant: variant,
        target_band: Number(target),
        target_exam_date: examDate || null,
        last_regenerated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' })
      if (e) throw e
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['ielts-plan', studentId] }),
        qc.invalidateQueries({ queryKey: ['ielts-plan'] }),
      ])
      onClose(true)
    } catch (err) {
      setError('تعذّر الحفظ — تأكّد من اتصالك وحاول مجدداً.')
      setSaving(false)
    }
  }

  const field = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--iel-ink-2)', marginBottom: 10 }

  return (
    <div onClick={() => onClose(false)} dir="rtl" style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(3px)', padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="iel-root" style={{
        background: 'var(--iel-surface)', border: '1px solid var(--iel-border)', borderRadius: 18, boxShadow: 'var(--iel-shadow)',
        width: '100%', maxWidth: 460, padding: '26px 26px 24px', minHeight: 'auto',
      }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 4px' }}>هدفك في الآيلتس</h2>
        <p style={{ fontSize: 13.5, color: 'var(--iel-ink-3)', margin: '0 0 22px', lineHeight: 1.7 }}>نبني خطّتك على هذا الهدف وموعد اختبارك.</p>

        <label style={field}>النطاق المستهدف</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {BANDS.map((b) => {
            const on = target === b
            return (
              <button key={b} onClick={() => setTarget(b)} style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 14, fontWeight: 700,
                border: `1px solid ${on ? 'var(--iel-accent)' : 'var(--iel-border)'}`,
                background: on ? 'var(--iel-accent-soft)' : 'transparent', color: on ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)',
              }}>{b}</button>
            )
          })}
        </div>

        <label style={field}>موعد الاختبار</label>
        <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} style={{
          width: '100%', padding: '11px 14px', borderRadius: 11, marginBottom: 22, boxSizing: 'border-box',
          border: '1px solid var(--iel-border)', background: 'var(--iel-surface-2)', color: 'var(--iel-ink)', fontSize: 14, fontFamily: "'Tajawal', sans-serif",
        }} />

        <label style={field}>نوع الاختبار</label>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {[['academic', 'أكاديمي (Academic)'], ['general', 'عام (General)']].map(([v, l]) => {
            const on = variant === v
            return (
              <button key={v} onClick={() => setVariant(v)} style={{
                flex: 1, padding: '12px', borderRadius: 11, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 13.5, fontWeight: 700,
                border: `1px solid ${on ? 'var(--iel-accent)' : 'var(--iel-border)'}`,
                background: on ? 'var(--iel-accent-soft)' : 'transparent', color: on ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)',
              }}>{l}</button>
            )
          })}
        </div>

        {error && <p style={{ fontSize: 12.5, color: 'var(--iel-bad)', margin: '0 0 14px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
          <PrimaryButton onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ الهدف'}</PrimaryButton>
          <button onClick={() => onClose(false)} style={{ background: 'none', border: 0, color: 'var(--iel-ink-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", padding: '12px 8px' }}>لاحقاً</button>
        </div>
      </div>
    </div>
  )
}
