"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Box, GitBranch, Plus, Search, Database, Mail, Calculator, Shield, Clock, FileText, Zap, Settings } from "lucide-react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useFunctionStore, categories as storeCategories } from "@/lib/function-store"

const categoryIcons: Record<string, React.ElementType> = {
  all: Box,
  calculations: Calculator,
  rulesets: Shield,
  engine: GitBranch,
  data: Database,
  communication: Mail,
  logic: Calculator,
  security: Shield,
  time: Clock,
  document: FileText,
}

const categories = storeCategories.map((cat) => ({
  ...cat,
  icon: categoryIcons[cat.id] || Box,
}))

interface NodesSidebarProps {
  onAddNode: (type: string, functionName?: string) => void
}

export function NodesSidebar({ onAddNode }: NodesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const functions = useFunctionStore((state) => state.functions)

  const filteredFunctions = useMemo(() => {
    return functions.filter((fn) => {
      const matchesSearch =
        fn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fn.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || fn.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [functions, searchQuery, selectedCategory])

  const onDragStart = (event: React.DragEvent, nodeType: string, functionName?: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType)
    if (functionName) {
      event.dataTransfer.setData("functionName", functionName)
    }
    event.dataTransfer.effectAllowed = "move"
  }

  const handleAddFunction = (functionName: string) => {
    onAddNode("function", functionName)
  }

  const handleAddDecision = () => {
    onAddNode("decision")
  }

  return (
    <div className="absolute left-4 top-4 bottom-4 z-10 w-72 flex flex-col">
      <Card className="bg-card border-border p-4 flex flex-col h-full overflow-hidden">
        <h2 className="text-lg font-semibold mb-3 text-foreground">Nodes</h2>

        {/* Decision Node */}
        <div className="mb-4">
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors">
            <div
              draggable
              onDragStart={(e) => onDragStart(e, "decision")}
              className="flex items-center gap-3 flex-1 cursor-move"
            >
              <GitBranch className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Decision Node</div>
                <div className="text-xs text-muted-foreground">If / else condition</div>
              </div>
            </div>
            <Button
              onClick={handleAddDecision}
              size="sm"
              variant="ghost"
              className="shrink-0"
              type="button"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Function Library Header */}
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Function Library</span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search functions..."
            className="pl-9"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1 mb-3">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              size="sm"
              variant={selectedCategory === cat.id ? "default" : "outline"}
              className="text-xs px-2 py-1 h-7"
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Function List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filteredFunctions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No functions found
            </div>
          ) : (
            filteredFunctions.map((fn) => (
              <div
                key={fn.id}
                draggable
                onDragStart={(e) => onDragStart(e, "function", fn.name)}
                className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors cursor-move group"
              >
                <Box className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{fn.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{fn.description}</div>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddFunction(fn.name)
                  }}
                  size="sm"
                  variant="ghost"
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
