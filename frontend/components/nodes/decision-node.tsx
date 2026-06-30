"use client"

import { memo, useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { GitBranch, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export const DecisionNode = memo(({ data }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [condition, setCondition] = useState(data.condition || "value > 0")

  const status = data.status || "idle"
  const activeOutput = data.activeOutput

  const handleBlur = () => {
    setIsEditing(false)
    data.condition = condition
  }

  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
      case "success":
        return "border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20"
      default:
        return "border-border bg-card hover:border-amber-500/50 hover:shadow-md"
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "success":
        return <Check className="h-4 w-4 text-green-500" />
      default:
        return <GitBranch className="h-4 w-4 text-amber-500" />
    }
  }

  return (
    <div className={cn(
      "px-4 py-3 rounded-xl border-2 min-w-[220px] transition-all duration-200",
      getStatusColor()
    )}>
      {/* Input handle - centered on left */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-zinc-400 !border-2 !border-background !w-3 !h-3 !-left-1.5"
      />

      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-amber-500/10">
          {getStatusIcon()}
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Decision</span>
      </div>

      {isEditing ? (
        <input
          type="text"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          autoFocus
          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground mb-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      ) : (
        <div 
          className="text-sm font-medium text-foreground cursor-text mb-3 font-mono bg-muted/50 px-2 py-1 rounded hover:bg-muted transition-colors" 
          onClick={() => setIsEditing(true)}
        >
          {condition}
        </div>
      )}

      {/* Output handles for True/False branches */}
      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center justify-between pr-2">
          <div
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
              activeOutput === "true" 
                ? "bg-green-500 text-white shadow-md shadow-green-500/30" 
                : "bg-green-500/10 text-green-600 dark:text-green-400"
            )}
          >
            True
          </div>
        </div>

        <div className="flex items-center justify-between pr-2">
          <div
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
              activeOutput === "false" 
                ? "bg-red-500 text-white shadow-md shadow-red-500/30" 
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            False
          </div>
        </div>
      </div>

      {/* True output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="true" 
        className="!bg-green-500 !border-2 !border-background !w-3 !h-3 !-right-1.5"
        style={{ top: "60%" }}
      />
      
      {/* False output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="false" 
        className="!bg-red-500 !border-2 !border-background !w-3 !h-3 !-right-1.5"
        style={{ top: "85%" }}
      />
    </div>
  )
})

DecisionNode.displayName = "DecisionNode"
