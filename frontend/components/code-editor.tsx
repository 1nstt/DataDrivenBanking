"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react"
import type { editor } from "monaco-editor"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  readOnly?: boolean
  className?: string
}

export function CodeEditor({
  value,
  onChange,
  language = "python",
  readOnly = false,
  className,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Define custom dark theme
    monaco.editor.defineTheme("custom-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6a737d", fontStyle: "italic" },
        { token: "keyword", foreground: "ff79c6" },
        { token: "string", foreground: "a5d6ff" },
        { token: "number", foreground: "79c0ff" },
        { token: "function", foreground: "d2a8ff" },
        { token: "variable", foreground: "ffa657" },
        { token: "type", foreground: "7ee787" },
        { token: "class", foreground: "7ee787" },
        { token: "decorator", foreground: "d2a8ff" },
      ],
      colors: {
        "editor.background": "#0d1117",
        "editor.foreground": "#c9d1d9",
        "editor.lineHighlightBackground": "#161b22",
        "editor.selectionBackground": "#264f78",
        "editorCursor.foreground": "#c9d1d9",
        "editorLineNumber.foreground": "#484f58",
        "editorLineNumber.activeForeground": "#c9d1d9",
        "editor.inactiveSelectionBackground": "#264f7855",
        "editorIndentGuide.background": "#21262d",
        "editorIndentGuide.activeBackground": "#30363d",
        "editorGutter.background": "#0d1117",
        "scrollbar.shadow": "#0000",
        "scrollbarSlider.background": "#484f5833",
        "scrollbarSlider.hoverBackground": "#484f5855",
        "scrollbarSlider.activeBackground": "#484f5877",
      },
    })

    monaco.editor.setTheme("custom-dark")

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: "line",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      smoothScrolling: true,
      padding: { top: 16, bottom: 16 },
      lineNumbers: "on",
      glyphMargin: false,
      folding: true,
      lineDecorationsWidth: 16,
      lineNumbersMinChars: 4,
      automaticLayout: true,
      tabSize: 4,
      insertSpaces: true,
      wordWrap: "off",
      contextmenu: true,
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: "on",
      tabCompletion: "on",
      wordBasedSuggestions: "currentDocument",
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
    })
  }

  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue)
    }
  }

  return (
    <div className={cn("h-full w-full overflow-hidden rounded-lg bg-[#0d1117]", className)}>
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          readOnly,
          domReadOnly: readOnly,
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-[#0d1117] text-zinc-500">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
              <span className="text-sm">Loading editor...</span>
            </div>
          </div>
        }
      />
    </div>
  )
}
