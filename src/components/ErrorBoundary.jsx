import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { tracker } from '../services/activityTracker'
import { supabase } from '../lib/supabase'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    this.setState({ errorInfo })
    tracker.track('error_displayed', { error_type: 'boundary', page: window.location.pathname, message: error?.message })
  }

  handleRetry = async () => {
    // Refresh session before retry — in case the error was auth-related
    try { await supabase.auth.refreshSession() } catch {}
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // Page-level boundary: support both element and render-prop fallback
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error)
          : this.props.fallback
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-muted mb-6">
              عذراً، حدثت مشكلة في تحميل هذه الصفحة. حاول تحديث الصفحة أو العودة للرئيسية.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm py-2.5 px-5 rounded-xl hover:bg-sky-500/20 transition-all font-medium"
              >
                <RefreshCw size={14} />
                إعادة المحاولة
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.href = '/'
                }}
                className="flex items-center gap-2 border border-border-subtle text-muted text-sm py-2.5 px-5 rounded-xl hover:text-[var(--text-primary)] transition-all"
              >
                <Home size={14} />
                الرئيسية
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left text-xs text-red-400/60 bg-red-500/5 rounded-xl p-3 overflow-auto max-h-60" dir="ltr">
                <summary className="cursor-pointer text-red-400 mb-2">Technical details</summary>
                <pre style={{whiteSpace:'pre-wrap'}}>{this.state.error?.toString()}{'\n\n'}{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
            {(() => {
              try {
                const authData = localStorage.getItem('sb-nmjexpuycmqcxuxljier-auth-token');
                if (!authData) return null;
                const parsed = JSON.parse(authData);
                if (parsed?.user?.id !== 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96') return null;
              } catch { return null; }
              return this.state.error ? (
                <details style={{
                  marginTop: 24, padding: 16,
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 12, textAlign: 'left', direction: 'ltr',
                  maxWidth: 720, marginLeft: 'auto', marginRight: 'auto',
                }}>
                  <summary style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>
                    Admin: Technical Error Details
                  </summary>
                  <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 11 }}>
                    <div><strong>Route:</strong> {window.location.pathname}</div>
                    <div><strong>UA:</strong> {navigator.userAgent.slice(0, 80)}</div>
                    <div style={{ marginTop: 8 }}><strong>Error:</strong></div>
                    <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 200, color: '#fca5a5' }}>
                      {this.state.error?.toString()}
                    </pre>
                    <div style={{ marginTop: 8 }}><strong>Stack:</strong></div>
                    <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 200, fontSize: 10, color: '#94a3b8' }}>
                      {this.state.error?.stack}
                    </pre>
                    <div style={{ marginTop: 8 }}><strong>Component Stack:</strong></div>
                    <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 200, fontSize: 10, color: '#94a3b8' }}>
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              ) : null;
            })()}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function PageErrorFallback({ error } = {}) {
  const handleReload = () => {
    // Prevent rapid reload loops — cooldown of 5 seconds
    const lastReload = parseInt(sessionStorage.getItem('page_error_reload_at') || '0', 10)
    if (Date.now() - lastReload < 5000) return
    sessionStorage.setItem('page_error_reload_at', Date.now().toString())
    window.location.reload()
  }

  return (
    <div className="min-h-[40vh] flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">تعذر تحميل الصفحة</h3>
        <p className="text-xs text-muted mb-4">حاول تحديث الصفحة</p>
        <button
          onClick={handleReload}
          className="flex items-center gap-2 mx-auto bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm py-2 px-4 rounded-xl hover:bg-sky-500/20 transition-all font-medium"
        >
          <RefreshCw size={14} />
          تحديث
        </button>
        {import.meta.env.DEV && error && (
          <pre className="mt-4 text-left text-xs text-red-400/60 bg-red-500/5 rounded-xl p-3 overflow-auto max-h-40" dir="ltr">
            {error.toString()}
          </pre>
        )}
      </div>
    </div>
  )
}
