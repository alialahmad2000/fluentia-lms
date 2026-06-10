// الاستخدام — which features earn their place and which are ignored,
// devices/browsers students actually use, and the busiest pages.
import { Smartphone, Globe2, FileSearch, Users } from 'lucide-react'
import { useReportUsage } from '../useAdminReports'
import {
  card, ACCENTS, ChartCard, RankedBars, LoadingBlock, EmptyNote, featureLabel, num,
} from '../reportKit'

export default function UsageTab({ days }) {
  const { data, isLoading, error } = useReportUsage(days)
  if (isLoading) return <LoadingBlock rows={3} />
  if (error) return <EmptyNote text="تعذّر تحميل بيانات الاستخدام" />

  const features = (data.features || []).map((f) => ({
    label: featureLabel(f.key),
    value: f.count,
    users: f.users,
    kind: f.kind,
  }))

  const pages = (data.top_pages || []).map((p) => ({
    label: prettyPath(p.page_path),
    value: p.views,
    users: p.users,
  }))

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard
          title="ترتيب الميزات حسب الاستخدام"
          subtitle="عدد مرات الاستخدام وعدد الطلاب المختلفين لكل ميزة — الميزات الغائبة عن القائمة لم تُستخدم إطلاقًا"
          className="lg:row-span-2"
        >
          <RankedBars items={features} color={ACCENTS.gold} />
        </ChartCard>

        <ChartCard title="الأجهزة" subtitle="جلسات الفترة حسب نوع الجهاز">
          <div className="flex items-start gap-3">
            <Smartphone size={16} className="text-sky-400 mt-1 shrink-0" />
            <div className="flex-1">
              <RankedBars
                items={(data.devices || []).map((d) => ({ label: DEVICE_AR[d.device] || d.device, value: d.sessions, users: d.users }))}
                color={ACCENTS.sky}
              />
            </div>
          </div>
        </ChartCard>

        <ChartCard title="المتصفحات" subtitle="سفاري = أيفون غالبًا، حيث تعيش أكثر المشاكل">
          <div className="flex items-start gap-3">
            <Globe2 size={16} className="text-violet-400 mt-1 shrink-0" />
            <div className="flex-1">
              <RankedBars
                items={(data.browsers || []).map((b) => ({ label: b.browser, value: b.sessions, users: b.users }))}
                color={ACCENTS.violet}
              />
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="أكثر الصفحات زيارة"
        subtitle="معرّفات الوحدات مجمّعة تحت ‎:id‎ حتى تتجمع الصفحات المتشابهة"
      >
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-2.5">
          {pages.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-1 border-b border-white/[0.04]">
              <span className="inline-flex items-center gap-2 min-w-0">
                <FileSearch size={12} className="text-slate-600 shrink-0" />
                <span className="text-xs text-slate-300 truncate" dir="ltr">{p.label}</span>
              </span>
              <span className="text-xs text-slate-500 tabular-nums shrink-0 inline-flex items-center gap-1" dir="ltr">
                {num(p.value)} <span className="text-slate-700 inline-flex items-center gap-0.5">· {num(p.users)} <Users size={10} /></span>
              </span>
            </div>
          ))}
          {pages.length === 0 && <EmptyNote />}
        </div>
      </ChartCard>
    </div>
  )
}

const DEVICE_AR = { mobile: 'جوال', desktop: 'كمبيوتر', tablet: 'تابلت', 'غير معروف': 'غير معروف' }

function prettyPath(p) {
  if (!p) return '؟'
  return p.length > 52 ? p.slice(0, 52) + '…' : p
}
