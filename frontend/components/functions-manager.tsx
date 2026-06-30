"use client"

import React from "react"

import { useState, useMemo } from "react"
import {
  Search,
  Plus,
  Box,
  Database,
  Mail,
  Calculator,
  Shield,
  Clock,
  FileText,
  ArrowUpDown,
  ChevronDown,
  Trash2,
  Save,
  X,
  Code,
  ArrowLeft,
  GitBranch,
  Eye,
  RotateCcw,
  Send,
  XCircle,
  History,
  CheckCircle2,
  PenLine,
  FileCheck,
  Archive,
  ChevronRight,
  Settings2,
  PanelRight,
  PanelRightClose
} from "lucide-react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { ScrollArea } from "./ui/scroll-area"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import type { FunctionDefinition } from "@/lib/function-store"
import { functionLibrary } from "@/lib/function-store"
import { CodeEditor } from "./code-editor"
import { CodeDiffEditor } from "./code-diff-editor"

// Version Status Types
type VersionStatus = "production" | "draft" | "in_review" | "archived"

interface Version {
  id: string
  code: string
  status: VersionStatus
  author: string
  message: string
  createdAt: Date
}

interface FunctionWithVersions extends FunctionDefinition {
  versions: Version[]
  currentVersionId: string
}

const categories = [
  { id: "all", label: "All", icon: Box },
  { id: "data", label: "Data", icon: Database },
  { id: "communication", label: "Communication", icon: Mail },
  { id: "logic", label: "Logic", icon: Calculator },
  { id: "security", label: "Security", icon: Shield },
  { id: "time", label: "Time", icon: Clock },
  { id: "document", label: "Documents", icon: FileText },
]

const statusConfig: Record<VersionStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  production: { 
    label: "Production", 
    color: "text-emerald-400", 
    bgColor: "bg-emerald-500/10 border-emerald-500/30",
    icon: CheckCircle2 
  },
  draft: { 
    label: "Draft", 
    color: "text-amber-400", 
    bgColor: "bg-amber-500/10 border-amber-500/30",
    icon: PenLine 
  },
  in_review: { 
    label: "In Review", 
    color: "text-blue-400", 
    bgColor: "bg-blue-500/10 border-blue-500/30",
    icon: FileCheck 
  },
  archived: { 
    label: "Archived", 
    color: "text-zinc-400", 
    bgColor: "bg-zinc-500/10 border-zinc-500/30",
    icon: Archive 
  },
}

type SortField = "name" | "category" | "updatedAt"
type SortOrder = "asc" | "desc"

interface FunctionsManagerProps {
  onBack: () => void
}

// Helper to convert original functions to versioned functions
function initializeVersionedFunctions(fns: FunctionDefinition[]): FunctionWithVersions[] {
  return fns.map((fn) => {
    const productionVersion: Version = {
      id: `v-${fn.id}-1`,
      code: fn.code,
      status: "production",
      author: "System",
      message: "Initial version",
      createdAt: fn.updatedAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    }
    return {
      ...fn,
      versions: [productionVersion],
      currentVersionId: productionVersion.id,
    }
  })
}

// Helper to get relative time
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  return date.toLocaleDateString()
}

