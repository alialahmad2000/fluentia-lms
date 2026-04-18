import { forwardRef } from 'react'
import clsx from 'clsx'
import './CommandCard.css'

const CommandCard = forwardRef(function CommandCard(
  { children, className, as: Tag = 'div', elevated = false, ...rest },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={clsx('tr-command-card', elevated && 'tr-command-card--elevated', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
})

export default CommandCard
