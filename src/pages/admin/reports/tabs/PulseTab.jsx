// النبض — platform pulse: a live hero (now + today), totals vs previous window,
// daily activity series (rollup, through yesterday), study-hours heatmap.
import { motion } from 'framer-motion'
import {
  Users, Clock3, MonitorPlay, Layers, Zap, Wallet, CalendarRange, CalendarClock,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { useReportPulse } from '../useAdminReports'
import {
  card, ACCENTS, StatCard, ChartCard, HourHeatmap, RankedBars, LoadingBlock,
  num, fmtMinutes, fmtSAR, pctDelta, shortDate, tooltipStyle, axisTick, EmptyNote,
} from '../reportKit'

export default function PulseTab({ days }) {
  const { data, isLoading, error } = useReportPulse(days)
  if (isLoading) return <LoadingBlock rows={4} />
  if (error) return <EmptyNote text="تعذّر تحميل النبض — حدّث الصفحة أو تحقق من الصلاحيات" />

  const t = data.totals || {}
  const p = data.prev_totals || {}
  const today = data.today || {}
  const activeNow = data.now?.active_now || 0

  const daily = (data.daily || []).map((d) => ({
    ...d,
    day: shortDate(d.date),
  }))

  const topEvents = (data.top_events || []).map((e) => ({
    label: EVENT_AR[e.event] || e.event,
    value: e.count,
    users: e.users,
  }))

  return (
    <div className="space-y-5">
      {/* hero — today, live */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`${card} relative overflow-hidden px-6 py-6`}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{ background: 'radial-gradient(420px 180px at 85% 0%, rgba(251,191,36,0.10), transparent 70%), radial-gradient(360px 160px at 10% 100%, rgba(56,189,248,0.07), transparent 70%)' }}
        />
        <div className="relative flex flex-wrap items-center gap-x-12 gap-y-5">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="relative flex h-3 w-3">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${activeNow > 0 ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${activeNow > 0 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              </span>
              <span className="text-xs font-semibold text-slate-400">المنصة الآن</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[44px] leading-none font-extrabold tracking-tight text-slate-50 tabular-nums" dir="ltr">{num(activeNow)}</span>
              <span className="text-sm text-slate-400">متصل الآن</span>
            </div>
          </div>
          <div className="h-12 w-px bg-white/[0.07] hidden sm:block" />
          <HeroStat value={fmtMinutes(today.learning_minutes)} label="دقائق تعلّم اليوم" accent={ACCENTS.gold} big />
          <HeroStat value={num(today.students_active)} label="طلاب دخلوا اليوم" />
          <HeroStat value={num(today.sessions)} label="جلسات اليوم" />
          <HeroStat value={num(today.events)} label="أحداث اليوم" />
          <span className="ms-auto self-start text-xs text-slate-600 inline-flex items-center gap-1.5">
            <CalendarClock size={12} /> اليوم حتى الآن — يُحدَّث تلقائيًا
          </span>
        </div>
      </motion.div>

      {/* window totals + WAU/MAU */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard index={0} icon={Users} label={`طلاب نشطون (${days} يوم)`} value={num(t.active_students)} color={ACCENTS.sky} delta={pctDelta(t.active_students, p.active_students)} />
        <StatCard index={1} icon={Clock3} label="دقائق التعلّم" value={fmtMinutes(t.learning_minutes)} color={ACCENTS.gold} delta={pctDelta(t.learning_minutes, p.learning_minutes)} />
        <StatCard index={2} icon={MonitorPlay} label="جلسات" value={num(t.sessions)} color={ACCENTS.violet} delta={pctDelta(t.sessions, p.sessions)} />
        <StatCard index={3} icon={Layers} label="أقسام مكتملة" value={num(t.sections_completed)} color={ACCENTS.emerald} delta={pctDelta(t.sections_completed, p.sections_completed)} />
        <StatCard index={4} icon={Zap} label="نقاط XP" value={num(t.xp)} color={ACCENTS.sky} delta={pctDelta(t.xp, p.xp)} />
        <StatCard index={5} icon={Wallet} label="تكلفة الذكاء الاصطناعي" value={fmtSAR(t.ai_cost_sar)} color={ACCENTS.rose} delta={pctDelta(t.ai_cost_sar, p.ai_cost_sar)} />
        <StatCard index={6} icon={CalendarRange} label="نشطون آخر ٧ أيام" value={num(data.wau)} color={ACCENTS.emerald} sub="WAU" />
        <StatCard index={7} icon={CalendarRange} label="نشطون آخر ٣٠ يوم" value={num(data.mau)} color={ACCENTS.violet} sub="MAU" />
      </div>

      {/* daily series */}
      <ChartCard
        title="النشاط اليومي"
        subtitle="المساحة الذهبية = دقائق التعلّم · الأعمدة الزرقاء = عدد الطلاب النشطين"
        footnote="المصدر: التجميعة الليلية — حتى أمس. نشاط اليوم يظهر في الشريط الحي أعلاه."
      >
        {daily.length === 0 ? <EmptyNote /> : (
          <div dir="ltr" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradMins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENTS.gold} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={ACCENTS.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="m" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis yAxisId="s" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) => [num(v), { learning_minutes: 'دقائق التعلّم', students: 'طلاب نشطون' }[name] || name]}
                  labelFormatter={(l) => `يوم ${l}`}
                />
                <Area yAxisId="m" type="monotone" dataKey="learning_minutes" stroke={ACCENTS.gold} strokeWidth={2} fill="url(#gradMins)" name="learning_minutes" />
                <Bar yAxisId="s" dataKey="students" fill={ACCENTS.sky} fillOpacity={0.4} radius={[3, 3, 0, 0]} barSize={15} name="students" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* heatmap */}
        <ChartCard title="متى يدرس الطلاب؟" subtitle="كثافة الدخول وتصفّح الصفحات حسب الساعة واليوم (بتوقيت الرياض)">
          <HourHeatmap cells={data.heatmap || []} />
        </ChartCard>

        {/* top events */}
        <ChartCard title="أكثر الأحداث على المنصة" subtitle="أعلى الأحداث في الفترة المحددة">
          <RankedBars items={topEvents.slice(0, 12)} color={ACCENTS.violet} />
        </ChartCard>
      </div>
    </div>
  )
}

function HeroStat({ value, label, accent, big }) {
  return (
    <div>
      <div
        className={`${big ? 'text-[32px]' : 'text-[22px]'} leading-none font-extrabold tracking-tight tabular-nums`}
        style={{ color: accent || '#e2e8f0' }}
        dir="auto"
      >
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1.5">{label}</div>
    </div>
  )
}

const EVENT_AR = {
  page_view: 'زيارة صفحة',
  reading_passage_open: 'فتح نص قراءة',
  section_crash: 'انهيار قسم',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  reading_word_lookup: 'بحث عن كلمة',
  curriculum_unit_view: 'عرض وحدة',
  unit_selected: 'اختيار وحدة',
  unit_opened: 'فتح وحدة',
  mission_card_clicked: 'ضغط بطاقة مهمة',
  nav_clicked: 'تنقّل',
  reading_vocab_tap: 'نقر مفردة',
  reading_word_highlight: 'تظليل كلمة',
  reading_audio_complete: 'إكمال صوت القراءة',
  tab_switched: 'تبديل تبويب',
  listening_segment_complete: 'إكمال مقطع استماع',
  error_displayed: 'ظهور خطأ',
  password_changed: 'تغيير كلمة المرور',
}
