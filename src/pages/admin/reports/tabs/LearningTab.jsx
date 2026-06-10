// التعلّم — outcomes: weekly score per skill, score distribution, hardest
// units (curriculum hotspots), vocab mastery growth, SRS quality, speaking volume.
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { useReportLearning } from '../useAdminReports'
import {
  card, ACCENTS, ChartCard, LoadingBlock, EmptyNote, SECTION_AR,
  num, shortDate, tooltipStyle, axisTick,
} from '../reportKit'

const SKILL_COLORS = {
  reading: ACCENTS.sky,
  listening: ACCENTS.violet,
  grammar: ACCENTS.gold,
  writing: ACCENTS.emerald,
  speaking: ACCENTS.rose,
  vocabulary: '#22d3ee',
  vocabulary_exercise: '#22d3ee',
  pronunciation: '#f472b6',
}

const SRS_LABEL = { 1: 'نسيتها', 2: 'صعبة', 3: 'جيدة', 4: 'سهلة' }
const SRS_COLOR = { 1: ACCENTS.rose, 2: ACCENTS.gold, 3: ACCENTS.sky, 4: ACCENTS.emerald }

export default function LearningTab({ days }) {
  const { data, isLoading, error } = useReportLearning(days)
  if (isLoading) return <LoadingBlock rows={3} />
  if (error) return <EmptyNote text="تعذّر تحميل بيانات التعلّم" />

  // pivot weekly skill rows -> wide rows per week
  const weeks = {}
  const skills = new Set()
  for (const r of data.skills_weekly || []) {
    const wk = r.week
    weeks[wk] = weeks[wk] || { week: shortDate(wk) }
    weeks[wk][r.section_type] = r.avg_score
    skills.add(r.section_type)
  }
  const weekly = Object.values(weeks)

  const dist = ORDERED_BUCKETS.map((b) => ({
    bucket: b,
    count: (data.score_distribution || []).find((d) => d.bucket === b)?.count || 0,
  }))

  const vocab = (data.vocab_growth || []).map((v) => ({ ...v, day: shortDate(v.date) }))
  const srs = (data.srs_ratings || []).map((r) => ({
    label: SRS_LABEL[r.rating] || r.rating,
    count: r.count,
    fill: SRS_COLOR[r.rating] || ACCENTS.slate,
  }))
  const speaking = (data.speaking_trend || []).map((s) => ({ ...s, day: shortDate(s.date) }))

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="متوسط الدرجات أسبوعيًا حسب المهارة" subtitle="آخر محاولة معتمدة لكل قسم — هل يتحسن المستوى؟">
          {weekly.length === 0 ? <EmptyNote /> : (
            <div dir="ltr" className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v}%`, SECTION_AR[n] || n]} labelFormatter={(l) => `أسبوع ${l}`} />
                  <Legend formatter={(v) => <span style={{ fontSize: 11, color: '#94a3b8' }}>{SECTION_AR[v] || v}</span>} />
                  {[...skills].map((sk) => (
                    <Line key={sk} type="monotone" dataKey={sk} stroke={SKILL_COLORS[sk] || ACCENTS.slate} strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="توزيع الدرجات" subtitle="كل المحاولات المكتملة في الفترة">
          <div dir="ltr" className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="bucket" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [num(v), 'محاولة']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
                  {dist.map((d, i) => (
                    <Cell key={i} fill={bucketColor(d.bucket)} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* hardest units */}
      <ChartCard
        title="أصعب الوحدات"
        subtitle="أدنى متوسط درجات (٥ محاولات على الأقل) — مؤشر على محتوى يحتاج مراجعة أو طلاب يحتاجون دعمًا"
        action={
          <Link to="/admin/curriculum-quality" className="text-xs text-amber-300/80 hover:text-amber-300 underline underline-offset-4">
            فحص جودة المنهج ←
          </Link>
        }
      >
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-1.5">
          {(data.hardest_units || []).map((u, i) => (
            <div key={u.unit_id} className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-slate-300 truncate">
                <span className="text-slate-600 tabular-nums me-1.5">{i + 1}.</span>
                {u.theme || `وحدة ${u.unit_number}`}
              </span>
              <span className="text-xs tabular-nums shrink-0" dir="ltr">
                <span style={{ color: u.avg_score < 60 ? ACCENTS.rose : ACCENTS.gold }} className="font-bold">{u.avg_score}%</span>
                <span className="text-slate-600"> · {num(u.attempts)} محاولة</span>
              </span>
            </div>
          ))}
          {(data.hardest_units || []).length === 0 && <EmptyNote text="لا توجد وحدات بعدد محاولات كافٍ في هذه الفترة" />}
        </div>
      </ChartCard>

      <div className="grid lg:grid-cols-3 gap-4">
        <ChartCard title="نمو حصيلة المفردات" subtitle="كلمات أُتقنت يوميًا + الإجمالي التراكمي" className="lg:col-span-2">
          {vocab.length === 0 ? <EmptyNote /> : (
            <div dir="ltr" className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vocab} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradVocab" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENTS.emerald} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={ACCENTS.emerald} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [num(v), n === 'cumulative' ? 'الإجمالي التراكمي' : 'أُتقنت هذا اليوم']} />
                  <Area type="monotone" dataKey="cumulative" stroke={ACCENTS.emerald} strokeWidth={2} fill="url(#gradVocab)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="جودة المراجعة المتباعدة" subtitle="تقييم الطلاب لبطاقات SRS">
          {srs.length === 0 ? <EmptyNote /> : (
            <div className="space-y-2.5 pt-1">
              {srs.map((r) => {
                const total = srs.reduce((a, b) => a + b.count, 0) || 1
                return (
                  <div key={r.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{r.label}</span>
                      <span className="text-slate-500 tabular-nums" dir="ltr">{num(r.count)} ({Math.round((r.count / total) * 100)}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(r.count / total) * 100}%`, background: r.fill }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="حجم التحدث" subtitle="تسجيلات ومحادثات صوتية يوميًا">
        {speaking.length === 0 ? <EmptyNote /> : (
          <div dir="ltr" className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={speaking} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [num(v), n === 'recordings' ? 'تسجيلات' : 'محادثات']} />
                <Bar dataKey="recordings" stackId="a" fill={ACCENTS.rose} fillOpacity={0.8} radius={[3, 3, 0, 0]} barSize={12} />
                <Bar dataKey="conversations" stackId="a" fill={ACCENTS.violet} fillOpacity={0.8} radius={[3, 3, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </div>
  )
}

const ORDERED_BUCKETS = ['0-39', '40-59', '60-74', '75-89', '90-100']

function bucketColor(bucket) {
  if (bucket === '90-100') return ACCENTS.emerald
  if (bucket === '75-89') return ACCENTS.sky
  if (bucket === '60-74') return ACCENTS.gold
  return ACCENTS.rose
}
