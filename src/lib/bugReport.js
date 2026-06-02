import { supabase } from './supabase'
import { invokeWithRetry } from './invokeWithRetry'

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

// Submit a bug report. Screenshot is optional and best-effort — a failed upload
// never blocks the report itself.
export async function submitBugReport({ description, file }) {
  let screenshot_path = null
  if (file) screenshot_path = await uploadScreenshot(file)

  const device_info = {
    userAgent: navigator.userAgent,
    platform: navigator.platform || '',
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language || '',
    ts: new Date().toISOString(),
  }

  const { data, error } = await invokeWithRetry('submit-bug-report', {
    body: {
      description: String(description || '').trim(),
      page_url: window.location.href,
      screenshot_path,
      device_info,
    },
  })
  if (error) throw new Error(typeof error === 'string' ? error : 'تعذّر إرسال البلاغ')
  return { ...data, screenshot_attached: !!screenshot_path, screenshot_tried: !!file }
}
