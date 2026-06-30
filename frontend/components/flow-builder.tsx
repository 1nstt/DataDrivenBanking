"use client"

import type React from "react"

import { useCallback, useEffect, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type EdgeTypes,
  MarkerType,
  useReactFlow,
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { FunctionNode } from "./nodes/function-node"
import { DecisionNode } from "./nodes/decision-node"
import { NodesSidebar } from "./nodes-sidebar"
import { Button } from "./ui/button"
import { Play, Square, ArrowLeft, LayoutGrid } from "lucide-react"
import { fetchEngineJson } from "@/lib/engine-api"

// Custom orthogonal edge component
function OrthogonalEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  const isActive = data?.isActive
  const edgeColor = data?.color || (isActive ? "#22c55e" : "#64748b")

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        stroke: edgeColor,
        strokeWidth: isActive ? 3 : 2,
        transition: "stroke 0.3s, stroke-width 0.3s",
      }}
    />
  )
}

const nodeTypes: NodeTypes = {
  function: FunctionNode,
  decision: DecisionNode,
}

const edgeTypes: EdgeTypes = {
  orthogonal: OrthogonalEdge,
}

const initialNodes: Node[] = []
const initialEdges: Edge[] = []

const NODE_WIDTH = 220
const NODE_HEIGHT = 100
const DECISION_HEIGHT = 140
const HORIZONTAL_SPACING = 120
const VERTICAL_SPACING = 80

