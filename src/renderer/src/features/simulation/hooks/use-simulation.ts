import { useReducer, useCallback, useRef } from "react"
import {
  simulationReducer,
  initialSimulationState,
} from "../simulation-reducer"
import { buildHex } from "../avr/compile"
import { AVRRunner } from "../avr/avr-runner"
import { wirePeripherals, type WiredPeripherals } from "../peripherals/wire-peripherals"
import type { DiagramJson } from "../types"

export function useSimulation() {
  const [state, dispatch] = useReducer(simulationReducer, initialSimulationState)

  const runnerRef = useRef<AVRRunner | null>(null)
  const wiredRef = useRef<WiredPeripherals | null>(null)
  const elementRefsRef = useRef<Map<string, HTMLElement>>(new Map())

  const stop = useCallback(() => {
    wiredRef.current?.cleanup()
    wiredRef.current = null
    runnerRef.current?.stop()
    runnerRef.current = null
    dispatch({ type: "STOP" })
  }, [])

  const compileAndRun = useCallback(
    async (code: string, diagramJsonStr: string) => {
      // Stop any running simulation
      if (runnerRef.current) {
        stop()
      }

      dispatch({ type: "SET_CODE", payload: code })
      dispatch({ type: "SET_DIAGRAM", payload: diagramJsonStr })
      dispatch({ type: "START_COMPILE" })

      try {
        const result = await buildHex(code)

        if (result.stderr && !result.hex) {
          dispatch({ type: "COMPILE_ERROR", payload: result.stderr })
          return { success: false, error: result.stderr }
        }

        if (!result.hex) {
          const error = result.stdout || "Compilation produced no output"
          dispatch({ type: "COMPILE_ERROR", payload: error })
          return { success: false, error }
        }

        dispatch({ type: "COMPILE_SUCCESS" })

        // Parse diagram
        let diagram: DiagramJson
        try {
          diagram = JSON.parse(diagramJsonStr)
        } catch {
          // Use minimal default diagram
          diagram = {
            version: 1,
            parts: [
              { type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0 },
            ],
          }
        }

        // Create runner and wire peripherals
        const runner = new AVRRunner(result.hex)
        runnerRef.current = runner

        const wired = wirePeripherals(
          runner,
          diagram,
          elementRefsRef.current,
          (char) => {
            dispatch({ type: "SERIAL_OUTPUT", payload: char })
          },
        )
        wiredRef.current = wired

        dispatch({ type: "START_RUNNING" })
        return { success: true, error: null }
      } catch (err: any) {
        const errorMsg = err?.message || "Unknown compilation error"
        dispatch({ type: "COMPILE_ERROR", payload: errorMsg })
        return { success: false, error: errorMsg }
      }
    },
    [stop],
  )

  const serialWrite = useCallback((data: string) => {
    runnerRef.current?.serialWrite(data)
  }, [])

  const registerElementRef = useCallback(
    (id: string, el: HTMLElement | null) => {
      if (el) {
        elementRefsRef.current.set(id, el)
      } else {
        elementRefsRef.current.delete(id)
      }
    },
    [],
  )

  return {
    state,
    compileAndRun,
    stop,
    serialWrite,
    registerElementRef,
    elementRefs: elementRefsRef.current,
  }
}
