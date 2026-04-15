import { useMemo } from 'react'

const PHI = 1.618033988749895
const VIEWPORT_W = 1440
const VIEWPORT_H = 900

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generateMesh() {
  const rand = seededRandom(42)
  const nodes = []
  const lines = []

  // Place 14 nodes using golden-ratio-inspired spacing
  const count = 14
  for (let i = 0; i < count; i++) {
    const angle = i * PHI * Math.PI * 2
    const radius = 0.15 + rand() * 0.35
    const cx = VIEWPORT_W * (0.5 + radius * Math.cos(angle) * 0.9)
    const cy = VIEWPORT_H * (0.5 + radius * Math.sin(angle) * 0.9)
    nodes.push({
      id: i,
      x: Math.round(cx * 10) / 10,
      y: Math.round(cy * 10) / 10,
    })
  }

  // Connect nearby nodes — keep it sparse (max ~18 lines)
  const maxDist = 520
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < maxDist && lines.length < 18) {
        lines.push({ from: nodes[i], to: nodes[j], id: `${i}-${j}` })
      }
    }
  }

  return { nodes, lines }
}

export default function GeometricMesh() {
  const { nodes, lines } = useMemo(generateMesh, [])

  return (
    // Hidden on mobile (< lg) — saves GPU/paint on phones
    <div className="fixed inset-0 pointer-events-none z-0 hidden lg:block" aria-hidden="true">
      <svg
        viewBox={`0 0 ${VIEWPORT_W} ${VIEWPORT_H}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <g className="motion-safe:animate-none">
          {lines.map((line) => (
            <line
              key={line.id}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
              stroke="var(--accent-sky)"
              strokeWidth="0.5"
              strokeOpacity="0.18"
            />
          ))}
          {nodes.map((node) => (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={node.id % 3 === 0 ? 3 : 2}
              fill="var(--accent-sky)"
              fillOpacity="0.22"
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
