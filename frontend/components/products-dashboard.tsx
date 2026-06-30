"use client"

import React from "react"

import { useEffect, useMemo, useState } from "react"
import {
  Search,
  Plus,
  Package,
  GitBranch,
  ChevronDown,
  MoreVertical,
  ArrowRight,
  Pencil,
  Trash2,
  Activity,
  Clock,
  LogOut,
  ArrowUpDown,
} from "lucide-react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback } from "./ui/avatar"
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
import { fetchEngineJson } from "@/lib/engine-api"

export interface Product {
  id: string
  name: string
  description: string
  status: "active" | "inactive" | "development"
  activeFlows: number
  totalFlows: number
  lastActivity: Date
  createdAt: Date
  owner: string
  flows: ProductFlow[]
}

interface ProductFlow {
  id: string
  name: string
  status: "active" | "draft" | "archived"
  nodeCount: number
}

const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Consumer Lending",
    description: "Personal loans, credit lines, and auto financing decision workflows",
    status: "active",
    activeFlows: 3,
    totalFlows: 5,
    lastActivity: new Date("2026-01-21"),
    createdAt: new Date("2025-09-15"),
    owner: "Maria Garcia",
    flows: [
      { id: "flow-1", name: "Loan Approval Process", status: "active", nodeCount: 12 },
      { id: "flow-2", name: "Credit Score Calculation", status: "active", nodeCount: 10 },
      { id: "flow-3", name: "Risk Assessment", status: "active", nodeCount: 8 },
      { id: "flow-4", name: "Rate Determination v2", status: "draft", nodeCount: 6 },
      { id: "flow-5", name: "Legacy Rate Engine", status: "archived", nodeCount: 15 },
    ],
  },
  {
    id: "prod-2",
    name: "Customer Onboarding",
    description: "KYC verification, identity validation, and account setup automation",
    status: "active",
    activeFlows: 2,
    totalFlows: 3,
    lastActivity: new Date("2026-01-20"),
    createdAt: new Date("2025-10-01"),
    owner: "James Chen",
    flows: [
      { id: "flow-6", name: "KYC Verification", status: "active", nodeCount: 8 },
      { id: "flow-7", name: "Identity Validation", status: "active", nodeCount: 6 },
      { id: "flow-8", name: "Account Setup Draft", status: "draft", nodeCount: 4 },
    ],
  },
  {
    id: "prod-3",
    name: "Fraud Prevention",
    description: "Real-time transaction monitoring, anomaly detection, and risk scoring",
    status: "active",
    activeFlows: 2,
    totalFlows: 4,
    lastActivity: new Date("2026-01-19"),
    createdAt: new Date("2025-08-20"),
    owner: "Sarah Kim",
    flows: [
      { id: "flow-9", name: "Transaction Monitoring", status: "active", nodeCount: 15 },
      { id: "flow-10", name: "Anomaly Detection v3", status: "active", nodeCount: 20 },
      { id: "flow-11", name: "Risk Scoring Beta", status: "draft", nodeCount: 12 },
      { id: "flow-12", name: "Old Rule Engine", status: "archived", nodeCount: 9 },
    ],
  },
  {
    id: "prod-4",
    name: "Insurance Claims",
    description: "Automated claim intake, validation, and payout calculation workflows",
    status: "development",
    activeFlows: 0,
    totalFlows: 2,
    lastActivity: new Date("2026-01-18"),
    createdAt: new Date("2026-01-10"),
    owner: "David Park",
    flows: [
      { id: "flow-13", name: "Claim Validation Draft", status: "draft", nodeCount: 14 },
      { id: "flow-14", name: "Payout Calculator Draft", status: "draft", nodeCount: 8 },
    ],
  },
  {
    id: "prod-5",
    name: "Marketing Campaigns",
    description: "Customer segmentation, targeting, and campaign routing logic",
    status: "inactive",
    activeFlows: 0,
    totalFlows: 1,
    lastActivity: new Date("2025-12-15"),
    createdAt: new Date("2025-11-01"),
    owner: "Lisa Wang",
    flows: [
      { id: "flow-15", name: "Campaign Routing v1", status: "archived", nodeCount: 6 },
    ],
  },
]

type SortField = "name" | "lastActivity" | "activeFlows"
type SortOrder = "asc" | "desc"
type StatusFilter = "all" | "active" | "inactive" | "development"

interface ProductsDashboardProps {
  onSelectProduct: (productId: string) => void
  onLogout: () => void
}

