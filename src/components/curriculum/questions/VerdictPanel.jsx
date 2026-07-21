import { motion } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useG, genderizeText } from '../../../i18n/gender'
import { EvidenceExcerpt } from './QuestionHint'

/**
 * VerdictPanel — the post-submit teaching moment under a question.
 * Explains WHY the student's answer was right or wrong:
 *   verdict header → (wrong only) your answer vs the correct one + why that
 *   specific choice is wrong → why the correct answer is correct → the evidence
 *   excerpt from the transcript/passage (with segment replay for listening).
 *
 * All colors inherit the host .qx-card accent vars (questionCards.css).
 */
export default function VerdictPanel({
  correct,
  selectedLabel,
  selectedText,
  correctLabel,
  correctText,
  wrongNote,        // Arabic: why the student's specific choice is wrong
  explanationAr,    // Arabic: why the correct answer is correct
  explanationEn,
  hint,
  audioUrl,
  accent = 'sky',
  kind = 'reading',
  contentId,
  questionKey,
}) {
  const g = useG()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="qx-verdict"
      data-ok={correct ? 'true' : 'false'}
      dir="rtl"
    >
      {/* Verdict header */}
      <div className="qx-verdict-head">
        <span className="qx-verdict-icon">
          {correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
        </span>
        <span className="qx-verdict-title">
          {correct ? <>إجابة صحيحة — {g('أحسنت', 'أحسنتِ')}</> : 'إجابة غير صحيحة'}
        </span>
      </div>

      <div className="qx-verdict-body">
        {/* Wrong: your answer vs the correct one */}
        {!correct && (
          <div className="qx-vchips" dir="ltr">
            <div className="qx-vchip" data-kind="yours">
              <span className="qx-vchip-label" dir="rtl">إجابتك</span>
              {selectedLabel && <span className="qx-vchip-letter">{selectedLabel}</span>}
              <span className="qx-vchip-text">{selectedText}</span>
            </div>
            <div className="qx-vchip" data-kind="correct">
              <span className="qx-vchip-label" dir="rtl">الإجابة الصحيحة</span>
              {correctLabel && <span className="qx-vchip-letter">{correctLabel}</span>}
              <span className="qx-vchip-text">{correctText}</span>
            </div>
          </div>
        )}

        {/* Why the chosen option is wrong */}
        {!correct && wrongNote && (
          <div className="qx-vwhy" data-tone="wrong">
            <p className="qx-vwhy-label">لماذا خيارك غير صحيح؟</p>
            <p className="qx-vwhy-text">{genderizeText(wrongNote)}</p>
          </div>
        )}

        {/* Why the correct answer is correct */}
        {(explanationAr || explanationEn) && (
          <div className="qx-vwhy" data-tone="right">
            <p className="qx-vwhy-label">
              {correct ? 'لماذا هذه هي الإجابة الصحيحة؟' : 'ولماذا هذه هي الإجابة الصحيحة؟'}
            </p>
            {explanationAr && <p className="qx-vwhy-text">{genderizeText(explanationAr)}</p>}
            {explanationEn && (
              <p className="qx-vwhy-text-en" dir="ltr">{explanationEn}</p>
            )}
          </div>
        )}

        {/* The evidence itself */}
        {hint?.quote && (
          <EvidenceExcerpt
            hint={hint}
            audioUrl={audioUrl}
            accent={accent}
            kind={kind}
            contentId={contentId}
            questionKey={questionKey}
            headerLabel={kind === 'listening' ? 'الدليل من التسجيل' : 'الدليل من النص'}
          />
        )}
      </div>
    </motion.div>
  )
}
