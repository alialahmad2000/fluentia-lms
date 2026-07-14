// Malak Al-Kendi — bespoke premium unit covers for «الإنجليزية لقائدة التسويق».
// "Studio" identity: warm copper/amber/bronze on obsidian (matches her theme_key='studio'),
// one marketing glyph + warm accent per unit. HTML/CSS → Playwright PNG (NO FAL needed),
// uploaded to curriculum-images/units, wired to curriculum_units.cover_image_url.
// Same Obsidian-Atelier system as Sara/Mosab, retuned warm for her. Idempotent.
// Run: node scripts/generate-malak-covers.mjs [--force]
import { chromium } from 'playwright'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Presentation, Megaphone, BarChart3, Handshake, PenTool, LayoutGrid, Scale, Mail, ShoppingCart, Lightbulb } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const MALAK = '28a83f30-9474-4869-8f08-f63dc40c767d'
const W = 1536, H = 864
const FORCE = process.argv.includes('--force')
const PREVIEW = process.argv.includes('--preview')
const icon = (C) => renderToStaticMarkup(createElement(C, { size: 300, strokeWidth: 1.15, color: 'currentColor' }))

// warm "Studio" palette — cohesive copper/amber/bronze family, distinct per unit
const UNITS = {
  1:  { code: 'STRATEGY',   accent: '#cf7d43', glyph: icon(Presentation) },
  2:  { code: 'CAMPAIGN',   accent: '#e8a33c', glyph: icon(Megaphone) },
  3:  { code: 'RESULTS',    accent: '#f5b942', glyph: icon(BarChart3) },
  4:  { code: 'INFLUENCE',  accent: '#e07a5f', glyph: icon(Handshake) },
  5:  { code: 'CRITIQUE',   accent: '#d98a4e', glyph: icon(PenTool) },
  6:  { code: 'STAND-UP',   accent: '#b08d57', glyph: icon(LayoutGrid) },
  7:  { code: 'OBJECTIONS', accent: '#e6b566', glyph: icon(Scale) },
  8:  { code: 'EMAIL',      accent: '#c98a3c', glyph: icon(Mail) },
  9:  { code: 'LAUNCH',     accent: '#e8833a', glyph: icon(ShoppingCart) },
  10: { code: 'PITCH',      accent: '#ffcf5c', glyph: icon(Lightbulb) },
}

