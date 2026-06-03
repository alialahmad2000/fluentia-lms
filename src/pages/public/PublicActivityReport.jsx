import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, Loader2, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ReportContent, Card, EmptyState, fmtDateAr } from '../shared/StudentActivityReport'
import { openPrintableReport } from '../../utils/activityReportPrint'

// Public, login-free parent view of a student's activity report, reached via /r/:token.
// Reuses the exact ReportContent rendering used by the staff page (read-only).
export default function PublicActivityReport() {
  const { token } = useParams()

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-activity-report', token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('student-activity-report', {
        body: { share_token: token, locale: 'ar' },
      })
      if (error) throw new Error(error.message || 'تعذّر تحميل التقرير')
      if (data?.error) throw new Error(data.error)
      return data
    },
    enabled: !!token,
    retry: 0,
    refetchOnWindowFocus: false,
  })

  const report = data?.report
  const ai = data?.ai
  const period = data?.period

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'var(--surface-base, #060e1c)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>أكاديمية طلاقة</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>تقرير تقدّم الطالب</p>
          </div>
          <Sparkles size={22} style={{ color: 'var(--accent-sky)' }} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24"><Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent-sky)' }} /></div>
        ) : error ? (
          <EmptyState text={error.message || 'الرابط غير صالح أو منتهي الصلاحية.'} />
        ) : !report ? (
          <EmptyState text="لا توجد بيانات." />
        ) : (
          <>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{report.student?.name}</h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {report.student?.level != null ? `المستوى ${report.student.level} · ` : ''}
                    {period ? `${fmtDateAr(period.start)} — ${fmtDateAr(period.end)}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => openPrintableReport({ report, ai, period, rangeLabel: '' })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium min-h-[40px]"
                  style={{ background: 'rgba(56,189,248,0.08)', color: 'var(--accent-sky)', border: '1px solid rgba(56,189,248,0.15)' }}
                >
                  <FileText size={14} /> طباعة / PDF
                </button>
              </div>
            </Card>

            <ReportContent report={report} ai={ai} readOnly />

            <p className="text-center text-[11px] pt-4" style={{ color: 'var(--text-tertiary)' }}>أكاديمية طلاقة · Fluentia Academy</p>
          </>
        )}
      </div>
    </div>
  )
}
