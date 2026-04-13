-- Grammar AI tutor explanation cache
CREATE TABLE IF NOT EXISTS public.grammar_explanation_cache (
  cache_key TEXT PRIMARY KEY,
  question_text TEXT NOT NULL,
  student_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  tldr_ar TEXT NOT NULL,
  explanation_html TEXT NOT NULL,
  hit_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grammar_explanation_cache ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can read cache
CREATE POLICY "read_cache" ON public.grammar_explanation_cache
  FOR SELECT TO authenticated USING (true);

-- Write: only service_role (edge function) — no INSERT policy for authenticated

CREATE INDEX IF NOT EXISTS idx_grammar_cache_recent
  ON public.grammar_explanation_cache(created_at DESC);

-- Add exceptions column to curriculum_grammar
ALTER TABLE public.curriculum_grammar
  ADD COLUMN IF NOT EXISTS exceptions JSONB DEFAULT NULL;

-- Seed exceptions for common past-simple rules
-- Find past simple grammar topics and add exception data
UPDATE public.curriculum_grammar
SET exceptions = '[
  {
    "title_ar": "الأفعال المنتهية بحرف متحرك + y",
    "rule_ar": "إذا كان الحرف قبل الـ y حرفاً متحركاً (a, e, i, o, u)، أضيفي -ed فقط بدون تغيير الـ y.",
    "examples": [
      { "base": "enjoy", "correct": "enjoyed", "wrong": "enjoied" },
      { "base": "play", "correct": "played", "wrong": "plaied" },
      { "base": "stay", "correct": "stayed", "wrong": "staied" }
    ]
  },
  {
    "title_ar": "الأفعال المنتهية بحرف ساكن + y",
    "rule_ar": "إذا كان الحرف قبل الـ y حرفاً ساكناً، حوّلي الـ y إلى i ثم أضيفي -ed.",
    "examples": [
      { "base": "study", "correct": "studied" },
      { "base": "cry", "correct": "cried" },
      { "base": "carry", "correct": "carried" }
    ]
  },
  {
    "title_ar": "الأفعال المنتهية بحرف ساكن مضاعف",
    "rule_ar": "إذا انتهى الفعل بحرف متحرك واحد + حرف ساكن واحد (CVC)، ضاعفي الحرف الأخير ثم أضيفي -ed.",
    "examples": [
      { "base": "stop", "correct": "stopped", "wrong": "stoped" },
      { "base": "plan", "correct": "planned", "wrong": "planed" },
      { "base": "drop", "correct": "dropped", "wrong": "droped" }
    ]
  },
  {
    "title_ar": "الأفعال المنتهية بـ e",
    "rule_ar": "إذا انتهى الفعل بحرف e صامت، أضيفي -d فقط.",
    "examples": [
      { "base": "like", "correct": "liked", "wrong": "likeed" },
      { "base": "love", "correct": "loved", "wrong": "loveed" },
      { "base": "arrive", "correct": "arrived", "wrong": "arriveed" }
    ]
  }
]'::jsonb
WHERE (
  lower(topic_name_en) LIKE '%past simple%'
  OR lower(topic_name_en) LIKE '%past tense%'
  OR lower(topic_name_en) LIKE '%regular verb%'
)
AND exceptions IS NULL;
