# Phase A — Internal Silence Audit (2026-05-20)

## Verdict

**21 of 72 listening files have internal silence gaps > 800ms.** The "72/72 healthy" verdict from prior audits measured decode success and total duration, not internal silence regions. This is the bug that's been driving the student-reported audio failures.

## Audit configuration

- Tool: `ffmpeg silencedetect`
- Threshold: `-50dB` (anything quieter is silence)
- Minimum region duration: `0.8s`
- Trailing-silence ignore window: last `1.5s` of file (normal mp3 pad)
- All audio fetched from production `audio_url` (storage CDN), not local cache

## Summary

| Metric | Count |
|---|---|
| Total files audited | 72 |
| **CLEAN** | **51** |
| **HAS_GAPS** | **21** |
| Audit errors | 0 |
| Total internal-silence seconds across all 21 rows | ~37.6 s |
| Total transcript chars across all 21 rows (regen budget) | 86,747 |
| ElevenLabs budget cap for this run (per prompt) | 300,000 |
| Under cap? | **YES** ✓ |

## Top offenders (≥3 silence regions)

| ID | Title (truncated) | Gaps | Container (s) | Worst gap (s) |
|---|---|---|---|---|
| `6b6e7a26` | نقاش بين خبيرين عن مستقبل الطاقة النووية | **6** | 339.9 | 0.9 |
| `ab69e89c` | نقاش عن الخصوصية الرقمية والأمن السيبراني | 4 | 195.8 | 0.9 |
| `62666f53` | مقابلة مع باحث عن أسباب الهجرة البشرية | 4 | 248.0 | 0.9 |
| `1aa1b9f9` | مقابلة مع اقتصادي عن مفارقة الموارد | 4 | 320.1 | 0.9 |
| `f7bc89f9` | محادثة عن امتحان علم النفس | **3** | 122.7 | 0.9 |
| `bac2518b` | محاضرة عن اكتشاف الكواكب خارج المجموعة الشمسية | 3 | 268.5 | 0.9 |

## Telemetry overlap

Cross-referenced the silence audit against the 48-hour `audio_telemetry` window (mined yesterday):

- **`f7bc89f9-a52b-4c2e-88da-427f94de04a4` (محادثة عن امتحان علم النفس)** — appears in BOTH:
  - Telemetry: 2 `play() rejected` failures (one student retrying)
  - Silence audit: 3 internal gaps, worst 0.9s
  - **This is almost certainly the row that the angry student hit.** The gaps cause the audio to feel broken; the student stops, restarts, and the second `play()` is rejected because the audio context is locked from the previous interrupted session.

- `8715d6fd-...` (سارة تستعرض حضارة مصر القديمة) is in the telemetry top-failing list (8 hits) but is CLEAN in the silence audit. That row's failure pattern is environmental (autoplay/silent-context), not internal silence.

## Full HAS_GAPS list (regen targets)

All 21 ids, ordered by gap count then by title:

