import { CheckCircle, BookOpenCheck, Sparkles } from 'lucide-react'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

/**
 * SmartStatusPill — concise live status under the orb.
 *
 * Content priority (mirrors prompt 05 spec):
 *   1. due > 0 AND new > 0 → "اليوم: X مراجعة + Y جديدة"
 *   2. due > 0           → "اليوم: X كلمة للمراجعة"
 *   3. new > 0           → "Y كلمة جديدة جاهزة"
 *   4. both 0            → "✓ كل شيء تم لليوم"
 */
export default function SmartStatusPill({
  dueForReviewToday = 0,
  newCardsAvailableToday = 0,
}) {
  let icon = null
  let text = ''
  let iconColor = 'var(--text-tertiary)'

  if (dueForReviewToday > 0 && newCardsAvailableToday > 0) {
    icon = <BookOpenCheck size={14} />
    text = `اليوم: ${toArabicNum(dueForReviewToday)} مراجعة + ${toArabicNum(newCardsAvailableToday)} جديدة`
    iconColor = 'rgb(168,85,247)'
  } else if (dueForReviewToday > 0) {
    icon = <BookOpenCheck size={14} />
    text =
      dueForReviewToday === 1
        ? 'اليوم: كلمة واحدة للمراجعة'
        : `اليوم: ${toArabicNum(dueForReviewToday)} كلمة للمراجعة`
    iconColor = 'rgb(168,85,247)'
  } else if (newCardsAvailableToday > 0) {
    icon = <Sparkles size={14} />
    text =
      newCardsAvailableToday === 1
        ? 'كلمة جديدة جاهزة'
        : `${toArabicNum(newCardsAvailableToday)} كلمات جديدة جاهزة`
    iconColor = 'rgb(56,189,248)'
  } else {
    icon = <CheckCircle size={14} />
    text = 'كل شيء تم لليوم'
    iconColor = 'rgb(34,197,94)'
  }

  return (
    <div
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-['Tajawal'] font-bold whitespace-nowrap"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: 'var(--text-secondary, rgba(255,255,255,0.75))',
        fontSize: 13,
      }}
      dir="rtl"
    >
      <span style={{ color: iconColor, display: 'inline-flex' }}>{icon}</span>
      <span>{text}</span>
    </div>
  )
}