export function FunctionsManager({ onBack }: FunctionsManagerProps) {
  const [functions, setFunctions] = useState<FunctionWithVersions[]>(() => 
    initializeVersionedFunctions(functionLibrary)
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [selectedFunction, setSelectedFunction] = useState<FunctionWithVersions | null>(null)
  const [editedCode, setEditedCode] = useState("")
  const [editedName, setEditedName] = useState("")
  const [editedDescription, setEditedDescription] = useState("")
  const [editedCategory, setEditedCategory] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newFunctionName, setNewFunctionName] = useState("")
  const [newFunctionDescription, setNewFunctionDescription] = useState("")
  const [newFunctionCategory, setNewFunctionCategory] = useState("logic")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [functionToDelete, setFunctionToDelete] = useState<FunctionWithVersions | null>(null)
  const [activeTab, setActiveTab] = useState<"editor" | "diff" | "history">("editor")
  const [commitMessage, setCommitMessage] = useState("")
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<Version | null>(null)
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(true)
  const [historyAccordionOpen, setHistoryAccordionOpen] = useState(true)
  const [metadataAccordionOpen, setMetadataAccordionOpen] = useState(false)

  // Current working state
  const currentVersion = useMemo(() => {
    if (!selectedFunction) return null
    return selectedFunction.versions.find((v) => v.id === selectedFunction.currentVersionId)
  }, [selectedFunction])

  const productionVersion = useMemo(() => {
    if (!selectedFunction) return null
    return selectedFunction.versions.find((v) => v.status === "production")
  }, [selectedFunction])

  const draftVersion = useMemo(() => {
    if (!selectedFunction) return null
    return selectedFunction.versions.find((v) => v.status === "draft")
  }, [selectedFunction])

  const hasUnsavedChanges = useMemo(() => {
    if (!currentVersion) return false
    return editedCode !== currentVersion.code
  }, [editedCode, currentVersion])

  const currentStatus: VersionStatus = useMemo(() => {
    if (draftVersion) return "draft"
    if (currentVersion) return currentVersion.status
    return "production"
  }, [draftVersion, currentVersion])

  const filteredAndSortedFunctions = useMemo(() => {
    let result = functions.filter((fn) => {
      const matchesSearch =
        fn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fn.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === "all" || fn.category === categoryFilter
      return matchesSearch && matchesCategory
    })

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "category":
          comparison = a.category.localeCompare(b.category)
          break
        case "updatedAt":
          comparison = (a.updatedAt?.getTime() || 0) - (b.updatedAt?.getTime() || 0)
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [functions, searchQuery, categoryFilter, sortField, sortOrder])

  const handleSelectFunction = (fn: FunctionWithVersions) => {
    if (hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Discard them?")) {
        return
      }
    }
    setSelectedFunction(fn)
    const draft = fn.versions.find((v) => v.status === "draft")
    const production = fn.versions.find((v) => v.status === "production")
    const codeVersion = draft || production || fn.versions[0]
    setEditedCode(codeVersion?.code || fn.code)
    setEditedName(fn.name)
    setEditedDescription(fn.description)
    setEditedCategory(fn.category)
    setActiveTab("editor")
    setViewingVersion(null)
  }

  const handleCodeChange = (newCode: string) => {
    setEditedCode(newCode)
  }

  // Auto-save as draft
  const handleSaveDraft = () => {
    if (!selectedFunction || !productionVersion) return

    const existingDraft = selectedFunction.versions.find((v) => v.status === "draft")
    
    let updatedVersions: Version[]
    if (existingDraft) {
      updatedVersions = selectedFunction.versions.map((v) =>
        v.id === existingDraft.id
          ? { ...v, code: editedCode, createdAt: new Date(), message: "Auto-saved draft" }
          : v
      )
    } else {
      const newDraft: Version = {
        id: `v-${selectedFunction.id}-${Date.now()}`,
        code: editedCode,
        status: "draft",
        author: "Current User",
        message: "Draft changes",
        createdAt: new Date(),
      }
      updatedVersions = [newDraft, ...selectedFunction.versions]
    }

    const updatedFunction = {
      ...selectedFunction,
      versions: updatedVersions,
      updatedAt: new Date(),
    }

    setFunctions((prev) =>
      prev.map((fn) => (fn.id === selectedFunction.id ? updatedFunction : fn))
    )
    setSelectedFunction(updatedFunction)
  }

  // Send to QA (In Review)
  const handleSendToReview = () => {
    if (!selectedFunction || !commitMessage.trim()) return

    const draft = selectedFunction.versions.find((v) => v.status === "draft")
    if (!draft) return

    const updatedVersions = selectedFunction.versions.map((v) =>
      v.id === draft.id
        ? { ...v, status: "in_review" as VersionStatus, message: commitMessage, createdAt: new Date() }
        : v
    )

    const updatedFunction = {
      ...selectedFunction,
      versions: updatedVersions,
      updatedAt: new Date(),
    }

    setFunctions((prev) =>
      prev.map((fn) => (fn.id === selectedFunction.id ? updatedFunction : fn))
    )
    setSelectedFunction(updatedFunction)
    setCommitMessage("")
    setIsCommitDialogOpen(false)
  }

  // Discard draft
  const handleDiscardDraft = () => {
    if (!selectedFunction || !productionVersion) return
    if (!confirm("Are you sure you want to discard all draft changes?")) return

    const updatedVersions = selectedFunction.versions.filter((v) => v.status !== "draft")
    const updatedFunction = {
      ...selectedFunction,
      versions: updatedVersions,
    }

    setFunctions((prev) =>
      prev.map((fn) => (fn.id === selectedFunction.id ? updatedFunction : fn))
    )
    setSelectedFunction(updatedFunction)
    setEditedCode(productionVersion.code)
  }

  // Restore from history
  const handleRestoreVersion = (version: Version) => {
    if (!selectedFunction) return
    if (!confirm(`Restore version from ${getRelativeTime(version.createdAt)}? This will create a new draft.`)) return

    // Create new draft from old version
    const newDraft: Version = {
      id: `v-${selectedFunction.id}-${Date.now()}`,
      code: version.code,
      status: "draft",
      author: "Current User",
      message: `Restored from ${version.message || "previous version"}`,
      createdAt: new Date(),
    }

    // Remove existing draft if any
    const updatedVersions = [
      newDraft,
      ...selectedFunction.versions.filter((v) => v.status !== "draft"),
    ]

    const updatedFunction = {
      ...selectedFunction,
      versions: updatedVersions,
      updatedAt: new Date(),
    }

    setFunctions((prev) =>
      prev.map((fn) => (fn.id === selectedFunction.id ? updatedFunction : fn))
    )
    setSelectedFunction(updatedFunction)
    setEditedCode(version.code)
    setActiveTab("editor")
    setViewingVersion(null)
  }

  // View specific version
  const handleViewVersion = (version: Version) => {
    setViewingVersion(version)
    setActiveTab("editor")
  }

  // Create new edit from production
  const handleCreateNewEdit = () => {
    if (!selectedFunction || !productionVersion) return
    
    const newDraft: Version = {
      id: `v-${selectedFunction.id}-${Date.now()}`,
      code: productionVersion.code,
      status: "draft",
      author: "Current User",
      message: "New edit",
      createdAt: new Date(),
    }

    const updatedVersions = [newDraft, ...selectedFunction.versions]
    const updatedFunction = {
      ...selectedFunction,
      versions: updatedVersions,
    }

    setFunctions((prev) =>
      prev.map((fn) => (fn.id === selectedFunction.id ? updatedFunction : fn))
    )
    setSelectedFunction(updatedFunction)
    setEditedCode(productionVersion.code)
    setViewingVersion(null)
  }

  const handleCreateFunction = () => {
    if (!newFunctionName.trim()) return

    const initialCode = `def ${newFunctionName.toLowerCase().replace(/\s+/g, "_")}():
    """
    ${newFunctionDescription || "New function description"}
    """
    # Your code here
    pass`

    const productionVersion: Version = {
      id: `v-new-${Date.now()}-1`,
      code: initialCode,
      status: "production",
      author: "Current User",
      message: "Initial version",
      createdAt: new Date(),
    }

    const newFunction: FunctionWithVersions = {
      id: `fn-${Date.now()}`,
      name: newFunctionName.trim(),
      description: newFunctionDescription.trim() || "New function",
      category: newFunctionCategory,
      code: initialCode,
      updatedAt: new Date(),
      versions: [productionVersion],
      currentVersionId: productionVersion.id,
    }

    setFunctions((prev) => [newFunction, ...prev])
    setNewFunctionName("")
    setNewFunctionDescription("")
    setNewFunctionCategory("logic")
    setIsCreateDialogOpen(false)
    handleSelectFunction(newFunction)
  }

  const handleDeleteFunction = () => {
    if (!functionToDelete) return

    setFunctions((prev) => prev.filter((fn) => fn.id !== functionToDelete.id))
    if (selectedFunction?.id === functionToDelete.id) {
      setSelectedFunction(null)
      setEditedCode("")
    }
    setFunctionToDelete(null)
    setIsDeleteDialogOpen(false)
  }

  const handleCloseEditor = () => {
    if (hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Discard them?")) {
        return
      }
    }
    setSelectedFunction(null)
    setEditedCode("")
    setViewingVersion(null)
  }

  const getCategoryIcon = (category: string) => {
    const cat = categories.find((c) => c.id === category)
    return cat?.icon || Box
  }

  const getCategoryLabel = (category: string) => {
    const cat = categories.find((c) => c.id === category)
    return cat?.label || category
  }

  const StatusBadge = ({ status }: { status: VersionStatus }) => {
    const config = statusConfig[status]
    const Icon = config.icon
    return (
      <Badge variant="outline" className={`${config.bgColor} ${config.color} gap-1.5`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card shrink-0">
          <div className="max-w-full mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Code className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">Function Library</h1>
                    <p className="text-sm text-muted-foreground">Create and manage Python functions</p>
                  </div>
                </div>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Function
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Function List */}
          <div className="w-96 border-r border-border flex flex-col bg-card/50">
            {/* Filters */}
            <div className="p-4 border-b border-border space-y-3">
              {/* Search */}
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
                {/* Category Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      {categoryFilter === "all" ? "All Categories" : getCategoryLabel(categoryFilter)}
                      <ChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {categories.map((cat) => (
                      <DropdownMenuItem key={cat.id} onClick={() => setCategoryFilter(cat.id)}>
                        <cat.icon className="h-4 w-4 mr-2" />
                        {cat.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSortField("name"); setSortOrder("asc") }}>
                      Name (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField("name"); setSortOrder("desc") }}>
                      Name (Z-A)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setSortField("category"); setSortOrder("asc") }}>
                      Category
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField("updatedAt"); setSortOrder("desc") }}>
                      Recently Modified
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Function Count */}
            <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
              {filteredAndSortedFunctions.length} function{filteredAndSortedFunctions.length !== 1 ? "s" : ""}
            </div>

            {/* Function List */}
            <div className="flex-1 overflow-y-auto">
              {filteredAndSortedFunctions.length === 0 ? (
                <div className="p-8 text-center">
                  <Box className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No functions found</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredAndSortedFunctions.map((fn) => {
                    const Icon = getCategoryIcon(fn.category)
                    const isSelected = selectedFunction?.id === fn.id
                    const hasDraft = fn.versions.some((v) => v.status === "draft")
                    const hasReview = fn.versions.some((v) => v.status === "in_review")
                    return (
                      <div
                        key={fn.id}
                        onClick={() => handleSelectFunction(fn)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                                {fn.name}
                              </span>
                              {hasDraft && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                              )}
                              {hasReview && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">{fn.description}</p>
                            <Badge variant="outline" className="mt-2 text-[10px] px-1.5 py-0">
                              {getCategoryLabel(fn.category)}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFunctionToDelete(fn)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Code Editor */}
          <div className="flex-1 flex overflow-hidden">
            {selectedFunction ? (
              <>
                {/* Editor Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Editor Header */}
                  <div className="border-b border-border p-4 flex items-center justify-between bg-card/30 shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-semibold text-foreground">{editedName}</h2>
                          <StatusBadge status={viewingVersion?.status || currentStatus} />
                          {hasUnsavedChanges && !viewingVersion && (
                            <span className="text-xs text-amber-500">Unsaved changes</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{editedDescription}</p>
                      </div>
                    </div>
                    
                    {/* Contextual Actions */}
                    <div className="flex items-center gap-2">
                      {viewingVersion ? (
                        <>
                          <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400">
                            Viewing: {viewingVersion.message || "Version"}
                          </Badge>
                          <Button variant="outline" onClick={() => handleRestoreVersion(viewingVersion)} className="bg-transparent">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore
                          </Button>
                          <Button variant="ghost" onClick={() => setViewingVersion(null)}>
                            Back to Editor
                          </Button>
                        </>
                      ) : currentStatus === "production" && !draftVersion ? (
                        <>
                          <Button onClick={handleCreateNewEdit}>
                            <PenLine className="h-4 w-4 mr-2" />
                            Create New Edit
                          </Button>
                        </>
                      ) : currentStatus === "draft" || draftVersion ? (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={handleSaveDraft} 
                            disabled={!hasUnsavedChanges}
                            className="bg-transparent"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Draft
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setActiveTab("diff")}
                            className="bg-transparent"
                          >
                            <GitBranch className="h-4 w-4 mr-2" />
                            View Changes
                          </Button>
                          <Button onClick={() => setIsCommitDialogOpen(true)}>
                            <Send className="h-4 w-4 mr-2" />
                            Send to QA
                          </Button>
                          <Button 
                            variant="ghost" 
                            onClick={handleDiscardDraft}
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Discard
                          </Button>
                        </>
                      ) : currentStatus === "in_review" ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                          Pending QA Review
                        </Badge>
                      ) : null}
                      <Button variant="ghost" size="icon" onClick={handleCloseEditor}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
                    <div className="border-b border-border px-4 bg-[#0d1117] shrink-0">
                      <TabsList className="bg-transparent h-10 p-0 gap-0">
                        <TabsTrigger 
                          value="editor" 
                          className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
                        >
                          <Code className="h-4 w-4 mr-2" />
                          Editor
                        </TabsTrigger>
                        <TabsTrigger 
                          value="diff"
                          className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
                        >
                          <GitBranch className="h-4 w-4 mr-2" />
                          Changes
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="editor" className="flex-1 overflow-hidden m-0 p-0">
                      {viewingVersion ? (
                        <CodeEditor
                          value={viewingVersion.code}
                          onChange={() => {}}
                          language="python"
                          readOnly
                          className="h-full"
                        />
                      ) : (
                        <CodeEditor
                          value={editedCode}
                          onChange={handleCodeChange}
                          language="python"
                          readOnly={currentStatus === "in_review" || currentStatus === "archived"}
                          className="h-full"
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="diff" className="flex-1 overflow-hidden m-0 p-0">
                      <div className="h-full flex flex-col">
                        <div className="flex items-center gap-4 px-4 py-2 bg-[#161b22] border-b border-zinc-800 text-sm shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">Original:</span>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                              Production
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">Modified:</span>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                              Draft
                            </Badge>
                          </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <CodeDiffEditor
                            original={productionVersion?.code || ""}
                            modified={editedCode}
                            language="python"
                            className="h-full"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* History Panel - Collapsible */}
                {isHistoryPanelOpen ? (
                  <div className="w-72 border-l border-border bg-card/30 flex flex-col shrink-0">
                    {/* Panel Header */}
                    <div className="p-3 border-b border-border flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Details</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={() => setIsHistoryPanelOpen(false)}
                      >
                        <PanelRightClose className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-2">
                        {/* Metadata Accordion */}
                        <Collapsible open={metadataAccordionOpen} onOpenChange={setMetadataAccordionOpen}>
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${metadataAccordionOpen ? "rotate-90" : ""}`} />
                            <Settings2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">Metadata</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="pl-8 pr-2 pb-2 space-y-3">
                              <div>
                                <label className="text-xs text-muted-foreground">Name</label>
                                <p className="text-sm text-foreground">{editedName}</p>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Category</label>
                                <p className="text-sm text-foreground">{getCategoryLabel(editedCategory)}</p>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Description</label>
                                <p className="text-sm text-foreground">{editedDescription}</p>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Current Status</label>
                                <div className="mt-1">
                                  <StatusBadge status={currentStatus} />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Last Updated</label>
                                <p className="text-sm text-foreground">
                                  {selectedFunction.updatedAt ? getRelativeTime(selectedFunction.updatedAt) : "Unknown"}
                                </p>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Version History Accordion */}
                        <Collapsible open={historyAccordionOpen} onOpenChange={setHistoryAccordionOpen}>
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${historyAccordionOpen ? "rotate-90" : ""}`} />
                            <History className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">Version History</span>
                            <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                              {selectedFunction.versions.length}
                            </Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="pl-2 pr-1 pb-2 space-y-1 mt-1">
                              {selectedFunction.versions.map((version) => {
                                const config = statusConfig[version.status]
                                const Icon = config.icon
                                const isViewing = viewingVersion?.id === version.id
                                return (
                                  <div
                                    key={version.id}
                                    className={`p-2 rounded-lg border transition-colors ${
                                      isViewing 
                                        ? "bg-primary/10 border-primary/30" 
                                        : "border-transparent hover:bg-muted/50"
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <Avatar className="h-6 w-6 shrink-0">
                                        <AvatarFallback className="text-[10px] bg-muted">
                                          {version.author.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <span className="text-xs font-medium text-foreground truncate">
                                            {version.author}
                                          </span>
                                          <Icon className={`h-3 w-3 shrink-0 ${config.color}`} />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                          {getRelativeTime(version.createdAt)}
                                        </p>
                                        <p className="text-[11px] text-foreground/80 line-clamp-1 mt-0.5">
                                          {version.message}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1.5">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-5 px-1.5 text-[10px]"
                                                onClick={() => handleViewVersion(version)}
                                              >
                                                <Eye className="h-2.5 w-2.5 mr-0.5" />
                                                View
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View this version</TooltipContent>
                                          </Tooltip>
                                          {version.status !== "production" && version.status !== "in_review" && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button 
                                                  size="sm" 
                                                  variant="ghost" 
                                                  className="h-5 px-1.5 text-[10px]"
                                                  onClick={() => handleRestoreVersion(version)}
                                                >
                                                  <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
                                                  Restore
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Restore this version</TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  /* Collapsed state - just a button to reopen */
                  <div className="border-l border-border bg-card/30 flex flex-col items-center py-3 px-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => setIsHistoryPanelOpen(true)}
                    >
                      <PanelRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-muted/20">
                <div className="text-center">
                  <Code className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Function Selected</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select a function from the list to view and edit its code
                  </p>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Function
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Function Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Function</DialogTitle>
              <DialogDescription>
                Create a new Python function to use in your decision flows.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fn-name">Function Name</Label>
                <Input
                  id="fn-name"
                  value={newFunctionName}
                  onChange={(e) => setNewFunctionName(e.target.value)}
                  placeholder="e.g., Calculate Risk Score"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fn-description">Description</Label>
                <Textarea
                  id="fn-description"
                  value={newFunctionDescription}
                  onChange={(e) => setNewFunctionDescription(e.target.value)}
                  placeholder="What does this function do..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fn-category">Category</Label>
                <Select value={newFunctionCategory} onValueChange={setNewFunctionCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter((c) => c.id !== "all").map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="h-4 w-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFunction} disabled={!newFunctionName.trim()}>
                Create Function
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Function Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Function</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{functionToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteFunction}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Commit Message Dialog */}
        <Dialog open={isCommitDialogOpen} onOpenChange={setIsCommitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send to QA Review</DialogTitle>
              <DialogDescription>
                Add a summary of your changes. This helps the QA team understand what to review.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="commit-message">Change Summary</Label>
                <Textarea
                  id="commit-message"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="e.g., Adjusted risk threshold from 10% to 15%"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCommitDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendToReview} disabled={!commitMessage.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Send to QA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
