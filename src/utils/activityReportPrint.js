// Builds a clean, branded, RTL printable report (parent-facing) and opens it in a
// new window for "Save as PDF" / print. Self-contained HTML so it doesn't fight the
// dark app shell. Used by the "تصدير PDF" button on the student activity report.

const SKILL_LABELS = {
  reading: 'القراءة', writing: 'الكتابة', speaking: 'المحادثة',
  listening: 'الاستماع', grammar: 'القواعد', vocabulary: 'المفردات',
  pronunciation: 'النطق', vocabulary_exercise: 'تمارين المفردات',
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function fmtMins(m) {
  m = Math.round(m || 0)
  if (m < 60) return `${m} دقيقة`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h} ساعة و${r} دقيقة` : `${h} ساعة`
}

function fmtDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return String(d) }
}

export function buildReportHTML(payload) {
  const { report, ai, period, rangeLabel } = payload
  const s = report.student || {}
  const t = report.totals || {}
  const sk = report.skills || {}
  const periodSkills = sk.period || {}

  const statRows = [
    ['وقت التعلّم النشِط', fmtMins(t.learning_minutes)],
    ['الأيام النشِطة', `${t.active_days || 0} يوم`],
    ['عدد الجلسات', `${t.session_count || 0}`],
    ['كلمات أُتقنت', `${t.words_mastered || 0} كلمة`],
    ['كلمات تمّت مراجعتها', `${(t.words_practiced || 0) + (t.words_reviewed || 0)}`],
    ['دروس/أقسام مكتملة', `${t.sections_completed || 0}`],
    ['متوسط الدرجات', t.avg_score != null ? `${t.avg_score}%` : '—'],
    ['نقاط الخبرة', `${t.xp_earned || 0} XP`],
    ['تسجيلات المحادثة', `${t.speaking_recordings || 0}`],
  ]

  const skillBars = Object.entries(periodSkills).map(([key, v]) => {
    const label = SKILL_LABELS[key] || key
    const score = v.avg_score
    const isStrong = key === sk.strongest
    const isWeak = key === sk.weakest
    const color = score == null ? '#94a3b8' : score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
    return `<tr>
      <td>${esc(label)} ${isStrong ? '⭐' : ''}${isWeak ? '⚠️' : ''}</td>
      <td>${v.completed} قسم</td>
      <td style="color:${color};font-weight:700">${score == null ? '—' : score + '%'}</td>
    </tr>`
  }).join('')

  const wordsList = (report.words_mastered_list || []).slice(0, 60).map(w =>
    `<span class="chip"><b>${esc(w.word)}</b> ${esc(w.definition_ar || '')}</span>`
  ).join('')

  const lessonsRows = (report.lessons || []).slice(0, 40).map(l =>
    `<tr><td>${esc(SKILL_LABELS[l.section_type] || l.section_type)}</td><td>${esc(l.unit || '')}</td><td>${l.score != null ? l.score + '%' : '—'}</td><td>${fmtDate(l.at)}</td></tr>`
  ).join('')

  const nextSteps = (ai?.next_steps || []).map(x => `<li>${esc(x)}</li>`).join('')

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>تقرير ${esc(s.name)} — ${esc(rangeLabel || '')}</title>
<style>
  @page { margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Tajawal','Segoe UI',Tahoma,sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #fff; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1a2d50; padding-bottom:16px; margin-bottom:20px; }
  .brand { font-size:20px; font-weight:800; color:#1a2d50; }
  .brand small { display:block; font-size:12px; color:#64748b; font-weight:500; }
  h1 { font-size:22px; margin:0 0 4px; color:#1a2d50; }
  .meta { color:#64748b; font-size:13px; }
  h2 { font-size:15px; color:#1a2d50; border-right:4px solid #38bdf8; padding-right:8px; margin:22px 0 10px; }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .stat { border:1px solid #e2e8f0; border-radius:10px; padding:12px; }
  .stat .l { font-size:11px; color:#64748b; }
  .stat .v { font-size:17px; font-weight:800; color:#0f172a; margin-top:2px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th,td { text-align:right; padding:7px 8px; border-bottom:1px solid #e2e8f0; }
  th { color:#64748b; font-weight:600; font-size:12px; }
  .narrative { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; line-height:2; font-size:14px; }
  .chip { display:inline-block; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; padding:3px 8px; margin:3px; font-size:12px; }
  .chip b { color:#1a2d50; }
  ul { line-height:1.9; }
  .foot { margin-top:28px; padding-top:12px; border-top:1px solid #e2e8f0; color:#94a3b8; font-size:11px; text-align:center; }
  @media print { body { padding:0; } .noprint { display:none; } }
</style></head><body>
  <div class="head">
    <div>
      <h1>تقرير نشاط الطالب${s.name ? ': ' + esc(s.name) : ''}</h1>
      <div class="meta">
        ${esc(rangeLabel || '')} &nbsp;·&nbsp; ${fmtDate(period?.start)} — ${fmtDate(period?.end)}
        ${s.level ? ' &nbsp;·&nbsp; المستوى ' + esc(s.level) : ''}${s.group ? ' &nbsp;·&nbsp; ' + esc(s.group) : ''}
      </div>
    </div>
    <div class="brand">أكاديمية طلاقة<small>Fluentia Academy</small></div>
  </div>

  ${ai?.narrative ? `<h2>ملخّص الفترة</h2><div class="narrative">${esc(ai.narrative)}</div>` : ''}
  ${nextSteps ? `<h2>الخطوات التالية المقترحة</h2><ul>${nextSteps}</ul>` : ''}

  <h2>نظرة عامة على النشاط</h2>
  <div class="grid">
    ${statRows.map(([l, v]) => `<div class="stat"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div></div>`).join('')}
  </div>

  ${skillBars ? `<h2>المهارات — نقاط القوة والضعف</h2><table><thead><tr><th>المهارة</th><th>الأقسام</th><th>المتوسط</th></tr></thead><tbody>${skillBars}</tbody></table>` : ''}

  ${wordsList ? `<h2>الكلمات التي أُتقنت (${(report.words_mastered_list || []).length})</h2><div>${wordsList}</div>` : ''}

  ${lessonsRows ? `<h2>الدروس المكتملة</h2><table><thead><tr><th>القسم</th><th>الوحدة</th><th>الدرجة</th><th>التاريخ</th></tr></thead><tbody>${lessonsRows}</tbody></table>` : ''}

  <div class="foot">تم إنشاء هذا التقرير تلقائياً من منصّة أكاديمية طلاقة · ${fmtDate(new Date().toISOString())}</div>
</body></html>`
}

export function openPrintableReport(payload) {
  const html = buildReportHTML(payload)
  const w = window.open('', '_blank', 'width=900,height=1000')
  if (!w) {
    alert('فضلاً اسمح بالنوافذ المنبثقة لتصدير التقرير.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  // give fonts/layout a moment, then print
  w.onload = () => setTimeout(() => { try { w.focus(); w.print() } catch { /* ignore */ } }, 350)
}
