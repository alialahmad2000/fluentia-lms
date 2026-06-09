import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Plus, Send, X, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'

// بطاقة المجلس — the teacher's live word/question of the day; students answer inline.
export default function MajlisCard({ groupId }) {
  const role = useAuthStore((s) => s.profile?.role)
  const isTeacher = role === 'trainer' || role === 'admin'
  const qc = useQueryClient()
  const [answer, setAnswer] = useState('')
  const [expand, setExpand] = useState(false)
  const [posting, setPosting] = useState(false)
  const [draft, setDraft] = useState('')
  const [kind, setKind] = useState('question')

  const { data: card } = useQuery({
    queryKey: ['majlis-card', groupId],
    enabled: !!groupId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.rpc('get_majlis_card', { p_group: groupId })
      return data || null
    },
  })

  const answerMut = useMutation({
    mutationFn: async (text) => { const { error } = await supabase.rpc('answer_majlis_card', { p_card: card.id, p_answer: text }); if (error) throw error },
    onSuccess: () => { setAnswer(''); qc.invalidateQueries({ queryKey: ['majlis-card', groupId] }) },
  })
  const postMut = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc('post_majlis_card', { p_group: groupId, p_prompt: draft, p_kind: kind }); if (error) throw error },
    onSuccess: () => { setDraft(''); setPosting(false); qc.invalidateQueries({ queryKey: ['majlis-card', groupId] }) },
  })

  if (!card) {
    if (!isTeacher) return null
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 14px 12px' }}>
        {posting ? (
          <CardComposer draft={draft} setDraft={setDraft} kind={kind} setKind={setKind} onPost={() => draft.trim() && postMut.mutate()} onCancel={() => setPosting(false)} busy={postMut.isPending} />
        ) : (
          <button type="button" onClick={() => setPosting(true)} className="inline-flex items-center gap-1.5"
            style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 11.5, color: 'var(--ds-accent-gold)', padding: '5px 14px', borderRadius: 999, border: '1px dashed color-mix(in srgb, var(--ds-accent-gold) 30%, transparent)' }}>
            <Plus size={13} /> اطرح بطاقة المجلس
          </button>
        )}
      </div>
    )
  }

  const answers = card.answers || []
  const isWord = card.kind === 'word'
  return (
    <div style={{ margin: '2px 14px 14px' }}>
      <div style={{ borderRadius: 16, padding: '14px 16px', background: 'color-mix(in srgb, var(--ds-accent-gold) 8%, var(--ds-bg-elevated))', border: '1px solid color-mix(in srgb, var(--ds-accent-gold) 22%, transparent)', borderInlineStart: '3px solid var(--ds-accent-gold)' }}>
        <div className="flex items-center gap-1.5 mb-2" style={{ color: 'var(--ds-accent-gold)', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em' }}>
          <Sparkles size={13} /> بطاقة المجلس · {isWord ? 'كلمة اليوم' : 'سؤال اليوم'}
        </div>
        <div style={{ fontFamily: isWord ? '"Playfair Display", serif' : 'Tajawal, sans-serif', fontSize: isWord ? 20 : 15.5, fontStyle: isWord ? 'italic' : 'normal', color: 'var(--ds-text-primary)', lineHeight: 1.6, marginBottom: 12, direction: isWord ? 'ltr' : 'rtl', textAlign: isWord ? 'left' : 'right' }}>
          {card.prompt}
        </div>

        {card.my_answer ? (
          <div style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: 'var(--ds-text-secondary)', background: 'var(--ds-surface-1)', borderRadius: 10, padding: '8px 12px' }}>
            <span style={{ color: 'var(--ds-accent-gold)' }}>إجابتك:</span> {card.my_answer}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="أجب على البطاقة…" dir="auto"
              onKeyDown={(e) => { if (e.key === 'Enter' && answer.trim()) answerMut.mutate(answer.trim()) }}
              style={{ flex: 1, background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)', borderRadius: 10, padding: '8px 12px', color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif', fontSize: 13, outline: 'none' }} />
            <button type="button" onClick={() => answer.trim() && answerMut.mutate(answer.trim())} disabled={!answer.trim() || answerMut.isPending} aria-label="إرسال الإجابة"
              style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--ds-bg-base)', background: 'var(--ds-accent-gold)', opacity: !answer.trim() ? 0.5 : 1, flexShrink: 0 }}>
              <Send size={16} />
            </button>
          </div>
        )}

        {answers.length > 0 && (
          <div className="mt-2.5">
            <button type="button" onClick={() => setExpand((v) => !v)} className="inline-flex items-center gap-1"
              style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 11.5, color: 'var(--ds-text-muted)' }}>
              {expand ? <ChevronUp size={13} /> : <ChevronDown size={13} />} أجاب {answers.length}
            </button>
            {expand && (
              <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {answers.map((a, i) => (
                  <div key={i} style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 12.5, lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--ds-accent-gold)', fontWeight: 600 }}>{(a.name || '').split(' ')[0]}:</span>{' '}
                    <span style={{ color: 'var(--ds-text-secondary)' }}>{a.answer}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CardComposer({ draft, setDraft, kind, setKind, onPost, onCancel, busy }) {
  return (
    <div style={{ width: '100%', maxWidth: 440, background: 'var(--ds-bg-elevated)', border: '1px solid color-mix(in srgb, var(--ds-accent-gold) 22%, transparent)', borderRadius: 14, padding: 12 }}>
      <div className="flex items-center gap-2 mb-2">
        {['question', 'word'].map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)}
            style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 11.5, padding: '4px 12px', borderRadius: 999, border: '1px solid ' + (kind === k ? 'var(--ds-accent-gold)' : 'var(--ds-border-subtle)'), color: kind === k ? 'var(--ds-accent-gold)' : 'var(--ds-text-muted)', background: kind === k ? 'color-mix(in srgb, var(--ds-accent-gold) 8%, transparent)' : 'transparent' }}>
            {k === 'word' ? 'كلمة اليوم' : 'سؤال اليوم'}
          </button>
        ))}
        <button type="button" onClick={onCancel} aria-label="إلغاء" style={{ marginInlineStart: 'auto', color: 'var(--ds-text-muted)' }}><X size={16} /></button>
      </div>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} dir="auto" rows={2} placeholder={kind === 'word' ? 'اكتب كلمة اليوم…' : 'اكتب سؤال اليوم…'}
        style={{ width: '100%', background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)', borderRadius: 10, padding: '8px 12px', color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif', fontSize: 13.5, outline: 'none', resize: 'none' }} />
      <button type="button" onClick={onPost} disabled={!draft.trim() || busy} className="w-full mt-2"
        style={{ padding: '9px', borderRadius: 10, background: 'var(--ds-accent-gold)', color: 'var(--ds-bg-base)', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 13, opacity: !draft.trim() ? 0.5 : 1 }}>
        {busy ? '…' : 'اطرح في المجلس'}
      </button>
    </div>
  )
}
