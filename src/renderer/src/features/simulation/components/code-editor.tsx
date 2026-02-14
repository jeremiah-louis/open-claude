import { useRef, useEffect } from "react"
import Editor, { loader, type OnMount } from "@monaco-editor/react"
import * as monaco from "monaco-editor"
import type { editor as monacoEditor } from "monaco-editor"
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import {
  arduinoLanguageId,
  arduinoLanguageConfig,
  arduinoLanguageDef,
} from "../languages/arduino-language"
import { useTheme } from "@/hooks/use-theme"

// Configure Monaco workers and use locally bundled instance (CSP blocks CDN)
self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  },
}
loader.config({ monaco })

// Register Arduino language once
let languageRegistered = false
function registerArduinoLanguage(monaco: Parameters<OnMount>[1]) {
  if (languageRegistered) return
  languageRegistered = true
  monaco.languages.register({ id: arduinoLanguageId })
  monaco.languages.setLanguageConfiguration(arduinoLanguageId, arduinoLanguageConfig)
  monaco.languages.setMonarchTokensProvider(arduinoLanguageId, arduinoLanguageDef)
}

interface CodeEditorProps {
  code: string
  isStreaming: boolean
  onCodeChange?: (code: string) => void
}

export function CodeEditor({ code, isStreaming, onCodeChange }: CodeEditorProps) {
  const { theme } = useTheme()
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null)
  const isProgrammaticRef = useRef(false)
  const onCodeChangeRef = useRef(onCodeChange)
  onCodeChangeRef.current = onCodeChange
  const preRef = useRef<HTMLPreElement>(null)

  // Keep a ref to the latest code so the mount handler can access it
  const codeRef = useRef(code)
  codeRef.current = code

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
    registerArduinoLanguage(monacoInstance)

    const model = editor.getModel()
    if (model) {
      monacoInstance.editor.setModelLanguage(model, arduinoLanguageId)
    }

    // Fire callback for user-initiated edits only
    editor.onDidChangeModelContent(() => {
      if (isProgrammaticRef.current) return
      const value = editor.getValue()
      onCodeChangeRef.current?.(value)
    })

    // Push latest code into editor on mount (catches content that arrived while unmounted)
    const latestCode = codeRef.current
    if (latestCode) {
      isProgrammaticRef.current = true
      model?.setValue(latestCode)
      isProgrammaticRef.current = false
    }
  }

  // When streaming ends, push the final code into Monaco
  useEffect(() => {
    if (isStreaming) return
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return
    const currentValue = model.getValue()
    if (currentValue === code) return
    isProgrammaticRef.current = true
    model.setValue(code)
    isProgrammaticRef.current = false
  }, [isStreaming, code])

  // For non-streaming code changes (e.g. user edits from outside, simulation code)
  useEffect(() => {
    if (isStreaming) return
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return
    const currentValue = model.getValue()
    if (currentValue === code) return
    isProgrammaticRef.current = true
    model.setValue(code)
    isProgrammaticRef.current = false
  }, [code, isStreaming])

  // Auto-scroll the <pre> to the bottom while streaming
  useEffect(() => {
    if (isStreaming && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight
    }
  }, [code, isStreaming])

  const isDark = theme === "dark"

  return (
    <div className="h-full w-full relative">
      {/* Lightweight <pre> overlay while streaming — avoids Monaco overhead */}
      {isStreaming && (
        <div
          className="absolute inset-0 z-10 overflow-hidden"
          style={{
            background: isDark ? "#1e1e1e" : "#fffffe",
          }}
        >
          <pre
            ref={preRef}
            className="h-full overflow-y-auto m-0 px-[62px] py-2"
            style={{
              fontFamily: "Menlo, Monaco, 'Courier New', monospace",
              fontSize: 13,
              lineHeight: "18px",
              color: isDark ? "#d4d4d4" : "#1e1e1e",
              tabSize: 2,
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          >
            {code}
            <span className="inline-block w-[2px] h-[14px] ml-[1px] align-middle animate-pulse"
              style={{ background: isDark ? "#d4d4d4" : "#1e1e1e" }}
            />
          </pre>
        </div>
      )}

      {/* Monaco editor — always mounted but hidden during streaming */}
      <div className={isStreaming ? "invisible h-full w-full" : "h-full w-full"}>
        <Editor
          height="100%"
          defaultLanguage="cpp"
          theme={isDark ? "vs-dark" : "light"}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            padding: { top: 8 },
            renderLineHighlight: "none",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  )
}
