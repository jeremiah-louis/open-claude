import { useCallback, useEffect, useRef, useMemo, useState } from "react"
import { ZoomIn, ZoomOut } from "lucide-react"
import "../register-wokwi-elements"
import type { DiagramJson, DiagramPart } from "../types"
import type { SimulationPhase } from "../types"
import { buildPinPositionMap, resolveConnections } from "../utils/pin-positions"
import { WireOverlay } from "./wire-overlay"

const ZOOM_MIN = 0.25
const ZOOM_MAX = 3
const ZOOM_STEP = 0.25

/** Known element sizes (width × height in CSS px) */
const ELEMENT_SIZES: Record<string, [number, number]> = {
  "wokwi-arduino-uno": [274, 202],
  "wokwi-led": [40, 50],
  "wokwi-buzzer": [64, 90],
  "wokwi-pushbutton": [67, 45],
}
const DEFAULT_SIZE: [number, number] = [80, 80]

interface CircuitCanvasProps {
  diagramJson: string
  simulationPhase: SimulationPhase
  registerElementRef: (id: string, el: HTMLElement | null) => void
  elementRefs: Map<string, HTMLElement>
}

export function CircuitCanvas({
  diagramJson,
  simulationPhase,
  registerElementRef,
  elementRefs,
}: CircuitCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))
  const zoomReset = () => setZoom(1)

  // Counter bumped on each ref registration to trigger pin position recalculation
  const [refVersion, setRefVersion] = useState(0)

  // Wrap registerElementRef to bump refVersion on each registration
  const handleRegisterRef = useCallback(
    (id: string, el: HTMLElement | null) => {
      registerElementRef(id, el)
      setRefVersion((v) => v + 1)
    },
    [registerElementRef],
  )

  const diagram: DiagramJson | null = useMemo(() => {
    if (!diagramJson) return null
    try {
      return JSON.parse(diagramJson)
    } catch {
      return null
    }
  }, [diagramJson])

  // Calculate bounding box for auto-centering with known element sizes
  const { parts, minX, minY, scaleWidth, scaleHeight } = useMemo(() => {
    if (!diagram?.parts?.length) {
      return { parts: [] as DiagramPart[], minX: 0, minY: 0, scaleWidth: 400, scaleHeight: 300 }
    }

    let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity
    for (const part of diagram.parts) {
      const [w, h] = ELEMENT_SIZES[part.type] ?? DEFAULT_SIZE
      xMin = Math.min(xMin, part.left)
      yMin = Math.min(yMin, part.top)
      xMax = Math.max(xMax, part.left + w)
      yMax = Math.max(yMax, part.top + h)
    }

    return {
      parts: diagram.parts,
      minX: xMin - 20,
      minY: yMin - 20,
      scaleWidth: xMax - xMin + 40,
      scaleHeight: yMax - yMin + 40,
    }
  }, [diagram])

  // Compute pin positions from element refs
  const pinPositionMap = useMemo(() => {
    if (!parts.length) return new Map<string, { x: number; y: number }>()
    return buildPinPositionMap(parts, elementRefs, minX, minY)
  }, [parts, refVersion, minX, minY, elementRefs])

  // Wokwi custom elements (lit-element) need a render cycle before pinInfo
  // is available. Re-trigger pin computation after elements have initialized.
  useEffect(() => {
    if (!parts.length) return
    const timer = setTimeout(() => setRefVersion((v) => v + 1), 150)
    return () => clearTimeout(timer)
  }, [parts])

  // Resolve connections to absolute coordinates
  const resolvedConnections = useMemo(() => {
    if (!diagram?.connections?.length) return []
    return resolveConnections(diagram.connections, pinPositionMap)
  }, [diagram?.connections, pinPositionMap])

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
        <div className="absolute top-2 right-2 z-30">
          <StatusBadge phase={simulationPhase} />
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1 rounded-lg border border-border bg-background/90 backdrop-blur-sm shadow-sm p-1">
        <button
          onClick={zoomOut}
          disabled={zoom <= ZOOM_MIN}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={zoomReset}
          className="px-1.5 py-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-medium min-w-[3rem] text-center tabular-nums transition-colors"
          title="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {/* Parts container */}
      <div
        className="relative origin-top-left transition-transform duration-150"
        style={{
          minWidth: scaleWidth,
          minHeight: scaleHeight,
          transform: `scale(${zoom})`,
        }}
      >
        {/* Wokwi elements */}
        {parts.map((part) => (
          <WokwiElement
            key={part.id}
            part={part}
            offsetX={minX}
            offsetY={minY}
            registerRef={handleRegisterRef}
          />
        ))}

        {/* z-20: Wire overlay */}
        <WireOverlay
          connections={resolvedConnections}
          width={scaleWidth}
          height={scaleHeight}
        />
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
        zIndex: 10,
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
