import React from "react"

interface BreadboardSvgProps {
  x: number
  y: number
}

const HOLE_COLS = 30 // holes running horizontally
const HOLE_ROWS = 5  // rows per terminal block (top half + bottom half)
const HOLE_SPACING = 9.5
const HOLE_RADIUS = 1.5
const CHANNEL_GAP = 14 // gap between top and bottom terminal blocks
const RAIL_GAP = 10    // gap between power rail and terminal block
const PADDING = 12

// Vertical layout (top → bottom):
//   PADDING
//   2 rows power rail (spacing = HOLE_SPACING)
//   RAIL_GAP
//   5 rows top terminal block (spacing = 4 * HOLE_SPACING)
//   CHANNEL_GAP
//   5 rows bottom terminal block (spacing = 4 * HOLE_SPACING)
//   RAIL_GAP
//   2 rows power rail (spacing = HOLE_SPACING)
//   PADDING

const boardWidth = PADDING * 2 + (HOLE_COLS - 1) * HOLE_SPACING
const boardHeight =
  PADDING +
  HOLE_SPACING +               // top power rail (2 rows)
  RAIL_GAP +
  (HOLE_ROWS - 1) * HOLE_SPACING + // top terminal block
  CHANNEL_GAP +
  (HOLE_ROWS - 1) * HOLE_SPACING + // bottom terminal block
  RAIL_GAP +
  HOLE_SPACING +               // bottom power rail (2 rows)
  PADDING

// Pre-compute Y anchors
const railTopY = PADDING
const mainTopY = railTopY + HOLE_SPACING + RAIL_GAP
const mainBottomY = mainTopY + (HOLE_ROWS - 1) * HOLE_SPACING + CHANNEL_GAP
const railBottomY = mainBottomY + (HOLE_ROWS - 1) * HOLE_SPACING + RAIL_GAP

function generateHoles(): { cx: number; cy: number }[] {
  const holes: { cx: number; cy: number }[] = []
  const sx = PADDING

  for (let col = 0; col < HOLE_COLS; col++) {
    const cx = sx + col * HOLE_SPACING

    // Top power rail (2 rows)
    holes.push({ cx, cy: railTopY })
    holes.push({ cx, cy: railTopY + HOLE_SPACING })

    // Top terminal block (5 rows)
    for (let row = 0; row < HOLE_ROWS; row++) {
      holes.push({ cx, cy: mainTopY + row * HOLE_SPACING })
    }

    // Bottom terminal block (5 rows)
    for (let row = 0; row < HOLE_ROWS; row++) {
      holes.push({ cx, cy: mainBottomY + row * HOLE_SPACING })
    }

    // Bottom power rail (2 rows)
    holes.push({ cx, cy: railBottomY })
    holes.push({ cx, cy: railBottomY + HOLE_SPACING })
  }

  return holes
}

const holes = generateHoles()

const lineX1 = PADDING - 4
const lineX2 = PADDING + (HOLE_COLS - 1) * HOLE_SPACING + 4
const channelY = mainTopY + (HOLE_ROWS - 0.5) * HOLE_SPACING + CHANNEL_GAP / 2

export const BreadboardSvg = React.memo(function BreadboardSvg({
  x,
  y,
}: BreadboardSvgProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: x, top: y, zIndex: 0 }}
    >
      <svg
        width={boardWidth}
        height={boardHeight}
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Board background */}
        <rect
          x={0}
          y={0}
          width={boardWidth}
          height={boardHeight}
          rx={6}
          className="fill-[#F5F1E6] dark:fill-[#2D2D3D]"
        />

        {/* Power rail stripes — top */}
        <line x1={lineX1} y1={railTopY} x2={lineX2} y2={railTopY}
          stroke="#ef4444" strokeWidth={1} opacity={0.4} />
        <line x1={lineX1} y1={railTopY + HOLE_SPACING} x2={lineX2} y2={railTopY + HOLE_SPACING}
          stroke="#3b82f6" strokeWidth={1} opacity={0.4} />

        {/* Power rail stripes — bottom */}
        <line x1={lineX1} y1={railBottomY} x2={lineX2} y2={railBottomY}
          stroke="#ef4444" strokeWidth={1} opacity={0.4} />
        <line x1={lineX1} y1={railBottomY + HOLE_SPACING} x2={lineX2} y2={railBottomY + HOLE_SPACING}
          stroke="#3b82f6" strokeWidth={1} opacity={0.4} />

        {/* Center channel line */}
        <line x1={lineX1} y1={channelY} x2={lineX2} y2={channelY}
          className="stroke-black/10 dark:stroke-white/10" strokeWidth={0.5} />

        {/* Holes */}
        {holes.map((h, i) => (
          <circle
            key={i}
            cx={h.cx}
            cy={h.cy}
            r={HOLE_RADIUS}
            className="fill-black/15 dark:fill-white/15"
          />
        ))}
      </svg>
    </div>
  )
})
