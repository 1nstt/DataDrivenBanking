"use client"

import { memo, useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Box, Check, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

export const FunctionNode = memo(({ data }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [functionName, setFunctionName] = useState(data.functionName || "New Function")

  const status = data.status || "idle"

  const handleBlur = () => {
    setIsEditing(false)
    data.functionName = functionName
  }

  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
      case "success":
        return "border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20"
      case "error":
        return "border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20"
      default:
        return "border-border bg-card hover:border-primary/50 hover:shadow-md"
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "success":
        return <Check className="h-4 w-4 text-green-500" />
      case "error":
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <Box className="h-4 w-4 text-primary" />
    }
  }

  return (
    <div className={cn(
      "px-4 py-3 rounded-xl border-2 min-w-[200px] transition-all duration-200",
      getStatusColor()
    )}>
      {/* Input handle - centered on left */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-zinc-400 !border-2 !border-background !w-3 !h-3 !-left-1.5"
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-primary/10">
          {getStatusIcon()}
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Function</span>
      </div>

      {isEditing ? (
        <input
          type="text"
          value={functionName}
          onChange={(e) => setFunctionName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          autoFocus
          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      ) : (
        <div 
          className="text-sm font-medium text-foreground cursor-text hover:text-primary transition-colors" 
          onClick={() => setIsEditing(true)}
        >
          {functionName}
        </div>
      )}

      {/* Output handle - centered on right */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-primary !border-2 !border-background !w-3 !h-3 !-right-1.5"
      />
    </div>
  )
})

FunctionNode.displayName = "FunctionNode"
