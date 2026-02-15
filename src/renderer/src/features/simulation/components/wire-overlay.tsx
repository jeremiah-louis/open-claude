import React from "react"
import type { ResolvedConnection } from "../utils/pin-positions"

interface WireOverlayProps {
  connections: ResolvedConnection[]
  width: number
  height: number
}

const WIRE_COLORS: Record<string, string> = {
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  black: "#1f2937",
  white: "#e5e7eb",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#a855f7",
  pink: "#ec4899",
  brown: "#92400e",
  gray: "#6b7280",
  cyan: "#06b6d4",
}

function getWireColor(color: string): string {
  return WIRE_COLORS[color.toLowerCase()] ?? color
}

/**
 * Build a Manhattan-style (Z-shaped) SVG path: vertical → horizontal → vertical.
 */
function buildWirePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const midY = (y1 + y2) / 2
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`
}

export const WireOverlay = React.memo(function WireOverlay({
  connections,
  width,
  height,
}: WireOverlayProps) {
  if (connections.length === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {connections.map((conn, i) => {
        const wireColor = getWireColor(conn.color)
        const path = buildWirePath(
          conn.from.x,
          conn.from.y,
          conn.to.x,
          conn.to.y,
        )

        return (
          <g key={i}>
            <path
              d={path}
              fill="none"
              stroke={wireColor}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.85}
            />
            {/* Pin dots at endpoints */}
            <circle cx={conn.from.x} cy={conn.from.y} r={3} fill={wireColor} opacity={0.9} />
            <circle cx={conn.to.x} cy={conn.to.y} r={3} fill={wireColor} opacity={0.9} />
          </g>
        )
      })}
    </svg>
  )
})
