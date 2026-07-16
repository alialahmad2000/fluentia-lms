/**
 * Deterministic IELTS Academic Writing Task-1 chart renderer.
 *
 * Pure function: chart_data JSON → clean, authentic IELTS-style SVG STRING.
 * No React, no browser globals, no network — importable from both the React
 * app (as an inline figure) and a Node script (to write .svg files to storage).
 *
 * Accuracy is the whole point: every value comes straight from chart_data, so
 * bar heights, line points, pie angles, and table cells are always exact —
 * unlike an AI-rendered image. Style mimics the black-on-white computer-delivered
 * IELTS test: sans-serif, thin gridlines, restrained palette.
 *
 * Supported chart_data.type: bar_chart, line_graph, pie_chart, table, process,
 * map, mixed. Unknown types fall back to a titled note.
 */

const INK = '#1b2129'
const INK2 = '#55606e'
const INK3 = '#8592a0'
const GRID = '#e3e7ec'
const AXIS = '#aab2bd'
const PAPER = '#ffffff'
// Colour-blind-safe categorical palette (max 8) — calm, print-like.
const SERIES = ['#2a6f97', '#c1666b', '#4c956c', '#e9a53f', '#6d597a', '#457b9d', '#b5651d', '#7a8b99']
const FONT = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// ── tiny helpers ─────────────────────────────────────────────────────────────
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const num = (n) => {
  const v = Number(n)
  if (!isFinite(v)) return String(n)
  if (Math.abs(v) >= 1000) return v.toLocaleString('en-US')
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)
}
function niceCeil(max) {
  if (max <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  const steps = [1, 2, 2.5, 5, 10]
  for (const s of steps) { if (pow * s >= max) return pow * s }
  return pow * 10
}
function axisTicks(max, count = 5) {
  const top = niceCeil(max)
  const step = top / count
  return { top, ticks: Array.from({ length: count + 1 }, (_, i) => Math.round((step * i) * 1000) / 1000) }
}
function svgWrap(w, h, title, bodySvg) {
  const titleBlock = title
    ? `<text x="${w / 2}" y="30" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="700" fill="${INK}">${esc(title)}</text>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONT}">`
    + `<rect x="0" y="0" width="${w}" height="${h}" fill="${PAPER}"/>`
    + titleBlock + bodySvg + `</svg>`
}
function legend(items, x, y, w) {
  // items: [{label,color}] — wraps into rows within width w
  let cx = x, cy = y, out = ''
  const rowH = 20
  for (const it of items) {
    const label = esc(it.label)
    const est = 16 + label.length * 7 + 18
    if (cx + est > x + w && cx > x) { cx = x; cy += rowH }
    out += `<rect x="${cx}" y="${cy - 9}" width="12" height="12" rx="2" fill="${it.color}"/>`
      + `<text x="${cx + 17}" y="${cy}" font-size="12.5" fill="${INK2}">${label}</text>`
    cx += est
  }
  return { svg: out, height: cy - y + rowH }
}

// ── BAR (grouped) ─────────────────────────────────────────────────────────────
function renderBar(cd, title) {
  const groups = Object.keys(cd.data || {})
  const cats = cd.categories || []
  const W = 860, H = 540
  const m = { t: title ? 58 : 30, r: 30, b: 96, l: 68 }
  const plotW = W - m.l - m.r, plotH = H - m.t - m.b
  let max = 0
  groups.forEach((g) => (cd.data[g] || []).forEach((v) => { max = Math.max(max, Number(v) || 0) }))
  const { top, ticks } = axisTicks(max)
  const y = (v) => m.t + plotH - (v / top) * plotH
  let body = ''
  // gridlines + y ticks
  ticks.forEach((t) => {
    const yy = y(t)
    body += `<line x1="${m.l}" y1="${yy}" x2="${m.l + plotW}" y2="${yy}" stroke="${GRID}" stroke-width="1"/>`
      + `<text x="${m.l - 10}" y="${yy + 4}" text-anchor="end" font-size="12" fill="${INK3}">${num(t)}</text>`
  })
  // axes
  body += `<line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + plotH}" stroke="${AXIS}" stroke-width="1.5"/>`
    + `<line x1="${m.l}" y1="${m.t + plotH}" x2="${m.l + plotW}" y2="${m.t + plotH}" stroke="${AXIS}" stroke-width="1.5"/>`
  // grouped bars
  const gW = plotW / groups.length
  const nSeries = cats.length || 1
  const barW = Math.min(46, (gW * 0.72) / nSeries)
  groups.forEach((g, gi) => {
    const gx = m.l + gi * gW + gW / 2
    const vals = cd.data[g] || []
    const totalW = nSeries * barW
    vals.forEach((v, si) => {
      const val = Number(v) || 0
      const bx = gx - totalW / 2 + si * barW
      const by = y(val), bh = m.t + plotH - by
      body += `<rect x="${bx}" y="${by}" width="${barW - 3}" height="${Math.max(0, bh)}" fill="${SERIES[si % SERIES.length]}" rx="1.5"/>`
      if (val > 0) body += `<text x="${bx + (barW - 3) / 2}" y="${by - 5}" text-anchor="middle" font-size="10.5" fill="${INK2}">${num(val)}</text>`
    })
    // group label (wrap long)
    body += wrapLabel(esc(g), gx, m.t + plotH + 18, gW - 6, 12, INK2)
  })
  // axis titles
  if (cd.y_axis) body += `<text transform="rotate(-90 18 ${m.t + plotH / 2})" x="18" y="${m.t + plotH / 2}" text-anchor="middle" font-size="12.5" fill="${INK2}">${esc(cd.y_axis)}</text>`
  if (cd.x_axis) body += `<text x="${m.l + plotW / 2}" y="${H - 30}" text-anchor="middle" font-size="12.5" fill="${INK2}">${esc(cd.x_axis)}</text>`
  // legend
  const leg = legend(cats.map((c, i) => ({ label: c, color: SERIES[i % SERIES.length] })), m.l, H - 12, plotW)
  body += leg.svg
  return svgWrap(W, H, title, body)
}

// ── LINE ──────────────────────────────────────────────────────────────────────
function renderLine(cd, title) {
  const xKeys = Object.keys(cd.data || {})       // e.g. years
  const series = cd.categories || []             // e.g. regions
  const W = 860, H = 540
  const m = { t: title ? 58 : 30, r: 30, b: 84, l: 70 }
  const plotW = W - m.l - m.r, plotH = H - m.t - m.b
  let max = 0
  xKeys.forEach((k) => (cd.data[k] || []).forEach((v) => { max = Math.max(max, Number(v) || 0) }))
  const { top, ticks } = axisTicks(max)
  const y = (v) => m.t + plotH - (v / top) * plotH
  const x = (i) => m.l + (xKeys.length === 1 ? plotW / 2 : (i / (xKeys.length - 1)) * plotW)
  let body = ''
  ticks.forEach((t) => {
    const yy = y(t)
    body += `<line x1="${m.l}" y1="${yy}" x2="${m.l + plotW}" y2="${yy}" stroke="${GRID}" stroke-width="1"/>`
      + `<text x="${m.l - 10}" y="${yy + 4}" text-anchor="end" font-size="12" fill="${INK3}">${num(t)}</text>`
  })
  body += `<line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + plotH}" stroke="${AXIS}" stroke-width="1.5"/>`
    + `<line x1="${m.l}" y1="${m.t + plotH}" x2="${m.l + plotW}" y2="${m.t + plotH}" stroke="${AXIS}" stroke-width="1.5"/>`
  // x labels
  xKeys.forEach((k, i) => {
    body += `<line x1="${x(i)}" y1="${m.t + plotH}" x2="${x(i)}" y2="${m.t + plotH + 5}" stroke="${AXIS}"/>`
      + `<text x="${x(i)}" y="${m.t + plotH + 20}" text-anchor="middle" font-size="12" fill="${INK2}">${esc(k)}</text>`
  })
  // one line per series
  series.forEach((s, si) => {
    const color = SERIES[si % SERIES.length]
    const pts = xKeys.map((k, i) => [x(i), y(Number((cd.data[k] || [])[si]) || 0)])
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
    body += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`
    pts.forEach((p) => { body += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${PAPER}" stroke="${color}" stroke-width="2"/>` })
  })
  if (cd.y_axis) body += `<text transform="rotate(-90 18 ${m.t + plotH / 2})" x="18" y="${m.t + plotH / 2}" text-anchor="middle" font-size="12.5" fill="${INK2}">${esc(cd.y_axis)}</text>`
  if (cd.x_axis) body += `<text x="${m.l + plotW / 2}" y="${H - 26}" text-anchor="middle" font-size="12.5" fill="${INK2}">${esc(cd.x_axis)}</text>`
  const leg = legend(series.map((c, i) => ({ label: c, color: SERIES[i % SERIES.length] })), m.l, H - 10, plotW)
  body += leg.svg
  return svgWrap(W, H, title, body)
}

