// Generate bespoke premium cover art for مصعب's 5 custom business-major units.
// No FAL needed — designed in HTML/CSS ("Obsidian Atelier" system), rendered to PNG via Playwright,
// uploaded to Supabase storage, and wired to curriculum_units.cover_image_url.
// Cohesive identity (obsidian + gold frame + grain), distinct per course (jewel accent + lucide glyph).
// Run: node scripts/generate-mosab-covers.mjs
import { chromium } from 'playwright';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Rocket, Truck, HeartPulse, HeartHandshake, Briefcase, Megaphone, Headphones, Wallet, Users, Mail, Presentation, TrendingUp } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const MOSAB_ID = '4fb98807-526d-4675-adb5-eb938b31b948';
const W = 1536, H = 864;

const icon = (C) => renderToStaticMarkup(createElement(C, { size: 300, strokeWidth: 1.15, color: 'currentColor' }));

const COURSES = [
  { sort: 1, code: 'ENT 325', name_en: 'Entrepreneurship',        accent: '#f5b942', glyph: icon(Rocket) },
  { sort: 2, code: 'SCM 341', name_en: 'Supply Chain',            accent: '#38bdf8', glyph: icon(Truck) },
  { sort: 3, code: 'HCM 345', name_en: 'Healthcare Management',   accent: '#34d399', glyph: icon(HeartPulse) },
  { sort: 4, code: 'NPF 323', name_en: 'Nonprofit Management',    accent: '#fb7185', glyph: icon(HeartHandshake) },
  { sort: 5, code: 'MGT 303', name_en: 'Professional Skills',     accent: '#a78bfa', glyph: icon(Briefcase) },
  { sort: 6, code: 'MKT',     name_en: 'Marketing Basics',        accent: '#fb923c', glyph: icon(Megaphone) },
  { sort: 7, code: 'SRV',     name_en: 'Customer Service',        accent: '#22d3ee', glyph: icon(Headphones) },
  { sort: 8, code: 'FIN',     name_en: 'Money & Budgeting',       accent: '#eab308', glyph: icon(Wallet) },
  { sort: 9, code: 'TEAM',    name_en: 'Working in a Team',       accent: '#818cf8', glyph: icon(Users) },
  { sort: 10, code: 'COMM',   name_en: 'Communication at Work',   accent: '#2dd4bf', glyph: icon(Mail) },
  { sort: 11, code: 'PRES',   name_en: 'Giving a Presentation',   accent: '#f472b6', glyph: icon(Presentation) },
  { sort: 12, code: 'GROW',   name_en: 'Growing in Your Career',  accent: '#a3e635', glyph: icon(TrendingUp) },
];

