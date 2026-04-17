import { useState, useMemo, useEffect } from 'react'
import { useBodyLock } from '../../hooks/useBodyLock'
import { motion, AnimatePresence } from 'framer-motion'
import WordDetailHeader from './WordDetailHeader'
import WordDetailTabBar from './WordDetailTabBar'
import MeaningTab from './tabs/MeaningTab'
import RelationsTab from './tabs/RelationsTab'
import FamilyTab from './tabs/FamilyTab'
import PronunciationTab from './tabs/PronunciationTab'

/**
 * Responsive tabbed modal for vocabulary word details.
 *
 * Layout (all devices):
 *   [ Fixed header: close, word, IPA, POS · meaning, audio, level ]
 *   [ Sticky tab bar: dynamic, hidden when only المعنى exists ]
 *   [ Scrollable content: only the active tab renders ]
 *
 * Responsive:
 *   - Mobile (< 640): full-screen, rounded-none
 *   - Tablet / Desktop: centered, max-w-2xl/3xl, max-h-[85vh], rounded-2xl
 *
 * Props:
 *   - word: curriculum_vocabulary row with joined synonyms/antonyms/word_family/pronunciation_alert
 *   - studentId: passed down for mastery lookups in RelationsTab / FamilyTab
 *   - isOpen: boolean — render nothing when false
 *   - onClose: () => void
 *   - initialTab?: 'meaning' | 'relations' | 'family' | 'pronunciation' — jump straight to a tab on open
 */
export default function WordDetailModal({
  word,
  studentId,
  isOpen,
  onClose,
  initialTab = 'meaning',
}) {
  const tabs = useMemo(() => {
    if (!word) return []
    const available = [{ id: 'meaning', label: 'المعنى', icon: '📖' }]

    const hasRelations =
      (Array.isArray(word.synonyms) && word.synonyms.length > 0) ||
      (Array.isArray(word.antonyms) && word.antonyms.length > 0)
    if (hasRelations) {
      const count =
        (word.synonyms?.length || 0) + (word.antonyms?.length || 0)
      available.push({
        id: 'relations',
        label: 'المرادفات',
        icon: '🔄',
        badge: count,
      })
    }

    if (Array.isArray(word.word_family) && word.word_family.length >= 2) {
      available.push({
        id: 'family',
        label: 'العائلة',
        icon: '📚',
        badge: word.word_family.length,
      })
    }

    if (
      word.pronunciation_alert &&
      typeof word.pronunciation_alert === 'object' &&
      word.pronunciation_alert.has_alert !== false
    ) {
      available.push({
        id: 'pronunciation',
        label: 'النطق',
        icon: '🔊',
        severity: word.pronunciation_alert.severity,
      })
    }

    return available
  }, [word])

  const [activeTab, setActiveTab] = useState(initialTab)

  // Reset active tab when word changes or initialTab changes
  useEffect(() => {
    if (!isOpen || !word || tabs.length === 0) return
    const validIds = tabs.map((t) => t.id)
    const preferred =
      initialTab && validIds.includes(initialTab) ? initialTab : 'meaning'
    if (!validIds.includes(activeTab) || activeTab !== preferred) {
      setActiveTab(preferred)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id, isOpen, initialTab])

  // ESC key closes
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Body scroll lock + mobile nav hide while open
  useBodyLock(isOpen)

  if (!isOpen || !word) return null

  const renderTabContent = () => {
    switch (activeTab) {
      case 'meaning':
        return <MeaningTab word={word} />
      case 'relations':
        return <RelationsTab word={word} studentId={studentId} />
      case 'family':
        return <FamilyTab word={word} studentId={studentId} />
      case 'pronunciation':
        return <PronunciationTab word={word} />
      default:
        return <MeaningTab word={word} />
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="wd-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[70] flex items-stretch sm:items-center justify-center sm:p-4"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.()
        }}
        role="dialog"
        aria-modal="true"
        aria-label="تفاصيل الكلمة"
      >
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className={[
            'w-full flex flex-col',
            'sm:max-w-2xl lg:max-w-3xl',
            'h-[100dvh] sm:h-auto sm:max-h-[85vh]',
            'sm:rounded-2xl',
            'sm:border sm:border-slate-700/50',
            'sm:shadow-2xl sm:shadow-black/50',
            'overflow-hidden',
          ].join(' ')}
          style={{
            background: 'rgba(10, 14, 28, 0.97)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <WordDetailHeader word={word} onClose={onClose} />

          {tabs.length > 1 && (
            <WordDetailTabBar
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          )}

          <div
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
            dir="rtl"
            style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(24px + var(--sab))' }}
          >
            {renderTabContent()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
