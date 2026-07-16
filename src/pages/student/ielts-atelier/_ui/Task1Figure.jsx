import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { renderTask1ChartSVG } from '@/lib/ielts/task1Chart'

// Renders an accurate, deterministic IELTS Task-1 chart INLINE (crisp SVG,
// straight from chart_data → exact values). Accepts either a `chartData`
// object directly, or a `taskId` to fetch it from ielts_writing_tasks.
function responsive(svg) {
  if (!svg) return ''
  // Make the root <svg> scale to its container (viewBox drives the aspect ratio).
  return svg.replace(/<svg([^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, '<svg$1 style="width:100%;height:auto;display:block"')
}

export function Task1FigureInline({ chartData, title, style }) {
  const html = useMemo(() => responsive(renderTask1ChartSVG(chartData, { title: title || '' })), [chartData, title])
  if (!html) return null
  return (
    <div
      style={{ width: '100%', borderRadius: 12, overflow: 'hidden', background: '#ffffff', border: '1px solid var(--iel-border)', ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default function Task1Figure({ taskId, style }) {
  const { data } = useQuery({
    queryKey: ['ielts-writing-task-chart', taskId],
    enabled: !!taskId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_writing_tasks')
        .select('title, chart_data')
        .eq('id', taskId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
  if (!data?.chart_data) return null
  return <Task1FigureInline chartData={data.chart_data} title={data.title} style={style} />
}
