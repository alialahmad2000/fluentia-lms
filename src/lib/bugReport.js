import { supabase } from './supabase'
import { invokeWithRetry } from './invokeWithRetry'
import { areaById, subsectionById, problemTypeById, severityById } from './bugReportTaxonomy'

// Upload a screenshot into the reporter's own folder (RLS: <uid>/<file>).
// Returns the storage path, or null if the upload fails (we still file the report).
async function uploadScreenshot(file) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const ext = ((file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')).slice(0, 5)
  const rand = Math.random().toString(36).slice(2, 8)
  const path = `${user.id}/${Date.now()}-${rand}.${ext}`
  const { error } = await supabase.storage
    .from('bug-screenshots')
    .upload(path, file, { contentType: file.type || 'image/png', upsert: false })
  if (error) return null
  return path
}

// Which build is THIS client actually running? (Best-effort — the "suspect a
// stale cached version first" debugging rule lives or dies on this.)
async function readAppVersion() {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch('/version.json', { cache: 'no-store', signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    const j = await res.json()
    return j?.version || j?.build || j?.commit || JSON.stringify(j).slice(0, 60)
  } catch { return null }
}

// Build a short Arabic header so the section + problem type are visible at a
// glance in the staff notification + email (which are built from `description`),
// with NO backend change. e.g. "📍 المنهج › القراءة — 🔊 الصوت لا يعمل"
function buildHeader({ area, subsection, problemType, severity }) {
  const a = areaById(area)
  const sub = subsectionById(area, subsection)
  const pt = problemTypeById(problemType)
  const sev = severityById(severity)
  const where = a ? `${a.emoji} ${a.label}${sub ? ` › ${sub.label}` : ''}` : null
  const what = pt ? `${pt.emoji} ${pt.label}` : null
  const how = sev ? `${sev.emoji} ${sev.label}` : null
  const line = [where, what, how].filter(Boolean).join(' — ')
  return line ? `📍 ${line}` : ''
}

// Submit a bug report. Screenshot is optional and best-effort — a failed upload
// never blocks the report itself. The structured selections (area/section/type/
// severity) ride in BOTH the description header (instant readability for staff)
// and device_info.context (so the admin page can render/filter them).
export async function submitBugReport({ description, file, area, subsection, problemType, severity }) {
  let screenshot_path = null
  if (file) screenshot_path = await uploadScreenshot(file)

  const appVersion = await readAppVersion()

  const header = buildHeader({ area, subsection, problemType, severity })
  const body = String(description || '').trim()
  const fullDescription = header ? (body ? `${header}\n\n${body}` : header) : body

  const device_info = {
    // technical (auto)
    userAgent: navigator.userAgent,
    platform: navigator.platform || '',
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: (typeof screen !== 'undefined') ? `${screen.width}x${screen.height}@${window.devicePixelRatio || 1}x` : '',
    language: navigator.language || '',
    online: typeof navigator.onLine === 'boolean' ? navigator.onLine : null,
    standalone: window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone || false,
    swControlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
    appVersion: appVersion || null,
    ts: new Date().toISOString(),
    // student-selected context (machine-readable for admin chips/filters)
    context: {
      area: area || null,
      area_label: areaById(area)?.label || null,
      subsection: subsection || null,
      subsection_label: subsectionById(area, subsection)?.label || null,
      problem_type: problemType || null,
      problem_type_label: problemTypeById(problemType)?.label || null,
      severity: severity || null,
      severity_label: severityById(severity)?.label || null,
    },
  }

  const { data, error } = await invokeWithRetry('submit-bug-report', {
    body: {
      description: fullDescription,
      page_url: window.location.href,
      screenshot_path,
      device_info,
    },
  })
  if (error) throw new Error(typeof error === 'string' ? error : 'تعذّر إرسال البلاغ')
  return { ...data, screenshot_attached: !!screenshot_path, screenshot_tried: !!file }
}
