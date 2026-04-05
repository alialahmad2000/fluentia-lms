/**
 * Generates a premium achievement card image using Canvas 2D API.
 * No DOM, no CSS, no html-to-image — 100% reliable.
 */

const WIDTH = 800
const PADDING = 40
const CONTENT_WIDTH = WIDTH - PADDING * 2

export async function generateAchievementImage({
  type,
  studentName,
  levelName,
  unitName,
  studentText,
  feedback,
  scores,
  leaderboard,
  currentStudentId,
}) {
  await loadFont()

  const height = calculateTotalHeight({ type, studentText, feedback, scores, leaderboard })

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH * 2
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')
  ctx.scale(2, 2)

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, WIDTH * 0.3, height)
  bgGrad.addColorStop(0, '#060e1c')
  bgGrad.addColorStop(0.4, '#0a1930')
  bgGrad.addColorStop(1, '#0d1f3c')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, WIDTH, height)

  let y = PADDING

  y = drawHeader(ctx, y)
  y = drawStudentInfo(ctx, y, { studentName, levelName, unitName, type })

  if (studentText) {
    y = drawTextSection(ctx, y, {
      label: type === 'writing' ? '📝 ما كتبته:' : '🎙️ ما قلته:',
      text: studentText,
      bgColor: 'rgba(56, 189, 248, 0.06)',
      borderColor: 'rgba(56, 189, 248, 0.15)',
      labelColor: '#38bdf8',
    })
  }

  const correctedText = feedback?.corrected_text || feedback?.corrected_transcript
  if (correctedText) {
    y = drawTextSection(ctx, y, {
      label: '✅ النص المصحح:',
      text: correctedText,
      bgColor: 'rgba(34, 197, 94, 0.06)',
      borderColor: 'rgba(34, 197, 94, 0.15)',
      labelColor: '#22c55e',
    })
  }

  if (scores && Object.keys(scores).length > 0) {
    y = drawScores(ctx, y, scores)
  }

  const errors = feedback?.errors || feedback?.grammar_errors || []
  if (errors.length > 0) {
    y = drawErrors(ctx, y, errors.slice(0, 6))
  }

  const vocabUpgrades = type === 'writing' ? (feedback?.vocabulary_upgrades || []) : []
  const betterExpressions = type !== 'writing' ? (feedback?.better_expressions || []) : []
  const upgrades = vocabUpgrades.length > 0 ? vocabUpgrades : betterExpressions
  if (upgrades.length > 0) {
    y = drawUpgrades(ctx, y, upgrades.slice(0, 5), type)
  }

  const models = feedback?.model_sentences || (feedback?.model_answer ? [feedback.model_answer] : [])
  if (models.length > 0) {
    y = drawModelSentences(ctx, y, models.slice(0, 4))
  }

  const fluencyTips = type !== 'writing' ? (feedback?.fluency_tips || []) : []
  if (fluencyTips.length > 0) {
    y = drawFluencyTips(ctx, y, fluencyTips.slice(0, 4))
  }

  const strengths = typeof feedback?.strengths === 'string'
    ? [feedback.strengths]
    : (feedback?.strengths_ar || (Array.isArray(feedback?.strengths) ? feedback.strengths : []))
  if (strengths.length > 0) {
    y = drawStrengths(ctx, y, strengths.slice(0, 4))
  }

  if (feedback?.improvement_tip) {
    y = drawImprovementTip(ctx, y, feedback.improvement_tip)
  }

  if (leaderboard?.rankings?.length > 1) {
    y = drawLeaderboard(ctx, y, leaderboard, currentStudentId)
  }

  y = drawFooter(ctx, y, type, scores)

  return canvas.toDataURL('image/png', 0.95)
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