const html = (c) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  @font-face{font-family:'PF';src:local('Playfair Display')}
  *{margin:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  .stage{position:relative;width:${W}px;height:${H}px;background:
    radial-gradient(130% 120% at 82% 8%, ${c.accent}22, transparent 46%),
    radial-gradient(90% 90% at 12% 96%, ${c.accent}12, transparent 55%),
    linear-gradient(155deg, #0a0e18 0%, #05070d 60%, #04050a 100%);
    font-family:'Inter','Helvetica Neue',sans-serif;color:#faf5e6;overflow:hidden}
  /* fine dot-grid (cohesive texture) */
  .grid{position:absolute;inset:0;opacity:.5;
    background-image:radial-gradient(rgba(255,255,255,.05) 1px, transparent 1.4px);
    background-size:34px 34px;mask-image:linear-gradient(120deg, transparent 8%, #000 55%)}
  /* large accent arc motif */
  .arc{position:absolute;width:1180px;height:1180px;border-radius:50%;
    border:1.5px solid ${c.accent}33;left:58%;top:-38%;
    box-shadow:0 0 120px -30px ${c.accent}55, inset 0 0 90px -40px ${c.accent}44}
  .arc2{position:absolute;width:760px;height:760px;border-radius:50%;
    border:1px solid ${c.accent}22;left:64%;top:-14%}
  /* hero glyph */
  .glyph{position:absolute;right:120px;top:50%;transform:translateY(-50%);
    color:${c.accent};filter:drop-shadow(0 24px 60px ${c.accent}55) drop-shadow(0 0 26px ${c.accent}66);opacity:.96}
  .glyph svg{width:420px;height:420px}
  /* gold hairline frame */
  .frame{position:absolute;inset:34px;border:1px solid rgba(233,185,73,.28);border-radius:22px;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
  .corner{position:absolute;width:30px;height:30px;border-color:rgba(233,185,73,.7)}
  .c-tl{top:34px;left:34px;border-top:2px solid;border-left:2px solid;border-top-left-radius:22px}
  .c-br{bottom:34px;right:34px;border-bottom:2px solid;border-right:2px solid;border-bottom-right-radius:22px}
  /* code chip */
  .chip{position:absolute;left:78px;top:78px;display:flex;align-items:center;gap:14px}
  .dot{width:12px;height:12px;border-radius:3px;transform:rotate(45deg);background:${c.accent};
    box-shadow:0 0 16px ${c.accent}}
  .code{font-weight:800;letter-spacing:.32em;font-size:26px;color:${c.accent}}
  /* course name (English, refined) */
  .name{position:absolute;left:78px;bottom:120px;font-family:'Playfair Display',serif;
    font-weight:700;font-size:76px;line-height:1.02;color:#fbf7ec;max-width:760px;
    text-shadow:0 12px 40px rgba(0,0,0,.5)}
  .kicker{position:absolute;left:80px;bottom:210px;font-size:22px;letter-spacing:.26em;
    text-transform:uppercase;color:rgba(233,185,73,.85);font-weight:700}
  .rule{position:absolute;left:80px;bottom:96px;width:120px;height:3px;border-radius:3px;
    background:linear-gradient(90deg, ${c.accent}, transparent)}
  /* vignette + grain */
  .vig{position:absolute;inset:0;box-shadow:inset 0 0 340px 60px rgba(0,0,0,.6);pointer-events:none}
  .grain{position:absolute;inset:0;opacity:.05;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
</style></head>
<body><div class="stage">
  <div class="grid"></div>
  <div class="arc"></div><div class="arc2"></div>
  <div class="glyph">${c.glyph}</div>
  <div class="chip"><span class="dot"></span><span class="code">${c.code}</span></div>
  <div class="kicker">مساري الجامعي</div>
  <div class="name">${c.name_en}</div>
  <div class="rule"></div>
  <div class="frame"></div>
  <div class="corner c-tl"></div><div class="corner c-br"></div>
  <div class="vig"></div><div class="grain"></div>
</div></body></html>`;

async function main() {
  // skip units that already have a cover (idempotent — re-run only fills new units)
  const { data: existing } = await supabase.from('curriculum_units')
    .select('custom_sort, cover_image_url').eq('owner_student_id', MOSAB_ID);
  const covered = new Set((existing || []).filter((u) => u.cover_image_url).map((u) => u.custom_sort));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  for (const c of COURSES) {
    if (covered.has(c.sort)) { console.log(`  ⏭️  ${c.code} (sort ${c.sort}) already has a cover — skipping`); continue; }
    await page.setContent(html(c), { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });

    const path = `units/mosab-${c.code.replace(/\s+/g, '').toLowerCase()}.png`;
    const { error: upErr } = await supabase.storage.from('curriculum-images').upload(path, buf, { contentType: 'image/png', upsert: true });
    if (upErr) throw new Error(`upload ${c.code}: ${upErr.message}`);
    const { data: pub } = supabase.storage.from('curriculum-images').getPublicUrl(path);

    const { data: unit, error: dbErr } = await supabase.from('curriculum_units')
      .update({ cover_image_url: pub.publicUrl })
      .eq('owner_student_id', MOSAB_ID).eq('custom_sort', c.sort)
      .select('id, theme_ar');
    if (dbErr) throw new Error(`db ${c.code}: ${dbErr.message}`);
    console.log(`  ✅ ${c.code} → ${(buf.length/1024).toFixed(0)}KB · cover set on «${unit?.[0]?.theme_ar}»`);
    // also save one locally for preview
    if (c.sort === 1) { const fs = await import('fs'); fs.writeFileSync('/tmp/mosab-cover-sample.png', buf); }
  }
  await browser.close();
  console.log('\n✅ All 5 covers generated + uploaded + wired.');
}
main().catch((e) => { console.error('💥', e.message); process.exit(1); });
