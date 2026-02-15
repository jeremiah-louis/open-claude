import type { DiagramPart, DiagramConnection } from "../types"

export interface PinEndpoint {
  partId: string
  pinName: string
}

export interface Point {
  x: number
  y: number
}

export interface ResolvedConnection {
  from: Point
  to: Point
  color: string
}

export interface ElementPin {
  name: string
  x: number
  y: number
}

/**
 * Parse a connection endpoint string like "uno:13" into partId + pinName.
 */
export function parseEndpoint(endpoint: string): PinEndpoint {
  const colonIdx = endpoint.indexOf(":")
  if (colonIdx === -1) {
    return { partId: endpoint, pinName: "" }
  }
  return {
    partId: endpoint.slice(0, colonIdx),
    pinName: endpoint.slice(colonIdx + 1),
  }
}

/**
 * Build a map of "partId:pinName" → absolute {x, y} position.
 * Uses pinInfo from Wokwi custom elements to get pin coordinates
 * relative to the element's top-left corner.
 */
export function buildPinPositionMap(
  parts: DiagramPart[],
  elementRefs: Map<string, HTMLElement>,
  offsetX: number,
  offsetY: number,
): Map<string, Point> {
  const map = new Map<string, Point>()

  for (const part of parts) {
    const el = elementRefs.get(part.id)
    if (!el) continue

    const pinInfo: ElementPin[] | undefined = (el as any).pinInfo
    if (!pinInfo) continue

    for (const pin of pinInfo) {
      const key = `${part.id}:${pin.name}`
      map.set(key, {
        x: part.left - offsetX + pin.x,
        y: part.top - offsetY + pin.y,
      })
    }
  }

  return map
}

/**
 * Resolve diagram connections into absolute coordinates + colors.
 * Each DiagramConnection is [endpoint1, endpoint2, color, extraFlags].
 */
export function resolveConnections(
  connections: DiagramConnection[],
  pinMap: Map<string, Point>,
): ResolvedConnection[] {
  const resolved: ResolvedConnection[] = []

  for (const conn of connections) {
    const [ep1, ep2, color] = conn
    const from = resolveEndpoint(ep1, pinMap)
    const to = resolveEndpoint(ep2, pinMap)

    if (from && to) {
      resolved.push({ from, to, color: color || "green" })
    }
  }

  return resolved
}

function resolveEndpoint(
  endpoint: string,
  pinMap: Map<string, Point>,
): Point | null {
  const { partId, pinName } = parseEndpoint(endpoint)
  const key = `${partId}:${pinName}`
  return pinMap.get(key) ?? null
}