const html = (c) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  @font-face{font-family:'PF';src:local('Playfair Display')}
  *{margin:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  .stage{position:relative;width:${W}px;height:${H}px;background:
    radial-gradient(130% 120% at 82% 8%, ${c.accent}26, transparent 46%),
    radial-gradient(90% 90% at 12% 96%, ${c.accent}14, transparent 55%),
    linear-gradient(155deg, #0c0a08 0%, #070604 60%, #050403 100%);
    font-family:'Inter','Helvetica Neue',sans-serif;color:#faf5e6;overflow:hidden}
  .grid{position:absolute;inset:0;opacity:.5;
    background-image:radial-gradient(rgba(255,235,205,.05) 1px, transparent 1.4px);
    background-size:34px 34px;mask-image:linear-gradient(120deg, transparent 8%, #000 55%)}
  .arc{position:absolute;width:1180px;height:1180px;border-radius:50%;
    border:1.5px solid ${c.accent}33;left:58%;top:-38%;
    box-shadow:0 0 120px -30px ${c.accent}55, inset 0 0 90px -40px ${c.accent}44}
  .arc2{position:absolute;width:760px;height:760px;border-radius:50%;
    border:1px solid ${c.accent}22;left:64%;top:-14%}
  .glyph{position:absolute;right:130px;top:46%;transform:translateY(-50%);
    color:${c.accent};filter:drop-shadow(0 24px 60px ${c.accent}55) drop-shadow(0 0 26px ${c.accent}66);opacity:.96}
  .glyph svg{width:380px;height:380px}
  .frame{position:absolute;inset:34px;border:1px solid rgba(214,166,96,.30);border-radius:22px;
    box-shadow:inset 0 1px 0 rgba(255,235,205,.05)}
  .corner{position:absolute;width:30px;height:30px;border-color:rgba(214,166,96,.72)}
  .c-tl{top:34px;left:34px;border-top:2px solid;border-left:2px solid;border-top-left-radius:22px}
  .c-br{bottom:34px;right:34px;border-bottom:2px solid;border-right:2px solid;border-bottom-right-radius:22px}
  .chip{position:absolute;left:78px;top:78px;display:flex;align-items:center;gap:14px}
  .dot{width:12px;height:12px;border-radius:3px;transform:rotate(45deg);background:${c.accent};box-shadow:0 0 16px ${c.accent}}
  .code{font-weight:800;letter-spacing:.30em;font-size:24px;color:${c.accent}}
  .unum{position:absolute;left:80px;top:132px;font-family:'Playfair Display',serif;font-size:20px;letter-spacing:.28em;color:rgba(255,235,205,.5)}
  .name{position:absolute;left:78px;bottom:150px;font-family:'Playfair Display',serif;
    font-weight:700;font-size:58px;line-height:1.05;color:#fbf3e4;max-width:820px;
    text-shadow:0 12px 40px rgba(0,0,0,.5)}
  .kicker{position:absolute;left:80px;bottom:96px;font-size:20px;letter-spacing:.10em;
    color:rgba(214,166,96,.9);font-weight:700;direction:rtl}
  .rule{position:absolute;left:80px;bottom:132px;width:120px;height:3px;border-radius:3px;
    background:linear-gradient(90deg, ${c.accent}, transparent)}
  .vig{position:absolute;inset:0;box-shadow:inset 0 0 340px 60px rgba(0,0,0,.62);pointer-events:none}
  .grain{position:absolute;inset:0;opacity:.05;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
</style></head>
<body><div class="stage">
  <div class="grid"></div>
  <div class="arc"></div><div class="arc2"></div>
  <div class="glyph">${c.glyph}</div>
  <div class="chip"><span class="dot"></span><span class="code">${c.code}</span></div>
  <div class="unum">UNIT ${String(c.sort).padStart(2, '0')}</div>
  <div class="rule"></div>
  <div class="name">${c.name_en}</div>
  <div class="kicker">قيادة التسويق · بالإنجليزية</div>
  <div class="frame"></div>
  <div class="corner c-tl"></div><div class="corner c-br"></div>
  <div class="vig"></div><div class="grain"></div>
</div></body></html>`

async function main() {
  const { data: units } = await supabase.from('curriculum_units')
    .select('id, custom_sort, unit_number, theme_en, theme_ar, cover_image_url')
    .eq('owner_student_id', MALAK).order('custom_sort')
  console.log(`Malak covers — ${units.length} units | ${FORCE ? 'FORCE' : 'idempotent'}\n`)

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  fs.mkdirSync('scripts/image-gen/output/malak', { recursive: true })
  let ok = 0, skip = 0

  for (const u of units) {
    const sort = u.custom_sort ?? u.unit_number
    if (u.cover_image_url && !FORCE) { console.log(`  ⏭️  U${sort} already has a cover — skip`); skip++; continue }
    const meta = UNITS[sort]
    if (!meta) { console.log(`  ⚠️  U${sort} no meta — skip`); continue }
    const c = { ...meta, sort, name_en: u.theme_en }
    await page.setContent(html(c), { waitUntil: 'networkidle' })
    await page.waitForTimeout(150)
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } })
    fs.writeFileSync(`scripts/image-gen/output/malak/cover-U${sort}.png`, buf)
    if (PREVIEW) { console.log(`  🖼️  U${sort} rendered (preview) → output/malak/cover-U${sort}.png`); ok++; continue }

    const spath = `units/malak-U${sort}.png`
    const { error: upErr } = await supabase.storage.from('curriculum-images').upload(spath, buf, { contentType: 'image/png', upsert: true })
    if (upErr) throw new Error(`upload U${sort}: ${upErr.message}`)
    const url = supabase.storage.from('curriculum-images').getPublicUrl(spath).data.publicUrl
    const { error: dbErr } = await supabase.from('curriculum_units').update({ cover_image_url: url }).eq('id', u.id)
    if (dbErr) throw new Error(`db U${sort}: ${dbErr.message}`)
    console.log(`  ✅ U${sort} ${(buf.length / 1024).toFixed(0)}KB · «${u.theme_ar}»`); ok++
  }
  await browser.close()
  console.log(`\nDONE — ok:${ok} skip:${skip}`)
}
main().catch((e) => { console.error('💥', e.message); process.exit(1) })
