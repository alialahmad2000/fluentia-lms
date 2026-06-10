// الاستخدام — where the TIME actually goes (per curriculum section), which
// features earn their place and which are ignored, devices/browsers, top pages.
import { Smartphone, Globe2, FileSearch, Users, Timer } from 'lucide-react'
import { useReportUsage } from '../useAdminReports'
import {
  card, ACCENTS, ChartCard, RankedBars, LoadingBlock, EmptyNote, featureLabel,
  SECTION_AR, num, fmtMinutes,
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

  const sectionTime = data.section_time || []
  const totalSectionMinutes = sectionTime.reduce((a, s) => a + (Number(s.minutes) || 0), 0)

  const pages = (data.top_pages || []).map((p) => ({
    label: prettyPath(p.page_path),
    value: p.views,
    users: p.users,
  }))

  return (
    <div className="space-y-4">
      {/* time per curriculum section — the "where do the hours go" answer */}
      <ChartCard
        title="الوقت المستثمَر حسب القسم"
        subtitle="مجموع دقائق التعلّم لكل قسم من المنهج في الفترة المحددة — مع عدد الإكمالات وعدد الطلاب"
        action={
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 tabular-nums" dir="auto">
            <Timer size={13} /> {fmtMinutes(totalSectionMinutes)} إجمالًا
          </span>
        }
      >
        <div className="space-y-3">
          {sectionTime.map((s, i) => {
            const max = Math.max(...sectionTime.map((x) => Number(x.minutes) || 0), 1)
            const pct = totalSectionMinutes > 0 ? Math.round(((Number(s.minutes) || 0) / totalSectionMinutes) * 100) : 0
            return (
              <div key={s.section}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-xs text-slate-200 font-semibold">
                    {SECTION_AR[s.section] || s.section}
                    <span className="text-slate-500 font-normal"> · {num(s.completed)} إكمال · {num(s.users)} طالب</span>
                  </span>
                  <span className="text-xs text-slate-300 tabular-nums shrink-0 font-bold" dir="auto">
                    {fmtMinutes(s.minutes)} <span className="text-slate-600 font-normal">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(((Number(s.minutes) || 0) / max) * 100, 2)}%`,
                      background: `linear-gradient(90deg, ${SECTION_COLORS[s.section] || ACCENTS.slate}99, ${SECTION_COLORS[s.section] || ACCENTS.slate})`,
                    }}
                  />
                </div>
              </div>
            )
          })}
          {sectionTime.length === 0 && <EmptyNote text="لا وقت مسجل في هذه الفترة" />}
        </div>
      </ChartCard>

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

const SECTION_COLORS = {
  reading: ACCENTS.sky,
  listening: ACCENTS.violet,
  grammar: ACCENTS.gold,
  writing: ACCENTS.emerald,
  speaking: ACCENTS.rose,
  vocabulary: '#22d3ee',
  vocabulary_exercise: '#22d3ee',
  pronunciation: '#f472b6',
}

function prettyPath(p) {
  if (!p) return '؟'
  return p.length > 52 ? p.slice(0, 52) + '…' : p
}
