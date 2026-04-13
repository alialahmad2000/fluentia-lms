export const PLAYER_TIERS = [
  {
    id: 1,
    name: 'premium',
    displayName: 'المشغل الكامل',
    timeoutMs: 12000,
    retries: 2,
  },
  {
    id: 2,
    name: 'drive_preview',
    displayName: 'مشغل Drive',
    timeoutMs: 15000,
    retries: 1,
  },
  {
    id: 3,
    name: 'drive_embed',
    displayName: 'مشغل Drive (بديل)',
    timeoutMs: 15000,
    retries: 1,
  },
  {
    id: 4,
    name: 'drive_raw',
    displayName: 'مشغل مباشر',
    timeoutMs: 12000,
    retries: 2,
  },
  {
    id: 5,
    name: 'docs_viewer',
    displayName: 'عارض المستندات',
    timeoutMs: 15000,
    retries: 1,
  },
  {
    id: 6,
    name: 'direct_link',
    displayName: 'رابط مباشر',
    timeoutMs: null,
    retries: 0,
  },
]

export function getTierConfig(tierId) {
  return PLAYER_TIERS.find(t => t.id === tierId) || PLAYER_TIERS[PLAYER_TIERS.length - 1]
}
