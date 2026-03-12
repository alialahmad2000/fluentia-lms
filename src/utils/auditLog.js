import { supabase } from '../lib/supabase'

export async function logAudit({ actorId, action, targetType, targetId, oldData, newData, description }) {
  await supabase.from('audit_log').insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    old_data: oldData || null,
    new_data: newData || null,
    description,
  })
}
