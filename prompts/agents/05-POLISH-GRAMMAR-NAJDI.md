# 05-POLISH-GRAMMAR-NAJDI — Formatting & readability

> **Move + execute:**
> ```powershell
> Move-Item -Force "$env:USERPROFILE\Downloads\05-POLISH-GRAMMAR-NAJDI.md" "C:\Users\Dr. Ali\Desktop\fluentia-lms\prompts\agents\05-POLISH-GRAMMAR-NAJDI.md"
> ```
> ```
> Read and execute prompts/agents/05-POLISH-GRAMMAR-NAJDI.md
> ```

> **Independent prompt** — can run in parallel with everything else.

---

## 🎯 MISSION

The Najdi-dialect grammar explanation feature is excellent in *content* but the output is dense and hard to scan visually. Fix both ends:

1. **The prompt** (system / user template sent to Claude API) so the model always emits well-structured Markdown with consistent sections, proper line breaks, and clear examples.
2. **The renderer** (the component that displays the output) so spacing, fonts, code-blocks, and example sentences are visually distinct and breathable.

**Goal:** student can scan a grammar lesson in 10 seconds and find what they need without re-reading paragraphs.

---

## 📁 ENVIRONMENT

- **Working dir:** `C:\Users\Dr. Ali\Desktop\fluentia-lms`
- **Skill:** `/mnt/skills/user/fluentia-lms/SKILL.md`
- **Design tokens:** `var(--ds-*)` for new code; Tajawal for Arabic; Inter for inline English

---

## ⚠️ STRICT RULES

1. **The Najdi feature exists** somewhere in the codebase. **Find it first** — do not rebuild from scratch.
2. **Backward compatibility** — existing cached explanations stay valid. The renderer must gracefully handle both old and new formats.
3. **No `vite build` locally.**

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE A — Discovery
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A.1 — Find the feature

```bash
grep -rln "najdi\|نجدي\|بالنجدي\|grammar.*explain\|explain.*grammar" src/ supabase/functions/ --include="*.tsx" --include="*.jsx" --include="*.ts"
```

Read every match. Identify:
- The edge function (likely `supabase/functions/grammar-explain-najdi/` or similar) — note model, system prompt, temperature.
- The React component that renders the result — note how it parses the response (plain text? Markdown? raw HTML?).
- The DB table caching the output (likely `grammar_explanations_cache` or column on `student_grammar_progress`).

### A.2 — Sample three existing cached outputs

```sql
SELECT id, lesson_id, explanation, created_at
FROM <cache table>
ORDER BY random() LIMIT 3;
```

Save the three samples to `docs/dev-notes/grammar-najdi-samples-before.md` so you can compare after.

### A.3 — Save discovery summary

Write `docs/dev-notes/grammar-najdi-discovery.md` with:
- Edge function path + model + temperature
- Component path + render method
- Cache table + columns
- 3 sample outputs (rendered to MD)

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE B — Improve the prompt
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Edit the edge function's system prompt to enforce strict structure. Replace whatever's there with this template:

```
You are an English grammar teacher who explains in the Saudi Najdi dialect.

Explain the requested grammar topic using EXACTLY this Markdown structure. Do not add or remove sections. Use blank lines between every section.

## الفكرة الأساسية

شرح بسيط في جملة أو جملتين، باللهجة النجدية الواضحة. لا تستخدم العربية الفصحى.

## القاعدة

اشرح القاعدة بنقاط واضحة:
- نقطة 1
- نقطة 2
- نقطة 3

## التركيب

اعرض البنية الإنجليزية بشكل مرئي:

`Subject + verb (V2) + object`

## أمثلة

اعرض 3 أمثلة كاملة. كل مثال:
- الجملة الإنجليزية
- ترجمتها بالنجدي
- ملاحظة قصيرة إذا فيها شي خاص

**مثال 1:**
> She **went** to the market yesterday.
> 
> راحت السوق أمس.

**مثال 2:**
> They **didn't see** the movie.
> 
> ما شافوا الفلم.
> 
> ملاحظة: لاحظ ʼdidn'tʼ يخلي الفعل يرجع للأصل (see مو saw).

**مثال 3:**
> ...

## أخطاء شائعة

عدد الأخطاء اللي يسويها الطالب السعودي بالعادة:

❌ **خطأ:** She goed to the market.  
✓ **صح:** She **went** to the market.  
**ليش؟** go فعل شاذ، الماضي عنده went مو goed.

## ملخص سريع

سطرين فقط، يلخصون الدرس.

---

RULES:
- Always Najdi dialect. Never فصحى.
- Every English example in **bold** for the key verb/structure.
- Use blockquotes (>) for example pairs.
- Blank line between every section header and its content.
- Blank line between every list item that has its own explanation.
- Total response 250-450 words. Not more, not less.
- No preamble, no closing remarks — start directly with `## الفكرة الأساسية`.
```

**Model:** keep current model (likely Sonnet). **Temperature:** lower to `0.3` for consistency. **Max tokens:** raise to `1500` to allow proper spacing.

### B.2 — Add an output schema check

After the API call, validate the response contains every required section header. If a header is missing → retry once with an appended instruction `IMPORTANT: Your previous response was missing required sections. Use ALL sections from الفكرة الأساسية through ملخص سريع.` After 2 failed attempts, save as-is and log to `grammar_explanations_warnings`.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE C — Improve the renderer
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C.1 — Render Markdown properly

If the current component renders the response as `whiteSpace: pre-wrap` plain text → switch to a Markdown renderer.

Use `react-markdown` (already in the project — verify with `grep -r "react-markdown" package.json`). If not present, install:

```bash
npm install react-markdown remark-gfm
```

### C.2 — Create / replace the grammar lesson component

**`src/components/grammar/NajdiExplanationView.jsx`**

```jsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function NajdiExplanationView({ markdown }) {
  if (!markdown) return null;

  return (
    <article
      dir="rtl"
      className="grammar-najdi prose prose-invert max-w-none"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Section headers — gold accent, generous spacing
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-[var(--ds-accent-gold)] mt-8 mb-3 first:mt-0 leading-tight">
              {children}
            </h2>
          ),
          // Paragraphs — relaxed line-height, breathing room
          p: ({ children }) => (
            <p className="text-[var(--ds-text-primary)] leading-[2] mb-4 text-[15px]">
              {children}
            </p>
          ),
          // Lists — clear bullet style, spaced items
          ul: ({ children }) => (
            <ul className="space-y-2 my-4 pr-6 list-disc marker:text-[var(--ds-accent)]">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="text-[var(--ds-text-primary)] leading-[2]">
              {children}
            </li>
          ),
          // Blockquote — example container with subtle border
          blockquote: ({ children }) => (
            <blockquote className="my-4 px-5 py-4 rounded-xl bg-[var(--ds-surface)] border-r-4 border-[var(--ds-accent)] not-italic">
              <div className="space-y-2 text-[15px] leading-[2]">{children}</div>
            </blockquote>
          ),
          // Inline code — for grammar structure like `Subject + verb`
          code: ({ inline, children }) => {
            if (inline) {
              return (
                <code
                  dir="ltr"
                  className="inline-block px-2 py-0.5 rounded bg-[var(--ds-surface-elevated)] text-[var(--ds-accent-light)] font-mono text-[13px] mx-1"
                >
                  {children}
                </code>
              );
            }
            return (
              <pre
                dir="ltr"
                className="my-4 p-4 rounded-xl bg-[var(--ds-surface-elevated)] text-[var(--ds-text-primary)] font-mono text-sm overflow-x-auto leading-relaxed"
              >
                <code>{children}</code>
              </pre>
            );
          },
          // Bold — used for key English terms, gold tint
          strong: ({ children }) => (
            <strong className="font-bold text-[var(--ds-accent-gold-light)]" dir="auto">
              {children}
            </strong>
          ),
          // Horizontal rule — section divider
          hr: () => (
            <hr className="my-6 border-0 h-px bg-gradient-to-l from-transparent via-[var(--ds-border-default)] to-transparent" />
          )
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
```

### C.3 — CSS reset for English-inside-Arabic flow

Add to your global CSS (or a new file `src/components/grammar/grammar-najdi.css`):

```css
.grammar-najdi {
  /* Use Tajawal for Arabic, Inter for English (auto bidi) */
  font-family: 'Tajawal', 'Inter', sans-serif;
}

.grammar-najdi p,
.grammar-najdi li {
  /* When English words appear inline, they get Inter automatically via :lang() — but we add unicode-bidi for safety */
  unicode-bidi: plaintext;
}

.grammar-najdi blockquote {
  /* Example blocks read top-to-bottom, English line first, Arabic line second — let each line own its direction */
  unicode-bidi: plaintext;
}

.grammar-najdi blockquote > div > p:nth-child(odd) {
  direction: ltr;
  text-align: left;
}

.grammar-najdi blockquote > div > p:nth-child(even) {
  direction: rtl;
  text-align: right;
}
```

### C.4 — Wire into the existing grammar tab

Find the component identified in A.1 that currently renders the explanation and:
- Remove the old plain-text rendering.
- Import + render `<NajdiExplanationView markdown={explanation} />`.
- If the cached explanation is in the old format (plain text without `##` headers) → still pass it through; `react-markdown` will render it as a single paragraph block. This preserves backward compatibility.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE D — Regenerate existing cached explanations (opt-in, NOT mandatory)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Old cached explanations will look slightly worse than new ones (no structured headers). Two options — pick the cheaper:

**Option 1 — Lazy regeneration:** add a "أعد التحميل بتنسيق محسّن" button on the grammar tab that calls the edge function with `force_regenerate=true`. Students regenerate on demand. Zero Claude cost up front.

**Option 2 — Bulk regeneration:** script `scripts/regenerate-najdi-explanations.cjs` that loops every cached row and re-calls the edge function. **Cost: N rows × ~1500 tokens × Sonnet price ≈ small.**

**Recommended: Option 1.** Add the button. The user-driven rate keeps cost trivial.

Add the button only — do not bulk regenerate.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE E — Self-check
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. `grep -rn "NajdiExplanationView" src/` → renderer wired in at least one place.
2. ESLint clean on new files.
3. Test the edge function with one real lesson topic (e.g. "past simple") and save the response to `docs/dev-notes/grammar-najdi-samples-after.md`. Compare to the "before" samples — the new output must have all 6 section headers.
4. Visually inspect the Markdown source. It must have blank lines between sections (no smushed paragraphs).

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## PHASE F — Commit + push
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```bash
git add supabase/functions/<grammar-najdi-fn>/ \
        src/components/grammar/NajdiExplanationView.jsx \
        src/components/grammar/grammar-najdi.css \
        src/pages/student/   # only the parent file that wires the new renderer
        docs/dev-notes/

git commit -m "polish(grammar-najdi): structured Markdown output + readable renderer

Edge function:
- New system prompt enforces 6-section Markdown structure
- Temperature 0.3, max_tokens 1500
- Schema check + 1 retry on missing sections

Renderer:
- NajdiExplanationView using react-markdown
- Gold-tinted h2 section headers, generous spacing
- Blockquote = example container with right-border accent
- Inline code = LTR mono for grammar structures
- Bold = gold for key English terms
- CSS unicode-bidi:plaintext so EN-inside-AR flows correctly
- Backward compatible with old plain-text cache rows

Regen strategy:
- Per-student 'أعد التحميل بتنسيق محسّن' button (lazy, opt-in)
- No bulk regen — keeps Claude cost trivial"

git push origin main
git fetch origin
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

---

## ⛔ DO NOT

- ❌ Bulk-regenerate cached explanations
- ❌ Break old cache rows (renderer must accept both formats)
- ❌ Switch dialect (Najdi only — no فصحى)
- ❌ Run vite build

## ✅ FINISH LINE

New explanations render in 6 clearly-separated sections with breathing room. Lazy "regenerate" button available. Commit pushed.

End of prompt.