// ── PIE (one or several) ───────────────────────────────────────────────────────
function renderPie(cd, title) {
  const labels = cd.labels || []
  const pies = Object.keys(cd.data || {})       // e.g. ["2010","2023"]
  const per = pies.length
  const W = Math.max(560, per * 380), H = 540
  const m = { t: title ? 70 : 40 }
  const r = 130
  let body = ''
  pies.forEach((pk, pi) => {
    const cx = (W / per) * pi + (W / per) / 2
    const cy = m.t + r + 12
    const vals = (cd.data[pk] || []).map((v) => Number(v) || 0)
    const total = vals.reduce((a, b) => a + b, 0) || 1
    let ang = -Math.PI / 2
    vals.forEach((v, i) => {
      const frac = v / total
      const a2 = ang + frac * Math.PI * 2
      const large = frac > 0.5 ? 1 : 0
      const x1 = cx + r * Math.cos(ang), y1 = cy + r * Math.sin(ang)
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
      const color = SERIES[i % SERIES.length]
      if (frac > 0.999) {
        body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`
      } else if (frac > 0.0001) {
        body += `<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${color}" stroke="${PAPER}" stroke-width="1.5"/>`
      }
      // % label
      if (frac > 0.04) {
        const mid = ang + frac * Math.PI
        const lr = r * 0.62
        body += `<text x="${(cx + lr * Math.cos(mid)).toFixed(1)}" y="${(cy + lr * Math.sin(mid) + 4).toFixed(1)}" text-anchor="middle" font-size="12.5" font-weight="600" fill="#fff">${num(Math.round(frac * 1000) / 10)}%</text>`
      }
      ang = a2
    })
    body += `<text x="${cx}" y="${cy + r + 30}" text-anchor="middle" font-size="14" font-weight="700" fill="${INK}">${esc(pk)}</text>`
  })
  const leg = legend(labels.map((c, i) => ({ label: c, color: SERIES[i % SERIES.length] })), 40, H - 20, W - 80)
  body += leg.svg
  return svgWrap(W, H, title, body)
}

