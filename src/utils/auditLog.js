import { supabase } from '../lib/supabase'

export async function logAudit({ actorId, action, targetType, targetId, oldData, newData, description }) {
  // Guard required fields to prevent inserting malformed audit rows
  if (!actorId || !action) {
    console.warn('[auditLog] Missing required fields (actorId, action) — skipping audit entry')
    return
  }

  try {
    const { error } = await supabase.from('audit_log').insert({
      actor_id: actorId,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      old_data: oldData ?? null,
      new_data: newData ?? null,
      description: description ?? null,
    })
    if (error) {
      console.error('[auditLog] Failed to write audit entry:', error.message)
    }
  } catch (err) {
    console.error('[auditLog] Unexpected error writing audit entry:', err)
  }
}
