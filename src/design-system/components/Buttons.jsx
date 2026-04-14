import { forwardRef } from 'react'
import { motion } from 'framer-motion'

const SIZE_MAP = {
  sm: { height: 36, px: 16, fontSize: 13 },
  md: { height: 44, px: 24, fontSize: 15 },
  lg: { height: 52, px: 32, fontSize: 16 },
}

function BaseButton({ size = 'md', disabled, loading, icon, children, style, className = '', ...rest }, ref) {
  const s = SIZE_MAP[size] || SIZE_MAP.md
  return (
    <motion.button
      ref={ref}
      disabled={disabled || loading}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-2 font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{
        minHeight: s.height,
        paddingInline: s.px,
        fontSize: s.fontSize,
        borderRadius: 'var(--radius-md)',
        transition: `all var(--motion-fast) var(--ease-out)`,
        border: 'none',
        outline: 'none',
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block animate-spin"
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
          }}
        />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  )
}

const Btn = forwardRef(BaseButton)

export const PrimaryButton = forwardRef(function PrimaryButton(props, ref) {
  return (
    <Btn
      ref={ref}
      {...props}
      style={{
        background: 'var(--ds-accent-primary)',
        color: 'var(--ds-text-inverse)',
        boxShadow: 'var(--ds-shadow-sm)',
        ...props.style,
      }}
      className={`ds-btn-primary ${props.className || ''}`}
    />
  )
})

export const SecondaryButton = forwardRef(function SecondaryButton(props, ref) {
  return (
    <Btn
      ref={ref}
      {...props}
      style={{
        background: 'transparent',
        color: 'var(--ds-accent-primary)',
        border: '1px solid var(--ds-border-strong)',
        ...props.style,
      }}
      className={`ds-btn-secondary ${props.className || ''}`}
    />
  )
})

export const GhostButton = forwardRef(function GhostButton(props, ref) {
  return (
    <Btn
      ref={ref}
      {...props}
      style={{
        background: 'transparent',
        color: 'var(--ds-text-secondary)',
        ...props.style,
      }}
      className={`ds-btn-ghost ${props.className || ''}`}
    />
  )
})
