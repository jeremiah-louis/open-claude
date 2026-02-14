export type SimulationPhase =
  | "IDLE"
  | "COMPILING"
  | "COMPILE_ERROR"
  | "LOADING"
  | "RUNNING"
  | "STOPPED"

export interface SimulationState {
  phase: SimulationPhase
  error: string | null
  serialOutput: string
  code: string
  diagramJson: string
}

export type SimulationAction =
  | { type: "START_COMPILE" }
  | { type: "COMPILE_SUCCESS" }
  | { type: "COMPILE_ERROR"; payload: string }
  | { type: "START_LOADING" }
  | { type: "START_RUNNING" }
  | { type: "STOP" }
  | { type: "SERIAL_OUTPUT"; payload: string }
  | { type: "CLEAR_SERIAL" }
  | { type: "SET_CODE"; payload: string }
  | { type: "SET_DIAGRAM"; payload: string }
  | { type: "RESET" }

export interface DiagramJson {
  version: number
  author?: string
  editor?: string
  parts: DiagramPart[]
  connections?: DiagramConnection[]
}

export interface DiagramPart {
  type: string
  id: string
  top: number
  left: number
  attrs?: Record<string, string>
}

export type DiagramConnection = [string, string, string, string[]]
