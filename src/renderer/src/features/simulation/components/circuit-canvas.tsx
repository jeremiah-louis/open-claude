import { useEffect, useRef, useMemo } from "react"
import "../register-wokwi-elements"
import type { DiagramJson, DiagramPart } from "../types"
import type { SimulationPhase } from "../types"

interface CircuitCanvasProps {
  diagramJson: string
  simulationPhase: SimulationPhase
  registerElementRef: (id: string, el: HTMLElement | null) => void
}

export function CircuitCanvas({
  diagramJson,
  simulationPhase,
  registerElementRef,
}: CircuitCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const diagram: DiagramJson | null = useMemo(() => {
    if (!diagramJson) return null
    try {
      return JSON.parse(diagramJson)
    } catch {
      return null
    }
  }, [diagramJson])

  // Calculate bounding box for auto-centering
  const { parts, minX, minY, scaleWidth, scaleHeight } = useMemo(() => {
    if (!diagram?.parts?.length) {
      return { parts: [] as DiagramPart[], minX: 0, minY: 0, scaleWidth: 400, scaleHeight: 300 }
    }

    let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity
    for (const part of diagram.parts) {
      xMin = Math.min(xMin, part.left)
      yMin = Math.min(yMin, part.top)
      // Approximate element size
      xMax = Math.max(xMax, part.left + 200)
      yMax = Math.max(yMax, part.top + 200)
    }

    return {
      parts: diagram.parts,
      minX: xMin - 20,
      minY: yMin - 20,
      scaleWidth: xMax - xMin + 40,
      scaleHeight: yMax - yMin + 40,
    }
  }, [diagram])

  if (!diagram || !parts.length) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        {simulationPhase === "IDLE"
          ? "Circuit preview will appear here"
          : "No diagram provided"}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full w-full relative overflow-auto bg-[#f0f0f5] dark:bg-[#1a1a2e] p-4">
      {/* Status overlay */}
      {simulationPhase !== "IDLE" && (
        <div className="absolute top-2 right-2 z-10">
          <StatusBadge phase={simulationPhase} />
        </div>
      )}

      {/* Parts container */}
      <div
        className="relative"
        style={{
          minWidth: scaleWidth,
          minHeight: scaleHeight,
        }}
      >
        {parts
          .filter((p) => p.type !== "wokwi-arduino-uno")
          .map((part) => (
            <WokwiElement
              key={part.id}
              part={part}
              offsetX={minX}
              offsetY={minY}
              registerRef={registerElementRef}
            />
          ))}
      </div>
    </div>
  )
}

function WokwiElement({
  part,
  offsetX,
  offsetY,
  registerRef,
}: {
  part: DiagramPart
  offsetX: number
  offsetY: number
  registerRef: (id: string, el: HTMLElement | null) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Stabilize attrs to prevent effect re-runs on object reference changes
  const attrsKey = useMemo(() => JSON.stringify(part.attrs ?? {}), [part.attrs])

  useEffect(() => {
    const container = ref.current
    if (!container) return

    // Create the custom element
    const el = document.createElement(part.type)
    el.id = part.id
    // Ensure custom elements are block-level so they render with intrinsic SVG size
    el.style.display = "block"

    // Set attributes from diagram
    const attrs = JSON.parse(attrsKey)
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value as string)
    }

    container.appendChild(el)
    registerRef(part.id, el)

    return () => {
      registerRef(part.id, null)
      if (container.contains(el)) {
        container.removeChild(el)
      }
    }
  }, [part.id, part.type, attrsKey, registerRef])

  return (
    <div
      ref={ref}
      className="absolute"
      style={{
        left: part.left - offsetX,
        top: part.top - offsetY,
      }}
    />
  )
}

function StatusBadge({ phase }: { phase: SimulationPhase }) {
  const config: Record<SimulationPhase, { label: string; color: string }> = {
    IDLE: { label: "", color: "" },
    COMPILING: { label: "Compiling...", color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" },
    COMPILE_ERROR: { label: "Error", color: "bg-red-500/20 text-red-600 dark:text-red-400" },
    LOADING: { label: "Loading...", color: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
    RUNNING: { label: "Running", color: "bg-green-500/20 text-green-600 dark:text-green-400" },
    STOPPED: { label: "Stopped", color: "bg-gray-500/20 text-gray-600 dark:text-gray-400" },
  }

  const { label, color } = config[phase]
  if (!label) return null

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  )
}
