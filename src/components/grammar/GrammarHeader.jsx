import { PenLine } from 'lucide-react'

export default function GrammarHeader({ topic, attemptNumber, bestScore }) {
  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.35)] font-['Tajawal']">
        <PenLine size={14} className="text-sky-400/60" />
        <span>القواعد</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Inter'] tracking-tight" dir="ltr">
        {topic.topic_name_en}
      </h1>

      {topic.topic_name_ar && topic.topic_name_ar !== topic.topic_name_en && (
        <p className="text-base text-[rgba(255,255,255,0.5)] font-['Tajawal']">
          {topic.topic_name_ar}
        </p>
      )}

      {/* Progress pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {bestScore != null && (
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-['Tajawal']">
            أفضل درجة: {bestScore}%
          </span>
        )}
        {attemptNumber > 1 && (
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/5 text-[rgba(255,255,255,0.4)] border border-white/8 font-['Tajawal']">
            محاولة {attemptNumber}
          </span>
        )}
      </div>
    </div>
  )
}