// ── TABLE ───────────────────────────────────────────────────────────────────────
function renderTable(cd, title) {
  const cols = cd.columns || []
  const rows = cd.rows || []
  const W = Math.max(640, cols.length * 150)
  const rowH = 44, headH = 50
  const m = { t: title ? 62 : 24 }
  const H = m.t + headH + rows.length * rowH + 30
  const colW = (W - 40) / cols.length
  let body = ''
  // header
  body += `<rect x="20" y="${m.t}" width="${W - 40}" height="${headH}" fill="#eef2f6"/>`
  cols.forEach((c, i) => {
    body += wrapLabel(esc(c), 20 + i * colW + colW / 2, m.t + headH / 2 + 2, colW - 12, 12.5, INK, 700)
  })
  // rows
  rows.forEach((row, ri) => {
    const ry = m.t + headH + ri * rowH
    if (ri % 2 === 1) body += `<rect x="20" y="${ry}" width="${W - 40}" height="${rowH}" fill="#f8fafb"/>`
    row.forEach((cell, ci) => {
      const anchor = ci === 0 ? 'start' : 'middle'
      const tx = ci === 0 ? 30 : 20 + ci * colW + colW / 2
      body += `<text x="${tx}" y="${ry + rowH / 2 + 4}" text-anchor="${anchor}" font-size="13" fill="${ci === 0 ? INK : INK2}" font-weight="${ci === 0 ? 600 : 400}">${esc(typeof cell === 'number' ? num(cell) : cell)}</text>`
    })
  })
  // grid lines
  for (let i = 0; i <= cols.length; i++) body += `<line x1="${20 + i * colW}" y1="${m.t}" x2="${20 + i * colW}" y2="${m.t + headH + rows.length * rowH}" stroke="${GRID}"/>`
  for (let i = 0; i <= rows.length + 1; i++) body += `<line x1="20" y1="${m.t + i === 0 ? m.t : m.t + (i === 0 ? 0 : headH + (i - 1) * rowH)}" x2="${W - 20}" y2="${m.t + (i === 0 ? 0 : headH + (i - 1) * rowH)}" stroke="${GRID}"/>`
  body += `<rect x="20" y="${m.t}" width="${W - 40}" height="${headH + rows.length * rowH}" fill="none" stroke="${AXIS}" stroke-width="1.2"/>`
  return svgWrap(W, H, title, body)
}

