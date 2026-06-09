// Shown on the finish seal — the felt-progress payoff: "you understood X% of this novel".
import { useMemo } from 'react'
import { useMyQuestionAttempts } from '../hooks/useLibraryEngagement'

export default function NovelRollup({ bookId, myId, bookTitle }) {
  const { data: attempts = [] } = useMyQuestionAttempts(bookId, myId)
  const { pct, answered, correct } = useMemo(() => {
    const graded = attempts.filter((a) => a.selected_id != null && a.is_correct != null)
    const c = graded.filter((a) => a.is_correct).length
    return { answered: graded.length, correct: c, pct: graded.length ? Math.round((c / graded.length) * 100) : null }
  }, [attempts])

  if (pct == null) return null // she didn't try the self-checks — don't nag

  const line = pct >= 90 ? 'فهمٌ رائع — أمسكتِ بالقصة كاملة'
    : pct >= 70 ? 'فهمٌ قوي — وصلكِ جوهر الحكاية'
    : pct >= 50 ? 'بداية جيدة — كل قراءة تزيدك' : 'لا بأس — أعيدي ما صعُب، ستكبر الصورة'

  return (
    <div className="lib-rollup">
      <div className="lib-rollup-ring" style={{ '--p': pct }}>
        <span>{pct}<i>٪</i></span>
      </div>
      <div className="lib-rollup-body">
        <div className="lib-rollup-title">فهمتِ {pct}٪ من «{bookTitle}»</div>
        <div className="lib-rollup-sub">{line} · أجبتِ على {answered} سؤالاً، {correct} صحيحة</div>
      </div>
    </div>
  )
}
