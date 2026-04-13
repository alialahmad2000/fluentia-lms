// Default cascade order — tiers 3,4,5 have 0% success rate in exhaustive testing
// so they're kept for future edge cases but with short timeouts
export const PLAYER_TIERS = [
  {
    id: 1,
    name: 'premium',
    displayName: 'المشغل الكامل',
    timeoutMs: 8000,
    retries: 1,
  },
  {
    id: 2,
    name: 'drive_preview',
    displayName: 'مشغل Drive',
    timeoutMs: 10000,
    retries: 1,
  },
  {
    id: 3,
    name: 'drive_embed',
    displayName: 'مشغل Drive (بديل)',
    timeoutMs: 5000,
    retries: 0,
    deadTier: true,
  },
  {
    id: 4,
    name: 'drive_raw',
    displayName: 'مشغل مباشر',
    timeoutMs: 5000,
    retries: 0,
    deadTier: true,
  },
  {
    id: 5,
    name: 'docs_viewer',
    displayName: 'عارض المستندات',
    timeoutMs: 5000,
    retries: 0,
    deadTier: true,
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
