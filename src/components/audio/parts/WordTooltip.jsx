import { useEffect, useState, useRef } from 'react'

export function WordTooltip({ word, definition_ar, ipa, anchorEl }) {
  const [position, setPosition] = useState(null)
  const tooltipRef = useRef(null)

  useEffect(() => {
    if (!anchorEl || !tooltipRef.current) return
    const anchorRect = anchorEl.getBoundingClientRect()
    const tipRect = tooltipRef.current.getBoundingClientRect()

    let x = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2
    let y = anchorRect.top - tipRect.height - 12

    const sidebar = document.querySelector('aside[role="navigation"]')
    const sidebarLeft = sidebar ? sidebar.getBoundingClientRect().left : window.innerWidth
    const BAR_H = window.innerWidth < 768 ? 72 : 96

    if (x + tipRect.width > sidebarLeft - 8) x = sidebarLeft - tipRect.width - 8
    if (x < 8) x = 8
    if (y < 60) y = anchorRect.bottom + 12
    const maxY = window.innerHeight - BAR_H - tipRect.height - 8
    if (y > maxY) y = maxY

    setPosition({ x, y })
  }, [anchorEl])

  if (!definition_ar && !ipa) return null

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="pointer-events-none rounded-lg px-3 py-2 shadow-xl max-w-[280px]"
      style={{
        position: 'fixed',
        left: position?.x ?? -9999,
        top: position?.y ?? -9999,
        zIndex: 58,
        background: 'rgba(10,18,32,0.96)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-baseline gap-2 flex-wrap" dir="ltr">
        <span style={{ unicodeBidi: 'isolate' }} className="text-base font-semibold text-white">{word}</span>
        {ipa && <span style={{ unicodeBidi: 'isolate' }} className="text-xs text-slate-400 font-['Inter']">/{ipa}/</span>}
      </div>
      {definition_ar && (
        <p className="mt-1 text-sm text-slate-200 leading-snug font-['Tajawal']" dir="rtl">{definition_ar}</p>
      )}
      <p className="mt-1.5 text-[10px] text-slate-500 font-['Tajawal']">اضغط مطوّلاً للمزيد</p>
    </div>
  )
}