async function loadFont() {
  if (document.fonts.check('16px Tajawal')) return
  try {
    const weights = [
      ['400', 'Iura6YBj_oCad4k1nzGBCw'],
      ['700', 'Iura6YBj_oCad4k1nzSBDg'],
      ['800', 'Iura6YBj_oCad4k1nzqBDQ'],
    ]
    const fonts = weights.map(([w, hash]) =>
      new FontFace('Tajawal', `url('https://fonts.gstatic.com/s/tajawal/v9/${hash}.woff2')`, { weight: w })
    )
    const loaded = await Promise.all(fonts.map(f => f.load()))
    loaded.forEach(f => document.fonts.add(f))
  } catch (e) {
    console.warn('Font load failed, using system font:', e)
  }
}

function wrapText(ctx, text, maxWidth, font) {
  ctx.font = font
  const words = text.split(/\s+/)
  const lines = []
  let cur = ''
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur)
      cur = word
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawDivider(ctx, y, label) {
  const font = "600 13px 'Tajawal', sans-serif"
  ctx.font = font
  const lw = ctx.measureText(label).width
  const lineW = (CONTENT_WIDTH - lw - 24) / 2

  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PADDING, y + 8)
  ctx.lineTo(PADDING + lineW, y + 8)
  ctx.stroke()

  ctx.fillStyle = '#64748b'
  ctx.textAlign = 'center'
  ctx.fillText(label, PADDING + CONTENT_WIDTH / 2, y + 12)

  ctx.beginPath()
  ctx.moveTo(PADDING + CONTENT_WIDTH - lineW, y + 8)
  ctx.lineTo(PADDING + CONTENT_WIDTH, y + 8)
  ctx.stroke()

  ctx.textAlign = 'left'
  return y + 30
}

// ═══════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════

function drawHeader(ctx, y) {
  const grad = ctx.createLinearGradient(PADDING, y, WIDTH - PADDING, y)
  grad.addColorStop(0, '#38bdf8')
  grad.addColorStop(1, '#818cf8')

  roundRect(ctx, PADDING, y, CONTENT_WIDTH, 60, 12)
  ctx.fillStyle = grad
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = "800 22px 'Tajawal', sans-serif"
  ctx.textAlign = 'center'
  ctx.fillText('أكاديمية طلاقة 🎓', WIDTH / 2, y + 30)

  ctx.font = "400 13px 'Tajawal', sans-serif"
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText('Fluentia Academy', WIDTH / 2, y + 48)

  ctx.textAlign = 'left'
  return y + 80
}

function drawStudentInfo(ctx, y, { studentName, levelName, unitName, type }) {
  ctx.font = "700 20px 'Tajawal', sans-serif"
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'right'
  ctx.fillText(`👤 ${studentName || 'طالب/ة'}`, PADDING + CONTENT_WIDTH, y)

  ctx.font = "400 14px 'Tajawal', sans-serif"
  ctx.fillStyle = '#94a3b8'
  if (levelName) ctx.fillText(`📚 ${levelName}${unitName ? ` — ${unitName}` : ''}`, PADDING + CONTENT_WIDTH, y + 24)
  ctx.fillText(type === 'writing' ? '✍️ نشاط الكتابة' : '🎤 نشاط المحادثة', PADDING + CONTENT_WIDTH, y + 46)

  ctx.textAlign = 'left'
  return y + 66
}

function drawTextSection(ctx, y, { label, text, bgColor, borderColor, labelColor }) {
  const font = "400 14px 'Tajawal', sans-serif"
  const lines = wrapText(ctx, text, CONTENT_WIDTH - 40, font)
  const boxH = 40 + lines.length * 22

  roundRect(ctx, PADDING, y, CONTENT_WIDTH, boxH, 12)
  ctx.fillStyle = bgColor
  ctx.fill()
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.font = "700 13px 'Tajawal', sans-serif"
  ctx.fillStyle = labelColor
  ctx.textAlign = 'right'
  ctx.fillText(label, PADDING + CONTENT_WIDTH - 20, y + 24)

  ctx.font = font
  ctx.fillStyle = '#cbd5e1'
  ctx.textAlign = 'left'
  lines.forEach((line, i) => {
    ctx.fillText(line, PADDING + 20, y + 44 + i * 22)
  })

  ctx.textAlign = 'left'
  return y + boxH + 16
}

