export function OnePlayBanner({ enabled, hasPlayed, onDisable }) {
  if (!enabled) return null
  return (
    <div
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-4 flex items-center gap-3"
      dir="rtl"
    >
      <span className="text-2xl flex-shrink-0">🎯</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-200 font-['Tajawal']">
          {hasPlayed ? 'انتهى التشغيل (وضع الامتحان)' : 'وضع الاستماع لمرة واحدة فقط (محاكاة IELTS)'}
        </p>
        <p className="text-xs text-amber-200/70 mt-0.5 font-['Tajawal']">
          {hasPlayed
            ? 'لا يمكن إعادة التشغيل. تابع للأسئلة بالأسفل.'
            : 'سيُسمح بتشغيل التسجيل مرة واحدة فقط. التحكم بالسرعة ومنزلق التقدّم معطّلان.'}
        </p>
      </div>
      {!hasPlayed && (
        <button
          onClick={onDisable}
          className="text-xs text-amber-200/60 hover:text-amber-200 transition-colors flex-shrink-0 font-['Tajawal']"
        >
          إلغاء
        </button>
      )}
    </div>
  )
}
