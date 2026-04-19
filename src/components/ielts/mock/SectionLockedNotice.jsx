import { Lock } from 'lucide-react'
import { GlassPanel } from '@/design-system/components'

const SECTION_NAMES = {
  listening: 'الاستماع',
  reading: 'القراءة',
  writing: 'الكتابة',
  speaking: 'المحادثة',
}

export default function SectionLockedNotice({ section }) {
  return (
    <GlassPanel style={{ padding: 24, textAlign: 'center', border: '1px solid rgba(251,146,60,0.25)' }}>
      <Lock size={28} style={{ color: '#fb923c', margin: '0 auto 12px', display: 'block' }} />
      <p style={{ fontSize: 15, fontWeight: 700, color: '#fb923c', fontFamily: 'Tajawal', marginBottom: 6 }}>
        قسم {SECTION_NAMES[section] || section} مكتمل
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>
        لا يمكن العودة إلى قسم سبق تسليمه — تابع مع القسم الحالي
      </p>
    </GlassPanel>
  )
}
