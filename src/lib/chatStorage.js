import { supabase } from './supabase'

// signed-URL TTL — 7 days so chat media doesn't silently 404 mid-session (was 1h).
const SIGNED_URL_TTL = 60 * 60 * 24 * 7

export async function uploadVoice(file, scope) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const ext = file.type.includes('mp4') || file.type.includes('m4a') ? 'm4a' : 'webm'
  const path = `${scope}/${user.id}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('chat-voice').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return path
}

// Client-side compression: downscale to a sane max dimension + re-encode JPEG.
// Returns null (→ caller uploads the original) for GIFs, tiny images, anything
// that wouldn't shrink, or on any failure. Keeps uploads fast and reliable.
async function compressImage(file, { maxDim = 1600, quality = 0.82 } = {}) {
  if (!file.type?.startsWith('image/') || file.type === 'image/gif') return null
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    const scale = Math.min(1, maxDim / Math.max(width, height))
    if (scale === 1 && file.size <= 600 * 1024) { bitmap.close?.(); return null }
    const w = Math.round(width * scale)
    const h = Math.round(height * scale)
    const canvas = (typeof OffscreenCanvas !== 'undefined')
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement('canvas'), { width: w, height: h })
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const type = 'image/jpeg'
    const blob = canvas.convertToBlob
      ? await canvas.convertToBlob({ type, quality })
      : await new Promise((res) => canvas.toBlob(res, type, quality))
    if (!blob || blob.size >= file.size) return null
    return { blob, type, ext: 'jpg' }
  } catch (_) {
    return null
  }
}

export async function uploadChatImage(file, scope) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  let body = file
  let ext = file.type.split('/')[1] || 'jpg'
  let contentType = file.type
  const compressed = await compressImage(file)
  if (compressed) { body = compressed.blob; ext = compressed.ext; contentType = compressed.type }
  const path = `${scope}/${user.id}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('chat-images').upload(path, body, {
    contentType,
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function uploadChatFile(file, scope) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const name = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${scope}/${user.id}/${crypto.randomUUID()}_${name}`
  const { error } = await supabase.storage.from('chat-files').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function signedVoiceUrl(path) {
  const { data, error } = await supabase.storage
    .from('chat-voice')
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (error) throw error
  return data.signedUrl
}

export async function signedImageUrl(path) {
  const { data, error } = await supabase.storage
    .from('chat-images')
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (error) throw error
  return data.signedUrl
}

export async function signedFileUrl(path) {
  const { data, error } = await supabase.storage
    .from('chat-files')
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (error) throw error
  return data.signedUrl
}
