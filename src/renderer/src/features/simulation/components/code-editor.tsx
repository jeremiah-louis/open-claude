import { useRef, useEffect, useCallback } from "react"
import Editor, { loader, type OnMount } from "@monaco-editor/react"
import * as monaco from "monaco-editor"
import type { editor as monacoEditor } from "monaco-editor"
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import {
  arduinoLanguageId,
  arduinoLanguageConfig,
  arduinoLanguageDef,
} from "../languages/arduino-language"

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
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null)
  const isProgrammaticRef = useRef(false)
  const onCodeChangeRef = useRef(onCodeChange)
  onCodeChangeRef.current = onCodeChange

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

    // Push current code into editor on mount (catches content that arrived before mount)
    if (code) {
      isProgrammaticRef.current = true
      model?.setValue(code)
      isProgrammaticRef.current = false
    }
  }

  // Push code changes into the editor via ref (never use the controlled `value` prop)
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const model = editor.getModel()
    if (!model) return

    if (model.getValue() === code) return

    isProgrammaticRef.current = true
    if (isStreaming) {
      // During streaming: use executeEdits to preserve undo stack and scroll position
      const fullRange = model.getFullModelRange()
      editor.executeEdits("streaming", [
        { range: fullRange, text: code, forceMoveMarkers: true },
      ])
      editor.revealLine(model.getLineCount())
    } else {
      // After streaming: simple setValue
      model.setValue(code)
    }
    isProgrammaticRef.current = false
  }, [code, isStreaming])

  // Toggle readOnly when streaming starts/stops
  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly: isStreaming })
  }, [isStreaming])

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="cpp"
        theme="vs-dark"
        onMount={handleEditorMount}
        options={{
          readOnly: isStreaming,
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
  )
}
