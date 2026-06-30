"use client"

import { useState, useMemo } from "react"
import {
  Search,
  Plus,
  GitBranch,
  Calendar,
  Clock,
  MoreVertical,
  ArrowUpDown,
  ChevronDown,
  Play,
  Pencil,
  Trash2,
  Copy,
  Code,
  ArrowLeft,
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

export interface Flow {
  id: string
  name: string
  description: string
  status: "active" | "draft" | "archived"
  nodeCount: number
  lastModified: Date
  createdAt: Date
}

const mockFlows: Flow[] = [
  {
    id: "flow-1",
    name: "Loan Approval Process",
    description: "Automated decision flow for loan applications based on credit score and income",
    status: "active",
    nodeCount: 12,
    lastModified: new Date("2026-01-20"),
    createdAt: new Date("2026-01-10"),
  },
  {
    id: "flow-2",
    name: "Customer Onboarding",
    description: "KYC verification and account setup workflow",
    status: "active",
    nodeCount: 8,
    lastModified: new Date("2026-01-19"),
    createdAt: new Date("2026-01-05"),
  },
  {
    id: "flow-3",
    name: "Fraud Detection",
    description: "Real-time transaction monitoring and risk assessment",
    status: "draft",
    nodeCount: 15,
    lastModified: new Date("2026-01-18"),
    createdAt: new Date("2026-01-15"),
  },
  {
    id: "flow-4",
    name: "Insurance Claim Processing",
    description: "Automated claim validation and payout calculation",
    status: "active",
    nodeCount: 20,
    lastModified: new Date("2026-01-17"),
    createdAt: new Date("2025-12-20"),
  },
  {
    id: "flow-5",
    name: "Credit Score Calculation",
    description: "Multi-factor credit scoring algorithm",
    status: "archived",
    nodeCount: 10,
    lastModified: new Date("2026-01-10"),
    createdAt: new Date("2025-11-15"),
  },
  {
    id: "flow-6",
    name: "Marketing Campaign Routing",
    description: "Customer segmentation and campaign assignment",
    status: "draft",
    nodeCount: 6,
    lastModified: new Date("2026-01-21"),
    createdAt: new Date("2026-01-21"),
  },
]

type SortField = "name" | "lastModified" | "createdAt" | "nodeCount"
type SortOrder = "asc" | "desc"
type StatusFilter = "all" | "active" | "draft" | "archived"

interface FlowsDashboardProps {
  onSelectFlow: (flowId: string) => void
  onNavigateToFunctions: () => void
  onBack?: () => void
  productName?: string
}

export function FlowsDashboard({ onSelectFlow, onNavigateToFunctions, onBack, productName }: FlowsDashboardProps) {
  const [flows, setFlows] = useState<Flow[]>(mockFlows)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortField, setSortField] = useState<SortField>("lastModified")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newFlowName, setNewFlowName] = useState("")
  const [newFlowDescription, setNewFlowDescription] = useState("")

  const filteredAndSortedFlows = useMemo(() => {
    let result = flows.filter((flow) => {
      const matchesSearch =
        flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flow.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || flow.status === statusFilter
      return matchesSearch && matchesStatus
    })

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "lastModified":
          comparison = a.lastModified.getTime() - b.lastModified.getTime()
          break
        case "createdAt":
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case "nodeCount":
          comparison = a.nodeCount - b.nodeCount
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [flows, searchQuery, statusFilter, sortField, sortOrder])

  const handleCreateFlow = () => {
    if (!newFlowName.trim()) return

    const newFlow: Flow = {
      id: `flow-${Date.now()}`,
      name: newFlowName.trim(),
      description: newFlowDescription.trim(),
      status: "draft",
      nodeCount: 0,
      lastModified: new Date(),
      createdAt: new Date(),
    }

    setFlows((prev) => [newFlow, ...prev])
    setNewFlowName("")
    setNewFlowDescription("")
    setIsCreateDialogOpen(false)
    onSelectFlow(newFlow.id)
  }

  const handleDeleteFlow = (flowId: string) => {
    setFlows((prev) => prev.filter((f) => f.id !== flowId))
  }

  const handleDuplicateFlow = (flow: Flow) => {
    const duplicated: Flow = {
      ...flow,
      id: `flow-${Date.now()}`,
      name: `${flow.name} (Copy)`,
      status: "draft",
      lastModified: new Date(),
      createdAt: new Date(),
    }
    setFlows((prev) => [duplicated, ...prev])
  }

  const getStatusBadge = (status: Flow["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
      case "draft":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Draft</Badge>
      case "archived":
        return <Badge className="bg-muted text-muted-foreground border-border">Archived</Badge>
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="p-2 rounded-lg bg-primary/10">
                <GitBranch className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {productName ? `${productName} - Flows` : "Decision Flows"}
                </h1>
                <p className="text-sm text-muted-foreground">Visual decision engine builder</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onNavigateToFunctions} className="bg-transparent">
                <Code className="h-4 w-4 mr-2" />
                Functions
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Flow
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flows..."
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                Status: {statusFilter === "all" ? "All" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("draft")}>Draft</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("archived")}>Archived</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSortField("lastModified")
                  setSortOrder("desc")
                }}
              >
                Last Modified (Newest)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSortField("lastModified")
                  setSortOrder("asc")
                }}
              >
                Last Modified (Oldest)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSortField("name")
                  setSortOrder("asc")
                }}
              >
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSortField("name")
                  setSortOrder("desc")
                }}
              >
                Name (Z-A)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSortField("nodeCount")
                  setSortOrder("desc")
                }}
              >
                Most Nodes
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSortField("createdAt")
                  setSortOrder("desc")
                }}
              >
                Recently Created
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Flows Count */}
        <p className="text-sm text-muted-foreground mb-4">
          {filteredAndSortedFlows.length} flow{filteredAndSortedFlows.length !== 1 ? "s" : ""}
        </p>

        {/* Flows List */}
        {filteredAndSortedFlows.length === 0 ? (
          <Card className="p-12 text-center">
            <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No flows found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first decision flow to get started"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Flow
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedFlows.map((flow) => (
              <Card
                key={flow.id}
                className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => onSelectFlow(flow.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-medium text-foreground truncate">{flow.name}</h3>
                      {getStatusBadge(flow.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{flow.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {flow.nodeCount} nodes
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Modified {formatDate(flow.lastModified)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(flow.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectFlow(flow.id)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectFlow(flow.id)
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicateFlow(flow)
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFlow(flow.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Flow Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Flow</DialogTitle>
            <DialogDescription>Create a new decision flow to automate your business logic.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flow-name">Name</Label>
              <Input
                id="flow-name"
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
                placeholder="e.g., Loan Approval Process"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flow-description">Description</Label>
              <Textarea
                id="flow-description"
                value={newFlowDescription}
                onChange={(e) => setNewFlowDescription(e.target.value)}
                placeholder="Describe what this flow does..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFlow} disabled={!newFlowName.trim()}>
              Create Flow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
