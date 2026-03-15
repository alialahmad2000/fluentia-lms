import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
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
            <h2 className="text-lg font-bold text-white mb-2">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-muted mb-6">
              عذراً، حدثت مشكلة في تحميل هذه الصفحة. حاول تحديث الصفحة أو العودة للرئيسية.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
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
                className="flex items-center gap-2 bg-white/5 border border-border-subtle text-muted text-sm py-2.5 px-5 rounded-xl hover:bg-white/10 hover:text-white transition-all"
              >
                <Home size={14} />
                الرئيسية
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 text-left text-xs text-red-400/60 bg-red-500/5 rounded-xl p-3 overflow-auto max-h-40" dir="ltr">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function PageErrorFallback({ error } = {}) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">تعذر تحميل الصفحة</h3>
        <p className="text-xs text-muted mb-4">حاول تحديث الصفحة</p>
        <button
          onClick={() => window.location.reload()}
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
