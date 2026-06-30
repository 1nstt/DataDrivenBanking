"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"
import { DiffEditor, type Monaco } from "@monaco-editor/react"
import type { editor } from "monaco-editor"

interface CodeDiffEditorProps {
  original: string
  modified: string
  language?: string
  className?: string
}

export function CodeDiffEditor({
  original,
  modified,
  language = "python",
  className,
}: CodeDiffEditorProps) {
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)

  const handleEditorMount = (editor: editor.IStandaloneDiffEditor, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Define custom dark theme for diff
    monaco.editor.defineTheme("custom-dark-diff", {
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
        "diffEditor.insertedTextBackground": "#23863633",
        "diffEditor.removedTextBackground": "#f8514933",
        "diffEditor.insertedLineBackground": "#23863622",
        "diffEditor.removedLineBackground": "#f8514922",
        "diffEditorGutter.insertedLineBackground": "#238636",
        "diffEditorGutter.removedLineBackground": "#f85149",
        "editorGutter.background": "#0d1117",
        "scrollbar.shadow": "#0000",
      },
    })

    monaco.editor.setTheme("custom-dark-diff")
  }

  return (
    <div className={cn("h-full w-full overflow-hidden rounded-lg bg-[#0d1117]", className)}>
      <DiffEditor
        height="100%"
        language={language}
        original={original}
        modified={modified}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          readOnly: true,
          renderSideBySide: true,
          enableSplitViewResizing: true,
          renderOverviewRuler: false,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          lineNumbers: "on",
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 12,
          lineNumbersMinChars: 3,
          automaticLayout: true,
          wordWrap: "off",
          diffWordWrap: "off",
          ignoreTrimWhitespace: false,
          renderIndicators: true,
          originalEditable: false,
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-[#0d1117] text-zinc-500">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
              <span className="text-sm">Loading diff viewer...</span>
            </div>
          </div>
        }
      />
    </div>
  )
}
