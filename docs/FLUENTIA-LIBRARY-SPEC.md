# 📚 FLUENTIA LIBRARY — MASTER BUILD SPECIFICATION
### مكتبة طلاقة — The library that grows with you

> **Status:** Design complete. Ready to build.
> **Author of decisions:** Ali (founder). **Spec compiled:** 2026-06-06.
> **Feature codename:** Fluentia Library / مكتبة طلاقة

---

## 0. HOW TO USE THIS DOCUMENT

This is the **single source of truth** for the entire Library feature. Read it as the "constitution" of the build — every decision below is locked unless Ali changes it.

**Where this file lives:** commit it to the repo at `docs/FLUENTIA-LIBRARY-SPEC.md` in the very first prompt (P1). From then on, **every build prompt (P1–P11) instructs Claude Code to read this file first** so it always has full context.

**This document is NOT executed as a single build.** The feature ships in **11 sequential prompts** (Section 9). Each prompt is one clean commit, one deploy, independently revertable. Ali pastes one prompt at a time into Claude Code; it builds autonomously, commits, pushes, deploys; Ali confirms; the next prompt follows.

**Golden rule of the whole feature:** This is **purely additive**. It introduces a new sidebar section and new `library_*` database tables. It must **never** modify, migrate, or break anything in the existing curriculum, units, lessons, reading section, vocabulary system, or progress tracking. Worst-case rollback at any point = hide the sidebar link; the rest of the LMS is untouched.

---

## 1. VISION & POSITIONING

**What it is:** A library of bilingual graded novels in English (levels A1 → C2), each with full Arabic translation accessible on tap, native-quality audio narration, and a personal vocabulary system. Students browse freely and read at their own pace.

**What it is NOT:** It is not "ESL graded readers." It is **world fiction in graded English** — literary, tasteful, cosmopolitan. The neighborhood we aim at is Penguin Classics / Europa Editions / Ishiguro-Murakami, *simplified to the learner's level* — not Cambridge/Oxford textbook readers.

**Why it wins:** Fluentia is not competing with great human novelists. It is competing with (1) bland foreign graded readers, (2) passive YouTube English, and (3) the student reading nothing at all. Against those three, a beautifully presented novel with Arabic on tap + audio + vocab + an emotional Chapter-1 hook wins every time.

**The strategic moat:** Content volume. A human writes one novel in 6 months; Claude Code drafts a full library in days. Combined with a one-pass human edit, the result is *indistinguishable from competent human-written fiction for this audience* — at effectively zero marginal cost.

**Positioning taglines (refine later):** *"Real novels. Your level. Your pace."* / *"The library that grows with you."*

---

## 2. NON-NEGOTIABLES (every prompt must honor these)

These come from the project's established engineering rules (`fluentia-lms` skill + production scars). Every prompt repeats the relevant ones, but they are collected here so nothing is missed.

