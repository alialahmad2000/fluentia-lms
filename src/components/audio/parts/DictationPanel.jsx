export function DictationPanel({ active, sentenceIdx, totalSentences, currentSentence, typed, onTyped, lastDiff, onSubmit, onNext, onStop }) {
  if (!active) return null

  return (
    <div
      className="mx-4 mb-3 rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-['Tajawal']">
          وضع الإملاء — جملة {sentenceIdx + 1} / {totalSentences}
        </span>
        <button onClick={onStop} className="text-xs text-slate-500 hover:text-red-400 font-['Tajawal']">إيقاف</button>
      </div>

      {!lastDiff ? (
        <>
          <p className="text-xs text-slate-500 mb-2 font-['Tajawal']">استمع ثم اكتب ما سمعت:</p>
          <textarea
            value={typed}
            onChange={e => onTyped(e.target.value)}
            placeholder="اكتب هنا..."
            className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-none font-['Tajawal']"
            rows={2}
            dir="ltr"
          />
          <button
            onClick={onSubmit}
            disabled={!typed.trim()}
            className="mt-2 w-full py-1.5 rounded-lg bg-sky-500/20 text-sky-300 text-sm hover:bg-sky-500/30 disabled:opacity-40 transition-colors font-['Tajawal']"
          >
            تحقق
          </button>
        </>
      ) : (
        <>
          <div className="text-sm leading-relaxed mb-3 font-['Tajawal']" dir="ltr">
            {lastDiff.results.map((r, i) => (
              <span
                key={i}
                className={`mr-1 ${r.status === 'correct' ? 'text-green-400' : r.status === 'close' ? 'text-yellow-400' : 'text-red-400'}`}
                title={r.status !== 'correct' ? `كتبت: ${r.typed}` : ''}
              >
                {r.word}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-['Tajawal']">
              النتيجة: <span className={`font-bold ${lastDiff.score >= 80 ? 'text-green-400' : lastDiff.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{lastDiff.score}%</span>
            </span>
            <button onClick={onNext} className="text-xs px-3 py-1 rounded bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 font-['Tajawal']">
              التالي ←
            </button>
          </div>
        </>
      )}
    </div>
  )
}
