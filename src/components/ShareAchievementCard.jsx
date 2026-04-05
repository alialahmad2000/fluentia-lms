import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Share2, Download, Loader2 } from 'lucide-react'
import { toPng } from 'html-to-image'
import { toast } from './ui/FluentiaToast'

const getMotivationalMessage = (avgScore, type) => {
  if (avgScore >= 9) return '🌟 أداء استثنائي! أنت نجم/ة أكاديمية طلاقة!'
  if (avgScore >= 7) return '🔥 عمل رائع! استمر/ي وراح توصل/ين للقمة!'
  if (avgScore >= 5) return '💪 بداية قوية! كل محاولة تقربك من الطلاقة!'
  return '🌱 كل رحلة تبدأ بخطوة! واصل/ي التعلم!'
}

const scoreColor = (s) => s >= 8 ? '#22c55e' : s >= 6 ? '#38bdf8' : '#f59e0b'

export default function ShareAchievementCard({ type, studentName, levelName, unitName, studentText, feedback, scores, leaderboard, currentStudentId }) {
  const cardRef = useRef(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const avgScore = scores
    ? Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length) * 10) / 10
    : 0

  const handleShare = useCallback(async () => {
    if (!cardRef.current || isGenerating) return
    setIsGenerating(true)

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#060e1c',
      })

      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], `fluentia-${type}-achievement.png`, { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'إنجازي في أكاديمية طلاقة',
            text: `شاركت ${type === 'writing' ? 'كتابتي' : 'محادثتي'} في أكاديمية طلاقة! 🎓`,
          })
          toast({ type: 'success', title: 'تم! شاركها في قروب التلقرام 🎓' })
          return
        }
      }

      // Fallback: download
      const link = document.createElement('a')
      link.download = `fluentia-${type}-achievement.png`
      link.href = dataUrl
      link.click()
      toast({ type: 'success', title: 'تم حفظ الصورة! شاركها في قروب التلقرام 🎓' })
    } catch (err) {
      console.error('[ShareCard] Failed:', err)
      toast({ type: 'error', title: 'حدث خطأ، حاول مرة أخرى' })
    } finally {
      setIsGenerating(false)
    }
  }, [type, isGenerating])

  if (!feedback || !scores) return null

  const f = feedback
  const isWriting = type === 'writing'

  // Normalize fields
  const correctedText = isWriting ? f.corrected_text : (f.corrected_transcript || '')
  const errors = f.errors || f.grammar_errors || []
  const vocabUpgrades = isWriting ? (f.vocabulary_upgrades || []) : []
  const betterExpressions = !isWriting ? (f.better_expressions || []) : []
  const modelSentences = isWriting ? (f.model_sentences || []) : []
  const modelAnswer = !isWriting ? (f.model_answer || '') : ''
  const fluencyTips = !isWriting ? (f.fluency_tips || []) : []
  const strengthsText = typeof f.strengths === 'string' ? f.strengths : ''
  const strengthsList = f.strengths_ar || (Array.isArray(f.strengths) ? f.strengths : [])
  const improvementTip = f.improvement_tip || ''
  const feedbackAr = f.feedback_ar || f.overall_comment_ar || f.overall_feedback || ''

  const SCORE_LABELS = isWriting
    ? { grammar_score: 'القواعد', vocabulary_score: 'المفردات', structure_score: 'الهيكل', fluency_score: 'الطلاقة' }
    : { grammar_score: 'القواعد', vocabulary_score: 'المفردات', fluency_score: 'الطلاقة', confidence_score: 'الثقة' }

  return (
    <>
      {/* Share Button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={handleShare}
        disabled={isGenerating}
        className="w-full mt-5 py-3.5 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-['Tajawal']"
        style={{
          background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(129,140,248,0.15))',
          border: '1px solid rgba(56,189,248,0.2)',
          color: '#38bdf8',
        }}
      >
        {isGenerating ? (
          <><Loader2 size={16} className="animate-spin" /> جاري تجهيز الصورة...</>
        ) : (
          <><Share2 size={16} /> شارك إنجازك 🎉</>
        )}
      </motion.button>

      {/* Hidden Card — rendered off-screen, captured as image */}
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '800px',
          opacity: 1,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <div style={{ background: 'linear-gradient(165deg, #060e1c 0%, #0a1930 40%, #0d1f3c 100%)', padding: '48px', fontFamily: "'Tajawal', sans-serif", direction: 'rtl', color: '#e2e8f0' }}>
          {/* Font import for image rendering */}
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Inter:wght@400;600;700&display=swap');`}</style>

          {/* Header branding */}
          <div style={{ background: 'linear-gradient(90deg, #38bdf8, #818cf8)', borderRadius: '12px', padding: '18px 24px', textAlign: 'center', color: 'white', marginBottom: '28px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Tajawal', sans-serif" }}>أكاديمية طلاقة 🎓</div>
            <div style={{ fontSize: '14px', opacity: 0.85, fontFamily: "'Inter', sans-serif", marginTop: '4px' }}>Fluentia Academy</div>
          </div>

          {/* Student info */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>👤 {studentName || 'طالب/ة في أكاديمية طلاقة'}</div>
            {levelName && <div style={{ fontSize: '14px', color: '#94a3b8' }}>📚 {levelName}{unitName ? ` — ${unitName}` : ''}</div>}
            <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>{isWriting ? '✍️ نشاط الكتابة' : '🎤 نشاط المحادثة'}</div>
          </div>

          {/* Student's original text */}
          {studentText && (
            <div style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', marginBottom: '10px' }}>{isWriting ? '📝 ما كتبته:' : '🎙️ ما قلته:'}</div>
              <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#cbd5e1', fontFamily: "'Inter', sans-serif", direction: 'ltr', textAlign: 'left' }}>{studentText}</div>
            </div>
          )}

          {/* Corrected text */}
          {correctedText && (
            <div style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e', marginBottom: '10px' }}>✅ النص المصحح:</div>
              <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#cbd5e1', fontFamily: "'Inter', sans-serif", direction: 'ltr', textAlign: 'left' }}>{correctedText}</div>
            </div>
          )}

          {/* Section divider — Scores */}
          <SectionDivider label="التقييم" />

          {/* Score bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {Object.entries(SCORE_LABELS).map(([key, label]) => {
              const s = scores[key.replace('_score', '')] ?? scores[key]
              if (s == null) return null
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>{label}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: scoreColor(s), fontFamily: "'Inter', sans-serif" }}>{s}/10</span>
                  </div>
                  <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '5px', width: `${(s / 10) * 100}%`, background: scoreColor(s), transition: 'width 0.5s' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <>
              <SectionDivider label="الأخطاء وتصحيحاتها" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {errors.slice(0, 6).map((e, i) => (
                  <div key={i} style={{ padding: '12px', background: 'rgba(239,68,68,0.04)', borderRight: '3px solid rgba(239,68,68,0.3)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', direction: 'ltr', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
                      <span style={{ textDecoration: 'line-through', color: 'rgba(239,68,68,0.7)' }}>{e.original || e.spoken || e.error}</span>
                      <span style={{ color: '#64748b' }}>→</span>
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>{e.correction || e.corrected}</span>
                    </div>
                    {(e.explanation_ar || e.rule || e.rule_ar) && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>📖 {e.explanation_ar || e.rule || e.rule_ar}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Vocabulary upgrades (writing) */}
          {vocabUpgrades.length > 0 && (
            <>
              <SectionDivider label="ترقيات المفردات" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {vocabUpgrades.slice(0, 5).map((vu, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: 'rgba(251,191,36,0.04)', borderRight: '3px solid rgba(251,191,36,0.2)', borderRadius: '8px' }}>
                    <div style={{ direction: 'ltr', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
                      💡 <span style={{ color: '#94a3b8' }}>{vu.basic || vu.original}</span> → <span style={{ color: '#a78bfa', fontWeight: 600 }}>{vu.advanced || (vu.suggestions || []).join(' أو ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Better expressions (speaking) */}
          {betterExpressions.length > 0 && (
            <>
              <SectionDivider label="تعبيرات أفضل" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {betterExpressions.slice(0, 5).map((be, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: 'rgba(251,191,36,0.04)', borderRight: '3px solid rgba(251,191,36,0.2)', borderRadius: '8px' }}>
                    <div style={{ direction: 'ltr', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
                      💡 <span style={{ color: '#94a3b8' }}>{be.basic || be.original}</span> → <span style={{ color: '#a78bfa', fontWeight: 600 }}>{be.natural || be.better}</span>
                    </div>
                    {(be.context || be.why_ar) && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{be.context || be.why_ar}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Model sentences (writing) */}
          {modelSentences.length > 0 && (
            <>
              <SectionDivider label="جمل نموذجية" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {modelSentences.slice(0, 4).map((s, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: 'rgba(56,189,248,0.04)', borderRight: '3px solid rgba(56,189,248,0.2)', borderRadius: '8px', direction: 'ltr', fontFamily: "'Inter', sans-serif", fontSize: '14px', fontStyle: 'italic', color: '#94a3b8' }}>
                    ⭐ "{s}"
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Model answer (speaking) */}
          {modelAnswer && (
            <>
              <SectionDivider label="إجابة نموذجية" />
              <div style={{ padding: '14px 16px', background: 'rgba(56,189,248,0.04)', borderRight: '3px solid rgba(56,189,248,0.2)', borderRadius: '8px', direction: 'ltr', fontFamily: "'Inter', sans-serif", fontSize: '14px', fontStyle: 'italic', color: '#94a3b8', lineHeight: 1.8, marginBottom: '24px' }}>
                "{modelAnswer}"
              </div>
            </>
          )}

          {/* Fluency tips (speaking) */}
          {fluencyTips.length > 0 && (
            <>
              <SectionDivider label="نصائح للطلاقة" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
                {fluencyTips.slice(0, 4).map((tip, i) => (
                  <div key={i} style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#f59e0b', flexShrink: 0 }}>💡</span> {tip}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Strengths */}
          {(strengthsText || strengthsList.length > 0) && (
            <>
              <SectionDivider label="نقاط القوة" />
              <div style={{ marginBottom: '24px' }}>
                {strengthsText ? (
                  <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.8 }}>💪 {strengthsText}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {strengthsList.slice(0, 4).map((s, i) => (
                      <div key={i} style={{ fontSize: '13px', color: '#94a3b8' }}>💪 {s}</div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Improvement tip */}
          {improvementTip && (
            <>
              <SectionDivider label="نصيحة للتحسين" />
              <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.8, marginBottom: '24px' }}>🎯 {improvementTip}</div>
            </>
          )}

          {/* Leaderboard in image */}
          {leaderboard && leaderboard.rankings?.length > 1 && (
            <>
              <SectionDivider label="ترتيب الأداء" />
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', marginBottom: '12px' }}>
                  🏆 ترتيبك: {leaderboard.currentRank ? `المركز ${leaderboard.currentRank} من ${leaderboard.totalSubmitted} طلاب` : `${leaderboard.totalSubmitted} طلاب`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {leaderboard.rankings.map((r) => {
                    const isMe = r.studentId === currentStudentId
                    const badge = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `  ${r.rank}`
                    const sc = r.avgScore >= 8 ? '#22c55e' : r.avgScore >= 6 ? '#fbbf24' : '#ef4444'
                    return (
                      <div key={r.studentId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: isMe ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.015)', border: isMe ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent' }}>
                        <span style={{ fontSize: '14px', width: '24px', textAlign: 'center' }}>{badge}</span>
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: isMe ? 700 : 500, color: isMe ? '#38bdf8' : '#94a3b8' }}>
                          {r.name}{isMe ? ' (أنت)' : ''}
                        </span>
                        <div style={{ width: '56px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '3px', width: `${(r.avgScore / 10) * 100}%`, background: sc }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: sc, fontFamily: "'Inter', sans-serif", width: '42px', textAlign: 'left' }}>{r.avgScore}/10</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Motivational footer */}
          <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.06), rgba(129,140,248,0.06))', border: '1px solid rgba(56,189,248,0.1)', borderRadius: '12px', padding: '24px', textAlign: 'center', marginTop: '12px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>{getMotivationalMessage(avgScore, type)}</div>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '16px' }}>
              fluentia.academy &nbsp;&nbsp;•&nbsp;&nbsp; @FluentiaSA
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>── {label}</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}
