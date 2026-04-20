import { Component } from 'react'

export default class TrainerErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) { return { error } }

  componentDidCatch(error, info) {
    console.error('[TrainerErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          maxWidth: 720, margin: '40px auto', padding: 24,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 16, color: '#fca5a5',
          direction: 'rtl', textAlign: 'right',
          fontFamily: "'Cairo', 'Tajawal', sans-serif",
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>⚠️ حصل خطأ في هذه الصفحة</h3>
          <p style={{ fontSize: 14, opacity: 0.85, margin: '0 0 12px', lineHeight: 1.6 }}>
            {this.state.error?.message || 'خطأ غير معروف'}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '8px 16px',
              background: 'var(--tr-primary, #f59e0b)',
              color: '#0b0f1e',
              border: 'none', borderRadius: 8,
              fontWeight: 700, cursor: 'pointer',
              fontSize: 14,
            }}
          >
            حاول مرة ثانية
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
