"use client"

import React from "react"

import { useState, useMemo } from "react"
import {
  Search,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Database,
  Mail,
  Calculator,
  Shield,
  Clock,
  FileText,
  Box,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { useFunctionStore, categories, type FunctionDefinition } from "@/lib/function-store"

const categoryIcons: Record<string, React.ElementType> = {
  data: Database,
  communication: Mail,
  logic: Calculator,
  security: Shield,
  time: Clock,
  document: FileText,
}

type SortOption = "name" | "category" | "updated"

interface FunctionLibraryEditorProps {
  onClose: () => void
}

export function FunctionLibraryEditor({ onClose }: FunctionLibraryEditorProps) {
  const { functions, addFunction, updateFunction, deleteFunction } = useFunctionStore()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState<SortOption>("name")
  const [selectedFunction, setSelectedFunction] = useState<FunctionDefinition | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [functionToDelete, setFunctionToDelete] = useState<FunctionDefinition | null>(null)

  // Edit form state
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editCode, setEditCode] = useState("")

  // New function form state
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newCategory, setNewCategory] = useState("logic")

  const filteredAndSortedFunctions = useMemo(() => {
    let result = functions.filter((fn) => {
      const matchesSearch =
        fn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fn.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || fn.category === selectedCategory
      return matchesSearch && matchesCategory
    })

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "category":
          return a.category.localeCompare(b.category)
        case "updated":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        default:
          return 0
      }
    })

    return result
  }, [functions, searchQuery, selectedCategory, sortBy])

  const handleSelectFunction = (fn: FunctionDefinition) => {
    setSelectedFunction(fn)
    setEditName(fn.name)
    setEditDescription(fn.description)
    setEditCategory(fn.category)
    setEditCode(fn.code)
    setIsEditing(false)
  }

  const handleSaveEdit = () => {
    if (selectedFunction) {
      updateFunction(selectedFunction.id, {
        name: editName,
        description: editDescription,
        category: editCategory,
        code: editCode,
      })
      setSelectedFunction({
        ...selectedFunction,
        name: editName,
        description: editDescription,
        category: editCategory,
        code: editCode,
      })
      setIsEditing(false)
    }
  }

  const handleCreateFunction = () => {
    if (newName.trim()) {
      const newFn = {
        name: newName.trim(),
        description: newDescription.trim() || "No description",
        category: newCategory,
        code: `def ${newName.toLowerCase().replace(/\s+/g, "_")}():\n    \"""\n    TODO: Add description\n    \"""\n    pass`,
      }
      addFunction(newFn)
      setShowNewDialog(false)
      setNewName("")
      setNewDescription("")
      setNewCategory("logic")
    }
  }

  const handleDeleteFunction = () => {
    if (functionToDelete) {
      deleteFunction(functionToDelete.id)
      if (selectedFunction?.id === functionToDelete.id) {
        setSelectedFunction(null)
      }
      setFunctionToDelete(null)
      setShowDeleteDialog(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    const Icon = categoryIcons[category] || Box
    return <Icon className="h-4 w-4" />
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Flow Builder
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-semibold">Function Library Editor</h1>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Function
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Function List Panel */}
        <div className="w-80 border-r border-border flex flex-col bg-card/50">
          {/* Search and Filters */}
          <div className="p-4 space-y-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search functions..."
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    Sort by Name {sortBy === "name" && "•"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("category")}>
                    Sort by Category {sortBy === "category" && "•"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("updated")}>
                    Sort by Updated {sortBy === "updated" && "•"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Function List */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredAndSortedFunctions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No functions found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAndSortedFunctions.map((fn) => (
                  <div
                    key={fn.id}
                    onClick={() => handleSelectFunction(fn)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedFunction?.id === fn.id
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <div className="text-muted-foreground">
                      {getCategoryIcon(fn.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{fn.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {fn.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
            {filteredAndSortedFunctions.length} of {functions.length} functions
          </div>
        </div>

        {/* Editor Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFunction ? (
            <>
              {/* Function Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-card/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {getCategoryIcon(selectedFunction.category)}
                  </div>
                  <div>
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="font-semibold text-lg h-8"
                      />
                    ) : (
                      <h2 className="font-semibold text-lg">{selectedFunction.name}</h2>
                    )}
                    {isEditing ? (
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="text-sm text-muted-foreground h-7 mt-1"
                        placeholder="Description"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {selectedFunction.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((c) => c.id !== "all")
                            .map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleSaveEdit}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                        onClick={() => {
                          setFunctionToDelete(selectedFunction)
                          setShowDeleteDialog(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 overflow-hidden p-4">
                <div className="h-full rounded-lg border border-border bg-[#1e1e1e] overflow-hidden flex flex-col">
                  <div className="px-4 py-2 border-b border-border/50 bg-[#252526] flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                      <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {selectedFunction.name.toLowerCase().replace(/\s+/g, "_")}.py
                    </span>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <Textarea
                      value={isEditing ? editCode : selectedFunction.code}
                      onChange={(e) => setEditCode(e.target.value)}
                      readOnly={!isEditing}
                      className="h-full min-h-[400px] w-full resize-none border-0 bg-transparent font-mono text-sm leading-relaxed p-4 focus-visible:ring-0 text-[#d4d4d4]"
                      style={{
                        tabSize: 4,
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Box className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a function to view and edit its code</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Function Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Function</DialogTitle>
            <DialogDescription>
              Add a new function to the library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Function Name</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Process Payment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-description">Description</Label>
              <Input
                id="new-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of what the function does"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category">Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.id !== "all")
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFunction} disabled={!newName.trim()}>
              Create Function
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Function</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{functionToDelete?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFunction}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
