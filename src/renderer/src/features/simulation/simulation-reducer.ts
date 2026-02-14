import type { SimulationState, SimulationAction } from "./types"

export const initialSimulationState: SimulationState = {
  phase: "IDLE",
  error: null,
  serialOutput: "",
  code: "",
  diagramJson: "",
}

export function simulationReducer(
  state: SimulationState,
  action: SimulationAction,
): SimulationState {
  switch (action.type) {
    case "START_COMPILE":
      return { ...state, phase: "COMPILING", error: null }

    case "COMPILE_SUCCESS":
      return { ...state, phase: "LOADING" }

    case "COMPILE_ERROR":
      return { ...state, phase: "COMPILE_ERROR", error: action.payload }

    case "START_LOADING":
      return { ...state, phase: "LOADING" }

    case "START_RUNNING":
      return { ...state, phase: "RUNNING", error: null, serialOutput: "" }

    case "STOP":
      return { ...state, phase: "STOPPED" }

    case "SERIAL_OUTPUT":
      return { ...state, serialOutput: state.serialOutput + action.payload }

    case "CLEAR_SERIAL":
      return { ...state, serialOutput: "" }

    case "SET_CODE":
      return { ...state, code: action.payload }

    case "SET_DIAGRAM":
      return { ...state, diagramJson: action.payload }

    case "RESET":
      return { ...initialSimulationState }

    default:
      return state
  }
}
