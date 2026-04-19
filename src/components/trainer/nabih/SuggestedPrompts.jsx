import { MessageSquare, Calendar, BookOpen, Heart, BarChart2 } from 'lucide-react'
import './SuggestedPrompts.css'

const PROMPTS = [
  {
    icon: MessageSquare,
    text: 'ملخص يومي: مين يحتاج تدخّل اليوم؟',
  },
  {
    icon: Calendar,
    text: 'اقترح خطة حصة لمجموعة A1 بناءً على آخر أداء',
  },
  {
    icon: BookOpen,
    text: 'طالب يكافح مع past tense — اقترح ٣ تمارين سريعة',
  },
  {
    icon: Heart,
    text: 'اكتب لي رسالة تحفيز لطالباتي للأسبوع القادم',
  },
  {
    icon: BarChart2,
    text: 'قارن أداء A1 و B1 هالأسبوع',
  },
]

export function SuggestedPrompts({ onPick }) {
  return (
    <div className="nab-prompts">
      {PROMPTS.map(({ icon: Icon, text }) => (
        <button key={text} className="nab-prompt-card" onClick={() => onPick(text)}>
          <span className="nab-prompt-card__icon">
            <Icon size={15} />
          </span>
          <span className="nab-prompt-card__text">{text}</span>
          <span className="nab-prompt-card__tag">اقتراح</span>
        </button>
      ))}
    </div>
  )
}
