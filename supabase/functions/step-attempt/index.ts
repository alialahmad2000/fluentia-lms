// STEP exam attempt orchestration.
//
// Why this exists at all: `step_item_keys` has no `authenticated` RLS policy, so
// the browser cannot read answers. Assembly and grading therefore both run here
// with the service role. The review screen renders from `section_details`, which
// this function writes — the client never queries the key table.
//
// actions:
//   start  -> assemble a paper to the active blueprint, create the attempt,
//             return items WITHOUT answer_index
//   submit -> grade against step_item_keys, persist scores + per-item rows
//
// Deployed with --no-verify-jwt; auth is checked here.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

/** Fisher-Yates. The bank inherits whatever answer-position habit the source
 *  compilers had; a paper that doesn't shuffle is gameable. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, service)

    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')
    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userRes?.user) return json({ error: 'unauthorized' }, 401)
    const caller = userRes.user.id

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { return json({ error: 'bad json' }, 400) }
    const action = String(body.action ?? '')

    // Impersonation: auth.uid() stays the ADMIN when staff view-as a student, so
    // an explicit as_student_id is honoured ONLY for staff. A student passing it
    // is ignored — they can never write to another student's attempt.
    const { data: prof } = await admin.from('profiles').select('role').eq('id', caller).maybeSingle()
    const isStaff = prof?.role === 'admin' || prof?.role === 'trainer'
    const studentId = (isStaff && body.as_student_id) ? String(body.as_student_id) : caller

    // Entitlement is enforced HERE, not only in STEPGuard — that guard is
    // client-side and cannot stop a direct call to this function. Staff are
    // exempt so they can preview and view-as.
    if (!isStaff) {
      const { data: st } = await admin.from('students')
        .select('uses_step_track,access_expires_at,status,deleted_at')
        .eq('id', studentId).maybeSingle()
      const expired = st?.access_expires_at && new Date(st.access_expires_at) < new Date()
      if (!st || st.deleted_at || st.uses_step_track !== true || st.status !== 'active' || expired) {
        return json({ error: 'forbidden' }, 403)
      }
    }

    if (action === 'start') {
      const { data: bp } = await admin.from('step_blueprint')
        .select('id,version,sections,total_questions').eq('is_active', true).maybeSingle()
      if (!bp) return json({ error: 'no active blueprint' }, 400)

      const content: Record<string, string[]> = {}
      const questions: unknown[] = []

      for (const sec of bp.sections as Array<Record<string, unknown>>) {
        const key = String(sec.key)
        const need = Number(sec.count)
        const { data: pool, error } = await admin.from('step_items')
          .select('id,section,stem,choices,grammar_point,passage_id,recording_id')
          .eq('section', key).eq('is_published', true).limit(1200)
        if (error) return json({ error: `pool ${key}: ${error.message}` }, 500)

        const picked = shuffled(pool ?? []).slice(0, need)
        if (picked.length < need) {
          return json({
            error: 'insufficient_items',
            section: key, available: picked.length, required: need,
          }, 409)
        }
        content[key] = picked.map((p) => p.id)
        for (const p of picked) {
          // Choices are sent in their STORED order and grading compares raw
          // indices — there is no per-attempt shuffle. Safe only because the
          // bank's key positions are near-uniform (505/505/529/503). If that
          // ever skews, shuffle here AND store the permutation on the attempt.
          questions.push({
            id: p.id, section: key, stem: p.stem, choices: p.choices,
            grammar_point: p.grammar_point,
            passage_id: p.passage_id, recording_id: p.recording_id,
          })
        }
      }

      const { data: attempt, error: aErr } = await admin.from('step_attempts')
        .insert({
          student_id: studentId,
          blueprint_id: bp.id,
          status: 'in_progress',
          kind: 'mock',
          answers: { blueprint_version: bp.version, content },
        }).select('id,started_at').single()
      if (aErr) return json({ error: aErr.message }, 500)

      // passages + recordings the paper needs
      const pIds = [...new Set(questions.map((q: any) => q.passage_id).filter(Boolean))]
      const rIds = [...new Set(questions.map((q: any) => q.recording_id).filter(Boolean))]
      const { data: passages } = pIds.length
        ? await admin.from('step_passages').select('id,title,body,passage_number').in('id', pIds)
        : { data: [] }
      const { data: recordings } = rIds.length
        ? await admin.from('step_recordings').select('id,clip_id,title,audio_url,audio_status').in('id', rIds)
        : { data: [] }

      return json({
        attempt_id: attempt.id,
        started_at: attempt.started_at,
        blueprint: { version: bp.version, total: bp.total_questions, sections: bp.sections },
        questions,
        passages: passages ?? [],
        recordings: recordings ?? [],
        // Stated plainly so the client can warn rather than silently score a
        // listening section the student could not actually hear.
        audio_available: (recordings ?? []).some((r: any) => r.audio_status === 'voiced'),
      })
    }

    // A focused drill on ONE grammar point. It writes the same `content` shape
    // as `start`, so the submit path below grades it with no special-casing.
    if (action === 'drill') {
      const point = String(body.point ?? '')
      if (!point) return json({ error: 'point required' }, 400)
      const want = Math.min(Math.max(Number(body.count ?? 10), 5), 25)

      const { data: bp } = await admin.from('step_blueprint')
        .select('id,version').eq('is_active', true).maybeSingle()

      const { data: pool, error } = await admin.from('step_items')
        .select('id,section,stem,choices,grammar_point,passage_id,recording_id')
        .eq('grammar_point', point).eq('is_published', true).limit(400)
      if (error) return json({ error: `pool: ${error.message}` }, 500)
      if (!pool?.length) return json({ error: 'no_items_for_point', point }, 409)

      const picked = shuffled(pool).slice(0, want)
      // Drill items are all structure-section by construction, but key off the
      // item's own section so a mis-tagged row cannot land under the wrong head.
      const content: Record<string, string[]> = {}
      for (const p of picked) (content[p.section] ??= []).push(p.id)

      const { data: attempt, error: aErr } = await admin.from('step_attempts')
        .insert({
          student_id: studentId,
          blueprint_id: bp?.id ?? null,
          status: 'in_progress',
          kind: 'drill',
          answers: { blueprint_version: bp?.version ?? null, content, drill_point: point },
        }).select('id,started_at').single()
      if (aErr) return json({ error: aErr.message }, 500)

      const { data: pt } = await admin.from('step_grammar_points')
        .select('key,title_ar,rule_ar').eq('key', point).maybeSingle()

      return json({
        attempt_id: attempt.id,
        started_at: attempt.started_at,
        is_drill: true,
        point: pt ?? { key: point },
        questions: picked.map((p) => ({
          id: p.id, section: p.section, stem: p.stem, choices: p.choices,
          grammar_point: p.grammar_point, passage_id: p.passage_id, recording_id: p.recording_id,
        })),
        passages: [],
        recordings: [],
        audio_available: false,
      })
    }

    // Review the student's OWN banked mistakes.
    //
    // This is the action that closes the loop. `drill` draws at random from the
    // whole pool for a grammar point, so a student practising there will almost
    // never meet the specific items they got wrong — with 105 items behind one
    // point, the odds of re-drawing a given miss are tiny. Without this action a
    // mistake can be recorded forever and never re-tested.
    if (action === 'review') {
      const want = Math.min(Math.max(Number(body.count ?? 10), 5), 30)

      let q = admin.from('step_error_bank')
        .select('item_id, grammar_point, times_seen, next_review_at')
        .eq('student_id', studentId)
        .eq('mastered', false)
        .not('item_id', 'is', null)
      if (body.point) q = q.eq('grammar_point', String(body.point))
      if (body.section) q = q.eq('section', String(body.section))

      // Due first, then the ones missed most often — a mistake made four times
      // is more urgent than one made once.
      const { data: bank, error: bErr } = await q
        .order('next_review_at', { ascending: true, nullsFirst: true })
        .order('times_seen', { ascending: false })
        .limit(want)
      if (bErr) return json({ error: bErr.message }, 500)
      if (!bank?.length) return json({ error: 'bank_empty', count: 0 }, 409)

      const ids = bank.map((b) => b.item_id)
      const { data: items } = await admin.from('step_items')
        .select('id,section,stem,choices,grammar_point,passage_id,recording_id')
        .in('id', ids).eq('is_published', true)
      if (!items?.length) return json({ error: 'bank_empty', count: 0 }, 409)

      const content: Record<string, string[]> = {}
      for (const it of items) (content[it.section] ??= []).push(it.id)

      const { data: bp } = await admin.from('step_blueprint')
        .select('id,version').eq('is_active', true).maybeSingle()
      const { data: attempt, error: aErr } = await admin.from('step_attempts')
        .insert({
          student_id: studentId,
          blueprint_id: bp?.id ?? null,
          status: 'in_progress',
          kind: 'review',
          answers: { blueprint_version: bp?.version ?? null, content, is_review: true },
        }).select('id,started_at').single()
      if (aErr) return json({ error: aErr.message }, 500)

      // A review can include reading items, which are meaningless without their
      // passage, and listening items without their clip.
      const pIds = [...new Set(items.map((i) => i.passage_id).filter(Boolean))]
      const rIds = [...new Set(items.map((i) => i.recording_id).filter(Boolean))]
      const { data: passages } = pIds.length
        ? await admin.from('step_passages').select('id,title,body,passage_number').in('id', pIds)
        : { data: [] }
      const { data: recordings } = rIds.length
        ? await admin.from('step_recordings').select('id,clip_id,title,audio_url,audio_status').in('id', rIds)
        : { data: [] }

      const seenBy = new Map(bank.map((b) => [b.item_id, b.times_seen]))
      return json({
        attempt_id: attempt.id,
        started_at: attempt.started_at,
        is_review: true,
        questions: items.map((p) => ({
          id: p.id, section: p.section, stem: p.stem, choices: p.choices,
          grammar_point: p.grammar_point, passage_id: p.passage_id, recording_id: p.recording_id,
          times_missed: seenBy.get(p.id) ?? 1,
        })),
        passages: passages ?? [],
        recordings: recordings ?? [],
        audio_available: (recordings ?? []).some((r: any) => r.audio_status === 'voiced'),
      })
    }

    if (action === 'submit') {
      const attemptId = String(body.attempt_id ?? '')
      const answers = (body.answers ?? {}) as Record<string, number>
      if (!attemptId) return json({ error: 'attempt_id required' }, 400)

      const { data: attempt } = await admin.from('step_attempts')
        .select('id,student_id,status,answers,blueprint_id,kind').eq('id', attemptId).maybeSingle()
      if (!attempt) return json({ error: 'attempt not found' }, 404)
      if (attempt.student_id !== studentId && !isStaff) return json({ error: 'forbidden' }, 403)
      if (attempt.status === 'completed') {
        return json({ idempotent: true, attempt_id: attemptId })
      }

      const content = (attempt.answers?.content ?? {}) as Record<string, string[]>
      const allIds = Object.values(content).flat()
      // Only ever grade PUBLISHED items. The student-writable `answers.content`
      // was an answer-key oracle until the RLS narrowing; this keeps the blast
      // radius small even if some other write path opens up again.
      const { data: items } = await admin.from('step_items')
        .select('id,section,stem,choices,grammar_point')
        .in('id', allIds).eq('is_published', true)
      const gradableIds = (items ?? []).map((i) => i.id)
      const { data: keys } = gradableIds.length
        ? await admin.from('step_item_keys')
          .select('item_id,answer_index,explanation_ar').in('item_id', gradableIds)
        : { data: [] }

      const keyBy = new Map((keys ?? []).map((k) => [k.item_id, k]))
      const itemBy = new Map((items ?? []).map((i) => [i.id, i]))

      const details: Record<string, unknown[]> = {}
      const perSection: Record<string, { correct: number; total: number }> = {}
      const itemRows: unknown[] = []

      for (const [section, ids] of Object.entries(content)) {
        details[section] = []
        perSection[section] = { correct: 0, total: ids.length }
        for (const id of ids) {
          const k = keyBy.get(id)
          const it = itemBy.get(id)
          const given = Object.prototype.hasOwnProperty.call(answers, id) ? Number(answers[id]) : null
          const isCorrect = k != null && given != null && given === k.answer_index
          if (isCorrect) perSection[section].correct++
          ;(details[section] as unknown[]).push({
            item_id: id,
            stem: it?.stem ?? null,
            choices: it?.choices ?? null,
            grammar_point: it?.grammar_point ?? null,
            given, expected: k?.answer_index ?? null,
            is_correct: isCorrect,
            explanation: k?.explanation_ar ?? null,
          })
          itemRows.push({
            attempt_id: attemptId, student_id: attempt.student_id, item_id: id,
            given_index: given, is_correct: isCorrect,
          })
        }
      }

      const correctTotal = Object.values(perSection).reduce((n, s) => n + s.correct, 0)
      const grandTotal = Object.values(perSection).reduce((n, s) => n + s.total, 0)
      const scoreTotal = grandTotal ? Math.round((correctTotal / grandTotal) * 100) : 0
      const pct = (s?: { correct: number; total: number }) =>
        s && s.total ? Math.round((s.correct / s.total) * 100) : null

      const { data: result } = await admin.from('step_student_results').insert({
        student_id: attempt.student_id,
        attempt_id: attemptId,
        // NOT hardcoded 'mock': a drill stored as a mock makes a 10-question
        // practice score sit in the history beside a real 100-question paper.
        result_type: attempt.kind ?? 'mock',
        listening_score: pct(perSection.listening),
        reading_score: pct(perSection.reading),
        structure_score: pct(perSection.structure),
        total_score: scoreTotal,
        section_details: details,
        completed_at: new Date().toISOString(),
      }).select('id').single()

      if (itemRows.length) await admin.from('step_item_attempts').insert(itemRows)

      // ── error bank ──────────────────────────────────────────────────────
      // This is what turns a score into a study plan. Without it a student can
      // sit ten papers and still not know which rule keeps costing them marks.
      //
      // A WRONG answer enters or re-surfaces the bank; a RIGHT answer on an item
      // already in the bank counts toward mastering it out. Two clean answers
      // retire it — one could be a lucky guess on a 4-choice question.
      const wrong: unknown[] = []
      const rightIds: string[] = []
      for (const [section, ids] of Object.entries(content)) {
        for (const id of ids) {
          const k = keyBy.get(id)
          const it = itemBy.get(id)
          const given = Object.prototype.hasOwnProperty.call(answers, id) ? Number(answers[id]) : null
          const ok = k != null && given != null && given === k.answer_index
          if (ok) { rightIds.push(id); continue }
          const ch = (it?.choices ?? []) as string[]
          wrong.push({
            student_id: attempt.student_id,
            item_id: id,
            section,
            grammar_point: it?.grammar_point ?? null,
            question_text: it?.stem ?? null,
            // null (not "—") when unanswered: the review screen distinguishes
            // "picked the wrong option" from "ran out of time".
            student_answer: given != null ? (ch[given] ?? null) : null,
            correct_answer: k?.answer_index != null ? (ch[k.answer_index] ?? null) : null,
            explanation: k?.explanation_ar ?? null,
            times_seen: 1,
            mastered: false,
            next_review_at: new Date(Date.now() + 864e5).toISOString(),
          })
        }
      }

      if (wrong.length) {
        // onConflict keeps ONE row per (student,item). times_seen is bumped
        // afterwards so a re-miss reads as a pattern, not a fresh mistake.
        await admin.from('step_error_bank')
          .upsert(wrong, { onConflict: 'student_id,item_id', ignoreDuplicates: false })
        await admin.rpc('step_bump_error_seen', {
          p_student: attempt.student_id,
          p_items: wrong.map((w: any) => w.item_id),
        }).then(() => {}, () => {})   // best-effort: never fail a submit over stats
      }

      if (rightIds.length) {
        await admin.rpc('step_credit_error_correct', {
          p_student: attempt.student_id,
          p_items: rightIds,
        }).then(() => {}, () => {})
      }

      // ── per-(section, grammar point) aggregates ─────────────────────────
      const agg = new Map<string, { section: string; point: string | null; n: number; ok: number }>()
      for (const [section, ids] of Object.entries(content)) {
        for (const id of ids) {
          const k = keyBy.get(id)
          const it = itemBy.get(id)
          const given = Object.prototype.hasOwnProperty.call(answers, id) ? Number(answers[id]) : null
          const ok = k != null && given != null && given === k.answer_index
          const point = (it?.grammar_point ?? null) as string | null
          const key = `${section}|${point ?? ''}`
          const cur = agg.get(key) ?? { section, point, n: 0, ok: 0 }
          cur.n++; if (ok) cur.ok++
          agg.set(key, cur)
        }
      }
      if (agg.size) {
        await admin.rpc('step_accumulate_progress', {
          p_student: attempt.student_id,
          p_rows: [...agg.values()].map((a) => ({
            section: a.section, grammar_point: a.point, n: a.n, ok: a.ok,
          })),
        }).then(() => {}, () => {})
      }

      await admin.from('step_attempts').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        correct_total: correctTotal,
        score_total: scoreTotal,
        score_listening: pct(perSection.listening),
        score_reading: pct(perSection.reading),
        score_structure: pct(perSection.structure),
      }).eq('id', attemptId)

      return json({
        attempt_id: attemptId,
        result_id: result?.id ?? null,
        score_total: scoreTotal,
        correct_total: correctTotal,
        total_questions: grandTotal,
        sections: perSection,
        section_details: details,
      })
    }

    return json({ error: `unknown action: ${action}` }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
