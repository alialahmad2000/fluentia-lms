import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronLeft, Video, Users, User, CalendarClock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  riyadhMidnightUtc, riyadhDow, riyadhDayStr, riyadhTimeStr, WEEKDAYS,
} from '@/lib/cs/scheduling'
import { riyadhDayShortAr } from '@/lib/coordinator/scheduling'

const HOUR = 3600 * 1000

const STATUS_AR = {
  scheduled: { label: 'مجدولة',  cls: 'text-sky-300' },
  done:      { label: 'تمت',     cls: 'text-emerald-300' },
  cancelled: { label: 'ملغاة',   cls: 'text-slate-500' },
  no_show:   { label: 'غياب', cls: 'text-rose-300' },
}

function useMySessions(fromIso, toIso) {
  return useQuery({
    queryKey: ['trainer-sessions', fromIso, toIso],
    enabled: !!fromIso && !!toIso, staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('trainer_my_sessions', { p_from: fromIso, p_to: toIso })
      if (error) throw error
      return data || []
    },
  })
}

function SessionRow({ s }) {
  const st = STATUS_AR[s.status] || STATUS_AR.scheduled
  const isGroup = s.type === 'group'
  const who = isGroup ? s.group_name : s.student_name
  const live = s.status === 'scheduled'
  const startMs = new Date(s.start_at).getTime()
  const soon = live && startMs - Date.now() < 30 * 60 * 1000 && startMs > Date.now() - 60 * 60 * 1000

  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${live ? 'bg-white/[0.04]' : 'bg-white/[0.02] opacity-60'}`}
      style={{ borderInlineStart: `3px solid ${isGroup ? '#a78bfa' : '#38bdf8'}` }}>
      <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${isGroup ? 'bg-violet-400/10 text-violet-300' : 'bg-sky-400/10 text-sky-300'}`}>
        {isGroup ? <Users size={15} /> : <User size={15} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-bold text-slate-100 truncate">{who || '—'}</span>
          <span className="text-xs text-slate-500">{isGroup ? 'جماعية' : 'فردية'}</span>
          {s.status !== 'scheduled' && <span className={`text-xs font-semibold ${st.cls}`}>{st.label}</span>}
        </div>
        <div className="text-xs text-slate-400 tabular-nums">
          {riyadhTimeStr(startMs)} — {riyadhTimeStr(new Date(s.end_at).getTime())}
          {s.notes ? <span className="text-slate-600"> · {s.notes}</span> : null}
        </div>
      </div>
      {live && s.meeting_link && (
        <a href={s.meeting_link} target="_blank" rel="noopener noreferrer"
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold min-h-[44px] ${
            soon ? 'bg-sky-400 text-[#06121f]' : 'bg-white/[0.06] text-sky-300'}`}>
          <Video size={14} /> دخول
        </a>
      )}
    </div>
  )
}

export default function TeacherSchedule() {
  const [weekOffset, setWeekOffset] = useState(0)

  const now = Date.now()
  const dow = riyadhDow(now)
  const weekStartMs = riyadhMidnightUtc(now, -dow + weekOffset * 7)
  const fromIso = new Date(weekStartMs).toISOString()
  const toIso = new Date(riyadhMidnightUtc(weekStartMs, 7)).toISOString()
  const { data: sessions = [], isLoading } = useMySessions(fromIso, toIso)

  const days = Array.from({ length: 7 }, (_, i) => {
    const startMs = riyadhMidnightUtc(weekStartMs, i)
    const d = riyadhDow(startMs + HOUR)
    const dayStr = riyadhDayStr(startMs + HOUR)
    const items = sessions.filter((s) => riyadhDayStr(new Date(s.start_at).getTime()) === dayStr)
    return { d, dayStr, startMs, items, isToday: dayStr === riyadhDayStr(now) }
  })

  const total = sessions.filter((s) => s.status === 'scheduled').length

  return (
    <div className="tea-page space-y-5" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="tea-pagehead">
          <div className="tea-pagehead__title">جدولي</div>
          <div className="tea-pagehead__sub">
            {total > 0 ? `${total} ${total >= 3 && total <= 10 ? 'حصص' : 'حصة'} هذا الأسبوع — بتوقيت الرياض` : 'حصصك الفردية والجماعية — بتوقيت الرياض'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="tea-btn !p-2" aria-label="الأسبوع السابق"><ChevronRight size={15} /></button>
          <button onClick={() => setWeekOffset(0)}
            className={`text-xs px-2 tabular-nums ${weekOffset === 0 ? 'text-sky-300' : 'text-slate-500'}`}>
            {riyadhDayShortAr(weekStartMs + HOUR)} — {riyadhDayShortAr(riyadhMidnightUtc(weekStartMs, 6) + HOUR)}
          </button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="tea-btn !p-2" aria-label="الأسبوع التالي"><ChevronLeft size={15} /></button>
        </div>
      </div>

      {isLoading && <div className="text-[13px] text-slate-500 py-3">جارٍ التحميل…</div>}

      {!isLoading && sessions.length === 0 && (
        <div className="tea-card text-center py-10">
          <span className="w-12 h-12 rounded-2xl grid place-items-center bg-white/5 text-slate-500 mx-auto mb-3"><CalendarClock size={20} /></span>
          <div className="text-[14px] font-bold text-slate-300 mb-1">لا حصص هذا الأسبوع</div>
          <div className="text-[12.5px] text-slate-500">عندما تُجدول منسّقة الأكاديمية حصة لك، تظهر هنا ويصلك إشعار</div>
        </div>
      )}

      <div className="space-y-3">
        {days.filter((day) => day.items.length > 0).map((day) => (
          <div key={day.dayStr} className="tea-card">
            <div className="flex items-center justify-between mb-2.5">
              <span className={`text-[13px] font-extrabold ${day.isToday ? 'text-sky-300' : 'text-slate-200'}`}>
                {WEEKDAYS[day.d]}{day.isToday ? ' · اليوم' : ''}
              </span>
              <span className="text-xs text-slate-600 tabular-nums">{riyadhDayShortAr(day.startMs + HOUR)}</span>
            </div>
            <div className="space-y-2">
              {day.items.map((s) => <SessionRow key={s.id} s={s} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