export function ProductsDashboard({ onSelectProduct, onLogout }: ProductsDashboardProps) {
  const [products, setProducts] = useState<Product[]>(mockProducts)
  const [availableFlowNames, setAvailableFlowNames] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortField, setSortField] = useState<SortField>("lastActivity")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")

  useEffect(() => {
    let cancelled = false

    const loadFlows = async () => {
      try {
        const response = await fetchEngineJson<{ flows: Array<{ flow_name?: string; name?: string }> }>("/flows")
        if (cancelled) return

        const names = response.flows
          .map((flow) => flow.flow_name || flow.name)
          .filter((name): name is string => Boolean(name))

        setAvailableFlowNames(names)
      } catch {
        if (!cancelled) {
          setAvailableFlowNames([])
        }
      }
    }

    void loadFlows()

    return () => {
      cancelled = true
    }
  }, [])

  const visibleProducts = useMemo(() => {
    const availableFlowSet = new Set(availableFlowNames)

    return products
      .map((product) => {
        const flows = product.flows.filter(
          (flow) => availableFlowSet.has(flow.id) || availableFlowSet.has(flow.name),
        )

        const activeFlows = flows.filter((flow) => flow.status === "active").length

        return {
          ...product,
          flows,
          activeFlows,
          totalFlows: flows.length,
        }
      })
      .filter((product) => product.totalFlows > 0)
  }, [products, availableFlowNames])

  const filteredProducts = useMemo(() => {
    let result = visibleProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || p.status === statusFilter
      return matchesSearch && matchesStatus
    })

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "lastActivity":
          cmp = a.lastActivity.getTime() - b.lastActivity.getTime()
          break
        case "activeFlows":
          cmp = a.activeFlows - b.activeFlows
          break
      }
      return sortOrder === "asc" ? cmp : -cmp
    })

    return result
  }, [visibleProducts, searchQuery, statusFilter, sortField, sortOrder])

  const totalActive = visibleProducts.filter((p) => p.status === "active").length
  const totalFlows = visibleProducts.reduce((acc, p) => acc + p.totalFlows, 0)
  const totalActiveFlows = visibleProducts.reduce((acc, p) => acc + p.activeFlows, 0)

  const handleCreate = () => {
    if (!newName.trim()) return
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: newName.trim(),
      description: newDescription.trim(),
      status: "development",
      activeFlows: 0,
      totalFlows: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      owner: "Current User",
      flows: [],
    }
    setProducts((prev) => [newProduct, ...prev])
    setNewName("")
    setNewDescription("")
    setIsCreateDialogOpen(false)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const getStatusBadge = (status: Product["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/15 text-green-400 border-green-500/25">Active</Badge>
      case "inactive":
        return <Badge className="bg-muted text-muted-foreground border-border">Inactive</Badge>
      case "development":
        return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/25">In Development</Badge>
    }
  }

  const getFlowStatusDot = (status: ProductFlow["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-400"
      case "draft":
        return "bg-yellow-400"
      case "archived":
        return "bg-muted-foreground"
    }
  }

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Products</h1>
                <p className="text-sm text-muted-foreground">Manage your decision engine products</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Product
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 p-0 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        CU
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-muted-foreground" disabled>
                    current@user.com
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Package className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{totalActive}</p>
                <p className="text-xs text-muted-foreground">Active Products</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-1/10">
                <GitBranch className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{totalFlows}</p>
                <p className="text-xs text-muted-foreground">Total Flows</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Activity className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{totalActiveFlows}</p>
                <p className="text-xs text-muted-foreground">Active Flows</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-9"
            />
          </div>
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
              <DropdownMenuItem onClick={() => setStatusFilter("development")}>In Development</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Inactive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSortField("lastActivity"); setSortOrder("desc") }}>
                Recent Activity
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("name"); setSortOrder("asc") }}>
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField("activeFlows"); setSortOrder("desc") }}>
                Most Active Flows
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Count */}
        <p className="text-sm text-muted-foreground mb-4">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
        </p>

        {/* Product Cards */}
        {filteredProducts.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first product to get started"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Product
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden hover:border-foreground/20 transition-colors cursor-pointer group"
                onClick={() => onSelectProduct(product.id)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="text-base font-medium text-foreground truncate">{product.name}</h3>
                        {getStatusBadge(product.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-4">{product.description}</p>

                      {/* Meta row */}
                      <div className="flex items-center gap-5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <GitBranch className="h-3.5 w-3.5" />
                          {product.activeFlows} active / {product.totalFlows} total
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(product.lastActivity)}
                        </span>
                        <span>Owner: {product.owner}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onSelectProduct(product.id) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => handleDelete(product.id, e)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Flows preview */}
                  {product.flows.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Flows
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.flows.slice(0, 4).map((flow) => (
                          <div
                            key={flow.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/60 border border-border text-xs"
                          >
                            <div className={`h-1.5 w-1.5 rounded-full ${getFlowStatusDot(flow.status)}`} />
                            <span className="text-foreground">{flow.name}</span>
                            <span className="text-muted-foreground">{flow.nodeCount}n</span>
                          </div>
                        ))}
                        {product.flows.length > 4 && (
                          <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-secondary/40 border border-border text-xs text-muted-foreground">
                            +{product.flows.length - 4} more
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end mt-3">
                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                          Open product
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>Products group related decision flows together.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prod-name">Name</Label>
              <Input
                id="prod-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Consumer Lending"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-desc">Description</Label>
              <Textarea
                id="prod-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What does this product handle?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
