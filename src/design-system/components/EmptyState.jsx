import { PrimaryButton } from './Buttons'

export default function EmptyState({ message = 'لا توجد بيانات', actionLabel, onAction, icon }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center gap-4"
      style={{ padding: 'var(--space-8) var(--space-5)', minHeight: 280 }}
    >
      {icon ? (
        <div style={{ color: 'var(--ds-text-tertiary)', fontSize: 48 }}>{icon}</div>
      ) : (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <circle cx="32" cy="32" r="30" stroke="var(--ds-border-subtle)" strokeWidth="2" strokeDasharray="6 4" />
          <path d="M24 28h16M28 36h8" stroke="var(--ds-text-tertiary)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}

      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text-secondary)' }}>{message}</p>

      {actionLabel && onAction && (
        <PrimaryButton size="sm" onClick={onAction}>{actionLabel}</PrimaryButton>
      )}
    </div>
  )
}
