import {
  Stethoscope, Briefcase, Cpu, Activity,
  UtensilsCrossed, Moon, Sparkles, Users,
} from 'lucide-react'

export const INTEREST_BUCKETS = [
  { key: 'medical',        labelAr: 'الطب والصحة',    icon: Stethoscope },
  { key: 'business',       labelAr: 'الأعمال والمهن', icon: Briefcase },
  { key: 'tech',           labelAr: 'التقنية',        icon: Cpu },
  { key: 'sports',         labelAr: 'الرياضة',        icon: Activity },
  { key: 'travel_food',    labelAr: 'السفر والطعام',  icon: UtensilsCrossed },
  { key: 'islamic',        labelAr: 'الإسلامية',      icon: Moon },
  { key: 'fashion_beauty', labelAr: 'الموضة والجمال', icon: Sparkles },
  { key: 'family',         labelAr: 'الأهل والأسرة',  icon: Users },
]

export const INTEREST_KEYS = INTEREST_BUCKETS.map(b => b.key)
export const MAX_INTERESTS = 3

export function getBucketByKey(key) {
  return INTEREST_BUCKETS.find(b => b.key === key) ?? null
}
