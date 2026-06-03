import { useState, useMemo } from 'react'
import { BookOpenText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useArticleVocabIndex } from '@/hooks/useArticleVocabIndex'
import ArticleBody from '@/components/curriculum/reading/ArticleBody'
import WordPopup from '@/components/curriculum/reading/WordPopup'

// Runtime Arabic translation for the ~9% of transcript words the offline
// vocab/glossary index doesn't cover (mostly inflected forms — jumped, visited —
// since reading_glossary was built from reading passages, not listening). Reuses
// the Claude-backed vocab-quick-meaning edge function; cached per session so each
// word is fetched at most once. WordPopup shows "جارٍ الترجمة…" while this resolves.
const MEANING_CACHE = new Map()
async function quickMeaning(word) {
  const key = (word || '').toLowerCase().trim()
  if (!key) return null
  if (MEANING_CACHE.has(key)) return MEANING_CACHE.get(key)
  try {
    const { data, error } = await supabase.functions.invoke('vocab-quick-meaning', { body: { word: key } })
    if (error) throw error
    const ar = data?.meaning_ar || null
    MEANING_CACHE.set(key, ar)
    return ar
  } catch {
    return null
  }
}

// Premium listening transcript ("إظهار النص"). Reuses the READING editorial
// machinery so the listening transcript matches the polished reading experience:
//  - useArticleVocabIndex → one offline pass (curriculum_vocabulary + reading_glossary)
//    so EVERY tapped word resolves a meaning instantly, no runtime AI/API.
//  - ArticleBody → premium magazine typography; every word tappable, vocab underlined.
//  - WordPopup → the elevated card: word + IPA + Arabic meaning + example + instant
//    pronunciation via pronounceWord (curriculum MP3 → Web Speech) + save-to-vocab.
// pronounceWord plays a tiny dictionary clip (not the long lesson audio), so it is
// unaffected by range-request issues and now also bypasses the SW media cache.
export function TranscriptReader({ transcript, listeningId, studentId, unitId }) {
  const [active, setActive] = useState(null)

  // Each line/utterance becomes a paragraph (transcripts are usually line-per-turn);
  // a single block stays one paragraph. ArticleBody handles the rest.
  const paragraphs = useMemo(() => {
    const raw = (transcript || '').trim()
    if (!raw) return []
    const byBlank = raw.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
    if (byBlank.length > 1) return byBlank
    return raw.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  }, [transcript])

  const { data: vocabIndex } = useArticleVocabIndex(listeningId, paragraphs)

  if (!paragraphs.length) return null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--ds-surface-1, var(--surface-raised, #11131c))',
        border: '1px solid var(--ds-border-subtle, var(--border-subtle, rgba(255,255,255,0.07)))',
        boxShadow: '0 20px 50px -28px rgba(0,0,0,0.5)',
      }}
    >
      {/* Premium header */}
      <div
        dir="rtl"
        className="flex items-center gap-2.5 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))' }}
      >
        <BookOpenText size={16} style={{ color: 'var(--ds-accent-primary, #e9b949)' }} />
        <span
          className="font-bold font-['Tajawal'] text-sm"
          style={{ color: 'var(--ds-text-primary, #f8fafc)' }}
        >
          النص
        </span>
        <span
          className="font-['Tajawal'] text-[11px]"
          style={{ color: 'var(--ds-text-tertiary, #64748b)' }}
        >
          — اضغط على أي كلمة لسماع نطقها ومعرفة معناها
        </span>
      </div>

      {/* Editorial body — every word tappable */}
      <div className="py-6">
        <ArticleBody
          paragraphs={paragraphs}
          vocabIndex={vocabIndex}
          onWordTap={(word, rect, vocabRow) => setActive({ word, rect, vocabRow })}
        />
      </div>

      {active && (
        <WordPopup
          word={active.word}
          vocabRow={active.vocabRow}
          anchorRect={active.rect}
          studentId={studentId}
          unitId={unitId}
          onClose={() => setActive(null)}
          fetchFallback={quickMeaning}
        />
      )}
    </div>
  )
}

export default TranscriptReader
