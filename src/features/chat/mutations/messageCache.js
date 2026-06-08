// Resolve + patch the LIVE caches a message actually renders from.
// Group messages render from ['unified-messages', groupId, lens] (every lens variant);
// DMs render from ['dm-messages', threadId]. The legacy ['channel-messages', channelId]
// key was DEAD (channelId is undefined in DMs / the unified stream) — optimistic
// react/edit/delete/pin wrote there and nothing read it, so the UI only moved after a
// full server round-trip. These helpers target the real keys instead.

export function messageKeyFilter(message) {
  if (message?.dm_thread_id) return ['dm-messages', message.dm_thread_id]
  return ['unified-messages', message?.group_id] // partial key → matches all lens variants
}

function patchInfinite(old, messageId, patch) {
  if (!old?.pages) return old
  return {
    ...old,
    pages: old.pages.map((page) =>
      Array.isArray(page) ? page.map((m) => (m.id === messageId ? patch(m) : m)) : page
    ),
  }
}

export async function cancelMessageQueries(qc, message) {
  await qc.cancelQueries({ queryKey: messageKeyFilter(message) })
}

// Optimistically patch the message in every cache it lives in.
// Returns a snapshot ([key, data] pairs) for rollback on error.
export function patchMessage(qc, message, patch) {
  const filter = messageKeyFilter(message)
  const snapshot = qc.getQueriesData({ queryKey: filter })
  qc.setQueriesData({ queryKey: filter }, (old) => patchInfinite(old, message.id, patch))
  return snapshot
}

export function restoreSnapshot(qc, snapshot) {
  if (!snapshot) return
  for (const [key, data] of snapshot) qc.setQueryData(key, data)
}

export function invalidateMessage(qc, message) {
  qc.invalidateQueries({ queryKey: messageKeyFilter(message) })
}
