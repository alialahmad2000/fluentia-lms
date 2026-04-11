import { Component } from 'react'
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * Tab/section-level error boundary. Catches crashes inside a single section
 * (e.g. the writing tab) so the surrounding page still works, and surfaces
 * the real error so students can report it. Also logs the error directly to
 * analytics_events (bypassing activityTracker, which may itself be broken).
 */
export default class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null, copied: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Console for local debug
    console.error('[SectionErrorBoundary:' + (this.props.section || 'unknown') + ']', error, errorInfo)
    this.setState({ info: errorInfo })

    // Fire-and-forget direct insert — NOT through activityTracker, which
    // silently dropped events for some students.
    try {
      supabase.auth.getUser().then(({ data }) => {
        const payload = {
          user_id: data?.user?.id || null,
          event: 'section_crash',
          properties: {
            section: this.props.section || 'unknown',
            unit_id: this.props.unitId || null,
            message: error?.message || String(error),
            stack: (error?.stack || '').slice(0, 2000),
            component_stack: (errorInfo?.componentStack || '').slice(0, 2000),
          },
          page_path: window.location.pathname,
        }
        supabase.from('analytics_events').insert(payload).then(() => {}, () => {})
      }, () => {})
    } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, info: null, copied: false })
  }

  handleCopy = async () => {
    try {
      const text = [
        'Section: ' + (this.props.section || 'unknown'),
        'Unit: ' + (this.props.unitId || '-'),
        'Error: ' + (this.state.error?.message || String(this.state.error)),
        'Stack: ' + (this.state.error?.stack || '').slice(0, 1500),
      ].join('\n')
      await navigator.clipboard.writeText(text)
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    } catch {}
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const message = this.state.error?.message || String(this.state.error) || 'خطأ غير معروف'

    return (
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{
          background: 'rgba(239,68,68,0.04)',
          border: '1px solid rgba(239,68,68,0.15)',
        }}
        dir="rtl"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">
              تعذر تحميل هذا القسم
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] mt-1">
              حصل خطأ غير متوقع في قسم {this.props.sectionLabel || 'هذا القسم'}. تقدرين تجربين مرة ثانية، أو تنسخين الخطأ وترسلينه للمدرب.
            </p>
          </div>
        </div>

        {/* Error message — visible in production too */}
        <pre
          className="text-[11px] text-red-300/90 font-['Inter'] rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}
          dir="ltr"
        >
          {message}
        </pre>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 transition-colors font-['Tajawal']"
          >
            <RefreshCw size={13} />
            إعادة المحاولة
          </button>
          <button
            onClick={this.handleCopy}
            className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors font-['Tajawal']"
          >
            {this.state.copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {this.state.copied ? 'تم النسخ' : 'انسخي الخطأ'}
          </button>
        </div>
      </div>
    )
  }
}