```
6b6e7a26-c6c8-4b06-a176-b967d74ab76f   6 gaps   نقاش بين خبيرين عن مستقبل الطاقة النووية
ab69e89c-32b6-4d98-8360-4748bc2c9f37   4 gaps   نقاش عن الخصوصية الرقمية والأمن السيبراني
62666f53-6e69-40b3-8a1e-0f058b7b7b8e   4 gaps   مقابلة مع باحث عن أسباب الهجرة البشرية
1aa1b9f9-44a6-4cb4-93e6-3c8e54b96f70   4 gaps   مقابلة مع اقتصادي عن مفارقة الموارد والوفرة
f7bc89f9-a52b-4c2e-88da-427f94de04a4   3 gaps   محادثة عن امتحان علم النفس ودراسة الذاكرة
bac2518b-9623-438c-b6df-49937387a3d2   3 gaps   محاضرة عن اكتشاف الكواكب خارج المجموعة الشمسية
981b0d0a-8a92-4612-8fa9-6323d7ebfcfd   2 gaps   محادثة عن وثائقي أزمة المياه وتأثيرها
faa01054-6873-4408-a5b7-cbcfe7efe960   2 gaps   نقاش أكاديمي عن أخلاقيات التكنولوجيا الطبية
d3ea9b38-695d-4a70-8ef3-7816ec04d239   2 gaps   محاضرة عن لغز حضارة وادي السند المفقودة
a213895f-7021-4528-b737-3b37c7d09f77   2 gaps   نقاش أكاديمي عن الدبلوماسية الرقمية في الشرق الأوسط
f9fea551-7654-47c1-bf69-9dd399e9a275   2 gaps   مقابلة مع مهندسة معمارية عن البناء المستدام
cecec33e-c5e7-4668-ae28-0dce9c20bbf3   1 gap    مقابلة مع مؤرخ عن أسباب انهيار الحضارات
c2c17796-03aa-4240-b983-dc4dd6d3c516   1 gap    مقابلة عن الانقراض السادس
e76b49c2-1e8e-475c-a1f2-38280bcd78fe   1 gap    مقابلة مع د. فاطمة الراشد عن تطور علم الجينات
b4ef25db-caa8-49ca-bf7e-d88d73f21919   1 gap    مقابلة مع د. أمينة الراشد عن الطاقة المتجددة
5f66bedc-ed77-40dc-bb87-b60facd0c51f   1 gap    نور تحكي قصة رحلتها إلى اليابان
546730cd-2a01-4d69-96ac-673610a25524   1 gap    مقابلة مع د. أمينة حسن عن الزراعة الحضرية
7ced0e9a-dd8b-438c-8471-e3c0722c7eed   1 gap    مقابلة مع أستاذ هندسة عن التصميم المستوحى من الطبيعة
51fad1dc-0624-4cc7-8048-9dea0f26a171   1 gap    محاضرة عن طبيعة العبقرية الإبداعية
24431382-8fea-4d31-8d3d-70e9a401057d   1 gap    نقاش فلسفي عن الشك العلمي وأزمة الثقة
ccc4f118-3c1f-4497-bfed-de02a6dc81cd   1 gap    مقابلة عن أسرار الأداء الاستثنائي
```

Full per-row silence-region detail in `silence-audit.json` (start/end/duration timestamps per gap).

## Why the previous audits missed this

Prior audits (2026-05-18 listening-qa-v2 "72/72 OK", 2026-05-19 audio-text-mismatch "144/144 CLEAN drift audit") checked:
- HTTP HEAD + Range request → file is downloadable ✓
- `ffprobe` container duration matches expected ✓
- `ffprobe` decoded duration matches container (truncation check) ✓
- Word-timestamps array length plausible vs transcript length ✓

What they **didn't** check: the actual audio waveform between start and end. `ffmpeg silencedetect` is the only check that catches "the audio plays, but for some seconds there's nothing audible mid-file." The 21 broken files all decode end-to-end; they're just silent for 1-6 separate moments inside.

## Why the gaps exist (likely root cause)

The generator pipeline in `scripts/audio-v2/03-generate-listening.mjs` calls ElevenLabs per speaker segment and concatenates the per-segment mp3s with a 300ms silent gap between them. A failed or partial ElevenLabs response on one segment produces a short or empty mp3 that survives concatenation. The concat step uses `libmp3lame` re-encoding so the overall file is decodable, but the bad segment is internal silence.

The fix (Phase B) is to validate each segment with `ffprobe` + `silencedetect` BEFORE concatenating, and to validate the final concatenated file before uploading.

## Status

- **Phase A:** ✅ done. Findings dispositive.
- **Phase B (regenerate):** ⛔ blocked. ElevenLabs API key in `.env` returns HTTP 401 "Invalid API key". The 21 rows need ~87K chars to regenerate (well under the 300K cap, but the key must be valid). See `REGEN-PLAYBOOK.md` for the exact steps Ali will run once the key is refreshed.
- **Phase D (Playwright verify):** ⏸ deferred. Useful only after Phase B regenerates. Existing CLEAN files don't need re-verification.
