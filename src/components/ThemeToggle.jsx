import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, Sparkles, ChevronDown, Check } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'

const THEMES = [
  {
    key: 'deep-space',
    label: 'الفضاء',
    labelEn: 'Deep Space',
    icon: Moon,
    colors: ['#060e1c', '#0a1225', '#38bdf8', '#818cf8'],
  },
  {
    key: 'frost-white',
    label: 'الجليد',
    labelEn: 'Frost White',
    icon: Sun,
    colors: ['#f8f9fc', '#ffffff', '#6366f1', '#8b5cf6'],
  },
  {
    key: 'aurora',
    label: 'الشفق',
    labelEn: 'Aurora',
    icon: Sparkles,
    colors: ['#0c0a1d', '#1a1538', '#a78bfa', '#38bdf8'],
  },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = THEMES.find(t => t.key === theme) || THEMES[0]

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // ATELIER: theme switching disabled — single identity.
  return null
}