// Manual layout algorithm (horizontal left-to-right)
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  if (nodes.length === 0) return { nodes: [], edges }

  // Build adjacency map
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()
  
  for (const node of nodes) {
    outgoing.set(node.id, [])
    incoming.set(node.id, [])
  }
  
  for (const edge of edges) {
    outgoing.get(edge.source)?.push(edge.target)
    incoming.get(edge.target)?.push(edge.source)
  }

  // Find root nodes (no incoming edges)
  const roots = nodes.filter(n => (incoming.get(n.id)?.length || 0) === 0)
  
  // If no roots found, use the first node
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0])
  }

  // BFS to assign levels
  const levels = new Map<string, number>()
  const queue: Array<{ id: string; level: number }> = roots.map(n => ({ id: n.id, level: 0 }))
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!
    
    if (levels.has(id)) continue
    levels.set(id, level)
    
    const children = outgoing.get(id) || []
    for (const childId of children) {
      if (!levels.has(childId)) {
        queue.push({ id: childId, level: level + 1 })
      }
    }
  }

  // Assign levels to any unvisited nodes
  for (const node of nodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0)
    }
  }

  // Group nodes by level
  const nodesByLevel = new Map<number, Node[]>()
  for (const node of nodes) {
    const level = levels.get(node.id) || 0
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, [])
    }
    nodesByLevel.get(level)!.push(node)
  }

  // Calculate positions
  const layoutedNodes = nodes.map(node => {
    const level = levels.get(node.id) || 0
    const nodesAtLevel = nodesByLevel.get(level) || []
    const indexInLevel = nodesAtLevel.indexOf(node)
    const totalAtLevel = nodesAtLevel.length
    
    const height = node.type === "decision" ? DECISION_HEIGHT : NODE_HEIGHT
    
    // Center nodes vertically at each level
    const totalHeight = totalAtLevel * height + (totalAtLevel - 1) * VERTICAL_SPACING
    const startY = 300 - totalHeight / 2
    
    return {
      ...node,
      position: {
        x: 100 + level * (NODE_WIDTH + HORIZONTAL_SPACING),
        y: startY + indexInLevel * (height + VERTICAL_SPACING),
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

interface FlowBuilderInnerProps {
  flowId: string
  onBack: () => void
}

interface FlowPlan {
  flow_name: string
  display_name?: string
  description?: string
  entryNodeId?: string | null
  nodes: Node[]
  edges: Edge[]
}

function FlowBuilderInner({ flowId, onBack }: FlowBuilderInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isLoadingFlow, setIsLoadingFlow] = useState(true)
  const [isSavingFlow, setIsSavingFlow] = useState(false)
  const [flowTitle, setFlowTitle] = useState(flowId)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { fitView } = useReactFlow()

  useEffect(() => {
    let cancelled = false

    const loadFlow = async () => {
      setIsLoadingFlow(true)
      setLoadError(null)

      try {
        const plan = await fetchEngineJson<FlowPlan>(`/flows/${encodeURIComponent(flowId)}`)
        if (cancelled) return

        setNodes(plan.nodes || [])
        setEdges(plan.edges || [])
        setFlowTitle(plan.display_name || plan.flow_name || flowId)
      } catch (error) {
        if (cancelled) return
        setNodes([])
        setEdges([])
        setFlowTitle(flowId)
        setLoadError(error instanceof Error ? error.message : "No se pudo cargar el flujo")
      } finally {
        if (!cancelled) {
          setIsLoadingFlow(false)
        }
      }
    }

    void loadFlow()

    return () => {
      cancelled = true
    }
  }, [flowId, setEdges, setNodes])

  // Auto-layout function
  const onLayout = useCallback(() => {
    if (nodes.length === 0) return
    
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    )

    setNodes([...layoutedNodes])
    setEdges([...layoutedEdges])

    window.requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 300 })
    })
  }, [nodes, edges, setNodes, setEdges, fitView])

  const handleSaveFlow = useCallback(async () => {
    setIsSavingFlow(true)
    setLoadError(null)

    try {
      const rootTargetIds = new Set(edges.map((edge) => edge.target))
      const entryNodeId = nodes.find((node) => !rootTargetIds.has(node.id))?.id || nodes[0]?.id || null

      await fetchEngineJson(`/flows/${encodeURIComponent(flowId)}`, {
        method: "PUT",
        body: JSON.stringify({
          display_name: flowTitle,
          description: `Saved flow ${flowId}`,
          entryNodeId,
          nodes,
          edges,
          metadata: { source: "frontend" },
        }),
      })
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo guardar el flujo")
    } finally {
      setIsSavingFlow(false)
    }
  }, [edges, flowId, flowTitle, nodes])

  // Find the rightmost position for new nodes
  const getNextPosition = useCallback(() => {
    if (nodes.length === 0) {
      return { x: 100, y: 300 }
    }

    const rightmostNode = nodes.reduce((prev, current) => 
      (prev.position.x > current.position.x) ? prev : current
    )

    return {
      x: rightmostNode.position.x + NODE_WIDTH + HORIZONTAL_SPACING,
      y: rightmostNode.position.y,
    }
  }, [nodes])

  const addNode = useCallback(
    (type: string, functionName?: string) => {
      const position = getNextPosition()

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          functionName: type === "function" ? functionName || "New Function" : undefined,
          condition: type === "decision" ? "value > 0" : undefined,
          status: "idle",
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes, getNextPosition],
  )

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source)
      let edgeColor = "#64748b"
      
      if (sourceNode?.type === "decision") {
        edgeColor = params.sourceHandle === "true" ? "#22c55e" : "#ef4444"
      }

      const newEdge: Edge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        type: "orthogonal",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: edgeColor,
        },
        data: { color: edgeColor },
        style: { stroke: edgeColor },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges, nodes],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData("application/reactflow")
      if (!type) return

      const functionName = event.dataTransfer.getData("functionName")

      // Use smart positioning instead of drop position
      const position = getNextPosition()

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          functionName: type === "function" ? functionName || "New Function" : undefined,
          condition: type === "decision" ? "value > 0" : undefined,
          status: "idle",
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes, getNextPosition],
  )

  const executeFlow = async () => {
    if (isExecuting) return

    setIsExecuting(true)

    // Reset all node statuses and edge colors
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, status: "idle", activeOutput: null },
      })),
    )
    
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        data: { ...edge.data, isActive: false },
      })),
    )

    // Find start node (node with no incoming edges)
    const targetIds = new Set(edges.map((e) => e.target))
    const startNodes = nodes.filter((n) => !targetIds.has(n.id))

    if (startNodes.length === 0) {
      alert("No start node found! Add a node without any incoming connections.")
      setIsExecuting(false)
      return
    }

    const startNode = startNodes[0]
    await processNode(startNode.id)

    setIsExecuting(false)
  }

  const processNode = async (nodeId: string): Promise<void> => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    // Set node to running
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: "running" } } : n)))

    // Simulate execution delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (node.type === "function") {
      // Function node: always succeeds
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, status: "success" } } : n)))

      // Find next node and highlight edge
      const outgoingEdges = edges.filter((e) => e.source === nodeId)
      if (outgoingEdges.length > 0) {
        setEdges((eds) =>
          eds.map((e) =>
            e.id === outgoingEdges[0].id
              ? { ...e, data: { ...e.data, isActive: true } }
              : e
          )
        )
        await new Promise((resolve) => setTimeout(resolve, 500))
        await processNode(outgoingEdges[0].target)
      }
    } else if (node.type === "decision") {
      // Decision node: randomly pick true or false
      const result = Math.random() > 0.5

      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  status: "success",
                  activeOutput: result ? "true" : "false",
                },
              }
            : n,
        ),
      )

      // Find next node based on decision and highlight edge
      const outgoingEdges = edges.filter((e) => e.source === nodeId)
      const targetEdge = outgoingEdges.find((e) => (result ? e.sourceHandle === "true" : e.sourceHandle === "false"))

      if (targetEdge) {
        setEdges((eds) =>
          eds.map((e) =>
            e.id === targetEdge.id
              ? { ...e, data: { ...e.data, isActive: true } }
              : e
          )
        )
        await new Promise((resolve) => setTimeout(resolve, 500))
        await processNode(targetEdge.target)
      }
    }
  }

  const stopExecution = () => {
    setIsExecuting(false)
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, status: "idle", activeOutput: null },
      })),
    )
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        data: { ...edge.data, isActive: false },
      })),
    )
  }

  return (
    <>
      <NodesSidebar onAddNode={addNode} />

      <div className="absolute top-4 left-80 z-10 flex gap-2">
        <Button onClick={onBack} variant="outline" size="sm" className="bg-transparent">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Flows
        </Button>
        <Button onClick={onLayout} variant="outline" size="sm" className="bg-transparent">
          <LayoutGrid className="mr-2 h-4 w-4" />
          Auto Layout
        </Button>
        <Button onClick={handleSaveFlow} variant="outline" size="sm" className="bg-transparent" disabled={isSavingFlow || isLoadingFlow}>
          {isSavingFlow ? "Saving..." : "Save Flow"}
        </Button>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {!isExecuting ? (
          <Button onClick={executeFlow} className="bg-primary text-primary-foreground hover:bg-primary/90" size="lg">
            <Play className="mr-2 h-5 w-5" />
            Run Flow
          </Button>
        ) : (
          <Button onClick={stopExecution} variant="destructive" size="lg">
            <Square className="mr-2 h-5 w-5" />
            Stop
          </Button>
        )}
      </div>

      <div className="absolute bottom-4 left-80 z-10 max-w-xl rounded-lg border border-border bg-card/95 px-4 py-3 text-sm text-muted-foreground shadow-lg backdrop-blur">
        <div className="font-medium text-foreground">{flowTitle}</div>
        {isLoadingFlow ? (
          <div>Loading flow from backend...</div>
        ) : loadError ? (
          <div className="text-destructive">{loadError}</div>
        ) : (
          <div>Flow loaded from backend. Save updates to keep the plan in sync.</div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: "orthogonal",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
          },
        }}
        fitView
        className="bg-background"
        snapToGrid
        snapGrid={[20, 20]}
      >
        <Background className="bg-muted/20" gap={20} />
        <Controls className="bg-card border-border" />
        <MiniMap
          className="bg-card border-border"
          nodeColor={(node) => {
            if (node.type === "function") return "oklch(0.6 0.15 220)"
            if (node.type === "decision") return "oklch(0.65 0.15 140)"
            return "oklch(0.5 0 0)"
          }}
        />
      </ReactFlow>
    </>
  )
}

interface FlowBuilderProps {
  flowId: string
  onBack: () => void
}

export function FlowBuilder({ flowId, onBack }: FlowBuilderProps) {
  return (
    <div className="relative h-full w-full">
      <ReactFlow nodeTypes={nodeTypes} edgeTypes={edgeTypes} defaultNodes={[]} defaultEdges={[]}>
        <FlowBuilderInner flowId={flowId} onBack={onBack} />
      </ReactFlow>
    </div>
  )
}
