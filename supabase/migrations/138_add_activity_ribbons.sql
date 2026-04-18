-- Context Ribbons per-unit per-activity-type (Arabic, 1-line each)

ALTER TABLE curriculum_units
  ADD COLUMN IF NOT EXISTS activity_ribbons JSONB,
  ADD COLUMN IF NOT EXISTS ribbons_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN curriculum_units.activity_ribbons IS
  'JSONB keyed by activity type. Example:
   {
     "reading":      "أول لقاء مع عالم المطار بالإنجليزي",
     "vocabulary":   "كلمات الوحدة جاهزة لحفظٍ ذكي",
     "grammar":      "لتحكي عن تجاربكِ الحقيقية",
     "writing":      "طبّقي كل ما تعلّمتِ في رسالة واحدة",
     "speaking":     "صوتكِ، بثقة، في موقف المطار",
     "listening":    "أذنكِ تتعوّد على إعلانات المطار",
     "pronunciation":"دقّة النطق تفتح أبواب الفهم",
     "assessment":   "لحظة التأكد من رسوخ ما تعلّمتِ"
   }';

COMMENT ON COLUMN curriculum_units.ribbons_generated_at IS
  'When Claude API generated the ribbons. NULL = not yet. Idempotency key.';

CREATE INDEX IF NOT EXISTS idx_curriculum_units_ribbons_pending
  ON curriculum_units (id) WHERE ribbons_generated_at IS NULL;