### Database
- **`information_schema` probe FIRST.** Before writing any query, verify every table/column exists via `information_schema.columns`. The `is_published=true` assumption once caused a 0-units production outage. Never assume a column name.
- **`curriculum_*` tables are sacred and read-only.** Never write to them. The Library only ever *reads* a student's level from `profiles`.
- **All new tables use the `library_` prefix.** No collisions with existing tables.
- **Never modify XP via direct write.** XP is awarded only by `INSERT INTO xp_transactions` (same pattern curriculum uses).
- **Every `UPDATE`/`UPSERT` ends with `.select()`** to catch silent RLS failures (RLS blocks return `error = null` with zero rows — looks like success, isn't).
- **Never use `.catch()` on Supabase calls.** Always `const { data, error } = await …; if (error) throw error;`.
- **Never hard delete.** Soft delete via `deleted_at`. Never delete files — rename to `.deprecated.jsx` / `.legacy.jsx`.
- **RLS is mandatory on every new table.** A policy must exist for every role + operation the feature needs. Verify with `pg_policies` and test as the **authenticated student role**, never `service_role` (service_role bypasses RLS and hides bugs).
- **Auth identity:** always use `profile?.id` from `useAuthStore()`, never `user.id`. Impersonation swaps the profile but leaves the admin auth user — use `useAuthProfileId` where it exists.

### React / Frontend
- **React Hooks Rule:** ALL hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useQuery`, `useMutation`) at the very top, before any conditional return or role gate. Gate AFTER hooks. Violation = React error #310 (production white screen).
- **Async safety:** every async `useEffect` uses a mounted guard (`let isMounted = true; … return () => { isMounted = false; }`).
- **Realtime:** every channel subscription is cleaned up in the effect's return.
- **Never trap the user:** every action has a fallback path on DB/API failure. Show a friendly Arabic toast and continue; never a blank screen or infinite redirect loop.
- **Loading = skeleton shimmer, never spinners.**

### Build / Ops
- **Never run `vite build` locally** (memory OOM). Vercel handles builds on push to `main`.
- **Supabase project ref:** `nmjexpuycmqcxuxljier` (Frankfurt). MCP read-only for probes; `apply_migration` for schema.
- **Mac working dir:** `/Users/dr.ali/Projects/fluentia-lms`. Repo: `alialahmad2000/fluentia-lms`, branch `main`, production `app.fluentia.academy`.
- **Atomic commits per logical phase**, push after each. Commit format: `feat:` / `fix:` / `docs:`.
- **After every task:** update the CHANGE LOG in `CLAUDE.md`, update `FLUENTIA-SPEC.md` if architecture changed, include both in the commit.

### Edge functions
- Verify JWT on every call (`supabase.auth.getUser(token)` → 401 if invalid).
- **Any runtime AI call uses `claude-sonnet-4-20250514`** (Sonnet, for cost), never Opus. (Note: the Library needs *no* runtime AI — all content is pre-generated. This rule applies only if a future text-help feature is added.)

### Content & AI cost philosophy (non-negotiable)
- **Claude Code = ALL content generation** (chapters, translations, sentence pairs, covers) at **$0 API cost** under the Max plan.
- **Runtime Claude API = NEVER used** for the Library. Everything a student reads is pre-generated and stored. No per-read API calls, ever.

---

## 3. THE PRODUCT — FULL SPEC

### 3.1 Reading UX

Two reading modes. Both available in every book; the student switches anytime from the reader header.

**MODE 1 — REVEAL (the default, the "real" reading mode)**
- English-only on screen by default.
- **Tap any sentence → its Arabic translation reveals smoothly underneath** that sentence. Tap again → hides.
- This is the load-bearing interaction of the whole product (see stretch zones, 3.1.3). The tap *is* the learning moment.
- **Only Reveal mode counts** toward XP, streaks, and "books finished."

**MODE 2 — ASSIST (split-screen, the "comfort/enjoy" mode)**
- **Desktop / tablet:** English and Arabic side-by-side, full text both languages.
- **Mobile:** vertical-stacked — English paragraph, then its Arabic paragraph underneath, then next English paragraph. (We do **not** attempt LTR+RTL side-by-side on a phone — it breaks. Stacked only.)
- Carries a visible, gentle badge: **«وضع المساعدة — لا يُحتسب ضمن التقدّم»** / *"Assist mode — doesn't count toward progress."*
- **Assist mode earns no XP, no streak credit, no book-completion.** This single rule is the entire defense against students lazily reading the Arabic and calling it learning.

**Defaults & switching**
- **A1 & A2 default to Assist** on first open (no shame, no cliff for true beginners — finishing the first book is the dopamine hit that creates the habit).
- **B1 and above default to Reveal.**
- Either mode is switchable anytime. **Mode preference persists per book.**

### 3.1.3 Stretch zones (the soul of the content)

Content is **NOT** strict-CEFR. Strict leveling is exactly why existing graded readers feel dead. We use **comprehensible input with stretch zones** (Krashen i+1) — modeled on **Agatha Christie**, the most-recommended author for English learners worldwide.

Per chapter:
- **~85% at the book's baseline level** — accessible vocabulary and grammar carrying narrative and dialogue. The reader *flies* through this.
- **~15% deliberate one-level-up "stretch" reaches** — placed in **description, atmosphere, and character interiority**. The reader *slows down* here. This is where growth happens.
- **Stretches NEVER appear in critical plot dialogue.** Plot-bearing dialogue stays clean at baseline so comprehension is never blocked at key moments.
- **Stretches are INVISIBLE** — no underlines, no highlights, no color. Discovery is the experience, exactly like a real novel. (A student who doesn't understand a stretch word simply taps the sentence → Reveal gives them the Arabic → they read on. That seamless recovery is why Reveal mode is essential, not optional.)

The feel target: **fly through dialogue and action, slow down for atmosphere.** Just like reading a novel.

### 3.2 Library structure & level-gating

The Library lives in its **own sidebar section** (المكتبة). It is **free-browse** — NOT embedded in the curriculum, NOT a required unit assignment. Reading is a pleasure activity; the moment it becomes homework, students skip it.

A student's level is read from `profiles` (read-only). Books are gated by CEFR level relative to the student's current level:

| Relationship to student level | State | What the student sees |
|---|---|---|
| **Current level + ALL lower levels** | ✅ **Fully unlocked** — "مكتبتي / My Library" | Full access. Read freely, re-read for fluency. |
| **Level +1** | 🎁 **Taste-and-Tease** — "اقرأ الفصل الأول / Read Chapter 1" | Cover + synopsis + **Chapter 1 fully accessible (text AND audio)**. Rest locked behind a progress banner. |
| **Level +2 and above** | 🔒 **Fully locked** — "قريباً / Coming Soon" | Cover visible but **blurred / grayscale**. No chapters. Plants the long-term goal. |

**A1 students see ONLY their level + the B2... (i.e. +1) tease.** The locked upper section is hidden at A1 and **expands gradually as the student levels up** — earned visibility, never an intimidating wall of locks for a nervous beginner.

> Implementation note: probe `information_schema` to confirm exactly how level / CEFR is stored on `profiles` and how the 6 curriculum levels map to A1–C2. Map gating off that — do not hardcode an unverified field name.

### 3.3 Taste-and-Tease mechanics (the upgrade hook)

When a student opens a **+1** book:
- Cover, synopsis, and **Chapter 1 in full** — text **and** audio — are unlocked.
- They read Chapter 1, hit the cliffhanger, tap to continue → locked screen:

  > **«وصلت إلى نهاية الفصل الأول 🎯»**
  > **«لإكمال الرواية، ارفع مستواك إلى B2»**
  > **«أكمل [N وحدات] لتفتح المكتبة الكاملة»**
  >
  > *"You've finished Chapter 1. Reach B2 to unlock the rest. [N units to go]."*

**Rules:**
- **One full chapter, not a percentage preview.** A complete Chapter 1 has a real ending and emotional payoff — it *sells* the rest. (Content team writes every Chapter 1 knowing its job is to hook.)
- **The lock screen shows CONCRETE progress**, tied to the student's real unit progress — not vague "keep studying!" It names the exact number of units remaining to reach the next level.
- **NO skip-to-buy escape hatch.** No unlocking with XP, gems, or money. The **only** way to unlock is to actually level up. This protects the integrity of the entire system and reinforces that Fluentia rewards real progress, not shortcuts.
- **When a tease book unlocks** (student reaches the level): the book transitions from "tease" → "now reading" state with a satisfying animation **and** a notification:
  > **«📖 [اسم الرواية] متاحة الآن بالكامل»** / *"[Book title] is now fully unlocked."*

### 3.4 Engagement loop

All of these together (not one alone) bring students back:

- **XP** — for finishing each chapter and for finishing a book. **Reveal mode only.** Awarded via `INSERT INTO xp_transactions` (never direct write).
- **Reading streak** — daily reading (any chapter, any book). **Reveal mode only.**
- **Trophies** — first book finished, 5 books, 10 books, each level's library completed, streak milestones (7/30/100 days).
- **Personal vocabulary deck** — see 3.4.1.

### 3.4.1 Vocab tap + SRS deck

- In **Reveal mode**, tap any **word** → saved to a personal Library vocab deck (with the word, its sentence context, and Arabic meaning).
- Saved words stay **subtly highlighted** when re-reading that book (so the student sees their own growth).
- A **vocab review screen** inside the Library section runs spaced repetition.
- **Reuse the existing FSRS/SRS engine already in the codebase** (the curriculum vocabulary system already implements SRS/FSRS). The Library deck is a **separate deck** (`library_saved_vocab`) but uses the **same algorithm/library** for consistency — do not invent a parallel ad-hoc scheduler. Probe the existing implementation and follow it.

---

## 4. CONTENT SPEC

### 4.1 Themes (MVP)
**Mystery · Grief · Ambition.** These are the three engines of compelling fiction (plot / emotion / character) and they map perfectly to the stretch-zone strategy:
- **Mystery** → propulsive plot, tight clean dialogue, stretches in atmosphere.
- **Grief** → slower interior prose, emotional specificity — Claude's best stretch-zone work.
- **Ambition** → character- and dialogue-driven, social dynamics, moral complexity.

### 4.2 The 9 MVP novels (3 themes × 3 levels)

> **Illustrative titles/premises — Ali has final say on every one.** Levels for MVP: A1–A2, B1, B2. (C1/C2 added in a later expansion.)

**Mystery**
- **A1–A2** — *The Silent Tide* (working title): a quiet librarian solves a death in a 1950s English seaside town. Old-fashioned Christie energy.
- **B1** — a journalist in modern Istanbul follows a thread her late sister left behind in a missing-person case.
- **B2** — a locked-room mystery aboard a sleeper train crossing Siberia in winter; multiple narrators, unreliable memory.

**Grief**
- **A1–A2** — a widow in a coastal Portuguese village learns to bake again. Short, gentle, almost plotless — pure mood. The "fly through it and feel something" book.
- **B1** — a man returns to the lighthouse of his childhood summers after his brother dies. Quiet, atmospheric, lyrical.
- **B2** — a mother in 1970s Tokyo writes letters to a son who emigrated and stopped replying. Epistolary — a natural home for stretch passages.

**Ambition**
- **A1–A2** — a young woman opens a flower shop in Vienna against her family's wishes. Light, arc-driven, satisfying.
- **B1** — a street musician in Buenos Aires chases a chance to play the Teatro Colón. Music, poverty, persistence.
- **B2** — a chess prodigy in 1990s Reykjavík plays on through her father's collapse. Cold, sharp, propulsive.

**Per-novel shape:** ~6–10 chapters; ~1,500–3,000 English words per chapter, scaled to level (A-levels shorter, B-levels longer).

### 4.3 The taste line (replaces "culturally Saudi")

Content is **worldly and always tasteful** — NOT Saudi-themed, NOT Western-themed. Settings span any country and any era; protagonists are male or female, any age, from anywhere. People find pleasure in exploring different realities — that worldliness is the product.

**The editorial line (a serious literary publisher's implicit standard — which happens to be perfectly halal-readable):**
- No explicit sexual content.
- No lurid / gratuitous violence.
- No alcohol-glorifying scenes.
- No political partisanship (any side, any region).
- No mockery of any religion or culture.
- **Romance allowed but restrained** — emotional depth, never explicitness.
- **Violence allowed but not lurid.**
- Themes may be mature and serious; treatment is always tasteful.

A conservative Saudi adult should be able to open any book in the library and **never** hit a scene that makes them close the app — while never feeling the content was patronizingly "written for them."

### 4.4 Generation workflow (per chapter)
1. **English draft** at the calibrated baseline + ~15% stretch (Section 3.1.3), in the assigned theme/setting, within the taste line.
2. **Arabic translation** — natural, fluent MSA, meaning-preserving (not literal).
3. **Sentence-pair alignment** — each English sentence mapped to its Arabic counterpart (this is what powers Reveal mode).
4. **Cover + synopsis** (see 6.3).
5. **Seed to DB** (`library_*` tables).
6. **Audio + word-timestamps** — generated later in the audio milestone (M5), not per-chapter at draft time.

**Mandatory human polish:** Claude Code **drafts**; a fluent EN/AR human (Ali, Hagar/Hajar, or a freelance editor) does **one polish pass** before a book is marked publishable — checking that stretches land in the right places, dialogue stays clean, rhythm feels like a novel not a textbook, and the taste line holds. **Never ship raw.** This is the difference between "AI slop" and "feels real." (Books carry a `status` field — `draft` / `review` / `published` — and only `published` books appear to students.)

### 4.5 Gender-aware Arabic
All Arabic **UI strings** (buttons, banners, lock messages, notifications, badges) must be **gender-aware per student**, following the LMS's existing gendered-Arabic pattern. (Novel prose itself is fixed text and not gendered to the reader — only the interface chrome adapts.)

---

## 5. DATA MODEL (proposed `library_*` schema)

> Final column types/constraints are Claude Code's call **after** an `information_schema` probe of existing patterns (how `profiles`, `xp_transactions`, level fields, and the existing vocab/SRS tables are shaped). The shape below is the intended structure, not literal DDL.

- **`library_books`** — `id`, `title_en`, `title_ar`, `synopsis_en`, `synopsis_ar`, `theme` (mystery|grief|ambition), `cefr_level` (A1…C2), `cover_data` (typographic cover config / asset ref), `author_label` (display byline), `total_chapters`, `status` (draft|review|published), `sort_order`, `created_at`, `deleted_at`.
- **`library_chapters`** — `id`, `book_id` (FK), `chapter_number`, `title_en`, `title_ar`, `word_count`, `audio_url` (nullable until M5), `audio_timestamps` (jsonb, word-level, nullable until M5), `created_at`, `deleted_at`.
- **`library_paragraphs`** — `id`, `chapter_id` (FK), `paragraph_index`, ordering metadata. (Paragraph grouping for rendering & Assist-mode stacking.)
- **`library_sentence_pairs`** — `id`, `paragraph_id` (FK), `sentence_index`, `text_en`, `text_ar`, optional `is_dialogue` flag (so the renderer/audio can treat dialogue distinctly). **This table powers Reveal mode.**
- **`library_reading_progress`** — `id`, `profile_id` (FK), `book_id`, `chapter_id`, `last_sentence_index`, `mode` (reveal|assist), `completed_at` (nullable), `updated_at`. (Resume position + completion tracking. Completion only set from **reveal** mode.)
- **`library_saved_vocab`** — `id`, `profile_id`, `book_id`, `chapter_id`, `word`, `sentence_context`, `meaning_ar`, plus FSRS scheduling fields **mirrored from the existing vocab/SRS table** (due date, stability, difficulty, reps, etc.), `created_at`.
- **`library_book_completions`** / trophies — track finished books and milestone unlocks per `profile_id` (or fold into a `library_achievements` table). XP itself always flows through `xp_transactions`.

**RLS on every table:** students can read only `published` books and their own progress/vocab rows; chapter access is gated by the level rules in 3.2 (current+below = all chapters; +1 = chapter 1 only; +2 = none). Admins read/write all. Verify each policy with `pg_policies` and test as an authenticated student JWT.

---

## 6. TECHNICAL ARCHITECTURE

### 6.1 Edge functions (deployed via Supabase MCP)
1. **`library_get_books`** — returns the student's books with computed lock state (unlocked / tease / locked / coming-soon) based on their level. Only `published` books.
2. **`library_get_chapter`** — returns a chapter's content **only if the student is allowed** that chapter (enforces the +1 = chapter-1-only and +2 = none rules server-side; never trust the client).
3. **`library_record_completion`** — marks a chapter/book complete (reveal mode only), awards XP via `xp_transactions`, updates streak, checks for newly earned trophies/unlocks. Returns what was earned so the UI can celebrate.
4. **`library_save_vocab`** — saves a tapped word to the student's deck.
5. **`library_get_vocab` / review-update** — fetch the deck + record SRS review outcomes.

All verify JWT; all use `profile?.id` semantics (impersonation-safe). No runtime AI.

### 6.2 Audio (Milestone 5)
- **ElevenLabs**, `growing_business` tier (~1.8M chars/month, currently ~unused — ample headroom for the full library).
- Voice cast already established: **Alice** (`Xb7hH8MSUJpSbSDYk0k2`) primary female, Matilda secondary female; **George** (`JBFqnCBsd6RMkjVDRZzb`) primary male, Daniel secondary female/male backup. Pick a consistent narrator per book (a single warm narrator per novel reads best for long-form fiction; dialogue can stay single-narrator for MVP).
- **All audio re-encoded `-ac 1` (mono) with `libmp3lame`** — this is the fix for the iOS-Safari multi-channel playback failures that plagued the listening section. Every Library audio file ships mono. Decode-test every file (ffprobe length + actual decode) before marking a chapter audio-ready — never trust the header duration.
- **Word-level timestamps** extracted and stored in `library_chapters.audio_timestamps` (jsonb) to drive word-highlight sync.
- Files in **Supabase Storage**; chapter access gates audio access too (Chapter-1 audio is part of the tease).

### 6.3 Covers (NO external image API required)
Position the library as literary → covers should feel like **Penguin Classics minimalist / typographic** design, NOT cartoonish ESL art. Generate **typographic SVG/CSS covers** using the design system (title in Playfair Display, theme-colored field, subtle texture, level tag). This is **on-brand, zero-cost, and dependency-free** — no fal.ai / external generator needed. If Ali later wants AI-illustrated covers, the cover field is structured so an image URL can be swapped in without schema change.

### 6.4 Gender-aware Arabic chrome
Reuse the LMS's existing gendered-Arabic mechanism for all interface strings (Section 4.5).

---

## 7. DESIGN SYSTEM (Velvet Midnight — follow exactly)

- **Page bg** `#060e1c`. **Card surface** `rgba(255,255,255,0.03)` + border `rgba(255,255,255,0.06)`. **Elevated/modals** `rgba(255,255,255,0.06)` + backdrop-blur + soft shadow.
- **Accent (sparingly):** primary `#38bdf8` (sky-blue) for active states/primary CTAs only; **gold `#fbbf24`** for achievements/premium/unlock moments only.
- **Type:** Arabic → **Tajawal** (UI), **Cairo** where used; English headings → **Playfair Display**; for the *reading surface itself*, a comfortable serif (e.g. **Cormorant Garamond**) for long-form English body is encouraged to reinforce the "real novel" feel — confirm against the design tokens (`var(--ds-*)`). Page title 28–32px/700–800; section 20–22px/600; body 15–16px/400, line-height 1.7 (looser for the reading view); caption 12–13px `#64748b`.
- **Spacing:** card padding 24–32px; section gaps 48–64px; radius 12–16px (cards), 10–12px (buttons); touch targets ≥44px.
- **Interactions:** hover = `translateY(-2px)` + brighter border (NOT scale); transitions ease-out 150–200ms; loading = **skeleton shimmer**, never spinners.
- **RTL Arabic-first** throughout (`text-right`, `mr-` for visual-left margins). **Mobile-first**, 320px min, bottom-tab nav on mobile, test on iOS Safari.
- The **reading view** is the one place to break "minimal" — it should feel calm, generous, book-like: wide margins, large comfortable line-height, a paper-quiet dark surface, no clutter.

---

## 8. COMMERCIAL / TIER GATING

Library access scales with package — making library size a **tangible upgrade lever**, not just "more classes":
- **L1 (Group, 1,200 SAR):** ~5 novels available.
- **L2 (تميّز, 2,200 SAR):** ~15 novels.
- **L3 (الفردي, 3,000) + IELTS (5,000):** **full library** + any exclusive titles.

> Probe how package/tier is stored before wiring this. Tier gating is layered **on top of** level gating (a student must both be high enough level AND on a package that includes the book). For MVP with 9 novels this can be simple; the schema should not preclude per-tier availability later.

Happy side effect: premium students reach higher CEFR fastest → unlock the largest libraries → upgrading feels materially valuable.

---

## 9. THE 11-PROMPT EXECUTION PLAN

Build order respects dependencies: **schema → edge functions → first content → library UI → reader → content scale-up → audio → engagement.** Each prompt = one downloadable `.md`, one autonomous Claude Code run, one (or few) atomic commit(s), one deploy. No "wait for confirmation" gates inside prompts — Ali sees the live result on Vercel.

### Milestone 1 — Foundation (backend; nothing visible yet)
- **P1 — Schema + RLS + indexes.** Commit this spec to `docs/FLUENTIA-LIBRARY-SPEC.md`. Create all `library_*` tables (Section 5) via `apply_migration`, with RLS policies enforcing level+tease+locked rules, indexes, and progress/completion triggers. `information_schema` probe first; zero touch on existing tables.
- **P2 — Edge functions.** The five functions in 6.1, deployed via MCP, JWT-verified, server-side enforcement of chapter gating.
- **P3 — Content: novel #1.** Full content for the A1–A2 Mystery (*The Silent Tide*): 8 chapters EN+AR, sentence-pair JSON, typographic cover, synopsis, seeded to DB as `status='published'`. Proves the pipeline before scaling.

### Milestone 2 — Library visible
- **P4 — Library browse + book detail + lock screens.** Sidebar entry (المكتبة). Three sections (My Library / Read Chapter 1 / Coming Soon) with correct states. Book cards, detail page, chapter list, Start/Continue CTA, tease lock banner with concrete progress, blurred Coming-Soon covers. Velvet Midnight, fully responsive, gender-aware Arabic.

### Milestone 3 — Reading works (this is the MVP)
- **P5 — Reader, Reveal mode.** Sentence-pair rendering; tap-sentence → Arabic reveal; chapter nav; resume position; chapter completion → `library_record_completion`; progress bar. The heart of the product.
- **P6 — Reader, Assist mode + toggle.** Mode toggle in header; desktop side-by-side, mobile vertical-stacked; per-book mode persistence; visible "doesn't count for XP" badge; defaults (A1/A2 → Assist, B1+ → Reveal).

### Milestone 4 — Library populated
- **P7 — Content: remaining 8 novels.** Bulk generation following the proven P3 workflow — Mystery × Grief × Ambition across A1–A2/B1/B2, each EN+AR+sentence-pairs+cover+synopsis, seeded. (Each flagged for the human polish pass before going `published`.)

### Milestone 5 — Audio
- **P8 — Audio generation pipeline.** ElevenLabs narration for all chapters, mono `-ac 1` libmp3lame, decode-tested, word-level timestamps, uploaded to Storage, `library_chapters` updated. Quality gates baked in.
- **P9 — Reader audio player + word-highlight sync.** Player in the reader; real-time word highlighting synced to timestamps; speed control (0.75×–1.5×); play/pause/scrub; pre-fetch next chapter; audio gated by chapter access.

### Milestone 6 — Engagement (closes the loop)
- **P10 — Vocab tap + SRS deck.** Tap-to-save in Reveal mode; saved-word subtle highlight on re-read; Library vocab review screen; reuse existing FSRS engine; `library_saved_vocab`.
- **P11 — Streaks + trophies + unlock celebrations.** Reading streak (reveal only); trophies (1/5/10 books, level libraries, streak milestones); full XP integration verified end-to-end; "now unlocked" animation + notification when a level-up opens a tease book; library streak display.

### Cadence
~4–7 working days end to end if run straight; faster if batched. Each commit independently revertable; each milestone independently shippable. Rollback at any point = hide the sidebar link.

---

## 10. WHAT NOT TO TOUCH

- ❌ Any `curriculum_*` table (read-only; sacred).
- ❌ The existing curriculum, units, lessons, reading section, or their progress logic.
- ❌ The existing vocabulary tables/data (the Library uses its own `library_saved_vocab`; it only *reuses the SRS algorithm*, it does not write to curriculum vocab).
- ❌ The `xp_transactions` mechanism's contract (only ever INSERT, never alter how XP is computed elsewhere).
- ❌ Auth/profile/impersonation logic.
- ❌ Any file deletion (rename to `.deprecated`/`.legacy` if something must go).
- ❌ Local `vite build`.

---

## 11. ONE-LINE INVOCATION PATTERN (for every prompt)

Each prompt file ends with the run/commit/push convention. Each begins by pointing Claude Code at this spec:

```
Read /Users/dr.ali/Projects/fluentia-lms/docs/FLUENTIA-LIBRARY-SPEC.md in full for complete context, then execute the task below.
```

(For P1, the spec is committed into the repo as the first step, then referenced by P2–P11.)

---

### END OF MASTER SPECIFICATION
*This file is the source of truth. If anything in a build prompt conflicts with this file, this file wins — unless Ali says otherwise.*