function drawScores(ctx, y, scores) {
  y = drawDivider(ctx, y, 'التقييم')

  const labels = { grammar: 'القواعد', vocabulary: 'المفردات', fluency: 'الطلاقة', pronunciation: 'النطق', structure: 'الهيكل' }
  const barW = CONTENT_WIDTH - 140

  Object.entries(scores).forEach(([key, value]) => {
    if (value == null) return
    const color = value >= 8 ? '#22c55e' : value >= 6 ? '#fbbf24' : '#ef4444'

    ctx.font = "400 13px 'Tajawal', sans-serif"
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'right'
    ctx.fillText(labels[key] || key, PADDING + 70, y + 10)

    roundRect(ctx, PADDING + 80, y + 2, barW, 10, 5)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fill()

    const fw = (value / 10) * barW
    if (fw > 0) {
      roundRect(ctx, PADDING + 80, y + 2, fw, 10, 5)
      ctx.fillStyle = color
      ctx.fill()
    }

    ctx.font = "700 14px 'Tajawal', sans-serif"
    ctx.fillStyle = color
    ctx.textAlign = 'left'
    ctx.fillText(`${value}/10`, PADDING + 85 + barW, y + 12)

    y += 28
  })

  ctx.textAlign = 'left'
  return y + 8
}

function drawErrors(ctx, y, errors) {
  y = drawDivider(ctx, y, 'الأخطاء وتصحيحاتها')

  errors.forEach(err => {
    const orig = err.original || err.spoken || err.error || ''
    const fix = err.correction || err.corrected || ''
    const text = `❌ ${orig} → ✅ ${fix}`
    const font = "400 14px 'Tajawal', sans-serif"
    const lines = wrapText(ctx, text, CONTENT_WIDTH - 40, font)
    const rule = err.explanation_ar || err.rule || err.rule_ar || ''
    const ruleLines = rule ? wrapText(ctx, `📖 ${rule}`, CONTENT_WIDTH - 40, "400 12px 'Tajawal', sans-serif") : []
    const boxH = 20 + lines.length * 20 + ruleLines.length * 18

    roundRect(ctx, PADDING, y, CONTENT_WIDTH, boxH, 8)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.05)'
    ctx.fill()

    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'
    ctx.fillRect(PADDING + CONTENT_WIDTH - 3, y, 3, boxH)

    ctx.font = font
    ctx.fillStyle = '#e2e8f0'
    ctx.textAlign = 'left'
    lines.forEach((line, i) => {
      ctx.fillText(line, PADDING + 12, y + 18 + i * 20)
    })

    if (ruleLines.length) {
      ctx.font = "400 12px 'Tajawal', sans-serif"
      ctx.fillStyle = '#64748b'
      ruleLines.forEach((line, i) => {
        ctx.fillText(line, PADDING + 12, y + 18 + lines.length * 20 + i * 18)
      })
    }

    y += boxH + 8
  })

  return y + 4
}

function drawUpgrades(ctx, y, upgrades, type) {
  y = drawDivider(ctx, y, type === 'writing' ? 'ترقيات المفردات' : 'تعبيرات أفضل')

  upgrades.forEach(item => {
    const orig = item.basic || item.original || ''
    const better = item.advanced || item.natural || item.better || (item.suggestions || []).join(' أو ') || ''
    const text = `💡 "${orig}" → "${better}"`
    const font = "400 14px 'Tajawal', sans-serif"
    const lines = wrapText(ctx, text, CONTENT_WIDTH - 40, font)
    const boxH = 12 + lines.length * 20

    roundRect(ctx, PADDING, y, CONTENT_WIDTH, boxH, 8)
    ctx.fillStyle = 'rgba(251, 191, 36, 0.05)'
    ctx.fill()
    ctx.fillStyle = 'rgba(251, 191, 36, 0.3)'
    ctx.fillRect(PADDING + CONTENT_WIDTH - 3, y, 3, boxH)

    ctx.font = font
    ctx.fillStyle = '#e2e8f0'
    ctx.textAlign = 'left'
    lines.forEach((line, i) => {
      ctx.fillText(line, PADDING + 12, y + 16 + i * 20)
    })

    y += boxH + 6
  })

  return y + 4
}

