import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Lock, Circle, Map } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

function useJourneyData() {
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id
  const academicLevel = studentData?.academic_level

  return useQuery({
    queryKey: ['level-journey-map', studentId, academicLevel],
    enabled: !!studentId && !!academicLevel,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: level } = await supabase
        .from('curriculum_levels')
        .select('id, level_number, cefr, name_ar')
        .eq('level_number', academicLevel)
        .single()

      if (!level) return null

      const { data: units } = await supabase
        .from('curriculum_units')
        .select('id, unit_number, theme_ar, theme_en, cover_image_url')
        .eq('level_id', level.id)
        .order('unit_number')

      const { data: progressRows } = await supabase
        .from('student_curriculum_progress')
        .select('unit_id, status, is_latest')
        .eq('student_id', studentId)
        .eq('is_latest', true)

      const completedSet = new Set(
        (progressRows || [])
          .filter(r => r.status === 'completed')
          .map(r => r.unit_id)
      )
      const startedSet = new Set(
        (progressRows || []).map(r => r.unit_id)
      )

      return { level, units: units || [], completedSet, startedSet }
    },
  })
}

function getStatus(unitId, completedSet, startedSet, prevDone) {
  if (completedSet.has(unitId)) return 'completed'
  if (startedSet.has(unitId) || prevDone) return 'available'
  return 'locked'
}

function UnitNode({ unit, status, index, isLeft, onClick }) {
  const isCompleted = status === 'completed'
  const isLocked = status === 'locked'

  const nodeColor = isCompleted
    ? '#4ade80'
    : status === 'available'
      ? '#fbbf24'
      : 'rgba(255,255,255,0.15)'

  const textColor = isLocked ? 'rgba(248,250,252,0.3)' : 'rgba(248,250,252,0.9)'

  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      style={{
        display: 'flex', alignItems: 'center',
        flexDirection: isLeft ? 'row' : 'row-reverse',
        gap: '16px',
        marginBottom: '0',
      }}
    >
      {/* Node circle */}
      <button
        onClick={() => !isLocked && onClick(unit.id)}
        disabled={isLocked}
        style={{
          width: '56px', height: '56px', borderRadius: '50%',
          border: `2.5px solid ${nodeColor}`,
          background: isCompleted
            ? 'rgba(74,222,128,0.12)'
            : status === 'available'
              ? 'rgba(251,191,36,0.12)'
              : 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: isLocked ? 'default' : 'pointer',
          flexShrink: 0,
          boxShadow: isCompleted
            ? '0 0 12px rgba(74,222,128,0.25)'
            : status === 'available'
              ? '0 0 16px rgba(251,191,36,0.3)'
              : 'none',
          transition: 'box-shadow 0.3s',
        }}
      >
        {isCompleted
          ? <CheckCircle2 size={22} color="#4ade80" />
          : isLocked
            ? <Lock size={18} color="rgba(255,255,255,0.2)" />
            : <Circle size={20} color="#fbbf24" fill="rgba(251,191,36,0.15)" />
        }
      </button>

      {/* Card */}
      <motion.div
        whileHover={!isLocked ? { scale: 1.02 } : {}}
        onClick={() => !isLocked && onClick(unit.id)}
        style={{
          flex: 1, maxWidth: '220px',
          background: isLocked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isCompleted ? 'rgba(74,222,128,0.2)' : status === 'available' ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '16px',
          padding: '14px 16px',
          cursor: isLocked ? 'default' : 'pointer',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, color: nodeColor, marginBottom: '4px', letterSpacing: '0.5px' }}>
          الوحدة {unit.unit_number}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: textColor, lineHeight: 1.3, fontFamily: "'Tajawal', sans-serif" }}>
          {unit.theme_ar || unit.theme_en}
        </div>
        {isCompleted && (
          <div style={{ fontSize: '11px', color: 'rgba(74,222,128,0.7)', marginTop: '4px' }}>
            ✓ مكتملة
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function LevelJourneyMap() {
  const navigate = useNavigate()
  const { data, isLoading } = useJourneyData()

  if (isLoading) return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'rgb(2,6,23)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(248,250,252,0.4)', fontFamily: "'Tajawal', sans-serif" }}>جاري التحميل...</div>
    </div>
  )

  if (!data) return null

  const { level, units, completedSet, startedSet } = data

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(20,10,50,0.98) 0%, rgb(2,6,23) 60%)',
      fontFamily: "'Tajawal', sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient */}
      <div style={{
        position: 'fixed', top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: '70vw', height: '70vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.04) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', padding: '80px 24px 120px' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>
            <Map size={28} color="#fbbf24" style={{ display: 'inline-block' }} />
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: 'rgba(251,191,36,0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>
            خريطة رحلتكِ
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: 900, color: 'rgba(248,250,252,0.95)' }}>
            المستوى {level.level_number} — {level.cefr}
          </h1>
          {level.name_ar && (
            <p style={{ margin: '8px 0 0', fontSize: '15px', color: 'rgba(248,250,252,0.5)' }}>
              {level.name_ar}
            </p>
          )}

          {/* Progress bar */}
          <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.07)', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${units.length ? (completedSet.size / units.length) * 100 : 0}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #4ade80, #22d3ee)', borderRadius: '100px' }}
            />
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(248,250,252,0.4)', marginTop: '6px' }}>
            {completedSet.size} / {units.length} وحدة مكتملة
          </div>
        </motion.div>

        {/* Zigzag path */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
          {/* Vertical connector line */}
          <div style={{
            position: 'absolute', top: '28px', bottom: '28px',
            left: '50%', transform: 'translateX(-50%)',
            width: '2px',
            background: 'linear-gradient(to bottom, rgba(251,191,36,0.3), rgba(255,255,255,0.05))',
            zIndex: 0,
          }} />

          {units.map((unit, i) => {
            const prevDone = i === 0 || completedSet.has(units[i - 1]?.id)
            const status = getStatus(unit.id, completedSet, startedSet, prevDone)
            return (
              <UnitNode
                key={unit.id}
                unit={unit}
                status={status}
                index={i}
                isLeft={i % 2 === 0}
                onClick={id => navigate(`/student/unit/${id}`)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
