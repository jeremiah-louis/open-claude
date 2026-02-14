import type { PipelinePhase } from "../../orchestrator/use-orchestrator"

interface PipelineStatusBarProps {
  phase: PipelinePhase
  debugAttempt: number
}

export function PipelineStatusBar({ phase, debugAttempt }: PipelineStatusBarProps) {
  if (phase === "idle") return null

  const config: Record<string, { label: string; color: string; animate: boolean }> = {
    compiling: {
      label: "Compiling...",
      color: "text-yellow-500",
      animate: true,
    },
    running: {
      label: "Simulation running",
      color: "text-green-500",
      animate: false,
    },
    "auto-debugging": {
      label: `Auto-debugging (${debugAttempt}/3)`,
      color: "text-orange-500",
      animate: true,
    },
    error: {
      label: "Compilation failed",
      color: "text-red-500",
      animate: false,
    },
  }

  const { label, color, animate } = config[phase] || config.error

  return (
    <div className="flex items-center gap-2 px-3 py-1 text-xs">
      {animate && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color.replace("text-", "bg-")}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${color.replace("text-", "bg-")}`} />
        </span>
      )}
      {!animate && phase === "running" && (
        <span className="w-2 h-2 rounded-full bg-green-500" />
      )}
      {!animate && phase === "error" && (
        <span className="w-2 h-2 rounded-full bg-red-500" />
      )}
      <span className={color}>{label}</span>
    </div>
  )
}