function drawModelSentences(ctx, y, models) {
  y = drawDivider(ctx, y, 'جمل نموذجية')

  models.forEach(s => {
    const text = `⭐ ${s}`
    const font = "400 14px 'Tajawal', sans-serif"
    const lines = wrapText(ctx, text, CONTENT_WIDTH - 40, font)
    const boxH = 12 + lines.length * 20

    roundRect(ctx, PADDING, y, CONTENT_WIDTH, boxH, 8)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.05)'
    ctx.fill()
    ctx.fillStyle = 'rgba(56, 189, 248, 0.3)'
    ctx.fillRect(PADDING + CONTENT_WIDTH - 3, y, 3, boxH)

    ctx.font = font
    ctx.fillStyle = '#cbd5e1'
    ctx.textAlign = 'left'
    lines.forEach((line, i) => {
      ctx.fillText(line, PADDING + 12, y + 16 + i * 20)
    })

    y += boxH + 6
  })

  return y + 4
}

function drawFluencyTips(ctx, y, tips) {
  y = drawDivider(ctx, y, 'نصائح للطلاقة')

  ctx.font = "400 13px 'Tajawal', sans-serif"
  ctx.textAlign = 'right'
  tips.forEach(tip => {
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(`💡 ${tip}`, PADDING + CONTENT_WIDTH, y + 4)
    y += 22
  })

  ctx.textAlign = 'left'
  return y + 8
}

function drawStrengths(ctx, y, strengths) {
  y = drawDivider(ctx, y, 'نقاط القوة')

  ctx.font = "400 14px 'Tajawal', sans-serif"
  ctx.textAlign = 'right'
  strengths.forEach(s => {
    ctx.fillStyle = '#a3e635'
    ctx.fillText(`💪 ${s}`, PADDING + CONTENT_WIDTH, y + 4)
    y += 24
  })

  ctx.textAlign = 'left'
  return y + 4
}

function drawImprovementTip(ctx, y, tip) {
  y = drawDivider(ctx, y, 'نصيحة للتحسين')

  const font = "400 14px 'Tajawal', sans-serif"
  const lines = wrapText(ctx, `🎯 ${tip}`, CONTENT_WIDTH, font)
  ctx.font = font
  ctx.fillStyle = '#fbbf24'
  ctx.textAlign = 'right'
  lines.forEach((line, i) => {
    ctx.fillText(line, PADDING + CONTENT_WIDTH, y + 4 + i * 22)
  })

  ctx.textAlign = 'left'
  return y + lines.length * 22 + 12
}

