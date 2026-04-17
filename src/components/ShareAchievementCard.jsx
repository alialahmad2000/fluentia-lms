import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Share2, Loader2 } from 'lucide-react'
import { generateAchievementImage } from '../utils/generateAchievementImage'
import { toast } from './ui/FluentiaToast'
import XPBadgeInline from './xp/XPBadgeInline'

export default function ShareAchievementCard({ type, studentName, levelName, unitName, studentText, feedback, scores, leaderboard, currentStudentId }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleShare = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)

    try {
      const dataUrl = await generateAchievementImage({
        type,
        studentName,
        levelName,
        unitName,
        studentText,
        feedback,
        scores,
        leaderboard,
        currentStudentId,
      })

      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], `fluentia-${type}-achievement.png`, { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'إنجازي في أكاديمية طلاقة',
            text: `شاركت ${type === 'writing' ? 'كتابتي' : 'محادثتي'} في أكاديمية طلاقة! 🎓`,
          })
          toast({ type: 'success', title: 'تم! شاركها في قروب التلقرام 🎓' })
          return
        }
      }

      // Fallback: download
      const link = document.createElement('a')
      link.download = `fluentia-${type}-achievement.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast({ type: 'success', title: 'تم حفظ الصورة! شاركها في قروب التلقرام 🎓' })
    } catch (err) {
      console.error('[ShareCard] Failed:', err)
      toast({ type: 'error', title: 'حدث خطأ، حاول مرة أخرى' })
    } finally {
      setIsGenerating(false)
    }
  }, [type, studentName, levelName, unitName, studentText, feedback, scores, leaderboard, currentStudentId, isGenerating])

  if (!feedback || !scores) return null

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      onClick={handleShare}
      disabled={isGenerating}
      className="w-full mt-5 py-3.5 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-['Tajawal']"
      style={{
        background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(129,140,248,0.15))',
        border: '1px solid rgba(56,189,248,0.2)',
        color: '#38bdf8',
      }}
    >
      {isGenerating ? (
        <><Loader2 size={16} className="animate-spin" /> جاري تجهيز الصورة...</>
      ) : (
        <><Share2 size={16} /> شارك إنجازك 🎉 <XPBadgeInline amount={5} /></>
      )}
    </motion.button>
  )
}
