import clsx from 'clsx'
import './RailPanel.css'

export default function RailPanel({ children, className, side = 'left', ...rest }) {
  return (
    <aside
      className={clsx('tr-rail-panel', `tr-rail-panel--${side}`, className)}
      {...rest}
    >
      {children}
    </aside>
  )
}