// ── PROCESS (flow of stages) ───────────────────────────────────────────────────
function renderProcess(cd, title) {
  const steps = cd.steps || []
  const perRow = steps.length <= 4 ? steps.length : Math.ceil(steps.length / 2)
  const rows = Math.ceil(steps.length / perRow)
  const W = 900
  const boxW = (W - 40 - (perRow - 1) * 46) / perRow
  const boxH = 118, gapX = 46, gapY = 60
  const m = { t: title ? 62 : 30 }
  const H = m.t + rows * boxH + (rows - 1) * gapY + 40
  let body = ''
  const pos = steps.map((_, i) => {
    const r = Math.floor(i / perRow)
    let col = i % perRow
    // serpentine: reverse direction on odd rows so arrows flow naturally
    if (r % 2 === 1) col = perRow - 1 - col
    return { x: 20 + col * (boxW + gapX), y: m.t + r * (boxH + gapY), r, col }
  })
  // arrows between consecutive steps
  for (let i = 0; i < steps.length - 1; i++) {
    const a = pos[i], b = pos[i + 1]
    if (a.r === b.r) {
      const dir = b.x > a.x ? 1 : -1
      const x1 = dir > 0 ? a.x + boxW : a.x
      const x2 = dir > 0 ? b.x : b.x + boxW
      const yy = a.y + boxH / 2
      body += arrow(x1, yy, x2, yy)
    } else {
      // drop to next row on the same side
      const side = a.col === perRow - 1 || a.col === 0
      const x1 = a.x + boxW / 2
      body += arrow(x1, a.y + boxH, x1, b.y)
    }
  }
  steps.forEach((s, i) => {
    const p = pos[i]
    const color = SERIES[i % SERIES.length]
    body += `<rect x="${p.x}" y="${p.y}" width="${boxW}" height="${boxH}" rx="10" fill="#f6f8fa" stroke="${color}" stroke-width="1.6"/>`
      + `<circle cx="${p.x + 20}" cy="${p.y + 20}" r="12" fill="${color}"/>`
      + `<text x="${p.x + 20}" y="${p.y + 24}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${s.step || i + 1}</text>`
      + `<text x="${p.x + 40}" y="${p.y + 25}" font-size="13.5" font-weight="700" fill="${INK}">${esc(s.label || '')}</text>`
      + wrapText(esc(s.description || ''), p.x + 14, p.y + 48, boxW - 26, 11.5, INK2, 4)
  })
  return svgWrap(W, H, title, body)
}
function arrow(x1, y1, x2, y2) {
  const ang = Math.atan2(y2 - y1, x2 - x1)
  const hx = x2 - 9 * Math.cos(ang), hy = y2 - 9 * Math.sin(ang)
  const a1 = ang + Math.PI * 0.85, a2 = ang - Math.PI * 0.85
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK2}" stroke-width="1.8"/>`
    + `<polygon points="${x2},${y2} ${(hx + 6 * Math.cos(a1)).toFixed(1)},${(hy + 6 * Math.sin(a1)).toFixed(1)} ${(hx + 6 * Math.cos(a2)).toFixed(1)},${(hy + 6 * Math.sin(a2)).toFixed(1)}" fill="${INK2}"/>`
}