function drawLeaderboard(ctx, y, leaderboard, currentStudentId) {
  y = drawDivider(ctx, y, 'ترتيب الأداء')

  const medals = ['🥇', '🥈', '🥉']

  leaderboard.rankings.forEach(r => {
    const isMe = r.studentId === currentStudentId
    const rowH = 32

    if (isMe) {
      roundRect(ctx, PADDING, y, CONTENT_WIDTH, rowH, 8)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    ctx.font = "400 16px 'Tajawal', sans-serif"
    ctx.fillStyle = '#e2e8f0'
    ctx.textAlign = 'right'
    ctx.fillText(medals[r.rank - 1] || `${r.rank}`, PADDING + CONTENT_WIDTH - 8, y + 22)

    ctx.font = isMe ? "700 14px 'Tajawal', sans-serif" : "400 14px 'Tajawal', sans-serif"
    ctx.fillStyle = isMe ? '#38bdf8' : '#94a3b8'
    ctx.fillText(isMe ? `${r.name} (أنت)` : r.name, PADDING + CONTENT_WIDTH - 45, y + 22)

    const sc = r.avgScore >= 8 ? '#22c55e' : r.avgScore >= 6 ? '#fbbf24' : '#ef4444'
    ctx.font = "700 14px 'Tajawal', sans-serif"
    ctx.fillStyle = sc
    ctx.textAlign = 'left'
    ctx.fillText(`${r.avgScore}/10`, PADDING + 12, y + 22)

    y += rowH + 4
  })

  ctx.textAlign = 'left'
  return y + 8
}

function drawFooter(ctx, y, type, scores) {
  y += 8

  roundRect(ctx, PADDING, y, CONTENT_WIDTH, 70, 12)
  const grad = ctx.createLinearGradient(PADDING, y, PADDING + CONTENT_WIDTH, y)
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.06)')
  grad.addColorStop(1, 'rgba(129, 140, 248, 0.06)')
  ctx.fillStyle = grad
  ctx.fill()
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Motivational message
  const avgScore = scores ? Object.values(scores).reduce((a, b) => a + (b || 0), 0) / Object.values(scores).length : 0
  let msg = '🌱 كل رحلة تبدأ بخطوة! واصل/ي التعلم!'
  if (avgScore >= 9) msg = '🌟 أداء استثنائي! أنت نجم/ة أكاديمية طلاقة!'
  else if (avgScore >= 7) msg = '🔥 عمل رائع! استمر/ي وراح توصل/ين للقمة!'
  else if (avgScore >= 5) msg = '💪 بداية قوية! كل محاولة تقربك من الطلاقة!'

  ctx.font = "700 15px 'Tajawal', sans-serif"
  ctx.fillStyle = '#e2e8f0'
  ctx.textAlign = 'center'
  ctx.fillText(msg, WIDTH / 2, y + 30)

  ctx.font = "400 12px 'Tajawal', sans-serif"
  ctx.fillStyle = '#475569'
  ctx.fillText('fluentia.academy  •  @FluentiaSA', WIDTH / 2, y + 52)

  ctx.textAlign = 'left'
  return y + 90
}

function calculateTotalHeight({ type, studentText, feedback, scores, leaderboard }) {
  let h = 100 // header + padding
  h += 70 // student info

  if (studentText) h += 60 + Math.ceil(studentText.length / 70) * 22
  const ct = feedback?.corrected_text || feedback?.corrected_transcript
  if (ct) h += 60 + Math.ceil(ct.length / 70) * 22
  if (scores) h += 40 + Object.keys(scores).length * 28

  const errors = feedback?.errors || feedback?.grammar_errors || []
  if (errors.length) h += 40 + Math.min(errors.length, 6) * 70

  const upgrades = (type === 'writing' ? feedback?.vocabulary_upgrades : feedback?.better_expressions) || []
  if (upgrades.length) h += 40 + Math.min(upgrades.length, 5) * 40

  const models = feedback?.model_sentences || (feedback?.model_answer ? [feedback.model_answer] : [])
  if (models.length) h += 40 + Math.min(models.length, 4) * 40

  const fluencyTips = type !== 'writing' ? (feedback?.fluency_tips || []) : []
  if (fluencyTips.length) h += 40 + Math.min(fluencyTips.length, 4) * 22

  const strengths = typeof feedback?.strengths === 'string' ? [feedback.strengths] : (feedback?.strengths_ar || (Array.isArray(feedback?.strengths) ? feedback.strengths : []))
  if (strengths.length) h += 40 + Math.min(strengths.length, 4) * 24
  if (feedback?.improvement_tip) h += 60
  if (leaderboard?.rankings?.length > 1) h += 40 + leaderboard.rankings.length * 36
  h += 100 // footer
  h += 40 // bottom padding

  return h
}
