# PROMPT — Unit Star Metrics: UX Improvements (Tooltips + Positive Framing + Improvement Hints)

## 🎯 Goal
Fix the Unit Star page so students understand **what each metric means**, **why they got their score**, and **how to improve it** — applied to ALL metrics (الإكمال، الجودة، السرعة، المفردات، الجهد).

**Student confusion reported:** students see "الجهد: 0/10" and feel they failed, even when they got 87.7 overall and completed the unit excellently. Root cause: effort is a bonus-style metric but displayed as a pass/fail score, with no explanation.

---

## 📍 Working Directory
`C:\Users\Dr. Ali\Desktop\fluentia-lms`

---

## ⛔ Critical Rules

1. **Discovery FIRST** — read the current Unit Star page implementation before any edit. Find the actual component (likely `UnitStar`, `UnitCompletionStar`, `UnitStarPage`, or similar).
2. **Understand the scoring formula** — open the edge function or client-side calculation that produces the 5 metrics. Document it before changing UI.
3. **Do NOT change the scoring math** — we are only changing UI/UX. Numbers stay the same.
4. **Arabic-first, RTL** — all new text in Arabic. No English in student-facing UI.
5. **Preserve the existing design language** (dark theme, amber + sky accents, Tajawal font).
6. **No new libraries** — use what's already installed.
7. **No `vite build` / `npm run build` locally** — Vercel handles it.
8. **Verify git push** via `git fetch origin && git log --oneline -1 HEAD` vs `origin/main`.

---

## 📋 Phases

### Phase 0 — Discovery (READ-ONLY)

Find and read:
- The Unit Star page component (look in `src/pages`, `src/features/curriculum`, search for "الجهد" or "نجم/ة الوحدة")
- The scoring calculation (client-side hook OR edge function — find both if they exist)
- Existing tooltip/popover components in the codebase (shadcn `Tooltip`, `Popover`, or custom)

Document in a short summary:
- Exact file path of the Unit Star page
- Exact formula for each of the 5 metrics (الإكمال، الجودة، السرعة، المفردات، الجهد)
- Max score per metric
- Whether "الجهد" is a bonus on top or deducts from total
- Any existing tooltip primitive to reuse

**Print the summary. Then proceed.**

---

### Phase 1 — Implement 3 UX Fixes

Apply **all three** improvements to EVERY metric (الإكمال، الجودة، السرعة، المفردات، الجهد):

#### Fix 1: Explanation Tooltip/Sheet
- Add an info icon (ℹ️ or `i` in a small circle) next to each metric label
- On tap (mobile) or hover (desktop): open a popover/bottom-sheet showing:
  - **اسم المقياس** (metric name)
  - **وش يعني** (1–2 sentence explanation in plain Arabic)
  - **كيف انحسب** (simple formula, no jargon)
  - **درجتك الحالية** (current score)

**Explanations to use (Arabic):**

| Metric | وش يعني | كيف انحسب |
|--------|--------|----------|
| **الإكمال** | قياس كم نشاط خلّصتِ في الوحدة (قراءة، مفردات، كتابة، محادثة، قواعد). | كل نشاط تخلّصينه يعطيكِ نقاط. خلّصي كل الأنشطة للدرجة الكاملة. |
| **الجودة** | متوسط درجاتك في تقييمات الوحدة (القراءة، الكتابة، المحادثة). | نأخذ متوسط الدرجات. كل ما كانت إجاباتكِ دقيقة، كل ما ارتفعت الجودة. |
| **السرعة** | قياس كيف أنجزتِ الأنشطة بوقت مناسب. | إذا خلّصتِ في وقت معقول مقارنة بمتوسط الطالبات، تاخذين الدرجة كاملة. |
| **المفردات** | كم كلمة من مفردات الوحدة أتقنتيها (استخدام صحيح + مراجعة). | تعلّمي واستخدمي كلمات الوحدة لرفع هذا المقياس. |
| **الجهد** | **نقاط مكافأة** على الممارسة الإضافية — إعادة التمارين، مراجعة ما أتقنتيه، ممارسة طوعية. | هذا مقياس اختياري. لا ينقص من درجتك إذا كان صفر، ولكن يضيف لها إذا مارستِ أكثر. |

