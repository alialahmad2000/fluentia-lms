import { CheckCircle2 } from 'lucide-react'

function FeedbackSection({ title, color, single, children }) {
  const colors = {
    red: 'text-red-400',
    sky: 'text-sky-400',
    gold: 'text-gold-400',
    emerald: 'text-emerald-400',
    violet: 'text-violet-400',
  }
  return (
    <div>
      <h4 className={`text-xs font-medium ${colors[color] || colors.sky} mb-2`}>{title}</h4>
      {single ? children : <div className="space-y-2">{children}</div>}
    </div>
  )
}

function TipItem({ text }) {
  return (
    <div className="flex items-start gap-2 text-xs text-muted">
      <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  )
}

export default function StudentFeedbackDisplay({ feedback, trainerFeedback }) {
  if (!feedback || typeof feedback !== 'object') return null

  return (
    <div className="mt-4 space-y-4">
      {/* Header */}
      <h4 className="text-sm font-semibold text-sky-400">تقييم مفصّل</h4>

      {/* Overall feedback */}
      {feedback.overall_feedback && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{feedback.overall_feedback}</p>
      )}

      {/* Trainer plain-text feedback (if different from overall) */}
      {trainerFeedback && trainerFeedback !== feedback.overall_feedback && (
        <p className="text-xs text-muted">{trainerFeedback}</p>
      )}

      {/* ── Writing-specific sections ── */}
      {feedback.grammar_errors?.length > 0 && (
        <FeedbackSection title="أخطاء نحوية" color="red">
          {feedback.grammar_errors.map((e, i) => (
            <div key={i} className="bg-[var(--surface-base)] rounded-xl p-3 text-xs">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-red-400 line-through" dir="ltr">{e.error}</span>
                <span className="text-emerald-400" dir="ltr">{e.correction}</span>
              </div>
              {e.rule && <p className="text-muted mt-1.5">{e.rule}</p>}
            </div>
          ))}
        </FeedbackSection>
      )}

      {feedback.vocabulary_suggestions?.length > 0 && (
        <FeedbackSection title="اقتراحات مفردات" color="sky">
          {feedback.vocabulary_suggestions.map((v, i) => (
            <div key={i} className="bg-[var(--surface-base)] rounded-xl p-3 text-xs">
              <span className="text-muted" dir="ltr">{v.original}</span>
              <span className="text-muted mx-1">&larr;</span>
              <span className="text-sky-400 font-medium" dir="ltr">{v.better}</span>
              {v.reason && <p className="text-muted mt-1">{v.reason}</p>}
            </div>
          ))}
        </FeedbackSection>
      )}

      {feedback.structure_assessment && (
        <FeedbackSection title="تقييم البنية" color="gold" single>
          <p className="text-xs text-muted">{feedback.structure_assessment}</p>
        </FeedbackSection>
      )}

      {feedback.corrected_text && (
        <FeedbackSection title="النص المصحح" color="emerald" single>
          <p className="text-xs leading-relaxed" dir="ltr" style={{ color: 'var(--text-secondary)' }}>{feedback.corrected_text}</p>
        </FeedbackSection>
      )}

      {/* ── Speaking-specific sections ── */}
      {feedback.fluency_assessment && (
        <FeedbackSection title="تقييم الطلاقة" color="sky" single>
          <p className="text-xs text-muted">{feedback.fluency_assessment}</p>
        </FeedbackSection>
      )}

      {feedback.confidence_level && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">مستوى الثقة:</span>
          <span className={`text-sm font-medium ${
            feedback.confidence_level === 'ممتازة' ? 'text-gold-400' :
            feedback.confidence_level === 'جيدة' ? 'text-emerald-400' :
            feedback.confidence_level === 'متوسطة' ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {feedback.confidence_level}
          </span>
        </div>
      )}

      {feedback.vocabulary_range && (
        <FeedbackSection title="تنوع المفردات" color="gold" single>
          <p className="text-xs text-muted">{feedback.vocabulary_range}</p>
        </FeedbackSection>
      )}

      {feedback.pronunciation_notes && (
        <FeedbackSection title="ملاحظات النطق" color="violet" single>
          <p className="text-xs text-muted">{feedback.pronunciation_notes}</p>
        </FeedbackSection>
      )}

      {feedback.grammar_notes?.length > 0 && (
        <FeedbackSection title="ملاحظات نحوية" color="red">
          {feedback.grammar_notes.map((n, i) => (
            <div key={i} className="bg-[var(--surface-base)] rounded-xl p-3 text-xs">
              <p style={{ color: 'var(--text-primary)' }}>{n.issue}</p>
              <p className="text-emerald-400 mt-1">{n.suggestion}</p>
            </div>
          ))}
        </FeedbackSection>
      )}

      {/* ── Listening-specific ── */}
      {feedback.comprehension_assessment && (
        <FeedbackSection title="تقييم الاستيعاب" color="sky" single>
          <p className="text-xs text-muted">{feedback.comprehension_assessment}</p>
        </FeedbackSection>
      )}

      {feedback.listening_tips?.length > 0 && (
        <FeedbackSection title="نصائح الاستماع" color="violet">
          {feedback.listening_tips.map((tip, i) => (
            <TipItem key={i} text={tip} />
          ))}
        </FeedbackSection>
      )}

      {/* ── Reading-specific ── */}
      {feedback.completion_note && (
        <FeedbackSection title="ملاحظة الإنجاز" color="emerald" single>
          <p className="text-xs text-muted">{feedback.completion_note}</p>
        </FeedbackSection>
      )}

      {feedback.reading_streak && (
        <FeedbackSection title="سلسلة القراءة" color="gold" single>
          <p className="text-xs text-muted">{feedback.reading_streak}</p>
        </FeedbackSection>
      )}

      {feedback.next_level_suggestion && (
        <FeedbackSection title="المستوى التالي" color="sky" single>
          <p className="text-xs text-muted">{feedback.next_level_suggestion}</p>
        </FeedbackSection>
      )}

      {/* ── Grammar-specific ── */}
      {feedback.grammar_focus && (
        <FeedbackSection title="المحور النحوي" color="violet" single>
          <p className="text-xs text-muted">{feedback.grammar_focus}</p>
        </FeedbackSection>
      )}

      {feedback.consistency_note && (
        <FeedbackSection title="ملاحظة الالتزام" color="gold" single>
          <p className="text-xs text-muted">{feedback.consistency_note}</p>
        </FeedbackSection>
      )}

      {/* ── Vocabulary-specific ── */}
      {feedback.word_usage_assessment && (
        <FeedbackSection title="تقييم استخدام المفردات" color="sky" single>
          <p className="text-xs text-muted">{feedback.word_usage_assessment}</p>
        </FeedbackSection>
      )}

      {/* ── Universal: improvement tips ── */}
      {feedback.improvement_tips?.length > 0 && (
        <FeedbackSection title="نصائح للتحسين" color="emerald">
          {feedback.improvement_tips.map((tip, i) => (
            <TipItem key={i} text={tip} />
          ))}
        </FeedbackSection>
      )}

      {feedback.suggestions?.length > 0 && !feedback.improvement_tips?.length && (
        <FeedbackSection title="نصائح" color="emerald">
          {feedback.suggestions.map((s, i) => (
            <TipItem key={i} text={s} />
          ))}
        </FeedbackSection>
      )}
    </div>
  )
}