// ── MAP (before / after, schematic 3×3 compass grid) ────────────────────────────
function renderMap(cd, title) {
  const panels = [['before', cd.before], ['after', cd.after]].filter(([, v]) => v)
  const W = 900, panelW = 420, panelH = 380, gap = 40
  const m = { t: title ? 60 : 28 }
  const H = m.t + panelH + 70
  let body = ''
  const cell = (loc) => {
    const s = String(loc || '').toLowerCase()
    let col = 1, row = 1
    if (s.includes('west')) col = 0; if (s.includes('east')) col = 2
    if (s.includes('north')) row = 0; if (s.includes('south')) row = 2
    if (s.includes('centre') || s.includes('center')) { if (!/(north|south)/.test(s)) row = 1; if (!/(east|west)/.test(s)) col = 1 }
    return { col, row }
  }
  panels.forEach(([key, panel], pi) => {
    const px = 20 + pi * (panelW + gap)
    const py = m.t
    body += `<rect x="${px}" y="${py}" width="${panelW}" height="${panelH}" rx="8" fill="#f7f9fb" stroke="${AXIS}" stroke-width="1.4"/>`
      + `<text x="${px + panelW / 2}" y="${py - 10}" text-anchor="middle" font-size="14" font-weight="700" fill="${INK}">${esc(key === 'before' ? 'Before' : 'After')}${panel.year ? ` (${esc(panel.year)})` : ''}</text>`
      + `<text x="${px + panelW / 2}" y="${py + 16}" text-anchor="middle" font-size="10" fill="${INK3}">N</text>`
    const gx = px + 14, gy = py + 26, gw = panelW - 28, gh = panelH - 42
    const cw = gw / 3, ch = gh / 3
    for (let i = 1; i < 3; i++) {
      body += `<line x1="${gx + i * cw}" y1="${gy}" x2="${gx + i * cw}" y2="${gy + gh}" stroke="${GRID}" stroke-dasharray="4 4"/>`
        + `<line x1="${gx}" y1="${gy + i * ch}" x2="${gx + gw}" y2="${gy + i * ch}" stroke="${GRID}" stroke-dasharray="4 4"/>`
    }
    // stack multiple features in same cell
    const occ = {}
    ;(panel.features || []).forEach((f, fi) => {
      const { col, row } = cell(f.location)
      const k = `${col},${row}`
      const n = occ[k] = (occ[k] || 0)
      occ[k]++
      const color = SERIES[fi % SERIES.length]
      const bx = gx + col * cw + 6, by = gy + row * ch + 6 + n * 22
      body += `<rect x="${bx}" y="${by}" width="${cw - 12}" height="18" rx="4" fill="${color}22" stroke="${color}" stroke-width="1"/>`
        + wrapLabel(esc(f.name || ''), bx + (cw - 12) / 2, by + 12, cw - 16, 9.5, INK, 600)
    })
  })
  return svgWrap(W, H, title, body)
}