#### Fix 2: Positive Framing for Effort (الجهد)
- Currently shown as `0/10` (looks like failure)
- Change display of الجهد ONLY:
  - If value = 0: show `"+0 إضافي"` in a muted/neutral color (not red, not alarming)
  - If value > 0: show `"+X إضافي"` in amber/gold (celebratory)
  - Label the progress bar: `"نقاط إضافية (اختياري)"` instead of treating it like a required score
- Visual style: different from the other 4 metrics — use a subtle bonus badge aesthetic (small gold star ⭐ icon maybe)
- **Do NOT change the underlying score value** — only the label, color, and "+" prefix

#### Fix 3: "How to improve" Hints
- Under each metric's tooltip/sheet, add a section:
  - **"كيف ترفعين درجتك؟"**
  - 2–3 actionable tips specific to that metric
- Only show this section when score < max. When score = max, show a celebration message instead: **"ممتاز! وصلتِ للدرجة الكاملة 🎉"**

**Tips per metric:**

**الإكمال** (if < max):
- أكملي الأنشطة المتبقية في الوحدة
- تحققي من تبويب "المنهج" للأنشطة التي لم تبدئيها بعد

**الجودة** (if < max):
- راجعي إجاباتك في الأنشطة وتعلّمي من ملاحظات المدرب/ة
- خذي وقتك في القراءة قبل الإجابة
- أعيدي النشاط إذا حصلتِ على درجة منخفضة (بعض الأنشطة تسمح بإعادة المحاولة)

**السرعة** (if < max):
- حاولي إنجاز الأنشطة بتركيز دون مقاطعات
- لا يعني السريع المتسرّع — المقصود أن تنجزي في وقت معقول

**المفردات** (if < max):
- استخدمي المفردات في الكتابة والمحادثة
- راجعي كلمات الوحدة بشكل دوري
- حلّي تمارين المفردات أكثر من مرة

**الجهد** (always — this is a bonus):
- أعيدي نشاطًا خلّصتيه للممارسة
- راجعي كلمات أتقنتيها لتعزيز الحفظ
- مارسي المحادثة أو الكتابة مرات إضافية

---

### Phase 2 — Verification

Build the flow manually:
1. Open the Unit Star page as a student (use admin impersonation).
2. Tap the info icon next to each of the 5 metrics — verify tooltip opens with correct content.
3. Verify الجهد shows as `"+X إضافي"` with bonus styling, NOT as `X/10`.
4. Verify the "كيف ترفعين درجتك؟" section shows ONLY when score < max.
5. Test on mobile viewport (this is a mobile-first PWA).
6. RTL text layout intact, no overflow.
7. Dark theme contrast passes (WCAG AA).

---

### Phase 3 — Commit & Deploy

```bash
git add .
git commit -m "feat(unit-star): add metric tooltips, positive effort framing, improvement hints

- Info icon on each of 5 metrics with Arabic explanation
- Effort displays as '+X إضافي' bonus instead of X/10
- 'How to improve' section under each metric when not at max
- Celebration message when metric at max
- No scoring formula changes — UI/UX only"
git push origin main

git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
# Both must match
```

---

## ✅ Success Criteria

- [ ] Phase 0 discovery summary printed (file paths + formulas documented)
- [ ] Info icon appears next to all 5 metrics
- [ ] Tooltip/sheet opens with correct Arabic explanation for each metric
- [ ] الجهد displays as `"+X إضافي"` with bonus styling, NOT `X/10`
- [ ] "كيف ترفعين درجتك؟" tips appear when metric < max
- [ ] Celebration message when metric = max
- [ ] Mobile-first RTL layout verified
- [ ] Dark theme contrast passes
- [ ] Pushed to origin/main, push verified
- [ ] Scoring formulas unchanged (verify by spot-checking a student's score before/after)

---

## 📝 Command to Run

Paste into Claude Code terminal:

```
Read and execute prompts/agents/PROMPT-UNIT-STAR-UX.md. Start with Phase 0 discovery and print the summary before making any changes. Do not modify any scoring formulas — only UI/UX.
```
