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

export async function uploadChatImage(file, scope) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const ext = file.type.split('/')[1] || 'jpg'
  const path = `${scope}/${user.id}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('chat-images').upload(path, file, {
    contentType: file.type,
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