// ── MIXED (bar + line, dual axis) ───────────────────────────────────────────────
function renderMixed(cd, title) {
  const d = cd.data || {}
  const cats = d.months || d.categories || []
  const barKey = Object.keys(cd.chart_types || {}).find((k) => cd.chart_types[k] === 'bar') || 'rainfall'
  const lineKey = Object.keys(cd.chart_types || {}).find((k) => cd.chart_types[k] === 'line') || 'temperature'
  const barVals = (d[barKey] || []).map(Number)
  const lineVals = (d[lineKey] || []).map(Number)
  const W = 880, H = 540
  const m = { t: title ? 58 : 30, r: 66, b: 78, l: 66 }
  const plotW = W - m.l - m.r, plotH = H - m.t - m.b
  const bTop = axisTicks(Math.max(...barVals, 1)).top
  const lTop = axisTicks(Math.max(...lineVals, 1)).top
  const yb = (v) => m.t + plotH - (v / bTop) * plotH
  const yl = (v) => m.t + plotH - (v / lTop) * plotH
  const x = (i) => m.l + (i + 0.5) * (plotW / cats.length)
  let body = ''
  const ticks = axisTicks(Math.max(...barVals, 1)).ticks
  ticks.forEach((t) => {
    const yy = yb(t)
    body += `<line x1="${m.l}" y1="${yy}" x2="${m.l + plotW}" y2="${yy}" stroke="${GRID}"/>`
      + `<text x="${m.l - 8}" y="${yy + 4}" text-anchor="end" font-size="11.5" fill="${SERIES[0]}">${num(t)}</text>`
  })
  // right axis ticks
  axisTicks(Math.max(...lineVals, 1)).ticks.forEach((t) => {
    body += `<text x="${m.l + plotW + 8}" y="${yl(t) + 4}" text-anchor="start" font-size="11.5" fill="${SERIES[1]}">${num(t)}</text>`
  })
  body += `<line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + plotH}" stroke="${AXIS}"/>`
    + `<line x1="${m.l + plotW}" y1="${m.t}" x2="${m.l + plotW}" y2="${m.t + plotH}" stroke="${AXIS}"/>`
    + `<line x1="${m.l}" y1="${m.t + plotH}" x2="${m.l + plotW}" y2="${m.t + plotH}" stroke="${AXIS}"/>`
  // bars
  const bw = Math.min(34, (plotW / cats.length) * 0.6)
  barVals.forEach((v, i) => { const by = yb(v); body += `<rect x="${x(i) - bw / 2}" y="${by}" width="${bw}" height="${m.t + plotH - by}" fill="${SERIES[0]}" opacity="0.85" rx="1.5"/>` })
  // line
  const dPath = lineVals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${yl(v).toFixed(1)}`).join(' ')
  body += `<path d="${dPath}" fill="none" stroke="${SERIES[1]}" stroke-width="2.6" stroke-linejoin="round"/>`
  lineVals.forEach((v, i) => { body += `<circle cx="${x(i).toFixed(1)}" cy="${yl(v).toFixed(1)}" r="3.4" fill="${PAPER}" stroke="${SERIES[1]}" stroke-width="2"/>` })
  // x labels
  cats.forEach((c, i) => { body += `<text x="${x(i)}" y="${m.t + plotH + 18}" text-anchor="middle" font-size="11" fill="${INK2}">${esc(c)}</text>` })
  if (cd.y_axis_left) body += `<text transform="rotate(-90 16 ${m.t + plotH / 2})" x="16" y="${m.t + plotH / 2}" text-anchor="middle" font-size="12" fill="${SERIES[0]}">${esc(cd.y_axis_left)}</text>`
  if (cd.y_axis_right) body += `<text transform="rotate(90 ${W - 14} ${m.t + plotH / 2})" x="${W - 14}" y="${m.t + plotH / 2}" text-anchor="middle" font-size="12" fill="${SERIES[1]}">${esc(cd.y_axis_right)}</text>`
  const leg = legend([{ label: barKey, color: SERIES[0] }, { label: lineKey, color: SERIES[1] }], m.l, H - 14, plotW)
  body += leg.svg
  return svgWrap(W, H, title, body)
}

// ── text wrapping helpers ───────────────────────────────────────────────────────
function wrapLabel(text, cx, cy, maxW, size = 12, color = INK, weight = 400) {
  const perChar = size * 0.56
  const maxChars = Math.max(4, Math.floor(maxW / perChar))
  const words = String(text).split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  const startY = cy - ((lines.length - 1) * (size + 2)) / 2
  return lines.map((ln, i) => `<text x="${cx}" y="${startY + i * (size + 2)}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${color}">${ln}</text>`).join('')
}
function wrapText(text, x, y, maxW, size = 12, color = INK2, maxLines = 3) {
  const perChar = size * 0.54
  const maxChars = Math.max(6, Math.floor(maxW / perChar))
  const words = String(text).split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w } else cur = (cur + ' ' + w).trim()
    if (lines.length >= maxLines) break
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  if (lines.length === maxLines) { let last = lines[maxLines - 1]; if (last.length > maxChars - 1) lines[maxLines - 1] = last.slice(0, maxChars - 1) + '…' }
  return lines.map((ln, i) => `<text x="${x}" y="${y + i * (size + 3)}" font-size="${size}" fill="${color}">${ln}</text>`).join('')
}

/**
 * Main entry. Returns an SVG string (or '' if the data can't be rendered).
 * @param {object} chartData - the ielts_writing_tasks.chart_data JSON
 * @param {object} [opts]    - { title }
 */
export function renderTask1ChartSVG(chartData, opts = {}) {
  if (!chartData || typeof chartData !== 'object') return ''
  const title = opts.title || ''
  try {
    switch (chartData.type) {
      case 'bar_chart': return renderBar(chartData, title)
      case 'line_graph': return renderLine(chartData, title)
      case 'pie_chart': return renderPie(chartData, title)
      case 'table': return renderTable(chartData, title)
      case 'process': return renderProcess(chartData, title)
      case 'map': return renderMap(chartData, title)
      case 'mixed': return renderMixed(chartData, title)
      default: return svgWrap(680, 200, title, `<text x="340" y="110" text-anchor="middle" font-size="13" fill="${INK3}">Chart data described in the prompt.</text>`)
    }
  } catch (e) {
    return svgWrap(680, 160, title, `<text x="340" y="90" text-anchor="middle" font-size="12" fill="${INK3}">${esc('Refer to the data described in the prompt.')}</text>`)
  }
}

/** Convenience: SVG string → data URI usable directly in <img src>. */
export function svgToDataUri(svg) {
  if (!svg) return ''
  // encodeURIComponent keeps it robust for RTL pages + all chars.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
